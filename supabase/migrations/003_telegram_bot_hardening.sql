-- ============================================================
-- 003 — Telegram bot hardening: idempotency + album buffering
--
-- Backs the production hardening of the telegram-webhook function:
--  • telegram_updates    — dedupe redelivered updates by update_id
--  • telegram_album_parts — buffer multi-media posts (same media_group_id
--                           arrives as several separate updates) so they
--                           can be relayed as ONE album via copyMessages
-- Both are service-role only (RLS on, no policies).
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id  BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Housekeeping: an index to prune old rows (a cron can delete > 1 day old).
CREATE INDEX IF NOT EXISTS idx_telegram_updates_created ON telegram_updates (created_at);

CREATE TABLE IF NOT EXISTS telegram_album_parts (
  media_group_id    TEXT   NOT NULL,
  source_chat_id    BIGINT NOT NULL,
  source_message_id BIGINT NOT NULL,
  relayed           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (media_group_id, source_message_id)
);

CREATE INDEX IF NOT EXISTS idx_album_parts_group ON telegram_album_parts (media_group_id) WHERE NOT relayed;

ALTER TABLE telegram_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_album_parts ENABLE ROW LEVEL SECURITY;

-- Store the relayed destination message ids on signal_relays so edits can
-- be propagated later (source_message_id → per-tenant dest message id lives
-- in the existing `delivered` JSONB; nothing to add there).
