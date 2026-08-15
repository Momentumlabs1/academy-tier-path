-- 038 — a redacted, publicly readable view of the signal feed.
--
-- The dashboard's right rail has to show a member who has NOT deposited that
-- signals are real and arriving, without handing them the signals. Blurring the
-- numbers in CSS is not a lock: the values sit in the DOM and any reader can
-- pull them out. So the redaction happens here, in SQL — the view simply never
-- selects a price.
--
-- What crosses the line: instrument, direction, how many targets the desk set,
-- and when. What never does: entry, stop, and every take-profit level. Those
-- exist only in signal_relays, which stays RLS-locked to service-role.
--
-- SECURITY DEFINER (the default for views) is deliberate and is the whole
-- mechanism: the view reads the locked table on the caller's behalf and returns
-- only the four safe columns.
CREATE OR REPLACE VIEW public.signal_teasers AS
SELECT
  r.id,
  r.created_at,
  -- "🔴 NAS SELL" / "NAS SELL Entry 30170" → NAS
  -- Postgres regexes are POSIX AREs: no (?i:...) inline flag and no \d, so the
  -- match runs against upper(preview) with character classes instead.
  coalesce(
    substring(upper(r.preview) from '([A-Z]{2,6}[0-9]{0,4})[[:space:]]+(?:BUY|SELL|LONG|SHORT)'),
    'MARKET'
  ) AS asset,
  coalesce(
    substring(upper(r.preview) from '\m(BUY|SELL|LONG|SHORT)\M'),
    ''
  ) AS side,
  -- How many targets the desk published. A count is not a price.
  (SELECT count(*) FROM regexp_matches(upper(r.preview), 'TP[[:space:]]*[0-9]', 'g')) AS target_count
FROM public.signal_relays r
WHERE r.preview IS NOT NULL AND length(btrim(r.preview)) > 0;

COMMENT ON VIEW public.signal_teasers IS
  'Redacted signal feed for the locked dashboard rail: instrument, direction, target count, timestamp. Never prices.';

GRANT SELECT ON public.signal_teasers TO anon, authenticated;
