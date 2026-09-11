#!/usr/bin/env python3
"""Nachtwache fuer den Setter-Bot — gibt nur NEUES aus, eine Zeile je Ereignis.

Ansage Diego 11.09.: "heute Nacht melden sich vielleicht ein paar Leute an —
testen, analysieren, falls was schief laeuft verbessern und mir sagen."
Laeuft von aussen im Takt (Monitor); merkt sich in nachtwache_state.json, was
schon gemeldet war.
"""
import json, os, subprocess, datetime, urllib.request, urllib.parse

STATE = "/opt/cosmos-setter/nachtwache_state.json"


def env():
    e = {}
    for l in open("/opt/cosmos-setter/.env"):
        l = l.strip()
        if "=" in l and not l.startswith("#"):
            k, v = l.split("=", 1)
            e[k] = v.strip().strip('"')
    return e


def rest(e, pfad):
    sk = e.get("SUPABASE_SERVICE_ROLE_KEY") or e.get("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(f"{e['SUPABASE_URL']}/rest/v1/{pfad}",
                                 headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    return json.load(urllib.request.urlopen(req, timeout=20))


def kurz(t, n=160):
    t = (t or "").replace("\n", " ⏎ ")
    return t if len(t) <= n else t[:n] + "…"


def main():
    e = env()
    jetzt = datetime.datetime.now(datetime.timezone.utc)
    st = json.load(open(STATE)) if os.path.exists(STATE) else {}
    seit = st.get("seit") or (jetzt - datetime.timedelta(minutes=2)).isoformat()
    q = urllib.parse.quote(seit)

    for l in rest(e, f"setter_leads?select=id,first_name,telegram_username,source,partner_slug,country"
                     f"&created_at=gt.{q}&order=created_at.asc&limit=50"):
        nick = f" @{l['telegram_username']}" if l.get("telegram_username") else ""
        print(f"🆕 NEUER LEAD {l.get('first_name') or '?'}{nick} · Quelle {l.get('source') or '-'}"
              f" · Partner {l.get('partner_slug') or '-'} · id {l['id']}")

    msgs = rest(e, "setter_messages?select=lead_id,role,content,created_at,"
                   "setter_leads(first_name,telegram_username)"
                   f"&created_at=gt.{q}&order=created_at.asc&limit=200")
    for m in msgs:
        wer = (m.get("setter_leads") or {}).get("first_name") or "?"
        rolle = {"user": "👤", "assistant": "🤖", "admin": "🧑‍💼"}.get(m["role"], m["role"])
        print(f"💬 {wer} {rolle} {kurz(m['content'])}")

    for o in rest(e, f"setter_outbox?select=lead_id,error,created_at&error=not.is.null"
                     f"&created_at=gt.{q}&order=created_at.asc&limit=20"):
        print(f"❌ ADMIN-NACHRICHT NICHT ZUGESTELLT: {kurz(o['error'], 200)}")

    # Warnungen/Fehler im Bot-Protokoll seit dem letzten Lauf
    j = subprocess.run(["journalctl", "-u", "cosmos-setter", "--since", seit[:19].replace("T", " "),
                        "--no-pager", "-o", "cat"], capture_output=True, text=True).stdout
    # Einzelne Datenbank-Aussetzer beim Postausgang sind seit dem 11.09. harmlos
    # (Abfrage laeuft im Thread, der Bot haengt nicht mehr). Gemeldet wird das
    # erst, wenn es sich haeuft — dann ist Supabase wirklich weg.
    aussetzer = [z for z in j.splitlines()
                 if "Outbox nicht lesbar" in z or ("outbox_senden" in z and "skipped" in z)]
    if len(aussetzer) >= 6:
        print(f"⚠️ DATENBANK HAENGT: {len(aussetzer)} Postausgang-Aussetzer seit dem letzten Blick")
    for zeile in j.splitlines():
        if zeile in aussetzer:
            continue
        if any(k in zeile for k in (" WARNING ", " ERROR ", "Traceback", "Exception")):
            print(f"⚠️ BOT-LOG: {kurz(zeile, 220)}")

    st["seit"] = jetzt.isoformat()
    json.dump(st, open(STATE, "w"))


if __name__ == "__main__":
    main()
