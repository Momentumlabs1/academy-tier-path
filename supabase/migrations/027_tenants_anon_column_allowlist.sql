-- Commercial terms were readable by the whole internet.
--
-- `tenants_public_read` grants SELECT on every active row, which the partner
-- landing pages genuinely need — they resolve a brand from its slug before anyone
-- signs in. But RLS scopes ROWS, not COLUMNS, so the same policy handed out
-- partner_rate, partner_rate_unit, partner_volume, owner_user_id and
-- telegram_channel_id to any caller holding the publishable key. Verified against
-- production before and after.
--
-- Every rate is still the $5 starting tier, so nothing embarrassing was exposed
-- yet. The moment a partner moves up the staircase (it runs to $10) or books
-- volume, one partner could read another's deal, and partner_volume is a direct
-- read on how much business each brand brings.
--
-- The public path reads only slug, name, config and active
-- (src/lib/resolve-tenant.ts), so an allow-list costs the landing pages nothing —
-- and anything added to this table later is private to anon by default, which is
-- the right way round for a table holding commercial terms.
--
-- `authenticated` keeps these on purpose: the partner portal shows a partner
-- their own figures. NOTE this does not stop a signed-in partner reading another
-- partner's row through `tenants_public_read`; closing that needs the portal to
-- read its numbers through a security-definer function instead.
REVOKE SELECT ON public.tenants FROM anon;

GRANT SELECT (id, slug, name, config, active, created_at,
              broker_affiliate_url, signal_footer, superpartner)
  ON public.tenants TO anon;
