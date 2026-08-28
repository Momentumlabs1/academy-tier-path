-- Ein Werbelink JE BROKER und Partner.
--
-- WARUM DIE EINE SPALTE NICHT REICHT
-- tenants.broker_affiliate_url ist genau ein Feld. Ein Partner hat aber bei
-- jedem Broker einen eigenen Link, und welchen seine Leute brauchen, haengt
-- am Land: US laeuft ueber HeroFX, alles andere ueber VT Markets
-- (brokerForCountry in broker.ts). In eine Spalte passt das nicht, und
-- "der zweite kommt spaeter" darf keine Sackgasse sein — genau das war es.
--
-- WER DARF SCHREIBEN
-- Der Partner selbst. Anders als bei tenant_ib_accounts (dort entscheidet die
-- Kontonummer, WOHIN Provision faellt, deshalb bestaetigt sie ein Mensch)
-- bewegt dieser Link in unserem System kein Geld: es ist die Adresse, die der
-- Partner seinem eigenen Publikum gibt. Ist sie falsch, schadet sie nur ihm.
create table if not exists public.tenant_broker_links (
  tenant_slug text not null references public.tenants(slug) on delete cascade,
  broker      text not null check (broker in ('hero','vt')),
  url         text not null,
  updated_at  timestamptz not null default now(),
  primary key (tenant_slug, broker)
);

comment on table public.tenant_broker_links is
  'Der eigene Werbelink eines Partners je Broker. Setzt der Partner selbst — er '
  'bewegt kein Geld bei uns, er ist die Adresse fuer sein eigenes Publikum. Die '
  'Provisions-Zuordnung haengt dagegen an tenant_ib_accounts und braucht einen Admin.';

alter table public.tenant_broker_links enable row level security;

revoke insert, update, delete, truncate on public.tenant_broker_links from anon;
revoke select on public.tenant_broker_links from anon;
