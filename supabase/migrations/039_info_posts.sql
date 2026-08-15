-- 039 — mirror of the public Telegram info channel.
--
-- The dashboard rail used to fill this slot with "Popular: Scalping /
-- Breakouts / Mean Reversion" — three rankings of nothing that were typed by
-- hand. The team already writes for exactly this audience in the info channel,
-- so the rail now reads from it instead of inventing content.
--
-- Public-read on purpose: this is the channel's public output. Nothing gated
-- ever lands here — the webhook router only writes posts whose chat_id equals
-- INFO_CHANNEL_ID, never the signal or VIP channels.
CREATE TABLE IF NOT EXISTS public.info_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       bigint NOT NULL,
  message_id    bigint NOT NULL,
  text          text,
  photo_file_id text,
  posted_at     timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Keyed on the message, so an edit in Telegram updates the row it came from
  -- instead of appending a second copy.
  UNIQUE (chat_id, message_id)
);

CREATE INDEX IF NOT EXISTS info_posts_posted_at_idx ON public.info_posts (posted_at DESC);

ALTER TABLE public.info_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS info_posts_public_read ON public.info_posts;
CREATE POLICY info_posts_public_read ON public.info_posts
  FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.info_posts IS
  'Mirror of the public Telegram info channel; feeds the dashboard right rail.';
