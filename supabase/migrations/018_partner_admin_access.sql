-- ============================================================
-- 018 — Partner admin access
--
-- A "superpartner" runs their own admin area at /<slug>/admin. They get in the
-- same way the master does: one password, no e-mail field — the slug in the URL
-- already identifies the account, so the e-mail stays server-side and is never
-- exposed to the browser.
--
-- Onboarding is a one-time invite link: the master presses "Invite" in the admin,
-- which stores a single-use token here and mails the link. Opening it lets the
-- partner choose their password once; the token is burned on use.
-- ============================================================

ALTER TABLE tenants
  -- Marks the brand as a superpartner: unlocks /<slug>/admin and shows a badge.
  ADD COLUMN IF NOT EXISTS superpartner BOOLEAN NOT NULL DEFAULT FALSE,
  -- Single-use invite for the "set your password" step. NULL once redeemed.
  ADD COLUMN IF NOT EXISTS admin_invite_token TEXT,
  ADD COLUMN IF NOT EXISTS admin_invite_expires TIMESTAMPTZ;

-- Token lookups happen on every invite redemption — keep them indexed, and keep
-- the index small by only covering rows that actually carry a live token.
CREATE INDEX IF NOT EXISTS idx_tenants_admin_invite
  ON tenants (admin_invite_token)
  WHERE admin_invite_token IS NOT NULL;

-- The invite token is a credential: it must never be readable through the public
-- anon key. `tenants_public_read` (008) grants SELECT on active brands to
-- everyone, so the token columns are deliberately NOT part of any client query —
-- they are only ever touched by the partner-admin edge function via the service
-- role, which bypasses RLS.
COMMENT ON COLUMN tenants.admin_invite_token IS
  'Single-use invite token. Service-role only — never select this through the anon key.';
COMMENT ON COLUMN tenants.superpartner IS
  'True when this brand may run its own admin area at /<slug>/admin.';
