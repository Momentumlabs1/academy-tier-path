#!/usr/bin/env python3
"""Trade-Karten aus echten Desk-Signalen — fuer den Cosmos-Info-Kanal.

WARUM ES DAS GIBT
Tims Desk postet abfotografierte MT5-Fenster. Die beweisen etwas, sehen aber aus
wie ein Handy-Foto von einem fremden Programm. Der Kanal soll wirken, als pflege
Cosmo ihn selbst — also dieselbe Aussage, in unserer Handschrift, automatisch.

WAS HIER BEWUSST NICHT PASSIERT
Es wird KEIN Kursverlauf gezeichnet. Wir kennen aus dem Signal genau drei
Zahlen — Einstieg, Stop, Ziel — und sonst nichts. Eine Kerzen-Grafik dazu
waere erfunden, und ein erfundener Chart neben echten Zahlen macht die echten
Zahlen wertlos. Die Karte zeigt deshalb die Preisleiter: die drei Zahlen, die
wirklich gesagt wurden, im Abstand, in dem sie wirklich liegen.

Ebensowenig werden Kunden-Screenshots nachgebaut. Ein Bild, das so tut, als sei
es der Kontoauszug eines Menschen, ist ein gefaelschter Beleg — unabhaengig
davon, wie gut es aussieht.

QUELLE ist immer signal_relays, also das, was der Desk tatsaechlich geschickt
hat. Kommt dort nichts an, entsteht keine Karte.
"""
import json, os, re, sys, urllib.request, datetime
from PIL import Image, ImageDraw, ImageFont

BASE = "/opt/cc-infoqueue"
MEDIA = f"{BASE}/media"
STATE = f"{BASE}/trade_cards_done.json"
FONT = f"{BASE}/fonts/Unbounded.ttf"
ENV = "/opt/cosmos-setter/.env"

GRUND   = (5, 7, 14)
AZUR    = (56, 173, 255)
GRUEN   = (74, 222, 128)
ROT     = (248, 113, 113)
WEISS   = (255, 255, 255)
GRAU    = (255, 255, 255, 110)

# Zwei tiefe Gruende — sie tragen ab 09.09. das Ergebnis.
#
# Ansage Diego: "die signal karten muessen so bleiben, gewonnene trades karten
# sind ganz gruen oder so, muessen sich viel mehr unterscheiden." Vorher hatten
# Live-Karte und Ergebniskarte denselben fast schwarzen Grund und dieselbe
# Preisleiter; im Kanal-Feed war auf Daumennagelgroesse nicht zu sehen, ob ein
# Trade LAEUFT oder GEWONNEN ist. Jetzt entscheidet die Flaeche: blau = laeuft,
# gruen = im Plus, rot = ausgestoppt.
#
# Bewusst tief und nicht neon. Ein grellgruener Kasten ist das Erkennungszeichen
# der Signalgruppen, von denen wir uns unterscheiden wollen.
GRUEN_GRUND = (6, 37, 26)
ROT_GRUND   = (42, 11, 14)


def env():
    e = {}
    for l in open(ENV):
        l = l.strip()
        if "=" in l and not l.startswith("#"):
            k, v = l.split("=", 1)
            e[k] = v.strip().strip('"')
    return e


def rest(e, pfad):
    sk = e.get("SUPABASE_SERVICE_ROLE_KEY") or e.get("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(f"{e['SUPABASE_URL']}/rest/v1/{pfad}",
                                 headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    return json.load(urllib.request.urlopen(req, timeout=25))


# ── Die Sprache des Desks lesen ────────────────────────────────────────────
#
# WAS eine Nachricht ist, entscheidet desk_filter — an genau einer Stelle,
# damit Teaser-Cron und Kartenbau nie unterschiedlicher Meinung sind. Hier
# steht nur noch, WIE die Zahlen aus einem Signal geholt werden.
sys.path.insert(0, BASE)
import desk_filter as df
import queue_lock as ql

# NAS, NASDAQ, NDX, USTEC stehen ausdruecklich drin: am 20.08. schrieb der Desk
# "🟢 NAS BUY". Das Wort fehlte hier, der Trade entstand nie, und seine beiden
# "SL Hit"-Meldungen landeten als rote Streifen auf zwei Gold-Trades, die in
# Wahrheit im Gewinn standen (Code-Review 13.09.).
RE_KOPF = re.compile(
    r"\b(?P<paar>XAUUSD|XAU|GOLD|BTCUSD|BTC|NAS100|NASDAQ|NAS|NDX|USTEC|US100|US30|[A-Z]{6})\b"
    r"[^\n]{0,8}?\b(?P<richtung>BUY|SELL)\b", re.I)
RE_ENTRY = re.compile(r"entry\s*:?\s*(?P<v>[\d\s.,]+)", re.I)
RE_SL = re.compile(r"^\s*SL\s*:?\s*(?P<v>[\d\s.,]+)", re.I | re.M)
# "TP4 : offen" faellt hier durch — der Nachsatz muss mit einer Ziffer anfangen.
RE_TPS = re.compile(r"TP\s*(\d)\s*:?\s*(\d[\d\s.,]*)", re.I)


def norm_paar(p):
    p = p.upper()
    if p in ("GOLD", "XAU", "XAUUSD"):
        return "XAUUSD"
    if p.startswith("BTC"):
        return "BTCUSD"
    if p in ("NAS", "NASDAQ", "NAS100", "NDX", "USTEC", "US100"):
        return "NAS100"
    return p


# Welches Instrument eine Treffer- oder Stop-Meldung selbst nennt ("Nochmal SL
# Hit bei NAS"). Nennt sie eins, kommen nur Trades dieses Instruments in Frage.
RE_PAAR_NENNUNG = re.compile(
    r"\b(XAUUSD|XAU|GOLD|BTCUSD|BTC|BITCOIN|NAS100|NASDAQ|NAS|NDX|USTEC|US100)\b", re.I)


def genanntes_paar(text, anker):
    """Das Instrument, das der Meldung am naechsten zum Ereigniswort steht.

    "Nochmal SL Hit bei NAS, ... der letzte Gold Trade ist aber im TP3" nennt
    zwei — gemeint ist das, was beim "SL Hit" steht. `anker` ist die Position
    des Ereigniswortes im Text (oder None).
    """
    treffer = [(m.start(), m.group(1)) for m in RE_PAAR_NENNUNG.finditer(text or "")]
    if not treffer:
        return None
    if anker is None or len(treffer) == 1:
        return norm_paar("BTC" if treffer[0][1].upper() == "BITCOIN" else treffer[0][1])
    pos, name = min(treffer, key=lambda x: abs(x[0] - anker))
    return norm_paar("BTC" if name.upper() == "BITCOIN" else name)


# "SL HIT, aber der Short ist noch am laufen" — der genannte Trade ist es NICHT.
RE_LAEUFT_NOCH = re.compile(r"\b(?:der|die|das|unser)\s+(short|long)\b[^\n]{0,20}?"
                            r"\b(?:noch|weiter)\b[^\n]{0,10}?\b(?:am\s+laufen|l(?:ae|ä)uft|offen|drin)\b", re.I)


def pip_wert(paar):
    paar = paar.upper()
    if "XAU" in paar or "GOLD" in paar:
        return 0.10      # Gold: 1 Punkt = 10 Pips, so rechnet der Desk
    if "JPY" in paar:
        return 0.01
    if "BTC" in paar or "NAS" in paar or "US1" in paar or "US3" in paar:
        return 1.0       # in Punkten, nicht in Pips
    return 0.0001


def zahl(s):
    """Eine Preisangabe des Desks als Zahl.

    "Entry : 4 392.00-4 397.00" ist eine Spanne — wir nehmen den Anfang. Vorher
    warf das eine ValueError, der ganze Trade fiel weg, und im Kanal fehlte er
    lautlos.
    """
    s = str(s).split("-")[0]
    return float(s.replace(" ", "").replace("\u202f", "").replace("\u00a0", "").replace(",", "."))


RE_SPANNE = re.compile(r"entry\s*:?\s*(?P<a>\d[\d \u202f\u00a0.,]*?)\s*[-\u2013]\s*(?P<b>\d[\d \u202f\u00a0.,]*)", re.I)


def einstieg_spanne(text, entry):
    """Der Einstieg als (von, bis) \u2014 bei "Entry : 4 339.00-4 347.00" beide
    Enden, sonst zweimal derselbe Preis."""
    m = RE_SPANNE.search(text or "")
    if m:
        try:
            a, b = zahl(m.group("a")), zahl(m.group("b"))
            return min(a, b), max(a, b)
        except ValueError:
            pass
    return entry, entry


def _zeit(iso):
    """Zeitstempel aus Postgres, auch mit krummen Sekundenbruchteilen.

    Python 3.9 nimmt bei fromisoformat NUR drei oder sechs Nachkommastellen.
    Postgres liefert, was anfaellt. Genau daran ist der Teaser-Cron am 07.09.
    STILL gestorben — es fehlten Teaser, ohne dass irgendwo etwas stand.
    """
    t = (iso or "").replace("Z", "+00:00")
    m = re.search(r"\.(\d+)", t)
    if m:
        t = t.replace("." + m.group(1), "." + (m.group(1) + "000000")[:6])
    return datetime.datetime.fromisoformat(t)


LESE_STUNDEN = 72   # so weit zurueck wird der Desk-Strom gelesen ...
FRIST_STUNDEN = 20  # ... aber nur Trades, die juenger sind, bekommen noch eine Karte


def lade_verlauf(e, stunden=LESE_STUNDEN):
    """Der Desk-Strom der letzten `stunden`, aelteste Nachricht zuerst.

    Absteigend geholt und dann umgedreht: bei aufsteigender Sortierung mit
    Limit fallen bei zu vielen Zeilen die NEUESTEN weg — also genau die
    Signale, fuer die gerade eine Karte faellig waere.
    """
    import urllib.parse
    seit = urllib.parse.quote((datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(hours=stunden)).isoformat())
    rows = rest(e, f"signal_relays?select=id,preview,created_at"
                   f"&created_at=gte.{seit}&order=created_at.desc&limit=1000")
    if len(rows) >= 1000:
        print(f"WARNUNG: 1000 Desk-Nachrichten in {stunden} h — der Anfang fehlt")
    return rows[::-1]


def letzte_stufe(t):
    """Das hoechste Ziel, das im Signal ueberhaupt genannt war."""
    return max(t["tps"]) if t["tps"] else 1


NACH_MINUTEN = 15      # so frisch darf eine Kursmessung sein, ohne gegen einen Trade zu sprechen
SPERR_ABSTAND_PIPS = 30  # erst so weit jenseits des Stops gilt ein Stop als nachweislich gefallen


def _ziel_laengst_ueberschritten(t, stufe, beob, jetzt):
    """Lag der Kurs schon lange VOR dieser Meldung jenseits dieses Ziels?

    Dann haette der Desk den Treffer damals gemeldet — oder der Trade war da
    schon zu. Eine Meldung, die jetzt kommt, gehoert dann eher einem anderen.
    Am 11.09.: der Long von 12:19 hatte TP1 bei 4350, um 14:30 stieg der Desk
    bei 4376 short ein. Das "TP1✅" um 15:08 kann nicht das Ziel des Longs sein
    — das war seit mindestens 38 Minuten durch, ohne Meldung.
    """
    ziel = t["tps"].get(stufe)
    if ziel is None:
        return False
    for zeit, paar, lo, hi in beob:
        if paar != t["paar"] or zeit <= _zeit(t["zeit"]):
            continue
        if (jetzt - zeit).total_seconds() < NACH_MINUTEN * 60:
            continue
        if (t["richtung"] == "BUY" and hi >= ziel) or (t["richtung"] == "SELL" and lo <= ziel):
            return True
    return False


def _waehle_trade(offen, stufe, pips, beob, jetzt, gesperrte=()):
    """Zu welchem laufenden Trade gehoert diese Treffermeldung?

    Der Desk haelt mehrere Positionen gleichzeitig und schreibt nur "TP2 ✅".
    Am 09.09. lief um 09:59 noch der Short von 08:53 (der gerade TP1 hatte)
    UND der Long von 09:57, zwei Minuten alt. Wer den Treffer stur dem juengsten
    Trade zuordnet, schreibt dem Long ein Ziel gut, das er in zwei Minuten nie
    erreicht haben kann.

    Deshalb drei Wege, in dieser Reihenfolge:
      1. Nennt der Desk eine Pip-Zahl, ist das eine MESSUNG: Einstieg und Ziel
         stehen im Signal, der Abstand ist nachrechenbar. Passt die Zahl zu
         genau einem laufenden Trade, ist die Frage beantwortet — passt sie zu
         KEINEM, ist die Meldung nicht unsere (oder eine Wiederholung), und es
         entsteht nichts. Das ist der wichtige Teil: eine genannte Zahl, die
         nirgends aufgeht, war am 09.09. der Weg, auf dem ein fremder Treffer
         einem unbeteiligten Trade gutgeschrieben wurde.
      2. Ohne Pip-Zahl die Reihenfolge — Ziele fallen von unten nach oben.
         Gemeint ist der Trade, dessen hoechster Treffer eine Stufe darunter
         liegt. Passen mehrere in DERSELBEN Richtung, der juengste: der Desk
         meldet ein Ziel fuer die Position, die er gerade fuehrt (18.08. und
         04.09. von zwei unabhaengigen Pruefern so bestaetigt).
      3. Stehen Long und Short gleichzeitig zur Wahl, entscheidet der Kurs:
         wessen Ziel laengst ueberschritten war, der ist es nicht. Bleiben
         danach beide Richtungen uebrig, bekommt KEINER den Treffer. Ein
         fehlender Streifen kostet einen Post, ein falscher die Glaubwuerdigkeit.
    """
    frei = [t for t in offen if stufe not in t["hits"]]
    if not frei:
        return None

    # Ein Ziel OHNE Preis ("TP3 : offen") ist der Runner — der Rest der
    # Position laeuft ohne festes Ziel weiter. Eine Pip-Zahl laesst sich dann
    # an nichts nachrechnen. Am 10.09. fiel genau so "TP3 hit, 700 PIPS"
    # durch, der groesste Treffer des Tages. Gemeint ist in dem Fall der Trade,
    # der am weitesten ist: nur einer, der schon TP1/TP2 hinter sich hat, kann
    # als Naechstes seinen Runner auszahlen.
    mit_preis = [t for t in frei if t["tps"].get(stufe) is not None]
    if not mit_preis:
        weiteste = max(t["max_tp"] for t in frei)
        return next(t for t in frei if t["max_tp"] == weiteste)

    if pips:
        # Den GENAUESTEN nehmen, nicht den erstbesten innerhalb der Toleranz.
        # Am 10.09. passte "TP1 geknackt, 130" zu zwei Trades — einer mit 140
        # Pips bis TP1, einer mit genau 130. Der erstbeste war der falsche.
        beste, abstand = None, 1.0
        for t in mit_preis:
            eigene = abs(t["entry"] - t["tps"][stufe]) / pip_wert(t["paar"])
            d = abs(eigene - pips) / eigene if eigene else 1.0
            if d <= 0.15 and d < abstand:
                beste, abstand = t, d
        return beste

    kandidaten = [t for t in frei if t["max_tp"] == stufe - 1]
    if not kandidaten:
        # Hoechstens EINE Stufe darf ungemeldet fehlen ("direkt TP2"). Frueher
        # durfte jede fehlen — so bekam am Ende ein Trade ohne jeden Treffer
        # ein TP3 gutgeschrieben, weil das TP2 davor als Duplikat verworfen war.
        kandidaten = [t for t in frei if stufe - 2 <= t["max_tp"] < stufe - 1]
    if not kandidaten:
        return None
    # Laufen mehrere Instrumente, gilt die Meldung dem, das der Desk zuletzt
    # eroeffnet hat (25.08.: "TP2✅" eine Minute nach dem TP1 des Gold-Longs,
    # waehrend zwei NAS-Shorts von frueh morgens noch offen standen).
    kandidaten = [t for t in kandidaten if t["paar"] == kandidaten[-1]["paar"]]
    if len({t["richtung"] for t in kandidaten}) > 1:
        kandidaten = [t for t in kandidaten
                      if not _ziel_laengst_ueberschritten(t, stufe, beob, jetzt)]
        if len({t["richtung"] for t in kandidaten}) != 1:
            return None
    # Ein gesperrter Trade bekommt nie einen Treffer — aber seine Sperre kann
    # auf einem veralteten Signalpreis beruhen. Haette er dieses Ziel genauso
    # gut liefern koennen und steht er in der Gegenrichtung, ist es ein
    # Gleichstand, und dann gilt dieselbe Enthaltung (Review 13.09.).
    w = kandidaten[-1]
    if any(g["paar"] == w["paar"] and g["richtung"] != w["richtung"] and stufe not in g["hits"]
           and stufe - 2 <= g["max_tp"] <= stufe - 1 for g in gesperrte):
        return None
    return w


def _lies_signal(text):
    """Die Zahlen einer Order: dict oder None.

    Ohne Instrument im Kopf ("🟢 BUY BUY", 20.08.) wird das Paar "?" — die
    Position existiert trotzdem und faengt ihre eigenen Meldungen auf, statt
    dass ihr Stop einem fremden Trade angehaengt wird. Eine Karte bekommt sie
    nie.
    """
    e_, s_ = RE_ENTRY.search(text), RE_SL.search(text)
    if not (e_ and s_):
        return None
    try:
        entry, sl = zahl(e_.group("v")), zahl(s_.group("v"))
    except ValueError:
        return None
    kopf = RE_KOPF.search(text)
    if kopf:
        richtung, paar = kopf.group("richtung").upper(), norm_paar(kopf.group("paar"))
    else:
        m = df.RE_RICHTUNG.search(text)
        if not m:
            return None
        richtung, paar = m.group(1).upper(), "?"
    tps = {}
    for nr, wert in RE_TPS.findall(text):
        try:
            tps[int(nr)] = zahl(wert)
        except ValueError:
            pass
    lo, hi = einstieg_spanne(text, entry)
    # Unmoegliche Zahlen: am 20.08. stand "Entry 4 384.59" (gemeint 4 484.59,
    # ein Tippfehler) — Stop 7 Punkte weg, Ziele 200 bis 300 Punkte weg. Daraus
    # rechnete die Karte "+2 140 Pips". Liegt ein Ziel mehr als 20-mal so weit
    # weg wie der Stop, stimmt das Signal nicht. Der Trade faengt seine
    # Meldungen trotzdem auf, bekommt aber keine Zahl und keine Karte.
    #
    # Derselbe Tippfehler kann auch den Stop 100 Punkte weit weg setzen. Tims
    # Stops liegen 0,1-0,4 % vom Einstieg; mehr als 2 % ist kein echter Stop.
    sl_abstand = abs(entry - sl)
    verdaechtig = (not sl_abstand or sl_abstand / entry > 0.02
                   or any(abs(entry - p) > 20 * sl_abstand for p in tps.values()))
    # Bei einer Spanne zaehlt das UNGUENSTIGE Ende: wer beim Long oben einsteigt,
    # hat weniger Gewinn und mehr Verlust. So rechnet der Streifen nie schoener,
    # als es fuer jeden Teilnehmer war.
    if lo != hi:
        entry = hi if richtung == "BUY" else lo
    return {"paar": paar, "richtung": richtung, "entry": entry, "sl": sl,
            "tps": tps, "lo": lo, "hi": hi, "verdaechtig": verdaechtig}


RE_AKTIV = re.compile(r"^\s*(?:aktiv|active|ausgel(?:ö|oe)st|getriggert|triggered)\b", re.I)
RE_STORNO = re.compile(r"\binvalid|\bl(?:ö|oe)schen\b|\bstorn|\bcancel", re.I)
# Ein Zug an den Einstand — nicht jede Erwaehnung von "BE" ("Gesamt heute: ⚪️ 1 BE").
RE_BE_ZIEHEN = re.compile(
    r"\b(?:BE|break\s*-?\s*even|breakeven|einstand)\b[^\n]{0,12}?\b(?:ziehen|nachziehen|setzen|gezogen)\b"
    r"|\b(?:SL|stop)\s+(?:auf|bei)\s+(?:BE|break\s*-?\s*even|breakeven|einstand|entry)\b", re.I)


def _neuer_trade(r, s):
    return {"id": r["id"], "ids": [r["id"]], "paar": s["paar"], "richtung": s["richtung"],
            "entry": s["entry"], "sl": s["sl"], "tps": dict(s["tps"]),
            "lo": s["lo"], "hi": s["hi"],
            "zeit": r["created_at"], "letzte": r["created_at"],
            "hits": {}, "max_tp": 0, "zu": None, "verdaechtig": s.get("verdaechtig", False)}


def baue_trades(rows):
    """Aus dem Desk-Strom die einzelnen Trades rekonstruieren.

    Ein Trade entsteht mit dem Signal und endet mit einem Stop, einem Ausstieg
    auf Einstand oder dem letzten genannten Ziel. Alles dazwischen — "BE
    ziehen", "Teilprofite", "100 Pips im Profit" — ist Fuehrung der VIP-Gruppe
    und erzeugt selbst nichts.
    """
    trades = []
    zuletzt = {}          # Wiedererkennung einer Meldung -> Zeitpunkt
    beob = []             # Kursmessungen: (zeit, paar, von, bis) aus jedem Signal
    pending = None        # letzte Stop-/Limit-Order, die noch nicht ausgeloest ist

    for r in rows:
        text = r.get("preview") or ""
        art = df.klassifiziere(text)
        jetzt = _zeit(r["created_at"])

        if art == "pending":
            s = _lies_signal(text)
            pending = (r, s) if s else None
            continue
        if pending and art in ("rauschen", "anweisung", "laufend") and RE_AKTIV.search(text):
            # Eine Stop-Order ist ausgeloest: ab jetzt eine echte Position. Am
            # 11.09. lief so ein Short ab 08:28, und alles, was der Desk zu ihm
            # schrieb, suchte sich einen fremden Trade. Eine Karte bekommt er
            # nicht (keine Live-Karte), aber er faengt seine Meldungen auf.
            pr, ps = pending
            if (jetzt - _zeit(pr["created_at"])).total_seconds() < 3 * 3600:
                trades.append(_neuer_trade(pr, ps))
            pending = None
            continue
        if pending and art in ("rauschen", "anweisung") and RE_STORNO.search(text):
            pending = None           # "Invalide löschen", "Limit Order stornieren"
            continue

        if art == "signal":
            s = _lies_signal(text)
            if not s:
                continue
            richtung, paar, entry, sl, lo, hi = (s["richtung"], s["paar"], s["entry"],
                                                 s["sl"], s["lo"], s["hi"])

            # Waechter: liegt der Stop auf der falschen Seite, ist die Richtung
            # falsch. Am 08.09. um 08:17 schickte der Desk "🟢 XAUUSD BUY,
            # Entry 4392, SL 4402, TP1 4382" — das sind Short-Zahlen, und eine
            # Minute spaeter kam dieselbe Order als SELL. Wer die erste
            # Fassung nimmt, zeigt Kunden eine Karte, die sich selbst
            # widerspricht.
            if (richtung == "BUY" and sl >= entry) or (richtung == "SELL" and sl <= entry):
                print(f"verworfen (Stop auf der falschen Seite): {text[:60]!r}")
                continue

            # Ein neues Signal ist auch eine KURSMESSUNG: der Desk steigt zum
            # aktuellen Preis ein. Liegt der deutlich jenseits des Stops eines
            # aelteren Trades desselben Paares, ist dieser Stop inzwischen
            # gefallen — ob der Desk es gemeldet hat oder nicht. Am 10.09. kam
            # um 13:39 ein Short bei 4370; der Short von 13:09 hatte seinen
            # Stop bei 4363. Er stand in der Rechnung weiter offen, und die
            # Tagesbilanz schrieb ihm spaeter ein Ziel gut.
            #
            # "Deutlich": der Einstieg eines formellen Signals ist nicht immer
            # der Kurs dieser Minute (11.09.: "Buy jetzt 4347" um 09:17, das
            # Signal mit 4347 erst um 09:53). Deshalb erst ab 30 Pips jenseits.
            #
            # Gesperrt heisst nur: kein Kandidat mehr fuer spaetere Meldungen.
            # Ein Ergebnis wird daraus NICHT gemacht — dafuer braucht es eine
            # Meldung des Desks. Veredeln ja, erfinden nein.
            # Ein Signal mit unmoeglichen Zahlen ist auch keine verlaessliche
            # Kursmessung (Review 13.09.).
            if paar != "?" and not s["verdaechtig"]:
                beob.append((jetzt, paar, lo, hi))
                abstand = SPERR_ABSTAND_PIPS * pip_wert(paar)
                for t in trades:
                    if t["zu"] or t.get("gesperrt") or t["paar"] != paar:
                        continue
                    if (t["richtung"] == "BUY" and hi < t["sl"] - abstand) or \
                            (t["richtung"] == "SELL" and lo > t["sl"] + abstand):
                        t["gesperrt"] = r["created_at"]

            # Dieselbe Order zweimal geschickt — erst nackt, Minuten spaeter mit
            # den Zielen, manchmal noch einmal als Spanne. Das ist EIN Trade.
            # Die Spanne zaehlt mit, in beiden Reihenfolgen: am 11.09. kam
            # "Entry 4347" um 09:53 und "Entry 4339-4347" um 09:55, gleicher
            # Stop, gleiche Ziele. Als zwei Trades gelesen, fing der
            # Phantom-Zwilling das "SL HIT" von 12:07 ab, der echte Trade blieb
            # offen und bekam Stunden spaeter das Ziel eines anderen.
            vor = trades[-1] if trades else None
            if (vor and not vor["zu"] and vor["paar"] == paar and vor["richtung"] == richtung
                    and lo - 1e-9 <= vor["hi"] and hi + 1e-9 >= vor["lo"]
                    and (jetzt - _zeit(vor["zeit"])).total_seconds() < 1800):
                vor["tps"].update(s["tps"])
                vor["sl"] = sl
                vor["ids"].append(r["id"])
                # Die Fassungen zusammen ergeben die Spanne; gerechnet wird vom
                # unguenstigen Ende. Und der Plausibilitaetswaechter gilt fuer
                # den zusammengefuehrten Stand — ein Tippfehler in der zweiten
                # Fassung darf nicht als Zahl auf den Streifen (Review 13.09.).
                vor["lo"], vor["hi"] = min(vor["lo"], lo), max(vor["hi"], hi)
                if vor["lo"] != vor["hi"]:
                    vor["entry"] = vor["hi"] if richtung == "BUY" else vor["lo"]
                ab = abs(vor["entry"] - vor["sl"])
                vor["verdaechtig"] = bool(vor.get("verdaechtig") or s["verdaechtig"] or not ab
                                          or ab / vor["entry"] > 0.02
                                          or any(abs(vor["entry"] - p) > 20 * ab for p in vor["tps"].values()))
                continue
            trades.append(_neuer_trade(r, s))
            continue

        if art == "fremdbilanz":
            # Tims Tagesbilanz schliesst, was der Desk nie einzeln abgeschlossen hat.
            #
            # Am 10.09. standen zwei Live-Karten ohne Streifen im Kanal: fuer
            # diese Trades schrieb der Desk nie "TP1 hit", nur "190 Pips im
            # Profit" fuer alles, was gerade lief. Die Bilanz um 18:19 sagte
            # dann "8 Signale / 1250 TP / 0 SL / 0 BE" — also ist JEDER Trade des
            # Tages mindestens bei TP1 raus. Genau so viel wird gutgeschrieben:
            # TP1, gerechnet aus dem Signal selbst. Nicht mehr.
            #
            # Nur bei 0 SL UND 0 BE. Sonst ist offen, WELCHER Trade den Stop
            # oder den Einstand hatte, und dann bleibt der Streifen lieber weg,
            # als dass er einem Trade das falsche Ergebnis anheftet.
            b = df.lies_bilanz(text)
            if b and b["art"] == "tag" and b["sl"] == 0 and (b["be"] or 0) == 0:
                tag = r["created_at"][:10]
                for t in trades:
                    # Gesperrt = sein Stop ist nachweislich gefallen — dem
                    # schreibt die Bilanz kein Ziel gut. "BE gezogen" dagegen
                    # schon: "0 BE" heisst, keiner ist auf Einstand raus.
                    if (not t["zu"] and not t.get("gesperrt") and t["paar"] != "?"
                            and not t.get("verdaechtig") and t["zeit"][:10] == tag):
                        t["zu"] = "gewinn"
                        t["max_tp"] = max(t["max_tp"], 1)
                        t["hits"].setdefault(1, None)
                        t["letzte"] = r["created_at"]
                        t["per_bilanz"] = True
            continue

        # Nur Trades DIESES Handelstages kommen in Frage. Ein "TP1✅" von heute
        # frueh gehoert nicht zu einer Order von gestern Mittag, die nie
        # geschlossen wurde — der Desk laesst offene Positionen einfach
        # stehen, und ohne diese Grenze wandert ein heutiger Treffer auf eine
        # Karte von gestern.
        offen = [t for t in trades if not t["zu"] and not t.get("gesperrt")
                 and (jetzt - _zeit(t["zeit"])).total_seconds() < 12 * 3600]

        if art == "anweisung":
            # "BE ziehen": der Stop der laufenden Position steht jetzt auf dem
            # Einstieg. Ein spaeteres "SL HIT" ist dann null, kein Verlust.
            #
            # Nur wenn eindeutig ist, WELCHE Position gemeint ist: laufen Long
            # und Short gleichzeitig, wird keiner markiert — sonst verschwand
            # ein echter Verlust des anderen als "be" (Review 13.09.).
            if RE_BE_ZIEHEN.search(text) and not df.RE_KEIN_EREIGNIS.search(text) and offen:
                paar_n = genanntes_paar(text, None)
                kand = [t for t in offen if not paar_n or t["paar"] == paar_n]
                kand = [t for t in kand if t["paar"] == kand[-1]["paar"]] if kand else []
                if kand and len({t["richtung"] for t in kand}) == 1:
                    kand[-1]["be_gezogen"] = True
            continue

        if art not in ("treffer", "stop", "be"):
            continue

        # Dieselbe Meldung zweimal: der Reader hat sie doppelt geliefert, oder
        # der Desk hat sie wiederholt. Ueber die Buchstaben erkannt, damit
        # "SL ❌" und "30 SL ❌" als EIN Stop zaehlen — bei Treffern aber MIT
        # der Stufe: "TP1✅" und "TP2✅" haben dieselben Buchstaben, und so fiel
        # am 18.08. jedes TP2 und TP3 als "Duplikat" weg, das binnen 20 Minuten
        # nach dem TP1 kam (Code-Review 13.09.).
        stufe = (df.tp_stufe(text) or 1) if art == "treffer" else None
        k = df.kern(text) + (f":tp{stufe}" if stufe else "")
        if df.kern(text) and (jetzt - zuletzt.get(k, jetzt - datetime.timedelta(days=1))).total_seconds() < 1200:
            continue
        zuletzt[k] = jetzt

        # Nennt die Meldung ein Instrument, kommt nur dieses in Frage ("Nochmal
        # SL Hit bei NAS" gehoert keinem Gold-Trade). Sagt sie, welche Position
        # NICHT gemeint ist ("aber der Short ist noch am laufen"), faellt die raus.
        ereignis = {"treffer": df.RE_TP_TREFFER, "stop": df.RE_STOP,
                    "be": df.RE_BE_TREFFER}[art].search(text)
        paar_n = genanntes_paar(text, ereignis.start() if ereignis else None)
        if paar_n:
            offen = [t for t in offen if t["paar"] == paar_n]
        m = RE_LAEUFT_NOCH.search(text)
        if m and art in ("stop", "be"):
            nicht = "SELL" if m.group(1).lower() == "short" else "BUY"
            offen = [t for t in offen if t["richtung"] != nicht]

        if art == "treffer":
            # Mehrere Positionen in einer Zeile ("TP1 geknackt 140 + 130"):
            # jede Zahl sucht sich ihren eigenen Trade, keiner wird zweimal
            # bedient.
            zahlen = df.pips_liste(text) or [None]
            gesperrte = [t for t in trades if not t["zu"] and t.get("gesperrt")
                         and (jetzt - _zeit(t["zeit"])).total_seconds() < 12 * 3600]
            for pips in zahlen:
                ziel = _waehle_trade(offen, stufe, pips, beob, jetzt, gesperrte)
                if ziel is None:
                    continue
                ziel["hits"][stufe] = pips
                ziel["max_tp"] = max(ziel["max_tp"], stufe)
                ziel["letzte"] = r["created_at"]
                if stufe >= letzte_stufe(ziel):
                    ziel["zu"] = "gewinn"
                offen = [t for t in offen if t is not ziel]
            continue

        if art == "be":
            # Raus auf Einstand. Welcher Trade? Einer, dessen Stop auf Einstand
            # steht — also nach "BE ziehen" oder einem Treffer. Ist das nicht
            # genau einer, wird NICHTS geschlossen: ein falsch geschlossener
            # Trade faengt keine Meldungen mehr, und seine Ziele wandern weiter.
            kand = [t for t in offen if t.get("be_gezogen") or t["hits"]]
            if len(kand) == 1:
                ziel = kand[0]
            elif not kand and len(offen) == 1:
                ziel = offen[0]
            else:
                continue
        else:
            # Der Stop gehoert dem juengsten offenen Trade: am 09.09. um 13:23
            # kam "SL ❌ / 30 SL ❌" drei Minuten nach dem Short von 13:20 — 30
            # Pips ist genau dessen Stop-Abstand.
            ziel = offen[-1] if offen else None
            if ziel is None:
                continue

        # Ein Stop NACH einem Treffer ist kein Verlust: der Desk zieht den Stop
        # bei +50 Pips auf Einstand ("SL auf Breakeven ziehen", 09.09. 09:50).
        # Was dann faellt, ist der nachgezogene Stop, nicht der urspruengliche.
        # Dasselbe nach "BE ziehen" ohne Treffer: raus bei null — das bekommt
        # keinen Streifen (Einstand gehoert in die Signalgruppe, Ansage 08.09.),
        # aber der Trade ist zu und fischt keine Ziele mehr.
        if ziel["hits"]:
            ziel["zu"] = "gewinn"
        elif art == "stop" and not ziel.get("be_gezogen"):
            ziel["zu"] = "stop"
        else:
            ziel["zu"] = "be"
        ziel["letzte"] = r["created_at"]
    return trades


def ergebnis_pips(t):
    """Die Zahl, die auf die Karte darf — oder None.

    Gerechnet wird aus den beiden Preisen, die im Signal selbst stehen:
    Einstieg und getroffenes Ziel. Das ist die belegbarste Zahl, die es gibt.

    Die Angabe des Desks dient der ZUORDNUNG (siehe _waehle_trade), nicht der
    Anzeige. Grund: der Desk fasst Positionen zusammen — "TP1 geknackt 140 +
    130" am 09.09. um 13:43 meinte zwei Trades. Fuer den einen Trade, den wir
    zuordnen konnten, sind 130 richtig und 140 gehoerten einem anderen. Wer
    die genannte Zahl uebernimmt, schreibt 10 Pips gut, die dieser Trade nie
    gemacht hat.

    Nur wenn das Ziel im Signal fehlte, bleibt die Desk-Angabe die einzige
    Quelle — dann steht sie auf der Karte.
    """
    if t["paar"] == "?" or t.get("verdaechtig"):
        return None
    pip = pip_wert(t["paar"])
    if t["zu"] == "stop":
        return -round(abs(t["entry"] - t["sl"]) / pip)
    stufe = t["max_tp"]
    if not stufe:
        return None
    ziel = t["tps"].get(stufe)
    if ziel is None:
        return t["hits"].get(stufe)
    return round(abs(t["entry"] - ziel) / pip)


# ── Die Karte ──────────────────────────────────────────────────────────────

def schrift(groesse, fett=False):
    try:
        f = ImageFont.truetype(FONT, groesse)
        if fett:
            try: f.set_variation_by_axes([700])
            except Exception: pass
        return f
    except Exception:
        return ImageFont.load_default()


# ── Karte: Ergebnis eines Trades — ein duenner Streifen ─────────────────────
#
# Ansage Diego 09.09., nach dem ersten Versuch mit ganzseitigen Ergebniskarten:
# "wenn da jeden Tag sechs Kacheln reinkommen mit riesigen Trades ist es to
# much … dann markierst du die zugehoerige Trade-Karte, sobald wir wissen ob
# der Trade durch ist und ob er positiv oder negativ war … eine gruene
# Einzeiler-Karte, also sehr duenn, oder halt rot … die muss professionell und
# clean sein."
#
# Deshalb ist die Ergebniskarte KEINE eigene Kachel mehr, sondern eine Zeile,
# die als ANTWORT unter der Live-Karte desselben Trades haengt. Der Kontext —
# welches Paar, welche Richtung, wann — steht schon oben; hier steht nur noch,
# wie es ausgegangen ist. Ein Trade, eine Kachel, eine Zeile darunter.
def render_ergebnis(t, ziel_datei):
    gewonnen = t["zu"] != "stop"
    grund = GRUEN_GRUND if gewonnen else ROT_GRUND
    akzent = GRUEN if gewonnen else ROT

    B, H = 1080, 148
    bild = Image.new("RGB", (B, H), grund)
    d = ImageDraw.Draw(bild, "RGBA")

    # Ein schmaler Balken links statt eines Farbverlaufs: auf 148 Pixel Hoehe
    # wirkt ein Schein wie ein Druckfehler.
    d.rectangle((0, 0, 7, H), fill=akzent)

    pips = ergebnis_pips(t)
    if pips is None:
        held = f"TP{t['max_tp']} HIT" if t["max_tp"] else "CLOSED"
    else:
        held = ("+" if pips >= 0 else "\u2212") + f"{abs(pips):,.0f}".replace(",", " ") + " PIPS"
    f_held = schrift(46, True)
    d.text((48, 44), held, font=f_held, fill=WEISS)

    # Paar und Ausgang als kleiner Zweizeiler DIREKT neben der Zahl — nicht am
    # rechten Rand. Dort legt Telegram Uhrzeit und Aufrufe als Plakette ueber
    # jedes Bild, und auf einem 148 Pixel hohen Streifen trifft die genau die
    # Zeile. Am 09.09. stand "CLOSED IN PROFIT" rechts und war im Kanal nicht
    # zu lesen. Die rechte Seite bleibt deshalb bewusst leer.
    x = 48 + d.textlength(held, font=f_held) + 30
    d.text((x, 44), f"{t['paar']} {t['richtung']}", font=schrift(20, True),
           fill=(255, 255, 255, 150))
    kopf = "CLOSED IN PROFIT" if gewonnen else "STOPPED OUT"
    d.text((x, 76), kopf, font=schrift(18, True), fill=akzent)

    bild.save(ziel_datei, quality=95)
    return ziel_datei


# ── Karte A: ein neuer Trade ist live ───────────────────────────────────────
#
# Ansage Diego 10.09.: "die Trade-Karte sollte auch ein bisschen cooler
# dargestellt sein, das sind zu viele kleine Infos, man rafft gar nicht so
# sehr — es soll wirklich gross dastehen: New Gold Trade in VIP Group … es
# muss halt ins Auge fallen. Aktuell ist es eine grosse schwarze Karte, wo man
# nicht viel erkennt."
#
# Die Vorgaengerin trug eine verdeckte Preisleiter mit drei Beschriftungen,
# drei Punktreihen und einer Fusszeile — neun Einzelheiten in 17 bis 34 Punkt
# auf fast Schwarz. Beim Scrollen blieb davon nichts haengen. Jetzt traegt EINE
# Zeile die Nachricht, in der schwersten Schnittstaerke der Schrift, und alles
# andere ordnet sich darunter.
#
# Bewusst weiter OHNE Zahlen: der Info-Kanal ist oeffentlich, Einstieg, Stop
# und Ziel sind das Produkt. Und bewusst ohne Uhrzeit — rechts unten legt
# Telegram seine eigene ueber jedes Bild, die zweite war am 10.09. davon
# verdeckt.

def _f(groesse, gewicht=400):
    s = ImageFont.truetype(FONT, groesse)
    try:
        s.set_variation_by_axes([gewicht])
    except Exception:
        pass
    return s


def _passend(d, text, gewicht, max_breite, start):
    """So gross wie moeglich, aber nie breiter als der Platz. "NEW NASDAQ
    TRADE" ist drei Buchstaben laenger als "NEW GOLD TRADE"."""
    g = start
    while g > 30 and d.textlength(text, font=_f(g, gewicht)) > max_breite:
        g -= 2
    return _f(g, gewicht)


def _winkel(d, cx, cy, w, h, dicke, runter, farbe):
    s = 1 if runter else -1
    oben, unten = cy - s * h / 2, cy + s * h / 2
    d.polygon([(cx - w / 2, oben), (cx - w / 2 + dicke, oben),
               (cx, unten - s * dicke * 1.35),
               (cx + w / 2 - dicke, oben), (cx + w / 2, oben), (cx, unten)], fill=farbe)


def render_teaser(inst, richtung, wann, ziel):
    B, H = 1080, 380
    kurz = richtung.lower().startswith("s")
    farbe = ROT if kurz else GRUEN

    # Nachtblau statt Schwarz: ein senkrechter Verlauf gibt der Flaeche Tiefe.
    # Die alte Karte war im dunklen Telegram-Thema ein schwarzes Loch.
    bild = Image.new("RGB", (B, H))
    px = ImageDraw.Draw(bild)
    oben_f, unten_f = (13, 30, 68), (5, 9, 22)
    for y in range(H):
        a = y / (H - 1)
        px.line((0, y, B, y), fill=tuple(int(oben_f[i] * (1 - a) + unten_f[i] * a) for i in range(3)))

    K = 120
    licht = Image.new("L", (K, K), 0); lp = licht.load()
    for yy in range(K):
        for xx in range(K):
            dx, dy = (xx - K / 2) / (K / 2), (yy - K / 2) / (K / 2)
            lp[xx, yy] = int(255 * max(0.0, 1.0 - (dx * dx + dy * dy) ** 0.5) ** 2.0)
    licht = licht.resize((900, 700), Image.BICUBIC)
    bild.paste(Image.new("RGB", licht.size, AZUR), (B - 560, -380),
               licht.point(lambda v: int(v * 0.30)))

    d = ImageDraw.Draw(bild, "RGBA")

    # Drei gestaffelte Winkel in Richtungsfarbe. Der hellste sitzt an der
    # SPITZE der Bewegung — bei Short unten, bei Long oben —, die anderen sind
    # die Spur dahinter. So liest man die Richtung, bevor man ein Wort liest.
    # Bewusst KEIN Kursverlauf: ein erfundener Chart neben echten Signalen
    # waere eine Behauptung; ein Pfeil ist nur ein Pfeil.
    stufen = (40, 90, 160) if kurz else (160, 90, 40)
    for i, alpha in enumerate(stufen):
        _winkel(d, 895, 134 + i * 62, 146, 60, 20, kurz, (*farbe, alpha))

    txt = "LIVE NOW"
    pill = _f(19, 700)
    w = d.textlength(txt, font=pill)
    d.rounded_rectangle((56, 38, 56 + 44 + w + 22, 78), 20,
                        fill=(255, 255, 255, 22), outline=(255, 255, 255, 40), width=1)
    d.ellipse((74, 51, 88, 65), fill=ROT)
    d.text((100, 47), txt, font=pill, fill=WEISS)
    marke = _f(18, 700)
    d.text((B - 56 - d.textlength("COSMOS CANDLES", font=marke), 48), "COSMOS CANDLES",
           font=marke, fill=AZUR)

    kopf = f"NEW {inst.upper()} TRADE" if inst.lower() != "market" else "NEW TRADE"
    fk = _passend(d, kopf, 900, 740, 84)
    d.text((54, 104), kopf, font=fk, fill=WEISS)
    d.text((58, 104 + fk.size + 22), "IN THE VIP GROUP", font=_f(30, 600),
           fill=(255, 255, 255, 150))

    ri = "SHORT" if kurz else "LONG"
    fr = _f(22, 800)
    rw = d.textlength(ri, font=fr)
    d.rounded_rectangle((56, 290, 56 + rw + 40, 336), 23, fill=farbe)
    d.text((76, 301), ri, font=fr, fill=(8, 12, 26))
    d.text((56 + rw + 62, 303), "Entry, stop and targets are inside.",
           font=_f(20, 400), fill=(255, 255, 255, 140))

    bild.save(ziel, quality=95)
    return ziel


# ── Karte: Kundennachricht ──────────────────────────────────────────────────
#
# Ansage Diego 10.09.: Kundennachrichten wie in Tims Lobby, "die sind ja echt,
# aber halt im Cosmo-Style".
#
# Der Text kommt WOERTLICH aus dem Screenshot (lobby_cron.py), nur uebersetzt,
# ohne Namen und ohne Anrede. Die Zeile darunter sagt nur, was stimmt: die
# Nachricht stammt von jemandem, der denselben Desk handelt. Keine Sterne, kein
# Name, kein erfundenes Profilbild — nichts, was so tut, als waere es mehr als
# ein Zitat.
def render_zitat(text, ziel):
    B = 1080
    fz = _f(38, 600)
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))

    # Umbrechen nach Breite, nicht nach Zeichenzahl — die Schrift ist breit.
    zeilen, zeile = [], ""
    for wort in text.split():
        versuch = (zeile + " " + wort).strip()
        if probe.textlength(versuch, font=fz) <= B - 200:
            zeile = versuch
        else:
            zeilen.append(zeile); zeile = wort
    if zeile:
        zeilen.append(zeile)
    zeilen = zeilen[:5]

    H = 232 + len(zeilen) * 54
    bild = Image.new("RGB", (B, H))
    px = ImageDraw.Draw(bild)
    oben_f, unten_f = (13, 30, 68), (5, 9, 22)
    for y in range(H):
        a = y / (H - 1)
        px.line((0, y, B, y), fill=tuple(int(oben_f[i] * (1 - a) + unten_f[i] * a) for i in range(3)))
    d = ImageDraw.Draw(bild, "RGBA")

    kick = _f(18, 700)
    w = d.textlength("FROM A TRADER", font=kick)
    d.rounded_rectangle((56, 38, 56 + w + 36, 76), 19, fill=(*AZUR, 40), outline=(*AZUR, 120), width=1)
    d.text((74, 47), "FROM A TRADER", font=kick, fill=AZUR)
    marke = _f(18, 700)
    d.text((B - 56 - d.textlength("COSMOS CANDLES", font=marke), 48), "COSMOS CANDLES",
           font=marke, fill=AZUR)

    # Das grosse Anfuehrungszeichen ist das einzige Schmuckstueck. Es sagt
    # "Zitat", bevor man ein Wort liest.
    d.text((50, 84), "\u201c", font=_f(120, 900), fill=(*AZUR, 150))
    y = 128
    for z in zeilen:
        d.text((144, y), z, font=fz, fill=WEISS)
        y += 54
    d.text((144, y + 20), "\u2014 a trader following the desk", font=_f(20, 400),
           fill=(255, 255, 255, 140))
    bild.save(ziel, quality=95)
    return ziel


# ── Karte: Tagesergebnis (neu, 10.09.) ─────────────────────────────────────
#
# Ansage Diego 10.09.: "wieso keine geile Karte mit den Daily Results?! Stil
# haben wir ja jetzt gefunden, die Karte darf gerne auch groesser sein und
# special designt."
#
# Die Zahlen sind TIMS EIGENE Tagesbilanz ("HEUTIGES ERGEBNIS"), nicht eine
# Nachrechnung. Die VIP-Mitglieder sehen genau diese Bilanz im Signalkanal;
# stuende im Info-Kanal eine andere Zahl, widersprachen sich zwei Kanaele
# derselben Marke. Wir gestalten sie, wir veraendern sie nicht.
#
# Die Heldenzahl ist NETTO (TP minus SL). Wer an einem Tag mit 70 Pips Stop
# nur die 420 Take-Profit gross schreibt, zeigt einen Ausschnitt und nennt ihn
# Ergebnis.
def render_tagesbilanz(b, datum, ziel):
    """Recap of the Day — Tims Tagesbilanz als Karte.

    Zweite Fassung, 11.09. Diego zur ersten: "es fehlt sowas wie Recap of the
    Day, man rafft nicht ganz, was das jetzt ist — die Zahl oben ist zu gross,
    die unten sind zu klein, der Text unten ist gar nicht lesbar."

    Der Grund war messbar: Telegram zeigt ein 1080-px-Bild auf dem Handy etwa
    auf ein Drittel verkleinert. Die Beschriftungen hatten 18-20 px — dort
    also rund 7 pt. Deshalb gilt auf dieser Karte: NICHTS unter 30 px. Und
    eine Ueberschrift, die sagt, was die Karte ist, bevor man eine Zahl liest.
    """
    B, H = 1080, 1000
    netto = (b["tp"] or 0) - (b["sl"] or 0)
    gut = netto >= 0
    held_f = GRUEN if gut else ROT

    bild = Image.new("RGB", (B, H))
    px = ImageDraw.Draw(bild)
    oben_f, unten_f = (14, 33, 74), (4, 8, 20)
    for y in range(H):
        a = y / (H - 1)
        px.line((0, y, B, y), fill=tuple(int(oben_f[i] * (1 - a) + unten_f[i] * a) for i in range(3)))

    def schein(farbe, groesse, pos, staerke):
        K = 120
        m = Image.new("L", (K, K), 0); mp = m.load()
        for yy in range(K):
            for xx in range(K):
                dx, dy = (xx - K / 2) / (K / 2), (yy - K / 2) / (K / 2)
                mp[xx, yy] = int(255 * max(0.0, 1.0 - (dx * dx + dy * dy) ** 0.5) ** 2.0)
        m = m.resize(groesse, Image.BICUBIC)
        bild.paste(Image.new("RGB", groesse, farbe), pos, m.point(lambda v: int(v * staerke)))

    schein(AZUR, (1000, 800), (B - 620, -460), 0.30)
    schein(held_f, (900, 460), (-240, 250), 0.14)

    d = ImageDraw.Draw(bild, "RGBA")

    # Kopf: WAS ist das, WANN war das.
    d.text((56, 50), "COSMOS CANDLES", font=_f(28, 700), fill=AZUR)
    titel = "RECAP OF THE WEEK" if b.get("art") == "woche" else "RECAP OF THE DAY"
    ft = _passend(d, titel, 900, B - 112, 76)
    d.text((54, 94), titel, font=ft, fill=WEISS)
    d.text((58, 94 + ft.size + 20), datum.upper(), font=_f(32, 600), fill=(255, 255, 255, 165))

    # Cosmo rechts, er steht auf der Kachelreihe.
    y_kacheln = 640
    try:
        cosmo = Image.open(f"{BASE}/assets/cosmo_bust.png").convert("RGBA")
        hc = 380
        cosmo = cosmo.resize((int(cosmo.width * hc / cosmo.height), hc), Image.LANCZOS)
        cx, cy = B - 48 - cosmo.width, y_kacheln - hc
        schein(AZUR, (560, 560), (cx + cosmo.width // 2 - 280, cy - 40), 0.22)
        bild.paste(cosmo, (cx, cy), cosmo)
        d = ImageDraw.Draw(bild, "RGBA")
        platz = cx - 56 - 20
    except FileNotFoundError:
        platz = B - 112

    # Die Zahl — gross, aber nicht mehr alles erschlagend.
    zahl = ("+" if netto >= 0 else "\u2212") + f"{abs(netto):,}".replace(",", " ")
    fz = _passend(d, zahl, 900, min(platz, 600), 150)
    yz = 300
    d.text((50, yz), zahl, font=fz, fill=WEISS)
    d.text((58, yz + fz.size + 24), "PIPS NET PROFIT" if gut else "PIPS NET",
           font=_f(40, 800), fill=held_f)

    # Drei Kacheln, Zahlen gross genug fuer ein Handy.
    kacheln = [
        (str(b["signale"]), "SIGNALS", WEISS),
        ("+" + f"{b['tp'] or 0:,}".replace(",", " "), "TAKE PROFIT", GRUEN),
        (("\u2212" if b["sl"] else "") + f"{b['sl'] or 0:,}".replace(",", " "), "STOP LOSS",
         ROT if b["sl"] else WEISS),
    ]
    hk, luecke = 200, 22
    bk = (B - 112 - 2 * luecke) // 3
    for i, (wert, name, farbe) in enumerate(kacheln):
        x0 = 56 + i * (bk + luecke)
        d.rounded_rectangle((x0, y_kacheln, x0 + bk, y_kacheln + hk), 28,
                            fill=(16, 24, 48, 240), outline=(255, 255, 255, 40), width=2)
        fw = _passend(d, wert, 900, bk - 52, 88)
        d.text((x0 + 26, y_kacheln + 30), wert, font=fw, fill=farbe)
        d.text((x0 + 28, y_kacheln + hk - 62), name, font=_f(30, 700), fill=(255, 255, 255, 170))

    fuss = "Every signal was called live in the VIP group."
    if b.get("be"):
        fuss = f"Breakeven {b['be']} pips, not counted. " + fuss
    ff = _passend(d, fuss, 500, B - 112, 32)
    d.text((58, y_kacheln + hk + 44), fuss, font=ff, fill=(255, 255, 255, 175))

    bild.save(ziel, quality=95)
    return ziel


# ── Karte B gab es hier einmal ──────────────────────────────────────────────
#
# render_treffer() ist am 09.09. entfallen. Sie war die zweite Karte zum selben
# Trade: der Teaser-Cron druckte "TARGET REACHED", zehn Minuten spaeter druckte
# dieses Modul "TP1 hit" zum selben Ereignis. Ein Trade, zwei Karten, und die
# Tagesbilanz sah nach doppelt so viel Handel aus, wie stattgefunden hat.
# Es gibt jetzt genau eine Live-Karte und genau eine Ergebniskarte je Trade.


# ── Karte C: Bilanz (Tag oder Woche) ───────────────────────────────────────
#
# Bisher ging die Bilanz als Textblock raus, waehrend alles andere im Kanal
# eine Karte ist. Die eine Textnachricht zwischen lauter Karten sieht aus, als
# waere sie vergessen worden.
#
# Bewusst OHNE Aufruf und ohne Deutung: nur die Zahlen, die aus signal_relays
# kommen. Was daraus zu schliessen ist, entscheidet der Leser.
def render_bilanz(kopf, unter, signale, tp, sl, be, ziel, unklar=0):
    # Die Hoehe folgt dem Inhalt. Fest gesetzt schnitt sie den NET-Balken ab,
    # sobald eine Breakeven-Zeile dazukam — und genau die Zahl unten ist die,
    # auf die alle schauen.
    zeilen_n = 3 if be else 2
    B = 1080
    H = 290 + zeilen_n * 82 + 130 + (34 if unklar else 0)
    bild = Image.new("RGB", (B, H), GRUND)
    d = ImageDraw.Draw(bild, "RGBA")

    K = 110
    licht = Image.new("L", (K, K), 0); lp = licht.load()
    for y in range(K):
        for x in range(K):
            dx, dy = (x - K / 2) / (K / 2), (y - K / 2) / (K / 2)
            lp[x, y] = int(255 * max(0.0, 1.0 - (dx * dx + dy * dy) ** 0.5) ** 2.2)
    licht = licht.resize((1140, 640), Image.BICUBIC)
    bild.paste(Image.new("RGB", licht.size, AZUR), (B // 2 - 570, -330),
               licht.point(lambda v: int(v * 0.22)))

    d.text((56, 50), kopf, font=schrift(24, True), fill=AZUR)
    d.text((B - 56 - d.textlength("COSMOS CANDLES", font=schrift(20, True)), 52),
           "COSMOS CANDLES", font=schrift(20, True), fill=AZUR)
    d.text((56, 88), unter, font=schrift(19), fill=GRAU)

    # Die Signalzahl traegt die Karte, die Pips stehen daneben — sonst
    # konkurrieren drei gleich grosse Zahlen um dieselbe Aufmerksamkeit.
    f_gross = schrift(78, True)
    d.text((56, 140), str(signale), font=f_gross, fill=WEISS)
    bx = 56 + d.textlength(str(signale), font=f_gross) + 20
    d.text((bx, 186), "signals", font=schrift(26), fill=(255, 255, 255, 130))

    zeilen = [("Targets", f"+{tp}", GRUEN), ("Stops", f"-{sl}", ROT)]
    if be:
        zeilen.append(("Breakeven", str(be), (255, 255, 255, 140)))
    f_lab, f_wert = schrift(22), schrift(40, True)
    y = 290
    for name, wert, farbe in zeilen:
        d.line((56, y - 14, B - 56, y - 14), fill=(255, 255, 255, 20), width=1)
        d.text((56, y + 8), name, font=f_lab, fill=(255, 255, 255, 150))
        d.text((B - 56 - d.textlength(wert, font=f_wert), y), wert, font=f_wert, fill=farbe)
        y += 82

    netto = tp - sl
    d.rounded_rectangle((56, y + 6, B - 56, y + 6 + 96), 18,
                        fill=(*(GRUEN if netto >= 0 else ROT), 26),
                        outline=(*(GRUEN if netto >= 0 else ROT), 90), width=2)
    d.text((86, y + 30), "NET", font=schrift(24, True), fill=GRUEN if netto >= 0 else ROT)
    n = f"{'+' if netto >= 0 else ''}{netto} pips"
    f_n = schrift(44, True)
    d.text((B - 86 - d.textlength(n, font=f_n), y + 26), n, font=f_n,
           fill=GRUEN if netto >= 0 else ROT)

    if unklar:
        # Offen gelegt statt weggelassen: eine Bilanz, die verschweigt was sie
        # nicht weiss, ist keine Bilanz.
        d.text((56, H - 42), f"{unklar} trade(s) without a final update",
               font=schrift(17), fill=GRAU)

    bild.save(ziel, quality=95)
    return ziel


# ── In die Queue, nicht direkt senden ──────────────────────────────────────
#
# poster.py ist der einzige Absender. Zwei Prozesse, die in denselben Kanal
# schreiben, ueberholen sich irgendwann gegenseitig — und done.json zaehlt nach
# INDEX, weshalb hier ausschliesslich angehaengt oder an genau derselben Stelle
# ueberschrieben wird, nie umsortiert.


def _eintrag(t, datei, antwort_auf):
    """Der Queue-Eintrag zur Ergebniszeile — als Antwort auf die Live-Karte.

    OHNE Bildunterschrift. Ansage 09.09.: "unter den Bildern muss auch keine
    weitere Erklaerung kommen, die Bilder stehen ja fuer sich und dann nehmen
    sie auch weniger Platz weg." Auf der Karte steht die Zahl, die Richtung und
    der Ausgang — ein Text darunter wiederholt das nur und macht aus einer
    schmalen Zeile wieder einen Block.
    """
    return {"at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "type": "photo", "file": os.path.basename(datei), "verified": True,
            "reply_to_index": antwort_auf,
            "quelle": f"ergebnis {t['id']} \u2014 Zahlen unveraendert aus dem Desk-Signal",
            "caption": ""}


def live_karten(queue):
    """Zu welchem Signal steht welche Live-Karte an welcher Queue-Stelle.

    teaser_cron vermerkt "teaser relay <id>", und <id> ist genau die Zeile aus
    signal_relays, mit der der Trade aufging — also dieselbe Nummer, unter der
    hier ein Trade gefuehrt wird. Darueber finden sich die beiden.
    """
    aus = {}
    for i, p in enumerate(queue):
        q = str(p.get("quelle", ""))
        if q.startswith("teaser relay "):
            aus[q.split("teaser relay ", 1)[1].strip()] = i
    return aus


def main():
    """Eine Karte je Trade — und sie wird nachgefuehrt, nicht verdoppelt.

    Ansage 08.09.: "Take Profit oder Break Even kommt da nicht rein, sondern
    halt ob der Trade positiv geschlossen wurde." Genau eine Karte pro Trade
    heisst aber nicht, dass sie beim ersten Ziel eingefroren ist: faellt TP2,
    wird DIESELBE Nachricht im Kanal ersetzt (poster.py, ersetzt_index) statt
    eine zweite zu senden. Steht die Karte noch in der Warteschlange, wird sie
    an Ort und Stelle ueberschrieben — das haelt die Queue-Nummern stabil,
    an denen done.json haengt.
    """
    e = env()
    # Erst rechnen (Netz), dann sperren: die Queue wird nur in dem kurzen Stueck
    # gehalten, in dem sie gelesen, ergaenzt und zurueckgeschrieben wird.
    trades = baue_trades(lade_verlauf(e))
    with ql.gesperrt():
        _karten_einreihen(trades)


def _karten_einreihen(trades):
    stand = json.load(open(STATE)) if os.path.exists(STATE) else {}
    if not isinstance(stand, dict):
        stand = {}          # altes Format war eine Liste erledigter relay_ids
    queue = ql.lies()
    done = json.load(open(f"{BASE}/done.json")) if os.path.exists(f"{BASE}/done.json") else {}
    geaendert = 0

    erstlauf = not stand
    heute = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    versatz = 0      # Minuten, damit mehrere Karten nicht als Schwall kommen
    lebend = live_karten(queue)
    for t in trades:
        if not t["hits"] and t["zu"] != "stop":
            continue                      # nichts Belegtes -> keine Karte
        # NUR Trades, die im Kanal auch angekuendigt wurden. Ansage 09.09.:
        # "in der Infogruppe soll auch nicht alle Trades". Ein Ergebnis ohne
        # vorherige Live-Karte haette nichts, worunter es haengen koennte —
        # und waere genau die zusaetzliche Kachel, die zu viel ist.
        if t["paar"] == "?" or t.get("verdaechtig"):
            continue                      # Instrument unbekannt / Zahlen unmoeglich -> keine Karte
        # Die Live-Karte kann an jeder Fassung derselben Order haengen — der
        # Teaser nimmt die erste, die Abstand und Tageslimit passiert, und das
        # ist nicht immer die, deren id der zusammengefuehrte Trade traegt.
        antwort_auf = next((lebend[i] for i in t.get("ids", [t["id"]]) if i in lebend), None)
        if antwort_auf is None:
            continue
        # Abgeschlossene Handelstage werden nicht mehr angefasst. Die Rechnung
        # oben sieht nur ein Fenster des Desk-Stroms; rutscht es weiter, fallen
        # die aeltesten Signale heraus, und ihre Treffer landen beim naechsten
        # Trade. Genau so kamen am Sa 12.09. 22:00 und So 13.09. 00:20
        # "closed in profit"-Streifen unter zwei Freitags-Trades, fuer die der
        # Desk nie ein Ziel gemeldet hatte, und am Fr 22:20 wurde aus einem
        # +180 nachtraeglich ein +700. Ein Ziel kann ohnehin nur binnen 12 h
        # nach dem Signal zugeordnet werden (siehe `offen`), die Tagesbilanz
        # kommt am selben Abend — was danach noch wechselt, ist ein Artefakt.
        if (datetime.datetime.now(datetime.timezone.utc)
                - _zeit(t["zeit"])).total_seconds() > FRIST_STUNDEN * 3600:
            continue
        if erstlauf and t["letzte"][:10] < heute:
            # Beim allerersten Lauf zaehlt alles von FRUEHEREN Tagen als
            # Bestand. Sonst schuettet die Umstellung die halbe Vorwoche als
            # "neue" Karten in den Kanal. Die Trades von HEUTE bekommen ihre
            # Karte trotzdem — sie sind der Grund fuer den Umbau.
            stand[t["id"]] = {"index": None, "signatur":
                              f"{t['zu'] or 'offen'}:{t['max_tp']}:{ergebnis_pips(t)}"}
            continue
        alt = stand.get(t["id"], {})
        signatur = f"{t['zu'] or 'offen'}:{t['max_tp']}:{ergebnis_pips(t)}"
        if alt.get("signatur") == signatur:
            continue

        datei = f"{MEDIA}/trade-{t['id'][:8]}.png"
        render_ergebnis(t, datei)
        eintrag = _eintrag(t, datei, antwort_auf)

        if alt.get("index") is None:
            # Entstehen in EINEM Lauf mehrere Karten — beim Umstellen, oder wenn
            # der Cron stand —, werden sie auseinandergezogen. Sieben Karten
            # hintereinander sehen aus wie ein Ausbruch, nicht wie ein Kanal.
            if versatz:
                eintrag["at"] = (datetime.datetime.now(datetime.timezone.utc)
                                 + datetime.timedelta(minutes=versatz)).strftime("%Y-%m-%dT%H:%M:%SZ")
            versatz += 4
            index = len(queue)
            queue.append(eintrag)
            print(f"neu: {signatur}")
        elif str(alt["index"]) not in done:
            index = alt["index"]
            eintrag["at"] = queue[index]["at"]     # Sendezeit nicht verschieben
            # War der wartende Eintrag selbst schon ein Austausch, muss er es
            # bleiben — sonst geht er als ZWEITER Streifen unter dieselbe
            # Live-Karte, und der erste wird nie mehr ersetzt (Review 13.09.).
            if queue[index].get("ersetzt_index") is not None:
                eintrag["ersetzt_index"] = queue[index]["ersetzt_index"]
            queue[index] = eintrag
            print(f"aktualisiert (noch nicht raus): {signatur}")
        else:
            eintrag["ersetzt_index"] = alt["index"]
            index = len(queue)
            queue.append(eintrag)
            print(f"ersetzt #{alt['index']}: {signatur}")

        stand[t["id"]] = {"index": index, "signatur": signatur}
        geaendert += 1

    if erstlauf:
        print(f"Erstlauf: {len(stand)} Trade(s) als Bestand vermerkt, nichts gesendet")
    if geaendert:
        ql.schreibe(queue)
    json.dump(stand, open(STATE, "w"), indent=1)
    print(f"{geaendert} Karte(n) neu oder nachgefuehrt")


if __name__ == "__main__":
    if "--probe" in sys.argv:
        # Zeigt, was aus dem echten Desk-Strom gelesen wird, und rendert jede
        # Karte nach /tmp — ohne Queue, ohne Kanal.
        e = env()
        rows = lade_verlauf(e, stunden=int(sys.argv[sys.argv.index("--stunden") + 1])
                            if "--stunden" in sys.argv else 36)
        print(f"{len(rows)} Desk-Nachrichten gelesen\n")
        for r in rows:
            print(f'  {r["created_at"][11:16]}  {df.klassifiziere(r.get("preview") or ""):<12}'
                  f'  {(r.get("preview") or "")[:52]!r}')
        trades = baue_trades(rows)
        print("\nZuordnung Schritt fuer Schritt:")
        import io, contextlib
        puffer = io.StringIO()
        with contextlib.redirect_stdout(puffer):
            _ = baue_trades(rows)
        print(puffer.getvalue() or "  (keine Verwerfungen)")
        print(f"\n{len(trades)} Trade(s):")
        for t in trades:
            print(f'  {t["paar"]} {t["richtung"]} entry {t["entry"]} sl {t["sl"]} '
                  f'tps {t["tps"]} hits {t["hits"]} -> {t["zu"] or "offen"} '
                  f'{ergebnis_pips(t) if (t["hits"] or t["zu"] == "stop") else ""}')
            if t["hits"] or t["zu"] == "stop":
                ziel = f"/tmp/karte-{t['id'][:8]}.png"
                render_ergebnis(t, ziel)
                print("   ->", ziel)
        sys.exit(0)
    main()
