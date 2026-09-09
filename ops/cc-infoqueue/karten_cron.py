"""Saeulen 2+3 des Info-Kanals: Tages- und Wochenkarte aus den ECHTEN Desk-Signalen.

Laeuft per Cron Mo–Fr 21:35 Wien (19:35 UTC). Rechnet mit desk_report.py die Karte
des Tages aus (jede Zahl hat eine Belegzeile aus signal_relays) und haengt sie an
/opt/cc-infoqueue/queue.json — gesendet wird ausschliesslich von poster.py, wie
jeder andere Kanal-Post. Freitags kommt zusaetzlich die Wochenkarte.

Kein Signal am Tag -> keine Karte (Vorfall 02.09.: nie Trades behaupten, die es
nicht gab). Der strenge Boden ohne Zuordnungs-Heuristik wird mitgeloggt, damit
Diego bei Rueckfragen beide Zahlen hat.
"""
import json, os, sys, datetime
sys.path.insert(0, "/opt/cc-infoqueue")
import desk_report as d

BASE = "/opt/cc-infoqueue"
LOG = f"{BASE}/karten.log"


import sys as _sys; _sys.path.insert(0, '/opt/cc-infoqueue')
import trade_card as _tc


def nichts_abgeschlossen(r):
    """Hat KEIN Trade einen Ausgang, ist das keine Bilanz.

    Am 08.09. genau so passiert: der Reader war sechs Stunden tot, die
    Einstiege waren vorher durchgekommen, die Ergebnisse fielen in die Luecke.
    Der Bericht las sich als "5 Signale, 0 TP, 0 SL" — im Kanal sieht das aus
    wie ein Totalausfall am Desk, obwohl der Desk gut gelaufen ist.

    Eine Zahl, die nur unsere eigene Blindheit misst, gehoert nicht in den
    Kanal. Lieber kein Tagesbericht als ein falscher.
    """
    return (r.get("tp_pips") or 0) == 0 and (r.get("sl_pips") or 0) == 0 \
        and (r.get("unklar") or 0) >= (r.get("signale") or 0) > 0


def _bilanz_karte(r, kopf, unter, datei):
    """Die Bilanz als Karte statt als Textblock.

    Im Kanal ist inzwischen alles eine Karte; die eine Textnachricht
    dazwischen sah aus, als waere sie vergessen worden. Die Zahlen sind
    dieselben, sie kommen unveraendert aus desk_report.
    """
    return _tc.render_bilanz(kopf, unter, r['signale'], r['tp_pips'],
                            r['sl_pips'], r.get('be_anzahl') or 0,
                            f"/opt/cc-infoqueue/media/{datei}",
                            unklar=r.get('unklar') or 0)


def log(s):
    with open(LOG, "a") as f:
        f.write(datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M ") + s + "\n")
    print(s)


def schon_da(queue, quelle):
    return any(p.get("quelle") == quelle for p in queue)


def main():
    heute_wien = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).date()
    if heute_wien.weekday() > 4:
        return
    queue = json.load(open(f"{BASE}/queue.json"))
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    neu = []

    # Tageskarte
    von, bis = d.wien_tag(heute_wien.isoformat())
    r = d.report(von, bis, env="/opt/cosmos-setter/.env")
    r0 = d.report(von, bis, env="/opt/cosmos-setter/.env", frisch_minuten=0)
    k = d.karte_tag(r)
    quelle = f"desk_report tag {heute_wien.isoformat()}"
    # VOR der Bedingung, nicht darin: ein k=None mitten im Block haette die
    # Karte trotzdem gebaut und mit leerer Unterschrift verschickt.
    if k and nichts_abgeschlossen(r):
        log(f"TAG {heute_wien}: {r['signale']} Signale, aber kein einziger Ausgang bekannt -> keine Karte")
        k = None
    if k and not schon_da(queue, quelle):
        datei = f"bilanz-tag-{heute_wien.isoformat()}.png"
        _bilanz_karte(r, "TODAY'S RESULT",
                      heute_wien.strftime("%A %d.%m.%Y") + (f" · {r['instrument']}" if r.get("instrument") else ""),
                      datei)
        neu.append({"at": now, "type": "photo", "verified": True, "quelle": quelle,
                    "file": datei, "caption": k})
        log(f"TAG {heute_wien}: {r['signale']} Sig / {r['tp_pips']} TP / {r['sl_pips']} SL / {r['unklar']} unklar"
            f" | Boden: {r0['tp_pips']} TP / {r0['sl_pips']} SL / {r0['unklar']} unklar")
    elif not k:
        log(f"TAG {heute_wien}: keine Signale -> keine Karte")

    # Wochenkarte am Freitag
    if heute_wien.weekday() == 4:
        montag = heute_wien - datetime.timedelta(days=4)
        von, bis = d.wien_woche(montag.isoformat())
        r = d.report(von, bis, env="/opt/cosmos-setter/.env")
        r0 = d.report(von, bis, env="/opt/cosmos-setter/.env", frisch_minuten=0)
        k = d.karte_woche(r)
        if k and nichts_abgeschlossen(r):
            log(f"WOCHE ab {montag}: kein einziger Ausgang bekannt -> keine Karte")
            k = None
        quelle = f"desk_report woche {montag.isoformat()}"
        if k and not schon_da(queue, quelle):
            spaeter = (datetime.datetime.utcnow() + datetime.timedelta(minutes=12)).strftime("%Y-%m-%dT%H:%M:%SZ")
            datei = f"bilanz-woche-{montag.isoformat()}.png"
            _bilanz_karte(r, "WEEKLY REPORT",
                          f"{montag.strftime('%d.%m.')} – {heute_wien.strftime('%d.%m.%Y')}"
                          + (f" · {r['instrument']}" if r.get("instrument") else ""),
                          datei)
            neu.append({"at": spaeter, "type": "photo", "verified": True, "quelle": quelle,
                        "file": datei, "caption": k})
            log(f"WOCHE ab {montag}: {r['signale']} Sig / {r['tp_pips']} TP / {r['sl_pips']} SL / {r['unklar']} unklar"
                f" | Boden: {r0['tp_pips']} TP / {r0['sl_pips']} SL / {r0['unklar']} unklar")

    if neu:
        queue.extend(neu)
        json.dump(queue, open(f"{BASE}/queue.json", "w"), ensure_ascii=False, indent=1)
        log(f"{len(neu)} Karte(n) in die Queue gelegt")


if __name__ == "__main__":
    main()
