-- Ein Wächter für den Broker-Sync — weil ein Ausfall bisher nichts gesagt hat.
--
-- WAS PASSIERT IST
-- Der HeroFX-Sync stand vom 27.08. 17:05 bis zum 28.08. abends: 27 Stunden,
-- ueber 70 Fehlversuche, und niemand hat es bemerkt. Der Cron-Eintrag meldete
-- brav "succeeded" — er misst aber nur, ob der HTTP-Aufruf rausging, nicht ob
-- Hero geantwortet hat. Die Funktion selbst gab 502 zurueck, ins Leere.
--
-- Praktisch heisst so ein Ausfall: wer einzahlt, wird nicht freigeschaltet.
-- Das ist der eine Fehler, der Kunden direkt trifft, und ausgerechnet der war
-- unsichtbar.
--
-- WARUM synced_at UND NICHT DER FEHLER-ZAEHLER
-- Gemessen wird das Ergebnis, nicht der Versuch: wie alt sind die juengsten
-- Broker-Daten. Das faengt auch die Faelle, an die niemand gedacht hat —
-- abgelaufener Token, Cron gestoppt, Funktion abgestuerzt, Hero langsam.
--
-- WARUM NUR HERO
-- VT Markets wird von Hand eingespielt (die API liefert weder E-Mail noch
-- Betrag), zuletzt am 21.08. Ein Waechter darauf wuerde bei jedem Lauf
-- anschlagen und waere nach zwei Tagen Hintergrundrauschen, das man wegklickt.
-- Kommt VT irgendwann automatisch, gehoert 'vt' dazu.
create table if not exists public.ops_watchdog_state (
  key           text primary key,
  state         text not null,               -- 'ok' | 'stale'
  since         timestamptz not null default now(),
  last_alert_at timestamptz
);

alter table public.ops_watchdog_state enable row level security;
revoke all on table public.ops_watchdog_state from anon, authenticated;

comment on table public.ops_watchdog_state is
  'Merkt sich, ob ein ueberwachter Vorgang zuletzt lief. Nur damit der Waechter '
  'beim Zustandswechsel meldet statt bei jedem Lauf.';


create or replace function public.broker_sync_watchdog()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  -- Hero laeuft alle 5 Minuten. 2 Stunden lassen jede normale Stoerung
  -- (Neustart, kurzer Ausfall bei Hero) durch und schlagen erst an, wenn
  -- wirklich etwas steht.
  c_max_age    CONSTANT interval := interval '2 hours';
  -- Solange es steht, hoechstens alle 12 h erinnern. Oefter liest es niemand.
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
    -- Melden beim Wechsel nach 'stale', danach hoechstens alle 12 h.
    IF v_prev IS NULL OR v_prev.state = 'ok'
       OR v_prev.last_alert_at IS NULL
       OR now() - v_prev.last_alert_at > c_remind THEN
      PERFORM admin_alert(
        '🔴 HeroFX-Sync steht.' || chr(10) ||
        'Letzte Daten vor ' || v_age_h || ' Stunden.' || chr(10) || chr(10) ||
        'Wer seit dann eingezahlt hat, ist NICHT freigeschaltet.' || chr(10) || chr(10) ||
        'Haeufigste Ursache: der Portal-Token ist abgelaufen (haelt rund 14 Tage). ' ||
        'Neuen Token bei portal.herofx.co holen: F12 → Network → eine Anfrage → ' ||
        'Request Headers → X-Access-Token.'
      );
      UPDATE ops_watchdog_state SET last_alert_at = now() WHERE key = 'hero_sync';
      v_alerted := true;
    END IF;
  ELSIF v_prev IS NOT NULL AND v_prev.state = 'stale' THEN
    -- Entwarnung. Wer eine Stoerung gemeldet bekommt, will auch hoeren, dass
    -- sie vorbei ist — sonst prueft er jedes Mal von Hand nach.
    PERFORM admin_alert('🟢 HeroFX-Sync laeuft wieder. Daten sind ' || v_age_h || ' Stunden alt.');
    UPDATE ops_watchdog_state SET last_alert_at = now() WHERE key = 'hero_sync';
    v_alerted := true;
  END IF;

  RETURN jsonb_build_object('state', v_state, 'age_hours', v_age_h, 'alerted', v_alerted);
END;
$function$;

REVOKE ALL ON FUNCTION public.broker_sync_watchdog() FROM public, anon, authenticated;

COMMENT ON FUNCTION public.broker_sync_watchdog() IS
  'Schlaegt Alarm, wenn die juengsten HeroFX-Daten aelter als 2 Stunden sind. '
  'Meldet beim Wechsel, erinnert hoechstens alle 12 h, und gibt Entwarnung.';

-- Alle 15 Minuten. Der Ausfall darf hoechstens diese Spanne unbemerkt bleiben.
-- select cron.schedule('broker-sync-watchdog', '*/15 * * * *',
--                      $$select public.broker_sync_watchdog()$$);
