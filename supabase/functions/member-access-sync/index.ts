/**
 * member-access-sync — re-evaluate ONE member's signal access and enforce it.
 *
 * The relay bot gates ENTRY (only deposit ≥ €100 gets approved into a brand
 * channel). This closes the loop on the other side: when a member withdraws or
 * drops below the threshold, this function KICKS them from every channel they're
 * in. Telegram has no logic of its own — we already store the bridge
 * (telegram_links.telegram_user_id ↔ member), so removal is just a ban+unban.
 *
 * Trigger it from the broker webhook whenever a deposit/withdrawal changes a
 * member's balance, or from the admin UI manually.
 *
 * POST body: { "member_id": "uuid" }  or  { "email": "..." }
 * Optional guard: if ACCESS_SYNC_SECRET is set, require header x-access-secret.
 *
 * Kick = banChatMember then unbanChatMember(only_if_banned) so the member can
 * rejoin later if they deposit again (a permanent ban would block re-entry).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT_FOR_SIGNALS = 100; // Foundation threshold (€)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-access-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function tg<T = unknown>(method: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok: boolean; result?: T; description?: string };
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Remove a user from a channel without a permanent ban (kick). */
async function kickFromChannel(channelId: number, userId: number) {
  const ban = await tg("banChatMember", { chat_id: channelId, user_id: userId });
  // Immediately unban so a future re-deposit can re-approve their join request.
  await tg("unbanChatMember", { chat_id: channelId, user_id: userId, only_if_banned: true });
  return ban.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("ACCESS_SYNC_SECRET");
  if (secret && req.headers.get("x-access-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { member_id?: string; email?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  if (!body.member_id && !body.email) return json({ error: "member_id or email required" }, 400);

  const db = admin();

  // Resolve the member and current balance.
  const memberQ = db.from("members").select("id, name, deposit").limit(1);
  const { data: members, error: mErr } = body.member_id
    ? await memberQ.eq("id", body.member_id)
    : await memberQ.eq("email", body.email!);
  if (mErr) return json({ error: mErr.message }, 500);
  const member = members?.[0];
  if (!member) return json({ error: "member not found" }, 404);

  const eligible = Number(member.deposit) >= MIN_DEPOSIT_FOR_SIGNALS;
  if (eligible) {
    // Still qualifies — nothing to enforce. (Entry is handled by the bot.)
    return json({ member_id: member.id, eligible: true, kicked: [] });
  }

  // Not eligible → kick from every channel they're currently in.
  const { data: links } = await db
    .from("telegram_links")
    .select("id, telegram_user_id, tenant_id, tenants(name, telegram_channel_id)")
    .eq("member_id", member.id)
    .in("status", ["linked", "joined"]);

  const kicked: Array<{ tenant: string; ok: boolean }> = [];
  for (const link of links ?? []) {
    const tenant = link.tenants as unknown as { name: string; telegram_channel_id: number | null } | null;
    const userId = link.telegram_user_id as number | null;
    if (tenant?.telegram_channel_id && userId) {
      const ok = await kickFromChannel(Number(tenant.telegram_channel_id), Number(userId));
      kicked.push({ tenant: tenant.name, ok });
    }
    await db.from("telegram_links").update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoke_reason: `deposit ${member.deposit} < ${MIN_DEPOSIT_FOR_SIGNALS}`,
    }).eq("id", link.id);
  }

  return json({ member_id: member.id, eligible: false, kicked });
});
