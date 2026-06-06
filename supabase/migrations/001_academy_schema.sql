-- ============================================================
-- Agent Trading Academy — Supabase Schema
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- Or: supabase db push (local CLI)
-- ============================================================

-- Enable UUID extension (already on in Supabase hosted)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE tier_key AS ENUM ('foundation', 'operator', 'elite');
CREATE TYPE deposit_type AS ENUM ('deposit', 'withdrawal');
CREATE TYPE notification_type AS ENUM (
  'tier_unlocked', 'close_to_next_tier', 'inactive_warning',
  'new_lesson', 'announcement'
);
CREATE TYPE audit_action AS ENUM (
  'member_created', 'tier_changed', 'deposit_verified',
  'lesson_updated', 'member_deactivated', 'broadcast_sent',
  'affiliate_created', 'role_assigned'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- links to auth.users; NULL for server-created rows
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  telegram_handle TEXT,
  deposit         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  monthly_lots    NUMERIC(8, 4)  NOT NULL DEFAULT 0,
  tier            tier_key,
  active          BOOLEAN        NOT NULL DEFAULT false,
  affiliate_slug  TEXT,
  joined_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL,
  type        deposit_type   NOT NULL DEFAULT 'deposit',
  tier_before tier_key,
  tier_after  tier_key,
  note        TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID              NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT              NOT NULL,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email  TEXT NOT NULL,
  action       audit_action NOT NULL,
  target       TEXT,
  detail       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- White-label tenants / affiliates
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_deposit_events_member   ON deposit_events (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_member  ON lesson_progress (member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_member    ON notifications (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON notifications (member_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_created       ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_email           ON members (email);

-- ============================================================
-- TRIGGERS — auto-update members.updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER — recalculate tier after deposit_events insert
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_tier_after_deposit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_deposit    NUMERIC;
  v_tier_before tier_key;
  v_tier_after  tier_key;
BEGIN
  -- Compute new lifetime deposit for this member
  SELECT COALESCE(SUM(amount), 0)
    INTO v_deposit
    FROM deposit_events
   WHERE member_id = NEW.member_id;

  -- Determine tier thresholds
  v_tier_after := CASE
    WHEN v_deposit >= 50000 THEN 'elite'::tier_key
    WHEN v_deposit >= 2000  THEN 'operator'::tier_key
    WHEN v_deposit >= 100   THEN 'foundation'::tier_key
    ELSE NULL
  END;

  -- Get current tier
  SELECT tier INTO v_tier_before FROM members WHERE id = NEW.member_id;

  -- Update member
  UPDATE members
     SET deposit = v_deposit,
         tier    = v_tier_after,
         active  = (v_deposit > 0)
   WHERE id = NEW.member_id;

  -- Patch the deposit_event with tier change info
  UPDATE deposit_events
     SET tier_before = v_tier_before,
         tier_after  = v_tier_after
   WHERE id = NEW.id;

  -- If tier changed: create a notification + audit entry
  IF v_tier_before IS DISTINCT FROM v_tier_after AND v_tier_after IS NOT NULL THEN
    INSERT INTO notifications (member_id, type, title, body, link)
    SELECT NEW.member_id,
           'tier_unlocked',
           v_tier_after::TEXT || ' unlocked',
           'Congratulations — your deposit reached the ' || v_tier_after::TEXT || ' threshold.',
           '/tier';

    INSERT INTO audit_log (actor_email, action, target, detail)
    SELECT 'system', 'tier_changed',
           (SELECT email FROM members WHERE id = NEW.member_id),
           COALESCE(v_tier_before::TEXT, 'null') || ' → ' || v_tier_after::TEXT
            || ' (deposit: €' || v_deposit::TEXT || ')';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER after_deposit_event
  AFTER INSERT ON deposit_events
  FOR EACH ROW EXECUTE FUNCTION recalculate_tier_after_deposit();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;

-- Helper: get member.id for current auth user
CREATE OR REPLACE FUNCTION current_member_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM members WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- members: each user sees only their own row
CREATE POLICY members_self_select ON members
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY members_self_update ON members
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- deposit_events: read-only for owner; insert only via service role (webhook)
CREATE POLICY deposit_events_self_select ON deposit_events
  FOR SELECT USING (member_id = current_member_id());

-- lesson_progress: full CRUD for owner
CREATE POLICY lesson_progress_self_all ON lesson_progress
  FOR ALL USING (member_id = current_member_id())
  WITH CHECK (member_id = current_member_id());

-- notifications: owner can read and update (mark-as-read)
CREATE POLICY notifications_self_select ON notifications
  FOR SELECT USING (member_id = current_member_id());

CREATE POLICY notifications_self_update ON notifications
  FOR UPDATE USING (member_id = current_member_id())
  WITH CHECK (member_id = current_member_id());

-- audit_log: service role only (no client reads)
-- (no policy = no access for anon/authenticated by default with RLS on)

-- tenants: public read (needed for /t/:slug landing pages)
CREATE POLICY tenants_public_read ON tenants
  FOR SELECT USING (active = true);

-- ============================================================
-- SEED: Insert the 3 affiliate tenants
-- ============================================================

INSERT INTO tenants (slug, name, config) VALUES
  ('agent-trading',  'Agent Trading Academy',  '{"primaryColor":"oklch(0.9 0.2 140)","brokerName":"Your Broker"}'::jsonb),
  ('crypto-masters', 'Crypto Masters Club',    '{"primaryColor":"oklch(0.82 0.2 60)","brokerName":"Bybit / Binance"}'::jsonb),
  ('fx-elite',       'FX Elite Network',       '{"primaryColor":"oklch(0.75 0.18 250)","brokerName":"IC Markets / XM"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
