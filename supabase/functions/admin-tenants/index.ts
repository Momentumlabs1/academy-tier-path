/**
 * admin-tenants — read & write per-brand settings AND provision affiliates.
 *
 * The bot reads tenants.telegram_channel_id / broker_affiliate_url /
 * signal_footer from the DB, so this lets the dashboard configure them without
 * touching the database directly. It also onboards new partners: create the
 * affiliate's login + brand and link them, so they can sign into /partner.
 *
 * Auth: EVERY action requires the caller to be the platform admin — we verify
 * the Supabase access token in the Authorization header and check the email.
 * `update` can also set landing branding via the `config` jsonb.
 *
 * POST body:
 *   { "action": "list" }
 *   { "action": "update", "slug": "...", "patch": { telegram_channel_id?,
 *       broker_affiliate_url?, signal_footer?, active? } }
 *   { "action": "create_partner", "email", "password", "name", "slug",
 *       "partner_rate"?, "partner_rate_unit"? }   // admin only
 *   { "action": "update_partner", "slug", "patch": { name?, partner_rate?,
 *       partner_rate_unit?, partner_volume?, active? } }   // admin only
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "kontakt@momentumlabs.at").toLowerCase();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const FIELDS = ["slug", "name", "active", "telegram_channel_id", "broker_affiliate_url", "signal_footer", "config"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Slugs that would collide with real app routes — a partner may not own one.
// registrieren/willkommen are the old German sign-up paths: they still exist as
// redirect routes to /signup and /welcome, so they stay reserved too.
const RESERVED_SLUGS = new Set([
  "admin", "partner", "partner-programm", "login", "signals", "lessons", "tools", "tier", "unlocks",
  "notifications", "settings", "t", "api", "assets", "hegemony", "auth", "dashboard",
  "registrieren", "willkommen", "signup", "welcome",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: {
    action?: string; slug?: string; patch?: Record<string, unknown>;
    email?: string; password?: string; name?: string;
    partner_rate?: number; partner_rate_unit?: string;
  };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify the caller is the platform admin (used by the sensitive actions).
  async function assertAdmin(): Promise<boolean> {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return false;
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user?.email) return false;
    return data.user.email.toLowerCase() === ADMIN_EMAIL;
  }

  if (body.action === "list") {
    if (!(await assertAdmin())) return json({ error: "unauthorized" }, 401);
    const { data, error } = await db.from("tenants").select(FIELDS.join(",")).order("name");
    if (error) return json({ error: error.message }, 500);
    return json({ tenants: data });
  }

  if (body.action === "update") {
    if (!(await assertAdmin())) return json({ error: "unauthorized" }, 401);
    if (!body.slug || !body.patch) return json({ error: "slug and patch required" }, 400);
    const allowed = ["telegram_channel_id", "broker_affiliate_url", "signal_footer", "active", "name", "config"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k];
    if ("config" in patch && (typeof patch.config !== "object" || patch.config === null)) delete patch.config;
    if ("name" in patch && !String(patch.name ?? "").trim()) delete patch.name;
    if (patch.telegram_channel_id === "" || patch.telegram_channel_id == null) patch.telegram_channel_id = null;
    else patch.telegram_channel_id = Number(patch.telegram_channel_id);
    if (patch.broker_affiliate_url === "") patch.broker_affiliate_url = null;
    if (patch.signal_footer === "") patch.signal_footer = null;

    const { data, error } = await db.from("tenants").update(patch).eq("slug", body.slug).select(FIELDS.join(","));
    if (error) return json({ error: error.message }, 500);
    return json({ tenant: data?.[0] ?? null });
  }

  // ── Onboard a new affiliate: auth user + brand, linked. Admin only. ──
  if (body.action === "create_partner") {
    if (!(await assertAdmin())) return json({ error: "unauthorized" }, 401);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const slug = body.slug ? slugify(String(body.slug)) : slugify(name);
    if (!email || !password || !name || !slug) return json({ error: "email, password, name required" }, 400);
    if (RESERVED_SLUGS.has(slug)) return json({ error: `Slug "${slug}" is reserved — please pick another.` }, 400);
    const rate = Number(body.partner_rate ?? 5);
    const unit = body.partner_rate_unit === "percent" ? "percent" : "usd_per_lot";

    // 1) Create (or find) the partner's auth account.
    let ownerId: string | null = null;
    const { data: created, error: cErr } = await db.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { role: "affiliate", brand: name },
    });
    if (cErr) {
      // Likely already exists — look them up so we can still link the brand.
      const { data: list } = await db.auth.admin.listUsers();
      ownerId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
      if (!ownerId) return json({ error: cErr.message }, 500);
    } else {
      ownerId = created.user?.id ?? null;
    }

    // 2) Upsert the brand and link the owner.
    const { data: tenant, error: tErr } = await db
      .from("tenants")
      .upsert(
        { slug, name, owner_user_id: ownerId, partner_rate: rate, partner_rate_unit: unit, active: true },
        { onConflict: "slug" },
      )
      .select("slug, name, owner_user_id, partner_rate, partner_rate_unit, active")
      .single();
    if (tErr) return json({ error: tErr.message }, 500);

    // 3) Audit trail.
    await db.from("audit_log").insert({
      actor_email: ADMIN_EMAIL, action: "affiliate_created", target: slug,
      detail: `Partner ${name} (${email}) created · ${rate} ${unit}`,
    });

    return json({ ok: true, tenant, portalUrl: "/partner" });
  }

  // ── Update a partner's economics. Admin only. ──
  if (body.action === "update_partner") {
    if (!(await assertAdmin())) return json({ error: "unauthorized" }, 401);
    if (!body.slug || !body.patch) return json({ error: "slug and patch required" }, 400);
    const allowed = ["name", "partner_rate", "partner_rate_unit", "partner_volume", "active"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k];
    const { data, error } = await db
      .from("tenants").update(patch).eq("slug", body.slug)
      .select("slug, name, owner_user_id, partner_rate, partner_rate_unit, partner_volume, active");
    if (error) return json({ error: error.message }, 500);
    return json({ tenant: data?.[0] ?? null });
  }

  return json({ error: "unknown action" }, 400);
});
