-- Wenn der Admin von Hand freischaltet, muss der Beleg auch geschrieben werden.
--
-- GEFUNDEN 23.08.2026. Auf deposit_events und audit_log gab es ausschliesslich
-- SELECT-Regeln — kein INSERT. Das manuelle Freischalten im Admin schrieb also
-- ins Leere: die RLS wies die Zeile ab, der Code verwarf den Fehler, und die
-- Oberflaeche meldete Erfolg.
--
-- Die Stufe stieg trotzdem kurz an, weil sie direkt auf members gesetzt wurde.
-- Beim naechsten apply_broker_rollup wurde sie aber aus den Belegen neu
-- berechnet — und da kein Beleg existierte, fiel das Mitglied zurueck. Aus Sicht
-- des Admins: "ich hab das doch freigeschaltet, warum ist es wieder weg."
--
-- Ein Beleg ist die einzige Wahrheit ueber eine Einzahlung. Wer freischalten
-- darf, muss ihn schreiben duerfen.
create policy admin_writes_deposits on public.deposit_events
  for insert to authenticated
  with check (public.is_platform_admin());

create policy admin_writes_audit on public.audit_log
  for insert to authenticated
  with check (public.is_platform_admin());
