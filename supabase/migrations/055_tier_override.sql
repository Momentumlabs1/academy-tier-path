-- Vom Admin vergebener Vollzugang, unabhaengig von der Einzahlung.
--
-- WARUM NICHT EINFACH EINE EINZAHLUNG EINTRAGEN
-- apply_broker_rollup rechnet fuer jedes Mitglied mit Broker-Treffer
--     v_delta = broker_summe - kassenbuch_summe
-- und bucht die Differenz — auch NEGATIV, als 'withdrawal'. Ein von Hand
-- eingetragener Beleg ueber 50.000 waere beim naechsten Abgleich also wieder
-- abgezogen worden, weil beim Broker 0 steht. Genau das ist der Grund, warum
-- diegoguti.bzn tier='elite' trug, aber deposit=0 hatte und in der App
-- trotzdem nichts sah: die Oberflaeche leitet die Stufe aus der EINZAHLUNG ab
-- (tierForDeposit), nicht aus dem tier-Feld.
--
-- Eine erfundene Einzahlung waere ausserdem eine Luege im Kassenbuch — und
-- das Kassenbuch ist die einzige Wahrheit darueber, wer was bezahlt hat.
-- Deshalb ein eigenes, ehrliches Feld: "dieser Zugang wurde geschenkt".
-- Keine Verrechnung fasst es an, es faelscht keine Zahl, und in der
-- Partner-Abrechnung taucht es nirgends als Umsatz auf.
alter table public.members
  add column if not exists tier_override public.tier_key;

comment on column public.members.tier_override is
  'Vom Admin vergebener Zugang ohne Einzahlung (Team, Tests, Partner-Demo). Ist er '
  'gesetzt, gilt DIESE Stufe, egal was deposit sagt. Wird NUR von Hand gesetzt — '
  'kein Trigger, keine Verrechnung schreibt hier. Zaehlt nirgends als Umsatz.';

-- Diego: Vollzugang auf alle Stufen.
update public.members
   set tier_override = 'elite'
 where lower(email) = 'diegoguti.bzn@gmail.com';
