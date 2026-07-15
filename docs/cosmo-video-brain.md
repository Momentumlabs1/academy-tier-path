# Cosmo-Video-Brain — Onboarding- & Logik-Videos der Academy

> Zentrale Doku für die Video-Produktion (Dashboard-Videos, Unlock-Videos, später Content/Reels).
> Session-Brain: Diese Datei hält alles fest, was chatübergreifend gemerkt werden muss. Stand: Juli 2026.

---

## 1. Funnel-Kontext (warum diese Videos existieren)

1. Leads kommen über gebrandete Landing Pages von Themen-Pages / Influencern.
2. Klick auf „Registrieren" auf der Landing Page → Registrierung **bei uns** → User landet **direkt im Dashboard** (keine zweite Landing Page dazwischen).
3. Im Dashboard läuft das **Onboarding-Video**: erklärt dem Lead, was hier los ist.
4. CTA: erste Einzahlung beim Broker (Minimum **100 €**).
5. User kommt vom Broker zurück → nächstes Video wird freigeschaltet: **Glückwunsch-Video** passend zum Einzahlungs-Level.
6. Pro höherem Einzahlungs-Level gibt es jeweils ein eigenes Glückwunsch-/Unlock-Video.

## 2. Video-Liste (Produktions-Backlog)

| # | Video | Trigger | Status |
|---|---|---|---|
| 1 | **Onboarding / „Was ist hier los"** | Erster Dashboard-Besuch nach Registrierung (vor Einzahlung, sieht jeder) | Skript offen |
| 2 | Glückwunsch **Foundation** (100–999 €) | Erste Einzahlung ≥ 100 € | offen |
| 3 | Glückwunsch **Foundation+** (1.000–1.999 €) | Upgrade | offen |
| 4 | Glückwunsch **Operator** (2.000–4.999 €) | Upgrade | offen |
| 5 | Glückwunsch **Operator+** (5.000–9.999 €) | Upgrade | offen |
| 6 | Glückwunsch **Elite** (10.000–24.999 €) | Upgrade | offen |
| 7 | Glückwunsch **Elite+** (25.000–49.999 €) | Upgrade | offen |
| 8 | Glückwunsch **Black** (50.000 € +) | Upgrade | offen |
| 9+ | Freier Content / Reels (aufbauend auf dem Workflow) | — | später |

## 3. Inhaltliche Pflichtpunkte — Onboarding-Video

- Was die Academy bietet: **Signale**, **Education/Lektionen**, **Live Calls** — gestaffelt nach Einzahlungs-Level (Perks-Staffel, siehe `verguetung-modell.md` §4/§8-A).
- **Transparenz-Block (Pflicht):**
  - Die Einzahlung (min. 100 €) ist und bleibt **das Geld des Users** — liegt auf SEINEM Broker-Konto und kann jederzeit wieder ausgezahlt werden.
  - Wir arbeiten mit dem Broker zusammen und bekommen eine **Provision** — deshalb kann das Angebot (Signale, Education, Calls) ohne Abo-Gebühr laufen. Das wird offen gesagt.
- CTA: erste Einzahlung tätigen → schaltet das nächste Level frei.
- Abschluss: viel Spaß wünschen, positiver Ausblick.
- ⚠️ **Empfehlung (rechtlich, EU/AT):** kurzer Risikohinweis zu Trading/CFD gehört in Marketing-Material — als eleganter One-Liner + Einblendung lösen, nicht weglassen.

## 4. Stil-Guide (alle Videos)

- **Modern, cool, clean, einfach** — aber mit **organischem, schnellem Flow**, leicht cineastisch.
- Realitäts-Tricks: Am Anfang „richtet sich die Kamera zurecht" (Mikro-Reframing), leichte **Schärfe-Verlagerung/Autofokus-Wobble**, lebendige **Zooms/Punch-Ins** statt statischer Frames.
- Bildschirm-Inhalte (UI, Charts, Präsentationsflächen) wirken wie echte Screen-Captures, bauen sich animiert auf (Loader → Chart → Live-Preis pulsiert — wie im D-VP-Video aus dem Admin-Chat).

## 5. Produktions-Workflow (Hybrid: Code + KI)

**Grundprinzip: Die KI animiert NUR den Charakter (Cosmo), nie das ganze Bild.**
Wenn die Video-KI den kompletten Frame animiert, entstehen Artefakte an eigentlich statischen UI-Elementen. Deshalb:

1. **Hintergrund/Screen-Content = 100 % Code** (Charts, Dashboards, Text, Präsentation, Kamerafahrten) — wie die bisherigen Chart-Videos im Admin-Chat („100 % Code").
2. **Cosmo-Charakter = KI-animiert, isoliert** (User liefert die hochauflösenden Charakter-Bilder; KI generiert nur den Charakter-Clip, idealerweise mit Alpha/Greenscreen).
3. **Compositing = Code**: Charakter-Clip wird über den Code-Hintergrund gelegt (Chroma-Key/Alpha-Overlay).
4. Skript, Szenenplan und Timing entstehen komplett im Chat, **bevor** gerendert wird → jeder KI-Render-Versuch sitzt, Credits werden gespart.
5. Länge: Onboarding kann lang sein (bis ~10 Min. möglich per Code-Rendering); Unlock-Videos kurz (~15–45 s).

### Rollenteilung
- User liefert: Cosmo-Bilder (i2i high-res existiert schon, siehe Zeko-Commits), ggf. Screenshots/Assets, Feedback.
- Claude baut: Hintergrund-Renderings, Szenen, Skripte, KI-Prompts für die Charakter-Clips, Compositing, Export.

## 6. Tech-Stack (Empfehlung aus Recherche Juli 2026)

### 6.1 Code-Videos (Hintergrund, UI, Charts, Kamerafahrten)

- **Remotion 4.0.x** (React) — 2026 der klare Standard. Motion Canvas ist tot (Projekt aufgegeben, nur Community-Fork „Canvas Commons"), Revideo wurde von Midrender absorbiert.
  - Eingebaute Effekte für unseren Look: **Progressive Blur & Zoom-Blur** (Rack-Focus/Autofokus-Wobble), Transitions, Shapes.
  - **Lizenz:** kostenlos bis 3 Personen im Team; ab 4 Personen „Creators"-Lizenz 25 $/Seat/Monat (min. 3 Seats).
  - Lange Videos: pro Szene eine Composition, Chunk-Rendering (`h264-ts` + `combineChunks()`), lokal rendern (10-Min-1080p ≈ 10–30 Min auf starker Maschine). 4K nur fürs finale Master.
- **Audio-first-Workflow:** Erst deutsche Voiceover pro Szene generieren, Dauer auslesen (Word-Timestamps), Szenen-Timing vom Audio ableiten — nie umgekehrt.
- **Voiceover (Deutsch):** **ElevenLabs v3** für final (beste deutsche Qualität, ~1 $ pro 10-Min-Video via API); OpenAI `gpt-4o-mini-tts` für billige Entwürfe (~0,15 $).
- **Musik:** Epidemic Sound Commercial (19 $/Mo) oder Artlist (~40 $/Mo); Ducking unter der Stimme per Volume-Keyframes/`sidechaincompress`.
- Optional echte App-Aufnahmen: Playwright ≥1.59 Screencast-API → FFmpeg → als `<OffthreadVideo>` in Remotion einbetten; Zooms/Schwenks trotzdem in Remotion machen (wirkt organischer als FFmpeg-`zoompan`).

### 6.2 Cosmo-Charakter (KI-animiert, isoliert)

**Kein Modell liefert 2026 nativ Alpha aus der Generierung → Greenscreen-Workflow ist Standard:**

1. **Green-Plate bauen (der entscheidende Trick):** Cosmo-PNG **vorher per Code auf flaches Chroma-Grün `#00FF00` setzen** (Magenta, falls Cosmo Grün enthält), kein Schatten, statisches Framing. Image-to-Video-Modelle erhalten das erste Frame stark → Hintergrund bleibt keybar. 2–3 Pose-Plates anlegen.
2. **Sprech-Clips (Deutsch):** ElevenLabs-Audio + **Hedra Character-3** (Bild + Audiodatei → sprechender Charakter, Hintergrund bleibt fast pixelgenau grün). ~0,45 $ pro 10-s-Clip (Creator 30 $/Mo). Alternative für gespielte Gesten: **Runway Act-Two** (selbst auf Deutsch vorspielen, Performance wird auf Cosmo übertragen, ~0,50 $/10 s).
3. **Gesten-/Idle-Clips (ohne Sprache):** **Kling 2.6/3.0** oder **Hailuo 2.3** i2v von denselben Plates, Prompt „static camera, solid green background unchanged". **Bibliothek aus 5–10-s-Idle-Loops aufbauen und wiederverwenden** → spart massiv Credits. (Achtung: Kling-Lipsync kann kein Deutsch.)
4. **Keying:** FFmpeg `chromakey` + `despill` → ProRes 4444 (Master) + VP9-Alpha-WebM (Proxy).
5. **Fallback bei dreckigem Key:** Sammie-Roto 2 (SAM-2 + MatAnyone 2, gratis) oder Runway Remove Background.
6. **Compositing:** In Remotion `<OffthreadVideo transparent />` als Charakter-Layer über den Code-Hintergrund. WebM-Alpha in einem Pass lokal rendern (flackert bei Chunk-Rendering), ProRes für Lambda.

### 6.3 Kostenrahmen

- 60-s-Explainer mit ~4 Sprech- + 3 Gesten-Clips ≈ **3–6 $ Generierungskosten**.
- Abos: Hedra ~30 $/Mo + ggf. Kling/Hailuo-Credits (~30 $/Mo) decken den Bedarf; Runway-only wäre die einfachste Ein-Anbieter-Lösung (~2× Clip-Kosten).
- Code-Rendering + Voiceover: praktisch kostenlos (~1 $ Voiceover pro 10 Min).

## 7. Assets & Stimme (Stand 15.07.2026)

### Google Drive: Universum-Struktur (angelegt 15.07.2026)
`CosmoTrades/Universum/` mit Unterordnern: `01 Charaktere – Cosmo` (Master + Turnaround, serverseitig einkopiert), `02 Plates (Magenta)`, `03 Räume & Hintergründe`, `04 KI-Clips (Magenta)`, `05 Final Renders`. Dazu Google Doc **„COSMO-UNIVERSUM — Index & Prompts"** mit allen paste-ready Prompts.
**Upload-Regel:** Claude kann in Drive Ordner anlegen, Dateien kopieren und Docs schreiben — aber keine großen Binärdateien hochladen. Neue von Claude erzeugte Bilder/Videos kommen ins Repo + werden im Chat geschickt → User zieht sie in den passenden Universum-Ordner. Umgekehrt kann Claude alles aus Drive **lesen** (Public-Link-Download funktioniert).

### Google Drive: Ordner „CosmoTrades" (Meine Ablage)
- **Cosmo-Charakterbilder (6):** `COSMO (3).png`, `Maincharaktär_1.png` (+ Duplikat), `Maincharaktär_2.jpg`, `Maincharaktär_3.png`, `Maincharaktär_4.png`, `ChatGPT Image 15. Juli 2026.png`
- **Roh-Videos der bisherigen Lektionen** (jeweils „Face & Stimme"-Aufnahme + separate Screen-Aufnahme, Miro-basiert):
  Signale kopieren, Video 2 „Was ist Trading", Video 3 „Warum die Mehrheit verliert", Video 4 „Was ist Retail Money", Video 5 (2 Screens), Video 6 „Gesicht & Stimme + Bildschirm"
- Repo enthält bisher nur den **Zeko**-Charakter (`public/zeko-hero.png`, `public/zeko-point.png` — 2D-Cartoon, Salbeigrün-Hoodie). Cosmo-Bilder müssen noch ins Repo (`public/` bzw. Video-Assets-Ordner).
- ⚠️ Falls Cosmo (wie Zeko) **Grün** trägt: Magenta-Plate `#FF00FF` statt Greenscreen verwenden.

### Stimme — Entscheidung
- **ElevenLabs bleibt die Stimme** (User hat bereits ein Eleven-Abo; deutsche Qualität besser als Hedra-eigene Voices).
- Hedra wird **nur als Animator** genutzt: Bild + fertige Audiodatei hochladen (Kern-Feature, kein Hack).
- Option: **Voice-Clone** aus den vorhandenen „Face & Stimme"-Aufnahmen in ElevenLabs → Cosmo spricht mit der echten Stimme, unbegrenzt neuer Text ohne Neuaufnahme.
- Audio-first ist Pflicht: dieselbe Audiodatei steuert (a) Hedra-Lippen, (b) Remotion-Szenen-Timing.

### Automatisierung (sobald API-Keys da sind)
- Mit `ELEVENLABS_API_KEY` + `HEDRA_API_KEY` als Environment-Secrets kann die komplette Kette aus dem Chat laufen: Skript → TTS → Hedra-Clip → Chroma-Key → Remotion-Composite.
- Ohne Keys: Claude liefert Skript + fertige Prompts/Audiotexte, User klickt in Eleven/Hedra-Web-UI.

## 8. Cowork-Promo — geprüft & verworfen (15.07.2026)

Claude-Promo 5.6.–5.8.2026 (doppeltes 5h-Limit in der Cowork-Desktop-App) wurde geprüft: **nicht relevant für uns.** Wochenlimits bleiben gleich, und die gesamte Video-/Content-Produktion läuft ohnehin in Claude Code (Repo, Rendering, Pipelines). Entscheidung: Alles bleibt in Claude Code. Der ursprünglich gesetzte Promo-Reminder wurde wieder gelöscht.

**Arbeitsprinzip (bleibt):** Dieser Chat = Gehirn + Repo-Executor. Übergabe an andere Sessions immer über diese Datei + Repo, nie über Chat-Gedächtnis.

## 9. Session-Organisation

- **Dieser Chat = „Cosmo-Trade-Gehirn"**: Video-Logik der Academy + darauf aufbauender Content.
- Der bisherige Admin-Chat (Session `session_01DQYNU7oC6wYhk1ASNyHmkR`) macht die Academy fertig und läuft aus (Kontext voll).
- Branch dieser Session: `claude/content-workflow-tools-pgrcm0`.
- Alles Wichtige wird in diese Datei geschrieben und gepusht — Sessions sind ephemeral.
