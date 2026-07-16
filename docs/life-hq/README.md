# HQ — Life OS (`/hq`)

Persönliches Command Center / Second Brain für Diego — als Route `/hq` in dieser App,
mobil-first und als PWA installierbar ("Zum Home-Bildschirm").

## Architektur

```
Browser (/hq, client-only)
   │  Login: Supabase Auth (SPYSECRET-Projekt, bestehender Account)
   ├─► SPYSECRET Supabase (bqqmfajowxzkdcvmrtyd)
   │     life_* Tabellen  ── RLS: nur life_owners (Diegos Accounts)
   │     KPI-RPCs         ── life_spysecret_kpis / life_content_kpis / life_visitors_sparkline
   │     Edge Function    ── life-brief (Telegram + Resend-E-Mail + Feed)
   │     pg_cron          ── stündlicher Tick → Morning Brief / Abend-Review
   └─► Academy Supabase (Lovable Cloud, nur lesend, optional)
         tenants / members / signal_relays → Trading-Karte
```

- **Spy Secret KPIs** (MRR, Zahler, Trials, Besucher, Scans) werden live aus den
  Produktionstabellen berechnet — gleiche Preis-/Filterlogik wie `admin-dashboard-v3` (v17).
- **Content & Views**: `affiliate_videos` (StrichAbi-UGC-Programm) + `agency_*`
  (AI-Creator-Personas).
- **Notifications**: `life-brief` schickt Telegram (Bot-Token + Chat-ID aus
  `life_settings`, im Settings-Tab einrichtbar), Fallback E-Mail via Resend
  (`noreply@notify.spy-secret.com`), und loggt alles in `life_notifications`
  (In-App-Feed hinter der Glocke).

## Dateien in diesem Ordner

| Datei | Zweck |
|---|---|
| `001_life_schema.sql` | Tabellen + RLS (im SPYSECRET-Projekt angewendet) |
| `002_life_kpi_rpcs.sql` | KPI-RPCs (Owner- oder Service-Role-Zugriff) |
| `003_life_cron.sql` | pg_cron-Job `life-brief-tick` (stündlich) |
| `life-brief.ts` | Quellcode der deployten Edge Function |

Diese SQL-Dateien sind **Referenzkopien** — sie wurden bereits per MCP-Migration
im SPYSECRET-Projekt angewendet (Migrationsnamen: `life_hq_schema`,
`life_hq_kpi_rpcs`, `life_hq_rpcs_allow_service_role`, `life_hq_cron_tick`).

## Sicherheit

- Alle `life_*`-Tabellen: RLS `is_life_owner()` — erlaubt sind nur die
  Accounts in `life_owners` (kontakt@momentumlabs.at, diego.momentum1@gmail.com,
  strichabi@gmail.com).
- KPI-RPCs prüfen dieselbe Allowlist (bzw. Service-Role für die Brief-Funktion).
- `life-brief`: `x-cron-secret` (aus `life_settings.cron_secret`) für Cron,
  sonst Owner-JWT.
- Der Publishable Key im Client ist öffentlich by design; er gewährt ohne
  Login + Allowlist keinerlei Zugriff auf life_*-Daten.

## Telegram einrichten (2 Minuten)

1. In Telegram **@BotFather** öffnen → `/newbot` → Namen vergeben → Token kopieren.
2. Dem neuen Bot `/start` schreiben.
3. Im HQ → Setup → Token einfügen → **Verbinden** (erkennt die Chat-ID automatisch
   und schickt eine Bestätigung).
4. „Test senden" / „Brief jetzt" zum Prüfen.

Zeiten & Kanäle (Morning Brief, Abend-Review, E-Mail-Fallback) sind im
Setup-Tab konfigurierbar; der Cron-Tick wertet sie stündlich in der
Zeitzone `Europe/Vienna` aus (DST-sicher).
