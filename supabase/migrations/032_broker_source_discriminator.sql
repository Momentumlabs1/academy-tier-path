-- Two brokers now feed the same tables, so a row has to say which one it came from.
--
-- HeroFX serves the US (MetaTrader stopped accepting US clients), VT Markets
-- everyone else. Both write into broker_clients / broker_accounts / broker_trades,
-- and `apply_broker_rollup()` reads only those three — which is exactly why the
-- switch away from TradeQuo touches so little.
--
-- The problem is the key. `broker_clients.client_id` is the primary key and each
-- broker numbers its own clients: Hero's ids are their own sequence, VT's are
-- theirs. Sooner or later two brokers hand out the same number and one client
-- silently overwrites the other — with a deposit attached. So the key becomes
-- (broker, client_id).
--
-- Existing rows are TradeQuo's and are backfilled as 'legacy' rather than deleted:
-- they are what the current members' deposits were reconciled from, and dropping
-- them would make the ledger unexplainable.
ALTER TABLE public.broker_clients  ADD COLUMN IF NOT EXISTS broker text NOT NULL DEFAULT 'legacy';
ALTER TABLE public.broker_accounts ADD COLUMN IF NOT EXISTS broker text NOT NULL DEFAULT 'legacy';
ALTER TABLE public.broker_trades   ADD COLUMN IF NOT EXISTS broker text NOT NULL DEFAULT 'legacy';

ALTER TABLE public.broker_clients ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE public.broker_clients DROP CONSTRAINT IF EXISTS broker_clients_pkey;
ALTER TABLE public.broker_clients ADD CONSTRAINT broker_clients_pkey PRIMARY KEY (broker, client_id);

CREATE INDEX IF NOT EXISTS idx_broker_clients_broker_email
  ON public.broker_clients (broker, lower(email));
