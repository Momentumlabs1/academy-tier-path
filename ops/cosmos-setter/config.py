"""Central config — env first, then the shared `app_secrets` table.

WHY THE DATABASE FALLBACK. This bot runs on its own server, so every secret it
needs would otherwise have to be typed into a .env there: bot token, Claude key,
three channel ids. Five values, on a box, that drift the moment anything changes
— and rotating the bot token would mean SSHing in.

Only ONE value genuinely has to live on the server: the Supabase service key,
because it is what opens the door to everything else. Once the bot can read the
database it can fetch the rest from `app_secrets`, which is the same place the
academy's edge functions already read from. Change a channel, rotate a token, and
both sides pick it up without a deploy and without touching this machine.

Env still wins where it is set, so an existing .env keeps working unchanged.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _from_db() -> dict:
    """Pull shared config out of app_secrets. Never fatal — env may cover it."""
    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        return {}
    try:
        import httpx
        r = httpx.get(
            f"{url}/rest/v1/app_secrets",
            params={"select": "key,value"},
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=10,
        )
        r.raise_for_status()
        return {row["key"]: row["value"] for row in r.json() if row.get("value")}
    except Exception as e:  # noqa: BLE001 — a missing table must not stop the bot
        print(f"[config] app_secrets unreachable ({e}); using env only")
        return {}


_DB = _from_db()


def _val(key: str, default: str = "") -> str:
    """Env wins, database second, default last."""
    return (os.getenv(key, "").strip() or _DB.get(key, "") or default).strip()


def _req(key: str) -> str:
    v = os.getenv(key, "").strip()
    if not v:
        raise SystemExit(f"Missing env {key} — see .env.example")
    return v


class Config:
    # Telegram
    TELEGRAM_BOT_TOKEN = _val("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHANNEL_ID = _val("TELEGRAM_CHANNEL_ID") or _val("INFO_CHANNEL_ID")
    OPTIN_BUTTON_TEXT = os.getenv("OPTIN_BUTTON_TEXT", "👉 Coaching-Platz sichern")
    OPTIN_CHANNEL_MESSAGE = os.getenv(
        "OPTIN_CHANNEL_MESSAGE",
        "Bereit fürs nächste Level? Tippe unten – ich meld mich kurz. 👇",
    )
    # Pre-filled first message: the deep link drops this into the user's input
    # box, they only hit send — same pattern the big signal funnels use.
    OPTIN_PREFILL_TEXT = os.getenv("OPTIN_PREFILL_TEXT", "Hi, ich will VIP werden 🚀")

    # Anthropic
    ANTHROPIC_API_KEY = _val("ANTHROPIC_API_KEY")
    SETTER_MODEL = os.getenv("SETTER_MODEL", "claude-sonnet-5").strip()
    SETTER_MODEL_CHEAP = os.getenv("SETTER_MODEL_CHEAP", "claude-haiku-4-5-20251001").strip()

    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    # Offer / flow
    ENTRY_MODE = os.getenv("ENTRY_MODE", "purchase").strip()  # deposit | purchase

    # Shared password for /testvip — simulates a completed deposit so the team
    # can see the final step (invite DM + welcome) without moving real money.
    # Empty = the command is disabled entirely.
    TEST_GRANT_SECRET = os.getenv("TEST_GRANT_SECRET", "").strip()

    # Telegram user ids allowed to use /reset (internal testing only). Comma
    # separated. Everyone else gets no reaction at all — the command must not
    # exist as far as a real lead is concerned.
    RESET_USER_IDS = {
        int(x) for x in os.getenv("RESET_USER_IDS", "").replace(" ", "").split(",") if x.isdigit()
    }
    HANDOVER_LINK = os.getenv("HANDOVER_LINK", "").strip()
    # Where the member's academy lives. Sent right after the VIP invite so a
    # freshly funded member gets BOTH doors — signals and lessons — not just
    # the Telegram one.
    ACADEMY_URL = os.getenv("ACADEMY_URL", "https://cosmos-candles.com/signup").strip()
    BRAND_NAME = os.getenv("BRAND_NAME", "the Academy").strip()
    # Welche Marke diese Instanz bedient. Jeder Partner-Setter laeuft als eigener
    # Dienst mit eigener .env — ohne diesen Wert teilen sich alle Bots eine
    # Lead-Zeile pro Person und blockieren sich gegenseitig.
    TENANT_SLUG = os.getenv("TENANT_SLUG", "cosmos-candles").strip()
    SETTER_NAME = os.getenv("SETTER_NAME", "Cosmo").strip()
    OFFER_BRIEF = os.getenv("OFFER_BRIEF", "").strip()
    SETTER_GOAL = os.getenv("SETTER_GOAL", "").strip()

    # VIP gate (setter -> tracked deposit -> VIP telegram group)
    # Private group where every conversation is mirrored so the team can read
    # along on their phone. Optional — without it the bot works, you just see
    # nothing.
    SUPPORT_GROUP_ID = _val("SUPPORT_GROUP_ID")
    VIP_GROUP_ID = _val("VIP_GROUP_ID") or _val("VIP_CHANNEL_ID")          # -100... id of the VIP signal group (bot must be admin)
    INFO_GROUP_ID = _val("INFO_GROUP_ID") or _val("INFO_CHANNEL_ID")        # group where the opt-in button is posted
    VIP_MIN_DEPOSIT = float(os.getenv("VIP_MIN_DEPOSIT", "300"))  # deposit threshold that unlocks VIP
    DEPOSIT_SWEEP_MINUTES = int(os.getenv("DEPOSIT_SWEEP_MINUTES", "5"))

    # Conversation limits (cost + spam guard)
    MAX_TURNS = int(os.getenv("MAX_TURNS", "40"))
    HISTORY_WINDOW = int(os.getenv("HISTORY_WINDOW", "24"))  # messages kept in context

    @classmethod
    def require_runtime(cls):
        """Hard-fail early if the bot can't actually run."""
        for k in ("TELEGRAM_BOT_TOKEN", "ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
            if not getattr(cls, k):
                raise SystemExit(f"Missing env {k} — see .env.example")


cfg = Config()
