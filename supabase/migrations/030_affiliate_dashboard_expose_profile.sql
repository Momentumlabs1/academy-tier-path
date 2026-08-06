-- Carry the partner profile through the dashboard view.
-- Appended last on purpose: CREATE OR REPLACE VIEW may only add columns at the
-- end — inserting one mid-list is rejected outright.
-- Row scoping from 028 is unchanged: own row only, or everything for an admin.
CREATE OR REPLACE VIEW public.affiliate_dashboard
WITH (security_invoker = true) AS
  SELECT t.id AS tenant_id, t.slug, t.name,
         t.partner_rate, t.partner_rate_unit, t.partner_volume,
         (SELECT count(*) FROM affiliate_clicks c WHERE c.tenant_id = t.id) AS clicks,
         (SELECT count(*) FROM leads l WHERE l.tenant_id = t.id) AS leads,
         (SELECT count(*) FROM members m WHERE m.referred_by_tenant = t.slug) AS members,
         (SELECT COALESCE(sum(m.deposit), 0::numeric) FROM members m WHERE m.referred_by_tenant = t.slug) AS total_deposits,
         t.partner_profile
    FROM tenants t
   WHERE is_platform_admin() OR t.owner_user_id = auth.uid();
