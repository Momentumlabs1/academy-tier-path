-- Eine Sperre durch den Admin muss den naechsten Abgleich ueberleben.
--
-- GEFUNDEN 24.08.2026 beim Durchlaufen des echten Ablaufs.
--
-- members.active ist KEIN Bann-Schalter, sondern ein abgeleiteter Wert:
-- recalculate_tier_after_deposit setzt bei jedem Einzahlungs-Beleg
--     active = (v_deposit > 0)
-- Der Admin-Schalter "Zugang sperren" schrieb aber genau in dieses Feld. Beim
-- naechsten hero-sync/vt-ingest — also spaetestens am naechsten Tag — wurde
-- die Sperre stillschweigend wieder aufgehoben, weil die Einzahlung ja weiter
-- besteht. Der Gesperrte war zurueck, ohne dass irgendwo etwas stand.
--
-- Dass es bisher nicht auffiel, liegt daran, dass die Sperre in der Web-App
-- ohnehin nichts bewirkt hat (kein Gate las das Feld). Beides gehoert
-- zusammen: erst ein Feld, das haelt, dann ein Gate, das es liest.
--
-- Deshalb ein EIGENES Feld, das nur ein Mensch setzt und keine Rechnung
-- ueberschreibt. `active` bleibt, was es ist: "hat eingezahlt".
alter table public.members
  add column if not exists access_revoked boolean not null default false;

comment on column public.members.access_revoked is
  'Vom Admin entzogener Zugang. Wird NUR von Hand gesetzt — keine Verrechnung und '
  'kein Trigger darf hier schreiben, sonst hebt der naechste Abgleich die Sperre auf. '
  'members.active heisst dagegen "hat eingezahlt" und wird berechnet.';

-- Wer bereits von Hand gesperrt wurde, soll gesperrt bleiben: active=false
-- trotz Einzahlung kann nur von Hand gekommen sein.
update public.members
   set access_revoked = true
 where not active and coalesce(deposit, 0) > 0;
