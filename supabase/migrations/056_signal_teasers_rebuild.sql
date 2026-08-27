-- signal_teasers: trennt Rufe von Nachtraegen und haengt den Ausgang an.
--
-- WAS VORHER SCHIEFLIEF
-- Die View behandelte JEDE Zeile aus signal_relays als Signal. Der Desk
-- schickt aber zweierlei: den eigentlichen Ruf ("GOLD BUY, Entry …, SL …,
-- TP1-TP5") und danach kurze Nachtraege dazu ("TP1 ok", "SL Hit", "BE
-- ziehen"). Aus jedem Nachtrag wurde eine eigene Karte, und weil dort kein
-- Instrument steht, griff der Rueckfall: drei Karten mit dem Titel "MARKET"
-- und leeren Zeilen. Auf der Seite las sich das als kaputt.
--
-- Ausserdem war die Instrumenten-Erkennung zu eng ([A-Z]{2,6} direkt vor
-- BUY|SELL): "buy stop gold 4599.10" hat die Richtung VORNE und ist klein
-- geschrieben, wurde also gar nicht erkannt.
--
-- WAS SICH DARAUS GEWINNEN LAESST
-- Die Nachtraege sind das Wertvollste, was hier oeffentlich gezeigt werden
-- kann: sie sagen, wie ein Ruf AUSGEGANGEN ist. Statt sie wegzuwerfen, haengen
-- sie jetzt an dem Ruf, auf den sie folgen. Damit zeigt die Seite gemessene
-- Ergebnisse statt einer Behauptung — ohne eine einzige erfundene Zahl.
--
-- GESCHWAERZT BLEIBT GESCHWAERZT
-- Kurse, Entry, Stop und Ziele stehen hier NICHT drin und duerfen nie hier
-- hinein. Die View sagt nur, DASS es sie gibt und wie viele Ziele der Ruf
-- hatte. Wer die Zahlen will, geht in den Kanal.
drop view if exists public.signal_teasers;

create view public.signal_teasers
with (security_invoker = false) as
with roh as (
  select r.id, r.created_at, upper(coalesce(r.preview, '')) as t
  from signal_relays r
),
klassifiziert as (
  select
    id, created_at, t,
    (t ~ '\m(BUY|SELL|LONG|SHORT)\M' and t ~ '\m(ENTRY|SL|STOP)\M') as ist_ruf,
    case
      when t ~ 'SL\s*HIT'       then 'sl'
      when t ~ '\mBE\M'         then 'be'
      when t ~ '\mTP\s*([0-9])' then 'tp'
      else null
    end as nachtrag_art,
    nullif(substring(t from '\mTP\s*([0-9])'), '') as nachtrag_ziel
  from roh
),
mit_instrument as (
  select
    k.*,
    coalesce(
      substring(k.t from '\m(XAUUSD|GOLD|NAS[0-9]*|US30|SPX[0-9]*|GER[0-9]*|DAX|BTC[A-Z]*|ETH[A-Z]*|EURUSD|GBPUSD|USDJPY|OIL|SILVER|XAGUSD)\M'),
      substring(k.t from '\m([A-Z]{3,7}[0-9]{0,4})\s+(?:BUY|SELL|LONG|SHORT)\M'),
      substring(k.t from '\m(?:BUY|SELL|LONG|SHORT)\s+(?:STOP\s+|LIMIT\s+)?([A-Z]{3,7}[0-9]{0,4})\M')
    ) as asset
  from klassifiziert k
),
zugeordnet as (
  select
    m.*,
    -- Jeder Nachtrag gehoert zum letzten Ruf davor. uuid kennt kein max(),
    -- deshalb ueber den Zeitstempel des jeweils letzten Rufs zuordnen.
    max(case when m.ist_ruf then m.created_at end)
      over (order by m.created_at rows between unbounded preceding and current row) as ruf_zeit
  from mit_instrument m
),
ausgang as (
  select
    ruf_zeit,
    bool_or(nachtrag_art = 'sl')          as gestoppt,
    bool_or(nachtrag_art = 'be')          as auf_einstand,
    max(coalesce(nachtrag_ziel::int, 0))  as hoechstes_ziel
  from zugeordnet
  where not ist_ruf and nachtrag_art is not null and ruf_zeit is not null
  group by ruf_zeit
)
select
  z.id,
  z.created_at,
  coalesce(z.asset, 'MARKET')                                   as asset,
  coalesce(substring(z.t from '\m(BUY|SELL|LONG|SHORT)\M'), '') as side,
  (select count(*) from regexp_matches(z.t, 'TP\s*[0-9]', 'g')) as targets,
  (z.t ~ '\mENTRY\M')                                           as has_entry,
  (z.t ~ '\m(SL|STOP)\M')                                       as has_stop,
  coalesce(a.hoechstes_ziel, 0)                                 as targets_hit,
  coalesce(a.gestoppt, false)                                   as stopped_out,
  coalesce(a.auf_einstand, false)                               as moved_to_be
from zugeordnet z
left join ausgang a on a.ruf_zeit = z.created_at
where z.ist_ruf
order by z.created_at desc;

revoke insert, update, delete, truncate on public.signal_teasers from anon, authenticated;
grant select on public.signal_teasers to anon, authenticated;
