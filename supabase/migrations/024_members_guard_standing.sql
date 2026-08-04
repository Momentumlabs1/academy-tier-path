-- SECURITY: members_self_update lets a signed-in member UPDATE their own row, and
-- RLS cannot restrict that per column — so any member could set deposit/tier
-- themselves and unlock the entire academy without depositing. members_self_insert
-- had the same hole.
--
-- Fix: a BEFORE INSERT/UPDATE trigger that pins the "standing" columns for any
-- ordinary signed-in member. It deliberately does NOT raise: the write still
-- succeeds for what a member may change (avatar, name, telegram handle); the
-- protected columns simply do not move.
--
-- Still allowed to move standing:
--   * server-side contexts — broker-sync (service_role), edge functions and the
--     SECURITY DEFINER routines apply_broker_rollup / recalculate_tier_after_deposit.
--     They carry no end-user JWT, so auth.uid() is NULL.
--   * the platform admin, who edits deposits from the admin member dialog.
CREATE OR REPLACE FUNCTION public.members_guard_standing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.deposit            := OLD.deposit;
    NEW.tier               := OLD.tier;
    NEW.active             := OLD.active;
    NEW.activity_status    := OLD.activity_status;
    NEW.monthly_lots       := OLD.monthly_lots;
    NEW.referred_by_tenant := OLD.referred_by_tenant;
    NEW.auth_user_id       := OLD.auth_user_id;
    NEW.email              := OLD.email;
    NEW.joined_at          := OLD.joined_at;
  ELSE
    NEW.deposit      := 0;
    NEW.tier         := NULL;
    NEW.active       := false;
    NEW.monthly_lots := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_guard_standing_trg ON public.members;
CREATE TRIGGER members_guard_standing_trg
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_guard_standing();
