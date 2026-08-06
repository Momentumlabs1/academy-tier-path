-- The partner dashboard showed every partner, to every partner.
--
-- `affiliate_dashboard` is what /partner reads, and it selected `FROM tenants`
-- with no WHERE clause at all — one row per brand on the platform, carrying that
-- brand's commission rate, booked volume, clicks, leads, member count and total
-- customer deposits.
--
-- Row-level security did not save it. The view is security_invoker, so the base
-- table's policies do apply — but `tenants_public_read` deliberately grants every
-- active row to everyone (landing pages resolve a brand before anyone signs in),
-- and policies are OR'd, so the permissive one wins. A signed-in partner read the
-- whole competitive picture: who else is on the platform, what rate they have,
-- and how much business they bring.
--
-- Anonymous callers were already stopped by 027's column allow-list, since
-- security_invoker makes the view inherit it. This closes the signed-in case,
-- where the fix must be a WHERE clause: the restriction is per-row and by caller,
-- which no column grant can express.
--
-- Verified after applying — admin 4 rows, owner 1 (their own), other signed-in
-- user 0, anonymous denied.

CREATE OR REPLACE VIEW public.affiliate_dashboard
WITH (security_invoker = true) AS
  SELECT t.id AS tenant_id,
         t.slug,
         t.name,
         t.partner_rate,
         t.partner_rate_unit,
         t.partner_volume,
         (SELECT count(*) FROM affiliate_clicks c WHERE c.tenant_id = t.id) AS clicks,
         (SELECT count(*) FROM leads l WHERE l.tenant_id = t.id) AS leads,
         (SELECT count(*) FROM members m WHERE m.referred_by_tenant = t.slug) AS members,
         (SELECT COALESCE(sum(m.deposit), 0::numeric) FROM members m WHERE m.referred_by_tenant = t.slug) AS total_deposits
    FROM tenants t
   WHERE is_platform_admin()
      OR t.owner_user_id = auth.uid();
