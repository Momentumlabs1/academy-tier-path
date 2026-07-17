-- 006 — Auto-kick support: audit columns for when a member loses access.
--
-- The relay bot already GATES entry (only members with deposit ≥ €100 are
-- approved into a brand channel). What was missing is REMOVAL when a member
-- later withdraws / drops below the threshold. The member-access-sync edge
-- function re-evaluates a member and kicks them from every channel they're in;
-- these columns record why/when so the admin audit trail is complete.

ALTER TABLE telegram_links
  ADD COLUMN IF NOT EXISTS revoked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- Fast lookup of "who is currently in a channel" for reconciliation sweeps.
CREATE INDEX IF NOT EXISTS idx_telegram_links_active
  ON telegram_links (status)
  WHERE status IN ('linked', 'joined');
