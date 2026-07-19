# GO-LIVE — ersten Partner einbinden (Copy-Paste)

Projekt: **momentum-hq** (`qrgvltpakkubtkeukypa`). Alles ist gebaut, migriert und
deployed. Unten nur noch das, was **Secrets/Deploy** braucht.

> Hinweis: Supabase spritzt `SUPABASE_URL`, `SUPABASE_ANON_KEY` und
> `SUPABASE_SERVICE_ROLE_KEY` **automatisch** in alle Edge Functions. Die musst du
> NICHT setzen. Nur die unten genannten.

---

## MINIMAL — nur Registrierung + Partner (ohne Broker/Telegram/E-Mail)

Damit kannst du heute schon einen Partner anlegen und den Link verschicken.

### 1. Secrets setzen
Supabase → Project momentum-hq → Edge Functions → **Secrets**:
```
ADMIN_EMAIL       = kontakt@momentumlabs.at
ADMIN_PASSWORD    = <dein Wunsch-Passwort>
BOOTSTRAP_SECRET  = <irgendein langer Zufallsstring>
```

### 2. Admin-Login einmalig erzeugen
```bash
curl -X POST https://qrgvltpakkubtkeukypa.supabase.co/functions/v1/admin-bootstrap \
  -H "x-bootstrap-secret: <DEIN_BOOTSTRAP_SECRET>"
```
Erwartete Antwort: `{"ok":true,"action":"created", ...}`

### 3. Auth frictionless machen
Supabase → **Authentication → Sign In / Providers → Email → „Confirm email" AUS**.
(Kunde ist nach Registrierung sofort drin. Zuordnung zum Partner klappt trotzdem.)

### 4. Frontend deployen
Build ist Cloudflare/Nitro-ready (`npm run build` → `.output/`). Deploy dorthin,
Domain **cosmos-candles.com** verbinden. Env-Werte kommen aus `.env` (zeigt schon
auf momentum-hq).

### 5. Partner anlegen & Link schicken
Einloggen unter `/login` → **Admin → Struktur → „Neuen Partner anlegen"** →
Link **`cosmos-candles.com/<slug>`** rausschicken. Fertig.

---

## VOLL — E-Mail, Telegram, Broker (wenn bereit)

### E-Mail (Resend)
- Secret: `RESEND_API_KEY`, `MAIL_FROM_DOMAIN = send.cosmos-candles.com`
- Domain in Resend **verifizieren** (DNS-Records auf cosmos-candles.com setzen).
- Für Signup-Mails: Supabase → Authentication → SMTP = Resend eintragen, dann
  „Confirm email" wieder AN. `send-email` (deployed) ist dann für Newsletter/DOI da.

### Telegram-Bot
- Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `MAIN_CHANNEL_ID`.
- **WICHTIG:** `telegram-webhook` einmal **neu deployen** (Repo-Stand enthält das
  Aktivitäts-Gate — der deployte Stand ist noch ohne). Danach Webhook bei Telegram
  registrieren.

### Broker (kommt separat)
- Secret: `WEBHOOK_SECRET` (HMAC).
- Broker postet an `.../functions/v1/broker-webhook` mit `event`:
  `"deposit"` | `"withdrawal"` (`amount`) oder **`"trade"`** (`lots`, `symbol`,
  `broker_id`). Deposits steuern Tier, Trades die Aktivität.

### Aktivitäts-Enforcement scharf schalten (erst wenn Broker-Trades fließen)
```sql
UPDATE academy_settings
   SET activity = jsonb_set(activity, '{enabled}', 'true')
 WHERE id = 1;
-- Werte anpassbar: {"enabled":true,"min_lots":0.10,"window_days":30,"grace_days":7}
```
Der tägliche Cron `academy-activity-sweep` (03:17 UTC) übernimmt dann Warnung +
Kick. Vorher unbedingt Punkt „telegram-webhook neu deployen" erledigen.

---

### Mentor-Bot (Cosmo Mentor)
- Secret: `ANTHROPIC_API_KEY` (dein Anthropic-Key mit Guthaben). Optional:
  `MENTOR_MODEL` (Default `claude-haiku-4-5`), `MENTOR_DAILY_LIMIT` (Default 30).
- Läuft günstig: ~0,25–0,6 Cent pro Frage (Haiku 4.5, Wissensbasis gecached).
- Kunden sehen im Dashboard unten rechts den Chat-Button. Nur eingeloggte
  Mitglieder, Tageslimit pro Person, Leitplanken drin (keine Anlageberatung,
  Konto-/Geldfragen → Support). Wissensbasis: `supabase/functions/mentor-chat`.

## Was schon fertig & getestet ist
- Kunden-Dashboard = echte Daten (keine Fake-Zahlen).
- Partner anlegen → DB-gebrandete Landing unter `/<slug>` UND `/t/<slug>`.
- Registrierung → Member-Provisioning + Partner-Zuordnung (DB-Trigger, live getestet).
- Partner-Portal `/partner`: eigener Link + Analytics + Live-Seitenvorschau, RLS-scoped.
- Aktivitäts-System (Rolling-Fenster, Grace, Kick) — gebaut, getestet, **AUS** by default.
- Tier-Logik inkl. „close-to-next-tier"-Hinweis.
