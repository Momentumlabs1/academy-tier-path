-- Nachuebersetzung (22.10.2026, Diego: "kannst du dich nicht verbinden und ...
-- uebersetzen? ... Dann brauche ich ja jetzt kein Geld hochladen").
--
-- Faellt die Uebersetzung im telegram-webhook aus (Anthropic-Guthaben leer,
-- Zeitueberschreitung, Zahlenpruefung), geht der Post wie bisher SOFORT im
-- Original raus — ein Signal, das nicht ankommt, kostet mehr als eines auf
-- Deutsch. Zusaetzlich landet die Kopie hier. Der Mac-Dienst
-- at.momentumlabs.cosmo-nachuebersetzer holt offene Auftraege, uebersetzt mit
-- Gemini (Vertex, Google-Guthaben) und editiert die Kopie im Kanal.
--
-- Eine Zeile je Kopie (chat_id, message_id). Eine spaetere Bearbeitung der
-- Quelle ueberschreibt die Zeile und setzt sie wieder auf offen.
create table if not exists public.translation_jobs (
  id bigserial primary key,
  chat_id bigint not null,
  message_id bigint not null,
  kind text not null check (kind in ('text', 'caption')),
  source text not null,
  -- Wird unveraendert unter die Uebersetzung gesetzt (Broker-Fusszeile).
  suffix text,
  tenant_key text,
  -- Info-Posts: auch die Website-Kopie in info_posts nachziehen.
  info_chat_id bigint,
  info_message_id bigint,
  status text not null default 'offen' check (status in ('offen', 'fertig', 'fehler')),
  attempts int not null default 0,
  last_error text,
  result text,
  alerted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chat_id, message_id)
);

create index if not exists translation_jobs_offen
  on public.translation_jobs (created_at) where status = 'offen';

alter table public.translation_jobs enable row level security;
revoke all on public.translation_jobs from anon, authenticated;
