-- 040 — every chat the relay bot saw a post from that it is not configured for.
--
-- A Telegram channel's numeric id cannot be looked up from outside: the API
-- answers "chat not found" for any chat the bot is not a member of, and there
-- is no search. The only way a bot learns a private channel's id is by
-- receiving a post from it. So when an unknown chat posts, the router records
-- it here and drops the message — which is how INFO_CHANNEL_ID gets filled in
-- after someone adds the bot to a channel, without reading raw webhook logs.
CREATE TABLE IF NOT EXISTS public.telegram_chats_seen (
  chat_id       bigint PRIMARY KEY,
  title         text,
  chat_type     text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_chats_seen ENABLE ROW LEVEL SECURITY;
-- No policy: service-role only. Operator diagnostic, not member data.

COMMENT ON TABLE public.telegram_chats_seen IS
  'Unconfigured chats the relay bot saw a post from — used to discover channel ids.';
