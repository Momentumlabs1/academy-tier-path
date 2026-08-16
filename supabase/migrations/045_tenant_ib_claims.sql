-- 045 — a partner CLAIMS an IB account; an admin CONFIRMS it. Two tables, on purpose.
--
-- tenant_ib_accounts decides who gets paid. If a partner could write into it
-- directly, they could enter any IB number — including another partner's — and
-- the volume under it would be credited to them. Nothing afterwards could
-- detect that, because the table is the only record of who owns what.
--
-- So the partner-writable surface is this claims table, which pays nobody, and
-- the confirmed row is created by an admin-only function. The revenue rollup in
-- migration 036 keeps reading tenant_ib_accounts and is untouched.
CREATE TABLE IF NOT EXISTS public.tenant_ib_claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug  text NOT NULL REFERENCES public.tenants(slug) ON DELETE CASCADE,
  broker       text NOT NULL,
  ib_account   text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  submitted_by uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  UNIQUE (tenant_slug, broker)
);

ALTER TABLE public.tenant_ib_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_tenant(p_slug text)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM tenants WHERE slug = p_slug AND owner_user_id = auth.uid());
$$;

DROP POLICY IF EXISTS ib_claims_own_read ON public.tenant_ib_claims;
CREATE POLICY ib_claims_own_read ON public.tenant_ib_claims
  FOR SELECT TO authenticated USING (is_platform_admin() OR owns_tenant(tenant_slug));

DROP POLICY IF EXISTS ib_claims_own_insert ON public.tenant_ib_claims;
CREATE POLICY ib_claims_own_insert ON public.tenant_ib_claims
  FOR INSERT TO authenticated
  WITH CHECK (owns_tenant(tenant_slug) AND status = 'pending' AND submitted_by = auth.uid());

DROP POLICY IF EXISTS ib_claims_own_update ON public.tenant_ib_claims;
CREATE POLICY ib_claims_own_update ON public.tenant_ib_claims
  FOR UPDATE TO authenticated
  USING (is_platform_admin() OR (owns_tenant(tenant_slug) AND status = 'pending'))
  WITH CHECK (is_platform_admin() OR status = 'pending');

-- The only path into tenant_ib_accounts. SECURITY DEFINER with an explicit
-- admin check: the caller's own rights are not enough, because the whole point
-- is that nobody but an admin may create a paying row.
CREATE OR REPLACE FUNCTION public.approve_ib_claim(p_claim_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c RECORD;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'not authorised'; END IF;
  SELECT * INTO c FROM tenant_ib_claims WHERE id = p_claim_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found or already reviewed'; END IF;

  INSERT INTO tenant_ib_accounts (broker, ib_account, tenant_slug, note)
  VALUES (c.broker, c.ib_account, c.tenant_slug, 'confirmed from partner claim')
  ON CONFLICT (broker, ib_account) DO UPDATE SET tenant_slug = EXCLUDED.tenant_slug;

  UPDATE tenant_ib_claims SET status = 'approved', reviewed_at = now() WHERE id = p_claim_id;
END; $$;

REVOKE ALL ON FUNCTION public.approve_ib_claim(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_ib_claim(uuid) TO authenticated;
