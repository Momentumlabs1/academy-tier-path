# cosmos-reader

Läuft als systemd-Dienst auf IONOS 67.217.245.196 unter `/opt/cosmos-reader/`.
Diese Kopie existiert, damit der Dienst nicht länger ausschließlich auf dem
Server steht — vorher hätte ein verlorener Server den Reader mitgenommen, und
kein Commit hätte gezeigt, dass es ihn gibt.

Er liest die Quellgruppe als **Nutzerkonto** (MTProto/Telethon), weil Telegram
einem Bot niemals Nachrichten anderer Bots zustellt und die Desk-Signale
ausschließlich über Tims Copy-Bot hereinkommen. Alles Weitere — Übersetzung,
Footer je Partner, Fan-out — passiert unverändert in `telegram-webhook`.

`.env` liegt nur auf dem Server (API-Id/Hash, Webhook-Secret, Session-Pfad) und
gehört hier nicht hinein.

    systemctl status cosmos-reader
    journalctl -u cosmos-reader -f

Gesund heißt: `angemeldet als …` beim Start, danach `NEU TEXT|MEDIUM id=… -> 200`.
