/**
 * password-reset — mints a recovery link and mails it from OUR domain.
 *
 * Why this exists rather than calling `supabase.auth.resetPasswordForEmail`
 * from the browser: that path sends the mail through Supabase's own SMTP, so it
 * arrives from `noreply@mail.app.supabase.io` with a stock template. For a
 * product that already owns `send.cosmos-candles.com` and a branded mailer, that
 * reads as phishing and frequently lands in spam — members concluded the reset
 * was broken, which is exactly what happened here.
 *
 * So: the admin API mints the recovery link WITHOUT sending anything
 * (`generateLink` returns `action_link`), and the existing `send-email`
 * function delivers it through Resend with the house template.
 *
 * Two deliberate properties:
 *
 *  · The response is always 200 with the same body, whether or not the address
 *    belongs to an account. Anything else turns this endpoint into a membership
 *    oracle — post an address, learn whether that person is a customer.
 *
 *  · The redirect goes to /reset-password, the only page that can actually
 *    complete the flow. It used to point at /login, the admin Command Center,
 *    which no member can get through.
 *
 * Deploy with --no-verify-jwt: a signed-out member is precisely who needs it.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cosmos-candles.com";

/** Same lookup the mailer uses: DB-held secrets first, env as the fallback. */
async function secret(admin: ReturnType<typeof createClient>, key: string): Promise<string | undefined> {
  try {
    const { data } = await admin.from("app_secrets").select("value").eq("key", key).maybeSingle();
    if (data?.value) return data.value as string;
  } catch { /* fall through to env */ }
  return Deno.env.get(key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { email?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const email = String(body.email ?? "").trim().toLowerCase();
  // The uniform reply. Everything below returns exactly this, including the
  // "no such account" path — see the note above about not leaking membership.
  const ok = () => json({ ok: true, message: "If that address has an account, a reset link is on its way." });

  if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/reset-password` },
  });

  // Unknown address, rate limit, anything else — the member sees the same reply.
  if (error || !data?.properties?.action_link) {
    console.warn("[password-reset] no link minted:", error?.message ?? "unknown address");
    return ok();
  }

  const sendSecret = await secret(admin, "SEND_SECRET");
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sendSecret ? { "x-send-secret": sendSecret } : {}),
    },
    body: JSON.stringify({
      kind: "password_reset",
      to: email,
      resetUrl: data.properties.action_link,
      dashboardUrl: SITE_URL,
    }),
  });

  if (!res.ok) {
    // Worth a log line: the member is told to check their inbox either way, so a
    // silent mailer failure here is otherwise invisible.
    console.error("[password-reset] send-email failed:", res.status, await res.text().catch(() => ""));
  }

  return ok();
});
