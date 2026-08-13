-- Unlock the academy from HeroFX, using the number HeroFX actually exposes.
--
-- THE FINDING THAT MADE THIS POSSIBLE
-- ----------------------------------
-- Hero's partnership API was believed to expose no per-customer money at all, so
-- hero-sync left `net_deposit` NULL and nothing unlocked. That was wrong, and the
-- mistake was a sampling error: the account-detail route
-- `/partnership/user/<uid>/account/<aid>/` was tested against exactly one account,
-- which happened to be the one broken account on the estate, and its HTTP 500 was
-- read as "the endpoint is broken".
--
-- It is not. Live, on 8 of 9 real accounts:
--     account 2060981 → balance 10465.13 USD
--     account 2484899 → balance   992.95 USD
--     account 1881154 → balance   238.95 USD
-- Only account 1566318 (a legacy TradeLocker record) 500s. So money per customer
-- IS readable — one call per account, and callers must tolerate a 500 per account
-- rather than treating it as a dead endpoint.
--
-- BALANCE IS NOT DEPOSIT, AND THAT MATTERS
-- ----------------------------------------
-- What the endpoint returns is the CURRENT balance, not lifetime deposits. Feeding
-- it straight into `net_deposit` would be actively harmful: step 2 of
-- apply_broker_rollup() books the DELTA between broker net deposit and our ledger,
-- so a customer who deposits 2,000 and then loses 500 would have a -500 WITHDRAWAL
-- booked against them and would be demoted out of a tier they paid for. Trading
-- losses would silently revoke access.
--
-- So the balance is promoted through a ratchet: `net_deposit` only ever moves up
-- (see promote_balances_to_net_deposit below). Once Operator, always Operator. The
-- raw observation is kept separately in `current_balance_usd` so the two are never
-- confused, and so the honest figure is still available for admin views.
--
-- The ratchet also makes partial syncs safe, which matters because reading balances
-- costs one HTTP call per account and a large estate will not finish inside one
-- function invocation. A run that reads half the accounts can only ever raise
-- fewer values — it can never lower one.
--
-- Amounts are USD. The tier thresholds (100 / 2000 / 50000, migrations 001 and 014)
-- are compared against a ledger that TradeQuo already fed in USD
-- (`crm_deposit_usd`, `CRM_NetDeposit_USD`), so no conversion is introduced here —
-- doing so would silently reprice every existing member.

-- ── The observed balance, kept distinct from the ratcheted figure ────────────
ALTER TABLE public.broker_clients
  ADD COLUMN IF NOT EXISTS current_balance_usd NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS balance_checked_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.broker_clients.current_balance_usd IS
  'Sum of live account balances as last read from the broker. Falls with trading '
  'losses. NULL means no account could be read this pass — never write 0 for '
  '"we did not manage to look".';
COMMENT ON COLUMN public.broker_clients.net_deposit IS
  'Ratcheted high-water mark of money seen, in USD. Only ever increases. This is '
  'what apply_broker_rollup() books against the deposit ledger.';

-- ── Finish the job migration 032 started ────────────────────────────────────
-- 032 gave all three tables a `broker` column and re-keyed broker_clients on
-- (broker, client_id), but left broker_accounts and broker_trades on their old
-- single-column keys. Each broker numbers its own accounts and tickets from its
-- own sequence, so those keys collide across brokers exactly the way client_id
-- would have — and a collision here silently overwrites one customer's account
-- (with its balance) with another's.
ALTER TABLE public.broker_accounts DROP CONSTRAINT IF EXISTS broker_accounts_pkey;
ALTER TABLE public.broker_accounts
  ADD CONSTRAINT broker_accounts_pkey PRIMARY KEY (broker, account_number);

ALTER TABLE public.broker_trades DROP CONSTRAINT IF EXISTS broker_trades_pkey;
ALTER TABLE public.broker_trades
  ADD CONSTRAINT broker_trades_pkey PRIMARY KEY (broker, trade_position_id);

CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker_client
  ON public.broker_accounts (broker, client_id);

-- ── The ratchet ─────────────────────────────────────────────────────────────
-- Raises net_deposit to the observed balance where the observation is higher.
-- Never lowers, never invents: a NULL observation is skipped entirely, so a
-- failed read leaves the previous high-water mark standing.
CREATE OR REPLACE FUNCTION public.promote_balances_to_net_deposit(p_broker TEXT)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH upd AS (
    UPDATE broker_clients
       SET net_deposit = GREATEST(COALESCE(net_deposit, 0), current_balance_usd)
     WHERE broker = p_broker
       AND current_balance_usd IS NOT NULL
       AND (net_deposit IS NULL OR current_balance_usd > net_deposit)
    RETURNING 1
  )
  SELECT count(*)::INTEGER FROM upd;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_balances_to_net_deposit(TEXT) FROM anon, authenticated, public;

-- ── Rollup: make the trade joins broker-aware ───────────────────────────────
-- Unchanged from 016 except in step 3, where `broker_trades → broker_accounts →
-- broker_clients` joined on account_number and client_id alone. With two brokers
-- feeding these tables that mis-joins one broker's trades onto another broker's
-- customer, crediting lots — and therefore commission — to the wrong member.
-- Trade ids are additionally namespaced by the writer (hero-sync writes
-- `hero:<ticket>`) so `trade_events.broker_trade_id` cannot collide either.
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
  --    several brokers — summing first keeps the reconcile convergent and
  --    idempotent). Insert only the DELTA — the existing after_deposit_event
  --    trigger recalculates tier/active and fires unlock notifications.
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
      JOIN broker_accounts ba
        ON ba.broker = bt.broker AND ba.account_number = bt.account_number
      JOIN broker_clients bc
        ON bc.broker = ba.broker AND bc.client_id = ba.client_id
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

REVOKE EXECUTE ON FUNCTION public.apply_broker_rollup() FROM anon, authenticated, public;
