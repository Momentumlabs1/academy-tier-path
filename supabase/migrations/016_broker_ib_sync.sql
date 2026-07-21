-- ============================================================
-- 016 — External IB Database sync (TradeQuo/QM read-only MSSQL)
--
-- The broker exposes a read-only SQL Server DB with our whole IB network:
--   [dbo].[clients]      → broker_clients   (hierarchy, deposits, rebates)
--   [dbo].[trades]       → broker_trades    (all closed deals)
--   [dbo].[mt_accounts]  → broker_accounts  (MT account performance)
--
-- A worker with a whitelisted static IP (see broker-sync/) mirrors those
-- tables here, then calls apply_broker_rollup() which feeds the EXISTING
-- academy machinery:
--   · deposit deltas   → deposit_events   (trigger recalculates tier,
--                                          sends unlock notifications)
--   · closed trades    → trade_events     (activity system input)
--   · activity         → academy_recompute_activity_all()
--   · partner credit   → members.referred_by_tenant via tenants.ib_emails
-- ============================================================

-- ── Raw mirror: clients (IBs + customers, all levels) ────────────────────────
CREATE TABLE IF NOT EXISTS broker_clients (
  client_id                TEXT PRIMARY KEY,
  brand                    TEXT,                 -- TQ or QM
  first_name               TEXT,
  last_name                TEXT,
  country                  TEXT,
  email                    TEXT,
  client_type              TEXT,                 -- Client or IB
  direct_ib_id             TEXT,
  direct_ib_email          TEXT,
  registration_date        TIMESTAMPTZ,
  first_deposit_date       TIMESTAMPTZ,
  crm_deposit_usd          NUMERIC(14,2),
  crm_withdrawal_usd       NUMERIC(14,2),
  net_deposit              NUMERIC(14,2),
  first_deposit_amount_usd NUMERIC(14,2),
  notional_volume_usd      NUMERIC(18,2),
  ib_rebates               NUMERIC(14,2),
  pnl_usd                  NUMERIC(14,2),
  last_trade_date          TIMESTAMPTZ,
  utm_uri                  TEXT,
  utm_referrer             TEXT,
  utm_campaign             TEXT,
  synced_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broker_clients_email  ON broker_clients (lower(email));
CREATE INDEX IF NOT EXISTS idx_broker_clients_ib     ON broker_clients (lower(direct_ib_email));

-- ── Raw mirror: MT accounts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_accounts (
  account_number TEXT PRIMARY KEY,
  brand          TEXT,
  client_id      TEXT,
  email          TEXT,
  currency       TEXT,
  balance_local  NUMERIC(14,2),
  balance_usd    NUMERIC(14,2),
  account_type   TEXT,
  volume_lots    NUMERIC(14,4),
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_client ON broker_accounts (client_id);

-- ── Raw mirror: closed trades ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_trades (
  trade_position_id TEXT PRIMARY KEY,
  account_number    TEXT,
  symbol            TEXT,
  direction         TEXT,
  volume_lots       NUMERIC(12,4),
  open_time         TIMESTAMPTZ,
  open_price        NUMERIC(18,6),
  close_time        TIMESTAMPTZ,
  close_price       NUMERIC(18,6),
  profit            NUMERIC(14,2),
  stop_loss         NUMERIC(18,6),
  take_profit       NUMERIC(18,6),
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broker_trades_close   ON broker_trades (close_time DESC);
CREATE INDEX IF NOT EXISTS idx_broker_trades_account ON broker_trades (account_number, close_time DESC);

-- ── Partner attribution mapping: a tenant's IB account e-mails ──────────────
-- Clients whose Direct_IB_Email matches land under that partner.
-- Own table (NOT a tenants column): tenants has a public-read RLS policy for
-- the landing pages, and partner IB e-mails must not be world-readable.
CREATE TABLE IF NOT EXISTS tenant_ib_emails (
  tenant_slug TEXT NOT NULL REFERENCES tenants(slug) ON DELETE CASCADE,
  ib_email    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_slug, ib_email)
);
ALTER TABLE tenant_ib_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_ib_emails_admin_read ON tenant_ib_emails;
CREATE POLICY tenant_ib_emails_admin_read ON tenant_ib_emails FOR SELECT USING (is_platform_admin());

-- ── RLS: raw broker data is backend/admin-only ──────────────────────────────
ALTER TABLE broker_clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_trades   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_clients_admin_read  ON broker_clients;
CREATE POLICY broker_clients_admin_read  ON broker_clients  FOR SELECT USING (is_platform_admin());
DROP POLICY IF EXISTS broker_accounts_admin_read ON broker_accounts;
CREATE POLICY broker_accounts_admin_read ON broker_accounts FOR SELECT USING (is_platform_admin());
DROP POLICY IF EXISTS broker_trades_admin_read   ON broker_trades;
CREATE POLICY broker_trades_admin_read   ON broker_trades   FOR SELECT USING (is_platform_admin());

-- ── Rollup: push mirrored broker truth into the academy tables ──────────────
CREATE OR REPLACE FUNCTION public.apply_broker_rollup()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attributed INT := 0;
  v_dep_events INT := 0;
  v_trades     INT := 0;
  r RECORD;
  v_delta NUMERIC;
BEGIN
  -- Serialize concurrent runs (cron overlap would double-book deltas).
  PERFORM pg_advisory_xact_lock(hashtext('apply_broker_rollup'));

  -- 1) Partner attribution: fill referred_by_tenant where still unset.
  --    DISTINCT ON + deterministic ORDER BY: a member with broker profiles
  --    under several IBs always resolves to the same (earliest) partner.
  WITH matches AS (
    SELECT DISTINCT ON (m.id) m.id AS member_id, tie.tenant_slug AS slug
      FROM members m
      JOIN broker_clients bc ON lower(bc.email) = lower(m.email)
      JOIN tenant_ib_emails tie
        ON lower(tie.ib_email) = lower(coalesce(bc.direct_ib_email, ''))
     WHERE m.referred_by_tenant IS NULL
     ORDER BY m.id, bc.registration_date ASC NULLS LAST, tie.tenant_slug ASC
  ), upd AS (
    UPDATE members m SET referred_by_tenant = matches.slug
      FROM matches WHERE m.id = matches.member_id
    RETURNING 1
  )
  SELECT count(*) INTO v_attributed FROM upd;

  -- 2) Deposits: reconcile the deposit_events ledger against broker net
  --    deposit. AGGREGATED per member (one client can have profiles under
  --    both brands, TQ + QM — summing first keeps the reconcile convergent
  --    and idempotent). Insert only the DELTA — the existing
  --    after_deposit_event trigger recalculates tier/active and fires
  --    unlock notifications.
  FOR r IN
    SELECT m.id AS member_id,
           round(SUM(bc.net_deposit), 2) AS net_deposit,
           COALESCE((SELECT SUM(d.amount) FROM deposit_events d WHERE d.member_id = m.id), 0) AS ledger
      FROM members m
      JOIN broker_clients bc ON lower(bc.email) = lower(m.email)
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

  -- 3) Trades → trade_events (idempotent on broker_trade_id).
  WITH ins AS (
    INSERT INTO trade_events (member_id, lots, symbol, broker_trade_id, traded_at)
    SELECT m.id, bt.volume_lots, bt.symbol, bt.trade_position_id, bt.close_time
      FROM broker_trades bt
      JOIN broker_accounts ba ON ba.account_number = bt.account_number
      JOIN broker_clients  bc ON bc.client_id = ba.client_id
      JOIN members m ON lower(m.email) = lower(bc.email)
     WHERE bt.close_time IS NOT NULL
       AND bt.volume_lots IS NOT NULL AND bt.volume_lots >= 0
    ON CONFLICT (broker_trade_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_trades FROM ins;

  -- 4) Activity system over the fresh trade data.
  PERFORM academy_recompute_activity_all();

  RETURN jsonb_build_object(
    'attributed', v_attributed,
    'deposit_events', v_dep_events,
    'trade_events', v_trades
  );
END; $$;

-- Backend-only, like the other rollup helpers.
REVOKE EXECUTE ON FUNCTION public.apply_broker_rollup() FROM anon, authenticated, public;
