#!/usr/bin/env python3
"""Die Tageskarte — ausgeloest von Tims eigener Tagesbilanz.

Ansage Diego 10.09.: "wieso keine geile Karte mit den Daily Results?!"

Die alte Tageskarte (karten_cron.py) rechnete die Bilanz selbst aus den
Signalen nach und lief stur um 19:35. Sie ist seit dem 09.09. aus — auf ein
Missverstaendnis hin: Diego sagte "kein TP-Profit" (keine Karte je Treffer),
verstanden wurde "kein Tagesprofit".

Diese hier wartet, bis der Desk seine Bilanz selbst postet ("HEUTIGES ERGEBNIS
/ 8 SIGNALE / 1250 TP ✅ / 0 SL ❌ / 0 BE 🛑"), und gestaltet GENAU diese
Zahlen. Die VIP-Mitglieder sehen dieselbe Bilanz im Signalkanal — eine
eigene Nachrechnung daneben waere eine zweite Wahrheit, und die beiden stimmen
nie ueberein (siehe Kanal-Memo: Tims Karten sind aus dem Chat nicht herleitbar).

Laeuft */5. Jede Bilanz genau einmal (Zustand je signal_relays-Zeile).
"""
import json, os, sys, datetime
sys.path.insert(0, "/opt/cc-infoqueue")
import trade_card as tc, desk_filter as df

BASE = "/opt/cc-infoqueue"
STATE = f"{BASE}/bilanz_state.json"


def main():
    e = tc.env()
    stand = json.load(open(STATE)) if os.path.exists(STATE) else {}
    seit = (datetime.datetime.utcnow() - datetime.timedelta(hours=20)).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = tc.rest(e, f"signal_relays?select=id,preview,created_at&created_at=gte.{seit}"
                      f"&order=created_at.asc&limit=300")
    heute_wien = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).date()
    neu = 0
    for r in rows:
        if r["id"] in stand:
            continue
        b = df.lies_bilanz(r.get("preview") or "")
        if not b:
            continue
        wann = tc._zeit(r["created_at"]).astimezone(datetime.timezone(datetime.timedelta(hours=2)))
        if wann.date() != heute_wien:
            stand[r["id"]] = "alt"          # Bilanz eines Vortags: nicht nachtraeglich posten
            continue
        datum = wann.strftime("%A · %d %b %Y")
        datei = f"tagesbilanz-{wann.date().isoformat()}-{r['id'][:6]}.png"
        tc.render_tagesbilanz(b, datum, f"{BASE}/media/{datei}")
        queue = json.load(open(f"{BASE}/queue.json"))
        queue.append({"at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                      "type": "photo", "file": datei, "caption": "", "verified": True,
                      "quelle": f"tagesbilanz {r['id']} — Tims eigene Bilanz, unveraendert"})
        tmp = f"{BASE}/queue.json.tmp"
        json.dump(queue, open(tmp, "w"), ensure_ascii=False, indent=1)
        os.replace(tmp, f"{BASE}/queue.json")
        stand[r["id"]] = datei
        neu += 1
        print(f"Tageskarte eingereiht (#{len(queue) - 1}): {b}")
    json.dump(stand, open(STATE, "w"), indent=1)
    if not neu:
        print("keine neue Bilanz")


if __name__ == "__main__":
    main()
