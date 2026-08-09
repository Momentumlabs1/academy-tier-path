-- Applications from the partner pitch page.
--
-- The call to action was a mailto: link — the worst available conversion point.
-- On a phone it frequently opens nothing; on desktop it launches whatever mail
-- client is configured; either way the reader is thrown out of the page into a
-- blank compose window, and anyone who gives up there leaves no trace at all.
--
-- No policies on purpose. RLS is on and nothing reads or writes this through the
-- API: inserts arrive through the `partner-apply` function under the service role,
-- which validates first. The rows carry a phone number and an email for people who
-- are not customers, so the fewer doors onto the table the better.
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text NOT NULL,
  channel     text,
  reach       text,
  niche       text,
  note        text,
  source      text,
  status      text NOT NULL DEFAULT 'new'
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_partner_applications_created
  ON public.partner_applications (created_at DESC);
