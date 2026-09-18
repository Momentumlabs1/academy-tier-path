-- 086 — Meldungen eigener Marken in deren eigene Admin-Gruppe.
--
-- Auftrag Diego (19.09., ueber CC MAIN / "smart trading"): SAIF Smart Trading hat
-- eine eigene Gruppe "SAIF Admin 🔔" (tenants.config.admin_chat_id). Beitritte
-- in den SAIF-Info-Kanal, Einzahlungen von SAIF-Kunden und Anfragen ueber die
-- SAIF-Website sollen DORT landen, nicht in "Cosmos Admin 🔔" — und der Name
-- "Cosmos" soll in dieser Gruppe nicht auftauchen, also schreibt dort der Bot
-- DER MARKE (app_secrets 'BOT_TOKEN_<slug>'), nicht @CosmosRelaybot.
--
-- Solange die Marke noch keinen Bot hat (oder keine Gruppe), geht die Meldung
-- mit Kennzeichnung zu uns: lieber im falschen Raum als verloren. Tenants ohne
-- admin_chat_id (alle Cosmos-Partner) bleiben exakt wie bisher.

create or replace function public.admin_alert_tenant(p_slug text, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare v_chat text; v_token text;
begin
  if p_slug is not null and p_slug <> 'cosmos-candles' then
    select config->>'admin_chat_id' into v_chat from tenants where slug = p_slug;
    if v_chat is not null then
      select value into v_token from app_secrets where key = 'BOT_TOKEN_' || p_slug;
      if v_token is not null then
        perform net.http_post(
          url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
          body := jsonb_build_object('chat_id', v_chat, 'text', p_text));
        return;
      end if;
      perform admin_alert('[' || p_slug || ' · eigener Bot fehlt noch] ' || p_text);
      return;
    end if;
  end if;
  perform admin_alert(p_text);
exception when others then null;
end $$;

revoke all on function public.admin_alert_tenant(text, text) from public, anon, authenticated;

-- Einzahlungen: nach der Marke, ueber die das Mitglied kam.
create or replace function public.trg_alert_member_deposit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(old.deposit, 0) = 0 and coalesce(new.deposit, 0) > 0 then
    perform admin_alert_tenant(new.referred_by_tenant,
      '✅ Deposit bestätigt: ' || coalesce(new.email, new.id::text) || ' — ' || new.deposit::text || ' €');
  end if;
  return new;
end $$;

-- Website-Anfragen (084): an die Marke der Website.
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
  if (select count(*) from website_inquiries where created_at > now() - interval '10 minutes') >= 20 then
    return false;
  end if;

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
    'Nachricht: ' || left(v_msg, 600)));
  return true;
end;
$$;
