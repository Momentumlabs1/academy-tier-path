"""Telegram entry point for the setter.

Flow: user taps the opt-in button in the channel -> Telegram opens the bot with
/start <payload> -> we create the lead (+ tracking token) and the AI setter opens
the conversation. Every following message is answered by Claude until the setter
hands over the tracked link. /stop opts out.
"""
from __future__ import annotations
import asyncio
import time
import re
import logging

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application, ApplicationBuilder, CommandHandler, MessageHandler,
    ChatMemberHandler, ContextTypes, filters,
)

from config import cfg
from db import store, tracked_link, academy_link
import setter_ai
import script

logging.basicConfig(format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO)
# httpx logs the full request URL at INFO — and the Telegram URL contains the bot
# token, so every poll wrote the credential into the journal in clear text.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
log = logging.getLogger("setter")
# Der Postausgang laeuft alle 4 s. Auf INFO schreibt apscheduler dafuer zwei
# Zeilen pro Lauf ins Journal — rund 43.000 am Tag, in denen jeder echte
# Fehler untergeht.
logging.getLogger("apscheduler").setLevel(logging.WARNING)

OPENER_SEED = ("[The user just started this chat via the VIP button. Write a VERY short greeting "
               "(2 sentences, plain, no name-dropping, no gushing): that you'll get them into the "
               "VIP group, and ask whether they already have trading experience or are new.]")


async def _ai(lead, history):
    """Run the (sync) Claude call off the event loop."""
    return await asyncio.to_thread(setter_ai.reply, lead, history)


async def _deposit(token: str) -> float:
    return await asyncio.to_thread(store.deposit_for_token, token)


async def _deposit_any(lead: dict) -> float:
    """Token first, then the broker e-mail they gave us.

    The token is the reliable path (it is bound to the personal link). The
    e-mail only catches the leads whose token never reached the broker — and
    only if nobody else has claimed that deposit.
    """
    total = 0.0
    try:
        total = await _deposit(lead["token"])
    except Exception:
        pass
    if total > 0:
        return total
    mail = lead.get("broker_email")
    if mail:
        try:
            total = await asyncio.to_thread(store.deposit_for_email, mail, lead["id"])
        except Exception:
            pass
    return total


async def grant_vip(bot, lead: dict) -> bool:
    """Deposit cleared the threshold → send a single-use VIP invite link + DM."""
    if not cfg.VIP_GROUP_ID:
        return False
    uid = lead["telegram_user_id"]
    try:
        invite = await bot.create_chat_invite_link(
            chat_id=int(cfg.VIP_GROUP_ID), member_limit=1,
            name=f"vip-{str(lead.get('token',''))[:10]}",
        )
        await bot.send_message(
            chat_id=uid,
            text=("Thanks for funding your account — you're officially VIP. 🎉\n\n"
                  "Here's your personal access to the VIP signal group "
                  "(one-time link, just for you):\n" + invite.invite_link),
        )
        store.mark_vip_granted(uid)
        # The second door: signals arrived above, the academy comes now. Each
        # in its own message with a beat between them — one link per message,
        # and a failure here must never undo the VIP grant.
        try:
            await asyncio.sleep(1.2)
            await bot.send_message(
                chat_id=uid,
                text=script.ACADEMY_AFTER_VIP.format(
                    academy_url=academy_link(cfg.ACADEMY_URL, lead.get("token", ""))),
                disable_web_page_preview=False,
            )
            await asyncio.sleep(1.5)
            await bot.send_message(chat_id=uid, text=script.ACADEMY_FIRST_STEP)
        except Exception:
            log.warning("academy messages failed for %s", uid)
        # The chat is not over — say once that this stays their support line.
        try:
            await asyncio.sleep(1.2)
            await bot.send_message(chat_id=uid, text=script.VIP_SUPPORT_HINT)
        except Exception:
            pass
        log.info("VIP granted to %s", uid)
        return True
    except Exception as e:
        log.exception("grant_vip failed for %s: %s", uid, e)
        return False


async def check_and_grant(bot, lead: dict) -> None:
    """Look up this lead's deposit by token; grant VIP once it clears the gate."""
    if not cfg.VIP_GROUP_ID:
        return
    try:
        dep = await _deposit_any(lead)
    except Exception:
        return
    if dep and dep > 0:
        store.record_deposit(lead["telegram_user_id"], dep)
    if dep >= cfg.VIP_MIN_DEPOSIT:
        await grant_vip(bot, lead)


async def outbox_senden(context: ContextTypes.DEFAULT_TYPE):
    """Was Diego im Admin-Bereich schreibt (setter_outbox), an den Lead zustellen.

    Ansage 11.09.: "Ich muss die Moeglichkeit haben, selber Nachrichten zu
    schreiben." Gesendet wird als DIESER Bot — fuer den Lead bleibt es ein
    Gespraech, kein zweiter Absender. Der Token bleibt dafuer hier auf dem
    Server; der Browser legt die Nachricht nur in die Tabelle.

    Protokolliert (role=admin) wird erst NACH der Zustellung. Das Protokoll
    soll zeigen, was beim Kunden ankam, nicht was jemand abschicken wollte.
    Scheitert die Zustellung (Bot blockiert, Chat geloescht), steht der Grund
    in setter_outbox.error und der Eintrag wird nicht endlos neu versucht.
    """
    if not store.rest.enabled:
        return
    # Im THREAD, mit kurzem Zeitlimit. Der httpx-Client ist synchron: direkt
    # hier aufgerufen, haelt er die ganze Ereignisschleife an, solange die
    # Datenbank braucht. Am 11.09. um 09:18 antwortete sie 30 s lang nicht —
    # so lange stand der Bot fuer ALLE Leads still, und das alle 4 s drohend.
    def _holen():
        r = store.rest._c.get("/setter_outbox", params={
            "select": "id,lead_id,text,setter_leads(telegram_user_id,tenant_slug)",
            "sent_at": "is.null", "error": "is.null",
            "order": "created_at.asc", "limit": "10"}, timeout=5)
        r.raise_for_status()
        return r.json()
    try:
        rows = await asyncio.to_thread(_holen)
    except Exception as e:
        log.warning("Outbox nicht lesbar: %s", e)
        return
    import datetime as _dt
    for row in rows:
        ziel = row.get("setter_leads") or {}
        if ziel.get("tenant_slug") != cfg.TENANT_SLUG or not ziel.get("telegram_user_id"):
            continue
        try:
            m = await context.bot.send_message(chat_id=int(ziel["telegram_user_id"]),
                                               text=row["text"], disable_web_page_preview=True)
            await asyncio.to_thread(
                store.rest.update, "setter_outbox",
                {"sent_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
                 "telegram_message_id": m.message_id}, id=row["id"])
            await asyncio.to_thread(store.log_message, row["lead_id"], "admin", row["text"])
            log.info("Admin-Nachricht zugestellt an %s", ziel["telegram_user_id"])
        except Exception as e:
            try:
                await asyncio.to_thread(store.rest.update, "setter_outbox",
                                        {"error": str(e)[:300]}, id=row["id"])
            except Exception:
                pass
            log.warning("Admin-Nachricht nicht zustellbar (%s): %s", ziel.get("telegram_user_id"), e)


async def deposit_sweep(context: ContextTypes.DEFAULT_TYPE):
    """Periodic: grant VIP to everyone who has now deposited enough."""
    for lead in store.leads_awaiting_vip():
        await check_and_grant(context.bot, lead)


# ── "hab eingezahlt" follow-up ──────────────────────────────────────────────
# The broker DB refreshes every 10 minutes, so the money is invisible to us for
# a few minutes after it is paid. Replying "seh ich nicht" in that window reads
# as an accusation and loses the lead. Instead the bot pauses like a human would,
# says it's looking, then keeps checking quietly until the sync catches up.
DEPOSIT_ACK_DELAY = 105        # ~2 min before the first "ich schau nach"
DEPOSIT_RECHECK_EVERY = 120    # then look again every 2 min
DEPOSIT_FOLLOWUP_WINDOW = 18 * 60  # after this the background sweep takes over


def _followup_name(uid: int) -> str:
    return f"depcheck:{uid}"


def _followup_running(context: ContextTypes.DEFAULT_TYPE, uid: int) -> bool:
    """Already watching this lead? Saying 'fertig' twice must not double the jobs."""
    if not context.job_queue:
        return False
    return bool(context.job_queue.get_jobs_by_name(_followup_name(uid)))


async def _deposit_followup(context: ContextTypes.DEFAULT_TYPE):
    """One tick of the post-deposit watch: look, grant, or keep waiting."""
    data = context.job.data or {}
    uid = int(data["uid"])
    started = float(data.get("started", 0))
    announced = bool(data.get("announced"))

    lead = store.get_lead(uid)
    if not lead or lead.get("vip_granted_at") or lead.get("status") == "opted_out":
        return  # granted elsewhere (or gone) — stop quietly

    dep = 0.0
    try:
        dep = await _deposit_any(lead)
    except Exception:
        pass

    if dep and dep > 0:
        store.record_deposit(uid, dep)

    if dep >= cfg.VIP_MIN_DEPOSIT:
        await grant_vip(context.bot, lead)
        return

    # Die Freischaltung oben laeuft auch bei Uebernahme — sie ist das Produkt.
    # Die Zwischenstaende unten sind Gespraech, und das fuehrt dann Diego.
    still = bool(lead.get("bot_paused"))

    if dep > 0:
        if not still:
            await context.bot.send_message(
                chat_id=uid,
                text=script.DEPOSIT_TOO_LOW.format(have=dep, min_dep=cfg.VIP_MIN_DEPOSIT),
            )
        return

    now = asyncio.get_event_loop().time()
    elapsed = now - started

    # First empty look: say the wait out loud, once.
    if not announced:
        if not still:
            await context.bot.send_message(chat_id=uid, text=script.DEPOSIT_PENDING)
        announced = True

    if elapsed >= DEPOSIT_FOLLOWUP_WINDOW:
        if not still:
            await context.bot.send_message(chat_id=uid, text=script.DEPOSIT_STILL_PENDING)
        return  # the 5-minute sweep keeps watching from here

    context.job_queue.run_once(
        _deposit_followup, DEPOSIT_RECHECK_EVERY,
        data={"uid": uid, "started": started, "announced": announced},
        name=_followup_name(uid),
    )


async def _deposit_ack(context: ContextTypes.DEFAULT_TYPE):
    """First beat after 'hab eingezahlt': acknowledge, then start looking."""
    data = context.job.data or {}
    uid = int(data["uid"])
    lead = store.get_lead(uid)
    if not lead or lead.get("vip_granted_at"):
        return
    still = bool(lead.get("bot_paused"))   # uebernommen: pruefen ja, reden nein
    if not still:
        await context.bot.send_message(chat_id=uid, text=script.DEPOSIT_CHECKING)
    # Asking makes the lookup feel real AND gives us the fallback matcher.
    if not still and not lead.get("broker_email"):
        await context.bot.send_message(chat_id=uid, text=script.ASK_BROKER_EMAIL)
        store.log_message(lead["id"], "assistant", script.ASK_BROKER_EMAIL)
    context.job_queue.run_once(
        _deposit_followup, DEPOSIT_RECHECK_EVERY,
        data={"uid": uid, "started": asyncio.get_event_loop().time(), "announced": False},
        name=_followup_name(uid),
    )


async def start_deposit_watch(context: ContextTypes.DEFAULT_TYPE, lead: dict) -> None:
    """Lead says they've paid. Check once silently, else begin the timed watch."""
    uid = int(lead["telegram_user_id"])
    if _followup_running(context, uid):
        return  # already on it

    # They may have waited before telling us — if it's already booked, no theatre.
    dep = 0.0
    try:
        dep = await _deposit_any(lead)
    except Exception:
        pass
    if dep and dep > 0:
        store.record_deposit(uid, dep)
    if dep >= cfg.VIP_MIN_DEPOSIT:
        await grant_vip(context.bot, lead)
        return

    context.job_queue.run_once(
        _deposit_ack, DEPOSIT_ACK_DELAY, data={"uid": uid}, name=_followup_name(uid),
    )


VIP_WELCOME = (
    "🎉 Welcome to the VIP signal group, {name}!\n\n"
    "The essentials:\n"
    "📊 Watch the PINNED VIDEO in the group first — it shows exactly how to copy a signal. Every signal comes with entry, stop-loss and take-profit.\n"
    "⚖️ Risk only a small part of your account per trade (rule of thumb: 1-3%).\n"
    "💬 Questions? Just reply here.\n\n"
    "_Note: signals are not financial advice. Trading carries risk — most retail "
    "traders lose money._"
)


async def on_vip_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Greet new members in the VIP group (they arrive via the invite link)."""
    cm = update.chat_member
    if not cm or not cfg.VIP_GROUP_ID or str(cm.chat.id) != str(cfg.VIP_GROUP_ID):
        return
    was_in = cm.old_chat_member.status in ("member", "administrator", "creator")
    now_in = cm.new_chat_member.status in ("member", "administrator", "creator")
    if was_in or not now_in:
        return  # not a fresh join
    user = cm.new_chat_member.user
    if user.is_bot:
        return
    try:
        await context.bot.send_message(
            chat_id=user.id,
            text=VIP_WELCOME.format(name=user.first_name or "und los"),
            parse_mode="Markdown",
        )
        log.info("Welcomed %s in VIP group", user.id)
    except Exception as e:
        log.warning("VIP welcome failed: %s", e)


async def on_channel_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Beitritt zu einem Kanal — merkt sich, zu WELCHEM PARTNER der Lead gehoert.

    EIN Info-Kanal fuer alle, je Partner ein eigener Einladungslink. Telegram
    verraet beim Beitritt, welcher Link benutzt wurde (ChatMemberUpdated.
    invite_link) — wie ein Tuersteher, der sieht, auf wessen Gaesteliste jemand
    steht.

    Warum das noetig ist: solange ein Partner keinen eigenen, gefuellten
    Info-Kanal hat, kommen seine Leute ueber den gemeinsamen herein — also in
    unseren Bot, mit unserem Broker-Link. Der Kunde waere dann uns zugeordnet
    und nicht ihm, und auffallen wuerde es niemandem, weil unsere eigene
    Abrechnung ja stimmt.

    Bewusst OHNE Kanal-Pruefung: ist der Link in tenant_invite_links
    hinterlegt, zaehlt er — egal ueber welchen Kanal. Ein unbekannter Link
    aendert nichts. Und der VIP-Beitritt laeuft weiter ueber on_vip_join; die
    beiden stoeren sich nicht.
    """
    cm = update.chat_member
    if not cm or not cm.invite_link:
        return
    was_in = cm.old_chat_member.status in ("member", "administrator", "creator")
    now_in = cm.new_chat_member.status in ("member", "administrator", "creator")
    if was_in or not now_in:
        return  # kein frischer Beitritt
    user = cm.new_chat_member.user
    if user.is_bot:
        return

    partner = store.tenant_for_invite_link(cm.invite_link.invite_link)
    if not partner:
        return  # unbekannter Link — nichts behaupten

    # Der Lead muss existieren, sonst gibt es nichts zu markieren. Er entsteht
    # spaetestens beim /start; hier legen wir ihn an, damit die Herkunft schon
    # feststeht, bevor er das erste Wort schreibt.
    store.get_or_create_lead(user.id, username=user.username,
                             first_name=user.first_name, source="channel")
    if store.set_partner(user.id, partner):
        log.info("Lead %s gehoert Partner %s (Einladungslink)", user.id, partner)


# ── Betriebs-Meldungen ──────────────────────────────────────────────────────
#
# Ein eigener Kanal ("Cosmos Bot"), damit Diego SIEHT was passiert, ohne in der
# Datenbank nachzusehen. Bewusst getrennt von der Admin-Gruppe: dort stehen nur
# Registrierung, Einzahlung und Partner — Bot-Verlauf wuerde genau das Signal
# verwaessern, das er dort sucht.
#
# EIGENER HTTP-Aufruf statt context.bot: die Meldung soll aus jeder Stelle
# funktionieren, auch aus send_pitch, das kein context hat. Und sie laeuft
# fire-and-forget in einem Thread — eine Stoerung beim Melden darf niemals das
# Gespraech mit dem Kunden aufhalten.
_MELDE_CHAT = None


def _melde_chat() -> str:
    global _MELDE_CHAT
    if _MELDE_CHAT is None:
        try:
            row = store.rest.select_one("app_secrets", key="BOT_ACTIVITY_CHAT_ID")
            _MELDE_CHAT = (row or {}).get("value") or ""
        except Exception:
            _MELDE_CHAT = ""
    return _MELDE_CHAT


def _melde_blockierend(text: str):
    chat = _melde_chat()
    if not chat:
        return
    import urllib.parse, urllib.request
    d = urllib.parse.urlencode({"chat_id": chat, "text": text,
                                "disable_web_page_preview": "true"}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{cfg.TELEGRAM_BOT_TOKEN}/sendMessage", data=d),
            timeout=10)
    except Exception as e:
        log.warning("Betriebsmeldung fehlgeschlagen: %s", e)


async def admin_melden(text: str):
    """Eine Zeile in die Admin-Gruppe ("Cosmos Admin 🔔").

    Ueber die Datenbankfunktion admin_alert() — dieselbe, mit der Einzahlungen
    und Partner-Antraege dort landen. So schreibt in die Gruppe genau EIN
    Absender, und der Chat bleibt lesbar.
    """
    if not store.rest.enabled:
        return
    try:
        await asyncio.to_thread(lambda: store.rest._c.post("/rpc/admin_alert", json={"p_text": text}))
    except Exception as e:
        log.warning("Admin-Meldung fehlgeschlagen: %s", e)


async def melde(text: str):
    try:
        await asyncio.to_thread(_melde_blockierend, text)
    except Exception:
        pass


def _wer(lead: dict) -> str:
    """Eine Zeile, an der Diego den Menschen wiedererkennt."""
    name = lead.get("first_name") or "?"
    nick = lead.get("telegram_username")
    partner = lead.get("partner_slug") or lead.get("tenant_slug") or "-"
    return f"{name}" + (f" @{nick}" if nick else "") + f" · {partner}"


async def menschlich(chat, text: str, **kw):
    """Antwortet wie ein Mensch: erst "schreibt...", dann nach einer Pause.

    WARUM DAS NOETIG IST
    Der Bot antwortete in dem Moment, in dem die Nachricht ankam. Kein Mensch
    tippt in null Sekunden — genau daran erkennt man einen Bot, noch bevor man
    liest, WAS er schreibt. Und wer merkt, dass er mit einer Maschine redet,
    schreibt nicht mehr in eigenen Worten; er tippt Stichworte. Damit faellt
    genau die Antwort weg, aus der wir Erfahrung und Land lesen.

    Die Pause richtet sich nach der Laenge — ein Satz geht schnell, ein Absatz
    dauert. Gedeckelt bei 5 Sekunden: laenger wirkt nicht menschlicher, sondern
    kaputt, und Telegram blendet "schreibt..." nach 5 Sekunden ohnehin aus.

    Das Tippen laeuft in Schueben, weil Telegram die Anzeige nach ~5 s
    zurueckzieht; bei laengeren Pausen wird sie deshalb erneuert.
    """
    dauer = min(5.0, max(1.2, 0.7 + len(text) / 55))
    rest = dauer
    while rest > 0:
        try:
            await chat.send_chat_action("typing")
        except Exception:
            pass
        schub = min(4.0, rest)
        await asyncio.sleep(schub)
        rest -= schub
    return await chat.send_message(text, **kw)


async def send_opener(update: Update, lead: dict, context=None):
    """FIXED opener. No buttons, no model call — must feel like a real person
    typing, so the lead answers in their own words (parsed by _guess_experience).

    The sent id is remembered so a late pre-filled line can move the greeting
    below it (see on_message) instead of greeting twice.
    """
    text = script.opener(lead.get("first_name"), cfg.BRAND_NAME)
    erster_start = (lead.get("step") or "new") == "new"
    store.log_message(lead["id"], "assistant", text)
    store.set_step(lead["telegram_user_id"], "opened")
    await melde(f"▶️ START · {_wer(lead)}\nQuelle: {lead.get('source') or '-'}")
    # In die Admin-Gruppe, mit dem Weg direkt in den Chat. Ansage 11.09.:
    # "wenn jemand den Bot startet, mit Link zum Chat". Nur beim ERSTEN Start —
    # send_opener laeuft ein zweites Mal, wenn die vorgetippte Zeile nach dem
    # START-Knopf kommt, und zwei Meldungen fuer eine Person sind Laerm.
    if erster_start:
        await admin_melden(
            f"▶️ Neuer Bot-Start\n{_wer(lead)}\n"
            f"Chat: https://cosmos-candles.com/admin/leads?lead={lead['id']}")
    if context is not None:
        # VOR dem Tippen merken: menschlich() wartet bis zu 5 s, und genau in
        # dieses Fenster fiel am 11.09. das zweite /start.
        context.bot_data[f"opener_zeit_{lead['telegram_user_id']}"] = time.time()
    sent = await menschlich(update.effective_chat, text)
    if context is not None:
        context.bot_data[f"opener_{lead['telegram_user_id']}"] = sent.message_id


async def send_signal_question(chat, lead: dict, intro: str | None = None):
    """FIXED second question (signal group / copy trading). No model call.

    Tim wants both qualifiers, always in this order, so this sits between the
    experience answer and the pitch. The intro (the acknowledgement of answer 1)
    rides along, but the question itself stays a message of its own — one
    question per message.
    """
    text = f"{intro}\n\n{script.SIGNAL_QUESTION}" if intro else script.SIGNAL_QUESTION
    store.log_message(lead["id"], "assistant", text)
    store.set_step(lead["telegram_user_id"], "asked_signals")
    await menschlich(chat, text)


async def on_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ein Video vom Admin wird zur Antwort des Bots.

    Telegram gibt beim Hochladen eine file_id zurueck; damit ist jedes weitere
    Senden sofort und ohne Upload. Eine file_id gehoert aber dem Bot, der sie
    bekommen hat — deshalb muss das Video HIER ankommen und kann nicht aus einem
    anderen Chat kopiert werden.

    Bedienung: Video an den Bot schicken, als Bildunterschrift
        #video <schluessel>   z.B.  #video new   oder  #video default
    Alles nach dem Schluessel wird zum Text unter dem Video.
    """
    msg = update.effective_message
    if not msg or not msg.video:
        return
    if update.effective_user.id != store.admin_telegram_id():
        return                      # stillschweigend: kein Hinweis fuer Fremde

    text = (msg.caption or "").strip()
    if not text.lower().startswith("#video"):
        await msg.reply_text(
            "Video angekommen. Zum Speichern schick es nochmal mit einer "
            "Bildunterschrift wie:\n\n#video default Dein Text unter dem Video")
        return

    teile = text.split(None, 2)
    key = (teile[1] if len(teile) > 1 else "default").lower()
    caption = teile[2] if len(teile) > 2 else None
    if store.set_video(key, msg.video.file_id, caption):
        await msg.reply_text(f"Gespeichert als \"{key}\".\n"
                             f"Text darunter: {caption or '(Standardtext)'}")
    else:
        await msg.reply_text("Konnte nicht gespeichert werden — siehe Log.")


async def send_pitch(chat, lead: dict, intro: str | None = None):
    """FIXED value message — ALWAYS ends with the tracked link.

    Sent as several short messages with a typing pause between them. One long
    block with a bullet list is the clearest "this is a bot" tell there is; a
    person sends two or three lines and you watch them arrive.
    """
    # Der Link des PARTNERS, dem dieser Lead gehoert — nicht der aus
    # unserer .env. Kam er ueber einen fremden Einladungslink herein,
    # gehoert die Provision dem Partner, und der Broker muss denselben
    # Code sehen wie unsere Abrechnung. Ohne Zuordnung bleibt alles
    # beim Alten.
    # Ohne Land kein Link. Welcher Broker den Kunden ueberhaupt ANNIMMT, haengt
    # daran: Hero nimmt US-Kunden, VT weist sie ab — und zwar erst nach dem
    # Klick. Eine Frage mehr ist billiger als ein Link, der ihn rauswirft.
    if not lead.get("country"):
        await menschlich(chat, script.ASK_COUNTRY)
        store.log_message(lead["id"], "assistant", script.ASK_COUNTRY)
        # Den Schritt MERKEN. Ohne das blieb er auf "asked_signals", und die
        # Landantwort landete im Signal-Zweig — siehe on_message, 12.09.
        store.set_step(lead["telegram_user_id"], "asked_country")
        return
    ziel = store.broker_link_for(lead.get("partner_slug"), lead.get("country")) or cfg.HANDOVER_LINK
    link = tracked_link(ziel, lead["token"])

    # ── Video statt Textwand ────────────────────────────────────────────────
    #
    # Wer ueber ein Reel kommt, hat gerade zwanzig Sekunden Video gesehen. Eine
    # Textwand als Antwort ist die falsche Form — dieselbe Aussage als Video,
    # darunter zwei Zeilen und der Link, trifft ihn dort, wo er herkommt.
    #
    # Ohne hinterlegtes Video bleibt alles beim Alten: der lange Pitch ist der
    # Rueckfall, nicht ein Fehler.
    video = store.video_for(lead.get("experience"))
    if video:
        try:
            await chat.send_video(video["file_id"],
                                  caption=(video.get("caption") or script.VIDEO_UNTERTEXT))
            await asyncio.sleep(1.4)
            nachricht = script.VIDEO_LINK.format(link=link, min=f"{cfg.VIP_MIN_DEPOSIT:.0f}$")
            await chat.send_message(nachricht, disable_web_page_preview=True)
            store.log_message(lead["id"], "assistant", "[video] " + nachricht)
            store.set_step(lead["telegram_user_id"], "pitched")
            store.mark_link_sent(lead["telegram_user_id"])
            # Die Einzahl-Anleitung gilt fuer den Video-Weg genauso. Bis zum
            # 11.09. stand hier ein nacktes return: sobald ein Video hinterlegt
            # war, bekam KEIN Lead mehr den Hinweis "nur Krypto, und vom Wallet
            # aufs Handelskonto" — also genau den Satz, ohne den am 01.09. die
            # Einzahlung ankam und niemand freigeschaltet wurde.
            await einzahl_hinweis(chat, lead, link)
            return
        except Exception as e:
            log.warning("Video-Antwort fehlgeschlagen (%s) — nehme den Text", e)

    parts = script.pitch_parts(link, cfg.VIP_MIN_DEPOSIT)
    if intro:
        # Glue the acknowledgement onto the first line — a one-line "Passt." on
        # its own is the machine-gun feel we are trying to avoid.
        parts = [intro + " " + parts[0]] + parts[1:]

    store.log_message(lead["id"], "assistant", "\n\n".join(parts))
    store.set_step(lead["telegram_user_id"], "pitched")
    if link:
        store.mark_link_sent(lead["telegram_user_id"])

    for i, part in enumerate(parts):
        last = i == len(parts) - 1
        if True:
            try:
                await chat.send_chat_action("typing")
            except Exception:
                pass
            await asyncio.sleep(min(2.4, 0.9 + len(part) / 90))
        # Only the closing line carries the button.
        try:
            await chat.send_message(part, reply_markup=script.pitch_button(link) if last else None)
        except Exception:
            await chat.send_message(f"{part}\n\n{link}" if last and link else part,
                                    disable_web_page_preview=False)

    # ── Die zwei Schritte, an denen bisher jeder haengen blieb ───────────────
    # Direkt nach dem Link, VOR der Einzahlung. Bei diesem Broker landet Geld
    # zuerst im Wallet, und freigeschaltet wird gegen das Handelskonto — wer das
    # nicht weiss, zahlt ein und wird nie freigeschaltet. Am 01.09. im echten
    # Testlauf genau so passiert.
    #
    # Eigene Nachricht mit Pause davor: an den Link geklebt wuerde sie als
    # Kleingedrucktes gelesen und ueberblaettert.
    await einzahl_hinweis(chat, lead, link)


async def einzahl_hinweis(chat, lead: dict, link):
    """Die Einzahl-Anleitung direkt nach dem Link — fuer Text- UND Video-Weg."""
    if not link:
        return
    try:
        await asyncio.sleep(1.6)
        await chat.send_chat_action("typing")
        await asyncio.sleep(1.4)
        await menschlich(chat, script.DEPOSIT_GUIDE)
        store.log_message(lead["id"], "assistant", script.DEPOSIT_GUIDE)
    except Exception:
        log.warning("deposit guide failed for %s", lead.get("telegram_user_id"))


def _bot_zuletzt_vor_stunden(lead: dict) -> float:
    """Wie lange die letzte Nachricht des Bots an diesen Lead her ist (Stunden).
    Unbekannt -> sehr lange."""
    try:
        r = store.rest._c.get("/setter_messages", params={
            "select": "created_at", "lead_id": f"eq.{lead['id']}", "role": "eq.assistant",
            "order": "created_at.desc", "limit": "1"}, timeout=5)
        rows = r.json() if r.status_code == 200 else []
        if not rows:
            return 1e9
        import datetime as _dt
        roh = rows[0]["created_at"].replace("Z", "+00:00")
        # Python 3.9 nimmt nur 3 oder 6 Nachkommastellen — Postgres liefert auch 5.
        import re as _re
        m = _re.search(r"\.(\d+)", roh)
        if m:
            roh = roh.replace("." + m.group(1), "." + (m.group(1) + "000000")[:6])
        t = _dt.datetime.fromisoformat(roh)
        return (_dt.datetime.now(_dt.timezone.utc) - t).total_seconds() / 3600
    except Exception:
        return 1e9


async def resend_link(chat, lead: dict):
    """They tapped the group button again — one line and the button, not the
    whole pitch again.

    AUSSER bei Rueckkehrern. Am 11.09. kam "Bill" nach einer Woche zurueck
    ("Hi, I want to join VIP 🚀") und bekam nur "Here's the sign-up link
    again." — ohne Video, ohne Einzahl-Anleitung, ohne die Bitte, sich nach
    der Einzahlung zu melden, und ohne Land, also mit dem Standard-Broker.
    Seinen Link hatte er am 04.09. bekommen, bevor es Landfrage und Video gab.
    Wer den Link vor ueber 24 h bekam oder bei wem das Land fehlt, bekommt
    deshalb den AKTUELLEN Ablauf von vorn: Landfrage, dann Video, Link und
    Anleitung. Die Kurzform bleibt fuer den, der gerade eben schon alles hatte.
    """
    if not lead.get("country") or _bot_zuletzt_vor_stunden(lead) > 24:
        await send_pitch(chat, lead)
        return
    ziel = store.broker_link_for(lead.get("partner_slug"), lead.get("country")) or cfg.HANDOVER_LINK
    link = tracked_link(ziel, lead["token"])
    store.log_message(lead["id"], "assistant", script.PITCH_AGAIN)
    await chat.send_message(script.PITCH_AGAIN, reply_markup=script.pitch_button(link))


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    u = update.effective_user
    payload = context.args[0] if context.args else None
    lead = store.get_or_create_lead(u.id, username=u.username, first_name=u.first_name, source=payload)
    if lead.get("status") == "opted_out":
        store.set_status(u.id, "active")  # they came back on their own
    # Tapped the group button again although they already have the link →
    # don't restart the qualification, just hand the link over once more.
    # Telegram sends a visible "/start" when the START button is pressed — delete it
    # so the chat reads like a normal conversation, not like a command console.
    try:
        await update.message.delete()
    except Exception:
        pass
    if lead.get("step") == "pitched":
        await resend_link(update.effective_chat, lead)
        return
    # Zweites /start kurz nach dem ersten (doppelt getippt, oder nochmal ueber
    # den Kanal-Knopf): die Begruessung steht schon auf dem Schirm. Am 11.09.
    # bekam der erste echte Lead der Nacht sie so zweimal, fuenf Sekunden
    # auseinander. Nach 10 Minuten wird wieder begruesst — wer den Chat
    # geloescht hat und neu startet, saehe sonst gar nichts.
    zuletzt = context.bot_data.get(f"opener_zeit_{u.id}", 0)
    if lead.get("step") == "opened" and time.time() - zuletzt < 600:
        return
    await send_opener(update, lead, context)


async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/reset — internal: wipe my own lead and start the funnel from scratch.

    Deleting the chat in Telegram only clears the lead's screen; our row keeps
    the step, so a re-test lands on "here's the link again" instead of the
    opener. Allowlisted ids only — for anyone else the command does not exist.
    """
    u = update.effective_user
    if u.id not in cfg.RESET_USER_IDS:
        log.info("unauthorised /reset from telegram_user_id=%s (@%s)", u.id, u.username)
        return
    _cancel_nudge(context, u.id)
    if context.job_queue:
        for j in context.job_queue.get_jobs_by_name(_followup_name(u.id)):
            j.schedule_removal()
    store.delete_lead(u.id)
    try:
        await update.message.delete()
    except Exception:
        pass
    lead = store.get_or_create_lead(u.id, username=u.username, first_name=u.first_name)
    await send_opener(update, lead, context)


async def testvip(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/testvip <passwort> — pretend the deposit landed, so the team can see the
    last step end to end: the single-use invite DM and the welcome in the group.

    Guarded by a shared password rather than a user allowlist, so it can be handed
    to whoever is testing. Wrong or missing password: no reaction at all, the
    command must not exist for a real lead.
    """
    u = update.effective_user
    given = " ".join(context.args or []).strip()
    if not cfg.TEST_GRANT_SECRET or given != cfg.TEST_GRANT_SECRET:
        log.info("bad /testvip from telegram_user_id=%s (@%s)", u.id, u.username)
        return
    try:
        await update.message.delete()   # don't leave the password in the chat
    except Exception:
        pass

    lead = store.get_or_create_lead(u.id, username=u.username, first_name=u.first_name)
    # Book the threshold amount so the lead looks exactly like a real depositor.
    store.record_deposit(u.id, float(cfg.VIP_MIN_DEPOSIT))
    lead = store.get_lead(u.id) or lead
    ok = await grant_vip(context.bot, lead)
    if not ok:
        await update.effective_chat.send_message(
            "Unlock failed — is the bot an admin in the VIP group with permission "
            "to create invite links?"
        )


async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    store.set_status(update.effective_user.id, "opted_out")
    await update.message.reply_text("All good, I won't message you again. If you change your mind later, just send /start. 👋")


# Order matters: "new" is checked first, so "keine Erfahrung" lands on new even
# though it also contains "erfahrung".
EXP_WORDS = {
    "new": ("new", "none", "no experience", "never", "not really", "nothing",
            "beginner", "newbie", "starting", "just started", "zero", "0"),
    "pro": ("experience", "experienced", "years", "pro", "a while", "since",
            "been trading", "i trade", "trading for", "yes", "yeah", "yep"),
}
DONE_WORDS = ("deposited", "funded", "transferred", "sent it", "done", "paid",
              "finished", "registered", "signed up", "signup", "deposit", "topped up",
              # 11.09.: Das Bot-Video sagt "come back here and tell me". Die
              # natuerlichen Antworten darauf fielen alle an die KI durch — und
              # dann fragt niemand nach der Broker-Mail, dem einzigen Weg, eine
              # HeroFX-Einzahlung zuzuordnen. Gemessen an 12 Probesaetzen.
              "did it", "sent the money", "money is on", "on my trading account",
              "on the trading account", "in my trading account", "it's there", "its there",
              "eingezahlt", "fertig", "erledigt", "ueberwiesen", "überwiesen")

# Eine FRAGE ist keine Erfolgsmeldung. "How do I deposit?" enthielt "deposit" und
# startete bis zum 11.09. die Einzahl-Pruefung — der Lead bekam statt einer
# Antwort "let me take a look" und die Frage nach seiner Broker-Mail.
QUESTION_START = ("how", "what", "where", "when", "can ", "do i", "should", "which", "is it",
                  "wie", "was ", "wo ", "wann", "kann", "muss", "welche")


def _meldet_einzahlung(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t or "?" in t or t.startswith(QUESTION_START):
        return False
    return any(w in t for w in DONE_WORDS)


def _is_prefill(text: str) -> bool:
    """Is this the pre-filled opt-in line from the group button?

    The deep link drops it into the input box. Depending on the client it can
    arrive AFTER the user already pressed START (so the opener is on screen) —
    answering it would greet them a second time, so we swallow it instead.
    """
    norm = lambda s: "".join(c for c in s.lower() if c.isalnum() or c.isspace()).strip()
    return norm(text) == norm(cfg.OPTIN_PREFILL_TEXT)


def _guess_experience(text: str) -> str:
    """Map a typed answer to new/some/pro. Defaults to 'some' when unsure."""
    return _match_experience(text) or "some"


def _match_experience(text: str) -> str | None:
    """The answer only if the wording actually matches — else None."""
    low = text.lower()
    for key, words in EXP_WORDS.items():
        if any(w in low for w in words):
            return key
    if any(w in low for w in ("some", "a bit", "a little", "few", "kind of", "recently", "sort of")):
        return "some"
    return None


EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _find_email(text: str) -> str | None:
    m = EMAIL_RE.search(text or "")
    return m.group(0) if m else None


NO_WORDS = ("nein", "nie", "noch nicht", "keine", "nope", "nö", "ne ", "bisher nicht", "erste")


def _guess_signals(text: str) -> str:
    """Yes/no for the signal-group question. Defaults to 'no'."""
    return _match_signals(text) or "no"


def _match_signals(text: str) -> str | None:
    """The answer only if the wording actually matches — else None."""
    low = text.lower().strip()
    if any(w in low for w in NO_WORDS):
        return "no"
    if any(w in low for w in ("ja", "schon", "klar", "yes", "jup", "jo")):
        return "yes"
    return None


QUESTION_WORDS = ("was ", "wie ", "wer ", "wo ", "wann", "warum", "wieso", "welche",
                  "kann ich", "muss ich", "gibt es", "hast du", "seid ihr", "ist das")


def _is_aside(text: str, matched: str | None) -> bool:
    """The lead ASKED something instead of plainly answering.

    Only a real question counts. Treating every unrecognised sentence as an aside
    made the bot re-ask its own question — "Ich habe Erfahrung" fell through the
    word list and got the experience question thrown at it a second time. When in
    doubt we now take the default and move on; re-asking is worse than guessing.
    """
    low = (text or "").lower()
    if "?" in low:
        return True
    return any(w in low for w in QUESTION_WORDS)


async def _answer_aside(update, lead: dict, text: str) -> None:
    """Answer the aside briefly, then the caller continues the script."""
    try:
        reply = await asyncio.to_thread(setter_ai.answer_aside, lead, text)
    except Exception:
        reply = None
    if reply:
        store.log_message(lead["id"], "assistant", reply)
        await update.message.reply_text(reply)
        await asyncio.sleep(0.8)


# "I'm done asking" — short, no question mark, nothing to answer.
ACK_WORDS = ("okay", "ok", "alles klar", "passt", "verstanden", "gut", "danke",
             "super", "cool", "klingt gut", "top", "perfekt", "ja gut", "aha")
# Silence nudge — OFF. It was re-armed after every answer, so in a longer
# conversation it fired again and again ("hier ist der Link, hier ist der
# Link"). Set LINK_NUDGE_DELAY to a number of seconds to switch it back on.
LINK_NUDGE_DELAY = 0


def _is_ack(text: str) -> bool:
    """A closing acknowledgement rather than a new question."""
    low = (text or "").strip().lower().rstrip("!. ")
    if "?" in low or len(low.split()) > 4:
        return False
    return any(low == w or low.startswith(w) for w in ACK_WORDS)


def _nudge_name(uid: int) -> str:
    return f"linknudge:{uid}"


def _cancel_nudge(context: ContextTypes.DEFAULT_TYPE, uid: int) -> None:
    if not context.job_queue:
        return
    for j in context.job_queue.get_jobs_by_name(_nudge_name(uid)):
        j.schedule_removal()


async def send_link_line(sender, lead: dict, line: str, chat_id: int | None = None) -> None:
    """One short line plus the button — never the whole pitch again.

    `sender` is either a Chat (then it sends directly) or a Bot (then chat_id is
    required), so both the live reply path and the delayed job can use it.
    """
    link = tracked_link(cfg.HANDOVER_LINK, lead["token"])
    store.log_message(lead["id"], "assistant", line)
    kb = script.pitch_button(link)
    if chat_id is None:
        await sender.send_message(line, reply_markup=kb)
    else:
        await sender.send_message(chat_id=chat_id, text=line, reply_markup=kb)


async def _link_nudge(context: ContextTypes.DEFAULT_TYPE):
    """They went quiet after we answered something — offer the link once."""
    uid = int((context.job.data or {}).get("uid"))
    lead = store.get_lead(uid)
    if not lead or lead.get("vip_granted_at") or lead.get("status") == "opted_out":
        return
    if lead.get("status") in ("deposited",) or lead.get("bot_paused"):
        return
    await send_link_line(context.bot, lead, script.LINK_AFTER_SILENCE, chat_id=uid)


def _reask(context: ContextTypes.DEFAULT_TYPE, uid: int, step: str,
           variants: list[str]) -> str | None:
    """Next phrasing for re-asking, or None once we should stop asking.

    Repeating the identical sentence after every aside is the most robotic thing
    the funnel can do, so each attempt gets a different wording — and after the
    list runs out we simply answer and let the question stand.
    """
    key = f"reask:{uid}:{step}"
    n = context.bot_data.get(key, 0)
    context.bot_data[key] = n + 1
    return variants[n] if n < len(variants) else None


async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    u = update.effective_user
    lead = store.get_or_create_lead(u.id, username=u.username, first_name=u.first_name)
    if lead.get("status") == "opted_out":
        return  # respect opt-out

    msg = update.message.text or ""
    store.log_message(lead["id"], "user", msg)
    _cancel_nudge(context, u.id)   # they answered — no nudge needed

    # Uebernommen: Diego schreibt in diesem Chat selbst (Admin-Bereich,
    # setter_admin_send). Die Nachricht des Leads ist oben protokolliert und
    # erscheint dort — der Bot sagt nichts, sonst redet er Diego dazwischen.
    if lead.get("bot_paused"):
        return
    step = lead.get("step") or "new"

    # ── SCRIPTED PATH (no model, always identical) ───────────────────────────
    # 1) First contact via the pre-filled button text → opener.
    if step == "new":
        await send_opener(update, lead)
        return

    # 1b) The pre-filled line ("Hi, ich will VIP werden") — the natural answer to it
    #     is the opener, even if they pressed START a moment earlier. Only once the
    #     link is out do we hand that over again instead.
    if _is_prefill(msg):
        if step == "pitched":
            await resend_link(update.effective_chat, lead)
        else:
            # Greeting already on screen (they pressed START first)? Remove it and
            # re-send below their line, so the chat reads: user → bot. No double hello.
            old = context.bot_data.pop(f"opener_{u.id}", None)
            if old:
                try:
                    await context.bot.delete_message(chat_id=update.effective_chat.id, message_id=old)
                except Exception:
                    pass
            await send_opener(update, lead, context)
        return

    # 2) They answered the experience question by typing instead of tapping.
    # 2-) Die Antwort auf die Landfrage — VOR allen Frage-Zweigen.
    #
    # 12.09., Lead "J": er nannte dreimal sein Land ("germany", "united states",
    # "USA") und kam nie an den Link. Die Landfrage kommt nach der Signal-Frage,
    # der Schritt blieb aber auf "asked_signals"; also las der Signal-Zweig
    # "germany" als ungueltige Antwort, fragte neu, und nach "yes" kam wieder die
    # Landfrage. Eine Schleife, dazwischen KI-Smalltalk ("what part of NC?").
    landfrage = step == "asked_country" or (
        not lead.get("country")
        and any(script.ASK_COUNTRY[:40] in (m.get("content") or "")
                for m in store.history(lead["id"], 4)))
    if landfrage and not lead.get("country"):
        land = store.erkenne_land(msg)
        if not land and "?" in msg:
            # Eine echte Rueckfrage ("why do you need that?"): kurz antworten,
            # EINMAL neu fragen.
            await _answer_aside(update, lead, msg)
            again = _reask(context, u.id, "land", [script.ASK_COUNTRY])
            if again:
                await menschlich(update.effective_chat, again)
                store.log_message(lead["id"], "assistant", again)
                return
        # Nicht erkannt und keine Frage ("North Carolina", "Mars"): Hero nimmt
        # jeden. Weitermachen ist besser als eine zweite Runde Fragen.
        land = land or "US"
        store.set_country(u.id, land)
        lead["country"] = land
        broker = "Hero" if land.upper() == "US" else "VT"
        await melde(f"🌍 LAND · {_wer(lead)}\n{land} → {broker}")
        await send_pitch(update.effective_chat, lead)
        return

    if step == "opened":
        # A question is never an answer: "wie viele Signale?" contains "viel",
        # which used to be read as "erfahren". Never infer from a question.
        # The model decides what this message IS. A word list cannot tell an
        # answer from a remark: "wassup bro i saw you on insta" matched nothing,
        # contained no question mark, and so got answered with "Nice, so you know
        # the basics already" — to someone who had said nothing about experience.
        verdict = await asyncio.to_thread(
            setter_ai.classify, lead,
            "Do you have any trading experience, or are you completely new to this?",
            ["new", "some", "pro"], msg,
        )
        matched = verdict["value"] if verdict["kind"] == "answer" else (
            None if "?" in msg else _match_experience(msg)   # fallback if the model is down
        )

        if verdict["kind"] != "answer":
            reply = verdict["reply"]
            if reply:
                await menschlich(update.effective_chat, reply)
                store.log_message(lead["id"], "assistant", reply)
            elif _is_aside(msg, matched):
                await _answer_aside(update, lead, msg)
            if matched is None:
                # Question still open. Re-ask in different words rather than
                # skipping ahead, which used to land the NEXT reply on the wrong
                # question. After two attempts _reask gives up on its own.
                again = _reask(context, u.id, "exp",
                               [script.ASK_EXPERIENCE_AGAIN, script.ASK_EXPERIENCE_AGAIN_2])
                if again:
                    await menschlich(update.effective_chat, again)
                    store.log_message(lead["id"], "assistant", again)
                return

        key = matched or "some"
        store.set_step(u.id, "opened", experience=key)
        await send_signal_question(update.effective_chat, lead,
                                   intro=script.EXPERIENCE_REPLY.get(key) if verdict["kind"] == "answer" else None)
        return

    # 2b) They answered the signal-group question by typing instead of tapping.
    if step == "asked_signals":
        verdict = await asyncio.to_thread(
            setter_ai.classify, lead,
            "Have you ever been in a signal group, or copied trades before?",
            ["yes", "no"], msg,
        )
        matched = verdict["value"] if verdict["kind"] == "answer" else (
            None if "?" in msg else _match_signals(msg)
        )

        if verdict["kind"] != "answer":
            reply = verdict["reply"]
            if reply:
                await menschlich(update.effective_chat, reply)
                store.log_message(lead["id"], "assistant", reply)
            elif _is_aside(msg, matched):
                await _answer_aside(update, lead, msg)
            if matched is None:
                again = _reask(context, u.id, "sig",
                               [script.SIGNAL_QUESTION_AGAIN, script.SIGNAL_QUESTION_AGAIN_2])
                if again:
                    await menschlich(update.effective_chat, again)
                    store.log_message(lead["id"], "assistant", again)
                return

        intro = script.SIGNAL_REPLY.get(matched or "no") if verdict["kind"] == "answer" else None
        await send_pitch(update.effective_chat, lead, intro=intro)
        return

    # 2c) They sent the broker e-mail we asked for → store it and look again now.
    mail = _find_email(msg)
    if mail and not lead.get("broker_email"):
        store.set_broker_email(u.id, mail)
        lead["broker_email"] = mail.strip().lower()
        await menschlich(update.effective_chat, script.BROKER_EMAIL_OK)

        # Ab hier entsteht das Academy-Konto — der Kunde hat sich nie
        # registriert und soll es auch nicht muessen. Die Adresse, die er
        # gerade genannt hat, ist alles, was fehlte.
        await melde(f"📧 BROKER-MAIL · {_wer(lead)}\n{lead['broker_email']}")
        konto = store.unlock_account(u.id, lead["broker_email"])
        if konto.get("login_link"):
            await melde(f"✅ KONTO {konto.get('status','?')} · {_wer(lead)}\n"
                        f"Stufe {konto.get('tier') or '-'} · {konto.get('deposit') or 0} · "
                        f"Partner {konto.get('partner') or '-'}")
        else:
            await melde(f"⏳ NOCH NICHT GEFUNDEN · {_wer(lead)}\n"
                        f"{lead['broker_email']} steht nicht in den Broker-Daten")
        if konto.get("login_link"):
            await update.effective_chat.send_message(
                script.ACCOUNT_READY.format(link=konto["login_link"]),
                disable_web_page_preview=True)
            store.log_message(lead["id"], "assistant", "account ready")
        else:
            await update.effective_chat.send_message(script.ACCOUNT_PENDING)
            store.log_message(lead["id"], "assistant", "account pending")

        dep = await _deposit_any(lead)
        if dep >= cfg.VIP_MIN_DEPOSIT:
            await grant_vip(context.bot, lead)
        elif dep > 0:
            store.record_deposit(u.id, dep)
        return

    # 2d) Die Antwort auf die Landfrage. Muss VOR der KI stehen: sonst zerredet
    #     sie ein einzelnes Wort wie "Germany" zu einer Rueckfrage.
    if not lead.get("country"):
        land = store.erkenne_land(msg)
        if land:
            store.set_country(u.id, land)
            lead["country"] = land
            broker = "Hero" if land.upper() == "US" else "VT"
            await melde(f"🌍 LAND · {_wer(lead)}\n{land} → {broker}")
            await send_pitch(update.effective_chat, lead)
            return
        # Nicht erkannt, obwohl die Frage schon lief: Hero nimmt jeden, also
        # lieber weitermachen als den Kunden in einer Schleife festhalten.
        if any(script.ASK_COUNTRY[:40] in (m.get("content") or "")
               for m in store.history(lead["id"], 6)):
            store.set_country(u.id, "US")
            lead["country"] = "US"
            await send_pitch(update.effective_chat, lead)
            return

    # 3) "Bin fertig / hab eingezahlt" → start the timed watch.
    #    Deliberately NO instant reply: the broker sync runs every 10 minutes, so
    #    an immediate "seh ich nicht" would be wrong far more often than right.
    if _meldet_einzahlung(msg):
        await start_deposit_watch(context, lead)
        return

    # ── AI PATH: only for real questions/objections after the pitch ──────────
    history = store.history(lead["id"], cfg.HISTORY_WINDOW)

    # spam / cost guard
    if len([m for m in history if m["role"] == "user"]) > cfg.MAX_TURNS:
        return

    # "okay" / "alles klar" after the link went out: they're done asking. Put the
    # link in front of them once instead of burning a model call on small talk.
    # "okay" after the link went out: hand it over once — and only once. Sending
    # it on every acknowledgement is what made this feel like spam.
    ack_key = f"acklink:{u.id}"
    if _is_ack(msg) and lead.get("status") in ("link_sent", "deposited"):
        if not context.bot_data.get(ack_key):
            context.bot_data[ack_key] = True
            await send_link_line(update.effective_chat, lead, script.LINK_AFTER_ACK)
            return

    await update.effective_chat.send_action(ChatAction.TYPING)
    try:
        text = await _ai(lead, history)
    except Exception as e:
        log.exception("AI error: %s", e)
        await update.message.reply_text(
            "Sorry, kurzer Aussetzer bei mir 🙈 schreib nochmal, dann geht's weiter."
        )
        return
    text = setter_ai.ensure_link(text, lead)   # only until the link went out once
    store.log_message(lead["id"], "assistant", text)
    if setter_ai.sent_link(text, lead["token"]):
        store.mark_link_sent(u.id)
    await update.message.reply_text(text, disable_web_page_preview=False)

    # After an answer, arm a single nudge: if they go quiet, the link is offered
    # once more. Any message from them cancels it (see top of on_message).
    if LINK_NUDGE_DELAY and lead.get("status") in ("link_sent", "deposited") and context.job_queue:
        _cancel_nudge(context, u.id)
        context.job_queue.run_once(_link_nudge, LINK_NUDGE_DELAY,
                                   data={"uid": u.id}, name=_nudge_name(u.id))

    # If the link already went out, this is a good moment to check whether their
    # deposit has landed → grant VIP instantly (the sweep is the safety net).
    if lead.get("status") in ("link_sent", "deposited"):
        await check_and_grant(context.bot, lead)


def build_app() -> Application:
    cfg.require_runtime()
    app = ApplicationBuilder().token(cfg.TELEGRAM_BOT_TOKEN).build()
    # Commands only in PRIVATE chats — the bot must stay silent inside the groups
    # (info group = just the pinned button, VIP group = just signals + welcome).
    app.add_handler(CommandHandler("start", start, filters=filters.ChatType.PRIVATE))
    app.add_handler(CommandHandler("stop", stop, filters=filters.ChatType.PRIVATE))
    app.add_handler(CommandHandler("reset", reset, filters=filters.ChatType.PRIVATE))
    app.add_handler(CommandHandler("testvip", testvip, filters=filters.ChatType.PRIVATE))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, on_message))
    # Videos nimmt bisher niemand entgegen. Der Bot soll sie aber selbst
    # hochbekommen — nur so gehoert ihm die file_id, mit der er sie spaeter
    # sendet.
    app.add_handler(MessageHandler(filters.VIDEO & filters.ChatType.PRIVATE, on_video))
    app.add_handler(ChatMemberHandler(on_vip_join, ChatMemberHandler.CHAT_MEMBER))
    # Beitritt ueber einen Partner-Einladungslink -> Herkunft festhalten.
    app.add_handler(ChatMemberHandler(on_channel_join, ChatMemberHandler.CHAT_MEMBER))
    # Periodic deposit sweep → auto-grant VIP once a lead has deposited enough.
    if app.job_queue and cfg.VIP_GROUP_ID:
        app.job_queue.run_repeating(deposit_sweep, interval=cfg.DEPOSIT_SWEEP_MINUTES * 60, first=30)
        # Postausgang fuer Admin-Nachrichten: alle 4 s, damit es sich wie ein Chat anfuehlt.
        app.job_queue.run_repeating(outbox_senden, interval=4, first=5)
        log.info("Deposit sweep scheduled every %d min (VIP >= %.0f)", cfg.DEPOSIT_SWEEP_MINUTES, cfg.VIP_MIN_DEPOSIT)
    return app


if __name__ == "__main__":
    log.info("Setter-Bot startet … (Modell: %s)", cfg.SETTER_MODEL)
    build_app().run_polling(allowed_updates=Update.ALL_TYPES)
