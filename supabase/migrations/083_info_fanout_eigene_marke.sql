-- Eigene Marken bekommen den Cosmos-Info-Kanal NICHT gespiegelt.
--
-- Anlass 18.09.: SAIF Smart Trading (eigene Marke, Deutsch) nutzt denselben
-- Telegram-Aufbau: Tims Signale gehen in den SAIF-VIP-Kanal (im Original, siehe
-- telegram-webhook imOriginal). Der Info-Kanal-Fanout kopiert aber JEDEN Post
-- aus dem Cosmos-Info-Kanal in die Info-Kanaele aller aktiven Partner — Cosmo-
-- Texte, Ergebnis-Karten mit "COSMOS CANDLES", Lobby-Posts, alles Englisch.
-- In einem fremden Markenkanal waere das falsch. Wer config.info_fanout = false
-- traegt, faellt aus der Zielliste.

CREATE OR REPLACE FUNCTION public.info_fanout_targets(p_source_chat_id bigint)
 RETURNS TABLE(channel_id bigint, key text, footer text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.telegram_info_channel_id, t.slug, t.info_footer
    FROM public.tenants t
   WHERE t.active
     AND t.telegram_info_channel_id IS NOT NULL
     AND t.telegram_info_channel_id <> p_source_chat_id
     AND COALESCE(t.config->>'info_fanout', 'true') <> 'false'
  UNION ALL
  SELECT p.channel_id, 'pool:' || p.channel_id, NULL
    FROM public.info_channel_pool p
   WHERE p.assigned_tenant_slug IS NULL
     AND p.channel_id <> p_source_chat_id;
$function$;

UPDATE public.tenants
   SET config = COALESCE(config, '{}'::jsonb) || '{"info_fanout": false}'::jsonb
 WHERE slug = 'saif';
