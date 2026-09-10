"""Supabase persistence for the setter: leads, messages, opt-out, tracking token.

Uses the PostgREST REST API directly (service-role key) so the only dependency
is httpx. If Supabase isn't configured (local dev / tests) it transparently
falls back to an in-memory store so the conversation logic still runs.
"""
from __future__ import annotations
import time
import secrets
from datetime import datetime, timezone
from typing import Optional
import httpx

from config import cfg


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_token() -> str:
    """Short, URL-safe tracking token. Rides the handover link → utm_campaign."""
    return "st_" + secrets.token_hex(6)


def tracked_link(base: str, token: str) -> str:
    if not base:
        return ""
    sep = "&" if "?" in base else "?"
    # utm_campaign carries the token so the academy rollup matches by token,
    # not by e-mail (ILIKE '%<token>%'); cc_src kept for readability/debugging.
    return f"{base}{sep}utm_campaign={token}&cc_src={token}"


def academy_link(base: str, token: str) -> str:
    """Der Akademie-Link mit dem Token dieses Leads.

    WARUM NICHT tracked_link
    Der Broker-Link braucht utm_campaign, weil das die Spalte ist, die der
    Broker zurueckmeldet. Unsere eigene Anmeldeseite liest kein utm — sie
    braucht einen Parameter, den sie versteht und in die Registrierung
    durchreicht: ?st=<token>.

    WOZU DAS GUT IST
    Bisher war die einzige Verbindung zwischen diesem Gespraech und dem
    entstehenden Akademie-Konto ein Satz im Skript ("nimm dieselbe E-Mail wie
    beim Broker"). Wer eine andere nimmt — oder sich kuenftig per Apple mit
    verborgener Adresse anmeldet — fiel lautlos durch. Der Token im Link faellt
    nicht durch: ihn hat nur, wer diese Nachricht bekommen hat.
    """
    if not base or not token:
        return base          # lieber der nackte Link als ein leeres ?st=
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}st={token}"


class _Rest:
    def __init__(self):
        self.enabled = bool(cfg.SUPABASE_URL and cfg.SUPABASE_SERVICE_ROLE_KEY)
        if self.enabled:
            self._c = httpx.Client(
                base_url=f"{cfg.SUPABASE_URL}/rest/v1",
                headers={
                    "apikey": cfg.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {cfg.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=20,
            )

    def insert(self, table, row, upsert_on=None):
        headers = {"Prefer": "return=representation"}
        if upsert_on:
            headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
        r = self._c.post(f"/{table}", json=row, headers=headers,
                         params={"on_conflict": upsert_on} if upsert_on else None)
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None

    def select_one(self, table, **eq):
        params = {f"{k}": f"eq.{v}" for k, v in eq.items()}
        params["limit"] = 1
        r = self._c.get(f"/{table}", params=params)
        r.raise_for_status()
        data = r.json()
        return data[0] if data else None

    def update(self, table, patch, **eq):
        params = {f"{k}": f"eq.{v}" for k, v in eq.items()}
        r = self._c.patch(f"/{table}", json=patch, params=params)
        r.raise_for_status()


class Store:
    """Lead + message store. Real Supabase when configured, else in-memory."""

    def __init__(self):
        self.rest = _Rest()
        self._mem_leads: dict[int, dict] = {}
        self._mem_msgs: list[dict] = []

    # ── leads ────────────────────────────────────────────────────────────────
    def get_or_create_lead(self, tg_user_id: int, *, username=None, first_name=None,
                           source: Optional[str] = None) -> dict:
        if self.rest.enabled:
            lead = self.rest.select_one("setter_leads", telegram_user_id=tg_user_id,
                                        tenant_slug=cfg.TENANT_SLUG)
            if lead:
                return lead
            return self.rest.insert("setter_leads", {
                "tenant_slug": cfg.TENANT_SLUG,
                "telegram_user_id": tg_user_id,
                "telegram_username": username,
                "first_name": first_name,
                "token": new_token(),
                "source": source,
                "status": "active",
            })
        # in-memory
        if tg_user_id in self._mem_leads:
            return self._mem_leads[tg_user_id]
        lead = {
            "id": secrets.token_hex(8), "telegram_user_id": tg_user_id,
            "telegram_username": username, "first_name": first_name,
            "token": new_token(), "source": source, "status": "active",
            "step": "new", "experience": None,
        }
        self._mem_leads[tg_user_id] = lead
        return lead

    def get_lead(self, tg_user_id: int) -> Optional[dict]:
        """Read a lead without creating one — used by the deposit follow-up jobs,
        which must not resurrect a lead that was deleted or opted out."""
        if self.rest.enabled:
            return self.rest.select_one("setter_leads", telegram_user_id=tg_user_id,
                                        tenant_slug=cfg.TENANT_SLUG)
        return self._mem_leads.get(tg_user_id)

    def set_status(self, tg_user_id: int, status: str):
        if self.rest.enabled:
            self.rest.update("setter_leads", {"status": status}, telegram_user_id=tg_user_id,
                             tenant_slug=cfg.TENANT_SLUG)
        elif tg_user_id in self._mem_leads:
            self._mem_leads[tg_user_id]["status"] = status

    def mark_link_sent(self, tg_user_id: int):
        if self.rest.enabled:
            self.rest.update("setter_leads", {"status": "link_sent"}, telegram_user_id=tg_user_id,
                             tenant_slug=cfg.TENANT_SLUG)
        elif tg_user_id in self._mem_leads:
            self._mem_leads[tg_user_id]["status"] = "link_sent"

    # ── VIP gate: token → broker deposit → grant ──────────────────────────────
    def deposit_for_token(self, token: str) -> float:
        """Sum net_deposit of every broker_clients row whose tracking token
        (utm_campaign / utm_uri) contains this lead's token. Broker-sync fills
        broker_clients; the token rides the handover link → utm_campaign."""
        if not self.rest.enabled:
            return 0.0
        pat = f"*{token}*"
        r = self.rest._c.get("/broker_clients", params={
            "select": "net_deposit",
            "or": f"(utm_campaign.ilike.{pat},utm_uri.ilike.{pat})",
        })
        r.raise_for_status()
        return float(sum((row.get("net_deposit") or 0) for row in r.json()))

    def leads_awaiting_vip(self) -> list[dict]:
        """Leads who got the link but haven't been granted VIP yet."""
        if not self.rest.enabled:
            return []
        base = {"status": "in.(link_sent,deposited)", "vip_granted_at": "is.null",
                "tenant_slug": "eq." + cfg.TENANT_SLUG}
        # broker_email only exists after the fallback migration — ask for it, but
        # never let a missing column take the whole sweep down.
        for cols in ("id,telegram_user_id,first_name,token,status,broker_email",
                     "id,telegram_user_id,first_name,token,status"):
            r = self.rest._c.get("/setter_leads", params={"select": cols, **base})
            if r.status_code < 400:
                return r.json()
        r.raise_for_status()
        return []

    def record_deposit(self, tg_user_id: int, amount: float):
        if self.rest.enabled:
            self.rest.update("setter_leads",
                {"deposit_usd": amount, "deposit_checked_at": _now_iso(),
                 "status": "deposited"}, telegram_user_id=tg_user_id,
                tenant_slug=cfg.TENANT_SLUG)

    def delete_lead(self, tg_user_id: int) -> bool:
        """Wipe a lead and their messages — internal /reset for testing.

        Deleting the Telegram chat only clears the LEAD's screen; our row stays,
        so the bot still thinks they are mid-funnel. This is the other half.
        """
        if not self.rest.enabled:
            self._mem_leads.pop(tg_user_id, None)
            return True
        lead = self.get_lead(tg_user_id)
        if not lead:
            return False
        try:
            self.rest._c.delete("/setter_messages", params={"lead_id": "eq." + str(lead["id"])})
            self.rest._c.delete("/setter_leads", params={"telegram_user_id": "eq." + str(tg_user_id),
                                                          "tenant_slug": "eq." + cfg.TENANT_SLUG})
            return True
        except Exception as e:
            log.warning("delete_lead failed: %s", e)
            return False




    # ── Video-Antworten ─────────────────────────────────────────────────────
    #
    # Von fein nach grob: erst das Video fuer genau diese Erfahrungsstufe, sonst
    # das allgemeine. So reicht EIN Video zum Anfangen, und jedes weitere
    # verfeinert, ohne dass hier eine Liste gepflegt werden muss.

    def video_for(self, experience: str | None) -> dict | None:
        if not self.rest.enabled:
            return None
        for key in [k for k in (experience, "default") if k]:
            try:
                row = self.rest.select_one("bot_videos", key=key, active="true")
                if row and row.get("file_id"):
                    return row
            except Exception as e:
                log.warning("video_for(%s) failed: %s", key, e)
        return None

    def set_video(self, key: str, file_id: str, caption: str | None) -> bool:
        """Legt ein Video unter einem Schluessel ab. Ueberschreibt bewusst —
        ein neues Video zum selben Schluessel ist eine Korrektur, keine
        zweite Fassung."""
        if not self.rest.enabled:
            return False
        try:
            import datetime as _dt
            self.rest.insert("bot_videos",
                             {"key": key, "file_id": file_id, "caption": caption,
                              "active": True,
                              # ISO-Zeitstempel, kein "now()": ueber REST landet
                              # ein SQL-Ausdruck als Zeichenkette in der Spalte.
                              "updated_at": _dt.datetime.now(_dt.timezone.utc).isoformat()},
                             upsert_on="key")
            return True
        except Exception as e:
            log.warning("set_video failed: %s", e)
            return False

    def admin_telegram_id(self) -> int:
        """Wer Videos einspielen darf. Aus app_secrets, nicht aus der .env —
        so laesst sich der Zugang aendern, ohne den Dienst anzufassen."""
        if not self.rest.enabled:
            return 0
        try:
            row = self.rest.select_one("app_secrets", key="ADMIN_TELEGRAM_ID")
            return int((row or {}).get("value") or 0)
        except Exception:
            return 0

    # ── Land und Broker ─────────────────────────────────────────────────────
    #
    # HeroFX nimmt US-Kunden an, VT Markets nicht. Die Richtung der Unsicherheit
    # ist deshalb NICHT symmetrisch: wer erkennbar ausserhalb der USA sitzt,
    # darf zu VT; alle anderen — US UND alles, was wir nicht sicher erkannt
    # haben — gehen zu Hero. Hero weist niemanden ab, VT schon. Ein falsch
    # geratenes Land kostet bei Hero nichts und bei VT den Kunden.

    # Absichtlich KEINE vollstaendige Laenderliste: die Entscheidung ist binaer
    # (US oder nicht), und jede Zeile hier ist eine, die falsch sein kann. Drin
    # steht, was in unseren Leads tatsaechlich vorkommt.
    NICHT_US = {
        "de": "DE", "germany": "DE", "deutschland": "DE", "german": "DE",
        "at": "AT", "austria": "AT", "oesterreich": "AT", "österreich": "AT",
        "ch": "CH", "switzerland": "CH", "schweiz": "CH",
        "in": "IN", "india": "IN", "indian": "IN", "bharat": "IN",
        "pk": "PK", "pakistan": "PK",
        "bd": "BD", "bangladesh": "BD",
        "ng": "NG", "nigeria": "NG", "nigerian": "NG",
        "za": "ZA", "south africa": "ZA",
        "ke": "KE", "kenya": "KE",
        "gh": "GH", "ghana": "GH",
        "eg": "EG", "egypt": "EG",
        "ph": "PH", "philippines": "PH", "pilipinas": "PH",
        "id": "ID", "indonesia": "ID",
        "my": "MY", "malaysia": "MY",
        "vn": "VN", "vietnam": "VN",
        "th": "TH", "thailand": "TH",
        "br": "BR", "brazil": "BR", "brasil": "BR",
        "mx": "MX", "mexico": "MX", "méxico": "MX",
        "ar": "AR", "argentina": "AR",
        "co": "CO", "colombia": "CO",
        "es": "ES", "spain": "ES", "espana": "ES", "españa": "ES",
        "it": "IT", "italy": "IT", "italia": "IT",
        "fr": "FR", "france": "FR",
        "nl": "NL", "netherlands": "NL", "holland": "NL",
        "pl": "PL", "poland": "PL",
        "ro": "RO", "romania": "RO",
        "tr": "TR", "turkey": "TR", "turkiye": "TR", "türkiye": "TR",
        "ae": "AE", "uae": "AE", "dubai": "AE", "emirates": "AE",
        "sa": "SA", "saudi": "SA", "saudi arabia": "SA",
        "gb": "GB", "uk": "GB", "united kingdom": "GB", "england": "GB", "britain": "GB",
        "ca": "CA", "canada": "CA",
        "au": "AU", "australia": "AU",
        "ma": "MA", "morocco": "MA",
        "dz": "DZ", "algeria": "DZ",
        "tn": "TN", "tunisia": "TN",
        "np": "NP", "nepal": "NP",
        "lk": "LK", "sri lanka": "LK",
    }

    US_WOERTER = {"us", "usa", "u.s.", "u.s.a.", "united states", "america",
                  "american", "states", "murica", "united states of america"}

    def erkenne_land(self, text: str) -> str | None:
        """'US' | ISO-Code | None (nicht erkannt -> Aufrufer nimmt Hero)."""
        t = (text or "").strip().lower().strip(".!?,")
        if not t or len(t) > 40:
            return None
        if t in self.US_WOERTER:
            return "US"
        if t in self.NICHT_US:
            return self.NICHT_US[t]
        # Auch "i live in germany" oder "from India" sollen greifen.
        for wort, code in self.NICHT_US.items():
            if len(wort) > 3 and wort in t:
                return code
        for wort in self.US_WOERTER:
            if len(wort) > 3 and wort in t:
                return "US"
        return None

    def set_country(self, tg_user_id: int, land: str) -> bool:
        if not self.rest.enabled or not land:
            return False
        try:
            self.rest.update("setter_leads", {"country": land},
                             telegram_user_id=tg_user_id, tenant_slug=cfg.TENANT_SLUG)
            return True
        except Exception as e:
            log.warning("set_country failed: %s", e)
            return False

    # ── Partner-Zuordnung ueber den Einladungslink ───────────────────────────
    #
    # Ein gemeinsamer Info-Kanal, je Partner ein eigener Einladungslink. Wer
    # ueber Zekos Link beitritt, gehoert Zeko — auch wenn ihn danach der
    # Cosmos-Bot fuehrt. Ohne das landet jeder, der ueber den gemeinsamen Kanal
    # kommt, beim Broker unter der Hausmarke, und dem Partner entgeht seine
    # Provision, ohne dass es irgendwo auffaellt.

    def tenant_for_invite_link(self, link: str) -> str | None:
        """Zu wem gehoert dieser Einladungslink? None = unbekannt."""
        if not self.rest.enabled or not link:
            return None
        try:
            row = self.rest.select_one("tenant_invite_links", invite_link=link)
            return (row or {}).get("tenant_slug") or None
        except Exception as e:
            log.warning("tenant_for_invite_link failed: %s", e)
            return None

    def set_partner(self, tg_user_id: int, partner_slug: str) -> bool:
        """Den Partner am Lead festhalten. Ueberschreibt einen bestehenden NICHT
        — wer einmal jemandem zugeordnet ist, wechselt nicht den Besitzer, weil
        er spaeter noch einen zweiten Link anklickt."""
        if not self.rest.enabled or not partner_slug:
            return False
        try:
            lead = self.get_lead(tg_user_id)
            if lead and lead.get("partner_slug"):
                return False
            self.rest.update("setter_leads", {"partner_slug": partner_slug},
                             telegram_user_id=tg_user_id, tenant_slug=cfg.TENANT_SLUG)
            return True
        except Exception as e:
            log.warning("set_partner failed: %s", e)
            return False

    def broker_link_for(self, partner_slug: str | None, country: str | None = None) -> str | None:
        """Der Broker-Link DIESES Partners fuer DIESES Land.

        Vorher stand hier broker="hero" fest verdrahtet — der VT-Link eines
        Partners lag in der Tabelle und wurde nie gelesen.

        Die Wahl ist bewusst asymmetrisch: nur ein ERKANNTES Land ausserhalb der
        USA geht zu VT. US und alles Unbekannte gehen zu Hero, weil Hero jeden
        annimmt und VT US-Kunden abweist — und zwar erst NACH dem Klick.
        Fehlt der VT-Link des Partners, faellt es ebenfalls auf Hero zurueck:
        lieber der richtige Broker unter fremder Kennung als ein toter Link.
        """
        if not self.rest.enabled or not partner_slug:
            return None
        gewuenscht = "vt" if (country and country.upper() != "US") else "hero"
        try:
            row = self.rest.select_one("tenant_broker_links",
                                       tenant_slug=partner_slug, broker=gewuenscht)
            url = (row or {}).get("url")
            if url:
                return url
            if gewuenscht == "vt":
                log.info("kein VT-Link fuer %s — faellt auf Hero zurueck", partner_slug)
                row = self.rest.select_one("tenant_broker_links",
                                           tenant_slug=partner_slug, broker="hero")
                return (row or {}).get("url") or None
            return None
        except Exception as e:
            log.warning("broker_link_for failed: %s", e)
            return None


    # ── Konto anlegen lassen, nachdem die Einzahlung da ist ──────────────────
    #
    # Die Arbeit passiert in der Edge-Function bot-unlock, nicht hier: dort
    # haengen Auth-Konto, Partner-Zuordnung und Anmeldelink zusammen, und die
    # duerfen nicht auseinanderlaufen. `referred_by_tenant` ist nach dem Anlegen
    # gesperrt — ein Konto ohne Partner gehoert fuer immer dem Haus.
    #
    # Das Geheimnis kommt aus app_secrets, nicht aus der .env: so hat der Bot
    # nichts zusaetzlich auf der Platte, und ein Wechsel wirkt sofort.

    def unlock_account(self, tg_user_id: int, email: str) -> dict:
        """{'status': 'angelegt'|'vorhanden'|'nicht_gefunden', 'login_link': ...}
        Bei jeder Stoerung: nicht_gefunden — dann sagt der Bot "dauert noch",
        was schlimmstenfalls zu vorsichtig ist. Ein falsches "du bist drin"
        waere dagegen ein Kunde, der auf eine Seite klickt, die ihn nicht
        kennt."""
        if not self.rest.enabled:
            return {"status": "nicht_gefunden"}
        try:
            row = self.rest.select_one("app_secrets", key="BOT_UNLOCK_SECRET")
            secret = (row or {}).get("value")
            if not secret:
                log.warning("BOT_UNLOCK_SECRET fehlt")
                return {"status": "nicht_gefunden"}
            import json as _json, urllib.request as _u
            req = _u.Request(
                f"{cfg.SUPABASE_URL}/functions/v1/bot-unlock",
                data=_json.dumps({"telegram_user_id": tg_user_id, "email": email}).encode(),
                method="POST",
                headers={"Content-Type": "application/json", "x-bot-secret": secret},
            )
            return _json.load(_u.urlopen(req, timeout=45))
        except Exception as e:
            log.warning("unlock_account failed: %s", e)
            return {"status": "nicht_gefunden"}

    # ── broker e-mail: the fallback matcher ──────────────────────────────────
    # The tracking token is the primary link between a Telegram user and their
    # broker account, but it goes missing more often than you'd think: another
    # browser, cleared cookies, or registering days later. The e-mail the lead
    # used at the broker is the second way in — and asking for it also answers
    # the question every lead has ("how would he even know it was me?").

    def set_broker_email(self, tg_user_id: int, email: str) -> bool:
        """Remember the broker e-mail. False if the column isn't there yet."""
        if not self.rest.enabled:
            return False
        try:
            self.rest.update("setter_leads", {"broker_email": email.strip().lower()},
                             telegram_user_id=tg_user_id, tenant_slug=cfg.TENANT_SLUG)
            return True
        except Exception as e:      # column not migrated yet → keep the bot alive
            log.warning("set_broker_email failed (migration missing?): %s", e)
            return False

    def deposit_for_email(self, email: str, lead_id: str) -> float:
        """Sum net_deposit of the broker client(s) with this e-mail.

        Returns 0 unless this deposit is unclaimed or already claimed by THIS
        lead. Without that check, typing a stranger's address would hand over
        their deposit — the token path can't be abused this way because it is
        bound to the personal link.
        """
        if not self.rest.enabled or not email:
            return False and 0.0 or 0.0
        addr = email.strip().lower()
        try:
            r = self.rest._c.get("/broker_clients", params={
                "select": "net_deposit,email",
                "email": f"ilike.{addr}",
            })
            r.raise_for_status()
            total = float(sum((row.get("net_deposit") or 0) for row in r.json()))
            if total <= 0:
                return 0.0
            if not self._claim_deposit(addr, lead_id):
                log.info("deposit for %s already claimed by another lead", addr)
                return 0.0
            return total
        except Exception as e:
            log.warning("deposit_for_email failed: %s", e)
            return 0.0

    def _claim_deposit(self, email: str, lead_id: str) -> bool:
        """Bind this broker deposit to this lead. False if someone else holds it."""
        try:
            r = self.rest._c.get("/setter_deposit_claims", params={
                "select": "lead_id", "client_email": f"eq.{email}",
            })
            r.raise_for_status()
            rows = r.json()
            if rows:
                return str(rows[0].get("lead_id")) == str(lead_id)
            self.rest.insert("setter_deposit_claims",
                             {"client_email": email, "lead_id": lead_id})
            return True
        except Exception as e:
            # No claims table yet → don't hand out VIP on an unguarded e-mail.
            log.warning("deposit claim check failed, refusing e-mail match: %s", e)
            return False

    # ── scripted funnel state ────────────────────────────────────────────────
    def set_step(self, tg_user_id: int, step: str, experience: str | None = None):
        patch = {"step": step}
        if experience:
            patch["experience"] = experience
        if self.rest.enabled:
            self.rest.update("setter_leads", patch, telegram_user_id=tg_user_id,
                             tenant_slug=cfg.TENANT_SLUG)
        elif tg_user_id in self._mem_leads:
            self._mem_leads[tg_user_id].update(patch)

    def mark_vip_granted(self, tg_user_id: int):
        if self.rest.enabled:
            self.rest.update("setter_leads",
                {"status": "vip_granted", "vip_granted_at": _now_iso()},
                telegram_user_id=tg_user_id, tenant_slug=cfg.TENANT_SLUG)

    # ── messages ─────────────────────────────────────────────────────────────
    # ── Support mirror ──────────────────────────────────────────────────────
    # Every conversation happens in a private chat between the lead and the bot,
    # which means the team sees NOTHING by default — not on their phone, not
    # anywhere. That is the single biggest gap in running a setter: you cannot
    # tell whether it is doing well or quietly losing people.
    #
    # So every message, both directions, is mirrored into one private group.
    # Hooked into log_message rather than the 13 call sites that use it, so a new
    # message type can never be added and silently skip the mirror.
    #
    # Never fatal, ever. A support group that is misconfigured, deleted, or has
    # the bot removed must not cost a single reply to a real prospect.
    _lead_names: dict = {}

    def _mirror_to_support(self, lead_id, role: str, content: str) -> None:
        gid = cfg.SUPPORT_GROUP_ID
        if not gid or not cfg.TELEGRAM_BOT_TOKEN:
            return
        try:
            name = self._lead_names.get(str(lead_id))
            if name is None:
                rows = self.rest._c.get("/setter_leads", params={
                    "select": "first_name,telegram_username,telegram_user_id",
                    "id": f"eq.{lead_id}", "limit": "1",
                }).json() if self.rest.enabled else []
                r = rows[0] if rows else {}
                handle = f"@{r['telegram_username']}" if r.get("telegram_username") else str(r.get("telegram_user_id", ""))
                name = f"{r.get('first_name') or 'Lead'} {handle}".strip()
                self._lead_names[str(lead_id)] = name

            who = {"user": "👤", "admin": "🧑\u200d💼"}.get(role, "🤖")
            text = f"{who} <b>{name}</b>\n{content[:3500]}"
            httpx.post(
                f"https://api.telegram.org/bot{cfg.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": gid, "text": text, "parse_mode": "HTML",
                      "disable_web_page_preview": True},
                timeout=8,
            )
        except Exception:
            pass  # the mirror is a convenience; the conversation is the product

    def log_message(self, lead_id, role: str, content: str):
        row = {"lead_id": lead_id, "role": role, "content": content, "ts": time.time()}
        if self.rest.enabled:
            try:
                self.rest.insert("setter_messages", {
                    "lead_id": lead_id, "role": role, "content": content[:4000],
                })
            except Exception:
                pass  # logging must never break the conversation
        else:
            self._mem_msgs.append(row)
        self._mirror_to_support(lead_id, role, content)

    def history(self, lead_id, limit: int) -> list[dict]:
        if self.rest.enabled:
            # DESC + limit gives the NEWEST `limit` rows (a plain ASC+limit would
            # return the OLDEST ones once a chat grows past the window), then flip
            # back to chronological order for the model.
            params = {"lead_id": f"eq.{lead_id}", "order": "created_at.desc", "limit": limit}
            r = self.rest._c.get("/setter_messages", params=params)
            r.raise_for_status()
            rows = list(reversed(r.json()))
            return [{"role": m["role"], "content": m["content"]} for m in rows]
        return [{"role": m["role"], "content": m["content"]}
                for m in self._mem_msgs if m["lead_id"] == lead_id][-limit:]


store = Store()
