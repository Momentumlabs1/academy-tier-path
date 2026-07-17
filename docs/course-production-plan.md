# EnterTrade Academy — Beginner-Kurs Produktionsplan

Stand: 2026-07-17 · Ziel: fertiger Beginner-Kurs (Video 1 → 5 → 6), alle Videos **voll animiert**
(Motion-Graphics-Stil), keine statischen Kamerafahrten mehr. Endziel langfristig: interaktives Game.

## Neuer Animations-Standard (verbindlich für ALLE Videos)
- **Szenen-basiert** statt langer Kamerafahrt über ein Standbild.
- Jede Szene **~8–20s**, komplett durchanimiert: Elemente fliegen/morphen rein, Charts zeichnen
  sich live, Zahlen zählen hoch, echte Szenenwechsel (Hard-Cut / Wipe), nie länger als ~3s still.
- **COSMO-Bubble** bleibt durchgehender Erzähler; die Szene dahinter wechselt aktiv mit dem Gesprochenen.
- Referenz-Look: „Copy Signals Like A Pro" + das 1,5-Min voll-animierte Video.
- COSMO nur Face (Hedra) auf Magenta gekeyt; alle Charts/Screens/Boards **code-gerendert** (nie KI).
- Stimme „Harry", Englisch, organische Pacing (Pausen dürfen sein, aber nie tote Standbilder).

## Bestand & Zustand
| # | Titel | Länge | Datei | Zustand | Aktion |
|---|-------|-------|-------|---------|--------|
| Intro | Welcome/Einleitung | – | (fehlt) | Tim macht parallel | abwarten, am Anfang einsetzen |
| S | Copy Signals Like A Pro | 3:00 | signals_v1_send.mp4 | **gut** (Stil = Ziel) | kurze Einleitung davor, früh im Kurs platzieren |
| 1 | What Is Trading | 4:00 | lesson1_TH11_send.mp4 | Board zu statisch | **komplett neu animieren** (Referenz zuerst) |
| 3 | Why Most Traders Lose Money | 8:39 | lesson3_final5_send.mp4 | Board-Pan | komplett neu animieren |
| 4 | What Is Retail Money? | 7:10 | lesson4_v2_send.mp4 | Board-Pan | komplett neu animieren |
| 5 | What Is Level 2 Data? | 5:21 | lesson5_final_send.mp4 | **besser** (Deepchart) | Feinschliff auf neuen Standard |
| 6 | (aus Google Drive) | ? | Drive | **unbekannt** | Drive aktivieren, sichten |

Offene Punkte: Drive-Connector in DIESEM Chat aktivieren → Video 6 + evtl. fehlendes Video 2 sichten.

## Phasen
- **P0** Drive aktivieren, Video 6 + fehlende Videos sichten, Reihenfolge final festzurren.
- **P1** Lesson 1 „What Is Trading" — erste ~60s als voll-animierte **Referenz** bauen → Tim-Freigabe zum Look.
- **P2** Lesson 1 komplett auf neuen Standard.
- **P3** Lesson 3 + Lesson 4 neu animieren.
- **P4** Lesson 5 Feinschliff + Signals-Video Einleitung/Angleich.
- **P5** Kurs assemblen (Intro → Signals → L1 → L3 → L4 → L5 → V6), final ausliefern + in Academy-App einbinden.

## Academy-Integration (Backend im anderen Chat)
- DB-Ziel: Supabase-Projekt **momentum-hq** (`qrgvltpakkubtkeukypa`, Org MOMENTUMLABS/Pro). Kein neues Projekt.
- Videos werden in den Lesson-Seiten eingebettet; Kursstruktur/Fortschritt/Quiz über die bestehenden Repo-Migrationen.
