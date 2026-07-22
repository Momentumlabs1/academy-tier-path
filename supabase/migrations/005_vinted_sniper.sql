-- 005_vinted_sniper
-- Vinted Sniper + Ganze-Internet-Bildersuche.
--
-- Drei Tabellen + ein Storage-Bucket:
--   sniper_inspirations : hochgeladene Inspirationsbilder (+ Vision-Attribute)
--   sniper_finds        : gefundene, kaufbare Treffer (Lens / Vinted / …)
--   sniper_presets      : gespeicherte Vinted-Suchen (fuer den Poller)
--
-- Sicherheit (v1, privates Tool): RLS an, Lese-/Schreibrechte grosszuegig.
-- Die eigentliche Kosten-Bremse ist der x-sniper-key-Header + SerpApi/Anthropic
-- Free-Tiers. Vor Produktivbetrieb mit echtem Login absichern (TODO).

-- ── Inspirationsbilder ───────────────────────────────────────────────────────
create table if not exists public.sniper_inspirations (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,               -- oeffentliche URL (Storage o. extern)
  storage_path text,                        -- Pfad im 'sniper'-Bucket, falls hochgeladen
  note        text,
  attributes  jsonb,                        -- Vision-Ergebnis {aesthetic, garment, …}
  keywords    text[] default '{}',
  created_at  timestamptz not null default now()
);

-- ── Treffer ──────────────────────────────────────────────────────────────────
create table if not exists public.sniper_finds (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,             -- 'lens' | 'vinted' | …
  external_id    text not null,             -- stabiler Schluessel je Quelle (Link/ID)
  title          text,
  price          numeric,
  currency       text default 'EUR',
  url            text,                       -- Kauf-/Listing-Link
  image_url      text,
  source_name    text,                       -- Haendler/Domain (bei Lens)
  brand          text,
  size           text,
  condition      text,
  in_stock       boolean,
  similarity     numeric,                    -- optional (CLIP-Score, spaeter)
  inspiration_id uuid references public.sniper_inspirations(id) on delete set null,
  preset_id      text,
  status         text not null default 'new', -- new | saved | bought | dismissed
  created_at     timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists sniper_finds_created_idx on public.sniper_finds (created_at desc);
create index if not exists sniper_finds_source_idx  on public.sniper_finds (source);

-- ── Presets (Vinted-Poller) ──────────────────────────────────────────────────
create table if not exists public.sniper_presets (
  id          text primary key,             -- z.B. 'fairycore-tops'
  label       text not null,
  aesthetic   text,
  garment     text,                          -- tops | dresses | skirts | sets | knit
  keywords    text[] default '{}',
  catalog_ids int[]  default '{}',
  price_to    numeric,
  max_shipping numeric default 6,
  status_ids  int[]  default '{6,1,2}',
  "order"     text   default 'newest_first',
  currency    text   default 'EUR',
  resale_est  numeric,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── RLS (v1: offen; privat halten + spaeter haerten) ─────────────────────────
alter table public.sniper_inspirations enable row level security;
alter table public.sniper_finds        enable row level security;
alter table public.sniper_presets      enable row level security;

drop policy if exists sniper_inspirations_rw on public.sniper_inspirations;
create policy sniper_inspirations_rw on public.sniper_inspirations
  for all using (true) with check (true);

drop policy if exists sniper_finds_read on public.sniper_finds;
create policy sniper_finds_read on public.sniper_finds
  for select using (true);

drop policy if exists sniper_presets_read on public.sniper_presets;
create policy sniper_presets_read on public.sniper_presets
  for select using (true);

-- ── Storage-Bucket fuer Uploads ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sniper', 'sniper', true)
on conflict (id) do nothing;

drop policy if exists sniper_bucket_read on storage.objects;
create policy sniper_bucket_read on storage.objects
  for select using (bucket_id = 'sniper');

drop policy if exists sniper_bucket_write on storage.objects;
create policy sniper_bucket_write on storage.objects
  for insert with check (bucket_id = 'sniper');
