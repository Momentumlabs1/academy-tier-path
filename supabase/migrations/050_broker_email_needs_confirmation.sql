-- Eine behauptete Broker-Adresse zahlt nichts aus, bevor ein Mensch sie bestaetigt.
--
-- GEFUNDEN 23.08.2026 (Gesamtpruefung), ausnutzbar ohne Vorwissen:
--   1. kostenlos anmelden (jeder darf das, ohne Einzahlung)
--   2. set_broker_email('adresse-eines-echten-einzahlers@...') aufrufen
--   3. beim naechsten hero-sync/vt-ingest ordnet apply_broker_rollup zu ueber
--      lower(bc.email) IN (lower(m.email), lower(coalesce(m.broker_email,'#none')))
--
-- Folge: die Einzahlung eines Fremden wird dem Angreifer gutgeschrieben. Er
-- bekommt Foundation/Operator/Elite ohne einen Cent, dieselbe Einzahlung zaehlt
-- doppelt in affiliate_dashboard.total_deposits, und Schritt 1 der Verrechnung
-- haengt ihm zusaetzlich das referred_by_tenant des Opfers an — ein Partner
-- wird also fuer einen Kunden bezahlt, der nie gezahlt hat.
--
-- Es gab weder eine Pruefung der Adresse noch einen Eindeutigkeits-Index; die
-- einzige Bedingung war ein '@' im Text.
--
-- WARUM NICHT EINFACH "SCHON VERGEBEN" PRUEFEN
-- Die Adresse muss keinem Mitglied gehoeren. Die Warteschlange
-- unmatched_broker_clients ist voll von Broker-Kunden ohne Konto bei uns —
-- genau die waeren weiter frei uebernehmbar. Eindeutigkeit allein reicht nicht.
--
-- Der Aufbau, den Migration 036 fuer denselben Fall schon gewaehlt hat
-- ("It suggests; a human decides"), gilt jetzt auch hier: das Mitglied
-- HINTERLEGT einen Wunsch, die Verrechnung liest ihn NICHT, ein Admin
-- uebernimmt ihn. Kein Mitglied hatte bisher eine Broker-Adresse gesetzt
-- (0 von 12), es geht also nichts verloren.

alter table public.members add column if not exists broker_email_claim text;

comment on column public.members.broker_email_claim is
  'Vom Mitglied selbst behauptete Broker-Adresse. UNGEPRUEFT — apply_broker_rollup '
  'darf hierauf niemals zuordnen. Ein Admin uebernimmt sie mit confirm_broker_email() '
  'nach broker_email, und erst dort zaehlt sie.';

-- Schreibt nur noch den Wunsch, nicht mehr das wirksame Feld.
create or replace function public.set_broker_email(p_email text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF p_email IS NULL OR position('@' in p_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  UPDATE members
     SET broker_email_claim = lower(trim(p_email))
   WHERE auth_user_id = auth.uid();
END; $function$;

-- Die Uebernahme ist ein Admin-Vorgang, wie approve_ib_claim.
create or replace function public.confirm_broker_email(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE v_claim text;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'not authorised'; END IF;

  SELECT broker_email_claim INTO v_claim FROM members WHERE id = p_member_id;
  IF v_claim IS NULL THEN RAISE EXCEPTION 'no pending broker email for this member'; END IF;

  IF EXISTS (SELECT 1 FROM members
              WHERE id <> p_member_id
                AND lower(coalesce(broker_email, email)) = lower(v_claim)) THEN
    RAISE EXCEPTION 'that broker address already belongs to another member';
  END IF;

  UPDATE members SET broker_email = v_claim, broker_email_claim = NULL WHERE id = p_member_id;
END; $function$;

revoke execute on function public.confirm_broker_email(uuid) from anon, authenticated;

-- Zweite Absicherung: dieselbe wirksame Adresse nie zweimal.
create unique index if not exists members_broker_email_unique
  on public.members (lower(broker_email)) where broker_email is not null;
