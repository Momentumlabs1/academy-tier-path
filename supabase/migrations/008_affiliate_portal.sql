-- 008 — Affiliate portal: per-affiliate login, click tracking, scoped access.
--
-- Each affiliate (= owner of a partner brand/tenant) logs into a central portal
-- at partners.cosmos-candles.com and sees ONLY their own numbers: clicks,
-- registrations, deposits, commission, and their current level in the payout
-- staircase (see docs/verguetung-modell.md — 5 → 10 per volume tier).
--
-- Security core: Row-Level Security scopes every read to the affiliate's own
-- tenant(s). Edge functions (service role) bypass RLS for the central backend.

-- ── Link a tenant/brand to its affiliate's auth account ──────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Current payout level for this partner. NOTE: docs/verguetung-modell.md models
  -- this as USD/lot (5/6/8/10 by customer volume). The founder also referred to a
  -- "5–10%" framing — reconcile the exact unit before wiring commission math.
  ADD COLUMN IF NOT EXISTS partner_rate      NUMERIC(6,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS partner_rate_unit TEXT DEFAULT 'usd_per_lot'
                          CHECK (partner_rate_unit IN ('usd_per_lot', 'percent')),
  ADD COLUMN IF NOT EXISTS partner_volume    NUMERIC(14,2) DEFAULT 0; -- customer volume under this partner (€)

CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants (owner_user_id);

-- ── Raw click tracking (top of funnel, before email capture) ─────────────────
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  landing_slug  TEXT,                       -- which partner subdomain/slug was hit
  click_id      TEXT,                       -- ties to leads.click_id when they convert
  referrer      TEXT,
  utm           JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_tenant ON affiliate_clicks (tenant_id, created_at DESC);

-- ── RLS: an affiliate sees only rows tied to a tenant they own ───────────────
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY; -- (already enabled in 002; harmless)
ALTER TABLE members          ENABLE ROW LEVEL SECURITY;

-- Helper: the set of tenant ids / slugs the current auth user owns.
CREATE OR REPLACE FUNCTION owned_tenant_ids() RETURNS SETOF UUID
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT id FROM tenants WHERE owner_user_id = auth.uid()
  $$;
CREATE OR REPLACE FUNCTION owned_tenant_slugs() RETURNS SETOF TEXT
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT slug FROM tenants WHERE owner_user_id = auth.uid()
  $$;

DROP POLICY IF EXISTS affiliate_reads_own_tenant ON tenants;
CREATE POLICY affiliate_reads_own_tenant ON tenants
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS affiliate_reads_own_clicks ON affiliate_clicks;
CREATE POLICY affiliate_reads_own_clicks ON affiliate_clicks
  FOR SELECT USING (tenant_id IN (SELECT owned_tenant_ids()));

DROP POLICY IF EXISTS affiliate_reads_own_leads ON leads;
CREATE POLICY affiliate_reads_own_leads ON leads
  FOR SELECT USING (tenant_id IN (SELECT owned_tenant_ids()));

DROP POLICY IF EXISTS affiliate_reads_own_members ON members;
CREATE POLICY affiliate_reads_own_members ON members
  FOR SELECT USING (referred_by_tenant IN (SELECT owned_tenant_slugs()));

-- ── Per-affiliate rollup the portal reads (already RLS-scoped by the views' base tables) ──
CREATE OR REPLACE VIEW affiliate_dashboard AS
  SELECT
    t.id                                   AS tenant_id,
    t.slug,
    t.name,
    t.partner_rate,
    t.partner_rate_unit,
    t.partner_volume,
    (SELECT count(*) FROM affiliate_clicks c WHERE c.tenant_id = t.id)                       AS clicks,
    (SELECT count(*) FROM leads l WHERE l.tenant_id = t.id)                                  AS leads,
    (SELECT count(*) FROM members m WHERE m.referred_by_tenant = t.slug)                     AS members,
    (SELECT coalesce(sum(m.deposit),0) FROM members m WHERE m.referred_by_tenant = t.slug)   AS total_deposits
  FROM tenants t;
