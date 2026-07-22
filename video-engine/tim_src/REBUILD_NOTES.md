# Lesson1 v5 Umbau (User-Feedback v4)
FIXES:
1. KEINE PAUSEN: TTS neu mit speed 1.0 (13 clips, Harry 4d97785c-3852-452a-b542-d2c7bd921f75).
   Timeline DYNAMISCH: hold_i = clipDur_i + 0.8s, pans 1.8s. Video wird ~5-6min. timeline.json ablegen.
   Narration = concat(clip + 0.8s pad je Station). Reveal-Anker = pan-Start je Station.
2. Station B Format: slideCard Höhe 1240->590 (1030..1620); closing bar y bleibt 1900 -> auf 1680 hoch? Inhalt endet 1560; bar 1680-1900. Kamera-Views B neu.
3. Kamera-Views: nichts anschneiden (Titel ganz rein oder ganz raus).
4. Intro: Monitor-Rects programmatisch aus plate_v3.png messen (dunkle Rechtecke, lum<40, PNG-Decoder wie in motion-analysis).
   Neuer Talking-Take: hedra-avatar (26f0fc66-152b-40ab-abed-76c43df99bc8), start_keyframe cosmo_mag_medium Asset (aus hedra/v3assets.json), audio ids.json intro, prompt "calm minimal hand movement".
   Key: colorkey 0.34:0.08 + NUR 1x erosion (Hände-Geister!).
   Zoompan-4K-Prescale beibehalten, Subs (subs.html cues ok), introbg mit gemessenen Rects.
5. Assemble wie v4 (Layer). Alle Dateien in scratchpad/tim_src.
STATUS: Schritt 1 gestartet.
STATUS UPDATE: TTS v5 ok (225s Timeline, narration_v5.m4a), board.html gepatcht (dyn. Timeline+B-Format),
introv5_raw ok (ruhige Hände). Monitor-Koordinaten final: L x77,y438,388x257; R x514,y462,339x232.
NOCH: introbg5+introv5_prep neu (diese Koords), board render 0..6763 (2 chunks, renderchunk.mjs),
bubble 6763 frames (envelope aus narration_v5 -> ../hedra/envelope.js, fade (i/30-221)/3, renderbub3.mjs),
assemble: board+bubble+narration_v5 -> board_final5; concat introv5_prep+board_final5 -> lesson1_v5; compress 470k; senden.
Restpunkt: leichter Magenta-Saum am Shirt (colorkey 0.35 testen), Formatcheck Hold-Stills.
V6 STAND (nach User-Blocker):
- Monitor-Quads per Flood-Fill gemessen: L (47,312)(315,338)(315,504)(47,537), R (346,340)(598,349)(598,491)(346,500) [plate 1376x768].
- introbg6.html = Corner-Pin via CSS matrix3d Homographie, Inhalt = echte Website-Scrolls (ds/=Dashboard, ls2/=Lessons, je 435 Frames 1280x960, recdash.mjs, vite dev :8080).
- Kamera-Holds gefixt (Titel/Badges nie mehr angeschnitten): H2 y1240, H3 y1230, H6 y1055, H7 y1080, H8 x3800 y1198 z0.72, H10 y1290, H11 y1300 z0.8, H12 x8470 y2420 z0.8.
- sticky(): Akzentbalken inset (x+2,y+10,h-20); Station-B Boxen zentriert bx=3280/3800/4320.
- lesson1_v6.mp4 (4:00) + _send geliefert. qaholds.mjs rendert 13 Hold-Stills als QA.
V8 STAND:
- Neue Plate hedra/plate_v4.png (moderneres Setup: curved Dual-Monitore, Webcam, RGB, Gaming-Stuhl, keine Dose; gen via hedra/genplate_v4.py, ROOM-Ref e95a03b5).
- Quads v4 per Flood-Fill: L (43,307)(323,337)(322,505)(43,539), R (338,338)(601,347)(602,491)(338,503) + Kontur-Polygone in tim_src/quads_v4.json (curved Screens -> clip-path).
- KEIN zoompan mehr (Vibrieren!): introcomp.html komponiert ALLES im Browser (Plate + Screens matrix3d + COSMO ck/-PNGs 25fps->30fps map) + Kamera als CSS scale (z=1..1.05..1.03). rendercomp.mjs -> ic/ 435 Frames.
- COSMO alpha frames: ck/c%05d.png (362, aus introv5_raw gekeyt, colorkey 0.35 + 1x erosion).
- SFX synthetisiert (sfx/): whoosh (pink noise 0.7s), pop (720Hz decay), rain (Ambience). Board-Bed: whooshes an 12 Pan-Starts, Pops 37.4/101.6/164.4/207.9, amix trick dropout_transition=1000000 + volume=n. Intro: rain 0.5 + whoosh@0.2s.
- lesson1_v8.mp4 = introv8_prep + board_final7. Levels ok (max -1dB).
V10/V11 STAND (FREIGABE-KANDIDAT):
- Plate final: hedra/plate_v5b.png (L-Desk, Akustikpaneele, STREAM ON, Mic-Arm, Pflanze, leerer Stuhl). Quads: tim_src/quads_v5.json (L 328,279..; R 545,296..).
- introcomp3.html = finaler Compositor: L Screen STATISCH (ds2/f00000.png), R tvchart (tv/, tvchart.html BTCUSDT-Look, letzte Kerze tickt 3x/s, neue Kerze alle 5s), Regen+LED-Puls Canvas-FX, COSMO left:555 top:330 1360x764.
- Magenta-Saum GELÖST: ck/ neu mit colorkey 0.36:0.08 + geq-Despill (r,b -= max(0,min(r,b)-g)*0.85).
- lesson1_v11 geliefert. User: Zimmer "richtig genial", Regen gut, Bilder fix gut.
- NÄCHSTES: Video 5 Rebuild (Miro-Theorie Level-2-Daten + Deepchart App-Demo mit realistischen Klick-Kausalketten, menschliche Mausbewegung).
VIDEO 3 FERTIG (lesson3_v1):
- Quelle: v3_screen.mov (Drive 1OcEBVHCZoGv2N7JnKmKfhlhT5jvYen2O, 22min Miro) — Inhalte per Frame-Analyse übernommen.
- board3.html: 5 Stationen (Hard Truth / 5 Account Destroyers 3+2 Grid / Emotion Trap + Loss Loop / Hidden Reasons + Formel / Bottom Line), 11 Kamera-Holds, voice-driven (timeline_v3.json, 14 Harry-Clips tts3/, 213.34s).
- Loss-Loop px0=5380 (Bubble-Ecke unten rechts freigehalten!). Merke: Welt-Content nie in Kamera-Ecke unten rechts (Bubble 380x460 @W-24/H-12).
- narration_v3.m4a = Clips+0.8s Pads+1.8s Pan-Gaps; envelope3.js; bubble3.html (Fade 209.5s); SFX-Bed 9 Whooshes/5 Pops.
- Gleiches Verfahren für Video 4/6/Signale: Frames ziehen -> Struktur lesen -> Scripts EN -> TTS -> boardN.html -> Pipeline.
VIDEO 4 FERTIG (lesson4_v1, 3:44):
- Quelle v4_screen.mov (Drive 18yXG81AUq8f1Zr3OZAhOzpQRPislPjmy, 19:49 Miro).
- board4.html: 5 Stationen (What Is Retail Money / Everyone Learns The Same + Kette / Why Classic Tools Fall Short + 4 Fragen / Solution LEVEL 2 DATA + Retail-vs-Institutions / The Shift BEFORE-INSIGHT-CHANGE-RESULT + Bottom Line).
- 11 Holds, timeline_v4.json (224.16s), tts4/ (14 Harry-Clips; Hedra rate-limitet ab ~10 Clips -> Retry-Loop nötig!), narration_v4.m4a, envelope4.js, bub4/, bf4/, sfx/board4_bed.wav.
- MERKE: S3/S4 chapterCard cy=790 (2-Zeiler kollidiert sonst mit Badge bei 530).
VIDEO 5 FERTIG (lesson5_v1, 2:51):
- Quelle video5_1.mov lokal (10:55 Miro-Theorie + Deepchart-Live-Teil).
- board5.html: 5 Stationen (What Is Level 2 Data / One Candle Two Readings mit gezeichneter Kerze / Supply & Demand 3 Zustaende / What Really Moves Markets 4 Pills + durchgestrichen "Not indicators" / Why This Matters + Live-Teaser). 8 Holds, timeline_v5video.json (Board 140.22s).
- DEMO-SEGMENT: deepchart_live_v2.mp4 (Code-Engine) per tpad auf 30.95s, ans Board konkateniert (lesson5_visual.mp4); Clips c11/c12 erklaeren Orderflow-Bubbles (cyan=Buyer, magenta=Seller, Groesse=Volumen).
- Eine Narration ueber alles (171.17s), envelope5/bubble5 durchgehend, SFX inkl. Demo-Uebergang bei 140.22.
- OFFEN evtl.: Video 5 Teil 2 (Drive) = ausfuehrlichere App-Demo mit Klick-Kausalketten; Video 6 + "Signale kopieren" ausstehend.
NACHTSCHICHT-STAND (Kurs fertig):
- lesson3_final (8:39) = Talking-Head-Zimmer-Intro (introv3L_raw, ck3/, introcomp5.html) + board3L-Langfassung. lesson4_v2 (7:10) board4L. lesson5_final (5:21) board5L + verlangsamte Demo (Dead-Air-Fix Station 3: Sticky bei T05+1.2).
- signals_v1 (3:00) = sig_intro (COSMO-Closeup gekeyed+despillt ueber sigintrobg) + sig_stage (sigstage.html: Step-Karten + Phone-Frame; phone.html: Messenger-Signal + Broker-App, priceAt() kausal korrekt: Entry->TP1 synchron zu c07; rolling candles 8s).
- Alle Boards: Auto-Fit-Titel, Punkt-Gating (tEnd), Spring-Reveals, Sweeps, Orbs, Kamera-Atmen (±0.6%/6px), enge Holds.
- Hedra-Verbrauch Nachtschicht: ~2 Videos (closeup 16s + intro 17.8s @7cr/s*0.5) + 20 TTS ≈ 130 Credits.
- MORGEN: Gamification/interaktiver Player nach docs/interactive-course-blueprint.md.
FINAL-FIXES (17.07):
- COSMO-Intro V3: cosmo_seated_mag.png = COSMO SITZEND IM STUHL als EINE Hedra-Generierung
  (Stuhl in der Figur enthalten) -> introv3seated_raw -> cks/ (Magenta+Stuhl zusammen gekeyt)
  -> introcomp6.html (KEINE separate Stuhl-Ebene mehr!) -> ic6/. z*1.34 cx1120 cy560, cosmo left520.
- DRIFT-BUG: Kamera-Atmen (const br=... +6sin +5cos *br) driftete fixierte Elemente bei Halts.
  RAUS in board3L/4L/5L -> const c=c0. Verifiziert: YMAX=1/255 zwischen fixen Zeitpunkten.
  Alle 3 Boards neu gerendert. board.html (L1) + sigstage.html (Signals) hatten NIE Atmen -> clean.
- Finale: lesson3_FINAL, lesson4_FINAL, lesson5_FINAL (send-Versionen). Drive: Ordner
  "EnterTrade Kurs-Assets" (1blLoXBLjBOeFGMwv7tAA3tZw336xTjpY) + README hochgeladen.
  Video-MP4s koennen nicht per MCP hoch (Base64-Inline-Limit) -> im Chat geliefert.
