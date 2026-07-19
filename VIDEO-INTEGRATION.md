# Funnel-Stammbaum & Video-Integration (Cosmos Candles Academy)

Für das Video-Chat: **wo jedes Video im Funnel sitzt, welche Datei es erwartet,
Ziellänge & Zweck.** Alle Videos = **EIN Cosmo-Video für ALLE Partner** (Cosmo
ist der Star). Der Partner ist nur ein Accent (Logo/Farbe/Name/Telegram) —
**niemals in den Videos**, nur drumherum in der UI.

Video-Dateien gehören nach `public/` im Web-Projekt (Vite servt sie unter `/`).

---

## Der komplette Flow (Stammbaum)

```
Partner-Landing  /<partner-slug>        (co-gebrandet: Partner-Farbe + „× Cosmo")
   │  ├─ 🎬 VIDEO A  (Pitch)            → public/pitch.mp4
   │  ├─ Sektion „Du kaufst hier nichts" (Broker-Deal erklärt)
   │  ├─ Live-Signal-Demo + Tiers + FAQ
   │  └─ CTA „Kostenlos registrieren"
   ▼
/registrieren                           (schlank: E-Mail + Passwort)
   │  └─ nach Signup →
   ▼
/willkommen                             (Auffang-Schritt, Cosmo)
   │  ├─ 🎬 VIDEO B  (Intro/Modell)     → public/intro.mp4
   │  ├─ €0-Einzahl-Leiste → leuchtet nach Video auf (Foundation-Levels)
   │  └─ CTA „Jetzt einzahlen & freischalten" → Broker
   ▼
BROKER (extern)                         Einzahlung ab €100
   │  └─ Deposit erkannt (broker-webhook) → User zurück ins Dashboard
   ▼
Dashboard  /                            (co-gebrandet, deposit > 0)
   ├─ 🎬 VIDEO C  (Willkommen/Gruppen)  → public/welcome.mp4
   ├─ 🎬 VIDEO D  (Signal kopieren)     → public/signals-tutorial.mp4
   └─ alle Locks fallen weg (Signale, Lektionen, Tools frei)
```

Solange **deposit = 0**: Einzahl-Karte glüht, Premium-Kacheln sind
verschwommen + pulsierend gesperrt („mit erster Einzahlung freischalten").
Sobald **deposit > 0**: Locks weg, Video C + D erscheinen oben (dismissbar).

---

## Video-Slots (was das Video-Chat rendern muss)

| # | Datei (`public/`) | Wo im Funnel | Ziel-Länge | Inhalt / Skript |
|---|---|---|---|---|
| **A** | `pitch.mp4` | Partner-Landing, oben | ~45–60 s | **Pitch.** „Das ist Cosmos Candles." Was du bekommst (Live-Signale, Academy, Community), warum kostenlos. Endet: „Registrier dich kostenlos & schalt alles frei." Energetisch, kein Fachchinesisch. |
| **B** | `intro.mp4` | `/willkommen`, nach Registrierung | ~30 s | **Modell/Auffang.** „Du zahlst nichts an uns — du finanzierst dein eigenes Broker-Konto, wir verdienen am Broker. Hier oben siehst du deine Einzahl-Leiste: aktuell €0. Zahl ein, um alles freizuschalten." |
| **C** | `welcome.mp4` | Dashboard, nach Einzahlung | ~60 s | **Willkommen.** „Du bist offiziell drin." Wie du in die Telegram-Gruppen kommst, was wo ist, wie du startest. Herzlich. |
| **D** | `signals-tutorial.mp4` | Dashboard, nach Einzahlung | ~90–120 s | **Signal kopieren.** Praktisch: Signal lesen (Entry/SL/TP) → in Broker-Konto übernehmen → kurz Risk-Management. Screen-Recording + Gesicht. |

**Alle Videos:** Ich-Perspektive (Denis/Cosmo), Deutsch, dasselbe Video für alle
Partner. Kein Neu-Generieren pro Partner. Format 16:9, MP4/H.264.

---

## Was noch scharfgeschaltet wird (Broker-abhängig, TradeQuo-API)

- **Deposit-Erkennung:** Broker postet an `broker-webhook` (`event:"deposit"`),
  setzt `members.deposit` → Locks fallen, Video C/D erscheinen automatisch.
- **Auto-Zurückholen:** Broker-Return-URL zurück auf `cosmos-candles.com/`,
  damit der User nach der Einzahlung nicht verloren geht.

Bis dahin sind alle 4 Video-Slots **verdrahtet** — es fehlen nur die
gerenderten Dateien in `public/`.
