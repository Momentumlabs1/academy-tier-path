/**
 * partner-admin — invite a superpartner and let them into their own admin area.
 *
 * A superpartner runs /<slug>/admin. They sign in with a password only: the slug
 * in the URL already identifies the account, so the e-mail never reaches the
 * browser. That means the sign-in has to happen here, server-side — the client
 * posts { slug, password } and gets a session back, never an address.
 *
 * POST body:
 *   { "action": "invite", "slug", "email" }        // admin only — links the owner,
 *                                                  // flags the brand, mails the link
 *   { "action": "accept", "slug", "token", "password" }   // one-time: choose password
 *   { "action": "login",  "slug", "password" }            // returning sign-in
 *
 * `accept` and `login` are public by design (a partner has no session yet), so
 * this function must be deployed with verify_jwt = false.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "kontakt@momentumlabs.at").toLowerCase();
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cosmos-candles.com";
const INVITE_TTL_HOURS = 72;
const MIN_PASSWORD = 10;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { action?: string; slug?: string; email?: string; token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const slug = String(body.slug ?? "").trim().toLowerCase();
  if (!slug) return json({ error: "slug required" }, 400);

  /** Read a secret from app_secrets, falling back to the env. */
  async function secret(key: string): Promise<string | undefined> {
    const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
    return (data?.value as string | undefined) ?? Deno.env.get(key) ?? undefined;
  }

  /** The signed-in caller is the platform admin. */
  async function isAdmin(): Promise<boolean> {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return false;
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user?.email) return false;
    return data.user.email.toLowerCase() === ADMIN_EMAIL;
  }

  /** Sign in as the tenant owner and hand the session back to the browser. */
  async function sessionFor(email: string, password: string) {
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return null;
    return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
  }

  // ---------------------------------------------------------------- invite
  if (body.action === "invite") {
    if (!(await isAdmin())) return json({ error: "forbidden" }, 403);

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return json({ error: "email required" }, 400);

    const { data: tenant } = await db.from("tenants").select("slug, name").eq("slug", slug).maybeSingle();
    if (!tenant) return json({ error: `No brand with slug "${slug}"` }, 404);

    // Find the partner's auth account, or create one. They may already exist as a
    // normal member (that's how Zeko signed up) — reuse that user, never a second.
    let ownerId: string | null = null;
    const { data: list } = await db.auth.admin.listUsers();
    ownerId = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (!ownerId) {
      const { data: created, error: cErr } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { role: "affiliate", brand: tenant.name },
      });
      if (cErr) return json({ error: cErr.message }, 500);
      ownerId = created.user?.id ?? null;
    }
    if (!ownerId) return json({ error: "could not resolve owner" }, 500);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000).toISOString();

    const { error: uErr } = await db
      .from("tenants")
      .update({ owner_user_id: ownerId, superpartner: true })
      .eq("slug", slug);
    if (uErr) return json({ error: uErr.message }, 500);

    // The token is a credential — it lives in partner_admin_invites, which is
    // service-role only. Never on `tenants`, which the anon key can read.
    const { error: iErr } = await db
      .from("partner_admin_invites")
      .upsert({ tenant_slug: slug, token, expires_at: expires }, { onConflict: "tenant_slug" });
    if (iErr) return json({ error: iErr.message }, 500);

    const inviteUrl = `${SITE_URL}/${slug}/admin?invite=${token}`;
    const brand = tenant.name ?? slug;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h1 style="font-size:20px;margin:0 0 12px">Your ${brand} admin access is ready</h1>
        <p style="color:#444;line-height:1.6;margin:0 0 20px">
          You've been set up as a partner on Cosmos Candles. Open the link below once to choose
          your password — after that you'll reach your dashboard any time at
          <strong>${SITE_URL.replace(/^https?:\/\//, "")}/${slug}/admin</strong>.
        </p>
        <p style="margin:0 0 20px">
          <a href="${inviteUrl}" style="display:inline-block;background:#7CE577;color:#08240b;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">
            Choose your password
          </a>
        </p>
        <p style="color:#777;font-size:12px;line-height:1.6;margin:0">
          The link works once and expires in ${INVITE_TTL_HOURS} hours. Your password is tied to
          ${email} — you won't need to type the address again, just the password.
        </p>
      </div>`;

    const guard = await secret("SEND_SECRET");
    const mail = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        ...(guard ? { "x-send-secret": guard } : {}),
      },
      body: JSON.stringify({ to: email, subject: `Your ${brand} admin access`, html, fromName: brand }),
    });

    // The account is provisioned either way — say so plainly if only the mail failed,
    // so the admin can hand the link over manually instead of re-inviting blindly.
    if (!mail.ok) {
      const detail = await mail.text().catch(() => "");
      return json({ ok: true, emailed: false, inviteUrl, error: `Mail failed: ${detail.slice(0, 200)}` });
    }
    return json({ ok: true, emailed: true, inviteUrl });
  }

  // ---------------------------------------------------------------- accept
  if (body.action === "accept") {
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    if (!token) return json({ error: "token required" }, 400);
    if (password.length < MIN_PASSWORD) return json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, 400);

    const { data: tenant } = await db
      .from("tenants")
      .select("slug, owner_user_id, superpartner")
      .eq("slug", slug)
      .maybeSingle();
    const { data: invite } = await db
      .from("partner_admin_invites")
      .select("token, expires_at")
      .eq("tenant_slug", slug)
      .maybeSingle();

    // Constant-length compare isn't worth it here (the token is 64 random hex
    // chars), but the check must be exact and the failure message identical.
    if (!invite?.token || invite.token !== token) {
      return json({ error: "This invite link is no longer valid." }, 400);
    }
    if (new Date(String(invite.expires_at)) < new Date()) {
      return json({ error: "This invite link has expired. Ask for a new one." }, 400);
    }
    if (!tenant?.owner_user_id) return json({ error: "No account linked to this brand." }, 400);

    const { data: owner } = await db.auth.admin.getUserById(String(tenant.owner_user_id));
    const email = owner?.user?.email;
    if (!email) return json({ error: "No account linked to this brand." }, 400);

    const { error: pErr } = await db.auth.admin.updateUserById(String(tenant.owner_user_id), { password });
    if (pErr) return json({ error: pErr.message }, 500);

    // Burn the token so the link can't be replayed.
    await db.from("partner_admin_invites").delete().eq("tenant_slug", slug);

    const session = await sessionFor(email, password);
    if (!session) return json({ error: "Password set — please sign in." }, 200);
    return json({ ok: true, session });
  }

  // ----------------------------------------------------------------- login
  if (body.action === "login") {
    const password = String(body.password ?? "");
    if (!password) return json({ error: "password required" }, 400);

    const { data: tenant } = await db
      .from("tenants")
      .select("owner_user_id, superpartner, active")
      .eq("slug", slug)
      .maybeSingle();

    // Same generic answer for "no such brand", "not a superpartner" and "wrong
    // password" — the form must not double as a way to probe which slugs exist.
    const deny = () => json({ error: "Wrong password." }, 401);
    if (!tenant?.superpartner || !tenant.active || !tenant.owner_user_id) return deny();

    const { data: owner } = await db.auth.admin.getUserById(String(tenant.owner_user_id));
    const email = owner?.user?.email;
    if (!email) return deny();

    const session = await sessionFor(email, password);
    if (!session) return deny();
    return json({ ok: true, session });
  }

  return json({ error: "unknown action" }, 400);
});
