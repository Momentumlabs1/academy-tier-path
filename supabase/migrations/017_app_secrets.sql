-- 017 — backend-only secret store + auto-confirm email signups.
-- app_secrets: RLS on, NO policies → only the service role (edge functions)
-- can read it; used by send-email to resolve RESEND_API_KEY etc. from the DB.
CREATE TABLE IF NOT EXISTS app_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_secrets FROM anon, authenticated;
-- NOTE: secret VALUES are inserted out-of-band (never committed).

-- Registration = e-mail + password → logged in instantly (no confirmation mail).
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_auto_confirm_new_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_new_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_user();
