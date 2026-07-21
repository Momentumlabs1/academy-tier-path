# Interaktiver Videokurs — Evidenzbasiertes Design-Blueprint (Beginner-Kurs)

Stand: 2026-07-16 · Basis: Deep-Research mit 25 adversarial verifizierten Befunden (Quellen unten je Abschnitt)
Zielgruppe: komplette Einsteiger, Funnel-Stufe Start → Foundation (erste ~100 € Einzahlung).

---

## 1. Was die Forschung hart belegt

### In-Video-Quizzing („interpolated testing")
- Quiz-Checkpoints ca. **alle 5–6 Minuten Video** halbieren Gedankenabschweifen (19 % vs. 39–41 %) und heben die Abschlusstest-Leistung massiv (90 % vs. 68 % ohne Tests). *(Szpunar/Schacter, PNAS 2013)*
- Der Effekt repliziert online (d ≈ 0.24–0.38) und hält mind. 24 h an (d = 0.32). *(Nature Comm. Psych. 2025; PMC 12109270)*
- **Entscheidend: Die Fragen müssen das gerade Gesehene abfragen.** Generische „Engagement-Breaks" ohne Inhaltsbezug bringen nichts. *(PMC 12109270)*
- Quiz **nach** dem Inhalt schlägt Quiz davor um Faktor ~3; mehr Wiederholungen = mehr Effekt (Meta-Analyse, ~50.000 Schüler/Studenten, 573 Experimente). *(Yang et al. 2021, via Frequent Quizzing 2023)*

### Feedback
- Quiz **ohne Feedback bringt fast nichts** — mit sofortigem Feedback verdoppelt sich der Lerneffekt (Meta-Analysen: Rowland 2014, ×2; Yang 2021, ×1.5). RCT mit 6.100 MOOC-Lernern bestätigt: nur die Feedback-Gruppen schlugen die Kontrolle. *(Lipnevich et al.)*
- Detailliertes Feedback (kurze Erklärung, nicht nur richtig/falsch) > Basis-Feedback.

### Transfer (können, nicht nur wissen)
- Einmaliges Abfragen verbessert nur Wiedererkennung. **Erst ≥3 Abrufrunden** verbessern die Anwendung auf neue Situationen. → Wiederholtes Abrufen über Lektionen hinweg einbauen (Spaced Review). *(Learning & Instruction 2025)*

### Mastery / Gating
- Mastery-Learning hebt Prüfungsleistung im Schnitt um **d = 0.52** (50. → 70. Perzentil, 108 kontrollierte Studien) — und hilft **schwächeren Lernern am meisten** (= genau unsere Einsteiger). *(Kulik/Kulik/Bangert-Drowns 1990)*
- Mastery-Testing (Quiz-Kriterium vor dem Weiterkommen) wirkt positiv; **strengere Schwellen wirken stärker**. *(49-Studien-Meta)*
- **Warnung:** Strikt selbstgetaktete Gating-Systeme senken die Abschlussquote. → Gating ja, aber mit sofortigen, unbegrenzten Retries und ohne Wartezeiten.

### Quiz-Angst
- Häufige Low-Stakes-Quizze REDUZIEREN Angst (72 % weniger Prüfungsangst, 91 % empfinden Retakes als entlastend). Low-Stakes lernt genauso gut wie High-Stakes. → Checkpoints ungraded anfühlen lassen, Punkte nur als Bonus.

### Geld-Belohnungen (Funded Challenges)
Die SDT-/Crowding-Out-Claims haben die adversariale Verifikation nicht bestanden → dünnere Evidenzlage, konservativ designen:
- Belohnung als **Meilenstein-Anerkennung** framen („Du hast die Basis gemeistert → wir funden deine erste Challenge"), nicht als Bezahlung pro Aufgabe.
- **Kompetenz-kontingent** (an Mastery-Level gebunden), nicht verhaltens-kontingent (nicht pro Klick/Video) — das erhält Autonomie- und Kompetenzerleben.
- Ein großes, seltenes Ziel > viele Mikro-Zahlungen.

---

## 2. Das konkrete System (Build-Spezifikation)

### Checkpoint-Architektur pro Lektion (Video 5–8 Min)
- **1 Checkpoint je ~2,5–3 Min Video** (bei 7 Min → 2–3 Checkpoints + Endquiz). Unsere Timelines sind sekundengenau bekannt → Checkpoint exakt am Stations-Ende platzieren.
- Fragetyp: 1–2 Fragen Multiple Choice / True-False **über die gerade abgeschlossene Station**; ab Lektion 2 zusätzlich je 1 **Rückblick-Frage** aus einer früheren Lektion (Spaced Retrieval, für Transfer).
- **Sofortiges erklärendes Feedback** (1–2 Sätze, warum richtig/falsch), danach automatisch weiter.
- Falsch beantwortet → Frage wandert in den „Review-Stapel" der Lektion und kommt im Endquiz erneut (≥3 Abrufe pro Kernkonzept über den Kurs verteilt).

### Scoring & Mastery
- **XP:** +10 pro richtiger Checkpoint-Antwort, +5 bei richtigem Retry, +20 pro Endquiz-Frage. Kein XP-Abzug für Fehler (Low-Stakes-Gefühl).
- **Mastery-Level pro Lektion:** Bronze ≥ 50 % · Silber ≥ 75 % · Gold = 100 % (Endquiz).
- **Gating: Bronze (≥ 50 %) schaltet die nächste Lektion frei** — Checkpoints im Video bleiben überspringbar (Autonomie), aber übersprungene Fragen zählen als offen und landen im Endquiz. Retries: sofort, unbegrenzt, mit neu gemischten Varianten. Kein Zeit-Lockout (Evidenz: strenge Selbsttaktung killt Completion).
- Silber/Gold sind optional („Perfektionisten-Schiene") und füttern die Belohnungsleiter.

### Ziel-Leiter & Belohnungen (Beginner-Kurs, 6–10 Lektionen)
| Meilenstein | Bedingung | Belohnung |
|---|---|---|
| Erster Schritt | Lektion 1 mit Bronze | Badge + Freischaltung Tools-Seite |
| Halbzeit | Lektionen 1–4 Bronze | Badge + Demo-Signale-Vorschau |
| **Kurs gemeistert** | Alle Lektionen Bronze + Abschlussquiz ≥ 75 % | **50-€-Funded-Challenge** |
| Gold-Lauf | Alle Lektionen Gold | **100-€-Funded-Challenge** + „Founding Trader"-Badge |
- Proximale Ziele (nächster Checkpoint, nächste Lektion) + ein distales Ziel (Challenge) — klassische Goal-Setting-Struktur.
- Challenge-Vergabe an Mastery gebunden → belohnt Kompetenz, nicht Konsum; genau die Struktur, die Crowding-Out-Risiken minimiert.
- Kein Leaderboard in V1 (bewusst verschoben).

### Datenmodell (Supabase, Skizze)
- `course_checkpoints` (lesson_id, t_seconds, question_id)
- `quiz_attempts` (user_id, question_id, correct, attempt_no, context: checkpoint|endquiz|review)
- `lesson_mastery` (user_id, lesson_id, score_pct, tier bronze/silver/gold, unlocked_next)
- `xp_ledger` (user_id, delta, reason)
- `reward_claims` (user_id, milestone, status pending/granted)

### Player-Verhalten
- Video pausiert hart am Checkpoint (Overlay im Brand-Design), „Überspringen"-Link klein aber vorhanden.
- Fortschrittsbalken mit Checkpoint-Markern (sichtbare proximale Ziele).
- Nach letzter Station: Endquiz-Screen (alle offenen + falschen Fragen), dann Mastery-Ergebnis + XP-Summe + nächstes Ziel.

---

## 3. Warum genau so (Kurzbegründung je Entscheidung)
1. Cadence 2,5–3 Min statt 5–6 Min der Studien: unsere Videos sind dichter als Uni-Vorlesungen; Stationsgrenzen sind natürliche Abfragepunkte — nie „mitten im Satz".
2. 50 %-Gate wie vom Product-Owner gesetzt; Forschung sagt „strenger = mehr Lerneffekt", daher Silber/Gold als freiwillige strengere Schiene obendrauf, ohne Completion zu gefährden.
3. Unbegrenzte Sofort-Retries: einziges belegtes Gegenmittel gegen den Completion-Malus von Mastery-Gating.
4. Skip erlaubt: Autonomie erhalten; übersprungene Fragen kommen im Endquiz wieder → Lerneffekt bleibt.
5. Geld-Belohnung nur an Meilensteine: konservativ gegenüber Motivation-Crowding, maximal wirksam als distales Ziel.
