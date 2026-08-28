-- Was der Bot in den Kanal DIESES Partners gestellt hat.
--
-- Die Zahlen liegen laengst da: signal_relays.delivered ist ein JSONB, in dem
-- pro Marke steht, ob die Weiterleitung geklappt hat und welche Nachricht
-- dabei entstanden ist:
--     {"zekoglobal": {"ok": true, "message_id": 239}, "cosmos-candles": {...}}
-- Bisher sah das niemand ausser dem Admin — der Partner, in dessen Kanal die
-- Rufe landen, hatte darauf keinen Zugriff und sah im Portal nur Klicks und
-- Kunden, also ausschliesslich Zahlen ueber Fremde.
--
-- Als Funktion und nicht als View, weil signal_relays absichtlich admin-only
-- bleibt (die Rufe enthalten Kurse). Diese Funktion gibt NUR Zaehlungen
-- zurueck, keinen Inhalt, und nur fuer die eigene Marke.
create or replace function public.partner_channel_stats(p_slug text)
returns table (
  signals_total   bigint,
  signals_7d      bigint,
  signals_30d     bigint,
  failed_30d      bigint,
  last_signal_at  timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    count(*)                                                                as signals_total,
    count(*) filter (where r.created_at > now() - interval '7 days')        as signals_7d,
    count(*) filter (where r.created_at > now() - interval '30 days')       as signals_30d,
    count(*) filter (where r.created_at > now() - interval '30 days'
                       and coalesce((d.value ->> 'ok')::boolean, false) = false) as failed_30d,
    max(r.created_at)                                                       as last_signal_at
  from signal_relays r
  cross join lateral jsonb_each(coalesce(r.delivered, '{}'::jsonb)) d
  where d.key = p_slug
    and (public.is_platform_admin() or public.owns_tenant(p_slug));
$function$;

comment on function public.partner_channel_stats(text) is
  'Zaehlungen zur Signal-Zustellung in den Kanal einer Marke. Nur fuer den '
  'Besitzer oder einen Admin — und ausschliesslich Zahlen, nie der Inhalt eines '
  'Rufs (signal_relays bleibt admin-only, dort stehen Kurse).';

revoke execute on function public.partner_channel_stats(text) from anon;
grant  execute on function public.partner_channel_stats(text) to authenticated;
