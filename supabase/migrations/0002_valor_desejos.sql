-- PokeFlex: histórico diário do valor da coleção e lista de desejos.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.

-- Histórico de valor ---------------------------------------------------------
-- Um registro por usuário por dia, gravado pelo app quando a coleção é aberta.

create table if not exists public.collection_value_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  total_brl numeric(14, 2) not null check (total_brl >= 0),
  cards integer not null check (cards >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.collection_value_snapshots enable row level security;

drop policy if exists "Valor: ler o próprio" on public.collection_value_snapshots;
create policy "Valor: ler o próprio" on public.collection_value_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Valor: gravar o próprio" on public.collection_value_snapshots;
create policy "Valor: gravar o próprio" on public.collection_value_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Valor: atualizar o próprio" on public.collection_value_snapshots;
create policy "Valor: atualizar o próprio" on public.collection_value_snapshots
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Lista de desejos -------------------------------------------------------------

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_id text not null,
  card jsonb not null,
  variant text not null check (variant in ('normal', 'holo', 'reverse', 'firstEdition')),
  target_price numeric(12, 2) check (target_price > 0),
  added_at timestamptz not null default now(),
  unique (user_id, card_id, variant)
);

create index if not exists wishlist_items_user_added_idx on public.wishlist_items (user_id, added_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists "Desejos: ler os próprios" on public.wishlist_items;
create policy "Desejos: ler os próprios" on public.wishlist_items
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Desejos: adicionar nos próprios" on public.wishlist_items;
create policy "Desejos: adicionar nos próprios" on public.wishlist_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Desejos: editar os próprios" on public.wishlist_items;
create policy "Desejos: editar os próprios" on public.wishlist_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Desejos: remover dos próprios" on public.wishlist_items;
create policy "Desejos: remover dos próprios" on public.wishlist_items
  for delete to authenticated using ((select auth.uid()) = user_id);
