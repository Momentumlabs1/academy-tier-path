## Visuelle Referenz (aus Screenshot)

```text
┌──────────┬────────────────────────────────────────────┬─────────────┐
│  LOGO    │   nav   nav   nav        [ LIME CTA ]      │  "Best …"   │
│          │ ┌──────────┬──────────┬──────────────────┐ │ ┌─────────┐ │
│ MENU     │ │ Hero 1   │ Hero 2   │ Hero 3           │ │ │ odds 1  │ │
│ ▣ Active │ │ purple   │ wave     │ network          │ │ └─────────┘ │
│ ◯ Item   │ │ image    │ image    │ image            │ │ ┌─────────┐ │
│ ◯ Item   │ └──────────┴──────────┴──────────────────┘ │ │ odds 2  │ │
│ ◯ Item   │ Popular                                    │ └─────────┘ │
│          │ ┌────────────────────────────────────────┐ │ "Popular"   │
│          │ │ Group title (League…)                  │ │ list        │
│          │ │ row · row · row (with lime cells)      │ │ Profit big# │
│ ACCOUNT  │ └────────────────────────────────────────┘ │ avatars     │
│ avatar   │                                            │             │
└──────────┴────────────────────────────────────────────┴─────────────┘
```

Tiefes Lila als Bühne, Lime/Neon-Grün als einziger Funken Akzent, schwarz-violette Karten mit großzügigem `border-radius`, runde Pill-Highlights für aktive Werte.

## Designsystem (komplett neu)

**Tokens in `src/styles.css` (oklch)**
- `--background`: tiefes Royal Purple (~`oklch(0.27 0.18 295)`)
- `--surface-1`: Dark Panel Purple (~`oklch(0.21 0.10 290)`) — Sidebar/Right-Rail
- `--surface-2`: Card Black (~`oklch(0.16 0.05 290)`) — Bento- und Stat-Cards
- `--surface-3`: Inner Purple (~`oklch(0.32 0.16 295)`) — Popular-Reihen
- `--primary` (Akzent): Lime Neon (~`oklch(0.92 0.21 130)`) + `--primary-foreground` near-black
- `--foreground`: weiß, `--muted-foreground`: lila-grau
- `--radius`: `1.25rem` (deutlich runder), Pill-Radius `9999px`
- Zusätze: `--gradient-card-hero`, `--shadow-card`, `--ring-lime`

**Typography**: Space Grotesk (Display) + Inter (Body), eingebunden via Google Fonts in `__root.tsx` `head().links`. Bold Display für Hero-Titel ("Master Live Markets"), nüchterner Body.

**Komponenten-Sprache**
- Karten = dicke gerundete Container mit subtilem inneren Verlauf statt Border
- "Pill"-Werte (Lime-Hintergrund, dunkler Text) markieren aktive/Best-Werte
- Sidebar-Item-Active = Lime-Pill links neben dem Label, Label fett

## Neue Code-Struktur

```text
src/
├── routes/
│   ├── __root.tsx                (Fonts + global head)
│   ├── _app.tsx                  (3-Spalten-Shell mit Sidebar + Header + RightRail)
│   ├── _app.index.tsx            (Dashboard)
│   ├── _app.lessons.tsx          (Lessons-Hub)
│   ├── _app.lessons.$lessonId.tsx (Lesson-Detail)
│   ├── _app.signals.tsx          (NEU: Live-Signale, ersetzt Tier-Seite)
│   ├── _app.tier.tsx             (Membership-Tiers, redesignt)
│   └── _app.settings.tsx
├── components/academy/
│   ├── layout/
│   │   ├── AppShell.tsx          (Grid: Sidebar | Main | RightRail)
│   │   ├── Sidebar.tsx           (logo, menu, account)
│   │   ├── TopNav.tsx            (links + Lime-CTA "Connect Broker")
│   │   └── RightRail.tsx         (odds-style cards, popular, profit, avatars)
│   ├── primitives/
│   │   ├── Card.tsx              (rounded-2xl surface variants)
│   │   ├── PillValue.tsx         (Lime/dark variants)
│   │   ├── SectionTitle.tsx
│   │   └── DemoModePill.tsx      (Lime-getönt, oben rechts)
│   ├── hero/
│   │   ├── HeroBento.tsx         (3 große Karten, generierte Visuals)
│   │   └── HeroCard.tsx
│   ├── lessons/
│   │   ├── LessonGroup.tsx       (gerundeter Group-Container "League of Legends"-Stil)
│   │   ├── LessonRow.tsx         (Zeit/Titel links + 3 Pill-Werte rechts)
│   │   └── LessonCardCompact.tsx (für Detail-Empfehlungen)
│   ├── right-rail/
│   │   ├── SignalOddsCard.tsx    (KT-Rolster-Style: Titel, Wert, Amount-Input)
│   │   ├── PopularList.tsx       (numerierte Items mit Symbol-Tile)
│   │   └── ProfitWidget.tsx      (große Zahl + Avatare)
│   └── tier/
│       ├── TierLane.tsx          (vertikale Lila-Lane, Lime aktueller Tier)
│       └── PerkRow.tsx
└── lib/
    ├── academy-data.ts           (erweitert: signals, popular, profit, avatars)
    ├── format.ts                 (intl-stabil, behebt SSR-Hydration-Mismatch ‚2.750/2,750')
    └── academy-types.ts
```

## Inhalt pro Route (übersetzt aus dem Screenshot in Trading-Academy)

**1. `_app/` (Shell)**
- 3-spaltiges Layout (lg): Sidebar 260px / Main fluid / RightRail 320px
- Mobile: Sidebar wird Drawer, RightRail wird untere Sektion
- Sidebar: Logo "EnterTrade" (Lime-Dot + Wortmarke), MENU-Block (Dashboard, Lessons, Signals, Tier, Settings — aktives Item = Lime-Pill mit Lucide-Icon), Badge "1" Lime auf Signals; unten ACCOUNT mit Bell-Icon + Avatar + Name
- TopNav (oben im Main): Text-Links (Markets · Mentors · Affiliates) + Lime-CTA "Connect Broker"
- Header zeigt DEMO MODE Pill (Lime, dezent) + verifizierter Deposit

**2. `_app/` Dashboard (Hero + Popular + RightRail)**
- HeroBento: 3 Karten mit generierten dunklen Purple-Wave-Visuals (`imagegen` einmalig in `src/assets/`):
  - Karte 1 groß links: "Live Trading Floor" (Particle-Wave-Image)
  - Karte 2: "Daily Signals" (Sound-Wave-Image)
  - Karte 3: "Mentor Network" (Node-Graph-Image)
- Section "Popular": LessonGroup "Foundations" mit 3-4 LessonRow (Zeit · Titel links — 3 PillValues rechts für "Difficulty / Duration / XP", aktives Pill in Lime)
- Section "This Week": zweite Gruppe "Risk & Psychology"

**3. RightRail (sichtbar auf Dashboard + Lessons)**
- "Best Signal" Header
- 2× SignalOddsCard (Asset/Direction/Confidence + "Amount"-Eingabe ghost-style)
- "Popular" Header → PopularList (S-Logo "Stake Market · DICE", grünes Heart-Logo "Gamomot · PLINKO" → ersetzt durch passende Trading-Begriffe: "Top Strategy · Scalping", "Trending · BTC Breakout")
- ProfitWidget: großes "1,452.23" + Trader-Avatare

**4. `_app/lessons`**
- Filter-Chip-Row (Lime aktiv)
- Mehrere LessonGroup-Container nach Kategorie
- Sucheingabe oben (dark surface, runde Pill)

**5. `_app/lessons/$lessonId`**
- Video-Hero-Karte (gleicher Bento-Stil), Title + Meta-Pills (Tier, Dauer, Kategorie)
- "What you'll learn"-Karte, "Recommended next" Reihe aus LessonCardCompact

**6. `_app/signals` (neu)**
- Grid aus SignalOddsCard im Großformat
- Lime-Pills markieren empfohlene Trade-Seite

**7. `_app/tier`**
- Vertikale TierLane (Bronze → Silver → Gold → Platinum), aktueller Tier = Lime-Glow
- Rechts PerkRows mit Lime-Check/grauem Lock

**8. `_app/settings`**
- Dark Profile-Karte im selben Card-Stil; Lime-Save-CTA

## Bugfixes & technische Anpassungen

1. **Hydration-Mismatch (`2.750 / 2,750`) fixen**: `format.ts` mit `formatNumber(n) = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')` (locale-stabil), überall `toLocaleString()` ersetzen.
2. `__root.tsx`: Google-Fonts-Preconnect + Stylesheet via `links`.
3. Sidebar-Breite mit `var(--sidebar-width)` (Tailwind v4 Sidebar-Fix beachten).
4. Bilder via `imagegen--generate_image` (3× 1024×1024 Dark-Purple-Wave-Visuals) → `src/assets/hero-*.jpg`, importiert als ES6-Modules.
5. Keine externen Pakete nötig (MagicUI optional für Border-Beam später).

## Acceptance (was nach Implementierung wahr sein muss)

- Hintergrund ist sattes Lila, NICHT mehr Slate/Navy.
- Sidebar hat dunkles Panel mit abgerundeten Ecken (24px) und Lime-Pill für aktives Item inkl. Icon.
- Dashboard hat 3-Karten-Bento-Hero mit generierten Visuals und großen Display-Headlines.
- Right-Rail ist auf Desktop sichtbar mit Signal-Cards, Popular-List, Profit-Block, Avataren.
- Lime-Akzentfarbe erscheint nur auf: aktive Pill-Werte, CTA-Button, aktivem Sidebar-Item, Badge-"1", Heart/Check-Icons.
- Typography: Space Grotesk Headlines (bold, large), Inter Body.
- Keine Hydration-Warnung mehr in der Konsole.
- Mobile: Sidebar als Drawer, RightRail darunter, Bento stapelt 1-Spalte.

## Umsetzungsreihenfolge (so wird's gebaut)

1. Tokens + Fonts + `format.ts` (Hydration-Fix)
2. Layout-Primitives (`Card`, `PillValue`, `SectionTitle`, `DemoModePill`)
3. Shell: `Sidebar`, `TopNav`, `RightRail`, `AppShell` + `_app.tsx`
4. Hero-Visuals generieren (3 Bilder) + `HeroBento`
5. Lessons-Primitives (`LessonGroup`, `LessonRow`) + Dashboard-Inhalt
6. Right-Rail-Inhalte (Signals, Popular, Profit)
7. Restliche Routen: lessons, lesson detail, signals, tier, settings
8. QA: Preview öffnen, Screenshot vergleichen, Konsole/Hydration checken

Bestätige den Plan, dann lege ich los.