-- 007 — GDPR/TKG consent + partner attribution on leads.
--
-- Required by AT/EU law before we can send marketing/newsletter email:
--   * § 174 TKG 2021: prior, active, revocable consent (no pre-ticked boxes)
--   * Art. 7 GDPR: we carry the BURDEN OF PROOF of consent → log when/how/what
--   * Double opt-in (DOI): de-facto required to prove consent across AT + DE
-- Also stores which partner brand referred the lead, so central reporting /
-- payout can join partner → lead → member → deposit.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS referred_by_tenant  TEXT,        -- partner slug (belt & suspenders next to tenant_id)
  ADD COLUMN IF NOT EXISTS marketing_consent   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at          TIMESTAMPTZ,  -- when they ticked the box
  ADD COLUMN IF NOT EXISTS consent_ip          TEXT,         -- proof of origin
  ADD COLUMN IF NOT EXISTS consent_version     TEXT,         -- which consent text/version they agreed to
  ADD COLUMN IF NOT EXISTS doi_token           TEXT,         -- double opt-in confirmation token
  ADD COLUMN IF NOT EXISTS doi_confirmed_at    TIMESTAMPTZ,  -- when they clicked the confirm link (consent becomes valid)
  ADD COLUMN IF NOT EXISTS unsubscribed_at     TIMESTAMPTZ;  -- honoured opt-out

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_doi_token ON leads (doi_token) WHERE doi_token IS NOT NULL;

-- Only leads with a CONFIRMED double opt-in and no later unsubscribe may be mailed marketing.
-- (Query helper view; the sending code must filter on this, never on marketing_consent alone.)
CREATE OR REPLACE VIEW mailable_leads AS
  SELECT * FROM leads
  WHERE marketing_consent = true
    AND doi_confirmed_at IS NOT NULL
    AND unsubscribed_at IS NULL;

-- Durable attribution on the member too (survives even if the lead row is cleaned up).
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS referred_by_tenant TEXT;
