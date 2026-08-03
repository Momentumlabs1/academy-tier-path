-- 023 — Ops visibility for the mentor (applied 2026-08-04).
-- Request logs only show a 502, which can't distinguish a bad model id from an
-- exhausted balance from a bad key. Keep the actual Claude API error.
CREATE TABLE IF NOT EXISTS mentor_api_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status     INT,
  err_type   TEXT,
  message    TEXT,
  model      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentor_api_errors_at ON mentor_api_errors (created_at DESC);
ALTER TABLE mentor_api_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mentor_api_errors_admin ON mentor_api_errors;
CREATE POLICY mentor_api_errors_admin ON mentor_api_errors
  FOR SELECT USING (is_platform_admin());
