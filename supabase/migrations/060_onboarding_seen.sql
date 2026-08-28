-- Hat dieses Mitglied die Willkommens-Erklaerung schon gesehen?
--
-- WARUM IN DER DATENBANK UND NICHT IN localStorage
-- Alle bisherigen Onboarding-Merker liegen im Browser (onb_video:<email>,
-- onb_seen:<email>, cosmo_welcome_done). Das reicht fuer eine Feier, die man
-- auch zweimal sehen darf. Die Begruessung nach der Registrierung ist etwas
-- anderes: sie erklaert einmal, wo man gelandet ist. Wer sich am Laptop
-- registriert und danach das Handy nimmt, bekaeme sie sonst noch einmal — und
-- ein Erklaerfenster, das wiederkommt, obwohl man es weggeklickt hat, liest
-- sich als Fehler.
--
-- DER WAECHTER LAESST DAS ZU
-- members_guard_standing (024) friert nur die Spalten ein, an denen Geld und
-- Identitaet haengen: deposit, tier, active, activity_status, monthly_lots,
-- referred_by_tenant, auth_user_id, email, joined_at. Diese hier ist keine
-- davon, und members_self_update erlaubt dem Mitglied die eigene Zeile — es
-- kann den Merker also selbst setzen, ohne dass eine Funktion noetig ist.
-- Nachgemessen als echtes Mitglied: Merker wird gesetzt, ein gleichzeitiger
-- Versuch, deposit auf 99999 zu schreiben, bleibt bei 0.
alter table public.members
  add column if not exists onboarding_seen_at timestamptz;

comment on column public.members.onboarding_seen_at is
  'Wann das Mitglied die Willkommens-Erklaerung weggeklickt hat. NULL = noch nie '
  'gesehen. Setzt das Mitglied selbst; bewusst in der DB statt im Browser, damit '
  'sie auf einem zweiten Geraet nicht erneut erscheint.';
