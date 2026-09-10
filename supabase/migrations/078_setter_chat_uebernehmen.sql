-- Chat uebernehmen: der Admin schreibt als Bot, der Bot ist pro Lead stummschaltbar.
--
-- Ansage Diego 11.09.: "Laeuft das, dass ich in meinem Admin-Bereich alle Chats
-- der Bots und Leads einsehen kann? Ich muss die Moeglichkeit haben, selber
-- Nachrichten zu schreiben."
--
-- Einsehen ging (/admin/leads, nur lesend). Schreiben nicht — und der Hinweis
-- auf der Seite ("reply in Telegram") war gar nicht einloesbar: der Lead
-- schreibt mit dem BOT, nicht mit Diego.
--
-- WIE ES LAEUFT
--   Web  -> setter_admin_send()   legt die Nachricht in setter_outbox und
--                                 schaltet den Bot fuer diesen Lead stumm
--   Bot  -> holt setter_outbox alle paar Sekunden ab, sendet, protokolliert
--           in setter_messages mit role='admin' — erst NACH der Zustellung,
--           damit das Protokoll zeigt, was wirklich ankam.
-- Der Bot-Token bleibt auf dem Server; der Browser bekommt ihn nie zu sehen.
--
-- Schreiben laeuft ausschliesslich ueber die zwei Funktionen unten. Eine
-- UPDATE-Regel auf setter_leads haette jedem Admin auch deposit_usd oder
-- vip_granted_at freigegeben.

alter table public.setter_leads
  add column if not exists bot_paused    boolean not null default false,
  add column if not exists bot_paused_at timestamptz,
  add column if not exists bot_paused_by uuid;

alter table public.setter_messages drop constraint if exists setter_messages_role_check;
alter table public.setter_messages add constraint setter_messages_role_check
  check (role = any (array['user', 'assistant', 'admin']));

create table if not exists public.setter_outbox (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.setter_leads(id) on delete cascade,
  text                text not null check (char_length(text) between 1 and 4000),
  created_by          uuid,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz,
  telegram_message_id bigint,
  error               text
);
create index if not exists setter_outbox_offen_idx
  on public.setter_outbox (created_at) where sent_at is null and error is null;

alter table public.setter_outbox enable row level security;
drop policy if exists setter_outbox_admin_read on public.setter_outbox;
create policy setter_outbox_admin_read on public.setter_outbox
  for select using (is_platform_admin());

create or replace function public.setter_admin_send(p_lead_id uuid, p_text text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_platform_admin() then raise exception 'nur fuer Admins'; end if;
  if p_text is null or char_length(btrim(p_text)) = 0 then raise exception 'leere Nachricht'; end if;
  if char_length(p_text) > 4000 then raise exception 'zu lang (max. 4000 Zeichen)'; end if;
  if not exists (select 1 from setter_leads where id = p_lead_id) then raise exception 'Lead unbekannt'; end if;

  insert into setter_outbox (lead_id, text, created_by)
  values (p_lead_id, p_text, auth.uid()) returning id into v_id;

  -- Wer selbst schreibt, uebernimmt. Sonst antwortet der Bot auf die naechste
  -- Nachricht des Leads, als waere nichts gewesen — mitten in Diegos Gespraech.
  update setter_leads set bot_paused = true, bot_paused_at = now(), bot_paused_by = auth.uid()
   where id = p_lead_id and not bot_paused;
  return v_id;
end $$;

create or replace function public.setter_admin_set_paused(p_lead_id uuid, p_paused boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'nur fuer Admins'; end if;
  update setter_leads
     set bot_paused    = p_paused,
         bot_paused_at = case when p_paused then now() else null end,
         bot_paused_by = case when p_paused then auth.uid() else null end
   where id = p_lead_id;
end $$;

revoke all on function public.setter_admin_send(uuid, text) from public, anon;
grant execute on function public.setter_admin_send(uuid, text) to authenticated;
revoke all on function public.setter_admin_set_paused(uuid, boolean) from public, anon;
grant execute on function public.setter_admin_set_paused(uuid, boolean) to authenticated;

-- Die Uebersicht bekommt den Schalterstand. Gleiche Definition wie bisher,
-- nur bot_paused hinten angehaengt (CREATE OR REPLACE erlaubt nur das).
create or replace view public.setter_lead_overview with (security_invoker = true) as
 select l.id, l.telegram_user_id, l.telegram_username, l.first_name, l.source, l.status,
        l.step, l.experience, l.broker_email, l.deposit_usd, l.vip_granted_at,
        l.created_at, l.updated_at,
        (select count(*) from setter_messages m where m.lead_id = l.id) as message_count,
        (select count(*) from setter_messages m where m.lead_id = l.id and m.role = 'user') as reply_count,
        (select max(m.created_at) from setter_messages m where m.lead_id = l.id) as last_message_at,
        l.bot_paused
   from setter_leads l;

-- Schreibrechte auf die View gab es nie mit Absicht (sie waren Standard-Grants).
-- Durch security_invoker haette RLS sie ohnehin abgefangen; hier sind sie weg,
-- damit das nicht an einer einzigen Option haengt.
revoke insert, update, delete, truncate on public.setter_lead_overview from anon, authenticated;
