-- 020 — Cosmo Mentor upgrade: editable knowledge base + human support escalation.
--
-- Three moving parts:
--   1. mentor_knowledge  — the course knowledge the bot answers from, as editable
--      rows instead of a hardcoded string. The edge function concatenates the
--      active docs into ONE cached system prompt (the corpus is ~17k tokens, so
--      long-context + prompt caching beats RAG infra at this size). Editing a row
--      changes what the bot knows on the next request — no redeploy.
--   2. mentor_escalations — questions Cosmo hands to a human (account/payout
--      topics, or anything it isn't sure about). Support answers in /admin/support.
--   3. The trigger below posts that human answer straight back into the member's
--      chat thread, so the member sees it where they asked.

-- ── 1. Knowledge base ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_knowledge (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  -- Optional link to a lesson id in src/lib/academy-data.ts (l1, l3, l8 …).
  lesson_id  TEXT,
  lang       TEXT CHECK (lang IN ('en', 'de')),
  content    TEXT NOT NULL,
  sort       INT  NOT NULL DEFAULT 100,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentor_knowledge_active ON mentor_knowledge (is_active, sort);

ALTER TABLE mentor_knowledge ENABLE ROW LEVEL SECURITY;

-- Only admins touch the KB from the client. The edge function reads it with the
-- service role, so no member-facing SELECT policy is needed (and the raw corpus
-- stays out of the browser).
DROP POLICY IF EXISTS mentor_kb_admin_all ON mentor_knowledge;
CREATE POLICY mentor_kb_admin_all ON mentor_knowledge
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ── 2. Escalations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_escalations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- What the member actually asked, plus why Cosmo handed it over.
  question    TEXT NOT NULL,
  reason      TEXT,
  -- Snapshot of the last few turns so support has context without digging.
  context     JSONB,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  answer      TEXT,
  answered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentor_esc_status  ON mentor_escalations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_esc_member  ON mentor_escalations (member_id, created_at DESC);

ALTER TABLE mentor_escalations ENABLE ROW LEVEL SECURITY;

-- Member sees the status of their own tickets; the edge function creates them
-- (service role) so a client can't forge a ticket for someone else.
DROP POLICY IF EXISTS mentor_esc_self_read ON mentor_escalations;
CREATE POLICY mentor_esc_self_read ON mentor_escalations
  FOR SELECT USING (member_id = current_member_id());

DROP POLICY IF EXISTS mentor_esc_admin_read ON mentor_escalations;
CREATE POLICY mentor_esc_admin_read ON mentor_escalations
  FOR SELECT USING (is_platform_admin());

-- Support answers / re-status tickets from the admin UI.
DROP POLICY IF EXISTS mentor_esc_admin_write ON mentor_escalations;
CREATE POLICY mentor_esc_admin_write ON mentor_escalations
  FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ── 3. Human replies land in the member's chat ───────────────────────────────
-- 'support' joins the existing roles so the widget can badge a human answer
-- differently from Cosmo's. The edge function maps it to "assistant" when it
-- replays history to the model.
ALTER TABLE mentor_messages DROP CONSTRAINT IF EXISTS mentor_messages_role_check;
ALTER TABLE mentor_messages ADD  CONSTRAINT mentor_messages_role_check
  CHECK (role IN ('user', 'assistant', 'support'));

-- Answering a ticket writes the reply into the member's thread, atomically with
-- the update — support never has to also "send" the message somewhere else.
-- SECURITY DEFINER because mentor_messages has no INSERT policy by design.
CREATE OR REPLACE FUNCTION mentor_escalation_answer_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.answer IS NOT NULL
     AND btrim(NEW.answer) <> ''
     AND (OLD.answer IS NULL OR btrim(OLD.answer) = '') THEN
    INSERT INTO mentor_messages (member_id, role, content)
    VALUES (NEW.member_id, 'support', NEW.answer);

    NEW.answered_at := COALESCE(NEW.answered_at, now());
    NEW.status      := 'resolved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_escalation_answer ON mentor_escalations;
CREATE TRIGGER trg_mentor_escalation_answer
  BEFORE UPDATE ON mentor_escalations
  FOR EACH ROW EXECUTE FUNCTION mentor_escalation_answer_to_chat();
