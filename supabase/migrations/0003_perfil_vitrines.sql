-- PokeFlex: foto de perfil e vitrines personalizadas.
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.

-- Foto de perfil -------------------------------------------------------------

alter table public.profiles add column if not exists avatar_url text;

-- Bucket público de leitura (a foto aparece para quem visitar o perfil no futuro);
-- cada usuário só grava na própria pasta: avatars/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar: ver a própria pasta" on storage.objects;
create policy "Avatar: ver a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatar: enviar na própria pasta" on storage.objects;
create policy "Avatar: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatar: trocar na própria pasta" on storage.objects;
create policy "Avatar: trocar na própria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Avatar: apagar da própria pasta" on storage.objects;
create policy "Avatar: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Vitrines -------------------------------------------------------------------

create table if not exists public.showcases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  card_ids text[] not null default '{}' check (cardinality(card_ids) <= 30),
  style text not null default 'cylinder' check (style in ('cylinder', 'orbit', 'wheel')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists showcases_user_idx on public.showcases (user_id, created_at);
-- No máximo uma vitrine principal por usuário.
create unique index if not exists showcases_one_featured_idx on public.showcases (user_id) where is_featured;

alter table public.showcases enable row level security;

drop policy if exists "Vitrine: ler as próprias" on public.showcases;
create policy "Vitrine: ler as próprias" on public.showcases
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Vitrine: criar" on public.showcases;
create policy "Vitrine: criar" on public.showcases
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Vitrine: editar as próprias" on public.showcases;
create policy "Vitrine: editar as próprias" on public.showcases
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Vitrine: apagar as próprias" on public.showcases;
create policy "Vitrine: apagar as próprias" on public.showcases
  for delete to authenticated using ((select auth.uid()) = user_id);
