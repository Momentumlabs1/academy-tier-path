# Partner-Landing-Intro — Standard-Template (pro Brand neu generiert)

> Das kurze Willkommens-/Info-Video auf der **Partner-Landingpage** (`/<partner-slug>`),
> das läuft BEVOR der Besucher sich registriert. Cosmo bleibt der Star, die Partner-Brand
> ist der Akzent (Logo, Name, Akzentfarbe). Ziel-Länge: **30–40 Sekunden**.
>
> Platzhalter pro Brand ersetzen:
> `{{BRAND}}` = Partner-Markenname · `{{ACCENT}}` = Akzentfarbe (hex) ·
> `{{LOGO}}` = Partner-Logo/Initialen · `{{TELEGRAM}}` = Partner-Telegram (optional)
>
> Sprecher: Cosmo (ElevenLabs, du-Form, locker-seriös). VO = Voiceover, [C] = Cosmo-Layer,
> [BG] = Code-Hintergrund (Remotion). Alles außer Cosmo = 100 % Code, damit's nie AI aussieht.

---

## Warum dieses Video getrennt vom Dashboard-Onboarding ist
- **Partner-Landing-Intro (dieses hier):** ausgeloggt, VOR Registrierung, gebrandet, sehr kurz (~35s). Job = Vertrauen + „registrier dich".
- **Dashboard-Onboarding (existiert schon):** eingeloggt, NACH Registrierung, ~2:20, erklärt die Academy + Transparenz + Einzahlungs-CTA.

Der Flow: Partner-Landing (dieses Video) → „Kostenlos registrieren" → `/willkommen` → Dashboard (Onboarding-Video).

---

## Produktions-Trick für „pro Brand neu"
Cosmo spricht **markenneutral** — kein Brand-Name im gesprochenen Text. So muss der teure
Cosmo-Sprech-Clip **nur EINMAL** generiert werden und passt für ALLE Partner. Das Branding
({{BRAND}}, {{LOGO}}, {{ACCENT}}) kommt zu 100 % per Code als Einblendung dazu → neue Brand =
nur Text/Farbe/Logo im Code tauschen, **kein neuer Cosmo-Render, keine neuen Credits.**

(Wenn ein Partner es unbedingt will, dass Cosmo den Markennamen SAGT: dann 1 kurzer Extra-
Sprech-Clip nur für die Begrüßungszeile — optional, kostet ~0,50 $.)

---

## Skript (35 s)

### Szene 1 — Cold Open (0:00–0:05)
- [BG] Schwarz → *Klick* → Cosmos Kamera geht an: REC-Punkt blinkt, AF-Klammern pumpen, kurzer Fokus-Wobble (Code).
- [C] Cosmo winkt (Clip **C1**), lehnt sich leicht in die Kamera.
- **VO (Cosmo):** „Ey, schön dass du da bist. Kurz was Wichtiges, dann bist du drin."

### Szene 2 — Partner-Badge (0:05–0:10)
- [BG] Cosmos Trading-Room (R1), unten dezent eingeblendet: **{{LOGO}} {{BRAND}}** in {{ACCENT}}, darunter „× Cosmos Candles Academy".
- [C] Cosmo zeigt mit offener Hand nach unten aufs Badge (Clip **C2**).
- **VO:** „Du bist über {{BRAND}} hier gelandet — und {{BRAND}} hat dir was Starkes mitgebracht."
  *(nur diese eine Zeile enthält {{BRAND}} → als Textkarte + Voiceover neutral gesprochen, siehe Trick oben)*

### Szene 3 — Was du bekommst (0:10–0:22)
- [BG] Drei animierte Icon-Karten bauen sich nacheinander auf (Code, jeweils Punch-In):
  1. 📡 **Live-Signale** — „Trade-Calls direkt aufs Handy"
  2. 📚 **Komplette Academy** — „vom ersten Trade bis Orderflow-Profi"
  3. 🤖 **Tools & Live-Calls** — „mehr, je weiter du kommst"
- [C] Cosmo gestikuliert ruhig erklärend am Rand (Clip **C5**).
- **VO:** „Echte Live-Signale, ein kompletter Trading-Kurs und Profi-Tools. Kostenlos — kein Abo, keine versteckte Gebühr."

### Szene 4 — Transparenz-One-Liner (0:22–0:29) ⚠️ Pflicht
- [BG] Ein sauberer Text-Slide: „Dein Geld bleibt deins." + kleine Broker-Konto-Illustration.
- [C] Cosmo Daumen hoch (Clip **C7**).
- **VO:** „Deine Einzahlung liegt auf deinem eigenen Broker-Konto — jederzeit auszahlbar. Wir verdienen über den Broker, nicht an dir. Deshalb ist alles gratis."

### Szene 5 — CTA (0:29–0:35)
- [BG] Großer Button-Puls in {{ACCENT}}: **„Kostenlos registrieren →"**, darüber „20 Sekunden, dann bist du drin."
- [C] Cosmo jubelt / zeigt auf den Button (Clip **C6**).
- **VO:** „Klick auf registrieren — dauert 20 Sekunden. Wir sehen uns drin!"
- [BG] Abbinder: {{LOGO}} {{BRAND}} + Cosmo-Logo, unten winziger Risikohinweis-Ticker: „Trading beinhaltet Risiko — 74–89 % der Retail-CFD-Konten verlieren Geld."

---

## Benötigte Cosmo-Clips (alle aus bestehender Bibliothek — KEINE neuen Credits!)
C1 (Winken), C2 (zeigt runter/rechts), C5 (Erklär-Geste), C6 (Jubel), C7 (Daumen hoch),
C8/Sprech-Clip für die VO-Lippen (P4 + Audio, Hedra/Higgsfield — 1× generieren, für alle Brands nutzbar).

## Was pro neuer Brand getauscht wird (nur Code, ~2 Min Arbeit)
`{{BRAND}}`, `{{LOGO}}`, `{{ACCENT}}` in der Remotion-Composition → neu rendern → fertig.
Der Cosmo-Layer + Voiceover bleiben identisch.
