# Aktivitäts- & Tier-Systematik

> Stand: analysiert & überarbeitet. Aktivitäts-Enforcement ist **standardmäßig AUS**
> und wird scharf geschaltet, sobald der Broker-Trade-Feed live ist.

## 1. Tier (Einzahlung) — bestehend, geprüft

- Der Trigger `recalculate_tier_after_deposit` berechnet das Tier aus
  `SUM(deposit_events.amount)`.
- Schwellen: **≥ 100 €** Foundation · **≥ 2.000 €** Operator · **≥ 50.000 €** Elite.
- Grenzfall sauber: 2.000,00 € → Operator, 1.999,99 € → Foundation.
- Bei Tier-Wechsel: Notification `tier_unlocked` + Audit-Eintrag automatisch.

**Mögliche Verbesserung (später, nicht dringend):** `close_to_next_tier`-Hinweis,
wenn jemand z. B. innerhalb von 20 % zur nächsten Schwelle ist. Der
Notification-Typ existiert bereits — nur der Auslöser fehlt.

## 2. Aktivität (Lots) — NEU gebaut

**Regel (handelsüblich, moderat):** Ein Mitglied muss innerhalb eines rollenden
Fensters mindestens `min_lots` traden. Rollendes Fenster statt Kalendermonat →
keine Monatsgrenzen-Sonderfälle, „aktiv bleiben" heißt jeden Tag dasselbe.

**Zustandsmaschine** (`members.activity_status`):

| Zustand | Bedeutung |
|---|---|
| `active` | Lots im Fenster ≥ `min_lots` |
| `grace` | unter Minimum, Schonfrist läuft (`inactive_since` gesetzt) |
| `inactive` | Schonfrist abgelaufen, weiter unter Minimum → wird gekickt |

**Default-Konfig** (`academy_settings.activity`):
```json
{ "enabled": false, "min_lots": 0.10, "window_days": 30, "grace_days": 7 }
```
`min_lots: 0.10` ist absichtlich winzig — nur ein Aktivitätsnachweis, damit
komplett Inaktive rausfallen, ohne aktive Trader zu nerven.

**Datenfluss:**
1. Broker meldet jeden Trade an `broker-webhook` mit `event:"trade"` (`lots`,
   `symbol`, `broker_id`). → `trade_events` (idempotent) → `academy_recompute_activity`.
2. Täglicher pg_cron-Job `academy-activity-sweep` (03:17 UTC) ruft die Edge
   Function `activity-sweep`:
   - `enabled:false` → macht nichts.
   - sonst: alle neu berechnen, `grace`-Mitglieder einmalig warnen
     (`inactive_warning`-Notification), `inactive`-Mitglieder aus den
     Telegram-Kanälen kicken (ban+unban → Rückkehr möglich) + Audit.
3. Sobald wieder getradet wird → `active`, `inactive_since` gelöscht.

**Verifiziert:** Zustandswechsel grace → active → inactive live getestet.

## 3. Scharf schalten (morgen, wenn Broker-API da ist)

```sql
UPDATE academy_settings
   SET activity = jsonb_set(activity, '{enabled}', 'true')
 WHERE id = 1;
-- min_lots / grace_days / window_days hier bei Bedarf anpassen.
```
Werte lassen sich jederzeit ohne Code-Deploy ändern.

## 4. Offener Folgepunkt (Bot-Gate)

Wenn Enforcement AN ist: Der Telegram-Bot lässt Beitritt aktuell bei
`deposit ≥ 100` zu. Ein inaktivitäts-gekicktes Mitglied mit noch vorhandener
Einzahlung könnte sofort wieder beitreten. Vor dem Scharfschalten sollte die
Beitritts-Freigabe im Bot zusätzlich `activity_status <> 'inactive'` prüfen.
(Unkritisch, solange `enabled:false`.)
