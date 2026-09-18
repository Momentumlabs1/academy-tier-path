-- Zugangs-Links fuer die Freischalt-Mail.
--
-- Ansage Diego 18.09.: "wenn ich freischalten druecke, soll er eine E-Mail
-- bekommen mit Zugang zur Signalgruppe und zur Akademie" — und der Kunde soll
-- sich vor dem Willkommen ein eigenes Passwort setzen.
--
-- Warum eine eigene Tabelle statt direkt eines Supabase-Anmeldelinks in der
-- Mail: der Supabase-Link verfaellt nach einer Stunde. Eine Freischalt-Mail
-- wird aber oft erst am Abend oder am naechsten Tag geoeffnet. Deshalb steht in
-- der Mail ein eigener Link (/zugang?t=…), 7 Tage gueltig; erst beim Klick
-- mintet die Funktion `zugang` einen frischen Supabase-Anmeldelink.

create table if not exists public.access_invites (
  token       text primary key,
  email       text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  created_by  text
);

create index if not exists access_invites_email_idx on public.access_invites (lower(email));

comment on table public.access_invites is
  'Zugangs-Links aus der Freischalt-Mail (member-freischalten). Nur Service-Rolle.';

alter table public.access_invites enable row level security;
revoke all on public.access_invites from anon, authenticated;
