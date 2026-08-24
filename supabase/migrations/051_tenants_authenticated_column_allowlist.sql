-- Ein Partner darf die Geschaeftsbedingungen eines anderen Partners nicht lesen.
--
-- GEFUNDEN 23.08.2026. Migration 027 hat fuer `anon` eine Spalten-Erlaubnisliste
-- gesetzt, `authenticated` aber nie — dort galt weiter SELECT auf ALLE Spalten.
-- Zusammen mit der Regel tenants_public_read (SELECT fuer {public}, Bedingung
-- nur `active = true`) heisst das: jeder Angemeldete liest von JEDER aktiven
-- Marke partner_rate, partner_rate_unit, partner_volume, owner_user_id und die
-- privaten telegram_channel_id / telegram_info_channel_id.
--
-- Louis konnte also Zekos Provisionssatz, dessen gebuchtes Volumen und dessen
-- private Kanal-IDs abfragen. Das ist der Kern des White-Label-Versprechens.
--
-- WARUM NICHT EINFACH DIE REGEL AUF anon EINSCHRAENKEN
-- resolve-tenant.ts liest slug/name/config/active mit der Sitzung des
-- Besuchers. Waere die Regel nur fuer anon, saehe ein ANGEMELDETER Besucher
-- auf einer Partnerseite gar keine Marke mehr. Die Regel bleibt, die Spalten
-- werden eng.

revoke select on public.tenants from authenticated;
grant  select (id, slug, name, config, active, created_at,
               broker_affiliate_url, signal_footer, superpartner)
  on public.tenants to authenticated;

-- Schreibrechte auf tenants hatte sogar `anon`. Die RLS liess bisher nichts
-- durch (es gibt nur SELECT-Regeln), aber ein Recht, das niemand braucht,
-- gehoert entzogen und nicht auf die naechste Regel gehofft.
revoke insert, update, delete, truncate on public.tenants from anon, authenticated;

-- Das Partner-Dashboard braucht partner_rate/partner_volume weiter — es filtert
-- selbst auf owner_user_id = auth.uid(). Als DEFINER liest es die Spalten mit
-- den Rechten des Erstellers, die Zeilenauswahl bleibt die des Aufrufers.
-- (Schreibrechte auf diese View wurden in 049 bereits entzogen.)
alter view public.affiliate_dashboard set (security_invoker = false);

-- Die eigenen Kanal-IDs bleiben erreichbar — aber nur die eigenen.
create or replace function public.my_tenant_channels(p_slug text)
returns table (telegram_channel_id text, telegram_info_channel_id text)
language sql
security definer
set search_path to 'public'
as $function$
  SELECT t.telegram_channel_id::text, t.telegram_info_channel_id::text
    FROM tenants t
   WHERE t.slug = p_slug
     AND (is_platform_admin() OR t.owner_user_id = auth.uid());
$function$;

revoke execute on function public.my_tenant_channels(text) from anon;
grant  execute on function public.my_tenant_channels(text) to authenticated;
