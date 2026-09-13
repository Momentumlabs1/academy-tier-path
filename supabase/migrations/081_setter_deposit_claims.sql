-- Die Tabelle, ohne die der Bot NIE jemanden ueber die Broker-Mail freischaltet.
--
-- Gefunden am 13.09. beim Nachgehen von Jonnys Test (HeroFX): der Setter-Bot
-- ordnet eine Einzahlung einem Lead auf zwei Wegen zu — ueber den Token im Link
-- (utm_campaign) oder ueber die Broker-Mail, die der Kunde im Chat nennt. Hero
-- liefert den Token nicht zurueck (hero-sync: withClickId 0), also bleibt fuer
-- Hero-Kunden nur die Mail. Dieser Weg prueft vorher in setter_deposit_claims,
-- dass niemand die Einzahlung schon fuer sich beansprucht hat — damit keiner mit
-- einer fremden Adresse fremdes Geld "einloest". Die Tabelle wurde aber nie
-- angelegt: die Pruefung warf 404, der Bot las das (absichtlich vorsichtig) als
-- "verweigern", und deposit_for_email lieferte immer 0. Folge: kein einziger
-- Hero-Kunde konnte je ueber den Bot freigeschaltet werden (0 VIP bis heute).

create table if not exists public.setter_deposit_claims (
  client_email text primary key,
  lead_id uuid not null references public.setter_leads(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.setter_deposit_claims is
  'Welcher Bot-Lead eine Broker-Einzahlung (per Broker-Mail) fuer sich beansprucht. Nur der Setter-Bot (Service-Rolle) liest und schreibt.';

-- Nur die Service-Rolle (umgeht RLS). Keine Policies = kein Zugriff fuer Browser.
alter table public.setter_deposit_claims enable row level security;
revoke all on public.setter_deposit_claims from anon, authenticated;
