# Was du verbinden musst (Services + Kosten + Deploy)

Damit der Sniper (App-Seite **/sniper**) und die Ganze-Internet-Bildersuche
laufen, brauchst du diese Bausteine. „So kostenlos wie möglich" ist eingebaut:
alles startet im Gratis-Tarif, echte Kosten fallen nur bei Nutzung an.

## Die Bausteine auf einen Blick

| # | Service | Wofür | Kosten | Pflicht? |
|---|---|---|---|---|
| 1 | **Supabase** (schon verbunden) | DB, Storage, Edge-Functions | **0 €** (Free-Tier reicht locker) | ✅ |
| 2 | **SerpApi** (Google Lens) | „ganzes Internet" Bild→Produkte | **Free 250 Suchen/Mon**, danach ~7,50 $/1000 (oder 25 $/Mon = 1000) | ✅ für Bildersuche |
| 3 | **Anthropic** (Claude) | Bild→Vinted-Suchbegriffe | **~4 $ / 1000 Bilder** (Haiku, winzig) | ⬜ optional |
| 4 | **Telegram-Bot** (schon da) | Deal-Alerts vom Vinted-Poller | **0 €** | ⬜ (für Poller) |
| 5 | **SNIPER_KEY** (selbst ausgedacht) | schützt die Functions vor Fremd-Nutzung/Kosten | **0 €** | ✅ empfohlen |
| 6 | **Vinted-Poller** (`tools/vinted-sniper`) | Vinted-Live-Deals, Heim-IP | **0 €** | ⬜ (Vinted-Teil) |

**Kurz:** Für die Bildersuche brauchst du nur **Supabase (hast du) + einen
SerpApi-Key**. Der Rest ist optional/gratis.

## Schlüssel besorgen (2 Minuten)

- **SerpApi:** auf serpapi.com registrieren → Dashboard → „Api Key" kopieren. (Free-Plan: 250 Suchen/Monat, keine Kreditkarte nötig.)
- **Anthropic (optional):** console.anthropic.com → API Keys → neuen Key erstellen. Nur nötig für den Button „Vinted-Suchbegriffe erzeugen".
- **SNIPER_KEY:** einfach ein langes Passwort ausdenken (z. B. `openssl rand -hex 24`).

## Deployen (einmalig)

```bash
# im Repo-Root, mit Supabase CLI eingeloggt (supabase link ist schon gesetzt)

# 1) Datenbank-Migration (Tabellen + Storage-Bucket)
supabase db push          #  oder Migration 005 im Dashboard-SQL-Editor ausführen

# 2) Edge-Functions deployen
supabase functions deploy visual-search
supabase functions deploy vision-keywords

# 3) Secrets setzen (serverseitig, nie im Frontend!)
supabase secrets set SERPAPI_KEY=dein_serpapi_key
supabase secrets set ANTHROPIC_API_KEY=dein_anthropic_key   # optional
supabase secrets set SNIPER_KEY=dein_ausgedachtes_passwort
```

Im **Frontend** (`.env` / Hosting-Env) zusätzlich:

```
VITE_SNIPER_KEY=dasselbe_passwort_wie_SNIPER_KEY
```

> Hinweis zur Sicherheit: `VITE_SNIPER_KEY` landet im Browser-Bundle — es ist ein
> einfacher Missbrauchsschutz, kein Hochsicherheits-Login. Halte die App-URL
> privat. Für echten Schutz später: Supabase-Auth + `verify_jwt`. (v1 bewusst
> schlank, damit es sofort läuft.)

## Was dann funktioniert

- **App → /sniper:** Bild hochladen/URL einfügen → „Ähnliche im ganzen Internet finden" → Grid mit Preis, Händler, Kauflink. Optional „Vinted-Suchbegriffe erzeugen".
- **Vinted-Poller** (separat, Heim-IP): `tools/vinted-sniper/poll.mjs` mit deinem Cookie → Live-Deals nach Telegram. Siehe dessen README.

## „Final auf Kaufen drücken" / Auto-Buy

- **Jetzt:** Du klickst im Grid auf den Treffer → landest direkt auf der Händler-/Vinted-Seite → dort kaufen. Das ist Absicht (sicher, kein Fehlkauf-Risiko).
- **Auto-Buy unter 6 € (später):** technisch möglich, aber heikel (echtes Geld, Anti-Bot, Fehlkäufe). Bauen wir bewusst erst, wenn der Rest steht und du es explizit willst — mit harten Sicherheitslimits.

## Ich kann das Deployen übernehmen

Über die verbundene **Supabase-Integration** kann ich Migration + Functions direkt
deployen. Ich mache das **nicht ungefragt** (es ist eure Produktiv-DB) und die
API-Keys musst du setzen (die habe ich nicht). Sag „deploy", sobald du die Keys
hast, dann ziehe ich es durch.
