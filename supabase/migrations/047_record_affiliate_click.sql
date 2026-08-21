-- 047: Klicks wirklich zaehlen.
--
-- affiliate_dashboard.clicks zaehlt affiliate_clicks — aber NICHTS hat je in
-- diese Tabelle geschrieben. Die Kopfzahl jedes Partner-Dashboards waere fuer
-- immer 0 geblieben.
--
-- Bewusst eine SECURITY-DEFINER-Funktion statt einer offenen anon-INSERT-
-- Policy: die Funktion bestimmt selbst, welche Spalten ein Besucher fuellen
-- kann (kein member_id, kein country, kein broker von aussen), und loest den
-- Slug serverseitig auf. Dedupe macht der Client pro Session.

create or replace function public.record_affiliate_click(
  p_slug text,
  p_referrer text default null,
  p_utm jsonb default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select id into v_tenant from tenants where slug = p_slug and active;
  if v_tenant is null then
    return; -- unbekannter Slug: still verwerfen, kein Fehler an den Besucher
  end if;
  insert into affiliate_clicks (tenant_id, landing_slug, referrer, utm, user_agent)
  values (v_tenant, p_slug, left(p_referrer, 500), p_utm, left(p_user_agent, 300));
end;
$$;

revoke all on function public.record_affiliate_click(text, text, jsonb, text) from public;
grant execute on function public.record_affiliate_click(text, text, jsonb, text) to anon, authenticated;
