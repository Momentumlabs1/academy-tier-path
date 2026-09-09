"""Saeule 4 des Info-Kanals: die Live-Karte, wenn ein Signal aufgeht.

Diego, 05.09.: "nicht als Trade, sondern als Info: wir haben einen neuen Trade,
komm jetzt in den VIP". Laeuft per Cron alle 2 Minuten, liest neue Zeilen aus
signal_relays und legt fuer ein NEUES SIGNAL eine verdeckte Karte in die
Poster-Queue. Gesendet wird nur von poster.py.

WAS HIER AM 09.09. WEGGEFALLEN IST
Der Treffer-Zweig. Dieses Modul druckte "TARGET REACHED", und zehn Minuten
spaeter druckte trade_card.py "TP1 hit" zum selben Ereignis — ein Trade, zwei
Karten, und die Tagesbilanz sah nach doppelt so viel Handel aus wie
stattgefunden hat. Ergebnisse gehoeren jetzt ausschliesslich trade_card.py,
das je Trade EINE Karte fuehrt und sie nachtraegt statt zu verdoppeln.

Schlimmer noch war, WORAUF der Treffer-Zweig ansprang: auf "50 Pips Profit /
SL auf Breakeven ziehen" (09.09. 09:50). Das ist eine Anweisung an die
zahlende Gruppe, kein erreichtes Ziel — und sie ging als Erfolgskarte an
Kunden. Was Ereignis ist und was Anweisung, entscheidet ab jetzt desk_filter,
an einer Stelle fuer alle.

Nicht ueberladen: hoechstens 4 Live-Karten pro Tag, mindestens 15 Minuten
Abstand. Die Live-Karte ist die Werbung, die Ergebniskarte der Beweis — vom
Beweis darf mehr kommen als von der Werbung. Beim allerersten Lauf wird nur
der Stand gemerkt.
"""
import json, os, re, sys, datetime, urllib.request, urllib.parse

BASE = "/opt/cc-infoqueue"
import trade_card
STATE = f"{BASE}/teaser_state.json"
MAX_PRO_TAG = 4
ABSTAND_MIN = 15

sys.path.insert(0, BASE)
import desk_filter as df

def env():
    e = {}
    for line in open("/opt/cosmos-setter/.env"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            e[k] = v.strip().strip('"')
    return e


def relays_ab(e, seit_iso):
    """Alle Desk-Nachrichten nach dem Zeitstempel (id ist keine laufende Zahl)."""
    sk = e["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        f"{e['SUPABASE_URL']}/rest/v1/signal_relays?select=id,preview,created_at"
        f"&created_at=gt.{urllib.parse.quote(seit_iso)}&order=created_at.asc&limit=50",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    return json.load(urllib.request.urlopen(req, timeout=20))


def juengste(e):
    sk = e["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        f"{e['SUPABASE_URL']}/rest/v1/signal_relays?select=created_at&order=created_at.desc&limit=1",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    top = json.load(urllib.request.urlopen(req, timeout=20))
    return top[0]["created_at"] if top else "2026-01-01T00:00:00+00:00"


def instrument(t):
    if re.search(r"xau|gold", t, re.I): return "Gold"
    if re.search(r"nas|us100|ndx|nasdaq", t, re.I): return "NASDAQ"
    if re.search(r"btc|bitcoin", t, re.I): return "Bitcoin"
    return "market"


def _zeit(iso: str):
    """Zeitstempel aus Postgres lesen, auch mit krummen Sekundenbruchteilen.

    Python 3.9 akzeptiert bei fromisoformat NUR drei oder sechs Nachkommastellen.
    Postgres liefert aber, was anfaellt — "2026-09-07T17:14:23.08905+00:00" hat
    fuenf, und der Aufruf wirft. Der ganze Lauf brach dann ab, und zwar STILL:
    zu genau diesen Signalen ist nie ein Teaser erschienen, ohne dass es
    irgendwo aufgefallen waere.
    """
    import re as _re
    t = iso.replace("Z", "+00:00")
    m = _re.search(r"\.(\d+)", t)
    if m:
        t = t.replace("." + m.group(1), "." + (m.group(1) + "000000")[:6])
    return datetime.datetime.fromisoformat(t).replace(tzinfo=None)


def main():
    e = env()
    state = json.load(open(STATE)) if os.path.exists(STATE) else {}
    queue = json.load(open(f"{BASE}/queue.json"))
    jetzt = datetime.datetime.utcnow()

    if "seit" not in state:
        # Erstlauf: nur den Stand merken, keine Teaser fuer Altes
        state["seit"] = juengste(e)
        json.dump(state, open(STATE, "w"))
        print("Erstlauf, Stand gemerkt:", state["seit"])
        return

    heute = jetzt.strftime("%Y-%m-%d")
    heutige = [p for p in queue if p.get("quelle", "").startswith("teaser ") and p.get("at", "").startswith(heute)]
    letzter = max([p["at"] for p in heutige], default=None)

    neu = []
    for r in relays_ab(e, state["seit"]):
        state["seit"] = r["created_at"]
        t = r.get("preview") or ""
        alter_min = (jetzt - _zeit(r["created_at"])).total_seconds() / 60
        # Aelter als eine halbe Stunde ist keine Live-Meldung mehr. Das kommt
        # vor, wenn der Cron stand oder der Reader nachliefert.
        if alter_min > 30:
            continue
        if df.klassifiziere(t) != "signal":
            continue

        inst = instrument(t)
        richtung = "short" if re.search(r"\bsell\b", t, re.I) else "long"
        karte = f"live-{r['id'][:8]}.png"
        trade_card.render_teaser(inst, richtung,
                                 jetzt.strftime("%d.%m.%Y \u00b7 %H:%M UTC"),
                                 f"{BASE}/media/{karte}")
        bild = karte
        # Keine Bildunterschrift: auf der Karte steht bereits "LIVE IN VIP" und
        # "Entry, stop and targets are in VIP right now.". Ein Text darunter
        # sagt dasselbe ein zweites Mal und kostet nur Platz.
        text = ""
        state["letzter_trade"] = {"inst": inst, "richtung": richtung, "zeit": jetzt.isoformat()}

        # Verworfenes wird benannt, nicht verschwiegen: eine stille Obergrenze
        # sieht im Log genauso aus wie "es kam nichts vom Desk".
        if len(heutige) + len(neu) >= MAX_PRO_TAG:
            print(f"Tageslimit {MAX_PRO_TAG} erreicht — Live-Karte verworfen: {inst} {richtung}")
            continue
        if letzter and (jetzt - datetime.datetime.strptime(letzter, "%Y-%m-%dT%H:%M:%SZ")).total_seconds() < ABSTAND_MIN * 60:
            print(f"Abstand unter {ABSTAND_MIN} min — Live-Karte verworfen: {inst} {richtung}")
            continue
        at = jetzt.strftime("%Y-%m-%dT%H:%M:%SZ")
        neu.append({"at": at, "verified": True, "type": "photo",
                    "file": bild, "caption": "",
                    "quelle": f"teaser relay {r['id']}"})
        letzter = at

    json.dump(state, open(STATE, "w"))
    if neu:
        queue.extend(neu)
        json.dump(queue, open(f"{BASE}/queue.json", "w"), ensure_ascii=False, indent=1)
        print(f"{len(neu)} Teaser in die Queue gelegt")


if __name__ == "__main__":
    main()
