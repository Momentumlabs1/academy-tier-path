# EnterTrade Academy — Video Engine (GSAP Motion-Graphics)

Reusable pipeline for the fully-animated course videos. Lesson 1 is the reference
implementation (`lesson1.html`). Roll this style out to every lesson.

## Doctrine
- Nothing may look AI-generated. Only COSMO's face is AI (Hedra); every chart/screen/
  board is **code-rendered** here. Voice = Hedra "HARRY". Content = English.
- Scene-based motion graphics, each scene 8–20s, fully animated, **nothing static > ~3s**.
- Timeline follows the voice, animations land on **word onsets** (see below).

## Pipeline
1. Author scenes in one HTML file (canvas + GSAP). Expose `window.renderAt(ms)` +
   `window.__ready`. Deterministic: GSAP timeline is `paused`, driven by `tl.time(sec)`.
2. Render frames: `node render.mjs <startFrame> <endFrame>` → `scn/fNNNNN.jpg` (30 fps, 1080p).
   Run 4–5 chunks in parallel (each launches its own headless Chromium).
3. Encode: `ffmpeg -framerate 30 -i scn/f%05d.jpg -i <board_audio> -t <dur> ... out.mp4`.
4. Concat intro (seated COSMO talking-head) + board via concat demuxer.
5. QA: `node qa.mjs <t1> <t2> …` renders single timestamps to `qa_<t>.png` for visual review.

Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. ffmpeg via
`@ffmpeg-installer`. Pixel-snap all coords (`P=Math.round`) to kill sub-pixel jitter.

## Word-onset sync (critical)
Measure phrase starts in the board narration:
`ffmpeg -i board_audio -af "silencedetect=n=-30dB:d=0.16" -f null -` → each `silence_end`
is a phrase onset. Map onsets to the known script text, land each reveal on its word.
Clip boundaries in a concatenated board audio show up as the longest silences (d=0.9).

## Component library (in lesson1.html — reuse for every lesson)
- `bg()` drifting grid + ambient orbs (no news ticker — removed by request)
- `chart()` live candlestick chart that draws candle-by-candle, BUY/SELL markers,
  ENTRY line, green/red P&L shading vs entry, live OPEN P&L counter (+/−)
- `instrIcon()` code-drawn vector icons (candlestick / bars / gold bar / coin)
- `title()` kinetic title (word-stagger + underline sweep + glow)
- `choices()` timeframe (short/long-term) + direction (up/down) — NOT short-selling
- `split()` animated % bars with counting (e.g. 5% win before 95% lose)
- `scPoints/twoMini/everyDay` numbered list + changing side illustration
- `scReasons/scFreedom/scScalePerf/scResp` reason cards, freedom⇄responsibility
- `scVsIntro/scVsCols` two-column comparison (green checks vs red crosses)
- `scBottom` bottom-line statement + chips + next-lesson card
- helpers: `pbox` panel, `kick` mono kicker, `chkIcon` check/cross, `sA` scene alpha
  (fade in/out), `rvv`/`rvy` eased reveal, GSAP for the opening.

## Palette
BG #070a10 · INK #eaf2f8 · MUT #8b98a8 · LIME #b6f04a · CYAN #39d0d0 · MAG #e06bd8 ·
RED #ff5470 · GRN #33e08a · GOLD #ffcf5c.

## Scripts (source narration)
`scripts_v5` = Lesson 1 (What is Trading, DONE) · `scripts_v3` = Lesson 3 (Why traders lose) ·
`scripts_v4` = Lesson 4 (Retail money) · `scripts_sig` = Signals. Board narration audio is
extracted from each delivered final mp4.

## Rollout status
- [x] Lesson 1 — full GSAP rebuild (`lesson1.html`), delivered 4:00
- [ ] Lesson 3 · Lesson 4 · Lesson 5 · Signals — apply same engine/components
- [ ] COSMO integration into the animated board (corner bubble vs intercut) — decide per lesson
