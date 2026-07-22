# Lesson 1 — "What Is Trading?" — the SEATED-COSMO FULL version (source)

This is the source for the better L1 that was only ever delivered as an MP4
(`lesson1_FULL_v1.mp4`, 4:00, 1080p) — COSMO seated IN the gaming chair (not a
floating bubble), room looks great, and the boards use numbered points that
appear progressively + the INVESTOR vs TRADER comparison. It was NOT in the repo
because it came from a newer board design that was never merged. Rescued here
from the original cloud session.

## How `lesson1_FULL_v1.mp4` was assembled
Two rendered segments, concatenated (ffmpeg `-f concat`):

```
# cc_full.txt
file 'intro_part2.mp4'     # seated-COSMO intro + room (see below)
file 'board_gsap.mp4'      # the boards (numbered points + INVESTOR/TRADER)
```
```
ffmpeg -y -f concat -safe 0 -i cc_full.txt \
  -c:v libx264 -pix_fmt yuv420p -crf 22 -maxrate 1400k -bufsize 2800k \
  -c:a aac -b:a 150k lesson1_FULL_v1.mp4
```

## The two segments come from:
- **intro_part2.mp4** — seated COSMO + room. Rendered via Playwright screenshots
  of the canvas HTML → frames → ffmpeg, then composited:
  - `l1gsap.html` — the GSAP opening motion-graphics (identical to the committed
    `video-engine/lesson1.html`; the animation-heavy opener)
  - `l1scene.html` — the room / seated scene renderer
  - `introcomp7.html` — the latest compositor (COSMO seated into the chair + room)
  - `introbg7.html` — the room background (latest)
  - seated COSMO clip: `introL1seated_raw.mp4` (Hedra talking-head, keyed in)
- **board_gsap.mp4** — the improved boards
  - `board.html` — the newest board design (numbered points appear progressively,
    INVESTOR vs TRADER comparison). `board3/4/5.html` = earlier board scenes.
  - `board_audio.m4a` — the board narration (Harry EN)

## Rebuild
Each `*.html` exposes `window.renderAt(ms)` + `window.__ready` (paused GSAP
timeline driven by `tl.time(sec)`), same pattern as the other lessons — render
frames with Playwright headless Chromium, encode with ffmpeg, chroma-key the
seated-COSMO clip over the room, then concat the two segments per cc_full.txt.
Audio: `board_audio.m4a` for the board segment; the intro segment carries its own
VO from the opening.

> Note: the seated-COSMO raw clip (`introL1seated_raw.mp4`) + the two rendered
> segments live in the cloud scratchpad, not here — but every HTML SOURCE needed
> to re-render them from scratch is in this folder.
