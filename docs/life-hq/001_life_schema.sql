-- ═══════════════════════════════════════════════════════════════════════════
-- HQ — Life OS schema (applied to the SPYSECRET Supabase project)
-- Personal life-dashboard tables for Diego: tasks, notes (second brain),
-- day planner, ventures, notification settings + KPI RPCs.
-- Access model: owner-allowlist (life_owners) enforced via is_life_owner()
-- in RLS on every table and inside every security-definer RPC.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Owners allowlist ─────────────────────────────────────────────────────────
create table if not exists public.life_owners (
  user_id uuid primary key,
  email text unique not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_life_owner()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.life_owners o
    where o.user_id = auth.uid()
       or lower(o.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_life_owner() from public, anon;
grant execute on function public.is_life_owner() to authenticated;

-- Seed with Diego's accounts that already exist in auth.users.
insert into public.life_owners (user_id, email)
select u.id, u.email from auth.users u
where lower(u.email) in ('kontakt@momentumlabs.at', 'diego.momentum1@gmail.com', 'strichabi@gmail.com')
on conflict (user_id) do nothing;

-- ── Ventures (Spy Secret, Trading, Content, …) ──────────────────────────────
create table if not exists public.life_ventures (
  slug text primary key,
  name text not null,
  emoji text not null default '🚀',
  kind text not null default 'project', -- saas | trading | content | personal | project
  url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.life_ventures (slug, name, emoji, kind, url, sort_order) values
  ('spy-secret',  'Spy Secret',        '🕵️', 'saas',     'https://spy-secret.com', 1),
  ('trading',     'Trading Academy',   '📈', 'trading',  null,                     2),
  ('content',     'Content & Views',   '🎬', 'content',  null,                     3),
  ('personal',    'Persönlich',        '🌱', 'personal', null,                     4)
on conflict (slug) do nothing;

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.life_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  venture_slug text references public.life_ventures(slug) on delete set null,
  priority int not null default 3 check (priority between 1 and 3), -- 1 = Top
  due_date date,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists life_tasks_open_idx on public.life_tasks (priority, due_date) where done_at is null;

-- ── Second Brain notes ───────────────────────────────────────────────────────
create table if not exists public.life_notes (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  kind text not null default 'note', -- note | idea | link | decision
  tags text[] not null default '{}',
  venture_slug text references public.life_ventures(slug) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists life_notes_created_idx on public.life_notes (pinned desc, created_at desc);

-- ── Day planner ──────────────────────────────────────────────────────────────
create table if not exists public.life_day_plans (
  day date primary key,
  focus text,        -- "das Wichtigste heute"
  reflection text,   -- evening review
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_day_blocks (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  start_min int not null check (start_min >= 0 and start_min < 1440),
  duration_min int not null default 60 check (duration_min > 0),
  title text not null,
  venture_slug text references public.life_ventures(slug) on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists life_day_blocks_day_idx on public.life_day_blocks (day, start_min);

-- ── Settings (singleton) ─────────────────────────────────────────────────────
create table if not exists public.life_settings (
  id int primary key default 1 check (id = 1),
  telegram_bot_token text,
  telegram_chat_id text,
  brief_morning boolean not null default true,
  brief_evening boolean not null default true,
  morning_hour int not null default 7 check (morning_hour between 0 and 23),
  evening_hour int not null default 20 check (evening_hour between 0 and 23),
  email_fallback boolean not null default true,
  notify_email text not null default 'kontakt@momentumlabs.at',
  timezone text not null default 'Europe/Vienna',
  cron_secret text not null default encode(gen_random_bytes(16), 'hex'),
  updated_at timestamptz not null default now()
);
insert into public.life_settings (id) values (1) on conflict (id) do nothing;

-- ── Notifications feed ───────────────────────────────────────────────────────
create table if not exists public.life_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'brief', -- brief_morning | brief_evening | test | system
  title text not null,
  body text not null,
  sent_via text[] not null default '{}', -- telegram | email | feed
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists life_notifications_created_idx on public.life_notifications (created_at desc);

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.life_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists life_tasks_touch on public.life_tasks;
create trigger life_tasks_touch before update on public.life_tasks
  for each row execute function public.life_touch_updated_at();
drop trigger if exists life_notes_touch on public.life_notes;
create trigger life_notes_touch before update on public.life_notes
  for each row execute function public.life_touch_updated_at();
drop trigger if exists life_day_plans_touch on public.life_day_plans;
create trigger life_day_plans_touch before update on public.life_day_plans
  for each row execute function public.life_touch_updated_at();
drop trigger if exists life_settings_touch on public.life_settings;
create trigger life_settings_touch before update on public.life_settings
  for each row execute function public.life_touch_updated_at();

-- ── RLS: owner-only on everything ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['life_owners','life_ventures','life_tasks','life_notes',
                           'life_day_plans','life_day_blocks','life_settings','life_notifications']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists life_owner_all on public.%I', t);
    execute format(
      'create policy life_owner_all on public.%I for all to authenticated using (public.is_life_owner()) with check (public.is_life_owner())', t);
  end loop;
end $$;
