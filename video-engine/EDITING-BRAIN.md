# EDITING-BRAIN — EnterTrade Academy Motion-Graphics

> **Read this at the start of EVERY session, before HANDOFF.md.** This is the living
> source of truth for the user's editing style and requirements. The moment the user gives
> feedback or a new requirement, append it to the **Feedback Log** (§6) as *concrete example
> + generalized rule*, apply it, and commit. Nothing gets lost; the skill compounds.

Companion docs: `HANDOFF.md` (project state + proven pipeline), `README.md` (engine doctrine).
Branch: `claude/determined-mccarthy-iYY9Y`.

---

## 1. Style Bible — the visual language

**North star = Lesson 1 (`lesson1.html`).** It is the reference for *density*: never dead
space, every second something moves, real animated charts instead of static cards.

- **Feel:** dark trading-terminal / broker-desk aesthetic. Precise, engineered, "real
  software", never slideshow.
- **Density rule:** nothing static for more than ~3s. Every scene is 8–20s and fully
  animated. No "title-only" scenes. If a moment would sit flat, it gets a real animated
  element (chart ticking, bars counting, list building, columns filling in).
- **Motion is meaningful, always tied to content.** Reveals *land on the word onset* of the
  narration (voice = "Harry", English). Measure onsets with faster-whisper word timings.
- **Everything except COSMO's face is code-rendered** (canvas + GSAP). Charts, screens,
  terminals, icons — all drawn in code. Only COSMO's face is AI (Hedra), and that budget is
  spent (static image only now).
- **Transitions:** every scene uses `sA(t0,t1)` scene-alpha fade in/out — there must be NO
  black or empty frames between scenes.
- **Pixel-snap** all coordinates (`P=Math.round`) to kill sub-pixel jitter.

### Palette (canonical)
`BG #070a10 · INK #eaf2f8 · MUT #8b98a8 · LIME #b6f04a · CYAN #39d0d0 · MAG #e06bd8 · RED #ff5470 · GRN #33e08a · GOLD #ffcf5c`

### Typography
- Currently system-ui / mono kicker (`kick()`). **Flagged as too generic** — planned upgrade
  to a character display font (Fontshare **Clash Display**, free commercial) via data-URI
  `@font-face`. See §5 Tool Stack.
- Kinetic titles: word-stagger + underline sweep + glow (`title()` / `scTitle`).

### Render spec
1920×1080, 30 fps, JPG frames `quality:90`, encode `libx264 -crf 22`. Timeline is
deterministic: GSAP paused, driven by `tl.time(sec)`; each HTML exposes `window.renderAt(ms)`
+ `window.__ready`.

---

## 2. Hard DO / DON'T (never violate)

**DO**
- Densify to L1 depth everywhere. Real animated elements over cards+text.
- Only recreate charts **Tim actually showed** in the original footage.
- Keep every motion meaningful and content-driven.
- Land reveals on word onsets; timing follows the voice.
- Fade every scene in/out (`sA`) — no empty frames.

**DON'T**
- ❌ Nothing may look AI-generated / generic / "same presentation" (card + text).
- ❌ No fake charts. (L3 original = whiteboard, no chart. L4 = all cards, NO chart. **Only L5
  had a live chart** — the Deepchart terminal.) Never invent a chart that wasn't in the original.
- ❌ No random background decoration — no ambient orbs, no stray "bubbles". Reads as filler.
- ❌ Don't touch **Signals** — it's finished (original has phone/order-ticket + COSMO).
- ❌ No new Hedra/COSMO talking-head renders — budget is gone. Static image only.

### COSMO rule
Static COSMO image as a **breathing/glowing corner cam-bubble, bottom-left**, with animated
"··· COSMO" speaking dots. Source: `cosmo-bubble.html` → `cosmo_key.png` (magenta-keyed from
`hedra/cosmo_close_alpha.png`). Composited as a looped overlay:
`ffmpeg -stream_loop -1 -i bubble_loop.mov -i lesson.mp4 ... overlay=40:H-h-30`.
L1 keeps its seated intro. Signals keeps its original.

---

## 3. Component Catalog (reusable scene types → file/function)

Copy the component-library **header verbatim** from `lesson3.html`/`lesson5.html` (helpers:
`clamp,es,eo,bo,hexA,rr,rnd,sA,rv,ry,pbox,kick,chkIcon,bg,vignette,cap,wrap*`). `kick()`
saves/restores canvas state (bug fixed: leaking `textAlign` was right-shifting centered text).
Then write only scene functions + `renderAt`.

| Scene type | Function(s) | File |
|---|---|---|
| **Live candlestick chart** (draws candle-by-candle, BUY/SELL markers, ENTRY line, green/red P&L shading, live OPEN P&L counter) | `chart()`, `candle()`, `drawCandles()`, `marker()`, `profit()`, `miniChart()`, `twoMini()` | `lesson1.html` |
| **Deepchart broker terminal** (2 panels, volume profile, cyan=buy/mag=sell orderflow bubbles sized by delta, footprint, animated cursor, live-ticking right edge) | `drawLeft()`, `drawRight()`, `bub()`, `tabbar()`, `taskbar()`, `chrome()` | `deepchart.html` (render `render/dcseg.mjs`) |
| **Stat / split gauge** (animated % bars with counting, e.g. 5% win vs 95% lose) | `split()` | `lesson1.html` |
| **Numbered list + changing side illustration** | `scPoints()`, `everyDay()`, `scNumbers()`, `scFour()` | `lesson1/3/5` |
| **Comparison columns** (green checks vs red crosses) | `scVsIntro()`, `scVsCols()`, `chkIcon()` | `lesson1.html` |
| **Loop / cycle diagram** | `scLoop()` | lessons |
| **Formula row** | `scFormula()` | lessons |
| **Reason / freedom cards** | `scReasons()`, `scFreedom()`, `scResp()`, `scScalePerf()`, `defcard()` | `lesson1.html` |
| **Kinetic title** (word-stagger + underline sweep + glow) | `title()`, `scTitle()`, `scHook()` | lessons |
| **Choices** (timeframe short/long + direction up/down — NOT short-selling) | `choices()`, `dir()`, `tf()` | `lesson1.html` |
| **Bottom-line / outro** (statement + chips + next-lesson card) | `scBottom()`, `scOutro()`, `chips()` | lessons |
| **Code-drawn vector instrument icons** (candlestick/bars/gold bar/coin) | `instrIcon()` | `lesson1.html` |
| **COSMO corner bubble** | `cosmo-bubble.html` → `render/rendbubble.mjs` (`bubblecam.html`, `setFrame(n)`, 90-frame PNG loop) | root |
| **Background** (drifting grid — no ambient orbs, no news ticker) | `bg()`, `vignette()`, `cap()` | all |
| Text helpers | `wrapText()`, `wrapC()`, `wrapL()` | all |

Other per-lesson scenes seen: `scDestroyers, scEmotions, scHistory, scInventory, scKillers,
scLive, scMechanism, scPunch, scQuestions, scStates, scTool(s), scTrans, scWhy`.

---

## 4. Per-Video Status & Notes

| Video | State | Renderer / assets |
|---|---|---|
| L1 What Is Trading | ✅ delivered 4:00, GSAP + seated COSMO intro | `lesson1.html` (needs `lib/gsap.min.js`) |
| L3 Why Traders Lose | ✅ delivered 8:39 + COSMO bubble | `lesson3.html` + `audio/l3_audio.m4a` (whiteboard, NO chart) |
| L4 Retail Money | ✅ delivered 7:07 + COSMO bubble | `lesson4.html` + `audio/l4_audio.m4a` (all cards, NO chart) |
| L5 Level 2 Data | ✅ delivered v3 5:21 + LIVE deepchart + COSMO | `lesson5.html` + `deepchart.html` + `audio/l5_audio.m4a` |
| Signals | ✅ ORIGINAL kept 2:57 — **do NOT rebuild** | original mp4 only |
| Video 1 (course intro) | ⏳ awaiting user's script | — |
| Video 6 | ⏳ IN PROGRESS — sources found & analyzed (see below) | build in-style |

### Video 6 — source analysis (2026-07-19)
- **Source files** (`~/Downloads`, Drive names): `0718.mp4`, `0718(1).mp4`, `0718(2).mp4`,
  `0718(3).mp4`. Audio-md5 proves `0718 / (1) / (2)` are the **same clip** (browser
  re-download duplicates). **2 unique clips:**
  - **Clip A** = `0718.mp4` — 50.5s, 1282×720, 30fps.
  - **Clip B** = `0718(3).mp4` — 60.9s, 1282×720, 30fps.
  - Total unique footage ≈ **1:51**.
- **Visual:** BOTH clips sit on the **static TradingView "Marktübersicht"** page
  (DAX 25.067,09, big indices, watchlist, AAPL 315,32). Scene-change detection @0.06 finds
  **zero** cuts — the screen basically never moves (occasional left dropdown menu). Confirms
  HANDOFF's "hangs on TradingView at the start" — here it hangs the *whole* time.
  → **Consequence:** NO active live chart to recreate. Per the no-fake-chart rule, Video 6 is
  **narration-driven motion graphics**, NOT an invented candlestick chart. The TradingView
  market-overview can be *referenced/recreated as context* (it's what he actually showed),
  but the scene design follows what he SAYS.
- **Audio:** narration starts ~27s into Clip A (long silent TradingView hang first). `base.en`
  mis-transcribed domain terms ("SpySecret"→"spied-art"). Re-transcribing with **large-v3 +
  auto-lang** for a clean script → `.render/v6/v6_c0_hq.json`, `v6_c3_hq.json`.
- **OPEN:** is this the *complete* Video 6 (only ~1:51, 2 clips) or are more chunks still
  coming? HANDOFF listed Video 6 as "user uploading". Confirm with user once script is read.

**L5 live-chart splice reference:** deepchart runs 263.7s→321.34s; onset "let me show you
what it looks like live" @263.70 (`l5_words.json`). Board frames 0→263.7 + deepchart frames
+ bubble overlay + `l5_audio.m4a`.

**Known flat spots to densify:** L5 ~1:42 "CHART READERS vs MARKET READERS" nearly empty.

---

## 5. Tool Stack (anti-generic upgrade)

Goal: unique visual identity, away from system-font/generic look. Document installs here.

- **Render env (local, macOS):** `playwright-core` + `@ffmpeg-installer/ffmpeg`, Chromium via
  `npx playwright install chromium`. Render scripts read `DIR` / `CHROME` / `PAGE` env vars
  (rewritten from the old hardcoded Linux paths). See §7.
- **Clash Display** (Fontshare, free commercial) — ✅ downloaded to `fonts/` (woff2/otf/ttf +
  variable). Embed via data-URI `@font-face` in each lesson HTML to replace system-ui.
  *(installed; integration into HTML pending)*
- **PixiJS 7.4.2** — ✅ `lib/pixi.min.js` (508K, UMD global). GPU glow/particles/filters for
  real depth. *(installed; integration pending)*
- **D3 v7** — ✅ `lib/d3.min.js` (332K). For chart/graph geometry where useful.
- **GSAP** — `lib/gsap.min.js` (already in repo; L1 opening timeline).
- **faster-whisper** (`render/transcribe.py`, `base.en`, int8 CPU) — word-level transcription
  for onset sync. Produces `{segs, words}` JSON.
- **Onset detection:** `ffmpeg -af silencedetect=n=-30dB:d=0.16` → each `silence_end` = phrase
  onset; concat boundaries = longest silences (d=0.9).

---

## 6. Decision & Feedback Log
*(every user instruction: date + concrete example → generalized rule)*

- **2026-07-19** — User formalized the editor role and mandated this EDITING-BRAIN as the
  highest-priority living doc.
  → **Rule:** maintain the Brain every session; log each new requirement immediately as
  example+rule and commit; read Brain first each session.
- **2026-07-19** — User: rebuilds feel like "the same presentation" (card + text).
  → **Rule:** density is the #1 quality bar. Default to real animated elements; treat any
  card-and-title scene as a failure state to be upgraded to L1 depth.
- **2026-07-19** — User wants an anti-generic tool upgrade to "pull out the maximum".
  → **Rule:** actively research + install best-in-class local tooling (Clash Display font,
  PixiJS GPU filters, D3, large-v3 transcription) and document the stack in §5. Prefer higher-
  quality tools over defaults; e.g. transcribe with `large-v3`, not `base.en`.
- **2026-07-19** — User got nervous during a silent long-running install ("bewegt sich nix").
  → **Rule:** run long ops (installs, model downloads, renders) in the **background with a
  visible log**, keep the session responsive, and post concrete progress. Never leave the
  user staring at a silent, blocking command.
- **2026-07-19** — User: analyze Video 6 both **image AND audio, frame-accurately**, and
  rebuild 1:1 in our style (real animated charts where Tim shows charts).
  → **Rule:** for every rebuild, transcribe audio word-level AND scrub the original frames to
  catalog exactly what's on screen (and for how long, e.g. "hangs on TradingView at the
  start") before designing scenes. Match reality; invent nothing.

---

## 7. Render Env — local (macOS) setup

Old scripts hardcoded Linux paths (`/tmp/claude-0/...`, `/opt/pw-browsers/chromium-1194/...`).
Rewritten to read env vars with sane defaults so they run on this machine:
- `DIR` — working dir holding the `*.html` + frame output folders.
- `CHROME` — Chromium executable (from `npx playwright install chromium`).
- `PAGE` — which HTML to load.

Install: `cd video-engine && npm i playwright-core @ffmpeg-installer/ffmpeg && npx playwright install chromium`.
ffmpeg/ffprobe come from `@ffmpeg-installer` (no system ffmpeg on this Mac).

---

## 8. Open Points
- [ ] Confirm exact Video 6 source filenames in `~/Downloads` (Drive names).
- [ ] Integrate Clash Display + PixiJS into the lesson HTML pipeline.
- [ ] Densify L5 ~1:42 and any other user-flagged flat spots.
- [ ] Build Video 1 once script arrives.
- [ ] Decide COSMO placement per lesson (corner bubble vs intercut).
