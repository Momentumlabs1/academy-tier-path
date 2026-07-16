# Video 1 — Onboarding / „Willkommen bei CosmoTrades"

> Walkthrough: Skript, Sequenzen, zu generierende Bilder & Clips. Ziel-Länge: **~2:20 Min.**
> Sieht jeder direkt nach der Registrierung im Dashboard (vor Einzahlung).

---

## A. Konsistenz-Regel für Cosmo (gilt für ALLE Videos)

1. **Master = `video/public/cosmo/master.png`** (2160×3840, Hintergrund bereits transparent; Original: „COSMO (3).png" im Drive). Dazu komplettes Turnaround im Repo: `view-34.jpg`, `view-side.png`, `view-back.png`, `view-front-shaded.png`, `portrait-ring.png`.
2. Jede neue Pose/Version = **Image-to-Image vom Master** (+ Turnaround als Zusatz-Referenzen, z. B. Kling Elements). Niemals rein aus Text generieren.
3. **Charakter-Sheet-Prompt (final, paste-ready):**
   > "Exact same character as the reference images: a slim young man with flat light-blue skin (#75B9F5), Rick-and-Morty-style 2D cartoon with clean dark outlines and subtle cel shading. Very short black buzzcut hair (#0F1928) with sharp fade, thick black eyebrows with a small slit cut in his left eyebrow (viewer's right), large oval white eyes with small black pupils, calm friendly smile. Thin gold chain necklace. Plain black crew-neck t-shirt (#21221F). Baggy distressed mid-blue jeans (#2D465B) with denim patches and paint splatters (white, orange, blue, lime-green). Chunky retro sneakers in white, navy-blue and orange. Same art style, same line weight, same colors, same proportions. Full body, [POSE]. Flat solid magenta background (#FF00FF), no shadows on background, even lighting."
4. **Plate-Farbe: MAGENTA `#FF00FF`** — entschieden, weil Cosmos Jeans grüne Farbspritzer haben (Greenscreen würde Löcher stanzen). Magenta kommt am Charakter nicht vor.
5. **Status:** P1 (frontal, Magenta) und P4 (Close-up, Magenta) sind **fertig** — per Code aus dem transparenten Master gebaut (`plate-P1-frontal-magenta.png`, `plate-P4-closeup-magenta.png`). P2/P3/P5/P6: erst nötig, falls Direkt-i2v (Option A) nicht reicht.
6. **Option A zuerst testen:** Gesten-Clips direkt per i2v aus P1 mit Action-Prompt („raises arm and points to the right…") — spart Posen-Generierung. Nur wenn das unzuverlässig ist: Posen-Plates P2/P3/P5/P6 per i2i generieren (Option B).

## B. Zu generierende Bilder (Pose-Plates)

| # | Plate | Verwendung |
|---|---|---|
| P1 | Frontal, neutral-freundlich, ganzer Körper | Basis für Idle- & Sprech-Clips |
| P2 | 3/4-Ansicht, zeigt nach **rechts** (aus Zuschauersicht) | „Schau dir DAS an"-Momente (UI rechts) |
| P3 | 3/4-Ansicht, zeigt nach **links** | dito für UI links |
| P4 | Brustbild/Close-up, frontal | Hedra-Sprech-Clips (Intro & Transparenz-Block) |
| P5 | Jubelnd, Arme hoch | CTA-Ende + Wiederverwendung in allen Glückwunsch-Videos |
| P6 | Daumen hoch, zwinkernd | Abbinder / Transparenz-Block |

## C. Zu generierende Cosmo-Clips (KI, wiederverwendbare Bibliothek)

Alle Clips: statische Kamera, Plate-Hintergrund unverändert, 720p+, Prompt-Zusatz: *"static locked camera, solid flat background remains completely unchanged, character only moves"*.

| # | Clip | Quelle | Länge | Tool |
|---|---|---|---|---|
| C1 | Winken/Begrüßung | P1 | 5 s | Kling/Hailuo i2v |
| C2 | Zeigt nach rechts + nickt | P2 | 5 s | Kling/Hailuo |
| C3 | Zeigt nach links + nickt | P3 | 5 s | Kling/Hailuo |
| C4 | Idle-Loop (atmen, blinzeln, leichtes Wippen) | P1 | 10 s | Kling/Hailuo |
| C5 | Erklär-Geste (Hände offen, gestikuliert ruhig) | P1 | 8 s | Kling/Hailuo |
| C6 | Jubel | P5 | 5 s | Kling/Hailuo |
| C7 | Daumen hoch | P6 | 4 s | Kling/Hailuo |
| C8 | **Sprech-Clip Intro** (Audio Szene 1) | P4 | ~10 s | **Hedra** (Bild + ElevenLabs-Audio) |
| C9 | **Sprech-Clip Transparenz** (Audio Szene 6, Kernaussagen) | P4 | ~15 s | **Hedra** |
| C10 | **Sprech-Clip Abschluss** (Audio Szene 7) | P4 | ~8 s | **Hedra** |
| C11 | Hand greift zum Objektiv & justiert (nah, Oberkörper) | P1/P4 | 5 s | Kling/Hailuo |
| C12 | Steht mittig, redet & gestikuliert (ganzer Körper) | P1 | 10 s | Kling/Hailuo + ggf. Sync.so Lip-Fix |
| C13 | Sitzt am Desk, redet Richtung Kamera | P1 (+R1 als Referenz) | 10 s | Kling/Hailuo + ggf. Sync.so Lip-Fix |

→ Kostenrahmen gesamt: ~10 Clips ≈ **5–8 $**. C1–C7 werden in allen 8 Videos wiederverwendet.

### Paste-ready Prompts für die 3 Intro-Clips (Multishot, Szene 1)

Input-Bild jeweils die Magenta-Plate (P1 Ganzkörper bzw. P4 Close-up). Standard-Suffix immer anhängen:
> *"Static locked camera, flat solid magenta background (#FF00FF) remains completely unchanged, 2D cartoon style preserved, clean outlines, no camera movement."*

- **C11 — Kamera justieren** (Input P4, ~5 s):
  > "Extreme close-up: the cartoon character's chest and arm fill the frame as he reaches with one hand toward the camera lens, adjusting and tilting it with small bumps, then lowers his hand, looking into the lens."
- **C12 — Rückwärts in den Raum** (Input P1, ~10 s):
  > "The character walks backwards away from the camera with a relaxed cartoon walk cycle, starting close (chest filling the frame) and ending with his full body visible in the center, facing the camera the whole time, gesturing casually as if talking."
- **C13 — Hinsetzen am Desk** (Input P1, ~8 s):
  > "The character takes a few steps to the side and sits down onto a simple dark office chair, settles, then looks into the camera with a friendly smile, talking casually."
  (Der dunkle Stuhl darf im Clip bleiben — er verschwindet im Composite größtenteils hinter der Desk-Kante.)

**Einbau-Workflow (Multishot):** Clips generieren → in Drive „04 KI-Clips (Magenta)" legen → Claude lädt sie, stanzt per FFmpeg (Magenta-Key + Despill), matcht Timing/Position aufs V2-Storyboard und rendert die finale Szene. Lippen: vorerst generisches Sprechen; präziser Sync später via Hedra (Close-ups) oder Sync.so.

**Sprech-Strategie:** Cosmo spricht nur an 3 Stellen sichtbar (Anfang, Transparenz-Block, Ende) — Rest ist Voiceover über Code-Szenen, während Cosmo gestikuliert oder gar nicht im Bild ist. Wirkt professionell und spart Hedra-Credits.

## D. Skript & Sequenzen

**Stimme:** ElevenLabs (du-Form, locker, energisch aber seriös). **VO = Voiceover, [C] = Charakter-Layer, [BG] = Code-Hintergrund (Remotion).**

---

### Szene 1 — Cold Open „Cosmo schaltet die Kamera an" (0:00–0:18) ⭐ Signature-Shot
**Konzept:** Das komplette Intro ist aus der **POV von Cosmos eigener Kamera** gefilmt.

**Beats:**
1. Schwarzbild → *Klick* → Kamera geht an: **REC-Punkt blinkt, Timecode läuft, Akku-Icon, AF-Klammern** (alles Code-Overlay, 100 % Remotion).
2. Cosmo ist zu nah dran — Brust/Hand füllt den unscharfen Frame, seine Hand greift Richtung Objektiv, das Bild **ruckelt beim Zurechtrücken** (Mikro-Reframe per Code).
3. Er tritt zurück → **sein Zimmer wird sichtbar** (Trading-Room: Desk, Monitore, LED-Neon). Die Kamera **sucht den Fokus**: AF-Klammern pumpen, Blur pulsiert (Code) — währenddessen fängt er schon an zu reden.
4. Er geht weiter zurück und **setzt sich an den Schreibtisch**. Auf seinen **Monitoren laufen unsere echten Code-Charts** (Screens im Artwork sind dunkel und werden per Remotion bespielt).

**Layer-Umsetzung:**
- **[BG] Zimmer** = EIN hochwertiges Artwork im Cosmo-Stil (KI, einmalig generiert, Asset R1), geschnitten in **3 Tiefen-Ebenen** (Rückwand / Desk+Monitore / Vordergrund) → Parallax + Rack-Focus in Code.
- **[C] Cosmo** auf Magenta: **C11** (Hand justiert Objektiv, nah, unscharf), **C12** (steht mittig im Raum, redet/gestikuliert), **C13** (sitzt am Desk, redet). Positionswechsel werden im **Unschärfe-Peak der Fokus-Pumps geschnitten** → wirkt filmisch, vermeidet den fehleranfälligen Dauer-Rückwärtslauf.
- **Variante B (testen):** ein durchgehender Kling-Clip „geht rückwärts von der Kamera weg, spricht dabei" — falls artefaktfrei, ersetzt er die Schnitt-Lösung.

**VO/Cosmo:** „Oh — läuft? … Ah, perfekt! Hey — willkommen bei CosmoTrades! Ich bin Cosmo. Komm rein — ich zeig dir, was dich hier erwartet und wie du hier das Maximum rausholst."

> ⏱ Durch das längere Intro verschieben sich alle Folge-Szenen um ca. +8 s; Gesamtlänge neu ~2:30.

### Asset R1 — Cosmos Zimmer (einmalig generieren, i2i style-match zum Master)
Prompt (paste-ready):
> "Wide interior illustration in the exact same 2D cartoon style as the reference character (clean dark outlines, flat colors, subtle cel shading): a moody trader's room at night. Large desk with a triple monitor setup, screens turned OFF (plain dark surfaces), LED strip accents in blue (#75B9F5) and orange (#F08C1E), shelf with sneaker boxes and a small plant, window with blinds showing a night city skyline, posters on the wall, dark floor. No people. 16:9, very high resolution, cinematic depth: clear foreground (desk edge), midground (monitors/desk), background (wall/window)."

**Quality-Leitplanke (gilt für alles):** Nichts darf billig aussehen. Jede Szene braucht Bewegungs-Tiefe (Parallax, Fokus-Leben, Micro-Motion) statt statischer Flächen. Lieber eine Szene mehr Iteration als ein flacher Look.

### Szene 2 — Dashboard-Überblick (0:10–0:30)
- **[BG]:** Kamerafahrt übers echte Dashboard-UI: 3 Punch-Ins nacheinander — Signale-Karte, Lessons-Bereich, Live-Call-Kalender. Jeweils weicher Zoom + kurzer Fokus-Wobble.
- **[C]:** C2/C3 klein in der Ecke, zeigt jeweils auf den aktiven Bereich.
- **VO:** „Das hier ist dein Dashboard — dein Kommandozentrum. Hier kommen unsere Live-Signale rein. Hier findest du deine Lektionen. Und hier siehst du, wann die nächsten Live-Calls mit unserem Team stattfinden."

### Szene 3 — Signale (Herzstück) (0:30–0:52)
- **[BG]:** Gold-Chart baut sich live auf (Stil wie D-VP-Video: Loader → Candles → Live-Preis pulsiert). Signal-Card fliegt rein: Entry / SL / TP mit Preis-Labels am Chart.
- **[C]:** nicht im Bild (voller Fokus auf Chart).
- **VO:** „Fangen wir mit dem Herzstück an: den Signalen. Unser Team analysiert die Märkte — vor allem Gold. Und wenn sich ein sauberes Setup ergibt, bekommst du es direkt hierher gepusht: Einstieg, Stop-Loss, Take-Profit. Klar, präzise, ohne Blabla."

### Szene 4 — Education & Live Calls (0:52–1:12)
- **[BG]:** Lesson-Grid scrollt durch (Karten mit Fortschrittsbalken), Übergang zu Live-Call-Ansicht (Kalender + „LIVE"-Badge pulsiert).
- **[C]:** C5 (Erklär-Geste) halbgroß rechts.
- **VO:** „Damit du nicht nur kopierst, sondern wirklich verstehst, was du tust, gibt's die Academy: Schritt-für-Schritt-Lektionen — vom absoluten Anfänger bis zum fortgeschrittenen Trader. Und in den Live-Calls stellst du deine Fragen direkt an uns."

### Szene 5 — Level & Unlocks (1:12–1:35)
- **[BG]:** Tier-Treppe animiert sich von unten nach oben: Foundation → Operator → Elite → Black. Pro Stufe poppen Perk-Icons auf (mehr Signale, Live-Room, 1:1, VIP). Kamera steigt die Treppe cinematisch hoch.
- **[C]:** C4 (Idle) klein, blickt nach oben zur Treppe.
- **VO:** „Je nachdem, wie groß du einsteigst, schaltest du mehr frei: von Foundation über Operator und Elite bis Black. Mehr Signale, mehr Live-Sessions, engere Betreuung — du entscheidest, wie tief du gehst."

### Szene 6 — Transparenz-Block (1:35–2:02) ⭐ wichtigste Szene
- **[BG]:** Ruhiger, cleaner Screen: Visual „Dein Broker-Konto" — 100-€-Chip wandert vom User-Icon aufs Broker-Konto, ein Pfeil zeigt jederzeit zurück („Auszahlung jederzeit"). Dann kleines Diagramm: Broker → Provision → CosmoTrades, daneben durchgestrichenes „Abo/Gebühren"-Icon.
- **[C]:** C9 (Sprech-Clip) — Cosmo groß, spricht direkt in die Kamera. Ernst-freundlich.
- **VO/Cosmo:** „Und jetzt das Wichtigste — volle Transparenz: Um loszulegen, eröffnest du ein Konto bei unserem Partner-Broker und zahlst mindestens 100 Euro ein. Dieses Geld ist und bleibt DEINS. Es liegt auf deinem eigenen Broker-Konto, und du kannst es jederzeit wieder auszahlen. Warum das Ganze? Ganz einfach: Der Broker zahlt uns eine Provision, wenn du tradest. Deshalb kostet dich CosmoTrades kein Abo und keine Mitgliedsgebühr. Und ganz klar: Trading birgt Risiken — trade nur mit Geld, dessen Verlust du dir leisten kannst."
- **Einblendung (bleibt 5 s stehen):** „⚠ Trading birgt Risiken. Kein Anlageberatung. Trade nur mit Kapital, dessen Verlust du verkraften kannst."

### Szene 7 — CTA & Abschluss (2:02–2:20)
- **[BG]:** Dashboard zurück; „Konto verknüpfen & einzahlen"-Button bekommt sanften Glow + Puls. Danach: Vorschau-Karte „Nächstes Video" mit Schloss, das aufspringt.
- **[C]:** C10 (Sprech-Clip) → Übergang in C6 (Jubel) / C7 (Daumen hoch).
- **VO/Cosmo:** „Also: Konto verknüpfen, erste Einzahlung machen — und dein nächstes Video plus dein erstes Level schalten sich automatisch frei. Wir sehen uns drinnen — viel Spaß, dein Cosmo!"
- **[BG]:** Logo-Abbinder CosmoTrades, kurzer Sound-Sting.

---

## E. Produktions-Reihenfolge

1. Master-Bild festlegen (User) → Charakter-Sheet-Prompt final ausfüllen
2. Plates P1–P6 generieren (i2i vom Master) → Review durch User
3. Skript-Text final absegnen (User) → ElevenLabs-Audio pro Szene generieren
4. Szenen-Timing aus Audiolängen ableiten → Remotion-Szenen bauen ([BG]-Layer)
5. Clips C1–C7 generieren (Kling/Hailuo), C8–C10 (Hedra mit Szenen-Audio)
6. Chroma-Key (FFmpeg) → Alpha-WebM/ProRes
7. Composite in Remotion → Preview-Render 720p → Review → Final 1080p/4K

## F. Musik & Sound

- Ein Track, modern/clean (dezenter Electronic-Beat), geduckt unter VO.
- SFX: UI-Pops (Szene 2), Signal-Ping (Szene 3), Treppen-Steps (Szene 5), Unlock-Sound (Szene 7).
