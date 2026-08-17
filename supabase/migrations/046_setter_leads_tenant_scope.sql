-- 046 — one lead row per person PER BRAND, not per person.
--
-- setter_leads was keyed on telegram_user_id alone, and every partner's setter
-- writes into the same table. So a person who had spoken to the Cosmos bot was
-- already `step = pitched` for every other partner's bot: Zeko's setter found
-- that row and answered "Here's the sign-up link again" instead of its opener.
-- No conversation — and it looked like a broken bot rather than what it was.
--
-- With two partners it is a nuisance. With ten it is a data defect: leads,
-- deposits and VIP grants shared across brands that must not see each other's
-- customers at all.
--
-- The bots read it from TENANT_SLUG in each instance's own .env (config.py).
ALTER TABLE public.setter_leads
  ADD COLUMN IF NOT EXISTS tenant_slug text NOT NULL DEFAULT 'cosmos-candles';

COMMENT ON COLUMN public.setter_leads.tenant_slug IS
  'Which brand this conversation belongs to. Set from TENANT_SLUG in each setter''s .env.';

UPDATE public.setter_leads SET tenant_slug = 'cosmos-candles' WHERE tenant_slug IS NULL;

ALTER TABLE public.setter_leads DROP CONSTRAINT IF EXISTS setter_leads_telegram_user_id_key;
ALTER TABLE public.setter_leads
  ADD CONSTRAINT setter_leads_tenant_user_key UNIQUE (tenant_slug, telegram_user_id);

CREATE INDEX IF NOT EXISTS setter_leads_tenant_idx ON public.setter_leads (tenant_slug);
