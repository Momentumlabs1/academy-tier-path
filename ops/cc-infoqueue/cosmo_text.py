#!/usr/bin/env python3
"""Cosmo spricht — die beiden Text-Saeulen des Info-Kanals.

WARUM ES DAS GIBT
Ansage Diego, 09.09.: "wo bleiben weitere Texte von Cosmo, Input von ihm in die
Info-Gruppe … aktuell wird wieder nichts rein geschickt von dir. Tim hat viele
neue Nachrichten rein geschickt, was fuer dich immer ein Trigger sein sollte …
es passiert aber nichts, gar nichts."

Gemessen war das richtig: der letzte redaktionelle Post im Info-Kanal ist vom
06.09. 09:00, danach nur noch Karten. Der Grund war kein Fehler, sondern eine
Luecke — es gab keinen Erzeuger fuer Texte. Die einzige Stelle, die je Inhalte
vorschlug (brain.briefing), wurde am 04.09. abgeschaltet, und nichts ist
nachgerueckt. Diese Datei ist das Nachruecken.

ZWEI SAEULEN, MEHR NICHT
  --rueckblick  Mo-Fr abends: EIN Trade des Tages als Aufhaenger, und daran
                etwas Kluges. Nicht die Zahlen der Bilanzkarte nacherzaehlen.
  --vip         alle drei Tage: der zeitlose Aufnahme-Post.

Was hier ausdruecklich NICHT entsteht, sind Erklaerposts zu Tims Anweisungen
("BE ziehen", "Teilprofite"). Ansage 09.09.: "Break even ziehen und so Sachen,
die sind ja nur in der Signalgruppe, die haben in der Infogruppe nichts zu
suchen." Wer diese Fuehrung oeffentlich nachbaut, verschenkt genau das Produkt,
fuer das andere zahlen.

DREI BREMSEN, WEIL EIN SPRACHMODELL SCHREIBT
  1. Die Zahlenschranke: jede Zahl im Text muss aus den echten Desk-Daten
     stammen. Das ist die einzige Bremse, die nicht selbst wieder ein Modell
     ist — sie vergleicht Ziffern mit Ziffern.
  2. Die Wortschranke: taucht VIP-Fuehrung im Text auf, faellt der Entwurf durch.
  3. brain.pruefe() beim Senden — die Eintraege gehen bewusst OHNE
     "verified": true in die Queue, damit die Endkontrolle laeuft.

Beanstandet eine der ersten beiden Bremsen, geht der Einwand als Satz zurueck an
das Modell und es schreibt EINMAL neu. Eine Ablehnung ohne Ruecklauf hiesse, dass
an dem Tag nichts erscheint — und genau das war ja die Klage.

Gesendet wird wie immer nur von poster.py.
"""
import json, os, re, sys, datetime, urllib.request, urllib.parse

BASE = "/opt/cc-infoqueue"
sys.path.insert(0, BASE)
import trade_card as tc
import desk_report as dr

STATE = f"{BASE}/cosmo_text_state.json"
MAX_PRO_TAG = 2
ABSTAND_STUNDEN = 0.5   # vorher 3 — mit Tims Lobby-Posts tagsueber waere der Abendtext nie mehr rausgegangen
ENV = "/opt/cosmos-setter/.env"

STIMME = (
    "Du bist Cosmo und schreibst fuer den Telegram-Kanal von Cosmos Candles, einer Trading-"
    "Community. Du schreibst wie ein echter Mensch, der selbst jeden Tag am Chart sitzt: kurz, "
    "direkt, warm, ein bisschen frech, per du (englisch: 'you'). Emojis setzt du so selbst"
    "verstaendlich wie im Chat unter Freunden (📈 🔥 ✅ 💆‍♂️ 👀 🚀 👽) — nie als Kette. Dass du ein "
    "Ausserirdischer bist, blitzt hoechstens EINMAL als Augenzwinkern auf, nie als Philosophie. "
    "Keine Lebensweisheiten, keine Vortraege, keine Metaphern-Ketten. Jeder Post hat genau EINE "
    "Aussage, die der Leser mitnimmt. "
    "Verboten: erfundene Zahlen, Gewinnversprechen, Druck ('last chance'), und jede "
    "Handelsanweisung (kein 'move your stop', kein 'take partials', kein 'buy now')."
)

# Vorbild ist Tims eigener Lobby-Stil, den Diego als "menschlich" kennt:
#   "Gym ✅ / Calls ✅ / Erster Trade ✅ / Der Tag laeuft. Jetzt gleich voller Fokus
#    auf die NY Session. 📈"
# Ansage 11.09. zum VIP-Post in der alten Form: "zu lang, komplett gleich
# formatiert, keine Emojis, keine Absaetze, keine Menschlichkeit — wofuer?"
# Die alte Form verlangte 5-8 gleich gebaute Zeilen, hoechstens EIN Emoji und
# keinen Aufruf. Genau das kam heraus: acht gleich lange Philosophie-Zeilen.
FORM = ("SPRACHE: Der Post selbst ist ENGLISCH (diese Anweisung ist deutsch, der Text nicht).\n"
        "FORM: 3 bis 6 kurze Zeilen, insgesamt UNTER 380 Zeichen. Erste Zeile = Aufhaenger, kurz, "
        "gern mit Emoji. Wechsle die Bauart: mal eine Mini-Liste mit ✅, mal eine Frage, mal zwei "
        "Saetze und eine Pointe — NICHT jede Zeile gleich lang und gleich gebaut. Zwei bis vier "
        "Emojis insgesamt. Leerzeilen fuer Luft sind erlaubt. Kein Titel, keine Hashtags, keine Links.")

# Ein paar Woerter, die es im Englischen nicht gibt. Drei davon reichen als
# Beweis, dass der Post in der falschen Sprache steht.
DEUTSCH = re.compile(r"\b(und|nicht|ist|wir|das|mit|sind|oder|aber|eine|einen|dass|"
                     r"heute|sich|nur|auch|schon|noch|beim|vom|zum)\b", re.I)


# ── Zugaenge ────────────────────────────────────────────────────────────────

def env():
    e = {}
    for line in open(ENV):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            e[k] = v.strip().strip('"')
    return e


def _secret(e, key):
    sk = e.get("SUPABASE_SERVICE_ROLE_KEY") or e.get("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(
        f"{e['SUPABASE_URL']}/rest/v1/app_secrets?key=eq.{key}&select=value",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    d = json.load(urllib.request.urlopen(req, timeout=20))
    return d[0]["value"] if d else None


def claude(e, auftrag, max_tokens=700):
    key = _secret(e, "ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("kein ANTHROPIC_API_KEY in app_secrets")
    body = json.dumps({"model": "claude-sonnet-5", "max_tokens": max_tokens,
                       "system": STIMME,
                       "messages": [{"role": "user", "content": auftrag}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body,
                                 method="POST",
                                 headers={"Content-Type": "application/json",
                                          "x-api-key": key,
                                          "anthropic-version": "2023-06-01"})
    d = json.load(urllib.request.urlopen(req, timeout=90))
    return "".join(b.get("text", "") for b in d.get("content", []) if b.get("type") == "text").strip()


def ops_melden(e, text):
    """Mitlesen lassen, ohne eine Aufgabe daraus zu machen.

    Der Ops-Kanal, nicht die Admin-Gruppe: dort soll seit dem 04.09. nur noch
    Registrierung, Einzahlung und Partner landen.

    Der Bot kommt aus der Setter-.env, NICHT der Relay-Bot aus app_secrets: der
    Ops-Kanal gehoert dem Setter. Mit dem Relay-Token antwortet Telegram
    "chat not found" — gemessen, nicht vermutet.
    """
    tok = e.get("TELEGRAM_BOT_TOKEN") or _secret(e, "TELEGRAM_BOT_TOKEN")
    chat = _secret(e, "BOT_ACTIVITY_CHAT_ID")
    if not tok or not chat:
        return
    try:
        d = urllib.parse.urlencode({"chat_id": chat, "text": text[:3900],
                                    "disable_web_page_preview": "true"}).encode()
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{tok}/sendMessage", data=d), timeout=15)
    except Exception as ex:
        print("Ops-Meldung fehlgeschlagen:", ex)


# ── Die Schranken ───────────────────────────────────────────────────────────

def _zahlen(text):
    """Alle Zahlen ab zwei Stellen, Tausenderzeichen und Nachkomma entfernt."""
    aus = set()
    for r in re.findall(r"\d[\d\s.,]*", text or ""):
        ganz = re.sub(r"[\s,]", "", r.strip().rstrip(".,")).split(".")[0]
        if ganz.isdigit() and len(ganz) >= 2:
            aus.add(int(ganz))
    return aus


def pruefe_zahlen(text, erlaubt):
    """Jede Zahl im Text muss aus den echten Desk-Daten stammen.

    Kleine Zahlen bis 19 sind frei — das sind Anzahlen ("three trades", "two of
    them"). Alles darueber muss belegt sein.
    """
    frei = set(range(0, 20)) | {2026}
    unbelegt = sorted(_zahlen(text) - set(erlaubt) - frei)
    return (not unbelegt), unbelegt


VERBOTEN = re.compile(
    r"\bbreak\s*even\b|\bbreakeven\b|\bpartials?\b|take\s+partial"
    r"|move\s+your\s+stop|trail\s+your\s+stop|\bbuy\s+now\b|\bsell\s+now\b"
    r"|secure\s+(?:your\s+)?profits?|lock\s+in\s+(?:your\s+)?profits?", re.I)


def beanstande(text, erlaubt):
    """Was an einem Entwurf nicht stimmt — als Satz, den das Modell lesen kann.
    None heisst: nichts zu beanstanden."""
    if not text:
        return "Es kam kein Text zurueck."
    ok, unbelegt = pruefe_zahlen(text, erlaubt)
    if not ok:
        return (f"Die Zahlen {unbelegt} stehen nicht in den Daten. Verwende "
                "ausschliesslich die genannten Zahlen, oder schreib den Satz ohne Zahl.")
    if VERBOTEN.search(text):
        return ("Der Text enthaelt Handelsfuehrung (Stop nachziehen, Teilgewinne, "
                "jetzt kaufen). Das gehoert in die VIP-Gruppe, nicht hierher. "
                "Schreib es ohne jede Handlungsanweisung.")
    if len(text) > 460:
        return f"Zu lang: {len(text)} Zeichen. Unter 380, das ist ein Telegram-Post, kein Artikel."
    emojis = re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", text)
    if len(emojis) < 1:
        return "Keine Emojis — so schreibt kein Mensch in einem Trading-Kanal. Setz zwei bis vier ein."
    if len(emojis) > 7:
        return "Zu viele Emojis. Zwei bis vier, keine Ketten."
    if len(DEUTSCH.findall(text)) >= 3:
        return ("Der Post ist auf Deutsch. Der Kanal ist englisch. "
                "Schreib denselben Inhalt auf Englisch.")
    zeilen = [z for z in text.splitlines() if z.strip()]
    if len(zeilen) < 3 or max(len(z) for z in zeilen) > 170:
        return ("Das ist ein Block. Schreib 3 bis 6 kurze Zeilen mit echten Zeilenumbruechen.")
    laengen = sorted(len(z) for z in zeilen)
    if len(zeilen) >= 4 and laengen[-1] - laengen[0] < 15:
        return ("Alle Zeilen sind gleich lang und gleich gebaut — das liest sich wie eine Liste "
                "Kalendersprueche. Mach die erste Zeile kurz, wechsle die Bauart.")
    return None


def faktencheck(e, text, fakten):
    """Stimmt jede AUSSAGE — nicht nur jede Ziffer?

    Die Zahlenschranke vergleicht Ziffern. Sie kann nicht sehen, dass "paid out
    four times before noon" falsch ist, weil "four" keine Ziffer ist. Genau
    dieser Satz stand im Rueckblick vom 09.09.; es waren drei.

    brain.pruefe() haette es fangen sollen, konnte es aber nicht: sie bekommt
    nur die letzten acht Rohnachrichten des Desks — abends sind das "Sell
    jetzt" und Emojis, nicht die Trades vom Vormittag. Mit so wenig Kontext
    haelt sie JEDEN Rueckblick fuer erfunden, auch einen richtigen.

    Deshalb prueft hier ein zweiter Durchgang gegen DASSELBE Faktenblatt, das
    der Schreiber hatte. Gibt None zurueck, wenn alles belegt ist, sonst die
    Beanstandung als Satz.
    """
    roh = claude(e,
        "Du bist Faktenpruefer. Unten stehen FAKTEN und ein POST. Pruefe jede "
        "Tatsachenbehauptung im Post — Anzahlen, Uhrzeiten, Reihenfolgen, Dauer, "
        "Ausgaenge, Vergleiche wie 'vor Mittag' oder 'kleiner als'. Deutungen und "
        "Stimmung sind erlaubt, Tatsachen muessen aus den Fakten folgen.\n\n"
        "Antworte NUR mit JSON: {\"ok\": true} oder "
        "{\"ok\": false, \"falsch\": [\"Satz aus dem Post — warum er nicht stimmt\"]}\n\n"
        f"FAKTEN:\n{fakten or '(keine — der Post darf keine konkreten Trades behaupten)'}\n\n"
        f"POST:\n{text}", max_tokens=600)
    roh = (roh or "").strip()
    if re.search(r'"ok"\s*:\s*true', roh) and not re.search(r'"ok"\s*:\s*false', roh):
        return None
    try:
        a, b = roh.find("{"), roh.rfind("}")
        falsch = json.loads(roh[a:b + 1]).get("falsch") or []
    except Exception:
        falsch = [roh[:300]]
    return ("Diese Aussagen stimmen nicht mit den Fakten ueberein: "
            + " | ".join(str(f) for f in falsch) + ". Korrigiere sie oder lass sie weg.")


def erzeuge(e, auftrag, erlaubt, fakten=""):
    """Entwurf, Beanstandung, ein zweiter Versuch — dann ist Schluss.
    Gibt (text, fehler) zurueck; fehler=None heisst brauchbar."""
    def pruefe(t):
        return beanstande(t, erlaubt) or faktencheck(e, t, fakten)

    text = claude(e, auftrag)
    fehler = pruefe(text)
    if not fehler:
        return text, None
    print(f"erster Entwurf beanstandet: {fehler}")
    zweiter = claude(e, f"{auftrag}\n\nDein erster Entwurf war:\n{text}\n\n"
                        f"Daran stimmt etwas nicht: {fehler}\nSchreib ihn neu.")
    return zweiter, pruefe(zweiter)


# ── Was heute wirklich passiert ist ─────────────────────────────────────────

def tagesfakten(e):
    """Zahlen und Trades des Tages — die einzige Quelle fuer den Rueckblick."""
    heute_wien = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).date()
    von, bis = dr.wien_tag(heute_wien.isoformat())
    bericht = dr.report(von, bis, env=ENV)
    trades = [t for t in tc.baue_trades(tc.lade_verlauf(e, stunden=20))
              if t["hits"] or t["zu"] == "stop"]

    erlaubt = set()
    for schluessel in ("signale", "tp_pips", "sl_pips", "be_anzahl", "unklar"):
        w = bericht.get(schluessel)
        if isinstance(w, (int, float)):
            erlaubt.add(int(w))

    zeilen = []
    for t in trades:
        p = tc.ergebnis_pips(t)
        ziel = t["tps"].get(t["max_tp"])
        for w in (t["entry"], t["sl"], ziel, p):
            if isinstance(w, (int, float)):
                erlaubt.add(int(abs(w)))
        # Die Uhrzeit gehoert zu den belegten Angaben — "stopped out at 13:20"
        # ist nachpruefbar und macht den Post konkret. Ohne diese Zeile hielt
        # die Zahlenschranke den ersten Entwurf wegen "20" und "28" an.
        for stempel in (t["zeit"], t["letzte"]):
            for teil in (stempel[11:13], stempel[14:16]):
                if teil.isdigit():
                    erlaubt.add(int(teil))
        zeilen.append(
            f"- {t['paar']} {t['richtung']}, Einstieg {t['entry']}, "
            + (f"Ziel {ziel}, " if ziel else "")
            + (f"Stop {t['sl']}, " if t["zu"] == "stop" else "")
            + f"Ausgang: {'ausgestoppt' if t['zu'] == 'stop' else 'im Plus'}"
            + (f" ({p:+d} Pips)" if p is not None else "")
            # Beide Zeiten, nicht nur die Eroeffnung: der erste Entwurf schrieb
            # "11:34 stopped out" — das war die Uhrzeit des EINSTIEGS, der Stop
            # fiel 17 Minuten spaeter.
            + f", eroeffnet {t['zeit'][11:16]} UTC, Ausgang {t['letzte'][11:16]} UTC")
    return heute_wien, bericht, zeilen, erlaubt


def rueckblick_auftrag(e):
    heute, bericht, zeilen, erlaubt = tagesfakten(e)
    if not zeilen:
        return None, set(), "", "kein Trade mit belegtem Ausgang — kein Post"
    verlierer = sum(1 for z in zeilen if "ausgestoppt" in z)
    gewinner = len(zeilen) - verlierer
    erlaubt |= {len(zeilen), gewinner, verlierer}
    auftrag = (
        "Schreib den Abendpost fuer den Info-Kanal — so, wie ein Trader abends noch kurz in "
        "seine Gruppe schreibt, nicht wie ein Bericht.\n\n"
        "Aufgabe: Nimm GENAU EINEN Trade von unten als Aufhaenger und erzaehl in zwei, drei "
        "Zeilen, was an ihm heute interessant war. Dann EINE Zeile, die der Leser mitnimmt. "
        "Die Tagessumme steht schon auf der Bilanzkarte — nicht wiederholen.\n\n"
        f"{FORM}\n\n"
        f"Heute ({heute.isoformat()}, ein {heute.strftime('%A')}) am Desk:\n"
        f"Signale: {bericht.get('signale')}, Pips im Plus: {bericht.get('tp_pips')}, "
        f"Pips im Minus: {bericht.get('sl_pips')}, "
        f"ohne bekannten Ausgang: {bericht.get('unklar')}\n\n"
        "Trades mit belegtem Ausgang:\n" + "\n".join(zeilen) + "\n\n"
        f"Von diesen {len(zeilen)} Trades sind {gewinner} im Plus geschlossen und "
        f"{verlierer} ausgestoppt worden. Alle uebrigen Signale des Tages haben "
        "KEINEN bekannten Ausgang — sie duerfen weder als Gewinner noch als "
        "Verlierer dargestellt werden. Schreib nichts, was ueber diese Aufteilung "
        "hinausgeht.\n\n"
        "Du darfst AUSSCHLIESSLICH diese Zahlen verwenden. Keine anderen.")
    # Der Wochentag steht ausdruecklich drin. Am 10.09. (Donnerstag) schrieb
    # der Rueckblick "it's just Tuesday" — das Faktenblatt hatte nur das
    # Datum, und weder Schreiber noch Pruefer haben daraus den Tag gerechnet.
    wochentag = heute.strftime("%A")
    fakten = (f"Tag {heute.isoformat()} ({wochentag}), alle Zeiten UTC. "
              f"Signale gesamt: {bericht.get('signale')}. "
              f"{gewinner} Trades im Plus geschlossen, {verlierer} ausgestoppt, "
              f"der Rest ohne bekannten Ausgang.\n" + "\n".join(zeilen))
    return auftrag, erlaubt, fakten, None


BLICKWINKEL = [
    "WAS DRIN IST: In der VIP-Gruppe kommt jedes Signal live, mit Einstieg, Stop und Zielen, "
    "dazu die komplette Academy. Kostet nichts — man finanziert nur sein eigenes Konto beim "
    "Partner-Broker, das Geld bleibt einem und ist jederzeit abhebbar.",
    "SO KOMMST DU REIN, in drei Schritten mit 1️⃣2️⃣3️⃣: angepinnte Nachricht antippen und "
    "abschicken, der Bot fuehrt durch, Konto beim Partner-Broker finanzieren — dann ist VIP "
    "und die Academy offen.",
    "WARUM DIE KARTEN HIER ECHT SIND: Jede Ergebnis-Karte in diesem Kanal gehoert zu einem "
    "Signal, das VORHER live in VIP stand. Wer die Karte sieht, war zu spaet — in VIP kommt "
    "es, bevor es passiert.",
    "FUER WEN ES NICHTS IST: wer eine Garantie will, wer nie selbst hinschaut. Ehrlich gesagt, "
    "kurz. Und dann, fuer alle anderen, wie man reinkommt.",
]


# Was der Faktencheck bei VIP-Posts als belegt gelten laesst — dieselben
# Aussagen, die der Setter-Bot jedem Lead macht (script.PITCH_PARTS). Ohne diese
# Liste haette der Pruefer jede Produktaussage als "unbelegt" abgelehnt.
VIP_FAKTEN = (
    "VIP-Gruppe: jedes Signal kommt live, immer mit Einstieg, Stop-Loss und Take-Profit. "
    "Die komplette Trading-Academy ist dabei. Es kostet nichts; man finanziert nur sein "
    "eigenes Konto beim Partner-Broker, das Geld bleibt dem Kunden und ist jederzeit abhebbar. "
    "Zugang: angepinnte Nachricht im Kanal antippen, abschicken, der Bot fuehrt durch, nach der "
    "Einzahlung werden VIP und Academy freigeschaltet. Jede Ergebnis-Karte im Kanal gehoert zu "
    "einem Signal, das vorher live in VIP stand. Es gibt keine Gewinngarantie.")


def vip_auftrag(runde):
    return ("Schreib einen Post fuer den Info-Kanal, der Leute in die kostenlose VIP-Gruppe holt.\n\n"
            f"Inhalt diesmal: {BLICKWINKEL[runde % len(BLICKWINKEL)]}\n\n"
            f"{FORM}\n\n"
            "Letzte Zeile: ein kurzer, lockerer Hinweis auf die angepinnte Nachricht oben "
            "(z. B. 'Tap the pinned message 👆'). Das ist der Zweck des Posts — ohne ihn weiss "
            "niemand, was er tun soll. Keine Preise, keine Pips, keine Prozente.")


# ── Queue ───────────────────────────────────────────────────────────────────

def darf_jetzt(queue, heute):
    """Zwei Texte am Tag, und nie unmittelbar hinter einem anderen Post."""
    heutige = [p for p in queue
               if str(p.get("quelle", "")).startswith("cosmo_text")
               and str(p.get("at", "")).startswith(heute)]
    if len(heutige) >= MAX_PRO_TAG:
        return False, f"Tageslimit {MAX_PRO_TAG} erreicht"
    zeiten = [p.get("at") for p in queue if str(p.get("at", "")).startswith("20")]
    if zeiten:
        try:
            alter = (datetime.datetime.utcnow() - datetime.datetime.strptime(
                max(zeiten), "%Y-%m-%dT%H:%M:%SZ")).total_seconds()
            if alter < ABSTAND_STUNDEN * 3600:
                return False, f"letzter Post vor {alter / 3600:.1f} h — Abstand ist {ABSTAND_STUNDEN} h"
        except ValueError:
            pass
    return True, ""


def einreihen(text, quelle):
    """Mit "verified": die Pruefung ist hier schon gelaufen — und zwar mit dem
    richtigen Kontext.

    Anfangs gingen die Texte OHNE diese Marke in die Queue, damit brain.pruefe()
    beim Senden noch einmal drueberschaut. Am 09.09. hat sich gezeigt, dass das
    beide Richtungen verfehlt: brain sieht nur die letzten acht Rohzeilen des
    Desks, haelt deshalb einen korrekten Rueckblick fuer erfunden — und liess
    ihn trotzdem durch, weil ihre Antwort abgeschnitten war. Die echte Pruefung
    ist jetzt faktencheck() oben, gegen dasselbe Faktenblatt, das der Schreiber
    hatte.
    """
    queue = json.load(open(f"{BASE}/queue.json"))
    queue.append({"at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                  "type": "text", "quelle": quelle, "text": text, "verified": True})
    tmp = f"{BASE}/queue.json.tmp"
    json.dump(queue, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, f"{BASE}/queue.json")
    return len(queue) - 1


def main():
    trocken = "--trocken" in sys.argv
    e = env()
    stand = json.load(open(STATE)) if os.path.exists(STATE) else {}
    heute = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    art = "vip" if "--vip" in sys.argv else "rueckblick"

    if stand.get(f"{art}_datum") == heute and not trocken:
        print(f"{art}: heute schon gemacht")
        return

    if art == "vip":
        letzte = stand.get("vip_datum")
        if letzte and not trocken:
            tage = (datetime.date.fromisoformat(heute) - datetime.date.fromisoformat(letzte)).days
            if tage < 3:
                print(f"letzter VIP-Post vor {tage} Tag(en) — Abstand ist 3")
                return
        auftrag, erlaubt, fakten = vip_auftrag(stand.get("vip_runde", 0)), set(), VIP_FAKTEN
    else:
        auftrag, erlaubt, fakten, grund = rueckblick_auftrag(e)
        if grund:
            print(grund)
            return

    text, fehler = erzeuge(e, auftrag, erlaubt, fakten)
    if fehler:
        print(f"ABGELEHNT nach zwei Versuchen — {fehler}\n---\n{text}")
        ops_melden(e, f"⚠️ Cosmo-Text ({art}) abgelehnt: {fehler}\n\n{text}")
        return

    if trocken:
        print(f"--- TROCKEN ({art}) ---\n{text}\n--- {len(text)} Zeichen, "
              f"{len([z for z in text.splitlines() if z.strip()])} Zeilen, Zahlen belegt ---")
        return

    frei, warum = darf_jetzt(json.load(open(f"{BASE}/queue.json")), heute)
    if not frei:
        print(f"nicht eingereiht: {warum}")
        return

    idx = einreihen(text, f"cosmo_text {art} {heute}")
    stand[f"{art}_datum"] = heute
    if art == "vip":
        stand["vip_runde"] = stand.get("vip_runde", 0) + 1
    json.dump(stand, open(STATE, "w"), indent=1)
    print(f"eingereiht als #{idx}:\n{text}")
    ops_melden(e, f"🪐 Cosmo-Text in der Queue (#{idx}, {art}), Fakten geprueft:\n\n{text}")


if __name__ == "__main__":
    main()
