# Site-Finalisierung — Fahrplan (Synthese aus 3 Recherchen, Juli 2026)

> Zentrale Vision: eine Academy, viele Partner-Marken, ALLE Leads & Daten zentral bei uns.
> Ziel: launch-ready + später als Gesamtsystem verkaufbar. Dies ist Orientierung, keine Rechtsberatung.
>
> **Domain: `cosmos-candles.com`** (gekauft). Betrieb über LLC. **Stripe: nicht nötig** — alle Einnahmen laufen über Broker-Provision (Upsells evtl. später).

## 0. Subdomain-Layout (zwei getrennte Welten)

```
cosmos-candles.com              → Haupt-Marketingseite (zentral)
<partner>.cosmos-candles.com    → KUNDEN-Landing, partner-gebrandet (Leads)
app.cosmos-candles.com          → zentrales KUNDEN-Dashboard (gesperrt bis 100 € Einzahlung)
partners.cosmos-candles.com     → AFFILIATE-Backoffice (Partner loggen sich ein, sehen NUR ihre Zahlen)
```

**Affiliate-Dashboard** = EIN zentrales Portal, kein Pro-Subdomain-Ding. Scoping über **Supabase RLS**: ein Affiliate liest per DB-Regel nur Zeilen seiner eigenen Marke. Er sieht Klicks, Registrierungen, Einzahlungen, Provision, aktuelles Level (Staffel 5→10, siehe `verguetung-modell.md`) + Erklärung „so verdienst du / so steigst du auf". Attributionskette: Klick auf seine Subdomain → `click_id` → Lead → Member → Einzahlung → Provision.
Datenmodell dafür: Migration `008_affiliate_portal.sql` (tenants.owner_user_id, affiliate_clicks, RLS-Policies, `affiliate_dashboard`-View).
⚠️ Offen: Provisions-Einheit — Vergütungsmodell sagt USD/Lot (5/6/8/10), User erwähnte „5–10%". Vor der Provisions-Berechnung Einheit festzurren.

## 1. E-Mail-System (Recherche bestätigt)

- **Resend** = Sende-System (Transaktion + Newsletter via „Broadcasts"). **Unsere Supabase-DB bleibt die Wahrheit** → kein Lock-in → System bleibt verkaufbar. Später optional Customer.io nur für komplexe Automations-Journeys.
- **Reputation-Firewall (die wichtigste Struktur-Regel):** jeder Partner sendet über EIGENE Subdomains — `send.<marke>` (Transaktion) getrennt von `mail.<marke>` (Marketing). Jede Subdomain hat eigenes SPF/DKIM/DMARC. So kann ein Partner mit schlechter Zustellrate die anderen NICHT runterziehen; Login-/Bestätigungsmails bleiben zustellbar, auch wenn ein Newsletter-Blast schlecht läuft.
- **Kein Wildcard für E-Mail-Auth** — SPF/DKIM/DMARC müssen als konkrete Records pro Sende-Subdomain existieren → Partner-Onboarding legt per **Cloudflare-API** automatisch die Records an.
- **Empfangen `kontakt@…`:** Cloudflare Email Routing (gratis). Kein bezahltes Postfach nötig.
- **Registrar/DNS:** Cloudflare Registrar + DNS (at-cost, API für Auto-Subdomains). GoDaddy nur als Notlösung.
- **Kosten:** Resend Pro 20 $ → Scale ab 90 $ (nötig ab >10 Partner-Domains). Bei 1 Mio Mails/Mo ~650 $.

## 2. Subdomain-Architektur (Recherche bestätigt)

- **Wichtige Klarstellung:** `partnername.cosmos-candles.com` (unsere eigene Zone) ≠ „Partner bringt eigene Domain". Ersteres = ein Wildcard-Record + Wildcard-SSL. **Kein Cloudflare-for-SaaS nötig.**
- **⚠️ Hosting-Entscheidung:** Lovable Cloud unterstützt **kein Wildcard `*.domain`** → für „jeder Partner-Slug funktioniert sofort" müssten wir das **Frontend zu Vercel migrieren** (Supabase bleibt unangetastet). Vercel: Wildcard + Auto-SSL auf allen Plänen, ~20 $/Mo, native TanStack-Start-Unterstützung. **Das ist DIE offene Entscheidung — siehe §5.**
- **Tenant-Auflösung:** `Host`-Header serverseitig lesen (`getWebRequest()`), Slug aus Subdomain → Tenant, einmal im `__root__`-Loader. Landing wird host-getrieben statt param-getrieben (gleiche `TenantLanding`-JSX).
- **Branding vs. zentral:** Subdomain-Landing voll partner-gebrandet (Farben als CSS-Variablen); Dashboard auf `app.cosmos-candles.com` neutral/zentral. Tenant überlebt danach nur als *Attribution* (Daten), nicht als Optik.
- **Session über Subdomains:** Supabase-Cookie mit `domain: '.cosmos-candles.com'` → Login auf jeder Subdomain gilt auch auf `app.`.
- **Attribution:** Referrer-Slug aus der Subdomain → bei signUp in `raw_user_meta_data` + Cookie `cosmo_ref` → Trigger schreibt `referred_by_tenant` in members. Robust, egal wo die Registrierung endet.
- **Migration `/t/:slug` → Subdomain:** beide parallel laufen lassen, dann 301 vom Pfad auf die Subdomain (Query/UTM erhalten). Reservierte Subdomains sperren: `app, www, api, admin, mail`.

## 3. Recht (AT/EU) — PFLICHT vs. optional

**⚠️ Zwei Flags zuerst mit AT-Anwalt klären (können das Modell prägen):**
1. Braucht die Lead-Vermittlung eine **FMA-Lizenz** / Status als gebundener Vermittler?
2. Hält der **„100 € einzahlen zum Freischalten"-Mechanismus** dem ESMA-Verbot von Einzahlungs-Anreizen stand?

**MUSS gebaut werden (nicht verhandelbar):**
- **ESMA-CFD-Risikohinweis** prominent auf jeder Landing + Marketing-Mail + Ad → Komponente `RiskWarning` gebaut.
- **Provisions-/Affiliate-Offenlegung** (§6 ECG + UWG) → Komponente `CommissionDisclosure` gebaut.
- **E-Mail-Consent mit Double-Opt-in** (§174 TKG + Art. 7 DSGVO Beweislast) → Datenmodell `007` gebaut (`marketing_consent`, `doi_token`, `doi_confirmed_at`, `consent_ip/version`, `mailable_leads`-View). Jede Mail: Absender-ID + Impressum + funktionierender Abmelde-Link. Transaktions-Mails frei von Marketing halten.
- **DSGVO-Struktur für zentrale Leads:** Datenschutzerklärung (nennt Zentral-Firma als (Joint-)Controller), Rechtsgrundlage je Zweck, **JCA (Art. 26) oder DPA (Art. 28) mit jedem Partner** + DPA mit Broker, Cookie-Consent vor Retargeting-Pixeln. Cross-Brand-Nutzung im Consent-Text beim Signup offenlegen.
- **Strafen zur Einordnung:** §174 TKG bis 50.000 €, Impressum bis 20.000 €, DSGVO bis 20 Mio / 4% Umsatz.

**Optional (nach eigener Regel weglassen):**
- Die „wir geben Geld für Marketing aus / du kriegst dein Geld trotzdem"-Zeile → **gesetzlich nicht verlangt → weglassen.** Falls doch: muss stimmen (100 € = Geld des Users beim Broker) und darf nicht wie Trading-Anreiz klingen.

## 4. Status der Bausteine

| Baustein | Status |
|---|---|
| Falsche Supabase-URLs → Env | ✅ Code |
| „Lovable App"-Branding raus | ✅ Code |
| zekoglobal-DB-Zeile | ✅ Migration 005 |
| Telegram Auto-Kick bei Auszahlung | ✅ Migration 006 + Edge-Function |
| Lead-Consent + Attribution Datenmodell | ✅ Migration 007 |
| Risikohinweis-Komponente | ✅ `RiskWarning` |
| Provisions-Offenlegung-Komponente | ✅ `CommissionDisclosure` |
| Admin-Auth (E-Mail-Allowlist) | ⏳ offen |
| Tenant-CRUD im Admin | ⏳ offen |
| Funnel → leads-Tabelle + Consent-Box + DOI-Flow | ⏳ offen |
| Host-basierte Subdomain-Auflösung | ⏳ hängt an Hosting-Entscheidung |
| Resend-Integration (Sende-Edge-Function + DNS) | ⏳ braucht Resend-Key + Domain |

## 5. Offene Entscheidungen (User)

1. **Hosting:** Frontend zu **Vercel** migrieren (nötig für Partner-Subdomains, ~20 $/Mo)? Oder erstmal bei Lovable + pfad-basiert `/t/:slug` bleiben und Subdomains später?
2. **Registrar:** Domain via **Cloudflare** (empfohlen, Auto-Subdomains) statt GoDaddy?
3. **Anwalt:** die zwei FMA/ESMA-Flags prüfen lassen (vor Launch).
4. **Stripe:** wofür? (Kundengeld läuft über Broker — Stripe eher für Partner-Gebühren oder Systemverkauf.)

## 6. Reihenfolge (Vorschlag, sobald Entscheidungen da)

1. Admin-Auth absichern (unabhängig, sofort machbar als Code)
2. Funnel scharf: Consent-Box + DOI + Lead in DB + Attribution
3. Resend anbinden (Domain + DNS + Sende-Function) → Willkommens-/Bestätigungs-Mail
4. Falls Vercel: Subdomain-Routing + Cookie-Scope + Attribution-Trigger
5. Rechtstexte (Datenschutz, Impressum, Consent-Wording) + Anwalts-Review
