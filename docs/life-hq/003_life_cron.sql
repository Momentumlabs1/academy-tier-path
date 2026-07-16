-- HQ — Life OS cron (applied as migration life_hq_cron_tick).
-- Hourly tick; the life-brief function decides timezone-aware whether the
-- morning or evening brief is due (and dedupes per local day), so this stays
-- correct across DST changes.
select cron.unschedule(jobid) from cron.job where jobname = 'life-brief-tick';
select cron.schedule(
  'life-brief-tick',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://bqqmfajowxzkdcvmrtyd.supabase.co/functions/v1/life-brief',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select cron_secret from public.life_settings where id = 1)
    ),
    body := '{"action":"tick"}'::jsonb
  );
  $$
);
