-- Eine Kontonummer, die schon einer anderen Marke gehoert, wird nicht
-- stillschweigend umgehaengt.
--
-- GEFUNDEN 23.08.2026. approve_ib_claim endete auf
--   ON CONFLICT (broker, ib_account) DO UPDATE SET tenant_slug = EXCLUDED.tenant_slug
-- Traegt ein Partner also die IB-Nummer eines ANDEREN Partners ein und der
-- Admin klickt freigeben, wandert die Zuordnung lautlos zu ihm. Ab dem naechsten
-- apply_broker_rollup wird das gesamte Volumen dieses Kontos dem Falschen
-- gutgeschrieben — und tenant_ib_accounts ist die einzige Aufzeichnung darueber,
-- wem was gehoert. Danach laesst sich nicht mehr feststellen, dass es je anders
-- war.
--
-- Der Admin sieht im Freigabe-Dialog nur Marke + Nummer; dass die Nummer bereits
-- vergeben ist, stand nirgends. Genau davor warnt der Kopf von PartnerIbSetup
-- ("A partner who could write there could enter someone ELSE's IB number and be
-- credited with their volume, and nothing afterwards could detect it") — die
-- Bestaetigung durch einen Menschen sollte das abfangen, konnte es aber nicht,
-- weil ihr die Information fehlte.
--
-- Jetzt bricht die Freigabe mit einer klaren Meldung ab. Eine echte Umhaengung
-- bleibt moeglich, aber nur bewusst: erst die alte Zeile in tenant_ib_accounts
-- entfernen, dann freigeben.
create or replace function public.approve_ib_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE c RECORD; v_owner text;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'not authorised'; END IF;

  SELECT * INTO c FROM tenant_ib_claims WHERE id = p_claim_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found or already reviewed'; END IF;

  SELECT tenant_slug INTO v_owner
    FROM tenant_ib_accounts
   WHERE broker = c.broker AND ib_account = c.ib_account;

  IF v_owner IS NOT NULL AND v_owner IS DISTINCT FROM c.tenant_slug THEN
    RAISE EXCEPTION
      'IB account % (%) already belongs to brand "%" — remove that assignment first if this is really a transfer',
      c.ib_account, c.broker, v_owner;
  END IF;

  INSERT INTO tenant_ib_accounts (broker, ib_account, tenant_slug, note)
  VALUES (c.broker, c.ib_account, c.tenant_slug, 'confirmed from partner claim')
  ON CONFLICT (broker, ib_account) DO NOTHING;

  UPDATE tenant_ib_claims SET status = 'approved', reviewed_at = now() WHERE id = p_claim_id;
END; $function$;
