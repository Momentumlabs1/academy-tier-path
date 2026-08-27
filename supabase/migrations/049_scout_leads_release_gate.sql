-- 049: Freigabe-Schranke fuer Scout-Leads.
--
-- Die vom Tool importierte Liste soll das Team erst sehen, wenn der Admin sie
-- geprueft und freigegeben hat. Mitarbeiter sehen: freigegebene Zeilen + die
-- eigenen Eintraege. Der Admin sieht und schaltet alles.
ALTER TABLE scout_leads ADD COLUMN IF NOT EXISTS released boolean NOT NULL DEFAULT true;

-- Bestehende Tool-Importe zurueck hinter die Schranke.
UPDATE scout_leads SET released = false WHERE source = 'tool';

DROP POLICY IF EXISTS scout_leads_staff_all ON scout_leads;

CREATE POLICY scout_leads_staff_select ON scout_leads FOR SELECT USING (
  is_platform_admin() OR (is_staff() AND (released OR lower(coalesce(created_by,'')) = lower(coalesce(auth.email(),''))))
);
CREATE POLICY scout_leads_staff_insert ON scout_leads FOR INSERT WITH CHECK (is_staff());
CREATE POLICY scout_leads_staff_update ON scout_leads FOR UPDATE USING (
  is_platform_admin() OR (is_staff() AND (released OR lower(coalesce(created_by,'')) = lower(coalesce(auth.email(),''))))
) WITH CHECK (
  -- Nur der Admin darf die Schranke selbst umlegen: Staff-Updates muessen den
  -- released-Wert unveraendert lassen (durchgesetzt per Trigger unten).
  is_platform_admin() OR is_staff()
);
CREATE POLICY scout_leads_admin_delete ON scout_leads FOR DELETE USING (is_platform_admin());

-- WITH CHECK kann alt/neu nicht vergleichen — der Trigger kann es.
CREATE OR REPLACE FUNCTION scout_leads_guard_released() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Ohne JWT (service_role / direktes SQL) greift die Schranke nicht.
  IF NEW.released IS DISTINCT FROM OLD.released AND NOT is_platform_admin()
     AND coalesce(current_setting('request.jwt.claims', true), '') <> '' THEN
    RAISE EXCEPTION 'nur der Admin schaltet Leads frei';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_scout_leads_guard_released ON scout_leads;
CREATE TRIGGER trg_scout_leads_guard_released BEFORE UPDATE ON scout_leads
  FOR EACH ROW EXECUTE FUNCTION scout_leads_guard_released();
