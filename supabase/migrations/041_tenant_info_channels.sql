-- 041 — per-partner info channel: the second half of the white-label structure.
--
-- The signal relay already fans one source out to every partner's signal
-- channel. This is the same thing for the info channel — the content written
-- once in Cosmos-Candles-Info reaches every partner's own info channel, so a
-- partner's members see the partner's brand rather than ours.
--
-- info_footer is the per-partner addon: the copy is identical, the line under
-- it is theirs. Kept separate from signal_footer because the two say different
-- things — one points at the broker, the other at the partner.
--
-- Cosmos is the SOURCE, never a destination: its tenant row leaves
-- telegram_info_channel_id NULL so it cannot copy its own post back to itself.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS telegram_info_channel_id bigint,
  ADD COLUMN IF NOT EXISTS info_footer text;

COMMENT ON COLUMN public.tenants.telegram_info_channel_id IS
  'Destination channel for mirrored info-channel posts. NULL = partner gets no info copies.';
COMMENT ON COLUMN public.tenants.info_footer IS
  'Optional per-partner line appended to every mirrored info post.';

-- Where each copy landed, so an edit in the source updates the copies instead
-- of leaving partner channels showing the old text.
ALTER TABLE public.info_posts
  ADD COLUMN IF NOT EXISTS delivered jsonb;
