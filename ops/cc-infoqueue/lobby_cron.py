#!/usr/bin/env python3
"""Der menschliche Teil: aus Tims Lobby in den Cosmos-Info-Kanal.

WARUM ES DAS GIBT
Ansage Diego 10.09., in Grossbuchstaben: "Es geht um die Info-Gruppe von Tim
und den menschlichen Input, den er reinschickt — bei uns waren heute nur
Signalkarten."

Gemessen war das genau so. In Tims Lobby standen am 10.09. ein Runner-Chart mit
"Kleiner Runner noch am laufen 😎🔥", zwei Kontoauszuege, "PPI heute, CPI
morgen — der Markt koennte volatil werden", eine Kundennachricht. Bei uns: vier
Karten. Der Leser hoerte die Lobby schlicht nicht mit. Seit dem 10.09. legt er
jeden eigenen Post von Tim in lobby_inbox/ ab; diese Datei entscheidet, was
davon zu uns passt, und uebersetzt es.

WAS UEBERNOMMEN WIRD
  kontoauszug   MT5-Positionen/Deals mit Gewinn  -> Bild wie es ist, Tims Satz uebersetzt
  chart         Chart eines laufenden Trades     -> Bild wie es ist, Tims Satz uebersetzt
  kundennachricht  Screenshot einer Kundennachricht -> Zitatkarte im Cosmo-Look
  markt         Text zu News, Session, Marktlage -> Text, uebersetzt
  stimmung      kurzer Satz zum Tag/Trade        -> Text, uebersetzt

WAS BEWUSST NICHT UEBERNOMMEN WIRD
  privat   Tims Leben (Auto, Gym, Reisen). Cosmo ist ein Maskottchen, kein
           Mensch mit Tiefgarage; Tims Privatfotos unter unserem Namen
           waeren eine fremde Person, die sich als wir ausgibt.
  werbung  Tims eigene VIP-Werbung, SEINE Academy/Kurse, Links, sein Name — sein
           Trichter, nicht unserer. Ansage Diego 11.09.: "er wird auch welche
           reinschicken ueber seine Academy oder private Nachrichten oder Bilder
           von seinen Autos — die alle nicht uebernehmen." Erwartete Quote:
           50-70 % seiner Posts, gemessen am 09./10.09.: 8 von 13 = 62 %.
  emoji    "✅😎" allein. Neben Tims Screenshot ergibt das Sinn, bei uns nicht.
  meme     Witzbilder, Vergleiche, Collagen — auch wenn ein Chart darin steckt.
           Am 10.09. um 00:20 ging so ein Meme ("What other people see / What
           I see") als "chart" raus; die Kategorie fehlte schlicht.
  Weitergeleitetes aus Tims VIP filtert schon der Leser weg: dafuer gibt es
  unsere eigenen Karten.

KUNDENNACHRICHTEN — die eine harte Regel
Woertlich, nur uebersetzt, ohne Namen. Das Anschreiben ("Hey Tim") faellt weg,
wird aber NIE auf Cosmo umgeschrieben, und es wird nie eine Nachricht
erfunden. Eine umadressierte Kundenstimme ist eine gefaelschte Bewertung — in
der EU ausdruecklich verboten und in Trading-Werbung ein echtes Risiko. Die
Zitatkarte sagt deshalb auch nur, was stimmt: "a trader following the desk".

Gesendet wird wie immer nur von poster.py.
"""
import base64, json, os, re, sys, glob, shutil, datetime, urllib.request

BASE = "/opt/cc-infoqueue"
sys.path.insert(0, BASE)
import trade_card as tc

INBOX = f"{BASE}/lobby_inbox"
ERLEDIGT = f"{INBOX}/erledigt"
MEDIA = f"{BASE}/media"
MAX_PRO_TAG = 6
ABSTAND_MIN = 15
MAX_ALTER_H = 3     # was laenger liegt, ist keine Nachricht mehr, sondern Archiv

ARTEN_BILD = ("kontoauszug", "chart", "meme", "kundennachricht", "privat", "werbung", "sonstig")
ARTEN_TEXT = ("markt", "stimmung", "werbung", "emoji", "privat", "sonstig")


def claude(e, inhalt, max_tokens=700):
    key = tc.rest(e, "app_secrets?key=eq.ANTHROPIC_API_KEY&select=value")[0]["value"]
    body = json.dumps({"model": "claude-sonnet-5", "max_tokens": max_tokens,
                       "messages": [{"role": "user", "content": inhalt}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, method="POST",
                                 headers={"Content-Type": "application/json", "x-api-key": key,
                                          "anthropic-version": "2023-06-01"})
    d = json.load(urllib.request.urlopen(req, timeout=90))
    roh = "".join(b.get("text", "") for b in d.get("content", []) if b.get("type") == "text")
    a, b = roh.find("{"), roh.rfind("}")
    return json.loads(roh[a:b + 1])


REGELN = (
    "Uebersetzungsregeln: ENGLISCH, sinngetreu, im Ton des Originals (locker, knapp, "
    "Emojis des Originals duerfen bleiben). Jede Zahl bleibt exakt wie im Original — "
    "keine neue Zahl, keine gerundete, keine weggelassene. Kein Name (auch nicht 'Tim'), "
    "kein @Name, kein Link, keine Telefonnummer. Nichts hinzudichten, nichts werblicher "
    "machen als das Original.")


def bewerte_bild(e, pfad, text):
    b64 = base64.b64encode(open(pfad, "rb").read()).decode()
    auftrag = (
        "Das Bild stammt aus dem oeffentlichen Kanal eines Trading-Desks. Ordne es EINER Art zu:\n"
        "kontoauszug = ein ECHTER Screenshot einer Broker-App mit Positionen/Deals/Gewinn\n"
        "chart = ein ECHTER, roher Screenshot einer Trading-Plattform mit einem Kurschart — "
        "so wie ein Trader ihn selbst abfotografiert, ohne Witz-Text und ohne Collage\n"
        "meme = alles, was als Witz, Vergleich oder Grafik gebaut ist: Memes, Vorher/Nachher, "
        "'what people see / what I see', Hand haelt ein Handy, Stockfoto, Collage, Text-"
        "Ueberschriften im Bild — AUCH WENN darin ein Chart vorkommt\n"
        "kundennachricht = Screenshot einer Nachricht eines Kunden an den Desk\n"
        "privat = Privatleben (Auto, Essen, Gym, Reisen, Personen)\n"
        "werbung = Werbegrafik, Rabatt, Link-Aufforderung, und alles zu einer EIGENEN Academy, "
        "einem Kurs, Coaching oder Mentoring des Desks\n"
        "sonstig = alles andere\n\n"
        f"Bildunterschrift des Desks (deutsch, darf leer sein): {text!r}\n\n"
        f"{REGELN}\n\n"
        "Antworte NUR mit JSON:\n"
        '{"art": "...", "unterschrift_en": "Uebersetzung der Bildunterschrift oder leer", '
        '"zitat_de": "bei kundennachricht: der Nachrichtentext WOERTLICH, ohne Anrede an eine Person, sonst leer", '
        '"zitat_en": "bei kundennachricht: dieselbe Nachricht treu uebersetzt, ohne Emojis, ohne Anrede, sonst leer"}')
    return claude(e, [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
                      {"type": "text", "text": auftrag}])


def bewerte_text(e, text):
    auftrag = (
        "Ein Text aus dem oeffentlichen Kanal eines Trading-Desks. Ordne ihn EINER Art zu:\n"
        "markt = News, Termine, Session, Marktlage, Volatilitaet\n"
        "stimmung = kurzer persoenlicher Satz zum Handelstag oder zu einem Trade\n"
        "werbung = Werbung fuer eine VIP-Gruppe, Preise, Links, Aufforderung beizutreten, und "
        "alles zu einer EIGENEN Academy, einem Kurs, Coaching oder Mentoring des Desks\n"
        "emoji = nur Emojis oder ein einzelnes Wort ohne Inhalt\n"
        "privat = Privatleben\n"
        "sonstig = alles andere, auch Saetze, die ohne ein Bild daneben keinen Sinn ergeben "
        "(z. B. 'Noch einer')\n\n"
        f"Text: {text!r}\n\n{REGELN}\n\n"
        'Antworte NUR mit JSON: {"art": "...", "en": "Uebersetzung oder leer"}')
    return claude(e, [{"type": "text", "text": auftrag}], max_tokens=500)


def zahlen(t):
    return sorted(re.sub(r"[\s.,]", "", z) for z in re.findall(r"\d[\d\s.,]*\d|\d", t or ""))


def treu(de, en):
    """Stehen im Englischen genau die Zahlen des Originals? Sonst ist die
    Uebersetzung keine Uebersetzung mehr."""
    return zahlen(de) == zahlen(en)


def sauber(en):
    return not re.search(r"\btim\b|@\w|t\.me/|https?://|\+?\d[\d\s]{8,}", en or "", re.I)


NACHT_WIEN = (22, 7)   # von 22 bis 7 Uhr Wiener Zeit geht nichts aus der Lobby raus


def darf_jetzt(queue, jetzt):
    # Nachtruhe. Am 10.09. um 00:16 postete Tim ein Meme in seine Lobby, und
    # um 00:20 stand es bei uns — ein Kanal, der um Mitternacht Bilder
    # verschickt, wirkt wie ein Bot. Was nachts kommt, ist bis zum Morgen aelter
    # als MAX_ALTER_H und verfaellt; das ist gewollt.
    stunde_wien = (jetzt + datetime.timedelta(hours=2)).hour
    von, bis = NACHT_WIEN
    if stunde_wien >= von or stunde_wien < bis:
        return False, "Nachtruhe"
    heute = jetzt.strftime("%Y-%m-%d")
    heutige = [p for p in queue if str(p.get("quelle", "")).startswith("lobby ")
               and str(p.get("at", "")).startswith(heute)]
    if len(heutige) >= MAX_PRO_TAG:
        return False, f"Tageslimit {MAX_PRO_TAG}"
    if heutige:
        zuletzt = max(p["at"] for p in heutige)
        alter = (jetzt - datetime.datetime.strptime(zuletzt, "%Y-%m-%dT%H:%M:%SZ")).total_seconds()
        if alter < ABSTAND_MIN * 60:
            return False, f"Abstand unter {ABSTAND_MIN} min"
    return True, ""


def eintrag_fuer(e, meta, trocken=False):
    """Lobby-Post -> Queue-Eintrag, oder (None, Grund)."""
    text = meta.get("text") or ""
    if meta.get("foto"):
        urteil = bewerte_bild(e, meta["foto"], text)
        art = urteil.get("art")
        if art in ("kontoauszug", "chart"):
            unter = (urteil.get("unterschrift_en") or "").strip()
            if text.strip() and not treu(text, unter):
                return None, f"{art}: Uebersetzung aendert Zahlen ({text!r} -> {unter!r})"
            if unter and not sauber(unter):
                return None, f"{art}: Name/Link in der Unterschrift"
            datei = f"lobby-{meta['id']}.jpg"
            if not trocken:
                shutil.copy(meta["foto"], f"{MEDIA}/{datei}")
            return {"type": "photo", "file": datei, "caption": unter}, f"{art}: {unter or '(ohne Satz)'}"
        if art == "kundennachricht":
            de, en = (urteil.get("zitat_de") or "").strip(), (urteil.get("zitat_en") or "").strip()
            if not en or not treu(de, en):
                return None, f"kundennachricht: Zitat unklar oder Zahlen weichen ab ({de!r} -> {en!r})"
            if not sauber(en):
                return None, "kundennachricht: Name/Link im Zitat"
            if len(en) > 240:
                return None, f"kundennachricht: zu lang fuer eine Karte ({len(en)} Zeichen)"
            datei = f"zitat-{meta['id']}.png"
            tc.render_zitat(en, f"{MEDIA}/{datei}" if not trocken else f"/tmp/{datei}")
            return {"type": "photo", "file": datei, "caption": ""}, f"kundennachricht: {en}"
        return None, f"{art}: nicht fuer den Cosmos-Kanal"

    urteil = bewerte_text(e, text)
    art, en = urteil.get("art"), (urteil.get("en") or "").strip()
    if art not in ("markt", "stimmung"):
        return None, f"{art}: nicht fuer den Cosmos-Kanal"
    if not en or not treu(text, en):
        return None, f"{art}: Uebersetzung aendert Zahlen ({text!r} -> {en!r})"
    if not sauber(en):
        return None, f"{art}: Name/Link im Text"
    return {"type": "text", "text": en}, f"{art}: {en}"


def main():
    trocken = "--trocken" in sys.argv
    ordner = sys.argv[sys.argv.index("--ordner") + 1] if "--ordner" in sys.argv else INBOX
    e = tc.env()
    jetzt = datetime.datetime.utcnow()
    os.makedirs(ERLEDIGT, exist_ok=True)

    dateien = sorted(glob.glob(f"{ordner}/*.json"),
                     key=lambda p: int(os.path.basename(p).split(".")[0]))
    for pfad in dateien:
        meta = json.load(open(pfad))
        alter_h = (jetzt - tc._zeit(meta["date"]).replace(tzinfo=None)).total_seconds() / 3600
        if alter_h > MAX_ALTER_H and not trocken:
            print(f"#{meta['id']}: {alter_h:.1f} h alt — Archiv, nicht mehr posten")
        else:
            try:
                eintrag, grund = eintrag_fuer(e, meta, trocken)
            except Exception as ex:
                print(f"#{meta['id']}: Bewertung fehlgeschlagen ({ex}) — naechster Lauf versucht es wieder")
                continue
            if eintrag is None:
                print(f"#{meta['id']}: uebersprungen — {grund}")
            elif trocken:
                print(f"#{meta['id']}: WUERDE POSTEN — {grund}")
            else:
                queue = json.load(open(f"{BASE}/queue.json"))
                frei, warum = darf_jetzt(queue, jetzt)
                if not frei:
                    # Nicht abhaken: im naechsten Lauf ist der Abstand vielleicht um.
                    # Das Alterslimit sorgt dafuer, dass nichts ewig nachhaengt.
                    print(f"#{meta['id']}: wartet — {warum}")
                    continue
                eintrag.update({"at": jetzt.strftime("%Y-%m-%dT%H:%M:%SZ"), "verified": True,
                                "quelle": f"lobby {meta['id']}"})
                queue.append(eintrag)
                tmp = f"{BASE}/queue.json.tmp"
                json.dump(queue, open(tmp, "w"), ensure_ascii=False, indent=1)
                os.replace(tmp, f"{BASE}/queue.json")
                print(f"#{meta['id']}: eingereiht als #{len(queue) - 1} — {grund}")
        if not trocken:
            for teil in (pfad, meta.get("foto")):
                if teil and os.path.exists(teil):
                    shutil.move(teil, f"{ERLEDIGT}/{os.path.basename(teil)}")


if __name__ == "__main__":
    main()
