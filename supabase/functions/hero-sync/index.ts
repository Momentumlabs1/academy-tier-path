/**
 * hero-sync — pulls HeroFX customers, their balances and their trades into the
 * broker_* mirror, then lets apply_broker_rollup() do the rest.
 *
 * Replaces the TradeQuo worker that polled an MSSQL database from a rented VPS
 * every two minutes. Hero has a real HTTP API, so this runs as a scheduled
 * function with nothing to keep alive.
 *
 * THREE THINGS ABOUT THEIR API THAT ARE NOT IN THE DOCUMENTATION
 * --------------------------------------------------------------
 *   1. AUTH IS `X-Access-Token`. Not `Authorization: Bearer`, not `Token`, not
 *      `X-Api-Token`, not a query parameter. Twenty-two other forms return
 *      `401 {"detail":"You are not authenticated"}`. Their own frontend sends
 *      `Authorization: JWT <session>`, which is the web login and a different
 *      mechanism entirely — do not copy it.
 *
 *   2. CLOUDFLARE BLOCKS PLAIN CLIENTS. Without browser-shaped headers the
 *      request dies at the edge with `403 error code: 1010`, before their
 *      application ever sees it. The User-Agent and Referer below are
 *      load-bearing, not decoration.
 *
 *   3. ACCOUNT DETAIL 500s ON SOME ACCOUNTS, AND THAT IS NORMAL. Legacy records
 *      (one TradeLocker account on the current estate) return HTTP 500 with an
 *      empty body while their siblings return 200 with money in them. An earlier
 *      pass tested exactly one account, hit the broken one, and concluded the
 *      endpoint did not work — which is why this function existed for weeks
 *      without ever reading a balance. Treat a 500 as "skip this account", never
 *      as "the endpoint is down".
 *
 * WHERE THE MONEY COMES FROM
 * --------------------------
 * There is no deposit endpoint anywhere in Hero's partnership API — no lifetime
 * deposit, no transaction list, no balance operation hiding in the trade history
 * (closed_trades returns a curated `{items, summary:{lots,commission,swap,profit}}`
 * with no field a deposit could occupy). What does exist is the CURRENT balance,
 * one call per account:
 *
 *     GET /partnership/user/<uid>/account/          → the customer's accounts
 *     GET /partnership/user/<uid>/account/<aid>/    → balance / equity / marginFree
 *
 * Balance is not deposit. A customer who deposits 2,000 and loses 500 shows 1,500,
 * and feeding that into the ledger would book a withdrawal and demote them out of a
 * tier they paid for. So the balance is written to `current_balance_usd` and
 * promoted into `net_deposit` through a ratchet that only ever moves up
 * (`promote_balances_to_net_deposit`, migration 033). Trading losses cannot revoke
 * access, and a half-finished run can only raise fewer values — never lower one.
 *
 * COST, AND WHY THERE IS A DEADLINE
 * ---------------------------------
 * Reading balances costs one HTTP call per account, and customers accumulate
 * accounts freely (one real customer here has 59). So the work is ordered by what
 * matters — balances for everyone first, then trades for the accounts holding the
 * most money — and stops cleanly when the deadline is reached. Because the ratchet
 * is monotonic and every write is an upsert, stopping early is safe: the next run
 * picks up where the value stands, not where the loop stopped.
 *
 * STILL OPEN — PARTNER ATTRIBUTION
 * --------------------------------
 * `apply_broker_rollup()` step 1 credits a member to a partner by joining
 * `broker_clients.direct_ib_email` against `tenant_ib_emails`. Hero returns the
 * IB's ACCOUNT NUMBER (`partnerAccount`), not their email, so that join cannot fire
 * on Hero data. It is stored in `direct_ib_id` and needs a partnerAccount → tenant
 * mapping before any partner is credited. Deposits and tiers work regardless.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://portal.herofx.co/api";
const BROKER = "hero";

/** Cloudflare rejects anything that does not look like a browser. */
const BROWSERISH = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://portal.herofx.co/",
  "Origin": "https://portal.herofx.co",
};

/** Their window cap: >31 days returns 400 "Delta is too large". */
const TRADE_WINDOW_DAYS = 31;
/** Concurrent calls to Hero. Low on purpose — Cloudflare sits in front. */
const POOL = 4;
/** Leaves room to still write results and run the rollup before the wall. */
const DEFAULT_BUDGET_MS = 100_000;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

interface HeroClient {
  id: number;
  fullName?: string;
  email?: string;
  dateJoined?: string;
  type?: string;
  partnerAccount?: string;
  isPartner?: boolean;
  /** Not returned today. Present here so wiring it up is a one-line change. */
  clickId?: string;
  utmClickId?: string;
}

interface HeroAccount {
  id: number;
  login?: string;
  isDemo?: boolean;
  isArchived?: boolean;
  platformSlug?: string;
  accountTypeTitle?: string;
}

/** Not found: 404 → null. Broken record: 500 → null. Anything else throws. */
class HeroError extends Error {
  constructor(msg: string, readonly status: number) { super(msg); }
}

async function heroGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(API + path, { headers: { ...BROWSERISH, "X-Access-Token": token } });
  const text = await res.text();
  if (!res.ok) throw new HeroError(`${path} → ${res.status} ${text.slice(0, 160)}`, res.status);
  try { return JSON.parse(text); } catch { throw new HeroError(`${path} → non-JSON: ${text.slice(0, 120)}`, 0); }
}

/** Same, but a per-record server fault is data, not an outage. */
async function heroGetSoft(path: string, token: string): Promise<unknown | null> {
  try {
    return await heroGet(path, token);
  } catch (e) {
    if (e instanceof HeroError && (e.status === 500 || e.status === 404)) return null;
    throw e;
  }
}

/**
 * Hero is inconsistent about money: TradeLocker accounts return
 * `{"amount":"992.95","currency":"USD"}`, MT5 accounts return a bare `0`.
 */
function money(v: unknown): { amount: number; currency: string | null } | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? { amount: v, currency: null } : null;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? { amount: n, currency: null } : null; }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const n = Number(o.amount);
    if (!Number.isFinite(n)) return null;
    return { amount: n, currency: typeof o.currency === "string" ? o.currency : null };
  }
  return null;
}

/** Hero sends ISO strings in some places and unix seconds in others. */
function stamp(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v * 1000).toISOString();
  if (typeof v === "string") {
    const d = new Date(/^\d+$/.test(v) ? Number(v) * 1000 : v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/** Bounded-concurrency map that keeps going when one item fails. */
async function pooled<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<(R | null)[]> {
  const out = new Array<R | null>(items.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        try { out[i] = await fn(items[i]); } catch (e) {
          console.error("[hero-sync] item failed:", e instanceof Error ? e.message : String(e));
        }
      }
    }),
  );
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "POST or GET" }, 405);

  const url = new URL(req.url);
  const budgetMs = Number(url.searchParams.get("budget_ms")) || DEFAULT_BUDGET_MS;
  const wantTrades = url.searchParams.get("trades") !== "0";
  const started = Date.now();
  const outOfTime = () => Date.now() - started > budgetMs;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // DB-held secret first, env as fallback — same lookup the mailer uses.
  let token = Deno.env.get("HEROFX_API_TOKEN");
  try {
    const { data } = await admin.from("app_secrets").select("value").eq("key", "HEROFX_API_TOKEN").maybeSingle();
    if (data?.value) token = data.value as string;
  } catch { /* env only */ }
  if (!token) return json({ error: "HEROFX_API_TOKEN not set (app_secrets or env)" }, 500);

  // ── 1) Every customer, following the pagination cursor ────────────────────
  const clients: HeroClient[] = [];
  try {
    let path: string | null = "/partnership/clients/?page=1&page_size=100";
    while (path) {
      const raw = await heroGet(path, token) as Record<string, unknown>;
      if (Array.isArray(raw)) { clients.push(...raw as HeroClient[]); break; }
      clients.push(...((raw.results as HeroClient[]) ?? []));
      // `next` is absolute; reduce it to a path so the base stays in one place.
      const nxt = raw.next as string | null;
      path = nxt ? nxt.replace(/^https?:\/\/[^/]+\/api/, "") : null;
      if (clients.length > 20_000) break; // runaway guard
    }
  } catch (e) {
    console.error("[hero-sync] clients:", e instanceof Error ? e.message : String(e));
    return json({ error: "Hero API unreachable", detail: String(e).slice(0, 200) }, 502);
  }

  // ── 2) Each customer's accounts, then each account's balance ──────────────
  interface Acc {
    clientId: string; email: string | null; accountNumber: string;
    balance: number | null; currency: string | null; type: string | null; platform: string | null;
  }
  const accounts: Acc[] = [];
  /** null = we could not look. 0 = we looked and there is nothing. */
  const balanceByClient = new Map<string, number | null>();

  await pooled(clients, POOL, async (c) => {
    const cid = String(c.id);
    if (outOfTime()) { balanceByClient.set(cid, null); return; }

    const list = await heroGetSoft(`/partnership/user/${cid}/account/`, token);
    if (list == null || !Array.isArray(list)) { balanceByClient.set(cid, null); return; }

    const live = (list as HeroAccount[]).filter((a) => !a.isDemo && !a.isArchived);
    if (!live.length) { balanceByClient.set(cid, 0); return; } // looked; genuinely nothing

    let sum = 0;
    let read = 0;
    for (const a of live) {
      if (outOfTime()) break;
      const d = await heroGetSoft(`/partnership/user/${cid}/account/${a.id}/`, token) as Record<string, unknown> | null;
      if (d == null) continue; // the 500-per-record case — expected, not fatal
      const bal = money(d.balance) ?? money(d.equity);
      read++;
      // Non-USD would misprice the tier thresholds, so it is mirrored but not
      // summed. Every account on the estate today reports USD or no currency.
      if (bal && (bal.currency === null || bal.currency === "USD")) sum += bal.amount;
      else if (bal) console.warn(`[hero-sync] non-USD account ${a.id}: ${bal.currency}`);

      accounts.push({
        clientId: cid,
        email: (c.email ?? "").toLowerCase().trim() || null,
        accountNumber: String(a.id),
        balance: bal?.amount ?? null,
        currency: bal?.currency ?? null,
        type: a.accountTypeTitle ?? null,
        platform: a.platformSlug ?? null,
      });
    }
    balanceByClient.set(cid, read > 0 ? Math.round(sum * 100) / 100 : null);
  });

  // ── 3) Trades, richest accounts first, until the budget runs out ──────────
  // Lots are the commission basis, so this is what pays partners. It is done
  // last because a missed trade window costs a delayed payout, while a missed
  // balance costs a member their academy access.
  interface Trade {
    broker: string; trade_position_id: string; account_number: string; symbol: string | null;
    direction: string | null; volume_lots: number | null; open_time: string | null;
    close_time: string | null; open_price: number | null; close_price: number | null; profit: number | null;
  }
  const trades: Trade[] = [];
  let tradeAccountsScanned = 0;

  if (wantTrades) {
    const end = Math.floor(Date.now() / 1000);
    const start = end - TRADE_WINDOW_DAYS * 86_400;
    const ranked = accounts.filter((a) => a.balance !== null).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));

    for (const a of ranked) {
      if (outOfTime()) break;
      const r = await heroGetSoft(
        `/partnership/user/${a.clientId}/account/${a.accountNumber}/closed_trades/?start=${start}&end=${end}`,
        token,
      ) as Record<string, unknown> | null;
      tradeAccountsScanned++;
      if (r == null) continue;
      const items = (Array.isArray(r) ? r : (r.items as unknown[]) ?? []) as Record<string, unknown>[];
      for (const t of items) {
        const ticket = t.ticket ?? t.id ?? t.position ?? null;
        if (ticket == null) continue;
        trades.push({
          broker: BROKER,
          // Namespaced: trade_events.broker_trade_id is globally unique, and
          // Hero's ticket sequence is not.
          trade_position_id: `hero:${ticket}`,
          account_number: a.accountNumber,
          symbol: (t.symbol as string) ?? null,
          direction: (t.type as string) ?? null,
          volume_lots: Number(t.volume) || null,
          open_time: stamp(t.openTime),
          close_time: stamp(t.closeTime),
          open_price: Number(t.openPrice) || null,
          close_price: Number(t.closePrice) || null,
          profit: Number(t.profit) || null,
        });
      }
    }
  }

  // ── 4) Write the mirror ───────────────────────────────────────────────────
  const clientRows = clients.map((c) => {
    const cid = String(c.id);
    const bal = balanceByClient.has(cid) ? balanceByClient.get(cid)! : null;
    return {
      broker: BROKER,
      client_id: cid,
      email: (c.email ?? "").toLowerCase().trim() || null,
      full_name: c.fullName ?? null,
      registration_date: c.dateJoined ?? null,
      client_type: c.type ?? null,
      // Hero gives the IB's account NUMBER, not their email. tenant_ib_emails
      // joins on email, so partner attribution needs a mapping off this.
      direct_ib_id: c.partnerAccount ?? null,
      // ── WHEN HERO RETURNS THE CLICK ID, THIS IS THE ONLY LINE THAT CHANGES ──
      utm_campaign: c.clickId ?? c.utmClickId ?? null,
      current_balance_usd: bal,
      balance_checked_at: bal === null ? null : new Date().toISOString(),
      synced_at: new Date().toISOString(),
    };
  });

  const fail = (what: string, msg: string) => {
    console.error(`[hero-sync] ${what}:`, msg);
    return json({ error: `${what} failed`, detail: msg }, 500);
  };

  if (clientRows.length) {
    const { error } = await admin.from("broker_clients").upsert(clientRows, { onConflict: "broker,client_id" });
    if (error) return fail("clients upsert", error.message);
  }

  if (accounts.length) {
    const accRows = accounts.map((a) => ({
      broker: BROKER,
      account_number: a.accountNumber,
      client_id: a.clientId,
      email: a.email,
      currency: a.currency ?? "USD",
      balance_usd: a.balance,
      account_type: a.type,
      synced_at: new Date().toISOString(),
    }));
    const { error } = await admin.from("broker_accounts").upsert(accRows, { onConflict: "broker,account_number" });
    if (error) return fail("accounts upsert", error.message);
  }

  if (trades.length) {
    const { error } = await admin.from("broker_trades").upsert(trades, { onConflict: "broker,trade_position_id" });
    if (error) return fail("trades upsert", error.message);
  }

  // ── 5) Ratchet, then roll up ──────────────────────────────────────────────
  // Order matters: the ratchet is what turns an observed balance into the
  // net_deposit the rollup books against the ledger.
  const { data: promoted, error: pErr } = await admin.rpc("promote_balances_to_net_deposit", { p_broker: BROKER });
  if (pErr) return fail("promote balances", pErr.message);

  const { data: rollup, error: rErr } = await admin.rpc("apply_broker_rollup");
  if (rErr) console.error("[hero-sync] rollup:", rErr.message);

  const funded = clientRows.filter((r) => (r.current_balance_usd ?? 0) > 0).length;
  return json({
    ok: true,
    clients: clientRows.length,
    withEmail: clientRows.filter((r) => r.email).length,
    withClickId: clientRows.filter((r) => r.utm_campaign).length,
    accountsRead: accounts.length,
    fundedClients: funded,
    balanceUnreadable: clientRows.filter((r) => r.current_balance_usd === null).length,
    tradeAccountsScanned,
    trades: trades.length,
    ratchetRaised: promoted ?? 0,
    rollup: rollup ?? null,
    tookMs: Date.now() - started,
    truncated: outOfTime(),
  });
});
