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

RE_KOPF = re.compile(
    r"\b(?P<paar>XAUUSD|XAU|GOLD|BTCUSD|BTC|NAS100|US100|US30|[A-Z]{6})\b"
    r"[^\n]{0,8}?\b(?P<richtung>BUY|SELL)\b", re.I)
RE_ENTRY = re.compile(r"entry\s*:?\s*(?P<v>[\d\s.,]+)", re.I)
RE_SL = re.compile(r"^\s*SL\s*:?\s*(?P<v>[\d\s.,]+)", re.I | re.M)
# "TP4 : offen" faellt hier durch — der Nachsatz muss mit einer Ziffer anfangen.
RE_TPS = re.compile(r"TP\s*(\d)\s*:?\s*(\d[\d\s.,]*)", re.I)


def norm_paar(p):
    p = p.upper()
    return "XAUUSD" if p in ("GOLD", "XAU", "XAUUSD") else ("BTCUSD" if p.startswith("BTC") else p)


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


def lade_verlauf(e, stunden=36):
    import urllib.parse
    seit = urllib.parse.quote((datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(hours=stunden)).isoformat())
    return rest(e, f"signal_relays?select=id,preview,created_at"
                   f"&created_at=gte.{seit}&order=created_at.asc&limit=300")


def letzte_stufe(t):
    """Das hoechste Ziel, das im Signal ueberhaupt genannt war."""
    return max(t["tps"]) if t["tps"] else 1


def _waehle_trade(offen, stufe, pips):
    """Zu welchem laufenden Trade gehoert diese Treffermeldung?

    Der Desk haelt mehrere Positionen gleichzeitig und schreibt nur "TP2 ✅".
    Am 09.09. lief um 09:59 noch der Short von 08:53 (der gerade TP1 hatte)
    UND der Long von 09:57, zwei Minuten alt. Wer den Treffer stur dem juengsten
    Trade zuordnet, schreibt dem Long ein Ziel gut, das er in zwei Minuten nie
    erreicht haben kann.

    Deshalb zwei Wege, in dieser Reihenfolge:
      1. Nennt der Desk eine Pip-Zahl, ist das eine MESSUNG: Einstieg und Ziel
         stehen im Signal, der Abstand ist nachrechenbar. Passt die Zahl zu
         genau einem laufenden Trade, ist die Frage beantwortet — passt sie zu
         KEINEM, ist die Meldung nicht unsere (oder eine Wiederholung), und es
         entsteht nichts. Das ist der wichtige Teil: eine genannte Zahl, die
         nirgends aufgeht, war am 09.09. der Weg, auf dem ein fremder Treffer
         einem unbeteiligten Trade gutgeschrieben wurde.
      2. Ohne Pip-Zahl die Reihenfolge — Ziele fallen von unten nach oben.
         Gemeint ist der Trade, dessen hoechster Treffer eine Stufe darunter
         liegt.
    """
    frei = [t for t in offen if stufe not in t["hits"]]
    if not frei:
        return None
    if pips:
        for t in frei:
            z = t["tps"].get(stufe)
            if z is None:
                continue
            eigene = abs(t["entry"] - z) / pip_wert(t["paar"])
            if eigene and abs(eigene - pips) / eigene <= 0.15:
                return t
        return None
    for t in frei:
        if t["max_tp"] == stufe - 1:
            return t
    for t in reversed(frei):
        if t["max_tp"] < stufe:
            return t
    return None


def baue_trades(rows):
    """Aus dem Desk-Strom die einzelnen Trades rekonstruieren.

    Ein Trade entsteht mit dem Signal und endet mit einem Stop oder dem letzten
    genannten Ziel. Alles dazwischen — "BE ziehen", "Teilprofite", "100 Pips im
    Profit" — ist Fuehrung der VIP-Gruppe und wird von desk_filter aussortiert.
    """
    trades = []
    zuletzt = {}          # Buchstabenkern einer Meldung -> Zeitpunkt

    for r in rows:
        text = r.get("preview") or ""
        art = df.klassifiziere(text)

        if art == "signal":
            kopf, e_, s_ = RE_KOPF.search(text), RE_ENTRY.search(text), RE_SL.search(text)
            if not (kopf and e_ and s_):
                continue
            try:
                entry, sl = zahl(e_.group("v")), zahl(s_.group("v"))
            except ValueError:
                continue
            richtung = kopf.group("richtung").upper()
            paar = norm_paar(kopf.group("paar"))
            tps = {}
            for nr, wert in RE_TPS.findall(text):
                try:
                    tps[int(nr)] = zahl(wert)
                except ValueError:
                    pass

            # Waechter: liegt der Stop auf der falschen Seite, ist die Richtung
            # falsch. Am 08.09. um 08:17 schickte der Desk "🟢 XAUUSD BUY,
            # Entry 4392, SL 4402, TP1 4382" — das sind Short-Zahlen, und eine
            # Minute spaeter kam dieselbe Order als SELL. Wer die erste
            # Fassung nimmt, zeigt Kunden eine Karte, die sich selbst
            # widerspricht.
            if (richtung == "BUY" and sl >= entry) or (richtung == "SELL" and sl <= entry):
                print(f"verworfen (Stop auf der falschen Seite): {text[:60]!r}")
                continue

            # Dieselbe Order zweimal geschickt — erst nackt, Minuten spaeter mit
            # den Zielen, manchmal noch einmal als Spanne. Das ist EIN Trade.
            vor = trades[-1] if trades else None
            if (vor and vor["paar"] == paar and vor["richtung"] == richtung
                    and abs(vor["entry"] - entry) < 1e-9
                    and (_zeit(r["created_at"]) - _zeit(vor["zeit"])).total_seconds() < 1800):
                vor["tps"].update(tps)
                vor["sl"] = sl
                continue
            trades.append({"id": r["id"], "paar": paar, "richtung": richtung,
                           "entry": entry, "sl": sl, "tps": tps,
                           "zeit": r["created_at"], "letzte": r["created_at"],
                           "hits": {}, "max_tp": 0, "zu": None})
            continue

        if art not in ("treffer", "stop"):
            continue

        # Dieselbe Meldung zweimal: der Reader hat sie doppelt geliefert, oder
        # der Desk hat sie wiederholt. Ueber die Buchstaben erkannt, damit
        # "SL ❌" und "30 SL ❌" als EIN Stop zaehlen.
        k = df.kern(text)
        jetzt = _zeit(r["created_at"])
        if k and (jetzt - zuletzt.get(k, jetzt - datetime.timedelta(days=1))).total_seconds() < 1200:
            continue
        zuletzt[k] = jetzt

        # Nur Trades DIESES Handelstages kommen in Frage. Ein "TP1✅" von heute
        # frueh gehoert nicht zu einer Order von gestern Mittag, die nie
        # geschlossen wurde — der Desk laesst offene Positionen einfach
        # stehen, und ohne diese Grenze wandert ein heutiger Treffer auf eine
        # Karte von gestern.
        offen = [t for t in trades if not t["zu"]
                 and (jetzt - _zeit(t["zeit"])).total_seconds() < 12 * 3600]
        if art == "treffer":
            stufe = df.tp_stufe(text) or 1
            # Mehrere Positionen in einer Zeile ("TP1 geknackt 140 + 130"):
            # jede Zahl sucht sich ihren eigenen Trade, keiner wird zweimal
            # bedient.
            zahlen = df.pips_liste(text) or [None]
            for pips in zahlen:
                ziel = _waehle_trade(offen, stufe, pips)
                if ziel is None:
                    continue
                ziel["hits"][stufe] = pips
                ziel["max_tp"] = max(ziel["max_tp"], stufe)
                ziel["letzte"] = r["created_at"]
                if stufe >= letzte_stufe(ziel):
                    ziel["zu"] = "gewinn"
                offen = [t for t in offen if t is not ziel]
        else:
            ziel = offen[-1] if offen else None
            if ziel:
                # Ein Stop NACH einem Treffer ist kein Verlust: der Desk zieht
                # den Stop bei +50 Pips auf Einstand ("SL auf Breakeven
                # ziehen", 09.09. 09:50). Was dann faellt, ist der nachgezogene
                # Stop, nicht der urspruengliche.
                ziel["zu"] = "gewinn" if ziel["hits"] else "stop"
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


# ── Karte A: Signal ist live, Zahlen verdeckt ───────────────────────────────
#
# Der Info-Kanal ist oeffentlich. Wer hier Einstieg, Stop und Ziel zeigt, gibt
# das Produkt weg, fuer das andere zahlen. Also dieselbe Bauform wie die
# Ergebniskarte, aber mit verdeckten Zahlen: man sieht, DASS ein Trade laeuft
# und wie er aufgebaut ist, nicht WELCHER.
#
# Bewusst KEIN Aufruf ("tap the pinned message"). Der stand unter jedem Teaser
# und liess die Reihe wie Spam aussehen — dafuer gibt es eigene Nachrichten.
def render_teaser(inst, richtung, wann, ziel):
    # Ansage 09.09.: "die Trade-Kacheln muessen auch ein bisschen kleiner sein."
    # 560 -> 400 Pixel, ohne etwas wegzulassen: die Leiter steht enger, die
    # Raender sind schmaler. Im Kanal frisst eine Karte damit rund ein Drittel
    # weniger Bildschirm, und bei mehreren Signalen am Tag ist genau das der
    # Unterschied zwischen "gepflegt" und "zugespammt".
    B, H = 1080, 400
    bild = Image.new("RGB", (B, H), GRUND)
    d = ImageDraw.Draw(bild, "RGBA")

    K = 110
    licht = Image.new("L", (K, K), 0); lp = licht.load()
    for y in range(K):
        for x in range(K):
            dx, dy = (x - K / 2) / (K / 2), (y - K / 2) / (K / 2)
            lp[x, y] = int(255 * max(0.0, 1.0 - (dx * dx + dy * dy) ** 0.5) ** 2.2)
    licht = licht.resize((1120, 440), Image.BICUBIC)
    bild.paste(Image.new("RGB", licht.size, AZUR), (B // 2 - 560, -240),
               licht.point(lambda v: int(v * 0.24)))

    farbe = ROT if richtung.lower().startswith("s") else GRUEN
    # Der Punkt links pulst nicht — ein Standbild kann das nicht. Er ist der
    # ruhige Hinweis "laeuft gerade", mehr soll er nicht sein.
    d.ellipse((56, 44, 72, 60), fill=farbe)
    d.text((86, 40), "LIVE IN VIP", font=schrift(20, True), fill=farbe)
    d.text((B - 56 - d.textlength("COSMOS CANDLES", font=schrift(18, True)), 42),
           "COSMOS CANDLES", font=schrift(18, True), fill=AZUR)

    f_paar = schrift(48, True)
    d.text((56, 88), inst.upper(), font=f_paar, fill=WEISS)
    bx = 56 + d.textlength(inst.upper(), font=f_paar) + 20
    f_ri = schrift(21, True); rw = d.textlength(richtung.upper(), font=f_ri)
    d.rounded_rectangle((bx, 100, bx + rw + 26, 100 + 34), 17,
                        fill=(*farbe, 38), outline=(*farbe, 150), width=2)
    d.text((bx + 13, 106), richtung.upper(), font=f_ri, fill=farbe)

    # Die Leiter steht, die Zahlen sind zu. Gleichmaessiger Abstand, damit auch
    # das Verhaeltnis nichts verraet.
    # Die Reihenfolge folgt der RICHTUNG. Bei einem Short liegt der Stop ueber
    # dem Einstieg und das Ziel darunter — bei einem Long genau andersherum.
    # Vorher stand immer SL oben; auf einer Long-Karte war das schlicht falsch,
    # und das faellt jedem Trader in einer Sekunde auf.
    leiter = [("SL", ROT), ("ENTRY", WEISS), ("TARGET", GRUEN)]
    if not richtung.lower().startswith("s"):
        leiter = [("TARGET", GRUEN), ("ENTRY", WEISS), ("SL", ROT)]
    f_lab, f_wert = schrift(15, True), schrift(28, True)
    for i, (name, f) in enumerate(leiter):
        y = 190 + i * 58
        d.line((72, y, B - 56, y), fill=(*f, 55), width=2)
        d.ellipse((66, y - 6, 78, y + 6), fill=f)
        d.text((90, y - 23), name, font=f_lab, fill=(*f, 200))
        pkt = "• • • •"
        d.text((B - 56 - d.textlength(pkt, font=f_wert), y - 20), pkt,
               font=f_wert, fill=(255, 255, 255, 70))

    d.text((56, 344), "Entry, stop and targets are in VIP right now.",
           font=schrift(18), fill=(255, 255, 255, 150))
    d.text((B - 56 - d.textlength(wann, font=schrift(15)), 348), wann,
           font=schrift(15), fill=GRAU)
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
    stand = json.load(open(STATE)) if os.path.exists(STATE) else {}
    if not isinstance(stand, dict):
        stand = {}          # altes Format war eine Liste erledigter relay_ids
    queue = json.load(open(f"{BASE}/queue.json"))
    done = json.load(open(f"{BASE}/done.json")) if os.path.exists(f"{BASE}/done.json") else {}
    geaendert = 0

    trades = baue_trades(lade_verlauf(e))
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
        antwort_auf = lebend.get(t["id"])
        if antwort_auf is None:
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
        tmp = f"{BASE}/queue.json.tmp"
        json.dump(queue, open(tmp, "w"), ensure_ascii=False, indent=1)
        os.replace(tmp, f"{BASE}/queue.json")
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
