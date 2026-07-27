-- ============================================================
-- 020 — Automatic "deposit confirmed" e-mail
--
-- The broker DB now refreshes every 10 minutes (it used to be 12 hours), so a
-- deposit is booked by apply_broker_rollup a few minutes after the member pays.
-- The dashboard already reacts on its own (it polls the member row), but a
-- member who closed the tab got nothing at all: the rollup writes deposit_events
-- and never notified anyone.
--
-- This adds the bookkeeping the notifier needs. The deposit-notify edge function
-- picks up rows where notified_at IS NULL, mails the member and stamps the row,
-- so every deposit is announced exactly once even if a run fails midway.
-- ============================================================

ALTER TABLE deposit_events
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Everything that already exists predates the notifier. Stamp it as handled —
-- without this, the first run would mail every historical depositor.
UPDATE deposit_events SET notified_at = now() WHERE notified_at IS NULL;

-- The notifier only ever scans the unsent tail, so index exactly that.
CREATE INDEX IF NOT EXISTS idx_deposit_events_unnotified
  ON deposit_events (created_at)
  WHERE notified_at IS NULL;

COMMENT ON COLUMN deposit_events.notified_at IS
  'When the member was e-mailed about this deposit. NULL = still queued for deposit-notify.';
