-- 013 — Activity systematics: members must actively TRADE, not just deposit.
--
-- Model (handelsüblich, modest): a member must trade at least `min_lots` within
-- a rolling `window_days` window. Below that they enter a `grace_days` grace
-- period; if they still haven't caught up when grace expires they go `inactive`
-- and get kicked from the signal channels. Trading again brings them straight
-- back. Everything is config-driven and DISABLED by default (activity.enabled =
-- false) so nothing kicks until the broker trade feed is live and you flip it on.
--
-- Rolling window (not calendar month) is deliberate: no month-boundary edge
-- cases, and "stay active" means the same thing every day.

-- ── Single-row config for the activity + cron systematics ────────────────────
CREATE TABLE IF NOT EXISTS academy_settings (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- enabled:false = nothing is enforced yet (start state). Turn on when broker
  -- trade data flows. min_lots is intentionally tiny — just proof of activity.
  activity    JSONB NOT NULL DEFAULT
              '{"enabled": false, "min_lots": 0.10, "window_days": 30, "grace_days": 7}'::jsonb,
  cron_secret TEXT  NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO academy_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE academy_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS academy_settings_admin_read ON academy_settings;
CREATE POLICY academy_settings_admin_read ON academy_settings
  FOR SELECT USING (is_platform_admin());

-- ── Every trade / lot the broker reports (idempotent on broker_trade_id) ─────
CREATE TABLE IF NOT EXISTS trade_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lots            NUMERIC(10,4) NOT NULL CHECK (lots >= 0),
  symbol          TEXT,
  broker_trade_id TEXT UNIQUE,          -- dedupe on redelivery
  traded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trade_events_member_time ON trade_events (member_id, traded_at DESC);
ALTER TABLE trade_events ENABLE ROW LEVEL SECURITY;

-- member sees own trades; affiliate sees their tenant's members' trades; admin all.
DROP POLICY IF EXISTS trade_events_self_read ON trade_events;
CREATE POLICY trade_events_self_read ON trade_events
  FOR SELECT USING (member_id = current_member_id());
DROP POLICY IF EXISTS trade_events_admin_read ON trade_events;
CREATE POLICY trade_events_admin_read ON trade_events
  FOR SELECT USING (is_platform_admin());
DROP POLICY IF EXISTS trade_events_affiliate_read ON trade_events;
CREATE POLICY trade_events_affiliate_read ON trade_events
  FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE referred_by_tenant IN (SELECT owned_tenant_slugs()))
  );

-- ── Activity state on the member ─────────────────────────────────────────────
-- (monthly_lots is reused as the denormalised rolling-window lot count.)
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS last_traded_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activity_status TEXT NOT NULL DEFAULT 'active'
                          CHECK (activity_status IN ('active', 'grace', 'inactive')),
  ADD COLUMN IF NOT EXISTS inactive_since  TIMESTAMPTZ;

-- ── Recompute rolling lots + activity status for ONE member ──────────────────
CREATE OR REPLACE FUNCTION public.academy_recompute_activity(p_member UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg        JSONB;
  v_min      NUMERIC;
  v_window   INT;
  v_grace    INT;
  v_lots     NUMERIC;
  v_last     TIMESTAMPTZ;
  v_status   TEXT;
  v_inactive TIMESTAMPTZ;
BEGIN
  SELECT activity INTO cfg FROM academy_settings WHERE id = 1;
  v_min    := COALESCE((cfg->>'min_lots')::NUMERIC, 0.10);
  v_window := COALESCE((cfg->>'window_days')::INT, 30);
  v_grace  := COALESCE((cfg->>'grace_days')::INT, 7);

  SELECT COALESCE(SUM(lots), 0), MAX(traded_at)
    INTO v_lots, v_last
    FROM trade_events
   WHERE member_id = p_member
     AND traded_at > now() - (v_window || ' days')::interval;

  SELECT inactive_since INTO v_inactive FROM members WHERE id = p_member;

  IF v_lots >= v_min THEN
    v_status := 'active';
    v_inactive := NULL;
  ELSE
    IF v_inactive IS NULL THEN
      v_inactive := now();          -- start the grace clock
    END IF;
    IF now() - v_inactive > (v_grace || ' days')::interval THEN
      v_status := 'inactive';       -- grace expired -> eligible for kick
    ELSE
      v_status := 'grace';
    END IF;
  END IF;

  UPDATE members
     SET monthly_lots    = v_lots,
         last_traded_at   = COALESCE(v_last, last_traded_at),
         activity_status  = v_status,
         inactive_since   = v_inactive
   WHERE id = p_member;

  RETURN v_status;
END; $$;

-- ── Recompute everyone who currently has signal access (deposit ≥ 100) ───────
CREATE OR REPLACE FUNCTION public.academy_recompute_activity_all()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM members WHERE deposit >= 100 LOOP
    PERFORM academy_recompute_activity(r.id);
  END LOOP;
END; $$;

-- Helpers are only for the backend (RLS policies / service role), not the REST API.
REVOKE EXECUTE ON FUNCTION public.academy_recompute_activity(UUID)  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.academy_recompute_activity_all()  FROM anon, authenticated, public;
