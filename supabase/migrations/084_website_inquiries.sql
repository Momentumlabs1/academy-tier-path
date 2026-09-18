-- 084 — Anfragen von Partner-Websites (zuerst SAIF Smart Trading, tenant 'saif').
-- Geschrieben von der SAIF-Website-Session (18./19.09.), geprueft und eingespielt
-- von der Cosmos-Betriebssession. Ergaenzt: doppelte Absendung (gleiche
-- Erreichbarkeit binnen 10 min) wird gespeichert, aber nur einmal gemeldet.
-- Anfragen von Partner-Websites (zuerst SAIF, tenant 'saif').
-- Die Website ruft submit_website_inquiry() per PostgREST-RPC mit dem Publishable Key auf.
-- Die Funktion prueft, speichert und meldet ueber das bestehende admin_alert() in "Cosmos Admin 🔔"
-- (Token bleibt in app_secrets). Direkter Tabellenzugriff: nur Plattform-Admins lesen/aendern.

create table if not exists public.website_inquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  tenant_slug text not null references public.tenants(slug),
  topic       text not null,
  name        text not null,
  reach       text not null,
  message     text,
  context     text,
  page        text,
  status      text not null default 'neu' check (status in ('neu', 'kontaktiert', 'erledigt', 'spam'))
);
create index if not exists website_inquiries_created on public.website_inquiries (created_at desc);

alter table public.website_inquiries enable row level security;
revoke all on public.website_inquiries from anon, authenticated;
grant select, update on public.website_inquiries to authenticated;
drop policy if exists website_inquiries_admin_read on public.website_inquiries;
create policy website_inquiries_admin_read on public.website_inquiries
  for select to authenticated using (public.is_platform_admin());
drop policy if exists website_inquiries_admin_update on public.website_inquiries;
create policy website_inquiries_admin_update on public.website_inquiries
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.submit_website_inquiry(
  p_tenant  text,
  p_topic   text,
  p_name    text,
  p_reach   text,
  p_message text default null,
  p_context text default null,
  p_page    text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand text;
  v_name  text := left(btrim(coalesce(p_name, '')), 80);
  v_reach text := left(btrim(coalesce(p_reach, '')), 120);
  v_topic text := left(coalesce(nullif(btrim(p_topic), ''), 'Kontakt'), 80);
  v_msg   text := nullif(left(btrim(coalesce(p_message, '')), 1500), '');
  v_ctx   text := nullif(left(btrim(coalesce(p_context, '')), 400), '');
  v_doppelt boolean;
begin
  select name into v_brand from tenants where slug = p_tenant;
  if v_brand is null or length(v_name) < 2 or length(v_reach) < 4 then
    return false;
  end if;
  -- Spam-Bremse: hoechstens 20 Anfragen in 10 Minuten ueber alle Websites
  if (select count(*) from website_inquiries where created_at > now() - interval '10 minutes') >= 20 then
    return false;
  end if;

  -- Doppelt abgeschickt (zweimal auf "Senden", Seite neu geladen): speichern ja,
  -- aber die Admin-Gruppe bekommt dieselbe Person nur einmal in 10 Minuten.
  select exists(select 1 from website_inquiries
                 where lower(reach) = lower(v_reach) and created_at > now() - interval '10 minutes')
    into v_doppelt;

  insert into website_inquiries (tenant_slug, topic, name, reach, message, context, page)
  values (p_tenant, v_topic, v_name, v_reach, v_msg, v_ctx, left(p_page, 80));

  if v_doppelt then
    return true;
  end if;

  perform admin_alert(concat_ws(E'\n',
    '🟡 Neue Anfrage · ' || v_brand || ' Website',
    'Thema: ' || v_topic,
    'Name: ' || v_name,
    'Erreichbar: ' || v_reach,
    'Antworten: ' || v_ctx,
    'Nachricht: ' || left(v_msg, 600)));
  return true;
end;
$$;

revoke all on function public.submit_website_inquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_website_inquiry(text, text, text, text, text, text, text) to anon, authenticated;
