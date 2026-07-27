-- ============================================================
-- 019 — Move the partner admin invite token off `tenants`
--
-- 018 put the invite token on `tenants`. That was wrong: `tenants_public_read`
-- (001) grants SELECT on every active brand to the anon key, and RLS is
-- row-level — it does not hide individual columns. Any visitor could therefore
-- have read the token straight out of the API and set a partner's password.
--
-- The token is a credential, so it lives in its own table with RLS on and no
-- policy at all: only the service role (the partner-admin edge function) can
-- touch it. `superpartner` stays on `tenants` — that flag is not a secret.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_admin_invites (
  tenant_slug  TEXT PRIMARY KEY REFERENCES tenants (slug) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_admin_invites_token ON partner_admin_invites (token);

-- RLS on, zero policies: unreachable through the anon or an authenticated key.
-- The service role bypasses RLS, which is exactly (and only) what we want here.
ALTER TABLE partner_admin_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON partner_admin_invites FROM anon, authenticated;

-- Drop the exposed columns added in 018.
ALTER TABLE tenants
  DROP COLUMN IF EXISTS admin_invite_token,
  DROP COLUMN IF EXISTS admin_invite_expires;

COMMENT ON TABLE partner_admin_invites IS
  'Single-use invite tokens for /<slug>/admin. Service-role only — never expose through the anon key.';
