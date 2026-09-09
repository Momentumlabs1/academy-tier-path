-- Loeschungen aus der Quellgruppe nachvollziehbar machen.
--
-- Telegram meldet einem Bot Bearbeitungen, aber NIE Loeschungen. Nur der
-- MTProto-Leser sieht sie. Damit eine Loeschung nicht zweimal ausgefuehrt wird
-- (und damit spaeter nachweisbar ist, WANN eine Zeile beim Kunden verschwand),
-- bekommt jede Relais-Zeile einen Zeitstempel.
--
-- Der Index sitzt allein auf source_message_id, weil die Loeschmeldung genau
-- diese Nummer traegt — ohne ihn liest jede Loeschung die ganze Tabelle.
alter table public.signal_relays
  add column if not exists deleted_at timestamptz;

create index if not exists signal_relays_source_msg_idx
  on public.signal_relays (source_message_id);
