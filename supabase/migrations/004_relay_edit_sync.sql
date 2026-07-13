-- 004_relay_edit_sync
-- When Tim edits a post in the main channel, the bot edits every relayed copy.
-- The destination message ids already live in signal_relays.delivered
-- ({ "<slug>": { ok, message_id } }); these columns just record the edit result
-- for observability in the admin panel.

ALTER TABLE signal_relays
  ADD COLUMN IF NOT EXISTS edited_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_delivered JSONB;
