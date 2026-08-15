-- 043 — one row per lead, with what the lead table cannot say.
--
-- The leads page could only show a status, which does not distinguish "wrote
-- once and vanished" from "twenty messages deep and still going" — and those
-- are the two cases a human has to treat differently.
--
-- SECURITY INVOKER IS LOAD-BEARING. A normal view runs as its owner and would
-- hand every lead's name, Telegram handle, e-mail and deposit to anyone holding
-- the public anon key, straight past the admin-only policy on setter_leads.
-- With security_invoker the caller's own RLS applies, so this view is exactly
-- as locked as the table under it. Verified with the anon key: returns [].
CREATE OR REPLACE VIEW public.setter_lead_overview
WITH (security_invoker = true) AS
SELECT
  l.id, l.telegram_user_id, l.telegram_username, l.first_name, l.source,
  l.status, l.step, l.experience, l.broker_email, l.deposit_usd,
  l.vip_granted_at, l.created_at, l.updated_at,
  (SELECT count(*) FROM public.setter_messages m WHERE m.lead_id = l.id) AS message_count,
  (SELECT count(*) FROM public.setter_messages m WHERE m.lead_id = l.id AND m.role = 'user') AS reply_count,
  (SELECT max(m.created_at) FROM public.setter_messages m WHERE m.lead_id = l.id) AS last_message_at
FROM public.setter_leads l;

COMMENT ON VIEW public.setter_lead_overview IS
  'setter_leads plus message counts and last activity. security_invoker: admin-only, same as the table.';

GRANT SELECT ON public.setter_lead_overview TO authenticated;
