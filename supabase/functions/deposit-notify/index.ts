/**
 * deposit-notify — mail members the moment their deposit is booked.
 *
 * The broker DB refreshes every 10 minutes; apply_broker_rollup turns that into
 * `deposit_events` rows. The dashboard notices on its own (it polls the member
 * row), but a member who closed the tab used to hear nothing. This drains the
 * unsent tail: one e-mail and one in-app notification per deposit, then the row
 * is stamped so it can never go out twice.
 *
 * Runs from pg_cron every 2 minutes. Also callable by hand:
 *   POST { "dry_run": true }   // report what would be sent, send nothing
 *
 * Auth: service-role key in the Authorization header (that's what cron sends).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cosmos-candles.com";
const BATCH = 50;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

/** €100 / €2 000 / €50 000 — kept in step with TIERS in src/lib/academy-data.ts. */
const TIERS: Array<{ key: string; name: string; min: number }> = [
  { key: "foundation", name: "Foundation", min: 100 },
  { key: "operator", name: "Operator", min: 2_000 },
  { key: "elite", name: "Elite", min: 50_000 },
];
const tierName = (deposit: number) => [...TIERS].reverse().find((t) => deposit >= t.min)?.name;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Same guard the other scheduled functions use: pg_cron sends x-cron-secret.
  // A service-role Authorization header also passes, for manual runs.
  const { data: settings } = await db.from("academy_settings").select("cron_secret").eq("id", 1).maybeSingle();
  const cronSecret = settings?.cron_secret as string | undefined;
  const byCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
  const byService = (req.headers.get("Authorization") ?? "").includes(serviceKey);
  if (!byCron && !byService) return json({ error: "forbidden" }, 403);

  let body: { dry_run?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* cron posts an empty body — that's fine */
  }
  const dryRun = body.dry_run === true;

  async function secret(key: string): Promise<string | undefined> {
    const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
    return (data?.value as string | undefined) ?? Deno.env.get(key) ?? undefined;
  }

  // Only real, positive deposits — withdrawals and €0 corrections say nothing to
  // a member and must never trigger a "your deposit arrived" mail.
  const { data: pending, error: pErr } = await db
    .from("deposit_events")
    .select("id, member_id, amount, tier_after, created_at")
    .is("notified_at", null)
    .eq("type", "deposit")
    .gt("amount", 0)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (pErr) return json({ error: pErr.message }, 500);
  if (!pending?.length) return json({ ok: true, pending: 0, sent: 0 });

  const memberIds = [...new Set(pending.map((r) => String(r.member_id)))];
  const { data: members } = await db
    .from("members")
    .select("id, email, name, deposit, referred_by_tenant")
    .in("id", memberIds);
  const byId = new Map((members ?? []).map((m) => [String(m.id), m]));

  // Brand the mail with the partner the member came in through, when there is one.
  const slugs = [...new Set((members ?? []).map((m) => m.referred_by_tenant).filter(Boolean))] as string[];
  const { data: tenants } = slugs.length
    ? await db.from("tenants").select("slug, name, config").in("slug", slugs)
    : { data: [] as Record<string, unknown>[] };
  const brandBySlug = new Map((tenants ?? []).map((t) => [String(t.slug), t]));

  const guard = await secret("SEND_SECRET");
  const results: Array<{ id: string; status: string }> = [];
  const sentIds: string[] = [];

  for (const row of pending) {
    const member = byId.get(String(row.member_id));
    const to = member?.email as string | undefined;

    // No address = nothing we can do. Stamp it anyway so it stops being retried
    // forever, and say so in the response.
    if (!to) {
      results.push({ id: String(row.id), status: "skipped:no-email" });
      if (!dryRun) sentIds.push(String(row.id));
      continue;
    }

    const total = Number(member?.deposit ?? row.amount);
    const name = tierName(total);
    const slug = member?.referred_by_tenant as string | undefined;
    const t = slug ? brandBySlug.get(slug) : undefined;
    const cfg = (t?.config ?? {}) as Record<string, unknown>;

    if (dryRun) {
      results.push({ id: String(row.id), status: `would-send:${to}` });
      continue;
    }

    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        ...(guard ? { "x-send-secret": guard } : {}),
      },
      body: JSON.stringify({
        kind: "deposit_confirmed",
        to,
        firstName: String(member?.name ?? "").split(" ")[0] || undefined,
        depositAmount: Number(row.amount),
        tierName: name,
        dashboardUrl: SITE_URL,
        brand: t ? { name: String(t.name), accent: cfg.accentColor ?? cfg.primaryColor } : undefined,
      }),
    });

    if (!res.ok) {
      // Leave notified_at NULL so the next run retries this one.
      results.push({ id: String(row.id), status: `failed:${res.status}` });
      continue;
    }

    // In-app bell, so the news is there when they come back even if mail is slow.
    await db.from("notifications").insert({
      member_id: row.member_id,
      type: name ? "tier_unlocked" : "announcement",
      title: name ? `${name} unlocked` : "Deposit confirmed",
      body: name
        ? `Your deposit arrived — ${name} is live. Signals, lessons and tools are unlocked.`
        : "Your deposit arrived and has been credited to your account.",
      link: "/",
    });

    sentIds.push(String(row.id));
    results.push({ id: String(row.id), status: `sent:${to}` });
  }

  if (sentIds.length && !dryRun) {
    await db.from("deposit_events").update({ notified_at: new Date().toISOString() }).in("id", sentIds);
  }

  return json({
    ok: true,
    dry_run: dryRun,
    pending: pending.length,
    sent: results.filter((r) => r.status.startsWith("sent")).length,
    failed: results.filter((r) => r.status.startsWith("failed")).length,
    results,
  });
});
