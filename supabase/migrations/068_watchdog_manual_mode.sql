-- Der Waechter misst jetzt einen Menschen, nicht eine Maschine.
--
-- 067 war auf die Automatik ausgelegt: Hero-Sync alle 5 Minuten, also Alarm
-- nach 2 Stunden. Seit dem Cloudflare-Riegel vom 27.08. gibt es diese
-- Automatik nicht mehr — die Daten werden von Hand ueber den angemeldeten
-- Browser geholt, genau wie bei VT Markets.
--
-- Ein Waechter, der bei einem manuellen Ablauf alle zwei Stunden anschlaegt,
-- ist nach dem zweiten Tag Hintergrundrauschen. Und ein Alarm, den man
-- wegwischt, ohne hinzusehen, ist schlimmer als keiner: er bringt einem bei,
-- die eine Meldung zu ignorieren, auf die es ankommt.
--
-- 24 Stunden passen zum tatsaechlichen Rhythmus (VT wird 2-3x taeglich
-- geholt). Meldet sich also nur, wenn wirklich ein ganzer Tag fehlt.
--
-- Wird Hero freigeschaltet und laeuft der Sync wieder automatisch, gehoert
-- c_max_age zurueck auf 2 Stunden.
create or replace function public.broker_sync_watchdog()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  c_max_age    CONSTANT interval := interval '24 hours';
  c_remind     CONSTANT interval := interval '12 hours';

  v_last    timestamptz;
  v_age_h   numeric;
  v_state   text;
  v_prev    record;
  v_alerted boolean := false;
BEGIN
  SELECT max(synced_at) INTO v_last FROM broker_clients WHERE broker = 'hero';
  v_age_h := round(extract(epoch FROM (now() - coalesce(v_last, now() - interval '99 days')))/3600, 1);
  v_state := CASE WHEN v_last IS NULL OR now() - v_last > c_max_age THEN 'stale' ELSE 'ok' END;

  SELECT * INTO v_prev FROM ops_watchdog_state WHERE key = 'hero_sync';

  IF v_prev IS NULL THEN
    INSERT INTO ops_watchdog_state (key, state, since) VALUES ('hero_sync', v_state, now());
  ELSIF v_prev.state <> v_state THEN
    UPDATE ops_watchdog_state SET state = v_state, since = now() WHERE key = 'hero_sync';
  END IF;

  IF v_state = 'stale' THEN
    IF v_prev IS NULL OR v_prev.state = 'ok'
       OR v_prev.last_alert_at IS NULL
       OR now() - v_prev.last_alert_at > c_remind THEN
      PERFORM admin_alert(
        '🟡 HeroFX: seit ' || v_age_h || ' Stunden keine neuen Daten.' || chr(10) || chr(10) ||
        'Solange Cloudflare unseren Server aussperrt, wird von Hand geholt — ' ||
        'sag Claude einfach "Hero sync", dann laeuft es ueber deinen Browser.'
      );
      UPDATE ops_watchdog_state SET last_alert_at = now() WHERE key = 'hero_sync';
      v_alerted := true;
    END IF;
  ELSIF v_prev IS NOT NULL AND v_prev.state = 'stale' THEN
    PERFORM admin_alert('🟢 HeroFX-Daten sind wieder aktuell (' || v_age_h || ' Stunden alt).');
    UPDATE ops_watchdog_state SET last_alert_at = now() WHERE key = 'hero_sync';
    v_alerted := true;
  END IF;

  RETURN jsonb_build_object('state', v_state, 'age_hours', v_age_h, 'alerted', v_alerted);
END;
$function$;
