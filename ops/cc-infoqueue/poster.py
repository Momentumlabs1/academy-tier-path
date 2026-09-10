#!/usr/bin/env python3
"""cc-infoqueue poster — feuert geplante Posts in den CC-Info-Kanal.

Läuft alle 10 Minuten per cron, tut aber NICHTS, solange /opt/cc-infoqueue/ARM
fehlt. Beim Scharfschalten (touch ARM) werden "GO+n"-Zeiten einmalig auf
jetzt+n Minuten aufgelöst — so kommen die ersten drei Posts kurz nacheinander,
der Rest nach Plan. Jeder Post wird nach Erfolg in done.json vermerkt und nie
doppelt gesendet. Bot-Token kommt aus app_secrets (via Service-Key aus der
Setter-.env), damit hier kein Secret auf der Platte dupliziert wird.

VIDEO-MASSE (31.08.2026) — warum die drei Erklaervideos gequetscht ankamen.
Der Upload schickte nur chat_id, caption und die Datei. sendVideo kennt aber
width/height/duration/supports_streaming, und ohne die hat der Client kein
Seitenverhaeltnis: er baut die Blase in einer Standardgroesse und presst das
16:9-Bild hinein, abspielen geht erst nach vollstaendigem Download. An den
Dateien lag es nicht (01/04/06.mp4: 1920x1080, quadratische Pixel, moov vorn).

Die Masse kommen jetzt aus der Datei selbst — mp4_meta() liest moov/mvhd/tkhd
direkt, ohne ffprobe (das ist auf diesem Server nicht installiert und soll es
fuer drei Zahlen auch nicht werden). Steht in queue.json ausdruecklich
width/height/duration, gewinnt das.

MANUELLER EINZELPOST
    poster.py send <index> [chat_id]
Schickt genau einen Eintrag sofort, ohne ARM, ohne Zeitplan, und ohne
done.json anzufassen — fuer den Fall, dass ein Post geloescht und in
richtiger Formatierung neu gesetzt werden muss. Gibt zurueck, was Telegram
gespeichert hat (Breite/Hoehe/Dauer), damit man die Formatierung sieht,
statt sie zu vermuten.
"""
import json, os, sys, datetime, struct, urllib.request, urllib.parse, urllib.error

BASE = "/opt/cc-infoqueue"
CHAT = "-1003894894276"


# ── MP4-Masse ohne ffprobe ───────────────────────────────────────────────────

def _atoms(buf, start, end):
    """Iteriert (typ, payload_start, payload_ende) auf einer Box-Ebene."""
    pos = start
    while pos + 8 <= end:
        size = struct.unpack(">I", buf[pos:pos + 4])[0]
        typ = buf[pos + 4:pos + 8]
        head = 8
        if size == 1:                       # 64-Bit-Groesse
            size = struct.unpack(">Q", buf[pos + 8:pos + 16])[0]
            head = 16
        elif size == 0:                     # bis Dateiende
            size = end - pos
        if size < head:
            return
        yield typ, pos + head, pos + size
        pos += size


def _find_moov(f, size):
    """moov auf der obersten Ebene suchen — per Sprung, nicht per Einlesen.

    Erst las das hier nur die ersten 8 MB. Das genuegt fuer die eigenen
    Exporte (faststart, moov vorne), aber nicht allgemein: bei jeder Datei
    ohne faststart liegt moov am ENDE, und der Parser kam mit leeren Haenden
    zurueck — also wieder ohne Masse und wieder gequetscht. Gegen ffprobe auf
    sechs Dateien geprueft, drei davon mit moov hinten.
    """
    pos = 0
    while pos + 8 <= size:
        f.seek(pos)
        head = f.read(16)
        if len(head) < 8:
            return None
        box = struct.unpack(">I", head[0:4])[0]
        typ = head[4:8]
        skip = 8
        if box == 1:
            box = struct.unpack(">Q", head[8:16])[0]
            skip = 16
        elif box == 0:
            box = size - pos
        if box < skip:
            return None
        if typ == b"moov":
            f.seek(pos + skip)
            return f.read(min(box - skip, 64_000_000))
        pos += box
    return None


def mp4_meta(path):
    """(width, height, duration_s) oder (None, None, None)."""
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            buf = _find_moov(f, size)
        if not buf:
            return None, None, None

        dur = None
        w = h = None
        for typ, s, e in _atoms(buf, 0, len(buf)):
            if typ == b"mvhd":
                ver = buf[s]
                if ver == 1:
                    ts = struct.unpack(">I", buf[s + 20:s + 24])[0]
                    d = struct.unpack(">Q", buf[s + 24:s + 32])[0]
                else:
                    ts = struct.unpack(">I", buf[s + 12:s + 16])[0]
                    d = struct.unpack(">I", buf[s + 16:s + 20])[0]
                if ts:
                    dur = int(round(d / ts))
            elif typ == b"trak":
                for t2, s2, e2 in _atoms(buf, s, e):
                    if t2 != b"tkhd":
                        continue
                    # width/height sind die letzten 8 Bytes der tkhd, als
                    # 16.16-Festkomma — bei v0 wie bei v1.
                    tw = struct.unpack(">I", buf[e2 - 8:e2 - 4])[0] / 65536.0
                    th = struct.unpack(">I", buf[e2 - 4:e2])[0] / 65536.0
                    if tw < 1 or th < 1:
                        continue            # Tonspur: 0x0
                    # Drehmatrix: bei 90/270 Grad zeigt die Datei die Masse
                    # ungedreht an, der Spieler dreht. Dann tauschen.
                    mat = buf[e2 - 44:e2 - 8]
                    a = struct.unpack(">i", mat[0:4])[0]
                    b = struct.unpack(">i", mat[4:8])[0]
                    if a == 0 and b != 0:
                        tw, th = th, tw
                    w, h = int(round(tw)), int(round(th))
        return w, h, dur
    except Exception as e:
        print(f"mp4_meta fehlgeschlagen fuer {path}: {e}", file=sys.stderr)
        return None, None, None


# ── Zugangsdaten ─────────────────────────────────────────────────────────────

def api():
    env = {}
    for line in open("/opt/cosmos-setter/.env"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip().strip('"')
    sk = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    url = env["SUPABASE_URL"]
    req = urllib.request.Request(
        f"{url}/rest/v1/app_secrets?key=eq.TELEGRAM_BOT_TOKEN&select=value",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    token = json.load(urllib.request.urlopen(req))[0]["value"]
    return f"https://api.telegram.org/bot{token}"


# ── Senden ───────────────────────────────────────────────────────────────────

def _sent_ids():
    """Welche Queue-Nummer wurde als welche Telegram-Nachricht gesendet.

    Braucht es, damit eine Karte auf eine frueher gesendete antworten kann —
    done.json haelt nur den Zeitpunkt fest. Eigene Datei, statt done.json zu
    erweitern: dort stehen Zeichenketten, ein geaendertes Format machte den
    bestehenden Bestand unlesbar.
    """
    p = f"{BASE}/sent_ids.json"
    return json.load(open(p)) if os.path.exists(p) else {}


def _multipart(felder, feldname, pfad):
    """Ein Formular mit genau einer Datei — Telegram will multipart."""
    import mimetypes, uuid
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in felder.items():
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n").encode()
    mime = mimetypes.guess_type(pfad)[0] or "application/octet-stream"
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{feldname}\"; "
             f"filename=\"{os.path.basename(pfad)}\"\r\nContent-Type: {mime}\r\n\r\n").encode()
    body += open(pfad, "rb").read() + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def ersetze(p, API, chat=CHAT):
    """Eine bereits gesendete Karte durch eine neue ersetzen.

    WARUM ES DAS GIBT
    Ansage 08.09.: eine Karte je Trade, nicht eine je Teilziel. Faellt spaeter
    TP2, soll der Kanal nicht eine zweite Karte bekommen, sondern dieselbe
    Nachricht soll die neue Zahl tragen. editMessageMedia kann genau das —
    Foto und Bildunterschrift einer bestehenden Nachricht austauschen.

    Schlaegt es fehl (Nachricht geloescht, aelter als 48 h), wird NICHT
    ersatzweise neu gesendet: dann stuende doch wieder eine zweite Karte zum
    selben Trade im Kanal, also genau das, was hier verhindert werden soll.
    """
    mid = _sent_ids().get(str(p["ersetzt_index"]))
    if not mid:
        print(f"ersetzen unmoeglich: zu #{p['ersetzt_index']} ist keine Nachrichten-Nummer bekannt",
              file=sys.stderr)
        return None
    pfad = f"{BASE}/media/{p['file']}"
    medien = json.dumps({"type": "photo", "media": "attach://datei",
                         "caption": p.get("caption", "")})
    body, ctype = _multipart({"chat_id": chat, "message_id": str(mid), "media": medien},
                             "datei", pfad)
    try:
        j = json.load(urllib.request.urlopen(urllib.request.Request(
            f"{API}/editMessageMedia", data=body, headers={"Content-Type": ctype}), timeout=300))
    except urllib.error.HTTPError as ex:
        # Telegram antwortet auf "message to edit not found" mit HTTP 400 —
        # urllib wirft dann, statt die Antwort zurueckzugeben. Als Ausnahme
        # waere das im allgemeinen except des Hauptlaufs gelandet, OHNE den
        # Eintrag abzuhaken: Endlosschleife, Warteschlange steht.
        try:
            j = json.load(ex)
        except Exception:
            j = {"ok": False, "description": str(ex)}
    if not j.get("ok"):
        print(f"editMessageMedia abgelehnt: {j.get('description')}", file=sys.stderr)
        return None
    r = j.get("result")
    return r if isinstance(r, dict) else {"message_id": mid}


def post(p, chat=CHAT, api_base=None):
    """Sendet einen Eintrag. Gibt das Telegram-Ergebnis zurueck (oder None)."""
    API = api_base or api()

    # Ersetzen kommt vor allem anderen: der Eintrag traegt zwar ein Foto,
    # soll aber keine neue Nachricht werden.
    if p.get("ersetzt_index") is not None:
        return ersetze(p, API, chat=chat)

    # Auf welche frueher gesendete Karte geantwortet wird — ERST HIER
    # aufgeloest, nicht beim Einreihen. Der Poster sendet eine Nachricht pro
    # Lauf; zum Zeitpunkt des Einreihens ist die Karte davor oft noch nicht
    # raus. Fehlt sie, geht diese ohne Bezug raus statt gar nicht.
    antwort = None
    if p.get("reply_to_index") is not None:
        antwort = _sent_ids().get(str(p["reply_to_index"]))

    if p["type"] == "text":
        felder = {"chat_id": chat, "text": p["text"]}
        if antwort:
            felder["reply_to_message_id"] = antwort
        data = urllib.parse.urlencode(felder).encode()
        r = urllib.request.urlopen(urllib.request.Request(f"{API}/sendMessage", data=data))
        j = json.load(r)
        return j.get("result") if j.get("ok") else None

    field = "photo" if p["type"] == "photo" else "video"
    path = f"{BASE}/media/{p['file']}"

    fields = {"chat_id": chat, "caption": p.get("caption", "")}
    if antwort:
        fields["reply_to_message_id"] = str(antwort)
    if field == "video":
        # Erst die Angaben aus der Warteschlange, sonst die aus der Datei.
        w = p.get("width")
        h = p.get("height")
        d = p.get("duration")
        if not (w and h and d):
            mw, mh, md = mp4_meta(path)
            w, h, d = w or mw, h or mh, d or md
        if w and h:
            fields["width"] = str(w)
            fields["height"] = str(h)
        if d:
            fields["duration"] = str(d)
        # Ohne das laedt der Empfaenger die ganze Datei, bevor etwas laeuft.
        fields["supports_streaming"] = "true"

    body, ctype = _multipart(fields, field, path)
    req = urllib.request.Request(f"{API}/send{'Photo' if field == 'photo' else 'Video'}", data=body,
                                 headers={"Content-Type": ctype})
    j = json.load(urllib.request.urlopen(req, timeout=300))
    return j.get("result") if j.get("ok") else None


def describe(res):
    """Was Telegram gespeichert hat — die Formatierung, nicht die Absicht."""
    if not res:
        return "kein Ergebnis"
    v = res.get("video")
    if v:
        return (f"message_id={res.get('message_id')} video {v.get('width')}x{v.get('height')} "
                f"{v.get('duration')}s thumb={'ja' if v.get('thumbnail') or v.get('thumb') else 'nein'}")
    return f"message_id={res.get('message_id')}"


def main():
    queue = json.load(open(f"{BASE}/queue.json"))

    # ── Manueller Einzelpost: ohne ARM, ohne Zeitplan, ohne done.json ────────
    if len(sys.argv) > 2 and sys.argv[1] == "send":
        idx = int(sys.argv[2])
        chat = sys.argv[3] if len(sys.argv) > 3 else CHAT
        p = queue[idx]
        if p["type"] == "video":
            print("Datei meldet:", mp4_meta(f"{BASE}/media/{p['file']}"))
        res = post(p, chat=chat)
        print("gesendet:", describe(res))
        return

    if not os.path.exists(f"{BASE}/ARM"):
        sys.exit(0)

    done = json.load(open(f"{BASE}/done.json")) if os.path.exists(f"{BASE}/done.json") else {}
    now = datetime.datetime.now(datetime.timezone.utc)

    # GO+n einmalig in absolute Zeiten aufloesen (Minuten ab Scharfschaltung).
    if any(str(p["at"]).startswith("GO+") for p in queue):
        for p in queue:
            if str(p["at"]).startswith("GO+"):
                mins = int(p["at"][3:])
                p["at"] = (now + datetime.timedelta(minutes=mins)).strftime("%Y-%m-%dT%H:%M:%SZ")
        json.dump(queue, open(f"{BASE}/queue.json", "w"), ensure_ascii=False, indent=1)

    API = api()
    for i, p in enumerate(queue):
        key = str(i)
        if key in done:
            continue
        at = datetime.datetime.fromisoformat(str(p["at"]).replace("Z", "+00:00"))
        if at > now:
            continue
        try:
            # Gehirn-Check: haelt Posts zurueck, die im Trading-/Kanal-Kontext
            # keinen Sinn ergeben (Grund geht in die Admin-Gruppe).
            # Posts mit "verified": true kommen aus desk_report.py (jede Zahl hat
            # eine Belegzeile aus signal_relays) — die brauchen keinen Sinn-Check,
            # und der Check wuerde eine Wochenkarte am Samstag sogar zu Unrecht
            # blocken ("heute keine Trades").
            import brain
            ok_check, grund = (True, "") if p.get("verified") else brain.pruefe(p.get("text") or p.get("caption") or "")
            if not ok_check:
                done[key] = "skipped: " + grund[:120]
                json.dump(done, open(f"{BASE}/done.json", "w"))
                print(f"zurueckgehalten: {key} — {grund}")
                break
            res = post(p, api_base=API)
            if res:
                done[key] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
                json.dump(done, open(f"{BASE}/done.json", "w"))
                # Die Nachrichten-Nummer festhalten, damit eine spaetere Karte
                # darauf antworten kann.
                if res.get("message_id"):
                    ids = _sent_ids()
                    # Auch beim Ersetzen festhalten: die naechste Nachfuehrung
                    # zeigt auf DIESEN Eintrag und muss dieselbe Nachricht
                    # finden.
                    ids[str(key)] = res["message_id"]
                    json.dump(ids, open(f"{BASE}/sent_ids.json", "w"))
                print(f"gepostet: {key} ({p['type']}) {describe(res)}")
            elif p.get("ersetzt_index") is not None:
                # Ein Austausch, der nicht klappt, klappt auch beim naechsten
                # Mal nicht — die Zielnachricht ist geloescht oder zu alt. Ohne
                # diesen Zweig blieb der Eintrag offen, der Poster versuchte es
                # alle zwei Minuten neu, und weil er pro Lauf nur EINEN Eintrag
                # anfasst, stand dahinter die ganze Warteschlange still.
                done[key] = "skipped: ersetzen fehlgeschlagen"
                json.dump(done, open(f"{BASE}/done.json", "w"))
                print(f"uebersprungen: {key} — Zielnachricht nicht mehr ersetzbar", file=sys.stderr)
                continue
            else:
                print(f"FEHLER bei {key}", file=sys.stderr)
        except Exception as e:
            print(f"FEHLER bei {key}: {e}", file=sys.stderr)
        break  # max 1 Post pro Lauf — wirkt organisch, nie ein Schwall


if __name__ == "__main__":
    main()
