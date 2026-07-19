# Die Crispy-Pipeline — Cosmo in Maximal-Qualität (Synthese aus 5 Tiefen-Recherchen, Juli 2026)

> Ziel: Rick-and-Morty-Look 1:1 erhalten, Kino-Qualität, jeder Schritt headless automatisierbar.
> Ersetzt/ergänzt `prompt-playbook.md` in den Punkten Modellwahl & Finishing.

## 🔑 Kern-Erkenntnis: Der Pseudo-3D-Trick ist MODELLABHÄNGIG

- **Realismus-Modelle (Kling, Veo):** driften flache Charaktere Richtung 3D/Fotorealismus; dort hilft weiche Schattierung im Input („semi-realistic aligns with their training").
- **Animations-Modelle (Vidu, Wan-Anime, AniSora, Seedance):** flacher Cel-Input animiert BESSER — Vidus offizielle Doku sagt wörtlich: „flat, cel-style coloring helps prevent distortion"; Schattierung schadet dort.
- **→ Entscheidung: Cosmo bleibt FLACH wie der Master.** Wir brauchen keine 3D-Version — wir wählen die Modelle, die Flachheit nativ können. (Falls je Kling nötig: dann die soft-shaded Variante testen.)

## Stufe 1 — Identitäts-Lock (unser Turnaround ist Gold)

- **Referenzen als separate Bilder füttern, NIE als Sheet-Collage.** Frontal IMMER zuerst.
- 3–4 Winkel: Front → Seite/3⁄4 → Rücken (haben wir alle in `video/public/cosmo/`).
- Einziger dokumentierter Beweis der Branche: Vidus eigener Fall — nur-Frontal-Referenz → Haarfarben-Drift; Front+Seite → stabil.
- Negative Guardrails in jeden Prompt: `No hairstyle change, no outfit change, no realistic human skin texture, no face morphing`.
- Multi-Shot-Trick: letztes sauberes Frame von Clip A = Referenz/Startbild von Clip B.

## Stufe 2 — Generierung (Gesten/Körper-Clips)

| Priorität | Modell | Warum | Kosten/Clip |
|---|---|---|---|
| **1** | **Vidu Q3 / Q2 Reference-to-Video** (fal.ai) | Anime/Cel-first trainiert, „preserves flat shading, clean line art"; einziger Anbieter mit explizitem Rick-&-Morty-Template („Oddverse"); 1–7 Referenzbilder; `movement_amplitude: small`; Start+End-Frame für Loops | ~0,30–0,70 $ |
| **2** | **Seedance 2.0** | Einziges Großmodell mit unabhängig bestätigter verzerrungsfreier Flach-2D-Behandlung; bis 9 Referenzen; ELO-Spitze | ~2,40–3 $ (teuer → Hero-Shots) |
| **3** | **Hailuo 2.3** | Budget-Favorit der 2D-Community, „Excellent" für Stylized; `[Static shot]`-Prefix | ~0,40 $ |
| Lokal/Gratis-Option | **AniSora V3.2** (Apache 2.0, Wan2.2-Basis, ab 12 GB VRAM) — hat 100 US-Cartoon-Clips im eigenen Benchmark | GPU nötig |
| ⚠️ Vorsicht | **Kling 3.0** — von Promos gehypt, von 2 unabhängigen Tests als „Fair"/photoreal-driftend für Flach-2D bewertet. Nur mit soft-shaded Plate + strengen Negatives einsetzen. | |

Prompt-Regeln bleiben wie im `prompt-playbook.md` (nur Bewegung beschreiben, Kamera-Lock doppelt, Optimizer aus, Greenscreen explizit benennen).

## Stufe 3 — Sprechen (Deutsch)

- **Hedra „Avatar"-Modell** (NICHT Omnia): bis 10 Min am Stück, 7 Credits/s ≈ **2,35 $/Minute**, API in jedem Bezahl-Plan enthalten (ab 15 $/Mo). Audio-getrieben → Deutsch problemlos (ElevenLabs-MP3 hochladen).
- Framing: **frontales Brustbild** (Plate P4!), Seitenprofile funktionieren nicht.
- Bewegung per Prompt zügeln (dokumentierte Schwäche = übertriebene Gesten): `static camera, minimal head movement, flat 2D cartoon style, only mouth and eyes move`.
- API: `api.hedra.com/web-app/public`, Header `X-API-Key`; Flow: Asset-Upload (Bild+Audio) → Generation (Modell-ID Avatar `26f0fc66-152b-40ab-abed-76c43df99bc8`) → Status pollen.
- A/B-Herausforderer: **ByteDance OmniHuman 1.5** (fal.ai, ~0,15 $/s, „cartoon-inspired characters" offiziell supported).
- Offene Frage (testen!): Wie gut hält Hedra den ultraflachen Strich-Mund. Kein Test existiert dafür.

## Stufe 4 — Stil-Rettung (nur wenn ein Clip Richtung 3D driftet)

- **ReEzSynth** (aktives Open-Source-EbSynth-Remake, CLI+Python, <8 GB VRAM): 1 Keyframe pro 1–2 s gegen den Master re-stylen → über den Clip propagieren. Patch-basiert = **exakte** Farben/Linien UND Greenscreen bleibt sauber keybar.
- Neue Alternative: **TeleStyle V2** (Tele-AI, Jun 2026, Apache): stylisiertes erstes Frame → ganzes Video. Head-to-head prototypen.
- Schwere Fälle: Wan 2.2 VACE-Fun (Referenzbild + Control-Video), aber kämpft mit Greenscreen → erst keyen, dann restylen.

## Stufe 5 — Das Crispy-Finishing (macht aus „KI-Video" → „echter Cartoon")

Reihenfolge ist entscheidend:
1. **Duplikat-Frames strippen:** `ffmpeg -vf mpdecimate,setpts=N/FRAME_RATE/TB`
2. **Deflicker** (gegen Linien-Zittern/Farb-Pumpen): ComfyUI SuperBeasts-Node oder `deflicker=mode=pm:size=10` (FFmpeg, nur Luma)
3. **Upscale mit Animations-Modell, Schärfung = NULL:** lokal `realesr-animevideov3` (Video2X) oder APISR für maximale Linien-Crispness; hosted: fal Topaz 0,01–0,02 $/s
4. **⭐ Cel-Timing ZULETZT — „Charakter auf Zweien":** Cosmo-Layer auf 12 fps posterisieren, im 24/30-fps-Container ausspielen (`fps=12` → `-r 24` bzw. in Remotion: Frame-Quantisierung nur auf dem Charakter-Layer). **Hintergrund + Kamera bleiben flüssig** — exakt wie echte Studios arbeiten (Multiplane). Das ist DER Authentizitäts-Trick; KI-Motion wirkt sonst „wie Marionetten auf geölten Schienen".
5. Encode: `libx264 -tune animation -crf 16-18`
- **NIE Frame-Interpolation/Smoothing** auf den Charakter (zerstört den Cartoon-Look).

## Stufe 6 — Composite (wie gehabt, Remotion)

Green-Key (FFmpeg chromakey+despill) → Alpha-WebM/ProRes → `<OffthreadVideo transparent>` über Code-Hintergrund → Kamera-Effekte, echte Website-Screens, Ton.
In Remotion umsetzbar: Charakter-Layer bekommt `Math.floor(frame/2)*2`-Sampling (auf Zweien), Rest läuft voll.

## Kosten pro fertigem 5-s-Clip (alles inklusive)

Generierung 0,30–0,70 $ + Finishing ~0,01–0,10 $ + ggf. Sprech-Anteil 0,04 $/s → **unter 1 $ pro Clip**, Hero-Shots via Seedance ~3 $.

## Test-Reihenfolge (sobald Keys da)

1. Hedra: Plate P4 + 10-s-ElevenLabs-Audio → hält der Strich-Mund? (~0,50 $)
2. Vidu Q3: Idle-Loop von P1 mit Front+Seite-Referenz, Start=End (~0,40 $)
3. Gleicher Test Hailuo 2.3 als Budget-Vergleich (~0,40 $)
4. Sieger bekommt die Szene-1-Clips (C11–C13); Finishing-Pass drüber; Composite → Review im Chat
