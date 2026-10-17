-- PokeFlex: trocas entre treinadores.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- Quem liga "Participar das trocas" aceita que o cruzamento abaixo aconteça. A lista de desejos continua
-- fechada: uma carta desejada só aparece para quem tem uma repetida dela.

alter table public.profiles add column if not exists open_to_trade boolean not null default false;

-- Propostas -------------------------------------------------------------------

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  -- Itens: [{ card_id, variant, quantity, card }]. offer = o que quem propôs entrega; request = o que recebe.
  offer jsonb not null default '[]',
  request jsonb not null default '[]',
  message text check (char_length(message) <= 280),
  applied_from boolean not null default false,
  applied_to boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user <> to_user)
);

create index if not exists trades_from_idx on public.trades (from_user, updated_at desc);
create index if not exists trades_to_idx on public.trades (to_user, updated_at desc);

alter table public.trades enable row level security;

-- Cada lado lê as próprias trocas; criar e mudar status só pelas funções abaixo.
drop policy if exists "Troca: ver as minhas" on public.trades;
create policy "Troca: ver as minhas" on public.trades
  for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));

-- Cruzamento -----------------------------------------------------------------

-- Para cada treinador aberto a trocas: repetidas dele que estão nos seus desejos (they_have)
-- e repetidas suas que estão nos desejos dele (i_have).
create or replace function public.trade_matches()
returns table (id uuid, username text, name text, avatar_url text, they_have jsonb, i_have jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select p.id as uid from public.profiles p where p.id = (select auth.uid()) and p.open_to_trade
  ),
  partners as (
    select p.id, p.username, p.name, p.avatar_url
    from public.profiles p
    where p.open_to_trade and p.is_public and p.username is not null
      and exists (select 1 from me) and p.id <> (select uid from me)
  ),
  dup as (
    select
      e.user_id,
      e.card_id,
      (array_agg(e.card order by e.added_at desc))[1] as card,
      (array_agg(e.variant order by e.quantity desc))[1] as variant,
      sum(e.quantity) - 1 as extra
    from public.collection_entries e
    where e.user_id in (select partners.id from partners) or e.user_id = (select uid from me)
    group by e.user_id, e.card_id
    having sum(e.quantity) > 1
  ),
  matched as (
    select
      pa.id, pa.username, pa.name, pa.avatar_url,
      coalesce((
        select jsonb_agg(jsonb_build_object('card_id', d.card_id, 'card', d.card, 'variant', d.variant, 'extra', d.extra))
        from dup d
        where d.user_id = pa.id
          and exists (select 1 from public.wishlist_items w where w.user_id = (select uid from me) and w.card_id = d.card_id)
      ), '[]'::jsonb) as they_have,
      coalesce((
        select jsonb_agg(jsonb_build_object('card_id', d.card_id, 'card', d.card, 'variant', d.variant, 'extra', d.extra))
        from dup d
        where d.user_id = (select uid from me)
          and exists (select 1 from public.wishlist_items w where w.user_id = pa.id and w.card_id = d.card_id)
      ), '[]'::jsonb) as i_have
    from partners pa
  )
  select r.id, r.username, r.name, r.avatar_url, r.they_have, r.i_have
  from matched r
  where jsonb_array_length(r.they_have) + jsonb_array_length(r.i_have) > 0
  order by (jsonb_array_length(r.they_have) > 0 and jsonb_array_length(r.i_have) > 0) desc,
           jsonb_array_length(r.they_have) + jsonb_array_length(r.i_have) desc
  limit 30;
$$;

-- Minhas trocas, com os dados do outro treinador.
create or replace function public.my_trades()
returns table (
  id uuid,
  status text,
  outgoing boolean,
  offer jsonb,
  request jsonb,
  message text,
  applied boolean,
  created_at timestamptz,
  updated_at timestamptz,
  other_id uuid,
  other_username text,
  other_name text,
  other_avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.status,
    t.from_user = (select auth.uid()),
    t.offer,
    t.request,
    t.message,
    case when t.from_user = (select auth.uid()) then t.applied_from else t.applied_to end,
    t.created_at,
    t.updated_at,
    o.id,
    o.username,
    o.name,
    o.avatar_url
  from public.trades t
  join public.profiles o on o.id = case when t.from_user = (select auth.uid()) then t.to_user else t.from_user end
  where (select auth.uid()) in (t.from_user, t.to_user)
  order by t.updated_at desc
  limit 100;
$$;

-- Monta os itens a partir da coleção de quem tem a carta (o app não consegue inventar cartas).
create or replace function public.trade_items(p_owner uuid, p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then
    raise exception 'Escolha até 20 cartas de cada lado.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'card_id', x.card_id,
    'variant', case when x.variant in ('normal', 'holo', 'reverse', 'firstEdition') then x.variant else 'normal' end,
    'quantity', least(greatest(coalesce(x.quantity, 1), 1), 9),
    'card', (select e.card from public.collection_entries e where e.user_id = p_owner and e.card_id = x.card_id limit 1)
  )), '[]'::jsonb)
  into result
  from jsonb_to_recordset(p_items) as x(card_id text, variant text, quantity int);
  if exists (select 1 from jsonb_array_elements(result) i where i -> 'card' = 'null'::jsonb or i -> 'card' is null) then
    raise exception 'Uma das cartas não está mais na coleção.';
  end if;
  return result;
end;
$$;

create or replace function public.propose_trade(p_to uuid, p_offer jsonb, p_request jsonb, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
  offer jsonb;
  request jsonb;
begin
  if me is null then raise exception 'Entre na sua conta para propor trocas.'; end if;
  if not exists (select 1 from public.profiles p where p.id = me and p.open_to_trade) then
    raise exception 'Ligue "Participar das trocas" antes de propor.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_to and p.open_to_trade and p.is_public) then
    raise exception 'Este treinador não está aceitando trocas.';
  end if;
  offer := public.trade_items(me, coalesce(p_offer, '[]'::jsonb));
  request := public.trade_items(p_to, coalesce(p_request, '[]'::jsonb));
  if jsonb_array_length(offer) + jsonb_array_length(request) = 0 then
    raise exception 'Escolha pelo menos uma carta.';
  end if;
  if char_length(p_message) > 280 then raise exception 'A mensagem pode ter até 280 caracteres.'; end if;
  if (select count(*) from public.trades t where t.from_user = me and t.to_user = p_to and t.status = 'pending') >= 3 then
    raise exception 'Você já tem 3 propostas esperando resposta deste treinador.';
  end if;
  insert into public.trades (from_user, to_user, offer, request, message)
  values (me, p_to, offer, request, nullif(trim(p_message), ''))
  returning trades.id into new_id;
  return new_id;
end;
$$;

-- Cada ação só vale para o lado certo e no momento certo.
create or replace function public.respond_trade(p_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  t public.trades;
begin
  select * into t from public.trades where trades.id = p_id and me in (trades.from_user, trades.to_user) for update;
  if not found then raise exception 'Troca não encontrada.'; end if;

  if p_action = 'accept' and t.status = 'pending' and me = t.to_user then
    update public.trades set status = 'accepted', updated_at = now() where trades.id = p_id;
  elsif p_action = 'decline' and t.status = 'pending' and me = t.to_user then
    update public.trades set status = 'declined', updated_at = now() where trades.id = p_id;
  elsif p_action = 'cancel' and t.status in ('pending', 'accepted') then
    update public.trades set status = 'cancelled', updated_at = now() where trades.id = p_id;
  elsif p_action = 'complete' and t.status = 'accepted' then
    update public.trades set status = 'completed', updated_at = now() where trades.id = p_id;
  elsif p_action = 'applied' and t.status = 'completed' then
    if me = t.from_user then
      update public.trades set applied_from = true where trades.id = p_id;
    else
      update public.trades set applied_to = true where trades.id = p_id;
    end if;
  else
    raise exception 'Esta ação não está disponível para esta troca.';
  end if;
  return p_action;
end;
$$;

revoke all on function public.trade_matches() from public, anon;
revoke all on function public.my_trades() from public, anon;
revoke all on function public.trade_items(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.propose_trade(uuid, jsonb, jsonb, text) from public, anon;
revoke all on function public.respond_trade(uuid, text) from public, anon;
grant execute on function public.trade_matches() to authenticated;
grant execute on function public.my_trades() to authenticated;
grant execute on function public.propose_trade(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.respond_trade(uuid, text) to authenticated;
