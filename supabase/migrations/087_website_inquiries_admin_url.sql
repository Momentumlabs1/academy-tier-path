-- 087 — In der Anfrage-Meldung steht, wo man sie bearbeitet.
--
-- 086 hat die Meldung schon in die Gruppe DER MARKE geschickt (admin_alert_tenant).
-- Was fehlte: der Weg von der Meldung zur Bearbeitung. Saif liest "Neue Anfrage"
-- in seiner Gruppe und muss dann selbst wissen, wo sein Admin-Bereich liegt.
--
-- Deshalb eine letzte Zeile "Öffnen: …" aus tenants.config->>'admin_url'. Steht
-- dort nichts (alle Cosmos-Partner), fehlt die Zeile einfach — concat_ws laesst
-- NULL weg, die Meldung sieht aus wie bisher.
--
-- Unveraendert uebernommen aus 086, weil es sonst still verloren ginge: die
-- Doppel-Sende-Bremse (v_doppelt). Wer zweimal auf "Senden" drueckt oder die
-- Seite neu laedt, steht einmal in website_inquiries UND einmal in der Gruppe,
-- nicht zweimal.

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
  v_admin text;
  v_name  text := left(btrim(coalesce(p_name, '')), 80);
  v_reach text := left(btrim(coalesce(p_reach, '')), 120);
  v_topic text := left(coalesce(nullif(btrim(p_topic), ''), 'Kontakt'), 80);
  v_msg   text := nullif(left(btrim(coalesce(p_message, '')), 1500), '');
  v_ctx   text := nullif(left(btrim(coalesce(p_context, '')), 400), '');
  v_doppelt boolean;
begin
  select name, nullif(btrim(coalesce(config->>'admin_url', '')), '')
    into v_brand, v_admin
    from tenants where slug = p_tenant;
  if v_brand is null or length(v_name) < 2 or length(v_reach) < 4 then
    return false;
  end if;
  -- Spam-Bremse: hoechstens 20 Anfragen in 10 Minuten ueber alle Websites
  if (select count(*) from website_inquiries where created_at > now() - interval '10 minutes') >= 20 then
    return false;
  end if;

  -- Doppelt abgeschickt: speichern ja, aber die Gruppe bekommt dieselbe Person
  -- nur einmal in 10 Minuten.
  select exists(select 1 from website_inquiries
                 where lower(reach) = lower(v_reach) and created_at > now() - interval '10 minutes')
    into v_doppelt;

  insert into website_inquiries (tenant_slug, topic, name, reach, message, context, page)
  values (p_tenant, v_topic, v_name, v_reach, v_msg, v_ctx, left(p_page, 80));

  if v_doppelt then
    return true;
  end if;

  perform admin_alert_tenant(p_tenant, concat_ws(E'\n',
    '🟡 Neue Anfrage · ' || v_brand || ' Website',
    'Thema: ' || v_topic,
    'Name: ' || v_name,
    'Erreichbar: ' || v_reach,
    'Antworten: ' || v_ctx,
    'Nachricht: ' || left(v_msg, 600),
    case when v_admin is not null then 'Öffnen: ' || v_admin end));
  return true;
end;
$$;

revoke all on function public.submit_website_inquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_website_inquiry(text, text, text, text, text, text, text) to anon, authenticated;
