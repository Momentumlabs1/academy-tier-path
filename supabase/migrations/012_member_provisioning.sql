-- 012 — Provision a members row on customer signup (+ partner attribution).
--
-- PROBLEM: RegistrationGate calls supabase.auth.signUp, but nothing created a
-- public.members row — so a registered customer never appeared under their
-- referring partner (affiliate_dashboard counts members WHERE referred_by_tenant
-- = slug). The partner's "Kunden" stayed 0 until the broker webhook ran.
--
-- FIX: an AFTER INSERT trigger on auth.users that creates the member and copies
-- the partner slug from the signup metadata (cosmo_ref cookie -> user_metadata).
--
-- SHARED-PROJECT SAFETY: momentum-hq also hosts life-app + Pandora Box on the
-- SAME auth.users table. This trigger must NOT create academy members for their
-- signups, so it fires ONLY when the signup metadata carries app = 'academy'
-- (set by RegistrationGate) and is NOT an affiliate/owner account.

CREATE OR REPLACE FUNCTION public.handle_new_academy_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only academy customer signups. Affiliates (role='affiliate') and every
  -- other app's users are skipped.
  IF COALESCE(NEW.raw_user_meta_data->>'app', '') <> 'academy' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') = 'affiliate' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.members (auth_user_id, email, name, referred_by_tenant, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'referred_by_tenant', ''),
    false
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id       = EXCLUDED.auth_user_id,
        -- keep an existing attribution, otherwise take the one from signup
        referred_by_tenant = COALESCE(members.referred_by_tenant, EXCLUDED.referred_by_tenant),
        name               = COALESCE(NULLIF(members.name, ''), EXCLUDED.name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_academy ON auth.users;
CREATE TRIGGER on_auth_user_created_academy
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_academy_user();

-- Trigger-only: not meant to be callable over the REST API.
REVOKE EXECUTE ON FUNCTION public.handle_new_academy_user() FROM anon, authenticated, public;

-- Let a signed-in customer read/create their OWN member row from the client
-- (needed so useMemberState works even before the trigger, and is spoof-safe:
-- they can only ever touch the row whose auth_user_id is their own uid).
DROP POLICY IF EXISTS members_self_insert ON public.members;
CREATE POLICY members_self_insert ON public.members
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());
