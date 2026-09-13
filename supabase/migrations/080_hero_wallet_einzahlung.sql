-- Wallet-Einzahlungen bei HeroFX sichtbar machen.
--
-- Anlass: der HeroFX-Kontakt Jonny hat den Funnel am 12.09. selbst getestet,
-- 100 $ eingezahlt und wurde nicht freigeschaltet. Das Geld lag in seinem
-- Hero-WALLET; ein Handelskonto hatte er nie eroeffnet. Unsere Freischaltung
-- sieht nur Handelskonten (Kontostand je Konto), das Wallet war fuer uns
-- unsichtbar — also sagte der Bot nichts, und der Kunde stand im Leeren.
--
-- Heros Aktivitaets-Feed (/api/dashboards/events/) meldet aber genau diese
-- Schritte je Kunde: "Wallet deposit request N marked executed" und
-- "accountcreate". hero-sync schreibt die Zeitpunkte jetzt hierher, und der
-- Bot sagt dem Kunden gezielt: angekommen, jetzt noch aufs Handelskonto.
-- Einschraenkung laut Hero-Doku v2: der Feed kennt nur DIREKTE Kunden, keine
-- aus Sub-IB-Downlines.

alter table public.broker_clients
  add column if not exists wallet_deposit_at timestamptz,
  add column if not exists trading_account_at timestamptz;

comment on column public.broker_clients.wallet_deposit_at is
  'Letzte ausgefuehrte Wallet-Einzahlung laut Hero-Aktivitaets-Feed (nur direkte Kunden). Kein Betrag — den nennt der Feed nicht.';
comment on column public.broker_clients.trading_account_at is
  'Letztes "accountcreate" laut Hero-Aktivitaets-Feed.';

-- Der Bot sagt das genau einmal je Lead.
alter table public.setter_leads
  add column if not exists wallet_hint_at timestamptz;
