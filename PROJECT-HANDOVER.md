# PROJECT HANDOVER — Cosmos Candles Academy

> **Read this first.** This is the single source of truth for the whole project.
> It is written for (a) the owner and (b) the next AI coding agent (Claude Code)
> so it can understand the full infrastructure immediately and pick up the open
> tasks without guessing. Last updated at the end of the build session below.

---

## 0) TL;DR — what this is

A **free trading-education funnel + white-label partner platform**, powered by the
**TradeQuo** broker. Members join for free, fund their **own** TradeQuo account,
and that verified deposit auto-unlocks the academy (signals, lessons, tools,
Telegram). We earn from the broker's per-lot IB rebate and share it with
**partners** who bring their audience. Mascot = **Cosmo** (blue cartoon guy).

- **Live site:** https://cosmos-candles.com
- **Stack:** React + TanStack Start (SSR) + TanStack Router · Supabase (Postgres,
  Auth, Edge Functions, RLS) · Tailwind · deployed on **Vercel** (git-connected).
- **Repo:** GitHub `Momentumlabs1/academy-tier-path` · production branch = `main`
  (Vercel auto-deploys on push to `main`).

---

## 1) For the next AI agent — how to onboard

1. **Read this file fully**, then skim `src/routes/` and `src/lib/`.
2. **Connect MCP:** Supabase (project ref `qrgvltpakkubtkeukypa`) and GitHub.
   Secrets you need are readable via Supabase MCP (`app_secrets` table + Edge
   Function secrets) — do **not** expect them pasted here.
3. **VPS access** (broker sync): `ssh root@67.217.245.196` (IONOS AlmaLinux 9).
4. **Do NOT touch** Supabase project `fxbwahzzdcrwfnyvywfl` ("Monetazing") — that
   is a *different* product that happens to share the same Supabase org. Ours is
   **`qrgvltpakkubtkeukypa`** (momentum-hq).
5. Deploy = push to `main`. Edge functions deploy via Supabase MCP
   `deploy_edge_function`. DB changes via `apply_migration`.

---

## 2) Access & infrastructure (where everything lives)

| System | Details |
|---|---|
| **Live** | https://cosmos-candles.com |
| **GitHub** | `Momentumlabs1/academy-tier-path` · prod branch `main` · work branch `claude/determined-mccarthy-iYY9Y` (all merged to main) |
| **Vercel** | project `academy-tier-path` (team momentum21). Git-connected → auto-deploy on push to `main`. Env vars here (e.g. `VITE_BROKER_URL`). |
| **Supabase** | **momentum-hq**, ref `qrgvltpakkubtkeukypa`. Tables, Auth, Edge Functions, Secrets. |
| **VPS (broker sync)** | IONOS AlmaLinux 9, IP `67.217.245.196`, root SSH. Worker: `~/academy-tier-path/broker-sync`. Cron every 2 min. Log: `tail -f ~/academy-tier-path/broker-sync/sync.log`. |
| **Broker** | TradeQuo. IB referral link: `https://my.tradequo.com/register?referral=019f75ff-3dfe-7114-9ccd-eac9692578d4`. IB rebate **$15/lot**; partners get **$5–$10/lot** (ladder below). Broker DB creds live in the VPS `.env` (`bi.tradequo.com`, users `IB_TQ_28491` / `IB_TQ_27788`). |
| **Email** | Resend, from-domain `send.cosmos-candles.com`. Sender = Edge Function `send-email`. |
| **Image gen** | Hedra API (used for Cosmo poses). **Key must be rotated** (was pasted in chat). |

### Admin login (owner)
- **URL:** `cosmos-candles.com/login` (the "Command Center" staff door — admin only).
- **Email:** `kontakt@momentumlabs.at`
- **Password:** `CosmosAdmin!2026` ← **change this after first login.**
- Admin gate = any authenticated user whose email === `ADMIN_EMAIL`
  (`kontakt@momentumlabs.at`, see `src/lib/admin-auth.ts`). Customers sign in via
  `/registrieren`, **not** `/login`.

---

## 3) Tech stack & architecture

- **Frontend/SSR:** TanStack Start + TanStack Router, file-based routes in
  `src/routes/`. `/_app.*` = the authed member app (pathless layout via AppShell
  + RegistrationGate). `/` = public master landing when logged out, dashboard when
  logged in. `/{slug}` and `/t/{slug}` = partner landings (`TenantLandingView`).
- **Auth/DB:** Supabase. RLS on everything. Members see only their own rows.
- **Deploy:** Vercel (git-connected). Push `main` → auto build+deploy.
- **Colors:** dark theme; lime primary `#b6f04a` / `oklch(0.88 0.19 140)`; blue
  accent `#75B9F5`; gold `#ffcf5c`.

### Repository map (key paths)
```
src/routes/                     file-based routes
  _app.index.tsx                member DASHBOARD (greeting, onboarding, deposit ladder)
  registrieren.tsx              CUSTOMER sign-up/sign-in (instant, auto-confirm)
  login.tsx                     ADMIN "Command Center" (admin only)
  admin.*.tsx                   admin area (index/members/tenants/structure/signals/deposits/lessons/audit)
  partner.tsx                   partner PORTAL (login, stats, share link)
  partner-programm.tsx          partner RECRUITMENT pitch page (CTAs = mailto)
  $slug.tsx / t.$slug.tsx       partner landings → TenantLandingView
  _app.signals/lessons/tier/tools/unlocks/settings/notifications.tsx
src/components/academy/
  tenant/TenantLandingView.tsx  the white-label landing (cinematic Cosmo hero, showcases)
  tenant/LandingPreviews.tsx    animated product mockups on the landing
  onboarding/OnboardingJourney.tsx  video→deposit→verifying→celebration state machine
  onboarding/PostDepositWelcome.tsx  post-deposit welcome videos
  tier/BrokerTrustStrip.tsx     "Deposit at TradeQuo" trust + CTA (uses depositUrl)
src/lib/
  broker.ts                     BROKER const + depositUrl(memberId, brokerUrl) tracking-token builder
  tenants.ts                    static tenants + COSMOS_MASTER + buildTenantConfig() + RESERVED_SLUGS
  resolve-tenant.ts             static-first, else DB tenant → full landing
  partner-brand.ts              co-branding cookie (cosmo_brand) for downstream pages
  deposit-intent.ts             localStorage flag for the "verifying deposit" state
  admin-auth.ts                 ADMIN_EMAIL gate
  academy-data.ts               TIERS, LESSONS, activity constants
src/hooks/useMemberState.ts     member state (profile, memberId, deposit, tier, notifications)
supabase/functions/             edge functions (see below)
supabase/migrations/            all DB schema + triggers + functions
broker-sync/                    VPS worker: sync.mjs, schema.mjs, README.md
public/cosmo/                   Cosmo images (head, avatar, full, meditate, wave, thumbsup, point)
video-engine/                   lesson1-full-src/, tim_src/ (video sources, timelines, scripts)
```

### Edge Functions (Supabase, all deployed)
`admin-tenants` (list/update/create_partner/update_partner — admin-token gated) ·
`send-email` (Resend; kinds: doi/welcome/**deposit_confirmed**/tier_unlocked/…;
guarded by `SEND_SECRET` header) · `broker-webhook` · `telegram-webhook`
(signal relay) · `create-telegram-link` · `activity-sweep` · `member-access-sync`
· `admin-bootstrap` · `mentor-chat`. (Also several `pb-*` / `life-brief` functions
that belong to a **different** product sharing this project — ignore them.)

### Key DB objects
- Tables: `members` (deposit, tier, active, auth_user_id, email, referred_by_tenant),
  `tenants` (slug, name, config jsonb, active, owner_user_id, partner_rate,
  broker_affiliate_url, telegram_channel_id, signal_footer), `deposit_events`,
  `trade_events`, `notifications`, `broker_clients/accounts/trades`,
  `tenant_ib_emails`, `app_secrets` (RLS-locked secret store), `audit_log`.
- Trigger `recalculate_tier_after_deposit()` on `deposit_events` insert →
  recomputes `members.deposit/tier/active`, emits `tier_unlocked` notification on
  a tier crossing, **and sends the `deposit_confirmed` email via `net.http_post`
  (pg_net)**. Its email link points to `/registrieren`.
- Function `apply_broker_rollup()` (called by the VPS worker each pass) →
  attributes members to partners, reconciles deposits into `deposit_events`,
  imports trades. **Matches member ↔ broker_client by tracking token first**
  (member id carried in `utm_campaign`/`utm_uri`), email as fallback.
- pg_net and pg_cron extensions are installed.

---

## 4) Core flows (how it all connects)

1. **Funnel:** visitor lands (`/` or a partner `/{slug}`) → clicks Sign up →
   `/registrieren` → account created **instantly** (auto-confirm trigger, no email
   step). Partner attribution rides the `cosmo_ref` cookie → `members.referred_by_tenant`.
2. **Deposit:** member clicks "Deposit at TradeQuo". `depositUrl(memberId, brokerUrl)`
   appends `utm_campaign=cc_<memberId>&cc_uid=<memberId>` to the IB link so the
   client is (a) placed under our/the partner's IB and (b) matchable by token.
   For **partner-referred** members the CTA uses the **partner's** broker link.
3. **Verify → unlock:** VPS `broker-sync` runs every 2 min → pulls broker DB →
   `apply_broker_rollup()` inserts the deposit → trigger sets tier + sends the
   **deposit-confirmed email** → the dashboard's 20s watcher flips the
   "Verifying your deposit…" state to the **Celebration** (confetti + unlock list).
4. **Attribution:** token (member id in utm) → `referred_by_tenant`; visible in the
   partner portal `/partner` and admin structure.
5. **Partner white-label:** admin creates a partner (auth user + brand + rate),
   sets landing branding + broker/telegram links in **/admin → White-Label Brands**.
   Their page renders at `/{slug}`.
6. **Activity:** trades → `trade_events` → activity status (active/grace/inactive);
   `activity-sweep` handles inactivity.

### Partner economics (confirmed)
Broker pays **$15/lot** IB rebate. Partner commission **ladder by deposits**:
`<€5k → $5` · `€5k → $6` · `€10k → $7` · `€50k → $8` · `€100k → $9` · `€250k → $10`.
Desk pattern: ~1.2 lots/trade on €10k, ~6 trades/day → ~144 lots/mo per €10k.
(The internal split / that we keep the remainder is **not** shown to partners.)

---

## 5) What is LIVE & verified

- ✅ Instant registration (auto-confirm), full member dashboard, tiers, gated
  signals/tools, cinematic Cosmo landing, Cosmo pose set integrated.
- ✅ Onboarding: welcome video → deposit ignite → **"Verifying deposit…"** →
  celebration (confetti + unlock list).
- ✅ **Deposit-confirmed email** fires automatically on a booked deposit
  (verified end-to-end, Resend returned 200/ok). Link → `/registrieren` → dashboard.
- ✅ **Broker auto-verification LIVE**: VPS sync connected + authed + cron every
  2 min; a real deposit auto-unlocks the member within ~2 min.
- ✅ Token-based attribution (no same-email requirement).
- ✅ Partner white-label: create partner + per-partner branding/rate/links in admin.
- ✅ Partner PDF prospectus produced (delivered to owner).

---

## 6) OPEN TASKS — checklist for the next agent

### A. UI / assets (owner-requested, not yet done)
- [ ] **Partner (Zeko) landing image**: the `zekoglobal` tenant mascot is wrong.
      Replace `public/zeko-hero.png` and `public/zeko-point.png` with the correct
      Zeko character (green hoodie, black backwards cap — owner has the file).
      General pattern: each partner can have its own mascot; wire it into
      `TenantLandingView` per tenant.
- [ ] **Video poster/preview images**: `<video>` elements render **black boxes**
      when no deposit/poster. Add `poster=` thumbnails for: landing `pitch.mp4`
      (TenantLandingView demo-video mount), `PostDepositWelcome` videos
      (`welcome.mp4`, `signals-tutorial.mp4`), and any academy lesson videos that
      aren't YouTube. (YouTube lessons already get thumbnails via i.ytimg.)
- [ ] **Google sign-in / sign-up**: add "Continue with Google" (Supabase Auth
      Google provider → enable in Supabase dashboard, then
      `supabase.auth.signInWithOAuth({ provider: 'google', options:{ redirectTo }})`)
      to `/registrieren` (and optionally `/login`). Owner explicitly wants this.
- [ ] **Staff login screen** (`/login` "Command Center"): owner wants it
      de-emphasised / not publicly obvious. Clarify intent — either hide the
      route from discovery, restyle, or merge admin into the normal login by role.

### B. Product / backend
- [ ] **Telegram auto-invite**: set `telegram_channel_id` per brand in
      **/admin → White-Label Brands** (get ID via @getidsbot; bot must be channel
      admin). Then verify the relay/invite/kick wiring end-to-end.
- [ ] **Real signals in-app**: `/_app.signals.tsx` "Last 10 signals" is currently
      **demo data** (`SIGNALS` const). Tim's real signals only flow via Telegram
      (relay bot). To show them live in-app: have `telegram-webhook` write relayed
      signals to a DB table and read it on the page.
- [ ] **Telegram-native onboarding**: let users register their email *inside* the
      bot and auto add/remove them from groups by deposit/status (spec exists;
      the activity system is built, the group add/kick wiring is not).
- [ ] **Threshold alignment**: bot spec used €500/€1,000/€3,000 group tiers vs the
      academy tiers €100 (Foundation) / €2,000 (Operator) / €50,000 (Elite).
      Decide whether Telegram groups map to academy tiers or their own thresholds.
      Activity minimum: code uses 0.10 lot/30d; bot spec says 0.2 lot — pick one.
- [ ] **Broker IB link in Vercel**: optionally set `VITE_BROKER_URL` env so it is
      config-driven (currently the IB link is the code default in `broker.ts`).

### C. Nice-to-have
- [ ] German version of the partner PDF (source HTML was in the ephemeral
      scratchpad; regenerate — layout is a 4-page A4 dark prospectus).
- [ ] Higgsfield credits for Cosmo talking-head videos (separate top-up).
- [ ] Persist notification read-state; TelegramConnectCard window.open success check.

---

## 7) Ops — how to do things

- **Deploy frontend:** commit + `git push origin main`. Vercel builds automatically.
  Local check before pushing: `npx tsc --noEmit && npm run build`.
- **Deploy an edge function:** Supabase MCP `deploy_edge_function` (keep
  `verify_jwt` as-is per function; `admin-tenants` & `send-email` are `--no-verify-jwt`
  with their own guards).
- **DB change:** Supabase MCP `apply_migration` (idempotent SQL).
- **Give a member a tier manually (no code):** Supabase → Table Editor → `members`
  → set `deposit` + `tier` (e.g. `tier=elite, deposit=50000, active=true`).
- **Onboard a partner (no code):** /admin → **Structure** → Create Partner
  (name, slug, email, start password, rate). Then set their branding + broker/
  telegram links in /admin → **White-Label Brands**.
- **Broker sync (VPS):** `ssh root@67.217.245.196`; worker in
  `~/academy-tier-path/broker-sync`. Update: `cd ~/academy-tier-path && git pull &&
  cd broker-sync && npm install && node sync.mjs`. Watch: `tail -f sync.log`.
  Cron is set to `*/2 * * * *`.

---

## 8) Security — rotate these (were exposed in chat)

Admin password (after login), **Hedra API key**, Vercel token, Resend key,
GoDaddy PAT, Higgsfield credentials, and the Supabase **service_role key**.
Broker DB creds live only in the VPS `.env` (fine there).

---

## 9) Assets & scripts (in the repo — persistent)

- **Cosmo images:** `public/cosmo/` (`cosmo-head/-avatar/-full/-meditate/-wave/
  -thumbsup/-point.png`), all transparent PNGs. New poses can be generated via the
  Hedra i2i pipeline (see git history for the flow: upload ref → nano-banana-pro-i2i
  on magenta bg → chroma-key transparent).
- **Video sources:** `video-engine/lesson1-full-src/` (Lesson 1) and
  `video-engine/tim_src/` (timelines, board HTMLs, `video2_miro_stations.md`, `BUILD.md`).
- **Word-level transcripts:** `*_words.json` (l3/l4/l5/sig/v6) in the repo.
- **Broker worker:** `broker-sync/` (`sync.mjs`, `schema.mjs`, `README.md`).
- ⚠️ Anything that was only in the session "scratchpad" is **gone** — only
  repo-committed files persist.

---

## 10) Gotchas

- Two Supabase projects exist in the org; **ours is `qrgvltpakkubtkeukypa`**.
- Vercel is git-connected — do not expect a manual `vercel deploy` token flow; just
  push `main`.
- `/login` = admin only; customers use `/registrieren` (which also signs in
  existing members and redirects to the dashboard).
- The chat UI masks pasted secrets with `•` bullets — when copying commands with
  secrets, the real value is intact (the bullets are display-only).
- Node ≥ 20 with the `ws` package (or Node 22+) is required for the broker worker
  (supabase-js RealtimeClient needs a WebSocket).

*— End of handover. Build the open tasks in section 6 in order; the core machine
already runs and auto-verifies deposits.*
