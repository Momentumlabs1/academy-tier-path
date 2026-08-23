-- Die oeffentlichen Views duerfen GELESEN werden, nicht beschrieben.
--
-- Gefunden bei der Gesamtpruefung 23.08.2026: `signal_teasers` ist eine
-- automatisch beschreibbare View (die Basisspalten id/created_at gehen direkt
-- auf signal_relays durch) UND sie ist SECURITY DEFINER — die Rechte des
-- Erstellers gelten, nicht die des Aufrufers, also greift die RLS von
-- signal_relays NICHT. `anon` hatte darauf INSERT/UPDATE/DELETE/TRUNCATE.
--
-- Nachgewiesen in einer zurueckgerollten Transaktion: ein einzelnes
-- `delete from signal_teasers` als anon traf alle 172 Signalzeilen. Jeder mit
-- dem oeffentlichen Schluessel — der im Browser jeder Besucherin steht —
-- haette die gesamte Signalhistorie loeschen oder gefaelschte Signale
-- einschleusen koennen.
--
-- DEFINER bleibt: genau dadurch sieht ein nicht angemeldeter Besucher die
-- geschwaerzten Teaser, waehrend signal_relays selbst zu bleibt. Falsch waren
-- nur die Schreibrechte. Lesen ja, schreiben nie.
revoke insert, update, delete, truncate on public.signal_teasers from anon, authenticated;
revoke insert, update, delete, truncate on public.desk_weekly     from anon, authenticated;

-- affiliate_dashboard ist security_invoker, die RLS greift dort also. Trotzdem
-- gilt dasselbe Prinzip: eine Auswertungs-View ist zum Lesen da.
revoke insert, update, delete, truncate on public.affiliate_dashboard from anon, authenticated;

grant select on public.signal_teasers      to anon, authenticated;
grant select on public.desk_weekly         to anon, authenticated;
grant select on public.affiliate_dashboard to authenticated;
