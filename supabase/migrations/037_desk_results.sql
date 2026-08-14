-- Real desk results, parsed from the recap the desk already posts.
--
-- The site used to claim "74% signal accuracy". That number was typed by hand and
-- has been removed. This is the replacement: the same kind of figure, except
-- derived from messages the desk actually sent, each row traceable back to the
-- Telegram message it came from.
--
-- The desk posts a recap in this shape:
--
--     📊 Performance Heute
--     NAS SELL
--     • +1 RR
--     • +4 RR
--     • −0.5 RR
--     XAUUSD
--     • −1 RR
--     🔥 Gesamtergebnis: +5 RR
--
-- Each bullet is one closed trade expressed in R — how many multiples of the risk
-- it returned. R is the honest unit for this: it is position-size independent, so
-- it says nothing about anyone's account and cannot be read as "you would have
-- made €X". A percentage of capital would imply exactly that.
--
-- ONE HONESTY CONSTRAINT, AND IT MATTERS MORE THAN THE SCHEMA.
-- These numbers are only meaningful if EVERY recap is captured. If the desk posts
-- on good days and skips bad ones, this table quietly becomes a highlight reel
-- with the authority of a database behind it — worse than the invented 74%,
-- because it looks sourced. `desk_weekly` therefore also exposes how many days in
-- the week actually reported, so a partial week is visible as partial rather than
-- being averaged into something flattering.

CREATE TABLE IF NOT EXISTS public.desk_results (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traded_on          DATE NOT NULL,
  asset              TEXT,
  direction          TEXT,
  r_multiple         NUMERIC(6,2) NOT NULL,
  -- Provenance: which Telegram message this came out of. Without it a number in
  -- here can never be checked against what was actually posted.
  source_chat_id     BIGINT,
  source_message_id  BIGINT,
  line_index         INT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Re-parsing the same recap (edits, redelivery) must not double-count.
  UNIQUE (source_chat_id, source_message_id, line_index)
);

CREATE INDEX IF NOT EXISTS idx_desk_results_date ON public.desk_results (traded_on DESC);

ALTER TABLE public.desk_results ENABLE ROW LEVEL SECURITY;

-- Readable by anyone: these are the published results. Written only by the
-- service role, from the webhook.
DROP POLICY IF EXISTS desk_results_public_read ON public.desk_results;
CREATE POLICY desk_results_public_read ON public.desk_results FOR SELECT USING (true);

-- ── Weekly roll-up ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.desk_weekly AS
SELECT date_trunc('week', traded_on)::DATE           AS week_start,
       count(*)                                       AS trades,
       count(*) FILTER (WHERE r_multiple > 0)         AS wins,
       count(*) FILTER (WHERE r_multiple <= 0)        AS losses,
       round(sum(r_multiple), 2)                      AS total_r,
       round(avg(r_multiple), 2)                      AS avg_r,
       -- Rounded to whole percent on purpose: a 66.67% win rate implies a
       -- precision that 12 trades do not support.
       round(100.0 * count(*) FILTER (WHERE r_multiple > 0) / NULLIF(count(*), 0)) AS win_rate_pct,
       -- How many distinct days reported. A week showing 2 is a partial week and
       -- the UI has to say so rather than presenting it as "the week".
       count(DISTINCT traded_on)                      AS days_reported
  FROM desk_results
 GROUP BY 1
 ORDER BY 1 DESC;

GRANT SELECT ON public.desk_weekly TO anon, authenticated;
