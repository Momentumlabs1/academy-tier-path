# Tim-Reel — „Opening Range + Volume Profile" (Deutsch, 9:16)

> Deutsche Nachproduktion des englischen Referenz-Reels (Value-Area-Strategie), Stimme & Gesicht: Tim.
> Erstellt 16.07.2026. Branch: `claude/tim-video-creation-6l3wvm`.

## Ergebnis

- `video/out/tim-volume-profile-reel-ORGANIC.mp4` — 108 s, Ending „kostenloser Kurs → unter dem Video kommentieren" (organisch).
- `video/out/tim-volume-profile-reel-AD.mp4` — 113 s, Ending „klick auf den Button unter dieser Ad" (Ad-Version).
  Tim hatte beide CTA-Takes in einer Aufnahme; die Ad-Variante schneidet bei 100,35 s auf den zweiten Take (109,95 s) um.

## Look (wie Referenz)

1080×1920, 30 fps, schwarzer Canvas. Runde Sprecher-Bubble oben (Ausschnitt aus Tims Aufnahme, Kopf + Mikro), fette weiße Inter-Captions darunter (wortgetaktet via Whisper), darunter der code-animierte Minimal-Chart: M15-Kerze → High/Low/Opening Range → Volumenprofil → 70 %-Value-Area-Box → VAH/VAL → Szenario 1 (Fakeout-Short mit ENTRY-Tag, rotem Trailing-STOP-Band, grüner Target-Zone bis VAL) → Szenario 2 (Akzeptanz-Long mit Pullback-Entry, Zonen, STOP trailt unter jedem Kerzen-Low, Stop-Out). Punch-Ins auf die M5-Action, Micro-Reframe am Start, Slow-Drift-Zoom.

## Pipeline (reproduzierbar für weitere Tim-Videos)

1. Rohvideo aus Drive laden (Public-Link-Download), `ffprobe` prüfen.
2. Audio extrahieren → `faster-whisper` (small, de) mit Word-Timestamps → Captions + Beat-Timing.
3. Bubble-Crop per FFmpeg (`crop=480:480:230:200`, hier passend zu Tims Sitzposition), Audio-Loudness `loudnorm I=-14`.
4. Remotion-Projekt `video/`: Kompositionen `TimReelOrganic` / `TimReelAd` (`src/tim/`).
   - Alle Beat-Zeiten liegen in **Quell-Sekunden** in `src/tim/chart/data.ts` + `src/tim/captions.ts`; `TRIM` (0,4 s) wird zentral abgezogen.
   - Browser: `/opt/pw-browsers/chromium_headless_shell-1194/.../headless_shell` (normaler Chromium hat kein Old-Headless mehr).
5. Render: `cd video && npx remotion render src/index.ts TimReelOrganic out/….mp4`.

## Assets

`video/public/assets/`: `tim-bubble.mp4` (640×640-Crop), `tim-audio-norm.m4a` (Loudness-normalisiert), `fonts/InterVariable.woff2`.
Quelle: Drive `CosmoTrades/Video 1.mov` (Tim) + `9befb6c8….MP4` (englische Referenz).
