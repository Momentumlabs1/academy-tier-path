/**
 * admin-bootstrap — create the single admin login once, from secrets (not code).
 *
 * The whole /admin area is gated to ONE email (kontakt@momentumlabs.at) and
 * sign-ups are disabled, so the account must be created out-of-band. Rather than
 * clicking through the Supabase dashboard, set these Edge-Function secrets:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, BOOTSTRAP_SECRET
 * then call this function ONCE:
 *   curl -X POST .../functions/v1/admin-bootstrap -H "x-bootstrap-secret: <BOOTSTRAP_SECRET>"
 * It creates (or resets the password of) the admin user, email pre-confirmed.
 * The password never touches the repo — it lives only in Supabase secrets/Auth.
 *
 * Delete/disable this function after first use.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const secret = Deno.env.get("BOOTSTRAP_SECRET");
  if (!secret || req.headers.get("x-bootstrap-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const email = Deno.env.get("ADMIN_EMAIL");
  const password = Deno.env.get("ADMIN_PASSWORD");
  if (!email || !password) return json({ error: "set ADMIN_EMAIL and ADMIN_PASSWORD secrets" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Find an existing user with this email.
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, action: "password_reset", user_id: existing.id });
  }

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, action: "created", user_id: data.user?.id });
});
