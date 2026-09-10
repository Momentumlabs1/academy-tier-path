"""Was aus Tims Desk in den oeffentlichen Info-Kanal darf — und was nicht.

WARUM ES DAS GIBT
Ansage 09.09.: "Break even ziehen und so Sachen, die sind ja nur in der
Signalgruppe, die haben in der Infogruppe nichts zu suchen — das musst du
natuerlich trennen."

Der Desk schreibt in EINEN Strom zwei voellig verschiedene Sorten Nachricht:

  1. Ereignisse  — ein Signal geht auf, ein Ziel faellt, ein Stop wird
                   getroffen. Das ist Beweis und darf oeffentlich sein.
  2. Anweisungen — "BE ziehen", "Teilprofite", "Sichert euch Profits",
                   "Buy jetzt". Das ist die Fuehrung der zahlenden Gruppe
                   waehrend eines laufenden Trades. Wer das oeffentlich
                   mitliest, braucht VIP nicht mehr.

Ohne diese Trennung ist beides dasselbe "Textstueck mit Zahlen drin", und
genau daran ist es am 09.09. gescheitert: aus "50 Pips Profit / SL auf
Breakeven ziehen" (09:50) baute der Teaser-Cron eine Karte "TARGET REACHED —
+50 pips". Es war kein Ziel erreicht. Der Desk hat nur den Stop nachgezogen.
Eine Anweisung wurde zu einem Ergebnis umgedeutet und ging so an Kunden.

WIE HIER ENTSCHIEDEN WIRD
Reihenfolge ist der ganze Trick. "TP2 ✅ Teilprofite ziehen" enthaelt beides:
einen echten Treffer UND eine Anweisung. Der Treffer gewinnt, weil er das
Ereignis ist. "50 Pips & BE ziehen ✅" enthaelt kein TP-Zeichen — also bleibt
nur die Anweisung, und die faellt raus.

Alles, was hier nicht sicher als Ereignis erkannt wird, wird verworfen. Eine
Nachricht zu wenig kostet einen Post; eine falsch gedeutete kostet
Glaubwuerdigkeit bei Leuten, die dafuer zahlen sollen.
"""
import re

# ── Ereignisse ───────────────────────────────────────────────────────────────

# Ein Signal: Richtung, Einstieg und Stop stehen drin. Ohne Stop ist es keine
# Order, sondern eine Meinung.
RE_SIGNAL = re.compile(r"entry\s*:", re.I)
RE_RICHTUNG = re.compile(r"\b(sell|buy)\b", re.I)
RE_SL_ZEILE = re.compile(r"^\s*SL\s*:", re.I | re.M)
# Eine Pending-Order ist erst mit "Aktiv" ein Signal — vorher ist nichts
# passiert, was man zeigen koennte.
RE_PENDING = re.compile(r"limit\s*order|⏳", re.I)

# Ein Treffer nennt IMMER eine TP-Stufe. "120 Pips" allein ist ein Zwischenstand,
# kein Treffer — der Unterschied ist der ganze Punkt dieser Datei.
RE_TP_TREFFER = re.compile(
    r"\bTP\s*([1-9])?\s*(?:[:\-–]\s*)?(?:✅|hit|geknackt|erreicht|getroffen|done|geschafft)"
    r"|(?:✅|hit|geknackt|erreicht|getroffen)\s*\bTP\s*([1-9])?", re.I)

# Ein Stop ist getroffen, nicht "gezogen". "SL auf Breakeven ziehen" ist eine
# Anweisung und darf hier auf keinen Fall greifen.
RE_STOP = re.compile(r"\b(?:SL|stop|stoploss)\b[^\n]{0,20}?\b(?:hit|getroffen|erreicht|out)\b"
                     r"|\bausgestoppt\b|\bstopped\s*out\b"
                     # "SL ❌" und "30 SL ❌" — so meldet der Desk es wirklich.
                     # Ohne diese Form lief ein Verlust am 09.09. als "rauschen"
                     # durch und der Trade blieb ewig offen stehen.
                     r"|\bSL\b\s*[❌🛑]|[❌🛑]\s*\bSL\b", re.I)

# ── Anweisungen an die zahlende Gruppe ───────────────────────────────────────
RE_ANWEISUNG = re.compile(
    r"\bBE\b|break\s*even|breakeven"
    r"|teilprofit|partial"
    r"|sichert?\s*(?:euch)?\s*(?:die\s*)?profit|profits?\s*sichern|lock\s*in"
    r"|\b(?:buy|sell|kauf|verkauf)\s*(?:jetzt|now)\b"
    r"|\bSL\b[^\n]{0,25}\b(?:ziehen|nachziehen|setzen|hoch|runter)\b"
    r"|\braus\s*(?:jetzt|hier)\b|\bschliesst?\b|\bclose\s*(?:it|now)\b", re.I)

# Zwischenstand eines laufenden Trades: Pips ohne TP-Stufe.
RE_LAUFEND = re.compile(r"\d+\s*pips?\b|\bim\s*profit\b|\bin\s*profit\b|\bam\s*laufen\b", re.I)

# Tims eigene Bilanzkarten ("4 SIGNALE / 1180 TP") — die zaehlen wir selbst,
# aus den Signalen. Siehe desk_report.py.
RE_FREMDBILANZ = re.compile(r"heutige[rs]?\s*(?:report|ergebnis)|weekly\s*report|\b\d+\s*signale\b", re.I)
# Eine Zaehlzeile: "420 ✅ TP" oder "1250 TP ✅" — das Emoji steht bei Tim mal
# davor, mal dahinter. EINE solche Zeile ist ein einzelner Stop ("30 SL ❌"),
# erst ZWEI davon sind eine Bilanz. Am 10.09. verwechselte der Filter sonst
# entweder Tims Tagesbilanz mit einem Treffer oder einen Stop mit einer Bilanz.
RE_ZAEHLZEILE = re.compile(r"\d+\s*[✅❌🛑🔴]\s*(?:TP|SL|BE)\b|\d+\s*(?:TP|SL|BE)\s*[✅❌🛑🔴]", re.I)


def ist_fremdbilanz(t: str) -> bool:
    return bool(RE_FREMDBILANZ.search(t)) or len(RE_ZAEHLZEILE.findall(t)) >= 2


# Plaene ("bei TP2 nachlegen") sind Ankuendigungen, keine Ereignisse.
RE_PLAN = re.compile(r"\b(?:bei|ab|bis)\s+tp", re.I)

# "Fast TP1 hit", "Gleich TP2 hit", "kurz vor TP1" — der Desk kuendigt an, dass
# ein Ziel GLEICH faellt. Am 10.09. las der Filter beides als Treffer und
# schrieb einem Trade TP2 gut, der es in dem Moment noch nicht hatte.
RE_BEINAHE = re.compile(r"\b(?:fast|gleich|bald|kurz\s+vor|almost|nearly|soon|close\s+to)\b", re.I)


def klassifiziere(text: str) -> str:
    """Eine Desk-Nachricht → eine Sorte.

    signal | treffer | stop | anweisung | laufend | fremdbilanz | plan | rauschen
    """
    t = (text or "").strip()
    if not t:
        return "rauschen"

    if ist_fremdbilanz(t):
        return "fremdbilanz"

    if RE_SIGNAL.search(t) and RE_RICHTUNG.search(t) and RE_SL_ZEILE.search(t):
        return "pending" if RE_PENDING.search(t) else "signal"

    if RE_PLAN.search(t):
        return "plan"

    # Treffer VOR Anweisung: "TP2 ✅ Teilprofite ziehen" ist ein Treffer.
    # Aber nicht, wenn er erst angekuendigt wird.
    if RE_TP_TREFFER.search(t):
        return "laufend" if RE_BEINAHE.search(t) else "treffer"

    if RE_STOP.search(t):
        return "stop"

    if RE_ANWEISUNG.search(t):
        return "anweisung"

    if RE_LAUFEND.search(t):
        return "laufend"

    return "rauschen"


def tp_stufe(text: str):
    """Welche TP-Stufe eine Treffermeldung nennt — oder None."""
    m = RE_TP_TREFFER.search(text or "")
    if not m:
        return None
    for g in m.groups():
        if g:
            return int(g)
    return None


def pips_liste(text: str):
    """Alle Pip-Zahlen einer Treffermeldung.

    Der Desk fasst mehrere Positionen in eine Zeile: "TP1 geknackt 140 + 130".
    Wer nur die erste liest, verliert den zweiten Trade — und wer beide dem
    ERSTEN Trade zuordnet, erfindet einen. Die Stufennummer selbst ("TP1")
    zaehlt nicht mit, und Preise haben Nachkommastellen, also fallen sie durch.
    """
    ohne_tp = re.sub(r"\bTP\s*\d", " ", text or "", flags=re.I)
    ohne_preise = re.sub(r"\d[\d\s]*[.,]\d+", " ", ohne_tp)
    return [int(x) for x in re.findall(r"\b(\d{2,4})\b", ohne_preise) if 20 <= int(x) <= 2000]


def kern(text: str) -> str:
    """Nur die Buchstaben — zum Wiedererkennen derselben Meldung.

    Am 09.09. um 13:23 kamen "SL ❌" und "30 SL ❌" als zwei Nachrichten fuer
    EINEN Stop. Wer beide zaehlt, stoppt zwei Trades aus, von denen einer noch
    laeuft. Ueber die Buchstaben sind beide dasselbe: "sl".
    """
    return re.sub(r"[^a-zäöüß]+", "", (text or "").lower())


def pips_angabe(text: str):
    """Die vom Desk selbst genannte Pip-Zahl — oder None.

    Die schlaegt spaeter die eigene Rechnung, wenn beide zueinander passen.
    Passen sie nicht, stimmt die Zuordnung nicht, und dann entsteht lieber
    keine Karte.
    """
    m = re.search(r"(\d{2,4})\s*pips?\b", text or "", re.I)
    return int(m.group(1)) if m else None


DARF_IN_KANAL = {"signal", "treffer", "stop"}


def darf_in_kanal(text: str) -> bool:
    return klassifiziere(text) in DARF_IN_KANAL


if __name__ == "__main__":
    # Gegenprobe an echten Desk-Nachrichten. Erwartung steht daneben; laeuft
    # ohne Netz und ohne Datenbank, damit sie jeder nachvollziehen kann.
    proben = [
        ("🔴 GOLD SELL\nEntry : 4 400.00\nSL    : 4 407.25", "signal"),
        ("🔴 GOLD SELL\nEntry : 4 400.00\nSL : 4 407.25\n\n🎯 TP1 : 4 393.25", "signal"),
        ("50 Pips Profit \nSL auf Breakeven ziehen", "anweisung"),
        ("TP1✅", "treffer"),
        ("Buy jetzt", "anweisung"),
        ("TP2 ✅\nTeilprofite ziehen", "treffer"),
        ("50 Pips & BE ziehen ✅🔥", "anweisung"),
        ("70 PIPS. Sichert euch Profits ✅🔥", "anweisung"),
        ("100 PIPS im Profit ✅🔥", "laufend"),
        ("TP1 geknackt 120 PIPS🔥✅", "treffer"),
        ("🚀🚀", "rauschen"),
        ("SL hit", "stop"),
        ("Der Long ist aber noch am laufen 240 pips im Profit 🔥", "laufend"),
        ("Alles klar.", "rauschen"),
        ("HEUTIGER REPORT\n7 SIGNALE\n\n420 ✅ TP\n70 ❌ SL", "fremdbilanz"),
        ("SL ❌", "stop"),
        ("30 SL ❌", "stop"),
        ("TP1 geknackt 140 + 130 🔥✅", "treffer"),
        ("Sell jetzt", "anweisung"),
        ("XAUUSD 190 PIPS im Profit + 180 PIPS im Profit 🔥✅", "laufend"),
        ("TP3 hit, 700 PIPS ✅🔥", "treffer"),
        ("330 PIPS im Profit\nGleich TP2 hit 🔥✅", "laufend"),
        ("Fast TP1 hit\n120 PIPS im Profit 🔥✅", "laufend"),
        ("TP1 fast hit\n110 PIPS im Profit 🔥✅", "laufend"),
        ("HEUTIGES ERGEBNIS\n8 SIGNALE\n\n1250 TP ✅\n0 SL ❌\n0 BE 🛑", "fremdbilanz"),
        ("SL HIT ❌", "stop"),
        ("❌ Limit Order stornieren", "rauschen"),
    ]
    fehler = 0
    for text, soll in proben:
        ist = klassifiziere(text)
        ok = "  " if ist == soll else "!!"
        if ist != soll:
            fehler += 1
        print(f"{ok} {ist:<12} (soll {soll:<12}) {text[:46]!r}")
    print(f"\n{len(proben) - fehler}/{len(proben)} richtig")
    print("pips_liste('TP1 geknackt 140 + 130'):", pips_liste("TP1 geknackt 140 + 130 🔥✅"))
    print("pips_liste('TP1 geknackt, 120 PIPS'):", pips_liste("TP1 geknackt, 120 PIPS 🔥✅"))
    print("pips_liste('TP1✅'):", pips_liste("TP1✅"))
    print("kern('SL ❌') == kern('30 SL ❌'):", kern("SL ❌") == kern("30 SL ❌"))
