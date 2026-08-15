-- 042 — the read side of the partner funnel.
--
-- partner_applications was write-only: the edge function inserted rows and
-- nothing could read them back. The form promises "we read every one ourselves
-- and come back within a few hours" — unkeepable, because no screen anywhere
-- showed that an application had arrived. /admin/partners is that screen; this
-- is the policy that lets it read.
--
-- Platform admin only, same gate as the setter tables. Applicants' phone
-- numbers and reach figures are not partner-visible and certainly not public.
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_applications_admin_read ON public.partner_applications;
CREATE POLICY partner_applications_admin_read ON public.partner_applications
  FOR SELECT TO authenticated USING (is_platform_admin());

DROP POLICY IF EXISTS partner_applications_admin_update ON public.partner_applications;
CREATE POLICY partner_applications_admin_update ON public.partner_applications
  FOR UPDATE TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());

ALTER TABLE public.partner_applications ALTER COLUMN status SET DEFAULT 'new';
