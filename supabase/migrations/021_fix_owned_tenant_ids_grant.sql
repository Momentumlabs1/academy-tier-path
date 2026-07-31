-- Partner portal: "permission denied for function owned_tenant_ids"
--
-- Migration 011 revoked EXECUTE on owned_tenant_ids() from `authenticated`,
-- reasoning that the helper is "only meant to be used INSIDE RLS policies,
-- not called directly over the REST API".
--
-- That reasoning does not hold in Postgres: a function referenced in an RLS
-- policy expression is evaluated as the QUERYING role, not as the policy
-- owner. Without EXECUTE for `authenticated`, every policy in 008 that calls
-- it fails — so a partner could sign in successfully and still see nothing
-- but the permission error.
--
-- The sibling helpers (owned_tenant_slugs, is_platform_admin,
-- current_member_id) kept their grant, so this was the only one broken.
--
-- Safe to grant: SECURITY DEFINER + filters on auth.uid(), so a caller only
-- ever gets the tenants they own. anon stays revoked.
GRANT EXECUTE ON FUNCTION public.owned_tenant_ids() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.owned_tenant_ids() FROM anon, public;
