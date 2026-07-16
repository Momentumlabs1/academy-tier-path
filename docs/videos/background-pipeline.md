# Premium-Hintergrund-Pipeline — Cosmos Trading-Room (Recherche Juli 2026)

> Ziel: Das code-gebaute Platzhalter-Zimmer durch ein Kino-Level-Artwork ersetzen. Gesamtkosten ≈ 2–3 $.

## Modellwahl fürs Zimmer-Artwork (mit Cosmo-Bildern als Stil-Referenz)

1. **Nano Banana Pro (Gemini 3 Pro Image)** ⭐ — bis zu 14 Referenzbilder (Stil-Angleich!), befolgt „Monitore bleiben dunkel" am zuverlässigsten, **natives 4K** (Upscale entfällt). ~0,13–0,24 $/Bild.
2. **FLUX.2 [pro]** — 0,03 $/Bild für billige Kompositions-Iterationen (erst hiermit explorieren, dann Finale in Nano Banana Pro).
3. **GPT Image 2** (ChatGPT) — beste Prompt-Treue, aber max ~1536px → braucht Upscale. Praktisch: Kann der User direkt in ChatGPT machen (wie die Cosmo-Bilder).
- Upscaler falls nötig: **AuraSR v2** (gratis, ideal für Cartoon-Flächen) oder Clarity (~0,03 $/MP).

## Pipeline

1. **Drafts:** FLUX.2 pro, ~20 Iterationen ≈ 0,60 $ → Komposition festlegen
2. **Hero-Bild:** Nano Banana Pro 4K mit 2–4 Cosmo-Referenzen ≈ 1,20 $ für 5 Kandidaten
3. **Tiefen-Ebenen schneiden (gratis, lokal/headless):**
   - Depth-Map: **Depth Anything 3** (`DA3MONO-LARGE`, Apache 2.0)
   - Objekte ausschneiden: **Grounded-SAM-2** (Text-Prompts: „desk with monitors", „office chair", „plant")
   - Löcher hinter den Ebenen füllen: **IOPaint/LaMa** (`iopaint run --model=lama`), Masken vorher ~15 px dilatieren
   - Ergebnis: `bg.png` (Wand/Fenster, inpainted) + `mid.png` (Desk+Monitore) + `fg.png` (Stuhl/Pflanze)
   - Schnell-Alternative ohne Schneiden: **DepthFlow** (`pip install depthflow`) rendert direkt ein 2.5D-Parallax-Video; oder Depth-Displacement-Shader via `@remotion/three`
4. **Parallax in Remotion:** bg 1×, mid 1,4×, fg 2× + langsamer Scale 1,00→1,06 (Dolly-Gefühl); Ebenen auf 110 % skalieren gegen Randlücken

## Echte Webseite auf den Monitoren (verkauft den Premium-Look)

Zimmer MIT dunklen, leicht spiegelnden, LEEREN Screens generieren, dann **live in Remotion** compositen (nicht vorbacken — dann können die Screens scrollen/animieren):

1. **Corner-Pin:** 4 Screen-Ecken einmalig im Artwork markieren → `perspective-transform` (npm) rechnet die CSS-`matrix3d`, die den flachen Screenshot exakt auf das schräge Monitor-Viereck mappt. GPU-beschleunigt, Text bleibt knackscharf, Inhalt kann scrollen.
2. **Einbettungs-Stack** (macht den Screenshot „Teil der Illustration"):
   - Color-Grade: `saturate(0.85) contrast(0.95)` + Ambient-Tint-Overlay `rgba(20,30,60,0.15)`
   - Innen-Vignette: `box-shadow: inset 0 0 40px rgba(0,0,0,0.55)` + Bezel-Rundung
   - Glas-Reflex: diagonaler `linear-gradient(105deg, rgba(255,255,255,0.09), transparent 40%)`
   - Scanlines dezent (optional)
   - **Light-Spill (der wichtigste Trick):** Screenshot duplizieren, `blur(40px) brightness(1.4)`, `mix-blend-mode: screen`, 1,6× skaliert hinter den Monitor + auf den Desk → das Screen-Leuchten in der Nachtszene macht die Integration glaubhaft. Intensität leicht flackern lassen (±3 %).

## Paste-ready Zimmer-Prompt (mit 2–4 Cosmo-Bildern anhängen)

> "Wide establishing shot of a stylized cartoon trader's home office at night, illustrated in exactly the same art style, line weight, color rendering and shading technique as the attached character reference — flat cel shading with subtle painterly gradients, bold clean outlines, slightly exaggerated proportions. Composition with clear depth separation: FOREGROUND — corner of a leather chair and a potted plant, softly out of focus; MIDGROUND — a large curved desk with a three-monitor setup, mechanical keyboard, coffee mug, scattered sticky notes; BACKGROUND — floor-to-ceiling window with a night city skyline, bokeh city lights, bookshelf wall. All monitor screens are completely dark and switched off — matte black blank screens with only a faint window reflection, no charts, no text, no UI on any screen. Moody cinematic night lighting: cool blue ambient moonlight from the window, warm orange desk lamp key light, magenta and cyan LED strip accents under the desk and behind the monitors, soft volumetric glow. No people, no characters, no text anywhere. 16:9, high detail, clean composition with empty wall space upper third."

Tricks: „completely dark and switched off … no charts, no text, no UI" doppelt nennen (Modelle LIEBEN es, Monitore zu befüllen); FG/MG/BG explizit benennen (macht den SAM-2-Schnitt trivial); „no people, no text" verhindert Charakter-Bleed aus den Stil-Referenzen.

## Website-Screenshots (Quelle für die Monitor-Inhalte)

- Echte App aus dem Repo starten (`bun run dev`) → Playwright/Chromium Screenshots 1920×1080 @2x → `video/public/screens/`
- Bekanntes Problem in dieser Umgebung: Proxy wirft beim `bun install` Verbindungen ab → Retry-Loop mit `--network-concurrency 4`
- Kandidaten-Routen: `/` (Landing/Login), `/t/<slug>` (Tenant-Landing), Dashboard-Routen brauchen Auth
