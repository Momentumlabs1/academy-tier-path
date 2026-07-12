/**
 * create-telegram-link — issues a one-time deep-link token for a verified
 * member so the website's "Connect Telegram" button can hand them a
 * t.me/<bot>?start=<token> URL. The bot resolves the token in /start.
 *
 * Body: { email: string, tenant?: string }  (tenant slug, optional)
 * Returns: { url: "https://t.me/<bot>?start=<token>" }
 *
 * Auth note (v1): identifies the member by email. Once real Supabase Auth is
 * wired, take the member from the JWT instead of the request body.
 *
 * Deploy: verify_jwt = false (called from the public site); it validates the
 * member itself. Secrets: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SERVICE_ROLE_KEY.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

let cachedBotUsername: string | null = null;
async function botUsername(): Promise<string> {
  if (cachedBotUsername) return cachedBotUsername;
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const j = await res.json();
  cachedBotUsername = j?.result?.username ?? "";
  return cachedBotUsername!;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { email?: string; tenant?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const email = body.email?.toLowerCase().trim();
  if (!email) return json({ error: "email required" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 1. Verify the member exists and has crossed the signal threshold.
  const { data: member } = await db
    .from("members")
    .select("id, deposit, name")
    .eq("email", email)
    .maybeSingle();

  if (!member) return json({ error: "member_not_found" }, 404);
  if (Number(member.deposit) < MIN_DEPOSIT) {
    return json({ error: "deposit_not_verified", need: MIN_DEPOSIT }, 403);
  }

  // 2. Resolve the tenant channel (default to the first active brand).
  let tenantId: string | null = null;
  if (body.tenant) {
    const { data: t } = await db.from("tenants").select("id").eq("slug", body.tenant).maybeSingle();
    tenantId = t?.id ?? null;
  }
  if (!tenantId) {
    const { data: t } = await db.from("tenants").select("id").eq("active", true).limit(1).maybeSingle();
    tenantId = t?.id ?? null;
  }

  // 3. Reuse an existing pending/linked row for this member, else create one.
  const { data: existing } = await db
    .from("telegram_links")
    .select("link_token, status")
    .eq("member_id", member.id)
    .in("status", ["pending", "linked", "joined"])
    .maybeSingle();

  let token = existing?.link_token as string | undefined;
  if (!token) {
    const { data: created, error } = await db
      .from("telegram_links")
      .insert({ member_id: member.id, tenant_id: tenantId, status: "pending" })
      .select("link_token")
      .single();
    if (error || !created) return json({ error: "could_not_create_link" }, 500);
    token = created.link_token as string;
  }

  const user = await botUsername();
  if (!user) return json({ error: "bot_not_configured" }, 500);

  return json({ url: `https://t.me/${user}?start=${token}` });
});
