-- 011 — Security hardening (from Supabase advisors after applying 001–010).
--
-- CRITICAL: Postgres views default to SECURITY DEFINER, which bypasses RLS —
-- an affiliate querying affiliate_dashboard would see EVERY brand's numbers.
-- security_invoker makes the views run as the caller, so the RLS on the base
-- tables (is_platform_admin() OR owner) applies: admin sees all, affiliate sees
-- only their own. This is required for the affiliate scoping to actually work.
ALTER VIEW public.mailable_leads      SET (security_invoker = true);
ALTER VIEW public.affiliate_dashboard SET (security_invoker = true);

-- Pin search_path on our functions (prevents search_path injection).
ALTER FUNCTION public.set_updated_at()                 SET search_path = public;
ALTER FUNCTION public.recalculate_tier_after_deposit() SET search_path = public;
ALTER FUNCTION public.current_member_id()              SET search_path = public;
ALTER FUNCTION public.owned_tenant_ids()               SET search_path = public;
ALTER FUNCTION public.owned_tenant_slugs()             SET search_path = public;
ALTER FUNCTION public.is_platform_admin()              SET search_path = public;

-- These SECURITY DEFINER helpers are only meant to be used INSIDE RLS policies,
-- not called directly over the REST API. Revoke public execute.
REVOKE EXECUTE ON FUNCTION public.owned_tenant_ids()               FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.owned_tenant_slugs()             FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recalculate_tier_after_deposit() FROM anon, authenticated, public;
