"""
cosmos-reader — liest die Quellgruppe als NUTZERKONTO und uebergibt jede
Nachricht an den bestehenden Relay.

WARUM ES DAS GIBT
Telegram stellt einem Bot keine Nachrichten anderer Bots zu — dokumentiert im
Bots-FAQ, "regardless of mode", also auch als Admin und mit deaktiviertem
Privacy-Modus. Die Signale kommen aber ausschliesslich ueber Tims Copy-Bot in
die Quellgruppe. Fuer @CosmosRelaybot war die Gruppe deshalb immer stumm: die
drei Zustellungen, die je liefen, waren von Hand getippte Testnachrichten.

Ein Nutzerkonto sieht alles, was ein Mensch sieht — auch Bot-Nachrichten.

WAS ES BEWUSST NICHT TUT
Es uebersetzt nicht, es formatiert nicht, es kennt keine Partner. Es baut aus
der gelesenen Nachricht ein Telegram-Update und schickt es an den bestehenden
Webhook. Uebersetzung mit Ziffernpruefung, Footer je Partner, Fan-out,
signal_relays und Recap laufen unveraendert dort weiter.

MEDIEN (17.08.2026)
Bis 20:30 ging NUR Text raus: ein Foto ohne Text wurde verworfen, ein Foto mit
Text kam als reine Textnachricht an — die Chart-Screenshots des Desks haben die
Partnerkanaele nie erreicht.

Eine Bot-API-`file_id` kann dieser Leser nicht liefern; Telethons Datei-Referenzen
sind ein anderes Format. Er braucht sie aber auch nicht: der Relay kopiert Medien
mit `copyMessage`, und das kennt nur Chat-Id und Nachrichten-Id. Deshalb wird bei
Medien `caption` statt `text` gesetzt (daran unterscheidet der Router die Wege)
plus das Feld `has_media`. Alben tragen `media_group_id` und laufen im Relay
ueber `copyMessages`.

⚠️ Folge davon: `desk_media` (die Screenshot-Galerie der Website) bleibt bei
Medien aus diesem Leser leer, weil dafuer eine echte Bot-API-file_id noetig
waere. Lieber leer als eine Zeile mit einer Id, die die Website nicht laden kann.

KEIN asyncio.run() HIER.
Der Client wird beim Import erzeugt, also ausserhalb jeder Event-Loop. Mit
asyncio.run() baut Python danach eine NEUE Loop, und Telethon 1.44 auf
Python 3.9 stirbt dann beim ersten Update mit "got Future attached to a
different loop" — noch bevor die Nummernabfrage verarbeitet ist. Telethons
eigener Einstieg benutzt die Loop, an der der Client bereits haengt.
"""
import logging
import os
import time

import httpx
from telethon import TelegramClient, events
from telethon.tl.types import MessageMediaWebPage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("reader")

API_ID = int(os.environ["TG_API_ID"])
API_HASH = os.environ["TG_API_HASH"]
SOURCE = int(os.environ["MAIN_CHANNEL_ID"])
HOOK = os.environ["WEBHOOK_URL"]
SECRET = os.environ["TELEGRAM_WEBHOOK_SECRET"]
SESSION = os.environ.get("SESSION_PATH", "/opt/cosmos-reader/reader.session")

client = TelegramClient(SESSION, API_ID, API_HASH)


def update_id(msg_id: int) -> int:
    """Eindeutig halten: der Webhook verwirft Wiederholungen ueber diese Zahl."""
    return int(time.time() % 1_000_000) * 1000 + (msg_id % 1000)


def has_real_media(msg) -> bool:
    """
    Eine Link-Vorschau ist bei Telethon auch `media`. Wuerde sie als Medium
    gelten, liefe eine normale Textnachricht mit Link ueber copyMessage — also
    unuebersetzt und ohne Footer. Genau die eine Sorte muss draussen bleiben.
    """
    media = getattr(msg, "media", None)
    return media is not None and not isinstance(media, MessageMediaWebPage)


async def forward(msg, edited: bool):
    text = msg.message or ""
    media = has_real_media(msg)

    if not text.strip() and not media:
        log.info("uebersprungen: kein Inhalt (id=%s)", msg.id)
        return

    body = {
        "message_id": msg.id,
        "date": int(msg.date.timestamp()),
        "chat": {"id": SOURCE, "type": "supergroup",
                 "title": "Whitelabel - Cosmos-Candles"},
        # Kein Bot-Absender: sonst greift die Selbst-Schleifen-Bremse im
        # Router. Die Id ist bewusst nicht die unseres Relay-Bots.
        "from": {"id": 1, "is_bot": False, "first_name": "desk"},
    }

    if media:
        body["has_media"] = True
        if text:
            body["caption"] = text
        if getattr(msg, "grouped_id", None):
            body["media_group_id"] = str(msg.grouped_id)
    else:
        body["text"] = text

    key = "edited_message" if edited else "message"
    payload = {"update_id": update_id(msg.id), key: body}

    kind = "MEDIUM" if media else "TEXT"
    try:
        async with httpx.AsyncClient(timeout=60) as h:
            r = await h.post(HOOK, json=payload,
                             headers={"x-telegram-bot-api-secret-token": SECRET})
        log.info("%s %s id=%s -> %s %s", "EDIT" if edited else "NEU", kind,
                 msg.id, r.status_code, r.text[:120])
    except Exception as e:
        # Eine gescheiterte Zustellung darf den Leser nie beenden — sonst
        # verpasst er alles Folgende.
        log.error("Zustellung fehlgeschlagen (id=%s): %s", msg.id, e)


@client.on(events.NewMessage(chats=SOURCE))
async def on_new(event):
    await forward(event.message, edited=False)


@client.on(events.MessageEdited(chats=SOURCE))
async def on_edit(event):
    await forward(event.message, edited=True)


def main():
    # start() ist hier synchron: es fragt bei fehlender Session nach Nummer,
    # Code und ggf. Passwort und laeuft in Telethons eigener Loop.
    client.start()
    me = client.loop.run_until_complete(client.get_me())
    log.info("angemeldet als %s (id=%s) — hoere auf %s",
             me.username or me.first_name, me.id, SOURCE)
    client.run_until_disconnected()


if __name__ == "__main__":
    main()
