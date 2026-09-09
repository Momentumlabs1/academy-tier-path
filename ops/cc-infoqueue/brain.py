"""cc-infoqueue Gehirn + Tagesbriefing.

Zwei Aufgaben, ein Modul (wird von poster.py importiert bzw. per cron gerufen):

1. pruefe(post) — die Endkontrolle vor JEDEM Queue-Post: Claude bekommt den
   Post, die zuletzt gesendeten Kanal-Posts und die heutige Desk-Aktivitaet
   (signal_relays) und entscheidet, ob der Post JETZT Sinn ergibt. Ein Post,
   der sich auf Trades bezieht, die es nicht gab, wird zurueckgehalten und
   der Grund landet in der Admin-Gruppe. (Vorfall 02.09.: "TP3 is where it
   gets interesting" an einem Tag ohne einen einzigen Trade.)

2. briefing() — taeglich 08:30 Wien: 2-3 konkrete Cosmo-Video-Vorschlaege
   mit fertigen EN-Scripts (Alien-POV-Regeln) in die Admin-Gruppe, damit
   Diego sie direkt in den VIDEO-COSMO-Chat kopieren kann.

Secrets (ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, ADMIN_ALERT_CHAT_ID) kommen
zur Laufzeit aus app_secrets — nichts davon liegt zusaetzlich auf der Platte.
"""
import json, os, datetime, urllib.request

BASE = "/opt/cc-infoqueue"


def _env():
    env = {}
    for line in open("/opt/cosmos-setter/.env"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v.strip().strip('"')
    return env


def _secret(env, key):
    sk = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(
        f"{env['SUPABASE_URL']}/rest/v1/app_secrets?key=eq.{key}&select=value",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    d = json.load(urllib.request.urlopen(req, timeout=20))
    return d[0]["value"] if d else None


def _rest(env, pfad):
    sk = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")
    req = urllib.request.Request(f"{env['SUPABASE_URL']}/rest/v1/{pfad}",
        headers={"apikey": sk, "Authorization": f"Bearer {sk}"})
    return json.load(urllib.request.urlopen(req, timeout=20))


def _claude(env, system, user, max_tokens=800):
    key = _secret(env, "ANTHROPIC_API_KEY")
    if not key:
        return None
    body = json.dumps({"model": "claude-sonnet-5", "max_tokens": max_tokens,
        "system": system, "messages": [{"role": "user", "content": user}]}).encode()
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, method="POST",
        headers={"Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
    d = json.load(urllib.request.urlopen(req, timeout=60))
    return "".join(b.get("text", "") for b in d.get("content", []) if b.get("type") == "text")


def _admin_melden(env, text):
    tok = _secret(env, "TELEGRAM_BOT_TOKEN")
    chat = _secret(env, "ADMIN_ALERT_CHAT_ID")
    if not tok or not chat:
        return
    import urllib.parse
    data = urllib.parse.urlencode({"chat_id": chat, "text": text}).encode()
    urllib.request.urlopen(urllib.request.Request(
        f"https://api.telegram.org/bot{tok}/sendMessage", data=data), timeout=20)


def _kontext(env):
    heute = datetime.date.today().isoformat()
    relays = _rest(env, f"signal_relays?select=preview,created_at&created_at=gte.{heute}&order=created_at.desc&limit=15")
    signale = [r["preview"] for r in relays]
    queue = json.load(open(f"{BASE}/queue.json"))
    done = json.load(open(f"{BASE}/done.json")) if os.path.exists(f"{BASE}/done.json") else {}
    gesendet = [(p.get("text") or p.get("caption") or "")[:200]
                for i, p in enumerate(queue) if str(i) in done][-5:]
    return signale, gesendet


def pruefe(post_text):
    """True = senden, (False, grund) = zurueckhalten. Bei API-Ausfall: senden —
    die Kontrolle ist ein Filter, nie ein Ausfallgrund fuer den Kanal."""
    try:
        env = _env()
        signale, gesendet = _kontext(env)
        antwort = _claude(env,
            "Du bist die Endkontrolle fuer den Telegram-Info-Kanal einer Trading-Academy. "
            "Pruefe, ob der geplante Post JETZT gesendet werden darf. Harte Regeln: "
            "1) Ein Post, der sich auf konkrete heutige/laufende Trades bezieht, darf NUR raus, "
            "wenn die Signal-Liste solche Trades zeigt. 2) Keine erfundenen Zahlen oder Ergebnisse. "
            "3) Keine Wiederholung eines fast identischen kuerzlichen Posts. "
            "4) Zeitlose Inhalte (Wissen, Videos, Willkommen) sind immer ok. "
            "Antworte NUR mit JSON: {\"senden\": true/false, \"grund\": \"ein Satz\"}",
            f"Geplanter Post:\n{post_text[:600]}\n\nHeutige Desk-Signale ({len(signale)}):\n"
            + ("\n".join(s[:80] for s in signale[:8]) or "KEINE — der Desk hat heute nicht gehandelt")
            + "\n\nZuletzt gesendete Kanal-Posts:\n" + ("\n---\n".join(gesendet) or "keine"),
            max_tokens=400)
        # Robust auslesen statt hoffen: das Modell packt die Antwort mal in
        # einen ```json-Block, mal nicht. Gemessen am 04.09.: mit 200 Tokens
        # brach die Begruendung mitten im Satz ab, json.loads warf
        # "Unterminated string", und der except-Zweig liess JEDEN Post durch —
        # die Bremse war seit dem Einbau tot. Deshalb mehr Luft UND ein
        # Auslesen, das den ersten geschweiften Block herausschneidet.
        roh = (antwort or "").strip()
        anfang, ende = roh.find("{"), roh.rfind("}")
        if anfang < 0 or ende <= anfang:
            raise ValueError(f"keine JSON-Antwort: {roh[:120]}")
        d = json.loads(roh[anfang:ende + 1])
        if d.get("senden"):
            return True, ""
        grund = d.get("grund", "kein Grund genannt")
        # Ansage 04.09.: In der Admin-Gruppe soll NUR noch Registrierung,
        # Einzahlung und Partner landen. Die Bremse bleibt scharf, sie
        # meldet sich nur nicht mehr per Telegram — der Grund steht im
        # Logbuch (poster.py leitet stdout nach log.txt um).
        print(f"[brain] zurueckgehalten: {post_text[:120]} | Grund: {grund}")
        return False, grund
    except Exception as e:
        print(f"[brain] Check uebersprungen ({e}) — Post geht raus")
        return True, ""


def briefing():
    env = _env()
    signale, gesendet = _kontext(env)
    queue = json.load(open(f"{BASE}/queue.json"))
    done = json.load(open(f"{BASE}/done.json")) if os.path.exists(f"{BASE}/done.json") else {}
    wartend = [(p.get("text") or p.get("caption") or "")[:100] for i, p in enumerate(queue) if str(i) not in done]
    antwort = _claude(env,
        "Du planst den Content fuer den Telegram-Info-Kanal von Cosmos Candles (Trading-Academy, "
        "Maskottchen: Cosmo, ein blauer Alien, der die Erd-Maerkte von oben beobachtet). "
        "Videos entstehen als Talking-Head-Selfies von Cosmo, Sprache ENGLISCH, Stil: EIN "
        "durchgehender Satzfluss ohne viele Pausen, Alien-Perspektive (your planet's markets, "
        "from up here, human, on board). KEIN Coaching-Verkauf, keine erfundenen Zahlen. "
        "Schlage 2-3 konkrete Videos fuer heute vor, priorisiert. Fuer jedes: Titel, Zweck, "
        "und ein fertiges EN-Script (15-35s gesprochen). Deutsch erklaeren, Script englisch. "
        "Falls noch kein Selfie-WELCOME-Video existiert, ist das immer Prioritaet 1.",
        f"Heutige Desk-Signale: {len(signale)}\nZuletzt im Kanal: " + (" | ".join(g[:60] for g in gesendet) or "nichts")
        + "\nNoch geplante Queue-Posts: " + (" | ".join(wartend) or "keine"),
        max_tokens=2500)
    print("antwort-laenge:", len(antwort or ""))
    if antwort:
        _admin_melden(env, "🎬 Video-Briefing fuer heute (fuer den VIDEO-COSMO-Chat):\n\n" + antwort[:3600])
        print("Briefing gesendet")


if __name__ == "__main__":
    # Ansage 04.09.: Die Content-Vorschlaege sind aus der Admin-Gruppe raus.
    # Der Cron-Eintrag ist geloescht; dieser Handstart bleibt bewusst stumm,
    # damit das Briefing nicht durch ein beilaeufiges "python3 brain.py"
    # wieder in den Chat rutscht. Wer es zurueckwill, ruft briefing() bewusst.
    print("Video-Briefing ist abgeschaltet (Ansage 04.09.). "
          "Zum Wiederbeleben: brain.briefing() gezielt aufrufen.")
