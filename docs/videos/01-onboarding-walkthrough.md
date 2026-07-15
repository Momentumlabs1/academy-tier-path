# Video 1 — Onboarding / „Willkommen bei CosmoTrades"

> Walkthrough: Skript, Sequenzen, zu generierende Bilder & Clips. Ziel-Länge: **~2:20 Min.**
> Sieht jeder direkt nach der Registrierung im Dashboard (vor Einzahlung).

---

## A. Konsistenz-Regel für Cosmo (gilt für ALLE Videos)

1. **Ein Master-Referenzbild** wird festgelegt (aus den 6 Bildern im Drive-Ordner „CosmoTrades"; Entscheidung durch User).
2. Jede neue Pose/Version = **Image-to-Image vom Master** + fixer Charakter-Sheet-Prompt. Niemals rein aus Text generieren.
3. Charakter-Sheet-Prompt (Template, wird nach Sichtung des Masters exakt ausgefüllt):
   > "Exact same character as reference: [Körperform, Kopf, Gesicht, Kleidung, Farben mit Hex-Codes, Proportionen]. Same art style, same line weight, same colors. Full body, [POSE]. Flat solid [chroma green #00FF00 / magenta #FF00FF] background, no shadow on background, even lighting, static pose."
4. Plate-Farbe: **Grün `#00FF00`**, außer Cosmo trägt Grün → dann **Magenta `#FF00FF`** (offen bis Master gesichtet).

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

→ Kostenrahmen gesamt: ~10 Clips ≈ **5–8 $**. C1–C7 werden in allen 8 Videos wiederverwendet.

**Sprech-Strategie:** Cosmo spricht nur an 3 Stellen sichtbar (Anfang, Transparenz-Block, Ende) — Rest ist Voiceover über Code-Szenen, während Cosmo gestikuliert oder gar nicht im Bild ist. Wirkt professionell und spart Hedra-Credits.

## D. Skript & Sequenzen

**Stimme:** ElevenLabs (du-Form, locker, energisch aber seriös). **VO = Voiceover, [C] = Charakter-Layer, [BG] = Code-Hintergrund (Remotion).**

---

### Szene 1 — Cold Open „Kamera richtet sich ein" (0:00–0:10)
- **[BG]:** Dashboard dunkel, leicht unscharf; Fokus zieht scharf (Rack-Focus), Mikro-Reframing (Kamera „rückt sich zurecht"), sanfter Punch-In.
- **[C]:** C8 (Sprech-Clip) — Cosmo poppt mit leichtem Scale-Bounce ins Bild, winkt (Übergang aus C1).
- **VO/Cosmo:** „Hey — und willkommen bei CosmoTrades! Schön, dass du da bist. Ich bin Cosmo, und in den nächsten zwei Minuten zeig ich dir, was dich hier erwartet — und wie du das Maximum rausholst."

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
