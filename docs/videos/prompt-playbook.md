# Prompt-Playbook — KI-Clips auf Magenta-Plate (Recherche Juli 2026)

> Ziel: Jeder Clip sitzt beim 1.–2. Versuch. Charakter bewegt sich, Hintergrund bleibt eingefroren, 2D-Stil bleibt.

## Universalregeln (gelten für jedes Modell)

1. **Nur beschreiben, was sich bewegt.** Das Startbild definiert Charakter/Stil/Hintergrund — der Prompt beschreibt NUR die Bewegung. Statisches nochmal zu beschreiben lädt das Modell ein, es zu animieren.
2. **Positiv formulieren.** „No camera movement" kann das Gegenteil auslösen (Runway-Doku!). Richtig: „Camera holds completely static." Verbote gehören ins Negative-Prompt-Feld (wo vorhanden).
3. **Kamera-Lock am Anfang UND am Ende des Prompts** wiederholen; alle Bewegungs-Vokabeln („cinematic", „tracking") aus dem Prompt streichen.
4. **Prompt-Optimizer/Enhancer IMMER ausschalten** (Hailuo `prompt_optimizer:false`, Wan `enable_prompt_expansion:false`, Kling/Veo „enhance" aus) — die Rewriter injizieren Kamerafahrten.
5. **Eine Aktion pro Clip, kurz halten** (3–5 s; max. 2 gleichzeitige Verhaltensweisen wie „geht rückwärts + redet"). Kurze Clips verhindern auch 3D-Drift.
6. **Loops:** Gleiches Bild als Start- UND End-Frame (Kling Start/End-Frames, Veo First/Last) = perfekter Idle-Loop. Clip-Ketten: letztes Frame von A = Start von B.
7. **Multishot-Konsistenz:** Immer dieselbe Plate als Startbild + der Suffix-Block byte-identisch; nur der eine Aktions-Satz variiert. Seed fixieren, wo möglich (Wan/Veo/Runway; Kling-API hat keinen Seed).

## Standard-Suffix (an JEDEN Prompt anhängen, wörtlich)

> Flat 2D cel animation, clean line art, flat colors. The character stands against a flat, solid, evenly lit magenta background like a studio chroma backdrop. The background stays perfectly still and unchanged for the entire clip. The character casts no shadow. Fixed camera, locked-off tripod shot, the camera holds completely static, no zoom.

## Master-Negative-Prompt (Kling / Wan / Veo — Hailuo & Runway haben kein Negative-Feld)

> camera movement, camera shake, pan, tilt, zoom, dolly, push in, background motion, background change, gradient background, shadow, shadows on background, reflection, vignette, flicker, grain, noise, exposure change, 3d render, CGI, photorealistic, realistic, depth of field, blur, morphing, warping, extra limbs, extra fingers, deformed hands, text, watermark, subtitles, transition, cut, scene change, new objects appearing

- Bei Nicht-Sprech-Clips zusätzlich: `talking, lip movement, mouth opening`
- **Wan-Falle:** Default-Negative von Wan enthält wörtlich „walking backwards" → für unseren Rückwärtsgang-Clip IMMER eigenes Negative setzen, nie den Default lassen!

## Modell-Cheat-Sheet

| Modell | Kamera-Lock | Negative | Loops (Start=End) | Besonderheit |
|---|---|---|---|---|
| **Kling 3.0/2.6** ⭐ | „static shot, fixed tripod" im Prompt | ✅ (2500 Z.) | ✅ Start+End-Frame | cfg 0.6–0.8 für Treue; Motion Brush (App, Static-Brush für Hintergrund!); kein Seed |
| **Veo 3.1** ⭐ | „static camera, locked tripod" | ✅ `negativePrompt` | ✅ First/Last-Frame | Seed ✅; Achtung: generiert Audio → bei stummen Clips „no dialogue" sonst Lippen-Flattern |
| Wan 2.5/2.6 | Layered: „only the character moves; camera static" | ✅ (500 Z.) | ✅ (FLF, providerabhängig) | Seed ✅; flimmeranfällig → „stable exposure, constant lighting" |
| Hailuo 2.3 | **`[Static shot]`** als allererstes Wort | ❌ | ❌ | `prompt_optimizer:false`! Nicht mit anderen Kamera-Direktiven kombinierbar |
| Runway Gen-4.5 | „Camera holds completely static" | ❌ (nur positiv!) | Keyframes „coming" | Neigt zu wenig Bewegung bei Lock — gut für Idle |

## Chroma-Plate-Erkenntnisse

- Farbe im Prompt **explizit benennen**: „flat solid magenta background". (Grün ist als Konzept bekannter — Magenta funktioniert, aber redundant beschreiben.)
- Schatten sind der Plate-Killer #1 → „the character casts no shadow" in jeden Prompt + Negative „shadow".
- Rest-Schimmern im Hintergrund killt der Chroma-Key sowieso.
- **Requisiten (z. B. Stuhl für den Hinsetz-Clip) müssen schon im Startbild sein** — i2v erfindet Objekte unzuverlässig.

## Fertige Produktions-Prompts (Aktions-Satz + Standard-Suffix)

1. **C11 Kamera justieren:** "The cartoon character looks directly into the camera, leans in slightly, and slowly reaches one hand forward toward the camera lens as if adjusting it. The hand appears larger as it comes close to the lens, fingers spread, then the character pulls the hand back and returns to the starting pose. Mouth stays closed, friendly expression. Only the character and the reaching arm move." — 5 s, Kling cfg 0.7–0.8 (höchstes Drift-Risiko der fünf)
2. **C12 Rückwärts gehen + reden:** "The cartoon character faces the camera and talks animatedly, mouth moving in speech, while walking backwards away from the camera in a straight line, becoming smaller in the frame with each step, gesturing with both hands. The character keeps facing the camera the whole time and stays fully in frame. Only the character moves." — 5 s, Kling cfg 0.6; Negative OHNE talking/lip-Zeile
3. **C13 Hinsetzen:** "The cartoon character stands next to the simple chair, turns toward it, bends knees and smoothly sits down on the chair, settles with hands resting on thighs, and remains seated. One continuous natural sitting motion, mouth stays closed. Only the character moves; the chair does not move or deform." — 5 s; **Stuhl muss in die Plate!** (neue Plate P1b: Cosmo + dunkler Stuhl auf Magenta)
4. **C4 Idle-Loop:** "The cartoon character stands still in a relaxed pose, breathing gently — chest and shoulders rise and fall slowly — blinking occasionally, with a very subtle idle sway. Extremely subtle motion. Mouth stays closed. The character returns exactly to the starting pose at the end. Only the character moves." — 3–5 s, **Kling/Veo mit Plate als Start- UND End-Frame** → nahtloser Loop. ZUERST generieren (verifiziert die Plate für alle weiteren Clips)
5. **C2/C3 Zeigen:** "The cartoon character raises one arm and points with the index finger toward the upper right of the frame, holds the pointing pose for a moment while looking in the same direction, then lowers the arm and returns to the starting pose. One clear gesture. Mouth stays closed. Only the character and the pointing arm move." — 4–5 s, Start=End für Loop

## Produktions-Reihenfolge (credit-schonend)

1. **C4 Idle-Loop zuerst** (billigster Test, verifiziert Plate + Stil + Hintergrund-Stabilität)
2. Bei Erfolg: C12 (Kern-Shot), dann C11, dann C13 (mit Stuhl-Plate)
3. Jeder Clip: 1 Generierung → Review → ggf. 1 Retry mit angepasstem Aktions-Satz. Nie mehr als 2 Versuche ohne Rücksprache.
