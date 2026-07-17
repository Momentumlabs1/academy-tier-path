# Vinted Sniper – Poller (Prototyp)

Kleiner, dependency-freier Node-Poller, der die Presets aus
[`../../docs/vinted-sniper/presets.json`](../../docs/vinted-sniper/presets.json)
gegen Vinted checkt und neue Treffer meldet (Konsole + optional Telegram).

> Lies zuerst [`../../docs/vinted-sniper/strategie-und-kosten.md`](../../docs/vinted-sniper/strategie-und-kosten.md)
> – v. a. warum das von einer **Heim-IP** laufen sollte und nicht in der Cloud
> (DataDome blockt Datacenter-IPs).

## Setup

```bash
cd tools/vinted-sniper
cp .env.example .env
# .env ausfuellen – am wichtigsten: VINTED_COOKIE aus dem eingeloggten Browser
node poll.mjs --once          # Testlauf (ein Zyklus)
```

Voraussetzung: **Node ≥ 18** (nutzt natives `fetch`). Keine `npm install` nötig.

## Cookie holen (empfohlen, macht es stabil)

1. vinted.at **eingeloggt** im Browser öffnen.
2. DevTools (F12) → Tab **Network** → einen `/api/v2/…`-Request anklicken.
3. Unter **Request Headers** die Zeile `cookie:` komplett kopieren.
4. In `.env` bei `VINTED_COOKIE="…"` einfügen.

Cookies laufen ab → wenn plötzlich `403 (DataDome)` kommt, Cookie neu holen.

## Befehle

| Befehl | Wirkung |
|---|---|
| `node poll.mjs --once` | Ein einzelner Durchlauf (zum Testen). |
| `node poll.mjs` | Dauerbetrieb, Intervall aus `.env`. |
| `node poll.mjs --all-keywords` | Fragt **jedes** Keyword eines Presets ab (mehr Treffer, mehr Requests). Default: nur das erste Keyword pro Preset. |
| `node poll.mjs --preset fairycore-tops` | Nur ein einzelnes Preset. |

## Was der Poller (noch) NICHT macht

- **Kein Autobuy** – bewusst. Nur Finden + Melden.
- **Versandkosten** stehen nicht im Listen-Endpoint → Filter prüft nur den
  Artikelpreis (`price_to`). Versand (≤ 6 €) beim Treffer kurz selbst checken.
- **Kein Proxy-Rotation-Layer** – für den Einstieg reicht eine Heim-IP.
  Skalierung (Residential-Proxys, Supabase-DB statt lokalem `.seen.json`,
  fester Telegram-Push, Bild-Ähnlichkeit) ist der nächste Ausbauschritt.

## Dateien

- `poll.mjs` – der Poller.
- `.env.example` – Konfig-Vorlage (echte `.env` ist gitignored).
- `.seen.json` – lokaler Dedup-Store, wird automatisch angelegt (gitignored).
