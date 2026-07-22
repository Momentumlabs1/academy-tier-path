# Partner-Landing-Intro — MULTISHOT-Produktion (Cosmo, „richtig krass")

> Das gebrandete Willkommensvideo auf der Partner-Landingpage (`/<slug>`), VOR Registrierung.
> **~42 s**, kinoreifer Multi-Shot-Flow, POV-Signature-Opening, Cosmo als Star.
> Cosmo spricht **markenneutral** → 1× generieren, für ALLE Partner nutzbar; Branding per Code.
>
> Doktrin: **NUR Cosmo ist KI. Alles andere (Zimmer-Beleuchtung-Ticks, UI, Charts, Kamera,
> Text) ist 100 % Code** (Remotion), sonst sieht's AI-generiert aus. Chroma-Key = Magenta.

---

## ASSETS

### Cosmo-Elements (Referenzbilder für Image2Video — „Elements"-Ansatz)
Higgsfield DoP nimmt **mehrere** `input_images` → wir geben pro Shot die Haupt-Pose-Plate
PLUS 1–2 Turnaround-Ansichten als Identitäts-Anker (verhindert Drift):
- `master.png` (frontal, Identitäts-Master) — immer als Zusatz-Referenz
- `plate-P1-frontal-magenta.png` — Ganzkörper Idle/Sprechen
- `plate-P4-closeup-magenta.png` — Close-up Sprech-Clips
- `view-34.jpg`, `view-side.png` — Turnaround-Anker
- P2/P3 (zeigt rechts/links) → per DoP-Action-Prompt direkt aus P1 lösen (Option A, spart Posen-Gen)

### Zimmer (R1 — Cosmos Trading-Room)
`video/public/room/room-v3-4k.png` (Artwork, Screens absichtlich DUNKEL → per Code bespielt).
Wird NICHT animiert — Kamerafahrt/Parallax kommt aus Remotion (3 Tiefenebenen: Desk-Kante FG,
Monitore MG, Fenster BG).

---

## SHOTLIST (Multi-Shot, 42 s)

| # | t | Shot | Cosmo (KI-Clip) | BG/Code | Kamera |
|---|-----|------|-----------------|---------|--------|
| 1 | 0.0–4.5 | **POV Cold Open** — Kamera geht an | C11: Hand justiert Objektiv (P4) | REC-Punkt, Timecode, AF-Klammern pumpen, Fokus-Wobble | Handheld-Micro-Shake, Rack-Focus |
| 2 | 4.5–9.0 | **Room Reveal** — Cosmo tritt zurück | C12: geht rückwärts in den Raum (P1) | Room v3, LED-Neon pulsiert, Fenster-Skyline parallaxt | langsamer Dolly-out + Fokus findet ihn |
| 3 | 9.0–14 | **Partner-Badge** | C2: zeigt nach unten/rechts, nickt (P2/P1) | `{{LOGO}} {{BRAND}} × Cosmos Candles Academy` sliden in {{ACCENT}} rein | Punch-In auf Badge |
| 4 | 14–24 | **Was du bekommst** — 3 Karten | C5: Erklär-Geste, ruhig (P1) | 3 Karten bauen sich sequenziell: 📡 Signale / 📚 Academy / 🤖 Tools — jede mit Micro-Demo (Signal-Ticker, Lektion-Fortschritt, Rechner-Zahl) | je Karte 1 Punch-In, seitlicher Drift |
| 5 | 24–32 | **Transparenz** ⚠️Pflicht | C13: sitzt am Desk, redet in Kamera (P1+R1) | Split: links Broker-Konto-Illu „Dein Geld bleibt deins", rechts €-Fluss-Diagramm Broker→Provision | ruhig, minimal Zoom |
| 6 | 32–38 | **CTA** | C6: Jubel / zeigt auf Button (P5) | Riesiger Puls-Button {{ACCENT}} „Kostenlos registrieren →", „20 Sekunden" | schneller Push-In auf Button |
| 7 | 38–42 | **Abbinder** | C7: Daumen hoch, zwinkert (P6) | `{{LOGO}} {{BRAND}}` + Cosmo-Logo, Risiko-Ticker unten | Slow-Zoom-Out, Vignette |

---

## VOICEOVER (Cosmo, ElevenLabs, du-Form, locker-seriös — MARKENNEUTRAL)

1. **(0–4.5)** „Ey — schön dass du da bist. Zwei Minuten, dann weißt du, worauf du dich hier freuen kannst."
2. **(4.5–9)** „Willkommen in meinem Trading-Room. Genau hier läuft alles zusammen."
3. **(9–14)** „Du bist über einen richtig guten Partner hier gelandet — und der hat dir was Starkes mitgebracht." *(Brand-Name NUR als Text-Karte, nicht gesprochen → 1 Clip für alle)*
4. **(14–24)** „Echte Live-Signale direkt aufs Handy. Ein kompletter Kurs — vom ersten Trade bis Orderflow-Profi. Dazu Tools und Live-Calls. Und je weiter du kommst, desto mehr schaltet sich frei."
5. **(24–32)** „Wichtig, ganz ehrlich: Dein Geld liegt auf deinem eigenen Broker-Konto — jederzeit auszahlbar. Wir verdienen über den Broker, nicht an dir. Deshalb kostet dich das alles hier nichts."
6. **(32–38)** „Klick auf registrieren — zwanzig Sekunden, dann bist du drin."
7. **(38–42)** „Wir sehen uns auf der anderen Seite. Los geht's."

---

## HIGGSFIELD-GENERIERUNGS-REZEPT (verifiziert)

**Endpoint:** `POST https://platform.higgsfield.ai/v1/image2video/dop`
**Auth-Header:** `Authorization: Key <KEY_ID>:<KEY_SECRET>`
**Body:**
```json
{ "params": {
    "model": "dop-turbo",
    "prompt": "<Shot-Prompt> — static locked camera, solid flat magenta background (#FF00FF) remains completely unchanged, 2D cartoon style preserved, clean dark outlines, character only moves",
    "input_images": [
      { "type": "image_url", "image_url": "<PLATE_URL>" },
      { "type": "image_url", "image_url": "<MASTER_URL>" }
    ]
} }
```
(`dop-lite` = billigster Draft, `dop-turbo` = schnell/final. Mehrere `input_images` = Elements-Anker.)
Danach: Job-ID pollen bis `completed`, Clip-URL herunterladen → in Drive „04 KI-Clips (Magenta)".

### Shot-Prompts (an jeden das Magenta-Suffix oben anhängen)
- **C11** „Extreme close-up: chest and one arm fill the frame, the character reaches toward the camera lens and adjusts it with small bumps, then lowers his hand and looks into the lens."
- **C12** „The character walks backwards with a relaxed cartoon walk cycle, from chest-close to full body centered, facing camera, gesturing casually as if talking."
- **C2** „The character points down and to his right with an open hand and nods once, friendly."
- **C5** „The character gestures calmly with both open hands as if explaining, subtle head movement."
- **C13** „The character takes two steps and sits onto a dark office chair, settles, looks into camera and talks casually."
- **C6** „The character throws both arms up in a happy cheer, big smile."
- **C7** „The character gives a thumbs up and winks."
- **Sprech-Clips (Lippen):** P4-Close-up + ElevenLabs-Audiodatei → Speech2Video (oder Hedra). 1× für die 3 Sprech-Momente.

---

## COMPOSITE (Remotion — lokale Session)
1. Jeden KI-Clip per FFmpeg `chromakey=0xFF00FF` + `despill` freistellen → WebM-Alpha.
2. Room v3 als 3-Ebenen-Parallax-BG; Code-UI (REC-Overlay, Karten, Badge, Button, Ticker) als Remotion-Layer.
3. Cosmo-Alpha-Clip pro Shot positionieren, aufs VO-Timing schneiden.
4. Rack-Focus/Punch-In/Handheld-Shake als Remotion-Kameraeffekte (nicht ffmpeg — organischer).
5. ElevenLabs-VO als Master-Audiospur, Musik geduckt.
6. Export 1080p (4K nur Final-Master) → `~/Desktop/EnterTrade Videos/partner-intro_{{BRAND}}.mp4`.

## Pro neuer Brand (nur Code, ~2 Min)
`{{BRAND}}` / `{{LOGO}}` / `{{ACCENT}}` in der Composition tauschen → neu rendern. Cosmo-Layer + VO bleiben. **0 neue Credits.**
