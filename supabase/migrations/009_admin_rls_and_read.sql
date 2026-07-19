-- 009 — Platform-admin RLS bypass + admin read access.
--
-- Fix for 008: the affiliate RLS policies scoped reads to owner_user_id, which
-- would lock the platform admin (kontakt@momentumlabs.at) out of the global
-- views. The admin must see EVERYTHING; affiliates still see only their own.

CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(lower(auth.jwt() ->> 'email'), '') = 'kontakt@momentumlabs.at'
  $$;

-- Widen the affiliate SELECT policies: admin OR owner.
DROP POLICY IF EXISTS affiliate_reads_own_tenant ON tenants;
CREATE POLICY affiliate_reads_own_tenant ON tenants
  FOR SELECT USING (is_platform_admin() OR owner_user_id = auth.uid());

DROP POLICY IF EXISTS affiliate_reads_own_clicks ON affiliate_clicks;
CREATE POLICY affiliate_reads_own_clicks ON affiliate_clicks
  FOR SELECT USING (is_platform_admin() OR tenant_id IN (SELECT owned_tenant_ids()));

DROP POLICY IF EXISTS affiliate_reads_own_leads ON leads;
CREATE POLICY affiliate_reads_own_leads ON leads
  FOR SELECT USING (is_platform_admin() OR tenant_id IN (SELECT owned_tenant_ids()));

DROP POLICY IF EXISTS affiliate_reads_own_members ON members;
CREATE POLICY affiliate_reads_own_members ON members
  FOR SELECT USING (is_platform_admin() OR referred_by_tenant IN (SELECT owned_tenant_slugs()));

-- Admin-only read on the operational tables the admin dashboard needs.
ALTER TABLE deposit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_reads_deposits ON deposit_events;
CREATE POLICY admin_reads_deposits ON deposit_events
  FOR SELECT USING (is_platform_admin());

ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY; -- already on; policy add is harmless
DROP POLICY IF EXISTS admin_reads_tglinks ON telegram_links;
CREATE POLICY admin_reads_tglinks ON telegram_links
  FOR SELECT USING (is_platform_admin());
