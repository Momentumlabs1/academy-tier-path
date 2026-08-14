-- Credit a member to a partner by the partner's IB ACCOUNT NUMBER, not their email.
--
-- Attribution has been dead since the broker switch, and this is why: step 1 of
-- apply_broker_rollup() resolves a member's partner by joining
-- `broker_clients.direct_ib_email` against `tenant_ib_emails`. TradeQuo returned
-- the IB's email address, so that worked. HeroFX does not — it returns the IB's
-- ACCOUNT NUMBER as `partnerAccount`, which hero-sync stores in `direct_ib_id`
-- and which nothing has ever read. Verified on a live client: 3365887 comes back
-- with `partnerAccount: "2248356"` and no IB email at all.
--
-- So the account number gets its own mapping, alongside the email one rather than
-- replacing it: the legacy TradeQuo rows still resolve through email, and their
-- attribution must not break.
--
-- WHY THIS IS THE RIGHT KEY ANYWAY
-- Every partner is given their own IB sub-account at the broker, and the broker
-- stamps that number onto every client who registers under it. That makes it the
-- broker's OWN record of who referred whom — not something we infer from an email
-- matching, or from a tracking parameter surviving a redirect. It is the one
-- identifier that cannot be lost between the ad and the account.
--
-- It answers "which PARTNER", not "which MEMBER". Matching a broker client to the
-- individual member still runs on email, with the click_id as the exact answer
-- once Hero returns it (their back office stores it — "Last UTM mark → Click Id"
-- — but no API field exposes it today).

CREATE TABLE IF NOT EXISTS public.tenant_ib_accounts (
  broker      TEXT NOT NULL,
  ib_account  TEXT NOT NULL,
  tenant_slug TEXT NOT NULL REFERENCES public.tenants(slug) ON DELETE CASCADE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One IB account belongs to exactly ONE partner. Without this a second row
  -- could silently re-point an existing partner's whole client base — and every
  -- commission that follows from it — at someone else.
  PRIMARY KEY (broker, ib_account)
);

CREATE INDEX IF NOT EXISTS idx_tenant_ib_accounts_slug
  ON public.tenant_ib_accounts (tenant_slug);

ALTER TABLE public.tenant_ib_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_ib_accounts_admin_read ON public.tenant_ib_accounts;
CREATE POLICY tenant_ib_accounts_admin_read ON public.tenant_ib_accounts
  FOR SELECT USING (is_platform_admin());

-- Rollup: resolve the partner from EITHER mapping.
-- Unchanged from 033 apart from step 1.
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
  PERFORM pg_advisory_xact_lock(hashtext('apply_broker_rollup'));

  -- 1) Partner attribution: by IB email (TradeQuo-era) OR IB account number
  --    (HeroFX and anything else that identifies its IBs numerically).
  --    DISTINCT ON + deterministic ORDER BY: a member with broker profiles under
  --    several IBs always resolves to the same (earliest) partner.
  WITH matches AS (
    SELECT DISTINCT ON (m.id)
           m.id AS member_id,
           COALESCE(tie.tenant_slug, tia.tenant_slug) AS slug
      FROM members m
      JOIN broker_clients bc ON lower(bc.email) = lower(m.email)
      LEFT JOIN tenant_ib_emails tie
        ON lower(tie.ib_email) = lower(coalesce(bc.direct_ib_email, ''))
      LEFT JOIN tenant_ib_accounts tia
        ON tia.broker = bc.broker
       AND tia.ib_account = bc.direct_ib_id
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

  -- 2) Deposits: reconcile the ledger against the ratcheted broker figure.
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

  -- 3) Trades -> trade_events (idempotent on broker_trade_id), broker-aware joins.
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

  PERFORM academy_recompute_activity_all();

  RETURN jsonb_build_object(
    'attributed', v_attributed,
    'deposit_events', v_dep_events,
    'trade_events', v_trades
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.apply_broker_rollup() FROM anon, authenticated, public;
