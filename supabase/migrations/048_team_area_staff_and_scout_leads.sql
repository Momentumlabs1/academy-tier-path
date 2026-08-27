-- 048: Team-Bereich — Mitarbeiter-Rolle + Scout-Leads-Pipeline.
-- (Identisch zur via MCP applizierten Migration; siehe dort fuer Kommentare.)
create table if not exists staff_members (
  email text primary key,
  name text,
  role text not null default 'scout',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table staff_members enable row level security;
drop policy if exists staff_self_read on staff_members;
create policy staff_self_read on staff_members
  for select using (is_platform_admin() or lower(email) = lower(coalesce(auth.email(), '')));

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select is_platform_admin() or exists (
    select 1 from staff_members
    where active and lower(email) = lower(coalesce(auth.email(), ''))
  );
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create table if not exists scout_leads (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manuell',
  platform text,
  handle text not null,
  name text,
  url text,
  yt_subs integer,
  tg_subs integer,
  tt_followers integer,
  sprache text,
  score integer,
  fit text,
  opener text,
  status text not null default 'neu',
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists scout_leads_handle_key on scout_leads (lower(handle));
alter table scout_leads enable row level security;
drop policy if exists scout_leads_staff_all on scout_leads;
create policy scout_leads_staff_all on scout_leads
  for all using (is_staff()) with check (is_staff());

drop policy if exists partner_applications_staff_read on partner_applications;
create policy partner_applications_staff_read on partner_applications
  for select using (is_staff());
drop policy if exists partner_applications_staff_update on partner_applications;
create policy partner_applications_staff_update on partner_applications
  for update using (is_staff()) with check (is_staff());
