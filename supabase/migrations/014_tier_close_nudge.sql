-- 014 — Tier systematics improvement: "close to next tier" nudge.
--
-- The notification type close_to_next_tier existed but nothing emitted it. This
-- extends the post-deposit trigger so that when a deposit lands a member within
-- 20% of the next threshold (without crossing it), they get a single, deduped
-- hint. Tier-boundary behaviour itself is unchanged (>= threshold), just nicer.

CREATE OR REPLACE FUNCTION recalculate_tier_after_deposit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deposit     NUMERIC;
  v_tier_before tier_key;
  v_tier_after  tier_key;
  v_next_min    NUMERIC;
  v_cur_min     NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_deposit
    FROM deposit_events WHERE member_id = NEW.member_id;

  v_tier_after := CASE
    WHEN v_deposit >= 50000 THEN 'elite'::tier_key
    WHEN v_deposit >= 2000  THEN 'operator'::tier_key
    WHEN v_deposit >= 100   THEN 'foundation'::tier_key
    ELSE NULL
  END;

  SELECT tier INTO v_tier_before FROM members WHERE id = NEW.member_id;

  UPDATE members
     SET deposit = v_deposit,
         tier    = v_tier_after,
         active  = (v_deposit > 0)
   WHERE id = NEW.member_id;

  UPDATE deposit_events
     SET tier_before = v_tier_before,
         tier_after  = v_tier_after
   WHERE id = NEW.id;

  -- Tier crossed → unlock notification + audit (unchanged).
  IF v_tier_before IS DISTINCT FROM v_tier_after AND v_tier_after IS NOT NULL THEN
    INSERT INTO notifications (member_id, type, title, body, link)
    SELECT NEW.member_id, 'tier_unlocked',
           v_tier_after::TEXT || ' unlocked',
           'Congratulations — your deposit reached the ' || v_tier_after::TEXT || ' threshold.',
           '/tier';

    INSERT INTO audit_log (actor_email, action, target, detail)
    SELECT 'system', 'tier_changed',
           (SELECT email FROM members WHERE id = NEW.member_id),
           COALESCE(v_tier_before::TEXT, 'null') || ' → ' || v_tier_after::TEXT
            || ' (deposit: €' || v_deposit::TEXT || ')';
  ELSE
    -- No crossing this event → maybe nudge them toward the next threshold.
    v_next_min := CASE
      WHEN v_deposit < 100   THEN 100
      WHEN v_deposit < 2000  THEN 2000
      WHEN v_deposit < 50000 THEN 50000
      ELSE NULL END;
    v_cur_min := CASE
      WHEN v_deposit < 100   THEN 0
      WHEN v_deposit < 2000  THEN 100
      WHEN v_deposit < 50000 THEN 2000
      ELSE 50000 END;

    IF v_next_min IS NOT NULL
       AND v_deposit >= v_next_min - 0.20 * (v_next_min - v_cur_min)
       AND NOT EXISTS (
         SELECT 1 FROM notifications
          WHERE member_id = NEW.member_id AND type = 'close_to_next_tier' AND read_at IS NULL
       )
    THEN
      INSERT INTO notifications (member_id, type, title, body, link)
      VALUES (NEW.member_id, 'close_to_next_tier',
              'Fast am nächsten Tier',
              'Nur noch €' || round(v_next_min - v_deposit, 2)::TEXT || ' bis zum nächsten Tier.',
              '/tier');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
