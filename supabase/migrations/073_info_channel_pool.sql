-- 073 — Info-Kanäle auf Vorrat.
--
-- Das Problem, das dahintersteckt (Ansage 04.09.): ein Partner will starten und
-- bekommt einen Info-Kanal, in dem NICHTS steht. Ein leerer Kanal ist schlimmer
-- als keiner — er sieht aus wie ein aufgegebenes Projekt, und der Partner muss
-- seinen Leuten trotzdem den Beitritt zumuten.
--
-- Die Lösung: Kanäle vorher anlegen und von heute an mitfüllen. Wenn ein Partner
-- startet, kriegt er einen fertigen — mit Historie — und wir benennen ihn nur um.
-- Wie sein Name lautet, während er im Lager steht, ist egal.
--
-- Warum eine EIGENE Tabelle und keine Platzhalter-Mandanten:
-- ein Mandant in `tenants` ist überall sichtbar — Partnerliste, Anmeldung,
-- Abrechnung, Broker-Zuordnung. Zwanzig Karteileichen dort würden jede dieser
-- Ansichten verschmutzen und wären in jeder Auswertung mitzuzählen. Ein Kanal
-- ohne Partner ist kein Partner; er ist Inventar.
CREATE TABLE IF NOT EXISTS public.info_channel_pool (
  channel_id           bigint PRIMARY KEY,
  title                text NOT NULL,
  invite_link          text,
  -- NULL = liegt im Lager und wird mitbefüllt.
  -- Gesetzt = gehört diesem Partner; ab da läuft die Zustellung über
  -- tenants.telegram_info_channel_id, damit nichts doppelt ankommt.
  assigned_tenant_slug text REFERENCES public.tenants(slug) ON DELETE SET NULL,
  assigned_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Ein Kanal gehört höchstens einem Partner. Ohne das könnten zwei Partner
-- unbemerkt auf denselben Kanal zeigen und die Zielgruppen vermischen sich.
CREATE UNIQUE INDEX IF NOT EXISTS info_channel_pool_tenant_uniq
  ON public.info_channel_pool (assigned_tenant_slug)
  WHERE assigned_tenant_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS info_channel_pool_frei_idx
  ON public.info_channel_pool (created_at)
  WHERE assigned_tenant_slug IS NULL;

-- Kein öffentlicher Zugriff: das ist reines Inventar für die Zustellung.
ALTER TABLE public.info_channel_pool ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.info_channel_pool IS
  'Vorrats-Info-Kanäle: werden mitbefüllt, bevor ein Partner existiert. '
  'assigned_tenant_slug NULL = frei; gesetzt = die Zustellung läuft über tenants.';

-- ── Die Zustellliste an EINER Stelle ────────────────────────────────────────
--
-- Vorher stand sie im Webhook-Code: "alle Mandanten mit info_channel_id". Jetzt
-- kommen die Lager-Kanäle dazu, und diese Liste muss an drei Stellen gleich sein
-- (Erstzustellung, Korrektur, Nachfüllen). Also einmal in der Datenbank.
--
-- Die Quelle selbst kann hier NIE auftauchen: `tenants` lässt Cosmos bewusst auf
-- NULL, und ein Lager-Kanal ist per Definition ein anderer. Trotzdem filtern wir
-- die Quelle unten hart heraus — eine Fehlkonfiguration würde sonst eine
-- Endlosschleife bauen, bei der der Kanal sich selbst kopiert.
CREATE OR REPLACE FUNCTION public.info_fanout_targets(p_source_chat_id bigint)
RETURNS TABLE (channel_id bigint, key text, footer text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.telegram_info_channel_id, t.slug, t.info_footer
    FROM public.tenants t
   WHERE t.active
     AND t.telegram_info_channel_id IS NOT NULL
     AND t.telegram_info_channel_id <> p_source_chat_id
  UNION ALL
  -- Lager-Kanäle: kein Partner, also keine Fußzeile. Die kommt bei der Übergabe.
  SELECT p.channel_id, 'pool:' || p.channel_id, NULL
    FROM public.info_channel_pool p
   WHERE p.assigned_tenant_slug IS NULL
     AND p.channel_id <> p_source_chat_id;
$$;

COMMENT ON FUNCTION public.info_fanout_targets(bigint) IS
  'Alle Ziele eines Info-Posts: Partner-Kanäle + freie Vorrats-Kanäle. '
  'Die Quelle wird immer herausgefiltert.';

-- ── Übergabe an einen startenden Partner ────────────────────────────────────
--
-- Ein Handgriff statt drei, weil die drei sonst auseinanderlaufen: der Kanal
-- muss gleichzeitig dem Partner gehören, aus dem Lager verschwinden und in
-- tenants eingetragen sein. Passiert das in getrennten Schritten und einer
-- schlägt fehl, bekommt der Partner entweder doppelt oder gar nichts.
CREATE OR REPLACE FUNCTION public.assign_info_channel(p_tenant_slug text, p_channel_id bigint DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = p_tenant_slug) THEN
    RAISE EXCEPTION 'Mandant % existiert nicht', p_tenant_slug;
  END IF;

  IF (SELECT telegram_info_channel_id FROM public.tenants WHERE slug = p_tenant_slug) IS NOT NULL THEN
    RAISE EXCEPTION 'Mandant % hat schon einen Info-Kanal', p_tenant_slug;
  END IF;

  -- Ohne Wunschkanal: der ÄLTESTE freie. Der hat die längste Historie, und
  -- genau darum geht es — der Partner soll keinen leeren Raum übernehmen.
  SELECT channel_id INTO v_channel
    FROM public.info_channel_pool
   WHERE assigned_tenant_slug IS NULL
     AND (p_channel_id IS NULL OR channel_id = p_channel_id)
   ORDER BY created_at
   LIMIT 1
     FOR UPDATE;

  IF v_channel IS NULL THEN
    RAISE EXCEPTION 'Kein freier Info-Kanal im Lager%',
      CASE WHEN p_channel_id IS NULL THEN '' ELSE ' (angefragt: ' || p_channel_id || ')' END;
  END IF;

  UPDATE public.info_channel_pool
     SET assigned_tenant_slug = p_tenant_slug, assigned_at = now()
   WHERE channel_id = v_channel;

  UPDATE public.tenants
     SET telegram_info_channel_id = v_channel
   WHERE slug = p_tenant_slug;

  RETURN v_channel;
END;
$$;

COMMENT ON FUNCTION public.assign_info_channel(text, bigint) IS
  'Übergibt einen vorgefüllten Vorrats-Kanal an einen startenden Partner. '
  'Ohne Kanal-Angabe den ältesten freien (längste Historie).';
