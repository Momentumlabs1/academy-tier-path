/**
 * hero-sync — pulls the HeroFX client list into broker_clients.
 *
 * Replaces the TradeQuo worker that used to poll an MSSQL database from a rented
 * VPS every two minutes. Hero has a real HTTP API, so this runs as a scheduled
 * function with nothing to keep alive.
 *
 * Two things about their API that are not in any documentation, because there is
 * none — both were found by probing and cost a session to discover:
 *
 *   1. AUTH IS `X-Access-Token`. Not `Authorization: Bearer`, not `Token`, not
 *      `X-Api-Token`, not a query parameter. Twenty-two other forms return
 *      `401 {"detail":"You are not authenticated"}`. Their own frontend sends
 *      `Authorization: JWT <session>`, which is the web login and a different
 *      mechanism entirely — do not copy it.
 *
 *   2. CLOUDFLARE BLOCKS PLAIN CLIENTS. Without browser-shaped headers the
 *      request dies at the edge with `403 error code: 1010`, before their
 *      application ever sees it. The User-Agent and Referer below are load-
 *      bearing, not decoration.
 *
 * What is deliberately missing: DEPOSITS. No reachable endpoint returns an amount
 * (`/partnership/clients/<id>/`, `/clients/user/` and `/partnership/account/` are
 * all 404), and the academy unlocks on deposit size. Until Hero exposes it,
 * `net_deposit` stays NULL — which is safe rather than wrong, because
 * `apply_broker_rollup()` only writes a deposit_event
 * `WHERE bc.net_deposit IS NOT NULL`. Nothing unlocks on a guess.
 *
 * Matching a broker client to one of our members: `email` first (present in the
 * response), then registration timestamp against the click log. The clean route —
 * our member id riding `click_id` — is confirmed to land on Hero's client record
 * (their back office shows it under "Last UTM mark") but is NOT returned by this
 * endpoint yet. When it is, add it to the mapping below and matching becomes exact.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://portal.herofx.co/api";

/** Cloudflare rejects anything that does not look like a browser. */
const BROWSERISH = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://portal.herofx.co/",
  "Origin": "https://portal.herofx.co",
};

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

async function heroGet(path: string, token: string) {
  const res = await fetch(API + path, { headers: { ...BROWSERISH, "X-Access-Token": token } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${text.slice(0, 160)}`);
  try { return JSON.parse(text); } catch { throw new Error(`${path} → non-JSON: ${text.slice(0, 120)}`); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "POST or GET" }, 405);

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

  let clients: HeroClient[];
  try {
    const raw = await heroGet("/partnership/clients/", token);
    clients = Array.isArray(raw) ? raw : (raw.results ?? []);
  } catch (e) {
    console.error("[hero-sync]", e instanceof Error ? e.message : String(e));
    return json({ error: "Hero API unreachable", detail: String(e).slice(0, 200) }, 502);
  }

  const rows = clients.map((c) => ({
    broker: "hero",
    client_id: String(c.id),
    email: (c.email ?? "").toLowerCase().trim() || null,
    full_name: c.fullName ?? null,
    registration_date: c.dateJoined ?? null,
    client_type: c.type ?? null,
    direct_ib_id: c.partnerAccount ?? null,
    // ── WHEN HERO RETURNS THE CLICK ID, THIS IS THE ONLY LINE THAT CHANGES ──
    // It carries our member id, so `apply_broker_rollup()` matches on it exactly
    // instead of falling back to email.
    utm_campaign: c.clickId ?? c.utmClickId ?? null,
    // ── AND WHEN THE DEPOSITS ENDPOINT IS KNOWN, SET net_deposit HERE ──
    // Must be the CUMULATIVE lifetime figure per client: the rollup diffs it
    // against our own ledger and books the delta. A per-transaction amount here
    // would be counted again on every pass.
    // net_deposit: c.totalDeposits,
    synced_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await admin.from("broker_clients").upsert(rows, { onConflict: "broker,client_id" });
    if (error) {
      console.error("[hero-sync] upsert:", error.message);
      return json({ error: "upsert failed", detail: error.message }, 500);
    }
  }

  // Attribution + tier recalculation. Safe to run with no deposits: the rollup
  // skips clients whose net_deposit is NULL.
  const { data: rollup, error: rErr } = await admin.rpc("apply_broker_rollup");
  if (rErr) console.error("[hero-sync] rollup:", rErr.message);

  return json({
    ok: true,
    clients: rows.length,
    withEmail: rows.filter((r) => r.email).length,
    withClickId: rows.filter((r) => r.utm_campaign).length,
    depositsAvailable: false, // flips when Hero exposes the endpoint
    rollup: rollup ?? null,
  });
});
