# Lesson 3 — "Why Most Traders Lose Money" · Storyboard (8:39)

Audio: `l3_audio.m4a` (extracted from lesson3_final5_send.mp4, 518.8s).
Phrase onsets: `l3_onsets.txt` (silencedetect -30dB d=0.16). Clip boundaries (long silences):
~37.9 · 65.8 · 105.2 · 125.4 · 154.0 · 190.0 · 210.9 · 238.1 · 271.4 · 296.7 · 324.9 · 371.2 · 433.6 · 472.1 (approx c-boundaries — refine against script during build).

Reuse the Lesson 1 engine + component library (`lesson1.html`). New components needed:
**loop diagram** (c11), **2×2 killer grid** (c12), **formula row** (c13), **stat gauge** (c02).

| Clip | Narration beat | Scene (component) |
|------|----------------|-------------------|
| c01 | Welcome; uncomfortable truth: why most lose | **Title** kinetic "WHY MOST TRADERS LOSE" + hook line |
| c02 | 80–90% of retail lose; fail in first years; mostly avoidable | **Stat gauge** counting to 80–90%, "mostly avoidable" tag |
| c03 | They don't lose to the market — they lose to their own decisions | **VS statement**: MARKET ✕ vs YOUR DECISIONS ✓ (punch) |
| c04 | Same 5 patterns show up again and again | **Numbered-list intro** (5 Destroyers scaffold) |
| c05 | #1 No trading plan — decisions from gut | Destroyer 1 row + gut-feeling icon |
| c06 | #2 Overtrading — too many trades, forced setups | Destroyer 2 row |
| c07 | #3 Risk too high — oversized wipes account in days | Destroyer 3 row + account-blowup mini |
| c08 | #4 Unrealistic expectations — holy-grail hunt | Destroyer 4 row |
| c09 | #5 Switching strategies — no system | Destroyer 5 row → "no system" punch |
| c10 | Emotions: Fear / Greed / Hope + each effect | **Three emotion cards** (reasonCard style) |
| c11 | Chain reaction: emotions→bad decisions→broken rules→losses→emotions | **Loop diagram** (animated cycle, 4 nodes + arrows) |
| c12 | 4 quiet killers: info overload · no practice · no feedback · marketing | **2×2 grid** of killers |
| c13 | Formula: Profitability = Knowledge + Experience + Discipline + Execution | **Formula row** (K + E + D + X), K greyed, others lime |
| c14 | Bottom line: process not single trade; build+follow system; next lesson | **Bottom line** statement + next-lesson card |

Timing rule: land each reveal on its word onset (from `l3_onsets.txt`), scenes fade in/out
with `sA()`, nothing static > ~3s. Then render (30fps, 5 parallel chunks), encode with
`l3_audio.m4a`, deliver. COSMO integration decided after visual approval.

## Rollout order
L3 (this) → L4 (retail money, scripts_v4) → L5 (level-2, needs script id) → Signals (scripts_sig, already close).
