# Cosmo-Video-Brain — Onboarding- & Logik-Videos der Academy

> Zentrale Doku für die Video-Produktion (Dashboard-Videos, Unlock-Videos, später Content/Reels).
> Session-Brain: Diese Datei hält alles fest, was chatübergreifend gemerkt werden muss. Stand: Juli 2026.

---

## 1. Funnel-Kontext (warum diese Videos existieren)

1. Leads kommen über gebrandete Landing Pages von Themen-Pages / Influencern.
2. Klick auf „Registrieren" auf der Landing Page → Registrierung **bei uns** → User landet **direkt im Dashboard** (keine zweite Landing Page dazwischen).
3. Im Dashboard läuft das **Onboarding-Video**: erklärt dem Lead, was hier los ist.
4. CTA: erste Einzahlung beim Broker (Minimum **100 €**).
5. User kommt vom Broker zurück → nächstes Video wird freigeschaltet: **Glückwunsch-Video** passend zum Einzahlungs-Level.
6. Pro höherem Einzahlungs-Level gibt es jeweils ein eigenes Glückwunsch-/Unlock-Video.

## 2. Video-Liste (Produktions-Backlog)

| # | Video | Trigger | Status |
|---|---|---|---|
| 1 | **Onboarding / „Was ist hier los"** | Erster Dashboard-Besuch nach Registrierung (vor Einzahlung, sieht jeder) | Skript offen |
| 2 | Glückwunsch **Foundation** (100–999 €) | Erste Einzahlung ≥ 100 € | offen |
| 3 | Glückwunsch **Foundation+** (1.000–1.999 €) | Upgrade | offen |
| 4 | Glückwunsch **Operator** (2.000–4.999 €) | Upgrade | offen |
| 5 | Glückwunsch **Operator+** (5.000–9.999 €) | Upgrade | offen |
| 6 | Glückwunsch **Elite** (10.000–24.999 €) | Upgrade | offen |
| 7 | Glückwunsch **Elite+** (25.000–49.999 €) | Upgrade | offen |
| 8 | Glückwunsch **Black** (50.000 € +) | Upgrade | offen |
| 9+ | Freier Content / Reels (aufbauend auf dem Workflow) | — | später |

## 3. Inhaltliche Pflichtpunkte — Onboarding-Video

- Was die Academy bietet: **Signale**, **Education/Lektionen**, **Live Calls** — gestaffelt nach Einzahlungs-Level (Perks-Staffel, siehe `verguetung-modell.md` §4/§8-A).
- **Transparenz-Block (Pflicht):**
  - Die Einzahlung (min. 100 €) ist und bleibt **das Geld des Users** — liegt auf SEINEM Broker-Konto und kann jederzeit wieder ausgezahlt werden.
  - Wir arbeiten mit dem Broker zusammen und bekommen eine **Provision** — deshalb kann das Angebot (Signale, Education, Calls) ohne Abo-Gebühr laufen. Das wird offen gesagt.
- CTA: erste Einzahlung tätigen → schaltet das nächste Level frei.
- Abschluss: viel Spaß wünschen, positiver Ausblick.
- ⚠️ **Empfehlung (rechtlich, EU/AT):** kurzer Risikohinweis zu Trading/CFD gehört in Marketing-Material — als eleganter One-Liner + Einblendung lösen, nicht weglassen.

## 4. Stil-Guide (alle Videos)

- **Modern, cool, clean, einfach** — aber mit **organischem, schnellem Flow**, leicht cineastisch.
- Realitäts-Tricks: Am Anfang „richtet sich die Kamera zurecht" (Mikro-Reframing), leichte **Schärfe-Verlagerung/Autofokus-Wobble**, lebendige **Zooms/Punch-Ins** statt statischer Frames.
- Bildschirm-Inhalte (UI, Charts, Präsentationsflächen) wirken wie echte Screen-Captures, bauen sich animiert auf (Loader → Chart → Live-Preis pulsiert — wie im D-VP-Video aus dem Admin-Chat).

## 5. Produktions-Workflow (Hybrid: Code + KI)

**Grundprinzip: Die KI animiert NUR den Charakter (Cosmo), nie das ganze Bild.**
Wenn die Video-KI den kompletten Frame animiert, entstehen Artefakte an eigentlich statischen UI-Elementen. Deshalb:

1. **Hintergrund/Screen-Content = 100 % Code** (Charts, Dashboards, Text, Präsentation, Kamerafahrten) — wie die bisherigen Chart-Videos im Admin-Chat („100 % Code").
2. **Cosmo-Charakter = KI-animiert, isoliert** (User liefert die hochauflösenden Charakter-Bilder; KI generiert nur den Charakter-Clip, idealerweise mit Alpha/Greenscreen).
3. **Compositing = Code**: Charakter-Clip wird über den Code-Hintergrund gelegt (Chroma-Key/Alpha-Overlay).
4. Skript, Szenenplan und Timing entstehen komplett im Chat, **bevor** gerendert wird → jeder KI-Render-Versuch sitzt, Credits werden gespart.
5. Länge: Onboarding kann lang sein (bis ~10 Min. möglich per Code-Rendering); Unlock-Videos kurz (~15–45 s).

### Rollenteilung
- User liefert: Cosmo-Bilder (i2i high-res existiert schon, siehe Zeko-Commits), ggf. Screenshots/Assets, Feedback.
- Claude baut: Hintergrund-Renderings, Szenen, Skripte, KI-Prompts für die Charakter-Clips, Compositing, Export.

## 6. Tech-Stack (Empfehlung aus Recherche Juli 2026)

> _Wird nach Abschluss der Framework- & Compositing-Recherche hier eingetragen._

## 7. Session-Organisation

- **Dieser Chat = „Cosmo-Trade-Gehirn"**: Video-Logik der Academy + darauf aufbauender Content.
- Der bisherige Admin-Chat (Session `session_01DQYNU7oC6wYhk1ASNyHmkR`) macht die Academy fertig und läuft aus (Kontext voll).
- Branch dieser Session: `claude/content-workflow-tools-pgrcm0`.
- Alles Wichtige wird in diese Datei geschrieben und gepusht — Sessions sind ephemeral.
