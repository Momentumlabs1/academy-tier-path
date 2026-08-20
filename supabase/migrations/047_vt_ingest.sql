-- 047 — Kunden aus dem VT-Backoffice aufnehmen.
--
-- VT Markets hat fuer Partner keine Schnittstelle, aus der man Einzahlungen
-- abfragen koennte. Ihr eigener Kontakt hat als Weg das Auslesen des
-- Partner-Backoffice genannt: von Hand anmelden, Captcha loesen, danach darf
-- ein Programm die Seiten der angemeldeten Sitzung mitlesen. Das Auslesen
-- passiert ausserhalb (~/vt-sync); hier kommt nur an, was es gefunden hat.
--
-- WARUM EINE FUNKTION UND NICHT EIN UPSERT AUS DER EDGE FUNCTION
-- Weil die Sperrklinke auf net_deposit sonst zerbricht. Migration 033 haelt
-- fest: net_deposit ist ein Hoechststand, der nur steigt — "Once Operator,
-- always Operator". Ein gewoehnliches Upsert wuerde den Wert mit dem
-- ueberschreiben, was gerade auf der Seite stand, und ein Kunde, dessen
-- Portalzeile beim Auslesen halb geladen war, faellt aus der Stufe, fuer die
-- er bezahlt hat. Das GREATEST gehoert deshalb in dieselbe Anweisung wie das
-- Schreiben, nicht in einen zweiten Schritt daneben.
--
-- Anders als bei Hero liefert das Portal eine echte Einzahlungssumme statt nur
-- den Kontostand. Die ist das ehrlichere Mass — ein Kunde, der 2.000 einzahlt
-- und 500 verliert, hat 2.000 eingezahlt und 1.500 auf dem Konto. Beides wird
-- getrennt gefuehrt: net_deposit die Einzahlung (gesperrt nach oben),
-- current_balance_usd die Beobachtung.

CREATE OR REPLACE FUNCTION public.vt_ingest_clients(p_rows JSONB)
RETURNS TABLE (seen INTEGER, raised INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seen   INTEGER := 0;
  v_raised INTEGER := 0;
BEGIN
  -- Eingehende Zeilen in eine typisierte Form bringen. Zeilen ohne E-Mail sind
  -- wertlos: die Zuordnung zum Mitglied laeuft ueber die Adresse.
  CREATE TEMP TABLE _vt_in ON COMMIT DROP AS
  SELECT
    NULLIF(TRIM(r->>'client_id'), '')                    AS client_id,
    LOWER(TRIM(r->>'email'))                             AS email,
    NULLIF(TRIM(r->>'full_name'), '')                    AS full_name,
    NULLIF(TRIM(r->>'country'), '')                      AS country,
    (r->>'net_deposit')::NUMERIC                         AS net_deposit,
    (r->>'first_deposit_amount_usd')::NUMERIC            AS first_deposit_amount_usd,
    (r->>'current_balance_usd')::NUMERIC                 AS current_balance_usd,
    (r->>'volume_lots')::NUMERIC                         AS volume_lots
  FROM jsonb_array_elements(p_rows) AS r
  WHERE NULLIF(TRIM(r->>'email'), '') IS NOT NULL;

  -- Ohne Kundennummer im Portal dient die E-Mail als Schluessel. Sie ist beim
  -- Broker ohnehin eindeutig, und ein wechselnder Schluessel wuerde bei jedem
  -- Lauf neue Zeilen fuer dieselbe Person anlegen.
  UPDATE _vt_in SET client_id = email WHERE client_id IS NULL;

  SELECT count(*)::INTEGER INTO v_seen FROM _vt_in;

  INSERT INTO broker_clients AS bc (
    broker, client_id, email, full_name, country,
    net_deposit, first_deposit_amount_usd, current_balance_usd,
    balance_checked_at, synced_at
  )
  SELECT
    'vt', i.client_id, i.email, i.full_name, i.country,
    i.net_deposit, i.first_deposit_amount_usd, i.current_balance_usd,
    CASE WHEN i.current_balance_usd IS NULL THEN NULL ELSE now() END,
    now()
  FROM _vt_in i
  ON CONFLICT (broker, client_id) DO UPDATE SET
    email                    = EXCLUDED.email,
    full_name                = COALESCE(EXCLUDED.full_name, bc.full_name),
    country                  = COALESCE(EXCLUDED.country, bc.country),
    -- Die Sperrklinke. NULL heisst "diesmal nicht gelesen", nicht "null Euro" —
    -- deshalb COALESCE und nicht GREATEST(x, NULL).
    net_deposit              = GREATEST(COALESCE(bc.net_deposit, 0),
                                        COALESCE(EXCLUDED.net_deposit, 0)),
    first_deposit_amount_usd = COALESCE(bc.first_deposit_amount_usd,
                                        EXCLUDED.first_deposit_amount_usd),
    current_balance_usd      = COALESCE(EXCLUDED.current_balance_usd, bc.current_balance_usd),
    balance_checked_at       = COALESCE(EXCLUDED.balance_checked_at, bc.balance_checked_at),
    synced_at                = now();

  -- Kontostand kann die Einzahlung nur anheben, nie senken (wie bei Hero).
  SELECT public.promote_balances_to_net_deposit('vt') INTO v_raised;

  RETURN QUERY SELECT v_seen, v_raised;
END;
$$;

COMMENT ON FUNCTION public.vt_ingest_clients(JSONB) IS
  'Nimmt ausgelesene VT-Backoffice-Zeilen auf. net_deposit steigt nur (Migration 033).';

REVOKE ALL ON FUNCTION public.vt_ingest_clients(JSONB) FROM PUBLIC, anon, authenticated;
