-- 015 — Mentor chatbot ("Cosmo Mentor"): message log + rate-limit basis.
--
-- The bot answers educational/platform questions for logged-in customers via the
-- Claude API (Haiku 4.5) with a cached knowledge base — see the mentor-chat edge
-- function. This table stores each exchange so (a) the bot has conversation
-- context, (b) we can rate-limit per member per day, and (c) the admin can review.

CREATE TABLE IF NOT EXISTS mentor_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentor_messages_member ON mentor_messages (member_id, created_at DESC);

ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;

-- Member reads only their own chat history. Writes go through the edge function
-- (service role) so the model's replies can't be forged by the client.
DROP POLICY IF EXISTS mentor_self_read ON mentor_messages;
CREATE POLICY mentor_self_read ON mentor_messages
  FOR SELECT USING (member_id = current_member_id());

-- Admin can review all conversations.
DROP POLICY IF EXISTS mentor_admin_read ON mentor_messages;
CREATE POLICY mentor_admin_read ON mentor_messages
  FOR SELECT USING (is_platform_admin());
