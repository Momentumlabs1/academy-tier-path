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

MEDIEN — und warum es zweimal umgebaut wurde (18.08.2026)
Bis 17.08. ging NUR Text raus: ein Foto ohne Text wurde verworfen, ein Foto mit
Text kam als reine Textnachricht an. Die Chart-Screenshots des Desks haben die
Partnerkanaele nie erreicht.

Erster Versuch: `caption` + `has_media` schicken und den Relay mit `copyMessage`
kopieren lassen, das nur Chat- und Nachrichten-Id braucht. Das ist GESCHEITERT,
und der Fehler ist grundsaetzlich:

    Bad Request: message to copy not found

Ein Bot kann keine Nachricht kopieren, die Telegram ihm nie zugestellt hat — und
zugestellt wird ihm nichts, was von einem anderen Bot kommt. Genau daran ist auch
der Relay ohne diesen Leser gescheitert. Admin-Rechte aendern daran nichts.

Der Weg, der funktioniert: dieses Nutzerkonto SIEHT die Datei und darf sie
herunterladen. Es laedt sie also runter und schickt die Bytes base64-kodiert mit.
Der Webhook schiebt sie EINMAL zu Telegram hoch, bekommt eine echte Bot-API-
`file_id` zurueck und verteilt damit an alle weiteren Kanaele — ein Upload, egal
wie viele Partner. Dieselbe `file_id` fuellt auch `desk_media` fuer die
Website-Galerie.

Alben: jedes Teil geht als einzelnes Foto raus. Ein Album zusammenzuhalten
braeuchte `sendMediaGroup` mit mehreren Uploads in einem Aufruf; das Desk postet
Einzelcharts, also ist das die Komplexitaet nicht wert.

KEIN asyncio.run() HIER.
Der Client wird beim Import erzeugt, also ausserhalb jeder Event-Loop. Mit
asyncio.run() baut Python danach eine NEUE Loop, und Telethon 1.44 auf
Python 3.9 stirbt dann beim ersten Update mit "got Future attached to a
different loop" — noch bevor die Nummernabfrage verarbeitet ist. Telethons
eigener Einstieg benutzt die Loop, an der der Client bereits haengt.
"""
import base64
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

# Obergrenze fuer den Upload-Weg. Base64 blaeht um ein Drittel auf, und der
# Webhook muss das als eine JSON-Anfrage schlucken. Ein Handy-Screenshot liegt
# bei 100–500 KB, also ist das reichlich; was darueber liegt (ein Video) geht
# lieber als Text durch als gar nicht.
MEDIA_MAX_BYTES = int(os.environ.get("MEDIA_MAX_BYTES", 3_500_000))

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


async def download(msg):
    """Die Datei als Bytes holen. Gibt (bytes, mime) zurueck oder None."""
    try:
        size = getattr(getattr(msg, "file", None), "size", None)
        if size and size > MEDIA_MAX_BYTES:
            log.warning("Medium zu gross (%s Bytes, id=%s)", size, msg.id)
            return None
        raw = await msg.client.download_media(msg, file=bytes)
        if not raw:
            return None
        if len(raw) > MEDIA_MAX_BYTES:
            log.warning("Medium zu gross nach Download (%s Bytes, id=%s)", len(raw), msg.id)
            return None
        mime = getattr(getattr(msg, "file", None), "mime_type", None) or "image/jpeg"
        return raw, mime
    except Exception as e:
        # Nie den Leser mitnehmen: ohne Bild ist die Nachricht immer noch besser
        # als keine Nachricht.
        log.error("Download fehlgeschlagen (id=%s): %s", msg.id, e)
        return None


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

        blob = await download(msg)
        if blob is None:
            # Kein Bild dabei, aber Text vorhanden -> als Text weiterschicken,
            # statt eine leere Medien-Nachricht zu erzeugen.
            if not text.strip():
                log.warning("verworfen: Medium nicht ladbar und kein Text (id=%s)", msg.id)
                return
            log.warning("Medium nicht ladbar, gehe als Text (id=%s)", msg.id)
            body.pop("has_media", None)
            body.pop("caption", None)
            body["text"] = text
        else:
            raw, mime = blob
            body["media_b64"] = base64.b64encode(raw).decode()
            body["media_mime"] = mime
    else:
        body["text"] = text

    key = "edited_message" if edited else "message"
    payload = {"update_id": update_id(msg.id), key: body}

    kind = "TEXT"
    if "media_b64" in body:
        kind = "MEDIUM %dKB" % (len(body["media_b64"]) * 3 // 4096)
    elif media:
        kind = "MEDIUM(ohne Datei)"
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
