-- PokeFlex: Fagulin, o mascote de streaks.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- O streak e as missões são calculados aqui, por gatilhos nas tabelas da coleção, desejos e trocas.
-- O dia fecha à meia-noite de São Paulo. O app só lê o resultado (e avisa quando escaneia uma carta).

-- Tabelas ---------------------------------------------------------------------

create table if not exists public.mascots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  stage smallint not null default 1 check (stage between 1 and 12),
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_day date,
  freeze_crystals smallint not null default 0 check (freeze_crystals between 0 and 2),
  freezes_used date[] not null default '{}',
  state text not null default 'active' check (state in ('active', 'dimmed')),
  relight_progress smallint not null default 0,
  updated_at timestamptz not null default now()
);

-- period: 'd:2026-10-17' (diária) ou 'w:2026-10-12' (semanal, começa na segunda).
create table if not exists public.mascot_missions (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  mission_id text not null,
  progress integer not null default 0,
  completed_at timestamptz,
  primary key (user_id, period, mission_id)
);

create table if not exists public.mascot_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  interactions integer not null default 0,
  xp integer not null default 0,
  primary key (user_id, day)
);

alter table public.mascots enable row level security;
alter table public.mascot_missions enable row level security;
alter table public.mascot_days enable row level security;

-- Só leitura do próprio mascote; tudo que muda passa pelas funções abaixo.
drop policy if exists "Mascote: ver o próprio" on public.mascots;
create policy "Mascote: ver o próprio" on public.mascots
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Missões: ver as próprias" on public.mascot_missions;
create policy "Missões: ver as próprias" on public.mascot_missions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Dias: ver os próprios" on public.mascot_days;
create policy "Dias: ver os próprios" on public.mascot_days
  for select to authenticated using ((select auth.uid()) = user_id);

-- Regras ----------------------------------------------------------------------

create or replace function public.mascot_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- XP mínimo de cada estágio (1 a 12) e streak necessário.
create or replace function public.mascot_xp_req(p_stage int)
returns int
language sql
immutable
set search_path = ''
as $$
  select (array[0, 0, 100, 300, 700, 1200, 2000, 3500, 5500, 8000, 13000, 25000])[greatest(1, least(12, p_stage))];
$$;

create or replace function public.mascot_stage_for(p_best int, p_xp int)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(t.n), 1)::smallint
  from unnest(
    array[0, 1, 3, 7, 14, 21, 30, 50, 75, 100, 180, 365],
    array[0, 0, 100, 300, 700, 1200, 2000, 3500, 5500, 8000, 13000, 25000]
  ) with ordinality as t(streak_req, xp_req, n)
  where p_best >= t.streak_req and p_xp >= t.xp_req;
$$;

-- Fecha os dias que passaram: usa Cristais de Gelo ou apaga a chama (streak zera, perde 25% do XP do estágio).
create or replace function public.mascot_rollover(p_user uuid)
returns public.mascots
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.mascots;
  today date := public.mascot_today();
  missed int;
  floor_xp int;
begin
  insert into public.mascots (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into m from public.mascots where user_id = p_user for update;
  if m.last_active_day is not null and m.current_streak > 0 and m.last_active_day < today - 1 then
    missed := today - m.last_active_day - 1;
    if m.freeze_crystals >= missed then
      update public.mascots
      set freeze_crystals = freeze_crystals - missed,
          freezes_used = (freezes_used || array(select d::date from generate_series(m.last_active_day + 1, today - 1, interval '1 day') d))[greatest(1, cardinality(freezes_used) + missed - 9):],
          last_active_day = today - 1,
          updated_at = now()
      where user_id = p_user
      returning * into m;
    else
      floor_xp := public.mascot_xp_req(m.stage);
      update public.mascots
      set current_streak = 0,
          state = 'dimmed',
          relight_progress = 0,
          xp = greatest(floor_xp, xp - (xp - floor_xp) / 4),
          updated_at = now()
      where user_id = p_user
      returning * into m;
    end if;
  end if;
  return m;
end;
$$;

-- Soma progresso numa missão; devolve o XP se ela acabou de ser concluída.
create or replace function public.mascot_progress(p_user uuid, p_period text, p_mission text, p_amount int, p_target int, p_xp int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_done boolean;
  prog int;
begin
  select completed_at is not null into was_done
  from public.mascot_missions
  where user_id = p_user and period = p_period and mission_id = p_mission;

  insert into public.mascot_missions (user_id, period, mission_id, progress)
  values (p_user, p_period, p_mission, least(p_amount, p_target))
  on conflict (user_id, period, mission_id)
  do update set progress = least(p_target, public.mascot_missions.progress + p_amount)
  returning progress into prog;

  if prog >= p_target and not coalesce(was_done, false) then
    update public.mascot_missions set completed_at = now()
    where user_id = p_user and period = p_period and mission_id = p_mission;
    return p_xp;
  end if;
  return 0;
end;
$$;

-- Registra uma interação do dia: streak, XP diário, missões e bônus.
create or replace function public.mascot_touch(p_user uuid, p_kind text, p_amount int default 1, p_shiny boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.mascots;
  today date := public.mascot_today();
  dayk text := 'd:' || public.mascot_today();
  week text := 'w:' || date_trunc('week', public.mascot_today())::date;
  gain int := 0;
  crystal int := 0;
  amount int := greatest(1, least(coalesce(p_amount, 1), 99));
begin
  if p_user is null then return; end if;
  m := public.mascot_rollover(p_user);

  if m.last_active_day is distinct from today then
    m.current_streak := case when m.last_active_day = today - 1 then m.current_streak + 1 else 1 end;
    gain := least(10 + m.current_streak, 60);
    if m.state = 'dimmed' then
      m.relight_progress := m.relight_progress + 1;
      if m.relight_progress >= 3 then
        m.state := 'active';
        m.relight_progress := 0;
      end if;
    end if;
  end if;

  if p_kind = 'card_add' then
    gain := gain + public.mascot_progress(p_user, dayk, 'capture_cards', amount, 3, 30);
    if p_shiny then gain := gain + public.mascot_progress(p_user, week, 'collect_shiny', amount, 2, 120); end if;
  elsif p_kind = 'scan' then
    gain := gain + public.mascot_progress(p_user, dayk, 'scan_card', 1, 1, 20);
  elsif p_kind = 'wish_target' then
    gain := gain + public.mascot_progress(p_user, week, 'wish_targets', 1, 3, 80);
  elsif p_kind = 'trade' then
    gain := gain + public.mascot_progress(p_user, week, 'trade_any', 1, 1, 150);
  end if;

  -- As duas diárias no mesmo dia: +25 XP.
  if not exists (select 1 from public.mascot_missions where user_id = p_user and period = dayk and mission_id = 'daily_bonus')
     and (select count(*) from public.mascot_missions
          where user_id = p_user and period = dayk and mission_id in ('capture_cards', 'scan_card') and completed_at is not null) = 2 then
    insert into public.mascot_missions (user_id, period, mission_id, progress, completed_at) values (p_user, dayk, 'daily_bonus', 1, now());
    gain := gain + 25;
  end if;

  -- As três semanais: um Cristal de Gelo.
  if not exists (select 1 from public.mascot_missions where user_id = p_user and period = week and mission_id = 'weekly_bonus')
     and (select count(*) from public.mascot_missions
          where user_id = p_user and period = week and mission_id in ('wish_targets', 'trade_any', 'collect_shiny') and completed_at is not null) = 3 then
    insert into public.mascot_missions (user_id, period, mission_id, progress, completed_at) values (p_user, week, 'weekly_bonus', 1, now());
    crystal := 1;
  end if;

  insert into public.mascot_days (user_id, day, interactions, xp)
  values (p_user, today, 1, gain)
  on conflict (user_id, day) do update
  set interactions = public.mascot_days.interactions + 1, xp = public.mascot_days.xp + gain;

  update public.mascots
  set current_streak = m.current_streak,
      best_streak = greatest(m.best_streak, m.current_streak),
      last_active_day = today,
      state = m.state,
      relight_progress = m.relight_progress,
      xp = m.xp + gain,
      freeze_crystals = least(2, m.freeze_crystals + crystal),
      stage = greatest(m.stage, public.mascot_stage_for(greatest(m.best_streak, m.current_streak), m.xp + gain)),
      updated_at = now()
  where user_id = p_user;
end;
$$;

-- Gatilhos: as ações do app alimentam o mascote sozinhas. Uma falha aqui nunca bloqueia a ação.

create or replace function public.mascot_on_collection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform public.mascot_touch(new.user_id, 'card_add', new.quantity, new.variant in ('holo', 'reverse'));
    elsif tg_op = 'DELETE' then
      perform public.mascot_touch(old.user_id, 'card_remove');
    end if;
  exception when others then null;
  end;
  return null;
end;
$$;

drop trigger if exists mascot_collection on public.collection_entries;
create trigger mascot_collection
  after insert or delete on public.collection_entries
  for each row execute function public.mascot_on_collection();

create or replace function public.mascot_on_wishlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if new.target_price is not null and (tg_op = 'INSERT' or old.target_price is null) then
      perform public.mascot_touch(new.user_id, 'wish_target');
    else
      perform public.mascot_touch(new.user_id, 'wish');
    end if;
  exception when others then null;
  end;
  return null;
end;
$$;

drop trigger if exists mascot_wishlist on public.wishlist_items;
create trigger mascot_wishlist
  after insert or update of target_price on public.wishlist_items
  for each row execute function public.mascot_on_wishlist();

create or replace function public.mascot_on_trade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform public.mascot_touch(new.from_user, 'trade');
    elsif new.status is distinct from old.status then
      -- Responder conta como interação; concluir vale a missão para os dois lados.
      if new.status = 'completed' then
        perform public.mascot_touch(new.from_user, 'trade');
        perform public.mascot_touch(new.to_user, 'trade');
      else
        perform public.mascot_touch((select auth.uid()), 'trade_reply');
      end if;
    end if;
  exception when others then null;
  end;
  return null;
end;
$$;

drop trigger if exists mascot_trades on public.trades;
create trigger mascot_trades
  after insert or update of status on public.trades
  for each row execute function public.mascot_on_trade();

-- Funções do app --------------------------------------------------------------

create or replace function public.my_mascot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  m public.mascots;
  dayk text := 'd:' || public.mascot_today();
  week text := 'w:' || date_trunc('week', public.mascot_today())::date;
begin
  if me is null then return null; end if;
  m := public.mascot_rollover(me);
  return jsonb_build_object(
    'xp', m.xp,
    'stage', m.stage,
    'current_streak', m.current_streak,
    'best_streak', m.best_streak,
    'last_active_day', m.last_active_day,
    'today', public.mascot_today(),
    'freeze_crystals', m.freeze_crystals,
    'freezes_used', to_jsonb(m.freezes_used),
    'state', m.state,
    'relight_progress', m.relight_progress,
    'missions', coalesce((
      select jsonb_object_agg(mm.mission_id, jsonb_build_object('progress', mm.progress, 'completed', mm.completed_at is not null))
      from public.mascot_missions mm
      where mm.user_id = me and mm.period in (dayk, week)
    ), '{}'::jsonb)
  );
end;
$$;

-- O scan acontece só no aparelho; o app avisa aqui (vale no máximo a missão diária).
create or replace function public.mascot_scan()
returns void
language sql
security definer
set search_path = ''
as $$
  select public.mascot_touch((select auth.uid()), 'scan');
$$;

revoke all on function public.mascot_rollover(uuid) from public, anon, authenticated;
revoke all on function public.mascot_progress(uuid, text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.mascot_touch(uuid, text, int, boolean) from public, anon, authenticated;
revoke all on function public.my_mascot() from public, anon;
revoke all on function public.mascot_scan() from public, anon;
grant execute on function public.my_mascot() to authenticated;
grant execute on function public.mascot_scan() to authenticated;
