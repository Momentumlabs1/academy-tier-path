"""The FIXED funnel script — the backbone of the setter.

Why a script and not pure AI: the core path must be identical every single time
(and cost nothing). The model only steps in for off-script questions/objections.

Flow:
  new       → opener + experience question
  qualified → value message + THE LINK (always, guaranteed)
  waiting   → free chat, AI answers questions; deposit sweep takes over
Edit the texts here — {placeholders} are filled from config/lead.

COSMOS CANDLES INSTANCE. Two things differ from the original and both were
deliberate, not translation drift:

  · ENGLISH. The whole platform is English; a German setter would be the one
    German surface a member ever meets.

  · NO INVENTED NUMBERS. The original fact sheet claimed a 73% win rate and
    named TradeQuo as the broker. The win rate was never measured — the same
    figure was removed from the website today — and TradeQuo is no longer the
    broker. A setter that quotes a made-up hit rate to a prospect is the single
    most expensive sentence in this whole funnel, because it is the one they
    will repeat back when it does not hold.
"""
from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# ── Step 1: opener ──────────────────────────────────────────────────────────
OPENER = (
    "Hey {name} 👋 good to hear from you.\n\n"
    "Before I send you the VIP details — do you have any trading experience, "
    "or are you completely new to this?"
)


# ── Step 2: tailored intro line per answer ──────────────────────────────────
# Beginners get the academy named right here: it is the answer to the objection
# they are about to have ("I could never do this"), so it has to land before the
# pitch, not after it.
EXPERIENCE_REPLY = {
    "new":  "All good, that's where most people here start — that's what the academy is for.",
    "some": "Nice, so you know the basics already.",
    "pro":  "Solid, then you can jump straight in.",
}

# ── Step 3: second qualifying question (asked after the experience answer) ──
# No tap-to-answer buttons anywhere in the funnel: the lead types their own
# reply, which keeps it a conversation instead of a form. Typed answers are
# mapped by _guess_experience / _guess_signals in bot.py.
# One question per message, so this goes out on its own instead of being bolted
# onto the reply above.
# Re-asked after we answered something in between. Never the same sentence
# twice: a human rephrases, a bot repeats. After two attempts we stop asking
# altogether — the question is on screen, nagging only annoys.
ASK_EXPERIENCE_AGAIN = (
    "So how about you — any trading experience yet, or brand new?"
)
ASK_EXPERIENCE_AGAIN_2 = (
    "Quick one: would you say you're a beginner, or have you been at it a while?"
)

SIGNAL_QUESTION = (
    "And have you ever been in a signal group, or copied trades before?"
)

# Asked again after we answered something in between. Deliberately a DIFFERENT
# wording — repeating the identical sentence verbatim is the most robotic thing
# a chat can do.
SIGNAL_QUESTION_AGAIN = (
    "And — have you been in a signal group before?"
)
SIGNAL_QUESTION_AGAIN_2 = (
    "Have you done anything like this before?"
)


SIGNAL_REPLY = {
    "yes": "Okay, so you know how it works.",
    "no":  "No problem, it's simpler than it sounds.",
}

# ── The value + handover. Sent as SHORT, separate messages. ────────────────
# A single block with an emoji bullet list reads like a brochure — exactly the
# "I am a bot" tell we are trying to avoid. Real people send two or three short
# lines with a pause between them, so that is what this does. Two messages then
# the link — more than that machine-guns the lead.
PITCH_PARTS = [
    "In the VIP group you get 3–6 signals a day — entry, stop-loss and take-profit "
    "are always included — plus the trading academy with the full orderflow strategy.",

    "It costs you nothing. You only fund your own account at our partner broker, "
    "from {min_dep:.0f}$ — that money stays yours and you can withdraw it anytime.",

    "Here's the sign-up. The link is registered to you — once your deposit is on "
    "the trading account, come back here and tell me and I'll unlock you.",
]

# No link configured yet (setup/testing) — same tone, no fake link.
PITCH_PARTS_NO_LINK = [
    "In the VIP group you get 3–6 signals a day — entry, stop-loss and take-profit "
    "are always included — plus the trading academy.",

    "It costs you nothing — you only fund your own account at our partner broker, "
    "from {min_dep:.0f}$. I'll send you the link in a sec.",
]

# They tapped the group button again although they already have the link. Don't
# repeat the whole pitch — one line and the button.
# ── Die zwei Schritte, an denen bisher jeder haengen blieb ───────────────────
#
# Am 01.09.2026 im echten Testlauf aufgeflogen: Diego hat eingezahlt, das Geld
# kam an — und bei uns passierte nichts. Grund: bei diesem Broker landet eine
# Einzahlung zuerst im WALLET. Freigeschaltet wird aber gegen den Stand des
# HANDELSKONTOS, und in das Wallet kann unsere Schnittstelle gar nicht sehen
# (beide Wallet-Endpunkte antworten 404, nachgeprueft).
#
# Fuer den Kunden heisst das ohne diese Nachricht: er zahlt ein, sieht sein
# Geld im Portal liegen, und wird nie freigeschaltet. Er denkt, wir haben ihn
# abgezogen. Das ist der teuerste Moment im ganzen Ablauf — und er entsteht
# aus zwei Saetzen, die niemand gesagt hat.
#
# Deshalb kommen sie hier, direkt nach dem Anmeldelink, VOR der Einzahlung.
DEPOSIT_GUIDE = (
    "Two things before you fund — most people miss them, and then the money is "
    "there but your access stays shut.\n\n"
    "1\u20e3 Deposits are crypto only. No crypto yet? Open Trust Wallet, buy "
    "there with Apple Pay, then send it to the deposit address the broker shows "
    "you.\n\n"
    "2\u20e3 Your deposit lands in your WALLET first. From there you have to "
    "move it onto a TRADING account — the wallet on its own does not count. No "
    "trading account yet? Open one first — pick the TradeLocker \"Cosmos "
    "Special\" one, that is where your commission discount sits — then transfer "
    "the full amount over.\n\n"
    "Once it sits on the trading account, message me here and I'll unlock you."
)

# Er meldet "hab eingezahlt", wir sehen aber nichts. In neun von zehn Faellen
# liegt das Geld im Wallet. Danach fragen, bevor irgendjemand an der Technik
# zweifelt.
DEPOSIT_CHECK_WALLET = (
    "One quick check: is the money still sitting in your WALLET at the broker? "
    "That is the usual one. It only counts once you transfer it onto your "
    "trading account — wallet alone stays invisible to me."
)

# ── Nach der Einzahlung: der Zugang ─────────────────────────────────────────
#
# Ab dem 05.09. registriert sich niemand mehr vorne auf der Website. Das Konto
# entsteht HIER, aus der Einzahlung und der einen Adresse, die wir erfragt
# haben. Der Kunde bekommt den Anmeldelink im Chat UND per Mail — nicht jeder
# liest Mails, und wer gerade eingezahlt hat, will jetzt hinein und nicht
# spaeter.
ACCOUNT_READY = (
    "Done — your academy is open.\n\n"
    "{link}\n\n"
    "That link signs you in, no password needed. Same link is in your inbox."
)

# Er hat eingezahlt, wir sehen es noch nicht. Zwei moegliche Gruende, und beide
# sind harmlos — aber Schweigen ist es nicht: wer gerade Geld ueberwiesen hat
# und nichts hoert, denkt, er wurde abgezogen.
ACCOUNT_PENDING = (
    "Got it. I can't see that deposit on our side yet — it usually takes a few "
    "minutes to show up, sometimes longer. Nothing is lost: as soon as it lands "
    "I'll open everything and send you the link right here."
)

# ── Die Landfrage ───────────────────────────────────────────────────────────
#
# Sie steht VOR dem Anmeldelink, weil davon abhaengt, WELCHER Link es wird:
# HeroFX nimmt US-Kunden an (St. Lucia, Non-Solicitation), VT Markets nicht.
# Schicken wir einen US-Kunden zu VT, wird er dort abgewiesen — nachdem er
# geklickt hat, also im schlechtesten Moment.
#
# Bewusst beilaeufig formuliert und mit dem Grund dahinter: "Aus welchem Land
# kommst du?" ohne Begruendung klingt nach Datensammeln. Mit dem Grund ist es
# eine Serviceleistung.
ASK_COUNTRY = (
    "Quick one before I send the link — which country are you in?\n\n"
    "Brokers work differently depending on where you live, and I want to send "
    "you the one that will actually accept you."
)

# ── Nach dem Video ──────────────────────────────────────────────────────────
#
# Wer ueber ein Reel kommt, hat gerade zwanzig Sekunden Video gesehen und liest
# danach keine Textwand. Also: Video, darunter zwei Zeilen, dann der Link.
# Bewusst KURZ — der lange Pitch existiert weiterhin als Rueckfall, wenn kein
# Video hinterlegt ist.
VIDEO_UNTERTEXT = (
    "Short version: you copy the trades, the academy is included, "
    "and it costs you nothing."
)

# Rueckweg ausdruecklich: "komm zurueck und sag Bescheid". Diego will, dass der
# Lead nach der Einzahlung ZURUECKSCHREIBT (11.09.), und das Bot-Video sagt es
# genau so. Stand hier "I unlock you automatically", schrieb niemand zurueck —
# dann fragt der Bot nie nach der Broker-Mail, und die ist bei HeroFX der einzige
# verlaessliche Abgleich. Die automatische Freischaltung laeuft trotzdem weiter;
# der Satz nimmt nichts weg, er holt nur die Mail dazu.
VIDEO_LINK = (
    "Here's your access link — open your account with our partner broker "
    "and fund it with at least {min}:\n\n{link}\n\n"
    "Once it's funded, come back here and tell me — I'll check and unlock "
    "the signal group and the academy."
)

PITCH_AGAIN = "Here's the sign-up link again."

# The lead signalled they're done asking ("okay", "got it", "thanks") — that is
# the moment to put the link back in front of them, once.
LINK_AFTER_ACK = "Great. Here's the sign-up link:"

# They went quiet after we answered something. One gentle nudge, then nothing.
LINK_AFTER_SILENCE = "By the way — here's the sign-up link, if you want to get going:"

# ── After "I deposited" ─────────────────────────────────────────────────────
# The broker data refreshes on a delay, so a deposit is simply NOT visible to us
# for a few minutes after it is made. Answering "I don't see it" in that window
# reads as "you didn't deposit" and kills the lead. So the bot takes a beat,
# says it is looking, and keeps checking quietly instead.

# Sent ~2 min after they say they're done (never instantly — that reads as a bot).
DEPOSIT_CHECKING = (
    "Alright, let me take a look. ⏳"
)

# Asked right after DEPOSIT_CHECKING when we have no broker e-mail yet.
# Two jobs at once: it makes the lookup feel like a real person checking, and it
# is our ONLY reliable way to match them — HeroFX cannot return our tracking id
# (their registration and partnership systems are separate databases), so the
# address they used at the broker is what connects the two sides.
ASK_BROKER_EMAIL = (
    "Which email did you register with at the broker? Makes it quicker to find you."
)

# They gave us an address — acknowledge without promising a result yet.
BROKER_EMAIL_OK = (
    "Got it, thanks. Let me check. ⏳"
)

# Sent once the first look came up empty. Names the wait so it feels normal.
DEPOSIT_PENDING = (
    "The broker can take up to 10 minutes to confirm — completely normal. "
    "I'll keep checking and message you the moment it lands. 👍"
)

# End of the conversational follow-up window. The background sweep keeps going,
# so this is a reassurance, not a dead end.
DEPOSIT_STILL_PENDING = (
    "Still hasn't come through on my end. No stress — the second it does, I unlock "
    "you automatically and you'll hear from me. If it takes more than an hour, just "
    "message me again."
)

DEPOSIT_NOT_FOUND = DEPOSIT_PENDING  # kept for older call sites

# Sent right after the VIP invite. The chat must not feel finished — from here
# the bot is their support contact, and saying so once is what makes people
# actually come back with questions instead of going quiet.
# Sent right after the VIP invite. Short and separate, like the pitch parts:
# one door per message. The email line matters — the broker email is what the
# academy matches the deposit on, so a different address means a locked page
# and a support chat that starts with confusion.
ACADEMY_AFTER_VIP = (
    "Your academy access is live too — the full course plus Cosmo's welcome "
    "video: {academy_url}\n\n"
    "Register with the same email you used at the broker, and everything "
    "unlocks by itself."
)

ACADEMY_FIRST_STEP = (
    "Best first step: open the Signals page and watch \u00bbCopy your first "
    "signal\u00ab \u2014 two minutes, and you know exactly what to do when "
    "the next call lands."
)

VIP_SUPPORT_HINT = (
    "If you have questions — about the academy, the signals or the broker — just "
    "message me here. I'm your point of contact."
)

DEPOSIT_TOO_LOW = (
    "I'm seeing {have:.0f}$ on your account right now — VIP access needs {min_dep:.0f}$. "
    "As soon as you top up, I unlock you automatically."
)


# ── Fact sheet for off-script questions ─────────────────────────────────────
# Everything the model is allowed to state as fact. It goes into the system
# prompt verbatim: the setter answers only from here, so numbers stay identical
# in every chat and nothing gets invented on the spot.
#
# WHAT IS DELIBERATELY ABSENT: a win rate, an average return, and the broker's
# name. The original sheet claimed "hit rate approx. 73%" — a number nobody
# measured, and the same one that was removed from the website today. A setter
# quoting it is worse than a website quoting it: it arrives as a personal promise
# in a one-to-one chat, and it is the sentence a burned member repeats back.
#
# Real results exist now and are recorded per trade in `desk_results`, in R.
# Quote them from there once there is more than a couple of weeks of history —
# never from memory, and always with the period attached.
FACTS = """FACTS (use only what is listed here — never invent anything):
- Signals per day: 3 to 6.
- Every signal includes entry, stop-loss and take-profit.
- Risk management is part of the signals.
- Strategy: mainly orderflow on Gold (XAUUSD) and NASDAQ (US100).
- Recommended starting capital: at least 1,000 $.
- Broker: our partner broker. Do NOT name it unless the lead already has the
  link in front of them — the sign-up link is what names it.
- Suitable for beginners: yes.
- Academy content: trading fundamentals + the complete orderflow strategy.
- Academy access: register and deposit at the partner broker.
- Signals are posted in real time.
- VIP members get: the signal group AND the trading academy.
- A team member is available to talk at any time on request.

NEVER STATE, even if asked directly:
- A win rate, hit rate, accuracy or success percentage. We do not publish one.
- An expected profit, monthly return, or what someone "could make".
- Any guarantee. Trading is risky and most retail accounts lose money — say so
  plainly if it comes up. It costs one lead and saves the rest.

If something is not on this list: say honestly that you'll check, and offer to
put them in touch with a team member. Never estimate a number."""


def pitch_button(link: str) -> InlineKeyboardMarkup | None:
    """The handover link as a tappable button.

    The tracked link is long and ugly (referral + our st_ token), and a raw URL
    in the message reads like spam. Telegram hides it behind the button label,
    so the lead sees one clean call to action while the token still rides along.
    """
    if not link:
        return None
    return InlineKeyboardMarkup([[InlineKeyboardButton("✅ Open account", url=link)]])


def opener(name: str, brand: str) -> str:
    return OPENER.format(name=name or "", brand=brand).replace("Hey  👋", "Hey 👋")


def pitch_parts(link: str, min_dep: float) -> list[str]:
    """The pitch as separate short messages, in send order."""
    parts = PITCH_PARTS if link else PITCH_PARTS_NO_LINK
    return [p.format(min_dep=min_dep) for p in parts]


def pitch(link: str, min_dep: float) -> str:
    """Whole pitch as one string — kept for logging and the offline tests."""
    return "\n\n".join(pitch_parts(link, min_dep))
