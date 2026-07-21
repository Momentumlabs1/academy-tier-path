# EnterTrade Academy — Video Production HANDOFF

Read this first when continuing in a new chat. **All code + audio + transcripts live in this
repo (`video-engine/`)** — nothing critical is trapped in the old chat. The rendered `.mp4`s
were delivered in-chat and live only in the ephemeral scratchpad; they are **regenerable**
from the HTML renderers + committed audio.

Branch: `claude/determined-mccarthy-iYY9Y`.

## Where things run
- Scratchpad (ephemeral, per session): `/tmp/claude-0/-home-user-academy-tier-path/<id>/scratchpad`
  — this is where you render frames + encode. Copy the repo's `video-engine/*` here to work.
- Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
- ffmpeg/ffprobe: `scratchpad/video/node_modules/@ffmpeg-installer/linux-x64/ffmpeg` (npm `@ffmpeg-installer`), playwright-core in `scratchpad/video/node_modules`.
- Render harness: each lesson HTML exposes `window.renderAt(ms)` + `window.__ready`.
  `render/rendXX.mjs` dumps JPG frames (1920x1080, 30fps). Run 4–5 chunks in parallel.
  Encode: `ffmpeg -framerate 30 -i frames/f%05d.jpg -i audio.m4a -t <dur> -c:v libx264 -crf 22 ...`.

## STATUS (as of handoff)
| Video | State | File (renderer) |
|---|---|---|
| L1 What Is Trading | ✅ delivered (4:00), GSAP + seated COSMO intro | `lesson1.html` (needs `lib/gsap.min.js`) |
| L3 Why Traders Lose | ✅ delivered (8:39) + COSMO bubble | `lesson3.html` + `audio/l3_audio.m4a` |
| L4 Retail Money | ✅ delivered (7:07) + COSMO bubble | `lesson4.html` + `audio/l4_audio.m4a` |
| L5 Level 2 Data | ✅ delivered v3 (5:21) + LIVE deepchart + COSMO | `lesson5.html` + `deepchart.html` + `audio/l5_audio.m4a` |
| Signals | ✅ ORIGINAL kept (2:57) — do NOT rebuild | (original mp4 only; not GSAP) |
| Video 1 (course intro) | ⏳ user writing script | — |
| Video 6 | ⏳ user uploading <25MB compressed clips to Drive | — |

## HARD RULES from the user (do not violate)
1. **Nothing may look AI-generated / generic.** The current biggest complaint: rebuilds feel
   like "the same presentation" (card + text). They need to be **much more densely animated** —
   L1-level depth everywhere, not sparse title-only scenes.
2. **No fake charts.** Only recreate charts Tim actually showed. L3 original = whiteboard (no
   chart). L4 original = all cards, NO chart. **Only L5 had a live chart** (the Deepchart terminal).
   Do not invent charts that weren't in the original.
3. **No random background decoration** (ambient orbs / stray "bubbles"). He called this out — it
   reads as filler. Keep motion meaningful, tied to content.
4. **COSMO talking head:** NO Hedra budget left. Use the static COSMO image (`cosmo-bubble.html`
   → `cosmo_key.png` = magenta-keyed `hedra/cosmo_close_alpha.png`) as a breathing/glowing corner
   cam-bubble, bottom-left, with animated "··· COSMO" speaking dots. L1 keeps its seated intro.
   Signals keeps its original (already had COSMO + phone).
5. **Signals is finished** (original has phone/order-ticket + COSMO). Don't touch it.
6. Voice = "Harry", English, timing follows the voice. Land every reveal on the **word onset**.

## Pipeline for a faithful rebuild (proven)
1. Extract audio from the original delivered mp4 (`ffmpeg -i orig.mp4 -vn -c:a aac audio.m4a`).
2. **Transcribe word-level:** `python3 render/transcribe.py audio.m4a words.json` (faster-whisper
   `base.en`, int8 CPU). Gives `{segs:[{t,txt}], words:[{w,t}]}` — the exact narration + timings.
   `l4_words.json / l5_words.json / sig_words.json / l3_words.json` already produced.
3. Design scene functions timed to those onsets. Component library lives verbatim at the top of
   `lesson3.html` / `lesson5.html`: helpers `clamp,es,eo,bo,hexA,rr,rnd,sA,rv,ry,pbox,kick,chkIcon,
   bg,vignette,cap,wrap*`. **Copy the header verbatim; only write scene functions + renderAt.**
   `kick()` saves/restores canvas state (bug fixed — a leaking textAlign right-shifted centered text).
4. Every scene: `sA(t0,t1)` fade in/out so there are NO black/empty frames between scenes.
5. Render (5 parallel chunks) → encode with the lesson audio → composite COSMO bubble loop
   (`ffmpeg -stream_loop -1 -i bubble_loop.mov -i lesson.mp4 ... overlay=40:H-h-30`) → deliver.

## L5 live-chart splice (reference for "Tim shows the chart")
`deepchart.html` = full Deepchart broker terminal (2 panels, volume profile, cyan=buy/magenta=sell
orderflow bubbles sized by delta, footprint, animated cursor, **live-ticking right edge**). In L5
the terminal runs from **263.7s → end (321.34s)**; narration onset "let me show you what it looks
like live" @263.70 (see `l5_words.json`). Rendered via `render/dcseg.mjs` with `renderAt(t)` where
`t = 5000 + i*(1000/30)` (starts already-built, stays live). Then: board frames 0→263.7s + deepchart
frames + bubble overlay + `l5_audio.m4a`. mouse path + live edge tuned in `deepchart.html`.

## NEXT (the real remaining work)
- **Densify every lesson to L1 depth.** The rebuilds are too sparse. Work the review loop: user
  gives timestamps of flat/empty moments; rebuild those scenes with real animated elements.
  Example flagged: L5 ~1:42 "CHART READERS vs MARKET READERS" is nearly empty.
- **Anti-generic tooling (user asked):** downloaded to scratchpad `fonts/` — `clash.zip`
  (Fontshare Clash Display, free commercial display font) + `pixi.min.js` (GPU glow/particles).
  Integrate a custom `@font-face` (data-URI, since Artifact CSP blocks CDNs; local file OK for the
  render pipeline) to kill the system-ui "generic" look; use PixiJS filters for real glow/depth.
- **Video 6:** user uploads compressed <25MB clips (480p, ~5-min chunks) to Google Drive. Drive MCP
  tool caps downloads ~25MB — that's why clips must be small. Download each, stitch, transcribe,
  rebuild in-style (with the live-chart approach where he shows a chart). Analyze his frames to
  match what he shows (he noted e.g. "hangs on TradingView a while at the start").
- **Video 1:** build from user's script when provided (course intro, explains the course).

## Palette
BG #070a10 · INK #eaf2f8 · MUT #8b98a8 · LIME #b6f04a · CYAN #39d0d0 · MAG #e06bd8 · RED #ff5470 · GRN #33e08a · GOLD #ffcf5c.
