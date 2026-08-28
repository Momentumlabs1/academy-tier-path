-- Die Bruecke zwischen dem Bot, der die Einzahlung begleitet, und der Akademie.
--
-- HINWEIS ZUR NUMMER: parallel zu 062_guard_pins_broker_email.sql entstanden,
-- ohne davon zu wissen. Beide haben members_guard_standing ersetzt, die
-- spaetere hat die fruehere ueberschrieben. Zusammengefuehrt in 066 — das ist
-- die gueltige Fassung des Waechters.
--
-- WAS BISHER FEHLTE
-- Der Setter-Bot fuehrt ein vollstaendiges Gespraech, schickt einen
-- personalisierten Broker-Link (utm_campaign=st_xxx) und fragt danach sogar
-- ausdruecklich nach der Broker-Adresse (script.py ASK_BROKER_EMAIL). Beides
-- landet in setter_leads — einer Tabelle, die apply_broker_rollup nie liest.
-- Der Abgleich laeuft ueber members.email. Gemessen: 0 der vom Bot erfragten
-- Adressen haben je ein Mitglied erreicht. Verbunden waren die zwei Systeme
-- nur durch einen Satz im Bot-Skript: "Register with the same email you used
-- at the broker."
--
-- Ein Satz ist keine Verbindung. Wer sich mit einer anderen Adresse anmeldet —
-- oder kuenftig per Apple mit verborgener Adresse — faellt lautlos durch.
--
-- WAS DIESE SPALTE TUT
-- Der Bot haengt seinen Token kuenftig auch an den Akademie-Link. Die
-- Registrierung reicht ihn durch, und damit ist die Kette geschlossen:
--
--   setter_leads.token  =  members.setter_token
--                       =  broker_clients.utm_campaign   (falls Hero ihn zurueckgibt)
--
-- Der Token ist ein Beweis, keine Behauptung: ihn hat nur, wer den Link vom
-- Bot bekommen hat. Deshalb darf die Zuordnung darueber automatisch laufen,
-- waehrend eine selbst getippte Adresse (broker_email_claim, Migration 050)
-- weiter einen Menschen braucht.
alter table public.members
  add column if not exists setter_token text;

comment on column public.members.setter_token is
  'Token des Setter-Bot-Leads, ueber den dieses Mitglied kam (setter_leads.token). '
  'Kommt aus dem Akademie-Link, den der Bot verschickt — nicht vom Mitglied '
  'getippt, deshalb belastbar. Verbindet Bot-Gespraech, Broker-Kunde und Konto.';

create index if not exists members_setter_token_idx
  on public.members (setter_token) where setter_token is not null;
