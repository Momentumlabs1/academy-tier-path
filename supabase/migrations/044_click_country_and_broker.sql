-- 044 — record WHICH broker a click was routed to, and WHY.
--
-- Routing depends on the visitor's country (US to Hero, everyone else to VT).
-- Without writing both down, a wrong routing decision is invisible after the
-- fact: the click row says a member left for "a broker" and nothing says which,
-- so a mis-sent customer can never be traced back to the rule that sent them.
-- It is also the only way to answer "where do our people come from" — the
-- question that decides which broker relationship actually matters.
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS broker  text;

COMMENT ON COLUMN public.affiliate_clicks.country IS
  'ISO-3166 alpha-2 from the edge at click time; NULL when the host sent no header.';
COMMENT ON COLUMN public.affiliate_clicks.broker IS
  'Broker key the visitor was routed to (hero | vt) — the decision, not the rule.';

-- Defaults on the new parameters so already-deployed two-argument callers keep
-- working while the frontend rolls out.
CREATE OR REPLACE FUNCTION public.log_broker_click(
  p_tenant_slug text,
  p_click_id    text,
  p_country     text DEFAULT NULL,
  p_broker      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member UUID;
  v_tenant UUID;
BEGIN
  SELECT id INTO v_member FROM members WHERE auth_user_id = auth.uid();
  IF v_member IS NULL THEN RETURN; END IF;
  SELECT id INTO v_tenant FROM tenants WHERE slug = p_tenant_slug;
  INSERT INTO affiliate_clicks (tenant_id, landing_slug, click_id, member_id, country, broker)
  VALUES (v_tenant, p_tenant_slug, p_click_id, v_member, nullif(upper(p_country), ''), nullif(p_broker, ''));
END; $function$;
