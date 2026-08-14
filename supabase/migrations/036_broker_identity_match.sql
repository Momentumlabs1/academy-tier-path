-- Match a broker client to a member without the click_id.
--
-- HeroFX cannot return our tracking id, and the reason is architectural rather
-- than a missing feature: registration and partnership live in separate databases,
-- and passing the value across would mean opening a hole in the firewall of a
-- licensed broker. That is a no, and it is a reasonable no. So identification runs
-- on the email address — which fails silently the moment someone registers at the
-- broker with a different address than they used here.
--
-- Silently is the problem, not the mismatch itself. A member who deposits and
-- never gets unlocked does not file a bug report; they leave. Everything below
-- exists to make a mismatch loud, catchable, and repairable.
--
--   · members.broker_email — the address they actually used at the broker, when it
--     differs. Asked for once, on the spot, and the join then honours both.
--   · affiliate_clicks.member_id — who left for the broker and when. Nothing has
--     ever written this table, which is also why every partner dashboard shows
--     zero clicks.
--   · unmatched_broker_clients — the review queue: broker clients matching nobody,
--     each with the likeliest member from the click log beside it.
--
-- The click log deliberately does NOT auto-match. A wrong time-window guess
-- unlocks a stranger's academy against someone else's money, which is far worse
-- than one manual confirmation. It suggests; a human decides.

-- ── The address they used at the broker ──────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS broker_email TEXT;

COMMENT ON COLUMN public.members.broker_email IS
  'Address used at the broker when it differs from the academy login. Set by the member after a failed lookup, or by an admin from the unmatched queue.';

CREATE INDEX IF NOT EXISTS idx_members_broker_email
  ON public.members (lower(broker_email));

-- ── Who left for the broker, and when ───────────────────────────────────────
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created
  ON public.affiliate_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_member
  ON public.affiliate_clicks (member_id, created_at DESC);

-- Writable by the member themselves, for their own row only. A plain INSERT policy
-- would let any authenticated caller write any member_id and any tenant, which is
-- how a click counter becomes a number nobody can trust.
CREATE OR REPLACE FUNCTION public.log_broker_click(p_tenant_slug TEXT, p_click_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member UUID;
  v_tenant UUID;
BEGIN
  SELECT id INTO v_member FROM members WHERE auth_user_id = auth.uid();
  IF v_member IS NULL THEN RETURN; END IF;          -- not a member: nothing to log
  SELECT id INTO v_tenant FROM tenants WHERE slug = p_tenant_slug;

  INSERT INTO affiliate_clicks (tenant_id, landing_slug, click_id, member_id)
  VALUES (v_tenant, p_tenant_slug, p_click_id, v_member);
END; $$;

GRANT EXECUTE ON FUNCTION public.log_broker_click(TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.log_broker_click(TEXT, TEXT) FROM anon, public;

-- ── The review queue ────────────────────────────────────────────────────────
-- Broker clients that match no member, each with the likeliest candidate: someone
-- who left for the broker shortly before that client registered. Two independent
-- signals — the time gap and whether the names agree — so a human can confirm in
-- a second instead of investigating.
CREATE OR REPLACE VIEW public.unmatched_broker_clients
WITH (security_invoker = true) AS
SELECT bc.broker,
       bc.client_id,
       bc.email          AS broker_email,
       bc.full_name      AS broker_name,
       bc.registration_date,
       bc.net_deposit,
       bc.direct_ib_id,
       cand.member_id    AS suggested_member_id,
       cand.member_email AS suggested_member_email,
       cand.member_name  AS suggested_member_name,
       cand.gap_minutes,
       cand.name_agrees
  FROM broker_clients bc
  LEFT JOIN LATERAL (
    SELECT m.id AS member_id, m.email AS member_email, m.name AS member_name,
           round(EXTRACT(EPOCH FROM (bc.registration_date - ac.created_at)) / 60.0)::INT AS gap_minutes,
           -- Cheap, deliberate name check: broker "DIEGO SCHILL" vs member "Diego
           -- Schill" agree on the first name. Enough to confirm a suggestion, never
           -- enough to act on alone.
           (lower(split_part(coalesce(bc.full_name, ''), ' ', 1))
            = lower(split_part(coalesce(m.name, ''), ' ', 1))
            AND coalesce(bc.full_name, '') <> '') AS name_agrees
      FROM affiliate_clicks ac
      JOIN members m ON m.id = ac.member_id
     WHERE bc.registration_date IS NOT NULL
       AND ac.created_at <= bc.registration_date
       AND ac.created_at >= bc.registration_date - INTERVAL '6 hours'
     ORDER BY ac.created_at DESC
     LIMIT 1
  ) cand ON TRUE
 WHERE NOT EXISTS (
   SELECT 1 FROM members m
    WHERE lower(m.email) = lower(bc.email)
       OR lower(coalesce(m.broker_email, '')) = lower(coalesce(bc.email, '#none'))
 );

REVOKE ALL ON public.unmatched_broker_clients FROM anon, authenticated;

-- ── Rollup: honour broker_email everywhere it joins on email ────────────────
-- Unchanged from 035 apart from the three join conditions.
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
END; $$;

REVOKE EXECUTE ON FUNCTION public.apply_broker_rollup() FROM anon, authenticated, public;

-- Lets a member record the address they used at the broker, on their own row only.
CREATE OR REPLACE FUNCTION public.set_broker_email(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_email IS NULL OR position('@' in p_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  UPDATE members SET broker_email = lower(trim(p_email)) WHERE auth_user_id = auth.uid();
END; $$;

GRANT EXECUTE ON FUNCTION public.set_broker_email(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_broker_email(TEXT) FROM anon, public;
