-- PokeFlex: perfil público, seguir treinadores e feed de atividades.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- As tabelas continuam fechadas (cada um lê só o que é seu). O que é público sai apenas pelas
-- funções abaixo, que escolhem os campos: nunca o preço pago, o e-mail ou os desejos.

-- Perfil público -------------------------------------------------------------

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists show_value boolean not null default false;
alter table public.profiles add column if not exists bio text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (char_length(bio) <= 160);
create unique index if not exists profiles_username_idx on public.profiles (username);

-- Seguir -------------------------------------------------------------------

create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

drop policy if exists "Seguir: ver as minhas relações" on public.follows;
create policy "Seguir: ver as minhas relações" on public.follows
  for select to authenticated
  using ((select auth.uid()) in (follower_id, followee_id));

drop policy if exists "Seguir: seguir perfis públicos" on public.follows;
create policy "Seguir: seguir perfis públicos" on public.follows
  for insert to authenticated
  with check (
    (select auth.uid()) = follower_id
    and exists (select 1 from public.profiles p where p.id = followee_id and p.is_public)
  );

drop policy if exists "Seguir: deixar de seguir" on public.follows;
create policy "Seguir: deixar de seguir" on public.follows
  for delete to authenticated
  using ((select auth.uid()) = follower_id);

-- Atividades (feed) ----------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('card', 'badge', 'level')),
  data jsonb not null check (pg_column_size(data) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists activities_user_created_idx on public.activities (user_id, created_at desc);

alter table public.activities enable row level security;

drop policy if exists "Atividade: ver as próprias" on public.activities;
create policy "Atividade: ver as próprias" on public.activities
  for select to authenticated using ((select auth.uid()) = user_id);

-- Cartas entram pelo gatilho abaixo; insígnias e níveis são registrados pelo app.
drop policy if exists "Atividade: registrar conquista" on public.activities;
create policy "Atividade: registrar conquista" on public.activities
  for insert to authenticated
  with check ((select auth.uid()) = user_id and kind in ('badge', 'level'));

drop policy if exists "Atividade: apagar as próprias" on public.activities;
create policy "Atividade: apagar as próprias" on public.activities
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Toda carta adicionada vira uma atividade "capturou".
create or replace function public.log_card_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activities (user_id, kind, data)
  values (
    new.user_id,
    'card',
    jsonb_build_object(
      'id', new.card_id,
      'name', new.card ->> 'name',
      'image', new.card ->> 'imageUrl',
      'set', new.card ->> 'series',
      'variant', new.variant,
      'quantity', new.quantity
    )
  );
  return new;
end;
$$;

drop trigger if exists on_collection_entry_added on public.collection_entries;
create trigger on_collection_entry_added
  after insert on public.collection_entries
  for each row execute function public.log_card_activity();

-- Funções públicas -----------------------------------------------------------

-- Perfil de um treinador pelo nome de usuário. Só responde se o perfil for público (ou se for o seu).
create or replace function public.public_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'name', p.name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'show_value', p.show_value,
    'is_public', p.is_public,
    'created_at', p.created_at,
    'followers', (select count(*) from public.follows f where f.followee_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id),
    'is_following', exists (
      select 1 from public.follows f where f.followee_id = p.id and f.follower_id = (select auth.uid())
    ),
    'entries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'card', e.card,
          'variant', e.variant,
          'condition', e.condition,
          'language', e.language,
          'quantity', e.quantity,
          'graded_company', e.graded_company,
          'graded_grade', e.graded_grade,
          'added_at', e.added_at
        )
        order by e.added_at desc
      )
      from public.collection_entries e
      where e.user_id = p.id
    ), '[]'::jsonb),
    'showcases', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', s.id, 'name', s.name, 'card_ids', s.card_ids, 'style', s.style, 'is_featured', s.is_featured)
        order by s.is_featured desc, s.created_at
      )
      from public.showcases s
      where s.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.username = lower(p_username)
    and (p.is_public or p.id = (select auth.uid()));
$$;

-- Busca de treinadores públicos por nome ou @usuário; sem termo, mostra os mais recentes.
create or replace function public.search_trainers(p_query text default '')
returns table (id uuid, username text, name text, avatar_url text, cards bigint, is_following boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.name,
    p.avatar_url,
    coalesce((select sum(e.quantity) from public.collection_entries e where e.user_id = p.id), 0) as cards,
    exists (select 1 from public.follows f where f.followee_id = p.id and f.follower_id = (select auth.uid())) as is_following
  from public.profiles p
  where p.is_public
    and p.username is not null
    and (
      coalesce(trim(p_query), '') = ''
      or p.username ilike '%' || trim(p_query) || '%'
      or p.name ilike '%' || trim(p_query) || '%'
    )
  order by p.created_at desc
  limit 24;
$$;

-- Feed: atividades suas e de quem você segue (só perfis públicos aparecem).
create or replace function public.feed(p_before timestamptz default null, p_limit int default 40)
returns table (
  id uuid,
  kind text,
  data jsonb,
  created_at timestamptz,
  user_id uuid,
  username text,
  name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.kind, a.data, a.created_at, p.id, p.username, p.name, p.avatar_url
  from public.activities a
  join public.profiles p on p.id = a.user_id
  where (select auth.uid()) is not null
    and (
      a.user_id = (select auth.uid())
      or (
        p.is_public
        and exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = a.user_id)
      )
    )
    and (p_before is null or a.created_at < p_before)
  order by a.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.public_profile(text) from public;
revoke all on function public.search_trainers(text) from public;
revoke all on function public.feed(timestamptz, int) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
grant execute on function public.search_trainers(text) to anon, authenticated;
grant execute on function public.feed(timestamptz, int) to authenticated;
-- O Supabase dá acesso a anon por padrão em funções novas; o feed é só para quem está logado.
revoke execute on function public.feed(timestamptz, int) from anon;
