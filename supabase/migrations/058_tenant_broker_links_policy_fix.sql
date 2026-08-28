-- Die Regeln aus 057 fragten tenants direkt ab — und scheiterten daran.
--
-- Migration 051 hat `authenticated` das Lesen von tenants.owner_user_id
-- entzogen (ein Partner darf Besitzer und Saetze anderer Marken nicht sehen).
-- Die Regeln prueften aber genau ueber diese Spalte, also brachen sie mit
-- "permission denied for table tenants" — die Tabelle war fuer ihren eigenen
-- Besitzer unlesbar. Beim Durchtesten als Zeko sofort aufgefallen.
--
-- owned_tenant_slugs() ist dafuer da, gibt aber SETOF text zurueck, und
-- mengenliefernde Funktionen sind in Regelausdruecken nicht erlaubt. Deshalb
-- eine schmale skalare Hilfsfunktion daneben: eine Frage, eine Antwort.
create or replace function public.owns_tenant(p_slug text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from tenants t
     where t.slug = p_slug and t.owner_user_id = auth.uid()
  );
$function$;

comment on function public.owns_tenant(text) is
  'Gehoert diese Marke dem Aufrufer? SECURITY DEFINER, damit Regeln das pruefen '
  'koennen, ohne dem Partner Leserechte auf tenants.owner_user_id zu geben (051). '
  'Skalar, weil Regelausdruecke keine mengenliefernden Funktionen erlauben.';

revoke execute on function public.owns_tenant(text) from anon;
grant  execute on function public.owns_tenant(text) to authenticated;

drop policy if exists tbl_owner_reads   on public.tenant_broker_links;
drop policy if exists tbl_owner_writes  on public.tenant_broker_links;
drop policy if exists tbl_owner_updates on public.tenant_broker_links;

create policy tbl_owner_reads on public.tenant_broker_links
  for select to authenticated
  using (public.is_platform_admin() or public.owns_tenant(tenant_slug));

create policy tbl_owner_writes on public.tenant_broker_links
  for insert to authenticated
  with check (public.is_platform_admin() or public.owns_tenant(tenant_slug));

create policy tbl_owner_updates on public.tenant_broker_links
  for update to authenticated
  using (public.is_platform_admin() or public.owns_tenant(tenant_slug))
  with check (public.is_platform_admin() or public.owns_tenant(tenant_slug));
