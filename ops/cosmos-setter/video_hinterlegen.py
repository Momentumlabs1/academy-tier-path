#!/usr/bin/env python3
"""Bot-Video als "default" hinterlegen — ohne dass Diego es dem Bot schicken muss.

Telegram-file_ids gelten nur fuer den Bot, der die Datei hochgeladen hat. Also
laedt der SETTER-Bot das Video einmal in den Ops-Kanal ("Cosmos Bot 🤖") —
dort sieht Diego nebenbei auch, was ab jetzt jeder Lead bekommt — und die
file_id aus dieser Antwort landet in bot_videos. Genau das tut sonst on_video,
wenn der Admin "#video default" schickt.

Aufruf: video_hinterlegen.py <mp4> <breite> <hoehe> <dauer_s>
"""
import json, os, sys, uuid, urllib.request, datetime

pfad, w, h, dauer = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
e = {}
for l in open("/opt/cosmos-setter/.env"):
    l = l.strip()
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1)
        e[k] = v.strip().strip('"')
sk = e.get("SUPABASE_SERVICE_ROLE_KEY") or e.get("SUPABASE_SERVICE_KEY")
H = {"apikey": sk, "Authorization": f"Bearer {sk}"}

chat = json.load(urllib.request.urlopen(urllib.request.Request(
    f"{e['SUPABASE_URL']}/rest/v1/app_secrets?key=eq.BOT_ACTIVITY_CHAT_ID&select=value", headers=H)))[0]["value"]
groesse = os.path.getsize(pfad)
assert groesse < 49 * 1024 * 1024, f"zu gross fuer die Bot-API: {groesse} Bytes"

felder = {"chat_id": chat, "width": w, "height": h, "duration": dauer, "supports_streaming": "true",
          "caption": "🎬 Neues Bot-Video hinterlegt (default) — das bekommt ab jetzt jeder Lead nach den zwei Fragen."}
b = uuid.uuid4().hex
body = b"".join(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode() for k, v in felder.items())
body += (f"--{b}\r\nContent-Disposition: form-data; name=\"video\"; filename=\"{os.path.basename(pfad)}\"\r\n"
         f"Content-Type: video/mp4\r\n\r\n").encode() + open(pfad, "rb").read() + f"\r\n--{b}--\r\n".encode()
r = json.load(urllib.request.urlopen(urllib.request.Request(
    f"https://api.telegram.org/bot{e['TELEGRAM_BOT_TOKEN']}/sendVideo", data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={b}"}), timeout=300))
assert r.get("ok"), r
v = r["result"]["video"]
print("hochgeladen:", v["width"], "x", v["height"], v["duration"], "s", "file_id", v["file_id"][:24] + "…")

zeile = {"key": "default", "file_id": v["file_id"], "caption": None, "active": True,
         "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
req = urllib.request.Request(f"{e['SUPABASE_URL']}/rest/v1/bot_videos?on_conflict=key",
                             data=json.dumps(zeile).encode(), method="POST",
                             headers={**H, "Content-Type": "application/json",
                                      "Prefer": "resolution=merge-duplicates,return=representation"})
print("bot_videos:", json.load(urllib.request.urlopen(req, timeout=20)))
