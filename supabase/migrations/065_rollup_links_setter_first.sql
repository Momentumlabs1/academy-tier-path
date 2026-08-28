-- Der Rollup verknuepft ZUERST, dann rechnet er.
--
-- Sonst haengt die Zuordnung eine Runde hinterher: der Bot erfaehrt die
-- Adresse, aber die Einzahlung wandert erst beim naechsten Lauf ins Konto.
-- Ein Mitglied, das gerade eingezahlt hat und auf seine Freischaltung wartet,
-- merkt genau diesen Unterschied.
--
-- Unveraendert gegenueber der laufenden Fassung ausser der einen PERFORM-Zeile.
CREATE OR REPLACE FUNCTION public.apply_broker_rollup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attributed INT := 0;
  v_dep_events INT := 0;
  v_trades     INT := 0;
  r RECORD;
  v_delta NUMERIC;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('apply_broker_rollup'));

  -- Erst die Bot-Leads an ihre Konten haengen (Migration 064), damit die
  -- Adressen unten schon stimmen.
  PERFORM public.link_setter_identities();

  WITH matches AS (
    SELECT DISTINCT ON (m.id)
           m.id AS member_id,
           COALESCE(tie.tenant_slug, tia.tenant_slug) AS slug
      FROM members m
      JOIN broker_clients bc
        ON lower(bc.email) IN (lower(m.email), lower(coalesce(m.broker_email, '#none')))
      LEFT JOIN tenant_ib_emails tie
        ON lower(tie.ib_email) = lower(coalesce(bc.direct_ib_email, ''))
      LEFT JOIN tenant_ib_accounts tia
        ON tia.broker = bc.broker AND tia.ib_account = bc.direct_ib_id
     WHERE m.referred_by_tenant IS NULL
       AND COALESCE(tie.tenant_slug, tia.tenant_slug) IS NOT NULL
     ORDER BY m.id, bc.registration_date ASC NULLS LAST,
              COALESCE(tie.tenant_slug, tia.tenant_slug) ASC
  ), upd AS (
    UPDATE members m SET referred_by_tenant = matches.slug
      FROM matches WHERE m.id = matches.member_id
    RETURNING 1
  )
  SELECT count(*) INTO v_attributed FROM upd;

  FOR r IN
    SELECT m.id AS member_id,
           round(SUM(bc.net_deposit), 2) AS net_deposit,
           COALESCE((SELECT SUM(d.amount) FROM deposit_events d WHERE d.member_id = m.id), 0) AS ledger
      FROM members m
      JOIN broker_clients bc
        ON lower(bc.email) IN (lower(m.email), lower(coalesce(m.broker_email, '#none')))
     WHERE bc.net_deposit IS NOT NULL
     GROUP BY m.id
  LOOP
    v_delta := round(COALESCE(r.net_deposit, 0) - r.ledger, 2);
    IF abs(v_delta) >= 0.01 THEN
      INSERT INTO deposit_events (member_id, amount, type, note)
      VALUES (r.member_id, v_delta,
              CASE WHEN v_delta >= 0 THEN 'deposit'::deposit_type ELSE 'withdrawal'::deposit_type END,
              'broker-sync reconcile');
      v_dep_events := v_dep_events + 1;
    END IF;
  END LOOP;

  WITH ins AS (
    INSERT INTO trade_events (member_id, lots, symbol, broker_trade_id, traded_at)
    SELECT m.id, bt.volume_lots, bt.symbol, bt.trade_position_id, bt.close_time
      FROM broker_trades bt
      JOIN broker_accounts ba
        ON ba.broker = bt.broker AND ba.account_number = bt.account_number
      JOIN broker_clients bc
        ON bc.broker = ba.broker AND bc.client_id = ba.client_id
      JOIN members m
        ON lower(bc.email) IN (lower(m.email), lower(coalesce(m.broker_email, '#none')))
     WHERE bt.close_time IS NOT NULL
       AND bt.volume_lots IS NOT NULL AND bt.volume_lots >= 0
    ON CONFLICT (broker_trade_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_trades FROM ins;

  PERFORM academy_recompute_activity_all();

  RETURN jsonb_build_object(
    'attributed', v_attributed,
    'deposit_events', v_dep_events,
    'trade_events', v_trades
  );
END; $function$;
