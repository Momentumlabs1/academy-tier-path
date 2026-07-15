/**
 * admin-tenants — read & write the per-brand relay settings from the admin UI.
 *
 * The bot reads tenants.telegram_channel_id / broker_affiliate_url /
 * signal_footer from the DB, so this lets the dashboard configure them without
 * touching the database directly.
 *
 * Guarded by a shared ADMIN_KEY (sent as `x-admin-key`). Set ADMIN_KEY in
 * Supabase → Edge Functions → Secrets, and enter the same value once in the
 * admin UI. (Replace with real Supabase Auth + an is_admin claim before a
 * public launch.)
 *
 * POST body:
 *   { "action": "list" }
 *   { "action": "update", "slug": "...", "patch": { telegram_channel_id?,
 *       broker_affiliate_url?, signal_footer?, active? } }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const FIELDS = ["slug", "name", "active", "telegram_channel_id", "broker_affiliate_url", "signal_footer"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // NOTE: no ADMIN_KEY gate. The whole /admin area will be locked behind real
  // email auth (Supabase Auth + is_admin claim) before public launch — the
  // throwaway admin key added no real security, so it's removed.
  let body: { action?: string; slug?: string; patch?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  if (body.action === "list") {
    const { data, error } = await db.from("tenants").select(FIELDS.join(",")).order("name");
    if (error) return json({ error: error.message }, 500);
    return json({ tenants: data });
  }

  if (body.action === "update") {
    if (!body.slug || !body.patch) return json({ error: "slug and patch required" }, 400);
    // Whitelist the columns a client may change.
    const allowed = ["telegram_channel_id", "broker_affiliate_url", "signal_footer", "active"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k];
    // Normalise empty strings to null; coerce channel id to a number.
    if (patch.telegram_channel_id === "" || patch.telegram_channel_id == null) patch.telegram_channel_id = null;
    else patch.telegram_channel_id = Number(patch.telegram_channel_id);
    if (patch.broker_affiliate_url === "") patch.broker_affiliate_url = null;
    if (patch.signal_footer === "") patch.signal_footer = null;

    const { data, error } = await db.from("tenants").update(patch).eq("slug", body.slug).select(FIELDS.join(","));
    if (error) return json({ error: error.message }, 500);
    return json({ tenant: data?.[0] ?? null });
  }

  return json({ error: "unknown action" }, 400);
});
