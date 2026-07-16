# HQ — Life OS (`/hq`)

Persönliches Command Center / Second Brain für Diego — als Route `/hq` in dieser App,
mobil-first und als PWA installierbar ("Zum Home-Bildschirm").

## Architektur — strikte Trennung privat vs. Produkt

**Alle privaten Daten liegen in einem eigenen Supabase-Projekt `momentum-hq`**
(ref `qrgvltpakkubtkeukypa`, $10/Monat) — bewusst getrennt vom SPYSECRET-Produktprojekt
(Investoren-Case). In Produktdatenbanken wird ausschließlich **gelesen**, über
bereits existierende Infrastruktur.

```
Browser (/hq, client-only)
   │  Login: Supabase Auth im momentum-hq-Projekt (eigener HQ-Account)
   ├─► momentum-hq Supabase (qrgvltpakkubtkeukypa)  ← PRIVAT
   │     life_* Tabellen  ── RLS: nur life_owners
   │     Edge Function    ── life-brief v2 (Telegram + optional Resend + Feed)
   │     pg_cron          ── stündlicher Tick → Morning Brief / Abend-Review
   ├─► SPYSECRET Supabase (nur lesen, nichts HQ-eigenes gespeichert)
   │     admin-dashboard-v3 (bestehende Admin-Funktion) → KPI-Karte
   │     affiliate_videos (bestehende Tabelle, RLS entscheidet) → Content-Karte
   └─► Academy Supabase (Lovable Cloud, nur lesen, optional)
         tenants / members / signal_relays → Trading-Karte
```

- Beim HQ-Login werden dieselben Zugangsdaten zusätzlich (best effort) gegen
  SPYSECRET probiert — nur damit die Ventures-Karten KPIs lesen können.
  Schlägt das fehl, zeigen die Karten einen Hinweis statt Zahlen.
- Der **Brief enthält nur persönliche Inhalte** (Fokus, Aufgaben, Tagesplan) —
  keine Business-Zahlen verlassen das Dashboard.

## Dateien in diesem Ordner

| Datei | Zweck |
|---|---|
| `001_life_schema.sql` | Tabellen + RLS (im momentum-hq-Projekt angewendet) |
| `002_life_cron.sql` | pg_cron-Job `life-brief-tick` (stündlich) |
| `life-brief.ts` | Quellcode der deployten Edge Function (v2, nur persönliche Daten) |
| `ZIELE.md` | Zielkatalog für autonome Nachtschicht-Sessions |

Die SQL-Dateien sind **Referenzkopien** — angewendet per MCP-Migration im
momentum-hq-Projekt (`life_hq_schema`, `life_hq_cron_tick`).

## Sicherheit

- Alle `life_*`-Tabellen: RLS `is_life_owner()` — erlaubt sind nur Accounts in
  `life_owners`.
- Der Owner-User wurde einmalig über die Edge Function `hq-setup` angelegt;
  die Funktion ist seitdem ein deaktivierter 410-Stub.
- `life-brief`: `x-cron-secret` (aus `life_settings.cron_secret`) für Cron,
  sonst Owner-JWT.
- Publishable Keys im Client sind öffentlich by design; ohne Login + Allowlist
  gibt es keinen Zugriff auf life_*-Daten.

## Notifications einrichten

**Telegram (empfohlen, 2 Minuten):**
1. In Telegram **@BotFather** öffnen → `/newbot` → Token kopieren.
2. Dem neuen Bot `/start` schreiben.
3. Im HQ → Setup → Token einfügen → **Verbinden** (Chat-ID wird automatisch erkannt).

**E-Mail-Fallback (optional):** Im Supabase-Dashboard des momentum-hq-Projekts
das Secret `RESEND_API_KEY` setzen (und optional `HQ_EMAIL_FROM` mit einer
verifizierten Absenderadresse). Ohne Secret bleibt der Fallback stumm — der
In-App-Feed bekommt die Briefe immer.

Zeiten & Kanäle sind im Setup-Tab konfigurierbar; der Cron-Tick wertet sie
stündlich in der Zeitzone `Europe/Vienna` aus (DST-sicher).
