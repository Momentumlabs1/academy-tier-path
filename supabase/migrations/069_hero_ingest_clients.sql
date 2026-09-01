-- HeroFX-Kunden entgegennehmen, die von Diegos Rechner geholt wurden.
--
-- WARUM NICHT VOM SERVER
-- Seit dem 27.08. beantwortet Heros Cloudflare jeden Aufruf aus einem
-- Rechenzentrum mit einer Sperrseite — mit vollen Browser-Headern, von einer
-- fabrikneuen IP, auch ganz ohne Token. Aus einem echten, angemeldeten Browser
-- kommen dieselben Aufrufe mit 200 zurueck. Der Weg ist deshalb derselbe wie
-- bei VT Markets: das Auslesen laeuft am Rechner neben einem angemeldeten
-- Chrome (~/hero-sync), hier kommt nur an, was es gefunden hat.
--
-- UNTERSCHIED ZU VT
-- VT hat keine Partner-Schnittstelle, dort wird die Tabelle im DOM gelesen.
-- Hero HAT eine; das Skript ruft sie aus der Seite heraus auf. Deshalb kommen
-- hier saubere Felder an statt geparster Zellen.
--
-- DIE RATSCHE BLEIBT
-- net_deposit wird nur ANGEHOBEN (promote_balances_to_net_deposit), nie
-- gesenkt. Ein Kontostand faellt beim Handeln; wer eine Stufe erreicht hat,
-- verliert sie nicht, weil ein Trade schieflief.
CREATE OR REPLACE FUNCTION public.hero_ingest_clients(p_rows jsonb)
RETURNS TABLE(seen integer, raised integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seen   INTEGER := 0;
  v_raised INTEGER := 0;
BEGIN
  CREATE TEMP TABLE _hero_in ON COMMIT DROP AS
  SELECT
    NULLIF(TRIM(r->>'client_id'), '')                     AS client_id,
    LOWER(TRIM(r->>'email'))                              AS email,
    NULLIF(TRIM(r->>'full_name'), '')                     AS full_name,
    NULLIF(TRIM(r->>'client_type'), '')                   AS client_type,
    NULLIF(TRIM(r->>'direct_ib_id'), '')                  AS direct_ib_id,
    NULLIF(TRIM(r->>'utm_campaign'), '')                  AS utm_campaign,
    NULLIF(TRIM(r->>'registration_date'), '')::timestamptz AS registration_date,
    (r->>'current_balance_usd')::NUMERIC                  AS current_balance_usd
  FROM jsonb_array_elements(p_rows) AS r
  WHERE NULLIF(TRIM(r->>'email'), '') IS NOT NULL;

  UPDATE _hero_in SET client_id = email WHERE client_id IS NULL;

  SELECT count(*)::INTEGER INTO v_seen FROM _hero_in;

  INSERT INTO broker_clients AS bc (
    broker, client_id, email, full_name, client_type, direct_ib_id,
    utm_campaign, registration_date, current_balance_usd,
    balance_checked_at, synced_at
  )
  SELECT
    'hero', i.client_id, i.email, i.full_name, i.client_type, i.direct_ib_id,
    i.utm_campaign, i.registration_date, i.current_balance_usd,
    CASE WHEN i.current_balance_usd IS NULL THEN NULL ELSE now() END,
    now()
  FROM _hero_in i
  ON CONFLICT (broker, client_id) DO UPDATE SET
    email               = EXCLUDED.email,
    full_name           = COALESCE(EXCLUDED.full_name, bc.full_name),
    client_type         = COALESCE(EXCLUDED.client_type, bc.client_type),
    direct_ib_id        = COALESCE(EXCLUDED.direct_ib_id, bc.direct_ib_id),
    utm_campaign        = COALESCE(EXCLUDED.utm_campaign, bc.utm_campaign),
    registration_date   = COALESCE(EXCLUDED.registration_date, bc.registration_date),
    current_balance_usd = COALESCE(EXCLUDED.current_balance_usd, bc.current_balance_usd),
    balance_checked_at  = COALESCE(EXCLUDED.balance_checked_at, bc.balance_checked_at),
    synced_at           = now();

  SELECT public.promote_balances_to_net_deposit('hero') INTO v_raised;

  RETURN QUERY SELECT v_seen, v_raised;
END;
$function$;

REVOKE ALL ON FUNCTION public.hero_ingest_clients(jsonb) FROM public, anon, authenticated;
