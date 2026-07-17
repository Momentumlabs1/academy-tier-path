# Vinted Sniper – Strategie, Technik & Kosten (Stand Juli 2026)

Dieses Dokument fasst zusammen, **wie Vinted-Sniping 2026 wirklich funktioniert**,
was es kostet, ob es **ohne Grabber** geht, und wie wir es am besten in dieses
Repo (TanStack + Supabase + bestehende Telegram-Anbindung) einbauen.

Alles hier ist recherchiert, nicht geraten – Quellen unten.

---

## 1. Die zentrale Wahrheit vorweg

- **Es gibt KEINE brauchbare offizielle API fürs Sniping.** Vintens offizielle
  „Pro Integrations"-API kann **keine Katalog-/Konkurrenzsuche**, verlangt einen
  Pro-Account + manuelle Freischaltung (Allowlist) und gibt dir nur ~500 eigene
  Artikel-Slots. Für „fremde Listings schnell finden" völlig unbrauchbar.
- **Alle Sniper-Bots gehen denselben Weg:** Sie pollen die **interne Web-API**
  `https://www.vinted.at/api/v2/catalog/items` mit `order=newest_first` und
  filtern clientseitig. Genau das, was der Browser auch macht, nur automatisiert.
- **Das Nadelöhr heißt DataDome** (industrieller Bot-Schutz). Er fingerprintet
  TLS-Handshake (JA3), IP-Reputation und Timing. Von einer **normalen
  Heim-/Residential-IP** gehen ~**30–50 Requests**, bevor er flaggt; von
  Rechenzentrums-IPs (Server, Supabase, Vercel) bist du oft nach **1–2 Requests**
  blockiert.

**Konsequenz für dich:** Für **wenige gespeicherte Suchen in moderatem Tempo**
brauchst du **keinen bezahlten Grabber** – ein selbst gehosteter Poller mit
deinem eigenen Login reicht. Sobald du **schnell + viele Suchen + zuverlässig**
willst, brauchst du Residential-Proxys oder einen Managed-Grabber.

---

## 2. Wie ein Sniper technisch funktioniert (der Loop)

```
für jedes Preset (gespeicherte Suche):
  GET /api/v2/catalog/items?search_text=…&price_to=…&order=newest_first&per_page=20
  → neue Item-IDs gegen "schon gesehen" (Dedup) prüfen
  → Preis inkl. Versand, Zustand, Größe, Marke gegen Regeln prüfen
  → Treffer sofort per Telegram/Discord pushen (mit Bild, Preis, Link)
  → kurz warten (Jitter 1–3 s), nächstes Preset
```

Wichtige Details, die über Erfolg/Blockade entscheiden:

| Thema | Was funktioniert |
|---|---|
| **Auth** | Cookie/Token aus einer **echten Login-Session** (`access_token_web`, Session-Cookie). Läuft schnell ab → muss automatisch refresht werden (Anonyme Sessions holt man über `GET /` + Cookie-Extraktion). |
| **Endpoint** | `/api/v2/catalog/items` (JSON). Query-Parameter = dieselben wie in der Katalog-URL. |
| **Sortierung** | `order=newest_first` – ohne das kein Sniping. |
| **Tempo** | 1–2 Requests/s pro IP; **Jitter 0,8–2,5 s** + alle 50–80 Requests eine **5–15 s Pause**. |
| **Dedup** | Zuletzt gesehene Item-IDs speichern (Datei/Redis/DB), sonst spammt der Bot. |
| **Proxys** | Ab „mehr als ein paar Suchen" **Residential/Mobile**, rotierend. Datacenter-IPs sterben sofort. |

**Fertige Open-Source-Referenzen** (funktionieren genau so):
- `Fuyucch1/Vinted-Notifications` – nimmt ganze Vinted-URLs mit Filtern, Telegram + RSS, Proxy-Support in der Web-UI.
- `andredisa/vinted_Sentinel_TelegramBot` – Echtzeit-Monitor → Telegram.
- `JakobAIOdev/Vintrack-Vinted-Monitor` – Next.js + Go, Proxy-Rotation, Discord, Dashboard, unabhängiges Polling je Monitor (default 1,5 s).
- `herissondev/pyVinted` – die Python-Lib, die die meisten als Auth-/Fetch-Layer benutzen.

Diese sind die beste „Wissensquelle": Statt alles neu zu erfinden, kopieren wir
deren Auth-/Poll-Logik und bauen unsere Presets + Telegram-Push drumherum.

---

## 3. „Geht es ohne Grabber?" – Ja, mit Grenzen

**Ja, für deinen Anwendungsfall wahrscheinlich sogar ohne bezahlten Dienst –**
solange es bei **~10–20 gespeicherten Suchen** und **moderatem Tempo** bleibt und
der Poller von einer **Heim-IP** (dein PC, ein Raspberry Pi, ein Mini-NAS) läuft.

Grenzen, ab wann du doch einen Grabber/Proxys brauchst:

| Situation | Ohne Grabber? |
|---|---|
| 5–20 Suchen, Check alle 3–10 s, ein Heim-Anschluss | ✅ reicht meist |
| „So schnell wie möglich" (Sub-Sekunde), Autobuy | ⚠️ nur mit rotierenden Residential-Proxys stabil |
| 50+ Suchen parallel / mehrere Regionen | ❌ Proxys/Grabber nötig |
| Läuft in der Cloud (Server/Supabase/Vercel-IP) | ❌ DataDome blockt Datacenter-IPs → Proxy oder Fetch über Grabber |

Merksatz: **Nicht der Code ist das Problem, sondern die IP.** Wer eine saubere
Wohn-IP und höfliches Tempo hat, kommt weit ohne einen Cent Grabber-Kosten.

---

## 4. Grabber-/Proxy-Optionen & echte Kosten

Drei realistische Wege, sortiert nach Kosten:

### A) DIY-Poller auf Heim-IP (günstigster Weg) — **~0 €**
Dein PC / Raspberry Pi läuft 24/7, pollt mit deinem Login. Kosten = Strom.
Risiko: bei zu aggressivem Tempo temporäre Blocks; ein Anschluss = begrenzte Suchanzahl.

### B) DIY + Residential-Proxys (skaliert, moderate Kosten)
- Residential-Proxys: ca. **8 $/GB**; ein brauchbarer Pool **~50–200 $/Monat**.
- Traffic ist bei JSON klein, aber IP-Rotation ist der Kostentreiber.
- Du brauchst zusätzlich TLS-Fingerprint-Matching (`curl-cffi` in Python bzw.
  `tls-client` in Node), sonst nützt der Proxy wenig.

### C) Managed-Grabber (am wenigsten Wartung) — **pay per use**
Managed-Actors kümmern sich um Residential-IPs, TLS-Fingerprint, Cookies, Backoff.
Beispiel-Preise (Apify-Marktplatz):
- **~0,018 $ pro Actor-Start + ~0,0005 $ pro Item** (Smart-Scraper-Tarif).
- Andere Actors: **0,018 $/Start + 0,0015–0,002 $/Result**.
- **Gratis-Kontingent** ~**9.000 Items/Monat** (über Apifys monatliches Free-Credit).

**Rechenbeispiel für dich:** 15 Suchen, alle 30 s je 20 Items geprüft
= 15 × 2/min × 60 × 24 ≈ **43.200 Checks/Tag**. Über einen Managed-Grabber
mit „pro Item"-Abrechnung wird das teuer (Items summieren sich).
→ **Deshalb ist für Dauerbetrieb Weg A/B fast immer günstiger als C.**
Weg C lohnt für **Stoß-Recherche** (z. B. „scanne einmal alle aktuellen
Fairycore-Kleider < 12 €") oder als **Fallback-Fetch-Layer**, wenn der eigene
Poller geblockt wird.

**Empfehlung:** Start mit **A** (Heim-Poller, 0 €). Wenn Tempo/Blocks nerven,
**B** dazuschalten (ein kleiner Residential-Pool). **C** nur für Einmal-Scans
oder wenn du gar nichts selbst hosten willst.

---

## 5. Inspirationsbilder – der realistische Weg

Du willst mit möglichst vielen Beispielbildern arbeiten. Wichtig zu wissen:

- Vinted hat im **Sept. 2025** eine native **Reverse-Bildersuche** eingeführt –
  und **nach ~1 Woche wieder entfernt**. Es gibt also **keine verlässliche
  öffentliche Bild-API**, auf die wir bauen können.
- Drittanbieter (z. B. imagesearchai.com) existieren, sind aber Blackboxes ohne stabile API.

**Der Weg, der zuverlässig funktioniert (und den wir nutzen):**

1. **Bild → Suchbegriffe (Vision-Modell).** Du wirfst ein Inspirationsbild rein,
   ein Vision-Modell (z. B. Claude) beschreibt es strukturiert:
   `{ aesthetic, garment, farbe, muster, material, marken-tipp, keywords[de/en] }`.
   Daraus wird automatisch ein **neues Preset** (search_text + Preis + Zustand).
2. **Optional: visuelle Ähnlichkeit als Re-Ranking.** Der Poller lädt die
   Thumbnail-Bilder der Treffer, ein Embedding-Modell (CLIP) vergleicht sie mit
   deinen Inspirationsbildern und sortiert die visuell nächsten nach oben. So
   fängst du auch Listings mit schlechtem Titel („süßes Top 🌸").

Das ist genau die „Systematik", die du meinst: **Bild rein → Preset raus →
Poller findet Nachschub.** Details/Skizze in [`bildersuche-workflow.md`](./bildersuche-workflow.md).

---

## 6. Empfohlene Architektur in DIESEM Repo

Wir haben schon fast alles: **Supabase** (DB + Edge Functions) und eine
**Telegram-Anbindung** (`create-telegram-link`, `telegram-webhook`). Das nutzen wir.

```
┌────────────────────────┐     ┌──────────────────────────┐
│  Poller (Heim-IP/Pi)   │     │  Supabase                │
│  tools/vinted-sniper/  │────▶│  - Tabelle sniper_presets │
│  poll.mjs              │     │  - Tabelle sniper_seen    │
│  - liest presets.json  │◀────│  - Tabelle sniper_hits    │
│  - pollt Vinted        │     └──────────────────────────┘
│  - dedup + filter      │                 │
│  - Push  ──────────────┼─────────────────┘
└────────────────────────┘        ▼  Telegram (bestehender Bot)
                                „🧚 Fairycore-Kleid 8 € +3 € Versand → Link"
```

- **Der Fetch läuft NICHT in einer Edge Function** (Datacenter-IP → DataDome-Block),
  sondern im **Poller auf einer Wohn-IP**.
- **Supabase** hält Presets + gesehene IDs + Trefferhistorie (später schöne
  „Sniper"-Route im UI zum Presets-Verwalten und Treffer-Feed).
- **Telegram** = Push-Kanal (nutzt euren bestehenden Bot-Token wieder).

Der erste lauffähige Baustein liegt in
[`../../tools/vinted-sniper/poll.mjs`](../../tools/vinted-sniper/) – Node ohne
Extra-Dependencies, liest `presets.json`, dedupt lokal, kann Telegram pushen.
So siehst du das Prinzip **heute live**, bevor wir DB/UI/Proxys ausbauen.

---

## 7. Rechtliches / ToS (kurz & ehrlich)

- Vinteds AGB untersagen automatisiertes Scraping. Realität: unzählige private
  Monitor-Bots existieren; das Risiko bei **höflichem Tempo + eigenem Account**
  ist v. a. **temporäre Blocks/Account-Sperre**, kein strafrechtliches Thema für
  private Deal-Suche. Trotzdem: **kein Hämmern**, Rate-Limits respektieren,
  keine fremden Zugangsdaten, keine Weiterverbreitung persönlicher Daten.
- Reselling selbst ist legal; ab gewisser Regelmäßigkeit ist es in AT
  gewerblich/steuerlich relevant (Einkommensteuer, evtl. Gewerbe). Das ist eine
  Business-Frage, keine Technikfrage – aber gut, es zu wissen.

---

## 8. Nächste Schritte (Vorschlag)

1. **Jetzt:** Presets nutzen (`presets.md` – URLs manuell speichern) **und**
   den Poller-Prototyp mit deinem Cookie testen.
2. **Wenn's taugt:** Supabase-Tabellen + Telegram-Push fest verdrahten,
   Presets aus der DB statt JSON.
3. **Bild-Workflow:** Vision-Endpoint „Bild → Preset" ergänzen (dein
   „ich werf dir Bilder rein"-Wunsch).
4. **Nur bei Bedarf:** Residential-Proxys / Managed-Grabber als Fetch-Fallback.

Sag mir, welchen Schritt ich als Nächstes bauen soll – Punkt 2 (DB + fester
Telegram-Push) ist der logische nächste Ausbau.

---

## Quellen

- ScrapeBadger – *Best Vinted API 2026 (4 Tools getestet)*: <https://scrapebadger.com/blog/vinted-api-best-scraping-apis-compared-for-2026>
- DEV/datakaz – *How to Scrape Vinted in 2026 (Without Getting Blocked)*: <https://dev.to/datakaz/how-to-scrape-vinted-in-2026-without-getting-blocked-2a59>
- DEV/datakaz – *Vinted Scraper in Python — Honest Developer Guide (2026)*: <https://dev.to/datakaz/vinted-scraper-in-python-honest-developer-guide-2026-3j58>
- Vinted Pro Integrations API-Doku: <https://pro-docs.svc.vinted.com/>
- Fuyucch1/Vinted-Notifications: <https://github.com/Fuyucch1/Vinted-Notifications>
- andredisa/vinted_Sentinel_TelegramBot: <https://github.com/andredisa/vinted_Sentinel_TelegramBot>
- JakobAIOdev/Vintrack-Vinted-Monitor: <https://github.com/JakobAIOdev/Vintrack-Vinted-Monitor>
- Apify Vinted-Actor (Preise/Items): <https://apify.com/webdatalabs/vinted-scraper-pro>
- Vinted Reverse-Image-Search (eingeführt & wieder entfernt, 09/2025): <https://vintieplus.com/blog/vinted-image-search-how-ai-powered-visual-search-is-transforming-second-hand-fashion-shopping/>
