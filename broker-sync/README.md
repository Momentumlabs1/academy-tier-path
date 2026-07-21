# broker-sync — Live-Verifizierung über die externe IB-Datenbank

Der Broker (TradeQuo/QM) stellt eine **read-only SQL-Server-Datenbank** mit dem
kompletten IB-Netzwerk bereit (`dbo.clients`, `dbo.trades`, `dbo.mt_accounts`).
Dieser Worker spiegelt sie nach Supabase und stößt den Academy-Rollup an:

| Broker-Daten            | wird zu                                        |
|-------------------------|------------------------------------------------|
| `Net_Deposit` je Kunde  | `deposit_events`-Delta → **Tier automatisch** (Foundation/Operator/Elite) + Unlock-Notification |
| geschlossene Trades     | `trade_events` → **Aktivitäts-System** (0.10 Lots/30 Tage, Grace, Kick) |
| `Direct_IB_Email`       | `members.referred_by_tenant` → **Partner-Attribution** automatisch |
| `IB_Rebates`, Balances  | Admin-Reporting (`broker_clients` / `broker_accounts`, admin-only RLS) |

Kein manuelles Einzahlungs-Verifizieren mehr — der Broker ist die Quelle der Wahrheit.

## Voraussetzung: statische IP (Whitelist)

Der Broker lässt nur whitelisted IPs an die DB. Empfehlung: kleiner VPS
(z. B. Hetzner CX22, ~€4/Monat — hat automatisch eine statische IPv4).

1. VPS anlegen (Ubuntu 24.04) → die **IPv4 des Servers an den Broker schicken**
2. Broker schickt zurück: Host, Port, DB-Name, User, Passwort
3. Auf dem VPS:

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone https://github.com/Momentumlabs1/academy-tier-path.git
cd academy-tier-path/broker-sync
npm install
cp .env.example .env && nano .env       # Zugangsdaten eintragen
node sync.mjs                            # erster Lauf = voller Backfill
```

4. Cron einrichten (alle 10 Minuten):

```bash
crontab -e
# */10 * * * * cd /root/academy-tier-path/broker-sync && /usr/bin/node sync.mjs >> sync.log 2>&1
```

## Vorher einmalig

1. **Migration `016_broker_ib_sync.sql`** auf dem Supabase-Projekt
   `qrgvltpakkubtkeukypa` (momentum-hq) ausführen (SQL Editor → Run).
2. **Partner-Mapping** pflegen: pro Partner-Tenant die IB-E-Mail(s) eintragen
   (eigene, admin-only Tabelle — bewusst NICHT auf `tenants`, die ist public-read):
   ```sql
   INSERT INTO tenant_ib_emails (tenant_slug, ib_email)
   VALUES ('zekoglobal', 'partner-ib@mail.com');
   ```
   Kunden, deren `Direct_IB_Email` matcht, werden automatisch diesem Partner
   zugeordnet (`members.referred_by_tenant`).

## Eigenschaften

- **Idempotent**: Clients/Accounts = Voll-Upsert; Trades inkrementell nach
  `CloseTime` mit 3 Tagen Überlappung; `trade_events` dedupliziert über
  `broker_trade_id`; Deposits werden als **Delta** gegen das
  `deposit_events`-Ledger gebucht (Withdrawals ⇒ negatives Delta).
- **Matching** Kunde ↔ Member über E-Mail (case-insensitive). Kunden ohne
  Academy-Account bleiben einfach im Mirror liegen, bis sie sich registrieren —
  beim nächsten Lauf werden sie automatisch verifiziert.
- **Sicherheit**: Broker-Rohdaten sind RLS-geschützt (nur Platform-Admin liest);
  der Worker schreibt mit dem `service_role`-Key; MSSQL-Zugang ist read-only;
  TLS wird standardmäßig verifiziert (`MSSQL_TRUST_CERT=1` nur bei self-signed
  Cert des Brokers). Cron läuft mit `flock` (kein Doppel-Lauf), der Rollup
  zusätzlich mit Advisory-Lock. `.env` niemals committen.
- **DSGVO-Hinweis**: `broker_clients` spiegelt personenbezogene Daten des
  gesamten IB-Netzwerks (auch Kunden ohne Academy-Account). Ihr seid Master-IB
  und bekommt diese Daten vertraglich vom Broker — trotzdem: Zugriff bleibt
  admin-only, und ins Privacy-Policy-Dokument der Academy gehört ein Absatz
  zur Broker-Datenverarbeitung.
