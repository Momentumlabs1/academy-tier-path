/**
 * activity-sweep — periodic enforcement of the activity systematics.
 *
 * Called by pg_cron (daily). Flow:
 *   1. Read academy_settings.activity. If enabled=false -> no-op (start state).
 *   2. Recompute every funded member's rolling-window lots + status.
 *   3. Members in `grace` get a one-time "stay active" warning notification.
 *   4. Members who reached `inactive` (grace expired, still under min lots) are
 *      kicked from their signal channels (ban+unban so they can rejoin once they
 *      trade again), their telegram links revoked, with a notification + audit.
 *
 * Auth: header x-cron-secret must equal academy_settings.cron_secret. Deployed
 * with verify_jwt=false (called by pg_cron via pg_net, not an end user).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function tg(method: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return { ok: false };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok: boolean };
}

/** Kick (not permaban) so a re-active member can rejoin later. */
async function kickFromChannel(channelId: number, userId: number) {
  const ban = await tg("banChatMember", { chat_id: channelId, user_id: userId });
  await tg("unbanChatMember", { chat_id: channelId, user_id: userId, only_if_banned: true });
  return ban.ok;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const db = admin();

  // Guard: cron_secret from the settings row must match the header.
  const { data: settings } = await db.from("academy_settings").select("activity, cron_secret").eq("id", 1).single();
  const secret = settings?.cron_secret as string | undefined;
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const activity = (settings?.activity ?? {}) as { enabled?: boolean; min_lots?: number };
  if (!activity.enabled) {
    return json({ skipped: true, reason: "activity enforcement disabled" });
  }

  // Refresh everyone's rolling lots + status.
  await db.rpc("academy_recompute_activity_all");

  // 1) One-time grace warnings.
  const { data: graceMembers } = await db
    .from("members")
    .select("id, name, monthly_lots")
    .eq("activity_status", "grace");
  let warned = 0;
  for (const m of graceMembers ?? []) {
    const { data: existing } = await db
      .from("notifications")
      .select("id")
      .eq("member_id", m.id)
      .eq("type", "inactive_warning")
      .is("read_at", null)
      .limit(1);
    if (existing && existing.length > 0) continue; // already warned
    await db.from("notifications").insert({
      member_id: m.id,
      type: "inactive_warning",
      title: "Bleib aktiv, um deinen Zugang zu behalten",
      body: `Trade in den nächsten Tagen mindestens ${activity.min_lots ?? 0.1} Lots, sonst pausiert dein Signal-Zugang automatisch.`,
      link: "/signals",
    });
    warned++;
  }

  // 2) Kick the ones who hit `inactive` and still hold channel access.
  const { data: inactive } = await db
    .from("members")
    .select("id, name, telegram_links(id, telegram_user_id, status, tenant_id, tenants(name, telegram_channel_id))")
    .eq("activity_status", "inactive");

  const kicked: Array<{ member: string; channels: number }> = [];
  for (const m of inactive ?? []) {
    const links = ((m as Record<string, unknown>).telegram_links ?? []) as Array<{
      id: string; telegram_user_id: number | null; status: string;
      tenants: { name: string; telegram_channel_id: number | null } | null;
    }>;
    const live = links.filter((l) => ["linked", "joined"].includes(l.status));
    if (live.length === 0) continue;
    let n = 0;
    for (const l of live) {
      if (l.tenants?.telegram_channel_id && l.telegram_user_id) {
        await kickFromChannel(Number(l.tenants.telegram_channel_id), Number(l.telegram_user_id));
        n++;
      }
      await db.from("telegram_links").update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoke_reason: "inactivity (below min lots after grace)",
      }).eq("id", l.id);
    }
    await db.from("notifications").insert({
      member_id: m.id,
      type: "inactive_warning",
      title: "Signal-Zugang pausiert",
      body: "Dein Zugang wurde wegen Inaktivität pausiert. Sobald du wieder tradest, kommst du automatisch zurück in die Kanäle.",
      link: "/signals",
    });
    await db.from("audit_log").insert({
      actor_email: "activity-sweep",
      action: "member_deactivated",
      target: (m as { name?: string }).name ?? String((m as { id: string }).id),
      detail: "kicked for inactivity (below min lots after grace period)",
    });
    kicked.push({ member: (m as { name?: string }).name ?? "?", channels: n });
  }

  return json({ ok: true, warned, kicked_count: kicked.length, kicked });
});
