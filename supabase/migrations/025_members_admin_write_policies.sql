-- The admin member dialog writes deposit/tier/active and can delete a member, but
-- public.members only had a self-scoped UPDATE policy and no DELETE policy at all —
-- so those admin actions were silently no-ops (RLS filtered the rows away and
-- PostgREST reported success with 0 rows affected).
--
-- Grant the platform admin explicit write access. Row scoping stays in RLS; the
-- members_guard_standing trigger lets the admin through while ordinary members
-- remain unable to move their own standing.
DROP POLICY IF EXISTS members_admin_update ON public.members;
CREATE POLICY members_admin_update ON public.members
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS members_admin_delete ON public.members;
CREATE POLICY members_admin_delete ON public.members
  FOR DELETE
  USING (public.is_platform_admin());
