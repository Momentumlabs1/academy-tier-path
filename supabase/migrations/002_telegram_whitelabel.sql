-- ============================================================
-- 002 — Telegram White-Label Relay + Funnel
--
-- One MAIN Telegram channel is the single source of signals.
-- A relay bot copies every post into each brand's own channel
-- (no "forwarded from" header) and appends the brand's broker
-- CTA. Members link their Telegram account via a /start deep
-- link after their deposit is verified by the broker webhook.
--
-- Apply via: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Tenants: Telegram + broker wiring per brand ─────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS telegram_channel_id  BIGINT,
  ADD COLUMN IF NOT EXISTS broker_affiliate_url TEXT,
  ADD COLUMN IF NOT EXISTS signal_footer        TEXT;

COMMENT ON COLUMN tenants.telegram_channel_id  IS 'Telegram channel the relay bot posts into for this brand (bot must be admin). Negative id, e.g. -1001234567890';
COMMENT ON COLUMN tenants.broker_affiliate_url IS 'This brand''s broker affiliate link — used in the relayed signal footer and on the landing page';
COMMENT ON COLUMN tenants.signal_footer        IS 'Optional extra line appended after each relayed signal (plain text)';

-- ── Member ↔ Telegram account linking ───────────────────────
-- A row is created (status=pending) when a verified member clicks
-- "Connect Telegram" on the website. The /start deep link carries
-- link_token; the bot fills in the telegram_* fields.

CREATE TABLE IF NOT EXISTS telegram_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
  link_token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  telegram_user_id  BIGINT,
  telegram_username TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'linked', 'joined', 'revoked')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_at         TIMESTAMPTZ,
  joined_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_tg_user ON telegram_links (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_links_member  ON telegram_links (member_id);

-- ── Relay log: every fan-out is recorded ────────────────────
-- delivered = { "<tenant_slug>": { "ok": true, "message_id": 123 } | { "ok": false, "error": "..." } }

CREATE TABLE IF NOT EXISTS signal_relays (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_chat_id    BIGINT NOT NULL,
  source_message_id BIGINT NOT NULL,
  preview           TEXT,
  delivered         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_chat_id, source_message_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_relays_created ON signal_relays (created_at DESC);

-- ── Funnel leads ─────────────────────────────────────────────
-- Email is captured on the landing page BEFORE redirecting to the
-- broker. click_id travels to the broker as the tracking parameter
-- and comes back in the deposit postback → exact attribution.

CREATE TABLE IF NOT EXISTS leads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  click_id   TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  status     TEXT NOT NULL DEFAULT 'lead'
             CHECK (status IN ('lead', 'redirected', 'deposited', 'joined')),
  member_id  UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email  ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads (tenant_id, status);

CREATE OR REPLACE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS: all three tables are service-role only ─────────────
-- (RLS on + no policies = no anon/authenticated access; the
-- edge functions use the service role key.)

ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_relays  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;

-- ── Seed: demo Telegram wiring for the three brands ──────────
-- Replace channel ids with the real ones once the bot is admin.

UPDATE tenants SET
  broker_affiliate_url = COALESCE(broker_affiliate_url, 'https://broker.example/ref?aff=' || slug),
  signal_footer        = COALESCE(signal_footer, '📈 Trade this signal with our partner broker — free access via your deposit.')
WHERE slug IN ('agent-trading', 'crypto-masters', 'fx-elite');
