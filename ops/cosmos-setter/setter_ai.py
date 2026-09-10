"""The setter's brain — a Claude-driven qualifying/closing conversation.

Texts like a real person in a Telegram DM: short, warm, one question at a time.
Honest and compliant (no profit guarantees, no financial advice). Hands over the
tracked link only when the lead is genuinely qualified and interested.
"""
from __future__ import annotations
from anthropic import Anthropic

from config import cfg
from db import tracked_link
from script import FACTS

_client: Anthropic | None = None


def client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=cfg.ANTHROPIC_API_KEY)
    return _client


def _entry_line() -> str:
    if cfg.ENTRY_MODE == "deposit":
        return (f"Access is NOT a payment to us. The lead opens their OWN account at the partner "
                f"broker and funds THEIR OWN account there — it stays 100% their money and is "
                f"withdrawable at any time. From ~{cfg.VIP_MIN_DEPOSIT:.0f} $ deposited, VIP signal "
                f"access unlocks. The link goes straight to that broker registration.")
    return ("What is sold is coaching. The link leads to a no-obligation intro call / booking.")


FLOW = """THE FLOW — BRISK. Goal: be at the link within 3-4 messages, not chatting forever.
1. Short hello + ONE question: any trading experience, or new?
2. Whatever they say: acknowledge briefly (ONE short sentence, no advice, no motivational
   lines) and move straight on: how they get into the VIP group — account at the partner
   broker, their own deposit (minimum as per access terms), the money stays theirs. Free,
   because it is funded through the broker.
3. Ask: "Does that work for you?" / "Want me to send you the link?"
4. On a yes (or any clear interest): send the link IMMEDIATELY. Do not ask again, do not wait.
If they have questions of their own: answer briefly, then back to the link. Never more than
one question per message."""


OBJECTIONS = """COMMON OBJECTIONS (answer calmly and honestly — never push):
- "No experience" → briefly: not a problem, that is what the signals and the support are for.
  Do not embellish.
- "Is this legit / why is it free?" → honestly: funded through the broker partnership, that is
  why there is no course fee. Your money sits in YOUR own account.
- "Worried about the money / risk" → openly: trading carries risk and most retail traders lose.
  The deposit is THEIR capital in THEIR broker account, withdrawable anytime — they pay us nothing.
- "No time / later" → no pressure, mention it is only a few minutes of setup; if they want, they
  come back to it."""


LINK_GOAL = """THE LINK (handover) — this is your goal, get there briskly:
  {link}
- The moment the person shows interest or agrees ("ok", "yes", "sounds good", "what's next"),
  you send the link IMMEDIATELY. Do not keep qualifying, do not ask again.
- HARD RULE: if a message of yours mentions registering, signing up, opening an account,
  depositing or "getting started", the link MUST be in THAT SAME message. Never write
  "register and deposit" without the link attached.
- Paste the link VERBATIM and unchanged (it carries a tracking token). Do not spam it.
- Then say EXACTLY this (in your own words): register + deposit, and as soon as the deposit
  goes through, YOU unlock them AUTOMATICALLY and message them here with everything. So they
  do not have to do anything else. Optional addition: if they want, they can still drop a
  message once they are done.
- NEVER say "let me know and I'll unlock you" — that sounds like they have to do something.
  The unlock happens on its own."""


def _link_section(lead: dict, link: str) -> str:
    """What to tell the model about the link — depends on whether it went out.

    Before the handover the link is the goal. Afterwards it is noise: pasting a
    long tracked URL under every answer, or asking "soll ich dir den Link
    schicken?", is what makes a setter feel like a bot. bot.py re-offers the link
    deliberately instead — on an "okay", or once after a silence.
    """
    if lead.get("status") == "vip_granted":
        return (
            "YOUR ROLE NOW — SUPPORT, NOT SALES:\n"
            "- This person is already a VIP member and in the signal group.\n"
            "- Sell NOTHING, send NO link, do not ask about deposits.\n"
            "- From here you are their point of contact: answer questions about the\n"
            "  academy, the signals, the broker or the group — friendly and brief.\n"
            "- Anything not covered by the facts: say so honestly and offer to pass it\n"
            "  to someone on the team."
        )
    if lead.get("status") in ("link_sent", "deposited"):
        return (
            "THE LINK — IMPORTANT:\n"
            "- This person ALREADY has the sign-up link, it is further up in the chat.\n"
            "- Do NOT send it again and do NOT write out a URL.\n"
            "- Do NOT ask \"want me to send you the link?\" — it is annoying.\n"
            "- Just answer the question. Briefly. Nothing appended after it.\n"
            "- If they say they deposited: say you are checking. Nothing more.\n"
            "- NEVER say \"let me know once you deposited and I'll unlock you\".\n"
            "  The unlock happens AUTOMATICALLY as soon as the deposit is visible.\n"
            "  They do NOT need to report back or do anything — say it exactly that way."
        )
    return LINK_GOAL.format(link=link)


def system_prompt(lead: dict) -> str:
    link = tracked_link(cfg.HANDOVER_LINK, lead["token"])
    name = lead.get("first_name") or "there"
    link_section = _link_section(lead, link)
    return f"""You are {cfg.SETTER_NAME} from {cfg.BRAND_NAME} — a real person on the team, not a bot.
You are writing in a private Telegram chat. This person is in the {cfg.BRAND_NAME} community and JUST
tapped the VIP button themselves — so they are expecting you to message them.
If someone asks outright whether you are an AI: do not lie, admit it briefly and casually, move on.

YOUR GOAL: {cfg.SETTER_GOAL}

THE OFFER: {cfg.OFFER_BRIEF}
{_entry_line()}

{FLOW}

{FACTS}

{OBJECTIONS}

HOW YOU WRITE (important):
- Like a real person texting: short, plain American English, casual. Usually 1-2 sentences, max 3.
- ONE question per message. Brisk, not an interrogation.
- Emojis: at most 1, often none. No marketing speak, no hype.
- BANNED (reads artificial/cringe): "exactly right", "clean from the start", "bad habits",
  "journey", "level up", "we'll do this together", motivational lines, unsolicited advice,
  praising trivial answers, repeating their name over and over.
- Do not comment on every answer. A short acknowledgement ("Got it." / "Cool.") and move on.

HONEST & COMPLIANT (non-negotiable):
- NEVER promise or guarantee profits or returns. No financial advice.
- NEVER state a win rate, hit rate or accuracy figure, even if asked directly. We do not
  publish one. Say honestly that we do not quote a hit rate.
- When money or risk comes up, say plainly that trading carries risk and most retail traders
  lose money. Do not oversell.
- Not pushy. If they say "not interested" or want to be left alone → respect it immediately,
  warmly, and stop selling.

{link_section}

Their name is {name}. Reply with ONLY your next chat message — no narrator, no quotation
marks, no stage directions."""


def reply(lead: dict, history: list[dict], model: str | None = None) -> str:
    """history = [{'role':'user'|'assistant','content':...}, ...] ending on user."""
    msgs = history[-cfg.HISTORY_WINDOW:]
    # The API requires the conversation to end on a user turn, and to not start
    # on an assistant turn — a window slice can violate both. Trim defensively.
    while msgs and msgs[-1]["role"] != "user":
        msgs.pop()
    while msgs and msgs[0]["role"] != "user":
        msgs.pop(0)
    if not msgs:
        msgs = [{"role": "user", "content": "(continue)"}]
    msg = _ki(
        model=model or cfg.SETTER_MODEL,
        max_tokens=400,
        system=system_prompt(lead),
        messages=msgs,
    )
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()


# ── Wenn die KI nicht mehr kann ─────────────────────────────────────────────
#
# Laeuft das Anthropic-Guthaben leer oder greift ein Limit, antwortet der Bot
# einfach nicht mehr auf freie Fragen — und zwar STILL. Der Lead sieht nur, dass
# nichts kommt, und ist weg. Genau das darf nicht unbemerkt passieren.
#
# Deshalb: jede API-Stoerung, die nach Geld oder Limit aussieht, geht sofort in
# die Admin-Gruppe. Einmal pro Stunde, sonst steht die Gruppe voll, waehrend
# ohnehin niemand etwas tun kann.
_LETZTE_MELDUNG = {}


def _melde_api_problem(art: str, text: str):
    import time, urllib.parse, urllib.request
    jetzt = time.time()
    if jetzt - _LETZTE_MELDUNG.get(art, 0) < 3600:
        return
    _LETZTE_MELDUNG[art] = jetzt
    try:
        from db import store
        row = store.rest.select_one("app_secrets", key="ADMIN_ALERT_CHAT_ID")
        chat = (row or {}).get("value")
        if not chat:
            return
        d = urllib.parse.urlencode({
            "chat_id": chat,
            "text": f"🔴 KI STEHT · {art}\n\n{text[:400]}\n\n"
                    f"Der Bot beantwortet gerade KEINE freien Fragen mehr. "
                    f"Feste Texte und Links laufen weiter.",
        }).encode()
        urllib.request.urlopen(urllib.request.Request(
            f"https://api.telegram.org/bot{cfg.TELEGRAM_BOT_TOKEN}/sendMessage", data=d),
            timeout=10)
    except Exception:
        pass


def _ki(**kw):
    """Ein Aufruf, eine Fehlerbehandlung.

    Vorher rief jede Funktion client().messages.create direkt auf — ein
    leergelaufenes Guthaben waere an vier Stellen einzeln durchgefallen und
    nirgends aufgefallen.
    """
    try:
        # BEWUSST der direkte Aufruf: hier steht der echte API-Zugriff. Ein
        # _ki(**kw) an dieser Stelle laesst die Funktion sich selbst rufen —
        # genau so am 07.09. in einer Endlosschleife gelandet.
        return client().messages.create(**kw)
    except Exception as e:
        t = f"{type(e).__name__}: {e}"
        low = t.lower()
        if any(w in low for w in ("credit", "billing", "quota", "insufficient", "payment")):
            _melde_api_problem("Guthaben leer", t)
        elif "429" in low or "rate" in low or "overloaded" in low:
            _melde_api_problem("Limit erreicht", t)
        elif "401" in low or "authentication" in low or "api key" in low:
            _melde_api_problem("Schluessel ungueltig", t)
        raise


def sent_link(text: str, token: str) -> bool:
    """Did the setter just hand over the tracked link?"""
    return token in text


# Phrases that mean "we're at the handover step". If the model talks about
# registering/starting but forgets to paste the link, we append it in code —
# a dropped link is a lost lead, so this must not depend on the model.
_HANDOVER_HINTS = (
    "register", "sign up", "signup", "open an account", "open account",
    "create an account", "get started", "getting started", "link", "setup",
)


ASIDE_SYSTEM = """You are the setter for {brand} — a real person on the team.
This person asked or commented on something mid-qualification instead of just
answering. Address it BRIEFLY, then stop.

{facts}

RULES (hard):
- At most 1-2 short sentences. No bullet lists, no marketing speak, at most 1 emoji.
- Address ONLY what was just asked.
- Send NO link, do NOT prompt them to sign up, do NOT pitch the offer — that comes
  on its own in a moment.
- Ask NO question back. The script asks the next question right after this.
- Do NOT ask "want the link?" — the link comes automatically.
- Never state a win rate or expected return, even if asked directly.
- If something is not in the facts: say briefly that you will check."""


def answer_aside(lead: dict, question: str, model: str | None = None) -> str:
    """Short answer to something the lead asked mid-qualification.

    Deliberately NOT the normal reply(): that prompt drives towards the link, which
    would blow up the funnel order. This one only answers, then hands straight back
    to the script.
    """
    msg = _ki(
        model=model or cfg.SETTER_MODEL,
        max_tokens=160,
        system=ASIDE_SYSTEM.format(brand=cfg.BRAND_NAME, facts=FACTS),
        messages=[{"role": "user", "content": question}],
    )
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()


def ensure_link(text: str, lead: dict) -> str:
    """Guarantee the tracked link is present when the reply pushes to sign up."""
    # Once the lead HAS the link, repeating it under every single answer reads
    # as pushy spam. From then on the link is offered deliberately: when they
    # signal they're done asking, or after a silence (see bot.py).
    if lead.get("status") in ("link_sent", "deposited", "vip_granted"):
        return text
    link = tracked_link(cfg.HANDOVER_LINK, lead["token"])
    if not link or link in text or lead["token"] in text:
        return text
    low = text.lower()
    if any(h in low for h in _HANDOVER_HINTS):
        return text.rstrip() + "\n\n" + link
    return text


# ── Understanding what the lead actually said ────────────────────────────────
"""
Keyword lists cannot tell an answer from a remark, and the failure is ugly.

"wassup bro i saw you on insta" matched no experience keyword and contained no
question mark, so it fell through to the default and the bot replied "Nice, so
you know the basics already" — to someone who had said nothing about experience
at all. That single line makes the whole conversation read as a machine.

The old code had a genuine dilemma: treat every unrecognised sentence as a
question and it re-asks in a loop; take the default and it answers things nobody
said. Both are wrong because a word list cannot classify intent.

So the model classifies. One cheap call returns whether the message answered the
question, and if not, what a real person would say back. The script keeps its
structure — the model only decides what kind of message just arrived.
"""

CLASSIFY_SYSTEM = """You are reading one message a lead sent in a sales chat.

The question we asked was:
{question}

Decide what their message is, and reply with ONE JSON object, nothing else:

{{"kind": "answer" | "question" | "other", "value": "<see below>", "reply": "<see below>"}}

- kind "answer": their message answers the question, even loosely, even in one
  word. A bare "yes" / "yeah" / "yep" / "sure" IS an answer. So is "no", "nope",
  "not really". So is anything describing their situation ("been trading 3
  years", "just started last month"). Map it to one of: {allowed}
  reply = "".

- kind "question": they asked something instead of answering.
  value = "". reply = "".  ← leave it EMPTY. Something else answers questions,
  because it has the approved facts and you do not. Never answer here; you would
  invent something.

- kind "other": small talk, a greeting, a compliment, an emoji, a remark about
  finding us, anything unrelated. value = "".
  reply = what a real person would say back. Short, warm, no pitch, no advice,
  no claims about the product. One sentence is usually right.
  Examples: "wassup bro i saw you on insta" → "Ha, nice — glad it found you 🙏"
            "yo" → "Hey!"
            "🔥🔥" → "Haha, love the energy."

Rules for `reply`:
- Plain American English, casual, the way a person texts. One or two sentences.
- NEVER state a fact about the offer, a price, a win rate or a return.
- Do NOT ask the original question again — the script does that itself.
- At most one emoji, usually none.

Only the JSON. No markdown, no code fences."""


# The output guardrail. Deterministic on purpose: a model checking a model can
# hallucinate too, and this one must not.
#
# `reply` is only ever used for SMALL TALK — "hey", "thanks", "love the energy".
# Small talk never needs a number, a currency, a percentage or the word
# "guarantee". If one appears, the model has drifted into talking about the
# offer, which is exactly the failure we are guarding against: the first test of
# this feature answered "how does it work?" with an invented "We help you learn
# trading through our platform…".
#
# So anything that looks like a claim is DISCARDED, not corrected. The caller
# then falls back to the grounded path or to the script. A dropped pleasantry
# costs nothing; an invented promise about money costs everything.
_CLAIM_MARKERS = (
    "%", "$", "€", "£", "usd", "eur", "profit", "return", "guarantee", "guaranteed",
    "win rate", "winrate", "accuracy", "roi", "risk-free", "riskfree", "double",
    "earn", "income", "payout", "deposit", "broker", "signal", "academy", "vip",
)

def _reply_is_safe(reply: str) -> bool:
    low = (reply or "").lower()
    if not low:
        return True
    if any(ch.isdigit() for ch in low):
        return False
    return not any(m in low for m in _CLAIM_MARKERS)


def classify(lead: dict, question: str, allowed: list[str], text: str,
             model: str | None = None) -> dict:
    """What kind of message is this, and what should we say back?

    Falls back to {"kind": "other", "reply": ""} on any failure — the caller then
    behaves exactly as the old keyword path did, so a model outage degrades to
    the previous behaviour instead of breaking the funnel.
    """
    import json as _json
    try:
        msg = _ki(
            model=model or cfg.SETTER_MODEL_CHEAP,
            max_tokens=200,
            system=CLASSIFY_SYSTEM.format(question=question, allowed=" | ".join(allowed)),
            messages=[{"role": "user", "content": text}],
        )
        raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        out = _json.loads(raw)
        if out.get("kind") not in ("answer", "question", "other"):
            return {"kind": "other", "value": "", "reply": ""}
        if out.get("kind") == "answer" and out.get("value") not in allowed:
            return {"kind": "other", "value": "", "reply": ""}
        kind = out["kind"]
        # A question must never be answered from here: this call does not carry
        # the approved fact sheet, so anything it says about the offer would be
        # invented. answer_aside() handles questions and it does have the facts.
        reply = "" if kind == "question" else (out.get("reply") or "").strip()
        if reply and not _reply_is_safe(reply):
            print(f"[classify] reply dropped, looked like a claim: {reply[:60]!r}")
            reply = ""
        return {"kind": kind, "value": out.get("value", ""), "reply": reply}
    except Exception as e:  # noqa: BLE001
        print(f"[classify] failed ({e}); falling back to keywords")
        return {"kind": "other", "value": "", "reply": ""}
