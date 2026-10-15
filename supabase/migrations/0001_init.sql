-- PokeFlex: perfis de treinador e cartas da coleção.
-- Rode uma vez no SQL Editor do Supabase (ou via `supabase db push`).

-- Perfis -------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Perfil: ler o próprio" on public.profiles;
create policy "Perfil: ler o próprio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Perfil: editar o próprio" on public.profiles;
create policy "Perfil: editar o próprio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Cria o perfil automaticamente no cadastro, com o nome enviado pelo app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Coleção ------------------------------------------------------------------

create table if not exists public.collection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null,
  -- Cópia dos dados da carta (nome, imagem, set...) para exibir sem consultar a tcgDex.
  card jsonb not null,
  variant text not null check (variant in ('normal', 'holo', 'reverse', 'firstEdition')),
  condition text not null check (condition in ('MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO')),
  language text not null check (language in ('pt', 'en', 'jp', 'es', 'outro')),
  quantity integer not null check (quantity between 1 and 99),
  graded_company text check (char_length(graded_company) <= 20),
  graded_grade numeric(3, 1) check (graded_grade between 1 and 10),
  price_paid numeric(12, 2) check (price_paid >= 0),
  added_at timestamptz not null default now()
);

create index if not exists collection_entries_user_added_idx on public.collection_entries (user_id, added_at desc);
create index if not exists collection_entries_user_card_idx on public.collection_entries (user_id, card_id);

alter table public.collection_entries enable row level security;

drop policy if exists "Coleção: ler a própria" on public.collection_entries;
create policy "Coleção: ler a própria" on public.collection_entries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Coleção: adicionar na própria" on public.collection_entries;
create policy "Coleção: adicionar na própria" on public.collection_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Coleção: editar a própria" on public.collection_entries;
create policy "Coleção: editar a própria" on public.collection_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Coleção: remover da própria" on public.collection_entries;
create policy "Coleção: remover da própria" on public.collection_entries
  for delete to authenticated using ((select auth.uid()) = user_id);
