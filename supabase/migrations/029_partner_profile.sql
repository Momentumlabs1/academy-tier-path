-- A short profile a partner fills in themselves: where their audience actually is.
--
-- Stored on its own column rather than in `config`, because `config` is spread
-- over TenantConfig to render the landing page — anything added there becomes an
-- accidental landing-page field.
--
-- Written through a function rather than a policy, because `authenticated` still
-- holds a table-wide UPDATE grant on `tenants` — including partner_rate — which is
-- only neutralised today by there being no UPDATE policy at all. Adding one so a
-- partner could save this form would also let them set their own commission rate.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS partner_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.save_partner_profile(p_profile jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_slug text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  UPDATE tenants SET partner_profile = coalesce(p_profile, '{}'::jsonb)
   WHERE owner_user_id = auth.uid() RETURNING slug INTO v_slug;
  IF v_slug IS NULL THEN RAISE EXCEPTION 'no brand owned by this account'; END IF;
  RETURN jsonb_build_object('ok', true, 'slug', v_slug);
END; $$;

REVOKE EXECUTE ON FUNCTION public.save_partner_profile(jsonb) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.save_partner_profile(jsonb) TO authenticated;
