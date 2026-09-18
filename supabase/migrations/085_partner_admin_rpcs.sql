-- 085 — Partner-Admin: der Partner sieht und fuehrt die Chats SEINES Bots.
--
-- Auftrag Diego (19.09., ueber die SAIF-Website-Session): Saif bekommt ein
-- eigenes Admin-Dashboard auf seiner Website — alle Chats seines Bots, wie
-- viele Leute ueber die Website kamen, per Klick in den Telegram-Chat, und
-- selbst als Bot antworten, wie Diego in /admin/leads.
--
-- Alles hier ist SECURITY DEFINER und prueft selbst: Zugriff hat der Owner des
-- Tenants (tenants.owner_user_id = auth.uid()) oder der Plattform-Admin. Ein
-- Partner kommt so nie an Leads eines anderen Tenants — auch nicht mit einer
-- geratenen Lead-ID, denn jede Funktion prueft den Tenant DES LEADS.

create or replace function public.partner_darf(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(is_platform_admin(), false)
      or exists (select 1 from tenants t where t.slug = p_slug and t.owner_user_id = auth.uid());
$$;

-- a) Lead-Uebersicht eines Tenants (wie setter_lead_overview + source + letzter Text)
create or replace function public.partner_lead_overview(p_slug text)
returns table (
  id uuid, telegram_user_id bigint, telegram_username text, first_name text, source text,
  status text, step text, experience text, broker_email text, deposit_usd numeric,
  vip_granted_at timestamptz, created_at timestamptz, updated_at timestamptz,
  message_count bigint, reply_count bigint, last_message_at timestamptz,
  bot_paused boolean, last_text text, last_role text
) language plpgsql stable security definer set search_path = public as $$
begin
  if not partner_darf(p_slug) then raise exception 'kein Zugriff'; end if;
  return query
  select l.id, l.telegram_user_id::bigint, l.telegram_username, l.first_name, l.source,
         l.status, l.step, l.experience, l.broker_email, l.deposit_usd::numeric,
         l.vip_granted_at, l.created_at, l.updated_at,
         (select count(*) from setter_messages m where m.lead_id = l.id),
         (select count(*) from setter_messages m where m.lead_id = l.id and m.role = 'user'),
         (select max(m.created_at) from setter_messages m where m.lead_id = l.id),
         coalesce(l.bot_paused, false),
         lm.content, lm.role
    from setter_leads l
    left join lateral (
      select m.content, m.role from setter_messages m
       where m.lead_id = l.id order by m.created_at desc limit 1
    ) lm on true
   where l.tenant_slug = p_slug
   order by coalesce((select max(m.created_at) from setter_messages m where m.lead_id = l.id), l.created_at) desc;
end $$;

-- b) Verlauf eines Leads, dazu noch nicht zugestellte eigene Nachrichten
create or replace function public.partner_lead_messages(p_lead_id uuid)
returns table (id uuid, role text, content text, created_at timestamptz, pending boolean, error text)
language plpgsql stable security definer set search_path = public as $$
declare v_slug text;
begin
  select l.tenant_slug into v_slug from setter_leads l where l.id = p_lead_id;
  if v_slug is null or not partner_darf(v_slug) then raise exception 'kein Zugriff'; end if;
  return query
  select m.id, m.role, m.content, m.created_at, false, null::text
    from setter_messages m where m.lead_id = p_lead_id
  union all
  select o.id, 'admin'::text, o.text, o.created_at, true, o.error
    from setter_outbox o where o.lead_id = p_lead_id and o.sent_at is null
  order by 4;
end $$;

-- c) Selbst schreiben (geht ueber den Postausgang an den Bot des Tenants) und
--    Bot pausieren/zurueckgeben — wie setter_admin_*, nur fuer eigene Leads.
create or replace function public.partner_send(p_lead_id uuid, p_text text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_slug text; v_id uuid;
begin
  select l.tenant_slug into v_slug from setter_leads l where l.id = p_lead_id;
  if v_slug is null or not partner_darf(v_slug) then raise exception 'kein Zugriff'; end if;
  if p_text is null or char_length(btrim(p_text)) = 0 then raise exception 'leere Nachricht'; end if;
  if char_length(p_text) > 4000 then raise exception 'zu lang (max. 4000 Zeichen)'; end if;

  insert into setter_outbox (lead_id, text, created_by)
  values (p_lead_id, p_text, auth.uid()) returning id into v_id;

  -- Wer selbst schreibt, uebernimmt — sonst redet der Bot dazwischen.
  update setter_leads set bot_paused = true, bot_paused_at = now(), bot_paused_by = auth.uid()
   where id = p_lead_id and not coalesce(bot_paused, false);
  return v_id;
end $$;

create or replace function public.partner_set_paused(p_lead_id uuid, p_paused boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  select l.tenant_slug into v_slug from setter_leads l where l.id = p_lead_id;
  if v_slug is null or not partner_darf(v_slug) then raise exception 'kein Zugriff'; end if;
  update setter_leads
     set bot_paused    = p_paused,
         bot_paused_at = case when p_paused then now() else null end,
         bot_paused_by = case when p_paused then auth.uid() else null end
   where id = p_lead_id;
end $$;

-- d) Kennzahlen fuer das Dashboard
--    Info-Kanal-Beitritte werden nicht gespeichert (nur als Meldung) -> null.
create or replace function public.partner_stats(p_slug text, p_days int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_seit timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)) - 1);
  v json;
begin
  if not partner_darf(p_slug) then raise exception 'kein Zugriff'; end if;
  with leads as (
    select l.* from setter_leads l where l.tenant_slug = p_slug and l.created_at >= v_seit
  ), tage as (
    select generate_series(v_seit, date_trunc('day', now()), interval '1 day')::date as tag
  )
  select json_build_object(
    'seit', v_seit,
    'bot_starts', (select count(*) from leads),
    'bot_starts_nach_quelle', (select coalesce(json_object_agg(q, n), '{}'::json)
                                 from (select coalesce(nullif(source, ''), 'direkt') q, count(*) n
                                         from leads group by 1) s),
    'leads_mit_antwort', (select count(*) from leads l
                           where exists (select 1 from setter_messages m where m.lead_id = l.id and m.role = 'user')),
    'einzahlungen', (select count(*) from leads where coalesce(deposit_usd, 0) > 0),
    'einzahlungen_usd', (select coalesce(sum(deposit_usd), 0) from leads where coalesce(deposit_usd, 0) > 0),
    'vip_freigeschaltet', (select count(*) from leads where vip_granted_at is not null),
    'website_anfragen', (select count(*) from website_inquiries w
                          where w.tenant_slug = p_slug and w.created_at >= v_seit),
    'info_kanal_beitritte', null,
    'pro_tag', (select coalesce(json_agg(json_build_object(
                   'tag', t.tag,
                   'bot_starts', (select count(*) from leads l where l.created_at::date = t.tag),
                   'einzahlungen', (select count(*) from leads l
                                     where coalesce(l.deposit_usd, 0) > 0 and l.created_at::date = t.tag),
                   'website_anfragen', (select count(*) from website_inquiries w
                                         where w.tenant_slug = p_slug and w.created_at::date = t.tag)
                 ) order by t.tag), '[]'::json) from tage t)
  ) into v;
  return v;
end $$;

-- e) Website-Anfragen des Tenants lesen und abhaken
create or replace function public.partner_inquiries(p_slug text)
returns setof public.website_inquiries
language plpgsql stable security definer set search_path = public as $$
begin
  if not partner_darf(p_slug) then raise exception 'kein Zugriff'; end if;
  return query select * from website_inquiries w where w.tenant_slug = p_slug order by w.created_at desc;
end $$;

create or replace function public.partner_set_inquiry_status(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  select w.tenant_slug into v_slug from website_inquiries w where w.id = p_id;
  if v_slug is null or not partner_darf(v_slug) then raise exception 'kein Zugriff'; end if;
  if p_status not in ('neu', 'kontaktiert', 'erledigt', 'spam') then raise exception 'unbekannter Status'; end if;
  update website_inquiries set status = p_status where id = p_id;
end $$;

-- Nur angemeldete Nutzer; die Funktionen pruefen den Tenant selbst.
revoke all on function public.partner_darf(text) from public, anon;
revoke all on function public.partner_lead_overview(text) from public, anon;
revoke all on function public.partner_lead_messages(uuid) from public, anon;
revoke all on function public.partner_send(uuid, text) from public, anon;
revoke all on function public.partner_set_paused(uuid, boolean) from public, anon;
revoke all on function public.partner_stats(text, int) from public, anon;
revoke all on function public.partner_inquiries(text) from public, anon;
revoke all on function public.partner_set_inquiry_status(bigint, text) from public, anon;
grant execute on function public.partner_darf(text) to authenticated;
grant execute on function public.partner_lead_overview(text) to authenticated;
grant execute on function public.partner_lead_messages(uuid) to authenticated;
grant execute on function public.partner_send(uuid, text) to authenticated;
grant execute on function public.partner_set_paused(uuid, boolean) to authenticated;
grant execute on function public.partner_stats(text, int) to authenticated;
grant execute on function public.partner_inquiries(text) to authenticated;
grant execute on function public.partner_set_inquiry_status(bigint, text) to authenticated;
