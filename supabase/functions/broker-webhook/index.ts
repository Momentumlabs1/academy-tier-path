/**
 * broker-webhook Edge Function
 *
 * Called by the broker (or a middleware) when a deposit/withdrawal
 * is verified. Signs are validated via HMAC-SHA256.
 *
 * Expected request body (JSON):
 * {
 *   event:       "deposit" | "withdrawal" | "trade"
 *   member_email: string
 *   amount:      number          // deposit/withdrawal: EUR (sign handled below)
 *   lots:        number          // trade: lot size of the executed trade
 *   symbol:      string          // trade: instrument (optional)
 *   broker_id:   string          // broker's internal transaction/trade ID (idempotency)
 *   timestamp:   number          // Unix epoch (seconds)
 *   signature:   string          // HMAC-SHA256 hex of `${timestamp}.${JSON.stringify(payload_without_sig)}`
 * }
 *
 * "trade" events feed the activity systematics: each reported trade is stored and
 * the member's rolling-window lots + activity status are recomputed. Deposits and
 * trades share this one signed endpoint.
 *
 * Set WEBHOOK_SECRET in Supabase Edge Function secrets.
 *
 * Deploy:
 *   supabase functions deploy broker-webhook --no-verify-jwt
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TOLERANCE_SECONDS = 300; // 5-minute replay window

async function verifySignature(
  secret: string,
  timestamp: number,
  body: string,
  signature: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = encoder.encode(`${timestamp}.${body}`);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, data);
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

function tierForDeposit(deposit: number): string | null {
  if (deposit >= 50_000) return "elite";
  if (deposit >= 2_000) return "operator";
  if (deposit >= 100) return "foundation";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[broker-webhook] WEBHOOK_SECRET not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const rawBody = await req.text();
  let payload: {
    event: string;
    member_email: string;
    amount: number;
    lots?: number;
    symbol?: string;
    broker_id: string;
    timestamp: number;
    signature: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // --- Timestamp replay protection ---
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - payload.timestamp) > TOLERANCE_SECONDS) {
    return new Response(JSON.stringify({ error: "Timestamp out of tolerance" }), { status: 401 });
  }

  // --- HMAC verification ---
  const { signature, ...bodyWithoutSig } = payload;
  const valid = await verifySignature(
    webhookSecret,
    payload.timestamp,
    JSON.stringify(bodyWithoutSig),
    signature,
  );
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  if (!["deposit", "withdrawal", "trade"].includes(payload.event)) {
    return new Response(JSON.stringify({ error: "Unknown event type" }), { status: 400 });
  }

  // --- Supabase admin client (service role — bypasses RLS) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // --- Find member ---
  const { data: member, error: memberErr } = await supabase
    .from("members")
    .select("id, email, deposit, tier")
    .eq("email", payload.member_email.toLowerCase().trim())
    .single();

  if (memberErr || !member) {
    console.warn("[broker-webhook] Member not found:", payload.member_email);
    return new Response(JSON.stringify({ error: "Member not found" }), { status: 404 });
  }

  // --- Trade event: feed the activity systematics ---
  if (payload.event === "trade") {
    const lots = Math.abs(Number(payload.lots ?? 0));
    if (!(lots > 0)) {
      return new Response(JSON.stringify({ error: "lots required for trade event" }), { status: 400 });
    }
    // Idempotent on broker_id (a redelivered trade must not double-count).
    const { error: tErr } = await supabase.from("trade_events").upsert(
      {
        member_id: member.id,
        lots,
        symbol: payload.symbol ?? null,
        broker_trade_id: payload.broker_id,
        traded_at: new Date(payload.timestamp * 1000).toISOString(),
      },
      { onConflict: "broker_trade_id", ignoreDuplicates: true },
    );
    if (tErr) {
      console.error("[broker-webhook] trade insert error:", tErr);
      return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
    }
    // Refresh this member's rolling lots + activity status immediately.
    await supabase.rpc("academy_recompute_activity", { p_member: member.id });
    return new Response(
      JSON.stringify({ ok: true, member_id: member.id, event: "trade", lots }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Deposit amount: positive = deposit, negative = withdrawal
  const amount =
    payload.event === "withdrawal"
      ? -Math.abs(payload.amount)
      : Math.abs(payload.amount);

  // --- Insert deposit_event (trigger will update member + tier automatically) ---
  const { error: insertErr } = await supabase.from("deposit_events").insert({
    member_id: member.id,
    amount,
    type: payload.event as "deposit" | "withdrawal",
    note: `Broker ID: ${payload.broker_id}`,
  });

  if (insertErr) {
    console.error("[broker-webhook] Insert error:", insertErr);
    return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
  }

  // --- Audit log entry ---
  await supabase.from("audit_log").insert({
    actor_email: "broker-webhook",
    action: "deposit_verified",
    target: member.email,
    detail: `${payload.event} €${Math.abs(amount)} via broker ${payload.broker_id}`,
  });

  return new Response(
    JSON.stringify({ ok: true, member_id: member.id }),
    { headers: { "Content-Type": "application/json" } },
  );
});
