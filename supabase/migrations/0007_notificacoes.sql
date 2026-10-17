-- PokeFlex: notificações push (lembrete do streak, trocas e preço-alvo).
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem duplicar nada.
--
-- Quem envia é o servidor (funções da Vercel, com a chave secreta do Supabase). O app só cadastra o aparelho
-- e escolhe o que quer receber.

-- Aparelhos inscritos ---------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Push: ver os meus aparelhos" on public.push_subscriptions;
create policy "Push: ver os meus aparelhos" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Push: remover meus aparelhos" on public.push_subscriptions;
create policy "Push: remover meus aparelhos" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Cadastra o aparelho para quem está logado. Se o mesmo navegador era de outra conta, passa a ser desta.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'Entre na sua conta para ativar as notificações.'; end if;
  if p_endpoint !~ '^https://' then raise exception 'Inscrição inválida.'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
  insert into public.notification_prefs (user_id) values (me) on conflict (user_id) do nothing;
end;
$$;

-- Preferências -----------------------------------------------------------------

create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  streak boolean not null default true,
  trades boolean not null default true,
  prices boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "Avisos: ver os meus" on public.notification_prefs;
create policy "Avisos: ver os meus" on public.notification_prefs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Avisos: criar os meus" on public.notification_prefs;
create policy "Avisos: criar os meus" on public.notification_prefs
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Avisos: mudar os meus" on public.notification_prefs;
create policy "Avisos: mudar os meus" on public.notification_prefs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Registro de envios: impede o mesmo aviso duas vezes (só o servidor usa).
create table if not exists public.notification_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.notification_log enable row level security;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
