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
| Video 6 | ✅ **COMPLETE v1 delivered 2026-07-22** — 8:01, full MIRROR (S1–S6 + COSMO), `~/Downloads/video6.mp4` + `~/Desktop/EnterTrade Videos/`. Awaiting user review vs. original | `v6seg1..5.html` + `tvchrome.js` (`lesson6.html` = old pre-mirror intro, superseded) |

### Video 6 — INTRO segment (delivered v1, 2026-07-19)
- `lesson6.html` — engine header copied verbatim from `lesson5.html`, **`bg()` orbs stripped**
  (no ambient decoration). 3 scenes timed to the EN Harry VO onsets:
  1. **scOpen (0–8.7s)** kinetic title "PUTTING IT ALL TOGETHER" + recap pillars: Level 2 DOM
     ladder (`domLadder`) + Volume Profile (`volProfile`, POC highlighted).
  2. **scCombineReal (8.6–15.95s)** two source panels slide in → fuse into a combined
     "LEVEL 2 + VOLUME PROFILE — one live view" (`miniCombo`: candles + VP edge + depth ladder)
     + pulsing LIVE badge.
  3. **scTwoWays (15.9–28s)** "Two ways": WAY 1 TradingView card (99% count-up + red "Level 2
     limited" callout), WAY 2 locked order-flow terminal teaser.
- **EN VO script** (Harry, `render/tts_ts.py` → `.render/v6/vo/intro.mp3`, 27.96s, onsets in
  `intro.words.json`): *"Let's put it all together. So far, we've broken down Level 2 data, and
  the volume profile, piece by piece. Now let's see how they work in combination. Live, in the
  market. How it actually looks when you trade it. There are two ways to do this. The first is
  TradingView, the platform ninety-nine percent of traders use to analyze. But on TradingView,
  our access to real Level 2 data is limited."*
- Rendered: `render/rendv6.mjs` (4 parallel chunks, 840 frames) → encoded
  `.render/v6/Video6_INTRO_v1.mp4` (also `~/Downloads/`).
- **Remaining finishing on intro:** (a) composite COSMO corner bubble; (b) swap system-ui →
  Clash Display `@font-face` for the anti-generic look. Then continue segments 2..N.

### Video 6 — source analysis (2026-07-19)
> **⚠️ CORRECTION (user, 2026-07-19):** the `0718*.mp4` clips are NOT Video 6 — just stray
> fragments. **The REAL Video 6 = two ~44-min files in `~/Downloads`:**
> - **`Video 6 Bildschirm.mp4`** — 44:15, 1916×1076, 30fps, 270MB → **the screen/chart (visuals)**.
> - **`Video 6 Gesicht & Stimme.mov`** — 45:23, 1280×720 HEVC10, 30fps, 1.4GB → **face + voice (audio/narration)**.
> Screen file → visuals; face file → audio. Analyze the FULL 44-min video. The two tracks are
> ~68s different in length → find sync offset before mapping onsets to screen content.
> **Rules confirmed by user:** rebuild language = **English (Harry)** (translate Tim's German
> script); Deepchart-for-live-part = **decide later**.

- **(superseded) 0718 fragments:** `0718.mp4`+dupes(1)(2) & `0718(3).mp4` — two German takes of
  a short intro ("Level 2 + Volumenprofil live"). NOT the deliverable. Ignore.

#### Video 6 — full content map (44:15, from screen storyboard @60s + cuts + transcript)
Topic: **"Level 2 + Volume Profile — how it looks LIVE"** — direct continuation of L5. German VO
→ rebuild EN (Harry). Hard cuts @ ~4:37–4:45, ~20:14–21:09, ~25:15–25:41, ~42:44; the rest is
continuous chart interaction (pan/scroll, below cut threshold).
- **00:00–~02:00** TradingView **Marktübersicht** (DAX 25.067,09, indices, AAPL 315,32) — the
  long intro hang. VO: recap Level 2 + Volume Profile, "two options: TradingView (99% use it, but
  limited Level 2 data) vs [orderflow platform]".
- **~03:00–04:40** TradingView **symbol pages** (Gold Spot/USD 4.120,670) + first candlestick charts.
- **~05:00–~19:00** TradingView **charts**: candlesticks, **Volume Profile** (colored histograms),
  **footprint/delta** grids ("Delta Gesamt 1.184/645/297"), drawn **supply/demand zones** (green/red
  boxes), highlighted ranges. Line + candle views.
- **~20:00–~42:40** the **orderflow terminal** (Deepchart-style): candlesticks with **green/magenta
  orderflow bubbles sized by delta**, **footprint number grids** (purple/green columns, orange
  headers), **delta heatmap** strip, volume profile, supply/demand zones. This is the bulk.
- **~42:44–44:15** back to **TradingView line charts** with zones (wrap-up).
→ **Live-part decision (deferred):** the footage itself IS an orderflow terminal for ~22 min →
  reusing/extending `deepchart.html` is the faithful, no-fake-chart choice. Recommend when asked.
- **Scope reality:** 44 min ≈ 5× the longest existing lesson (L3 8:39). Build **incrementally**
  in segments with a review loop (intro first → approve → continue), per user's working style.
- Assets: `.render/v6/screen_sheet{1,2,3}.jpg` (storyboard), `.render/v6/sb/f*.jpg` (60s frames),
  `.render/v6/screen_cuts.txt` (cuts), `.render/v6/v6_face_words.json` (large-v3 DE transcript).
- **Visual:** BOTH clips sit on the **static TradingView "Marktübersicht"** page
  (DAX 25.067,09, big indices, watchlist, AAPL 315,32). Scene-change detection @0.06 finds
  **zero** cuts — the screen basically never moves (occasional left dropdown menu). Confirms
  HANDOFF's "hangs on TradingView at the start" — here it hangs the *whole* time.
  → **Consequence:** NO active live chart to recreate. Per the no-fake-chart rule, Video 6 is
  **narration-driven motion graphics**, NOT an invented candlestick chart. The TradingView
  market-overview can be *referenced/recreated as context* (it's what he actually showed),
  but the scene design follows what he SAYS.
- **Audio = GERMAN** (`lang=de`, p=1.00). `base.en` produced garbage; **large-v3** gives the
  clean script → `.render/v6/v6_c0_hq.json`, `v6_c3_hq.json`. **Note:** L1–L5 board narration
  is English "Harry" — Video 6 source is Tim speaking German. Language of the rebuild = open Q.
- **Content = INTRO only, recorded twice.** Both clips are two takes of the same opening:
  "Wir gucken uns jetzt an, wie das Ganze in Kombination aussieht. Wir haben Level-2-Daten und
  das Volumenprofil kennengelernt … jetzt gucken wir uns an, wie das Ganze **live** aussieht."
  Clip B is the longer/better take (ends on "wie das Ganze **live** aussieht" @58.2s).
  → This is the **opener of a lesson combining Level 2 + Volume Profile shown LIVE** — i.e. it
  continues L5 and points straight at the **Deepchart live terminal** (`deepchart.html`).
- **OPEN QUESTIONS (asked user 2026-07-19):** (1) rebuild language EN vs DE? (2) is this the
  whole Video 6 (only the intro, ~1:51) or is the live-demo footage still to be uploaded?
  (3) reuse/extend the L5 Deepchart terminal for the "live" portion?

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
- **faster-whisper** — word-level transcription for onset sync. `render/transcribe_hq.py`
  (large-v3 single) and **parallel chunked** (`render/transcribe_chunk.py` + split → merge) for
  long files: 44-min Video 6 transcribed in minutes across 8 cores vs. hours single-threaded.
- **VO = ElevenLabs "Harry"** (`voice_id SOYHLrjzK2X1ezoPC6cr`, model `eleven_multilingual_v2`).
  User confirmed 2026-07-19 it's the SAME voice as the L1–L5 course "Harry" (Hedra just wraps
  the same ElevenLabs voice, tagged "Fierce Warrior"). → **Produce all VO via the ElevenLabs abo
  to save Hedra coins.** Helper: `render/tts.py`. Keys in gitignored `.render/.voice.env`
  (`ELEVEN_API_KEY`, `HEDRA_API_KEY`). Hedra API works too (X-API-Key, base
  `api.hedra.com/web-app/public`; Harry id `4d97785c-3852-452a-b542-d2c7bd921f75`) — reserve only.
- **Onset detection:** `ffmpeg -af silencedetect=n=-30dB:d=0.16` → each `silence_end` = phrase
  onset; concat boundaries = longest silences (d=0.9).

---

## 6. Decision & Feedback Log
*(every user instruction: date + concrete example → generalized rule)*

- **2026-07-21** — User handed over full production with the **MIRROR mandate**: Tim's original
  videos are the source of truth; everything he shows on screen (desktop, TradingView, orderflow
  terminal, platform clicks) is spiegeled **beat-for-beat**, code-rendered in our style (own
  design ok, content + flow 1:1). No invented fake charts, nothing may look AI-generated.
  → **Rule:** every screen/desktop/chart scene MIRRORS the real footage — same UI, same
  sequence of actions/clicks, same data on screen — recreated in code. Scrub the source frames
  and mirror what's actually there. Density rule still applies: compress Tim's dead air/rambling
  but keep every meaningful beat (target ≈ the app lesson's `durationMin`, NOT the 44-min raw).
- **2026-07-21** — User's #1 priority: **real computer-interface feel**. Early tests had weird
  mouse motion + screens that didn't read as a real interface. Mandate: cursor with human physics
  (ease-in-out, curved paths, micro-pauses, small overshoot before clicks, click feedback), real
  UI anatomy (window frames, menus, hover states, scroll behavior, tooltips, real UI typography).
  Must look like a **filmed screen, not an animation.** User told me to research best practices
  online and document them here.
  → **Rule:** all mirrored-screen scenes use the cursor/interface engine per §11 (Fitts +
  min-jerk + WindMouse path + undershoot/correction + dwell-before-click + sharp stepping cursor
  + 1:1 dead-stop chart pan + background ticks independent of cursor). Never a straight-line
  linear cursor, never a smeared/blurred cursor, never instant-perfect clicks. Visually QA
  mouse/interface frames before every "done".
- **2026-07-21** — Export target confirmed from `origin/claude/academy-video-selfhost` (the
  self-host refactor — NOT yet on `main`; `main` still uses `youtubeId`). App consumes
  `videoUrl` from Supabase Storage public bucket **`lesson-videos`** (env `VITE_VIDEO_BASE`,
  fallback `/videos`). Filenames: **lesson1.mp4**=l1 "What Is Trading?", **lesson3.mp4**=l3
  "Why 90% Lose", **lesson4.mp4**=l8 "What Is Retail Money?", **lesson5.mp4**=l9 "Level 1 vs
  Level 2", **video6.mp4**=l11 "Volume Profile: Value Area, HVN & LVN" (Elite, target 20 min).
  → **Rule:** export exactly these filenames. Video 6's finished lesson is **l11 Volume Profile**
  (~20 min) — theme the mirror around Volume Profile / Value Area / HVN / LVN as Tim shows it.
  Do NOT merge `main` into the production branch just to "get videoUrl" — it isn't there and
  risks conflicts with the 95-commit-ahead video-engine. Branch reconciliation is the app team's.
- **2026-07-19** — User formalized the editor role and mandated this EDITING-BRAIN as the
  highest-priority living doc.
  → **Rule:** maintain the Brain every session; log each new requirement immediately as
  example+rule and commit; read Brain first each session.
- **2026-07-19** — User: rebuilds feel like "the same presentation" (card + text).
  → **Rule:** density is the #1 quality bar. Default to real animated elements; treat any
  card-and-title scene as a failure state to be upgraded to L1 depth.
- **2026-07-19** — User: rebuild Video 6 in **English (Harry)** even though the source is German
  (course consistency). → **Rule:** source language ≠ deliverable language; default deliverable
  = English Harry, translate the German narration and re-time onsets to the English VO.
- **2026-07-19** — User caught me analyzing the wrong files (0718 fragments) instead of the real
  44-min `Video 6 Bildschirm.mp4` / `Video 6 Gesicht & Stimme.mov`.
  → **Rule:** when the user says files are "in ~/Downloads with the Drive name", verify by the
  **stated title** (search `mdfind`/Spotlight for the exact name) before assuming date-stamped
  fragments are the deliverable. Confirm duration/scope matches expectation (a full lesson is
  tens of minutes, not ~50s) before building.
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
- [ ] **Harry English VO source for Video 6:** deliverable = English Harry, but source is German.
  Need to know HOW English Harry audio is produced (Hedra? ElevenLabs "Harry"? user supplies the
  VO file?). This gates timing: build to German-original onsets now (scaffold, `v6_words.json`)
  vs. wait for the English VO to time reveals to its onsets. **Ask user.**
- [x] Video 6 source files confirmed (`Video 6 Bildschirm.mp4` + `Video 6 Gesicht & Stimme.mov`).
- [x] Video 6 full DE transcript done → `v6_words.json` (committed). Intro onsets mapped (0–130s).
- [ ] Integrate Clash Display + PixiJS into the lesson HTML pipeline.
- [ ] Densify L5 ~1:42 and any other user-flagged flat spots.
- [ ] Build Video 1 once script arrives.
- [ ] Decide COSMO placement per lesson (corner bubble vs intercut).
- [ ] Reconcile production branch vs `main`/`academy-video-selfhost` (app team) — not blocking.

---

## 9. MIRROR mandate + scope (2026-07-21)

**MIRROR = source of truth is Tim's real footage.** Every desktop/TradingView/orderflow/click
scene is spiegeled beat-for-beat, code-rendered in our style. Own design ok; **content + flow
1:1**. No invented charts, nothing AI-looking. Density rule still holds → **compress dead air,
keep every meaningful beat.**

**LENGTH (user 2026-07-21):** video6 target = **8–12 min** compact dense lesson (like the others),
NOT real-time, NOT the 20-min slot, NOT 44 min. All content beats in Tim's order; dead air /
rambling cut radically. Tim's 44 min = raw source only.

**OUTPUT (user 2026-07-21, updated):** copy every finished MP4 into **`~/Downloads/`** (user moved
it there from the Desktop folder) and tell the user the filename. **Encode max-compat:** libx264
`-profile:v high -pix_fmt yuv420p -movflags +faststart -c:a aac` — a non-faststart / odd color-
primaries file showed "Fehler" in Finder QuickLook (the file was actually valid; re-encode fixed the
thumbnail). Always revalidate `ffmpeg -v error -i out.mp4 -f null -`. (Repo stays free of big MP4s.)

**Theme note:** Tim runs TradingView in **LIGHT theme** (white bg, red DAX area chart) for the
market-overview + chart pages; Deepchart terminal = white chart area with dark side/top toolbars.
Mirror those exact themes — do NOT default to a dark TradingView.

**COSMO asset (found 2026-07-21):** `~/Downloads/COSMO.png` (2160×3840 RGBA, full character,
transparent bg — blue cartoon guy, black tee, gold chain). Bubble pipeline: crop head/shoulders
`crop=1100:1100:525:210` → `cosmo_key.png` → `cosmo-bubble.html`(=bubblecam.html) renders 90-frame
lime-glow breathing loop (`render/rendbubble2.mjs`, deviceScaleFactor 2, omitBackground) → qtrle
alpha `bubble_loop.mov` scaled 280px → overlay `overlay=40:H-h-30` (bottom-left). No Hedra needed.
**Lower-thirds go bottom-CENTER** so they never collide with the bottom-left COSMO bubble.

### ✅ Video 6 — SEGMENT 1 delivered v1 (2026-07-21)
TradingView Marktübersicht MIRROR, 28s, beat-locked to the intro Harry VO (`.render/v6/vo/intro.mp3`
+ `intro.words.json`). `v6seg1.html` (+ `interface-engine.js`): faithful light-theme TV overview
(Chrome tabs, de.tradingview.com, nav, DAX 25.067,09 red area chart w/ live leading dot, full
9-row watchlist w/ Tim's exact values + tick-flash, AAPL 315,32 panel, Win taskbar 22:42). Cursor
(IFE engine) beat-locked via new **`{at:ms}`** action (pads a wait to an absolute time): drifts to
watchlist on "Level 2 data", scans on "volume profile", into DAX on "combination/live", to **Broker**
nav on "The first is TradingView" → **opens the Broker dropdown** (matches Tim's t35) during the "99%
of traders" count-up, back to watchlist on "Level 2 limited". Brand lower-thirds bottom-center
(kicker → WAY 1·TradingView·99% → red "Level 2: limited"). COSMO bubble bottom-left.
Render `render/rendseg1.mjs` (4 chunks, 840 frames, **paint-flush before screenshot**) → encode +
COSMO overlay. **Exported:** `~/Desktop/EnterTrade Videos/Video6_Segment1_TradingView-Marktuebersicht_v1.mp4`.
→ **SUPERSEDED by user 2026-07-21:** no teaser segments — build the **complete final video6.mp4**
(8–12 min) with ALL of Tim's content visible (same candles, same orderflow bubbles, footprint, his
drawn zones/strategy) so he can compare to the original. Only then does he review. Segment 1 becomes
the first ~28s of that full timeline.

### Video 6 — Tim's ACTUAL strategy (from full transcript `tim_script_de.txt`, 2026-07-21)
The lesson teaches a real, concrete **Volume-Profile + Orderflow** method. Beats, in his order:
1. **Intro:** combine Level 2 + Volume Profile, live. Two ways — TradingView (99% use it, limited
   L2, fine to start) vs pro software (real exchange L2). Look at both.
2. **TradingView tour:** favorites/drawing rail; **Volume Profile Fixed Range** indicator; views =
   line / candle / **Volumen-Fußabdruck (footprint)** showing delta volume + orders. TV footprint
   good; software footprint more precise (data from a top exchange).
3. **The VP method (core):** draw VP **Low → current point** (NOT Low→High — leaves a gap) → **Value
   Area Low, Value Area High, Point of Control**. Rule: **don't trade the POC**; **wait for the VAL
   to be swept**; respect structure (broke high ⇒ bullish ⇒ longs). Replay walkthrough: verify the
   sweep happened at the candle's real time (M1 check, don't cheat); redraw VP as it changes; VAH of
   down-move taken ⇒ continuation short; VAL taken + **Low Volume Node / imbalance** zone = strong.
   Consolidation ⇒ draw its value area ⇒ wait for **sustainable** break of resistance + prior VAL.
   **Entry via footprint delta:** negative delta + positive candle = passive buys = **ABSORPTION**
   (e.g. 61 buys absorb sells, lift price) ⇒ entry, tight stop, runs to profit. R:R 1:2.8…1:6.
4. **Orderflow software (Deepchart):** heatmap + deep trades + real footprint. **Absorption** = #1
   entry confirmation (orders in, market doesn't move ⇒ absorbed by passive book). **Trapped buyers**
   at a ceiling (214/202/290 buys, +11% delta, yet next candle sells off). Topping at higher-TF
   **Value Area High of the day** ⇒ shorts. The short trade: big sells + break prior sells ⇒ short,
   SL above absorption, TP next low / VAL of long move (R:R 1:1.5…1:6 w/ daily VP).
5. **Why absorption = buying power:** closing a short = active buy; 500 shorts closing above = buying
   power our way; absorption reveals hidden passive orders.
6. **Wrap-up:** simple (VP + confirmations); momentum trades ~zero drawdown; learn VP = big edge;
   world-champion systems; "learned from the best, giving it to you free."

**Condensed EN Harry script (the build spine):** `.render/v6/script_en.md` — 6 scenes S1..S6,
~1550 words ≈ ~10 min, faithful to Tim's beats. S1 = Segment 1 (done). S2 TV tour, S3 VP method,
S4 orderflow absorption/trapped-buyers, S5 why-absorption, S6 wrap-up.

**⛔ BLOCKER — VO key:** `.render/.voice.env` `ELEVEN_API_KEY` is **empty** locally (the intro VO
was made in the prior session when it was set). Need the ElevenLabs key to generate S2..S6 Harry VO
(`render/tts_ts.py` → mp3 + word onsets). **Asked user.** Meanwhile build the VO-independent visual
component library (below).

### ✅ Video 6 — COMPLETE build v1 (2026-07-22, local session)
All six scenes built + assembled into the full **video6.mp4** (~8:01):
- **Shared mirror library `tvchrome.js`** (global `TVC`): dark-Chrome browser chrome ("Zum
  Aktualisieren neu starten" pill, dark tabs/omnibox), LIGHT Win11 taskbar (weather · centered
  pills · tray · Tim's real clock), TV dark toolbar + white canvas + light left rail + floating
  draw bar (+ 20px brush panel), legend/VERKAUF-KAUF pills, price scale + tags, replay furniture
  (cut+shade+chip, "Balken auswählen" toolbar, "Handel im Wiedergabemodus" bar), blue replay
  candles + mkSeries (keyframed anchors + seeded noise), **computed** Volume Profile
  (histogram→POC/VA via 70% expansion) + handles + labels, position tool (Ziel/Stopp/G&V chips),
  20px marker scribbles, TV footprint columns (bid×ask + "Delta Gesamt"), full Deepchart chrome
  (top bar/rail/bottom radios), delta-sized bubbles, zone boxes w/ tick labels, footprint number
  grid, ΣV/ΔV/Δ% delta footer, and `mkTimeMap(gaps)` for VO-pause action beats.
- **⚠ THEME TRUTH (refs t35/t300/t600/t900/t1080):** Tim's browser chrome + TV toolbars = DARK,
  chart canvas = WHITE with BLUE candles (replay mode), taskbar = LIGHT. §9's "light theme" note
  was half-right; §10's "TV dark palette" applies to the TOOLBARS only. v6seg1 was refixed
  accordingly (dark tabs + light taskbar).
- Scenes: `v6seg1` (28.0s intro, refixed chrome) · `v6seg2` (58.6s TV tour: rail tooltips,
  Indikatoren dialog, Linie/Kerzen/Fußabdruck morphs, Deepchart flash) · `v6seg3` (154.2s VP
  method: draw low→current, not-low-to-high ghost, computed VAL/VAH/POC, replay sweep, M1-check,
  redraw, LVN zone, consolidation break, footprint popover w/ 61-buys absorption, long position
  runs to R:R 1:2,8→1:4,6 with live G&V) · `v6seg4` (189.1s Deepchart: absorption demo 101→2,
  heatmap bands, health steps, top forming at day-VAH, footprint panel w/ trapped buyers
  214/202/290 +11%, short trade 105 sells → R:R 1:1,5→1:6, then S5 why-absorption: 500-shorts
  cluster → active-buy arrows → buying-power push; **dynamic price window pWin(t)** so the
  trader "scrolls with the market") · `v6seg5` (51.2s wrap: line chart + zones + two
  zero-drawdown momentum runs + brand outro card).
- **Timing system:** every scene = VO + `GAPS=[{at,dur}]`; `sT(vo)` = onset→scene time,
  `gS(at)` = gap START (action windows anchor there — `sT(at)` includes the gap's own dur!).
  Audio built to match by `render/mixv6.py` (same gap tables → silences). **Duration source of
  truth = the page's `__dur`/`__off5`** (read them headless; do NOT re-derive by hand).
- Pipeline: `render/rendseg.mjs` (generic, paint-flush) + `render/buildv6.sh` (mix → 4-chunk
  renders → per-scene encode → concat demuxer → COSMO bubble overlay → max-compat finalize →
  validate → copy to ~/Downloads + ~/Desktop/EnterTrade Videos/). Clock mirrors Tim's real
  taskbar times (22:42→23:24 across scenes).
- **DELIVERED 2026-07-22: `video6.mp4` 8:01.13, 1920×1080 30fps, H.264 High yuv420p +faststart,
  30,4 MB, ffmpeg-validated clean.** Full render of 14.433 frames took ~5 min on this Mac
  (4 parallel Chromium workers ≈ 45–60 fps combined).
- **L-series exports (2026-07-22):** delivered finals found ON DISK in ~/Downloads —
  `lesson1_v11_send.mp4` (4:00.37, incl. Hedra intro), `lesson3_final5_send.mp4` (8:38.80),
  `lesson5_FINAL3_send.mp4` (5:21.34) → copied to app names lesson1/3/5.mp4. **lesson4 had NO
  delivered file** → re-rendered from `lesson4.html` + `audio/l4_audio.m4a` (12.910 frames) +
  COSMO bubble via `render/buildlessons.sh`.

### Video 6 — component library to build (VO-independent; the heavy Fable visual work)
- **TradingView chart page** (light theme): top toolbar, left favorites/drawing rail w/ tooltips,
  candles (up #089981 / dn #F23645), interval row, legend OHLC (f(cursorX)), bar-replay bar
  ("Handel im Wiedergabemodus"), crosshair. Views: line ↔ candle ↔ footprint morph.
- **Volume Profile overlay:** horizontal buckets, VA shaded, **POC** bright line, **VAL/VAH** bands;
  drawn Low→current with drag handles; redraw animation. (l11 theme: Value Area / HVN / LVN.)
- **TV footprint (Volumen-Fußabdruck):** per-candle bid×ask cells + "Delta Gesamt", delta ramp.
- **Zone drawing:** supply (red) / demand (green) / LVN boxes, drawn with handles, extended right.
- **Deepchart orderflow terminal** (extend `deepchart.html`): candles + green/magenta bubbles sized
  by delta, footprint number grid, delta-heatmap footer (orange ΣV / purple-green ΔV/Δ%), trapped-
  buyers + absorption highlights, entry/SL/TP + R:R markers. This is the S4/S5 core (~7 min of Tim).
- All choreographed with the IFE cursor engine (draw zones, scrub replay, hover cells, toggle views).

**#1 priority = real computer-interface feel** (see §11 engine). Filmed screen, not animation.

**Export:** Supabase bucket `lesson-videos` / `/videos`. `video6.mp4` = l11 "Volume Profile:
Value Area, HVN & LVN" (Elite, ~20 min target). Names: lesson1/3/4/5.mp4 + video6.mp4 (§6).

---

## 10. Video 6 — full MIRROR storyboard + UI anatomy (from real frames, 2026-07-21)

Source: `~/Downloads/Video 6 Bildschirm.mp4` (44:15, 1916×1076, screen) + `Video 6 Gesicht &
Stimme.mov` (45:23, face+voice; ~68s longer → find sync offset by matching first spoken beat to
first screen action). Contact sheets `.render/v6/mirror/sheet_{01..05}.jpg` (15s grid, 9min each);
full-res refs `.render/v6/ref/t*.jpg`.

**Timecoded arc (what to mirror, in order):**
| Time | Screen content | Mirror as |
|---|---|---|
| 0:00–~2:45 | **TradingView Marktübersicht** (market overview). Red DAX area chart 25.067,09 −0,20%, watchlist, AAPL 315,32. Broker dropdown opens (cursor hovers "Broker vergleichen"). The long intro hang. | Recreate the TV overview page + cursor moving to nav / opening dropdown. Density: build watchlist rows, animate the DAX sparkline, quotes tick. |
| ~2:45–~4:30 | TradingView **symbol pages** + first line/candle charts (Gold Spot/USD 4.120,67). | TV chart page shell; symbol search + load; chart draws in. |
| ~4:30–~19:30 | TradingView **analysis**: candlesticks, **Volume Profile** (blue histograms), **Volumen-Fußabdruck/footprint** (bid×ask cells + "Delta Gesamt" per candle — in **Bar-Replay** mode), drawn **supply/demand zones** (green/red + blue/yellow boxes), horizontal levels, line charts. | Mirror each: VP overlay (POC/VA/HVN/LVN — the l11 theme!), footprint grid, zone-drawing with drag handles, replay scrubbing. This is the teaching core. |
| ~19:30–~41:00 | **Deepchart® orderflow terminal** (dxFeed 15m delayed) — candles w/ footprint numbers + green/magenta orderflow bubbles sized by delta, green supply / red demand zones ("318,50$ \| 637 ticks", "BUY 1 \| R:R 2,72"), delta-heatmap footer (orange ΣV headers + purple/green ΔV/Δ% cells), bottom OF-VP/D-VP radio bar. Brief Windows-desktop flash ~25min (app switch). | **Extend `deepchart.html`** to this exact layout — it already mirrors this real app (no fake chart). The bulk / climax. |
| ~41:00–44:15 | Back to **TradingView line charts** (XAUUSD) w/ supply/demand zones. Wrap-up. | TV line chart + zones; outro. |

**Exact UI anatomy (for code-recreation) — 3 states:**

1. **TradingView Marktübersicht** (`ref/t35.jpg`): Chrome/Windows chrome, tabs (Amazon/noon/NQ1/
   XAUUSD/RØDE/Subscriptions/R\|Trader/Membership/**TradingView-Alle** active), URL `de.tradingview.com`.
   TV nav: logo · Suche(Ctrl+K) · Produkte · Community · Märkte · **Broker**▾ · Mehr. Broker dropdown:
   Top-Broker / Broker vergleichen / Konto eröffnen / Auszeichnungen / brokers (Fusion 4.6★, Capital.com
   4.6★, FOREX.com 4.4★, Tickmill, TradeStation, Blueberry) / Handelsraum. Left "Marktübersicht›",
   DAX card (X icon, 25.067,09 POINT −0,20%, red area chart, axis 10:00–19:00). Right watchlist:
   BTCUSD 64.096,26 +0,48% · NQ1! 30.032,25 +0,32% · XAUUSD 4.120,670 −0,08% · NAS100 29.875,21
   +0,43% · GC1! 4.113,7 −0,65% · XAUUSD 4.111,51 −0,29% · USOIL 71,50 −0,42% · GBPUSD 1,34021
   −0,05% · NDX 29.825,11 +0,33%. AAPL panel 315,32 −0,28%, "Markt geschlossen", news, Schlüssel-
   Statistiken. Win taskbar clock 22:42 12.07.2026.
2. **TradingView footprint chart** (`ref/t1080.jpg`): URL `de.tradingview.com/chart/...OANDA:XAUUSD`.
   Legend "Gold Spot / U.S. Dollar · 1 · OANDA · Volumen-Fußabdruck [ATR 14, Kauf und Verkauf]".
   VERKAUF/KAUF 4.070,990 buttons (red/blue). Timeframe row 1s…16h D W M. Footprint candles: green/red
   columns, bid×ask cells (35\|52, 110\|134…), totals + "Delta Gesamt −260 1,38K". CVD 1D bottom.
   "Handel im Wiedergabemodus" (bar replay). Clock 22:59.
3. **Deepchart® orderflow terminal** (`ref/t2540.jpg`): dark Win app, drawing rail left + top
   toolbar, symbol MNQ-202609 · 10D-BT · 1 Minute. Left: candles+footprint, green supply box
   ("318,50$ \| 637 ticks") / red demand box ("−117,00$ \| 234 ticks"), "BUY 1 \| R:R 2,72".
   Right: footprint number grid + OHLC header (O/H/L/C %V ΣV ΔV). Footer delta heatmap: orange
   ΣV headers (12K 19K 16K…), ΔV row (−440 −2,3K 80 411 1,5K…), Δ% row. Bottom radios OF-VP/OF-B/A/
   D-VP/D-DP/D-VL/W-VP/W-DP/C-VP + DOM Trading + Trading panel toggle. "Deepchart® - dxFeed 15m delayed".

**Palette to match (TradingView dark):** bg `#131722`, panel/hover `#1E222D`–`#2A2E39`, border
`#2A2E39`/`#363A45`, text `#D1D4DC`, secondary `#787B86`, accent `#2962FF`, up/buy `#089981`,
down/sell `#F23645`. (Our brand palette still frames titles/lower-thirds; the *mirrored screen* uses
the real app colors so it reads as the real tool.)

---

## 11. Interface-realism ENGINE — cursor/UI physics (research 2026-07-21, sources at end)

**Determinism first:** never RNG per frame. Seeded PRNG (mulberry32) → derive every random value
from `hash(seed, eventIndex, k)` at **build time**. Each move/click/scroll = an immutable
descriptor (path polyline + arc-len LUT, durations, offsets). `renderAt(ms)` only interpolates.
1D noise = value-noise over hashed integer lattice = pure f(t).

**1. Mouse move.**
- *Fitts duration:* `MT = 120 + 180·log2(D/W+1)` ms × seeded U(0.9,1.15), clamp [220,1300]. (D=dist,
  W=target width along approach.) Small icons far away → slow (~1.1s); big near buttons → ~300ms.
- *Min-jerk easing (the ease):* `τ=t/MT`; `s(τ)=10τ³−15τ⁴+6τ⁵`; apply along the PATH. Warp `s(τ^0.88)`
  so peak speed sits at ~44% of MT (real hands peak early). **Do NOT use CSS cubic-bezier eases.**
- *Path shape (WindMouse):* gravity G=9, wind W=3, maxStep M=15, damp D=12 → organic polyline; run at
  build time; retime with min-jerk. (Straight lines are the #1 non-human tell.) Cheap fallback: cubic
  Bézier with perpendicular offset 6–18% of D (cap ~100px), control pts asymmetric (0.8/0.4 → bow early),
  one curl-direction bias per session.
- *Undershoot + correction:* primary lands at 0.93–0.97·D, scatter SD≈W/5; pause 70–120ms; corrective
  min-jerk hop 120–180ms to final point. ~8% of moves overshoot 2–6% then correct. Skip correction if
  W>80px. Final click point ≠ center: Gaussian SD≈W/6, ~2px toward approach dir.
- *Tremor:* perpendicular jitter `A(t)=0.3+0.02·|v|` px × noise1D(t·9Hz) — auto→0 at endpoints.
  **Idle = dead still** (no continuous jitter — that screams synthetic); only rare 1–3px micro-drifts.
- *Dwell before click:* `120 + 180·U(0,1)²` ms (right-skewed); 400–700ms before decision clicks (Buy/Sell).

**2. Click/feedback (ms):** down→up 70–150 (≈90); dbl-click gap 80–200; click→UI response 1–3 frames
(instant = fake, >150ms = laggy); drag: press→move 80–150, drag-slop 3–5px. **Pressed states, not
Material ripples** (bg darken 8–12% for press duration). Optional tutorial-style soft click halo:
44px, 25% alpha, scale 0.6→1.0, fade 350ms. **Cursor state machine** by hit-testing precomputed pos:
arrow→pointer(buttons/rows)→I-beam(inputs)→col/ew-resize(splitters/price-axis)→crosshair(chart)→
grabbing(pan). Flips exactly on region-cross frame, no tween between shapes. Tooltip after 300–500ms
hover; caret blink 530ms square wave.

**3. Scroll/pan.** Wheel notch ≈100px, ease-out ~120–160ms `1−(1−τ)³`, bursts of 2–8 notches (gap
40–120ms). Trackpad momentum: `v(t)=v0·k^t`, k=0.998/ms, `y(t)=y0+v0·(k^t−1)/ln(k)`, τ≈325–500ms,
stop at |v|<0.05px/ms. Overscroll rubber-band `(1−1/(0.55x/d+1))·d`, snap-back critically damped
τ≈90ms. **TradingView chart pan = 1:1 pointer-lock, ZERO easing, dead-stop on release** (inertial
chart pan = #1 fake tell); horizontal drag has ±2–4px vertical wobble (free from tremor). Wheel-zoom
about cursor x, ~10%/notch, instant.

**4. "Captured screen" look.** (a) **Sharp cursor, discrete steps, NO motion blur** — fast moves jump
100–200px/frame with zero smear (that jump is CORRECT). (b) Real cursor bitmap + hotspot: macOS arrow
black fill + 1.5px white outline ~17×23px, hotspot top-left tip, drop shadow (0,1px,2px,rgba(0,0,0,.3));
OR Windows white-with-black — pick one, match the window chrome. Draw at integer/half-px (not subpixel).
(c) **Frame-cadence jitter:** seeded schedule — every 4–10s repeat previous frame's sample time 1 frame
(`t_eff=t−33ms`), 2 frames after heavy change. (d) JPG q≈80 supplies compression; optional ±1LSB dither
on flat dark gradients. (e) **Alive UI:** hover bg on cell-enter frame; focus ring #2962FF after input
click; text selection follows cursorX; **live clock ticking**; **prices/quotes updating on their own
150–800ms cadence INDEPENDENT of the cursor** — background activity = "live" feel.

**5. macOS chrome:** window radius 10px; title bar 28px (52 unified); traffic lights 12px circles
#FF5F57/#FEBC2E/#28C840 at x=20/40/60, symbols on hover; menu bar 24px SF Pro 13px; overlay scrollbar
7px pill rgba(255,255,255,.25), fades 250ms after ~1s idle.

**Trading typography:** stack `-apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,sans-serif`;
tabular-nums for all numbers. Axis 11px; watchlist symbol 13/600 price 13/400; DOM/footprint row
18–24px, 11–12px digits; depth bars alpha .25 length ∝ size/max; cell flash-on-update `α(t)=α0·e^(−t/120ms)`.

**Top-5 highest-leverage tells:** (1) min-jerk timing on WindMouse path, (2) undershoot + 100ms-later
micro-correction, (3) dwell before every click, (4) sharp stepping cursor no blur, (5) 1:1 dead-stop
chart pan + background ticks independent of cursor.

**Minimal glue:** `buildScenario(seed)` → per action compute Fitts MT + WindMouse path + arc-len LUT +
overshoot/correction + dwell → emit absolute-ms timeline. `renderAt(ms)`: apply dropped-frame hold →
sample timeline (+tremor) → hit-test → cursor shape → draw UI hover/press/crosshair from t → draw sharp
cursor bitmap.

**✅ IMPLEMENTED & VALIDATED (2026-07-21):** `interface-engine.js` exposes global `IFE`
{mulberry32, hashSeed, noise1D, windMouse, arcLen, fittsMT, minJerk, **Cursor**, **drawCursor**}.
`IFE.Cursor(actions, {start, seed, os})` → `{sample(ms)→{x,y,pressed,shape,scrollY}, totalMs}`.
Actions: `{move:[x,y],W}`,`{click:true, decision?}`,`{dblclick}`,`{wait:ms}`,`{drag:[x,y]}`,
`{scroll:px,dur}`,`{shape:'crosshair'|'pointer'|'text'|'default'}`. Embed via
`<script src="interface-engine.js">` (loads over file:// in the render pipeline).
QA harness `iftest.html` + `qacursor.mjs` → `.render/v6/cursor_path.jpg` plots the whole trajectory
(dot density = speed). **Verified:** curved WindMouse paths, bell velocity, dwell knots at targets,
drag wobble, hover-on-enter, sharp arrow/pointer/crosshair bitmaps. **RENDER GOTCHA:** after
`evaluate(renderAt)` you MUST flush a paint (`await pg.evaluate(()=>new Promise(r=>rAF(()=>rAF(r))))`)
before `screenshot`, else Playwright captures a stale layer (all frames come out byte-identical).
Use `type:'jpeg'` like `rendv6.mjs`.

**Sources:** WindMouse ben.land/post/2021/04/25/windmouse-human-mouse-movement · Fitts (Wikipedia;
yorku.ca/mack Fitts throughput) · min-jerk Flash/Hogan (ima.org.uk survey PDF; arxiv 2110.00443) ·
Meyer optimized-submovement (researchgate 19750579; submovement analysis 220208463) · momentum scroll
ariya.io 2011; UIScrollView mechanics medium @esskeetit; Apple decelerationRate; github ktiays/fluid-scroll ·
Win SetDoubleClickTime / TTM_SETDELAYTIME; ninjaone hover time · TradingView colors mobbin.com; TV custom-
themes + lightweight-charts docs · synthetic-video cues arxiv 2605.06912; forasoft compression field guide.
