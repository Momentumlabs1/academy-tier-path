/**
 * telegram-webhook — the white-label relay bot brain.
 *
 * ONE bot (create via @BotFather) is admin in the MAIN signal channel
 * and in every brand's channel. Telegram calls this function for every
 * update. Three jobs:
 *
 *  1. FAN-OUT   — a post in the MAIN channel is copied (copyMessage,
 *                 so NO "forwarded from" header) into every active
 *                 tenant channel, followed by that brand's footer with
 *                 its own broker affiliate link. Logged to signal_relays.
 *
 *  2. LINKING   — a member who deposited clicks "Connect Telegram" on
 *                 the website → t.me/<bot>?start=<link_token>. The bot
 *                 binds the Telegram account to the member row and
 *                 replies with a single-use invite link to the brand's
 *                 channel.
 *
 *  3. GATING    — channels set to "join by request": the bot approves
 *                 a join request only if the Telegram account is linked
 *                 to a member whose verified deposit ≥ €100 (Foundation).
 *
 * Signal rule (v1): post signals in the main channel WITHOUT broker
 * links — every relayed copy automatically gets the right per-brand
 * link via the footer message. Original formatting is preserved 1:1.
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   TELEGRAM_BOT_TOKEN      from @BotFather
 *   TELEGRAM_WEBHOOK_SECRET random string, also passed to setWebhook
 *   MAIN_CHANNEL_ID         e.g. -1001234567890
 *
 * Deploy + register webhook:
 *   supabase functions deploy telegram-webhook --no-verify-jwt
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -d "url=https://<project>.supabase.co/functions/v1/telegram-webhook" \
 *     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT_FOR_SIGNALS = 100; // Foundation threshold (€)

// ── Telegram Bot API helper ──────────────────────────────────────────────────

async function tg<T = unknown>(method: string, payload: Record<string, unknown>): Promise<{ ok: boolean; result?: T; description?: string }> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Types (only the fields we use) ───────────────────────────────────────────

interface TgChat { id: number; title?: string; type: string }
interface TgUser { id: number; username?: string; first_name?: string }
interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  caption?: string;
}
interface TgUpdate {
  update_id: number;
  channel_post?: TgMessage;
  message?: TgMessage;
  chat_join_request?: { chat: TgChat; from: TgUser };
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  telegram_channel_id: number | null;
  broker_affiliate_url: string | null;
  signal_footer: string | null;
}

// ── 1. Fan-out: main channel → all brand channels ────────────────────────────

async function relayPost(db: SupabaseClient, post: TgMessage) {
  const { data: tenants, error } = await db
    .from("tenants")
    .select("id, slug, name, telegram_channel_id, broker_affiliate_url, signal_footer")
    .eq("active", true)
    .not("telegram_channel_id", "is", null);

  if (error || !tenants?.length) {
    console.warn("[relay] no active tenant channels", error);
    return;
  }

  const preview = (post.text ?? post.caption ?? "[media]").slice(0, 140);
  const delivered: Record<string, unknown> = {};

  // Sequential fan-out keeps us far below Telegram's ~30 msg/s limit.
  for (const t of tenants as TenantRow[]) {
    try {
      // copyMessage = identical content, original formatting, NO forward header.
      const copy = await tg<{ message_id: number }>("copyMessage", {
        chat_id: t.telegram_channel_id,
        from_chat_id: post.chat.id,
        message_id: post.message_id,
      });
      if (!copy.ok) throw new Error(copy.description ?? "copyMessage failed");

      // Brand footer with THIS brand's affiliate link.
      if (t.broker_affiliate_url || t.signal_footer) {
        const lines = [
          t.signal_footer,
          t.broker_affiliate_url ? `👉 ${t.broker_affiliate_url}` : null,
        ].filter(Boolean);
        await tg("sendMessage", {
          chat_id: t.telegram_channel_id,
          text: lines.join("\n"),
          disable_web_page_preview: true,
        });
      }

      delivered[t.slug] = { ok: true, message_id: copy.result?.message_id };
    } catch (e) {
      delivered[t.slug] = { ok: false, error: String(e) };
      console.error(`[relay] → ${t.slug} failed:`, e);
    }
  }

  await db.from("signal_relays").upsert(
    {
      source_chat_id: post.chat.id,
      source_message_id: post.message_id,
      preview,
      delivered,
    },
    { onConflict: "source_chat_id,source_message_id", ignoreDuplicates: true },
  );
}

// ── 2. /start <token>: bind Telegram account → member, hand out invite ──────

async function handleStart(db: SupabaseClient, msg: TgMessage) {
  const token = msg.text?.split(/\s+/)[1];
  const chatId = msg.chat.id;

  if (!token) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "👋 Welcome! To get signal access, deposit with our partner broker and use the »Connect Telegram« button on your member dashboard.",
    });
    return;
  }

  // Look up the pending link (created by the website for a verified member).
  const { data: link } = await db
    .from("telegram_links")
    .select("id, status, member_id, tenant_id, members(deposit, name), tenants(name, telegram_channel_id)")
    .eq("link_token", token)
    .maybeSingle();

  if (!link || link.status === "revoked") {
    await tg("sendMessage", { chat_id: chatId, text: "❌ This link is invalid or expired. Please use the »Connect Telegram« button on your dashboard again." });
    return;
  }

  const member = link.members as unknown as { deposit: number; name: string } | null;
  const tenant = link.tenants as unknown as { name: string; telegram_channel_id: number | null } | null;

  // Defense in depth: the token is only issued to verified members,
  // but re-check the deposit threshold anyway.
  if (!member || Number(member.deposit) < MIN_DEPOSIT_FOR_SIGNALS) {
    await tg("sendMessage", { chat_id: chatId, text: "⏳ Your deposit hasn't been verified yet. Access unlocks automatically once the broker confirms it." });
    return;
  }

  await db
    .from("telegram_links")
    .update({
      telegram_user_id: msg.from?.id ?? chatId,
      telegram_username: msg.from?.username ?? null,
      status: "linked",
      linked_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  if (!tenant?.telegram_channel_id) {
    await tg("sendMessage", { chat_id: chatId, text: `✅ Telegram connected, ${member.name}! Your signal channel goes live shortly — you'll get the invite here.` });
    return;
  }

  // Single-use invite link, valid 7 days.
  const invite = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: tenant.telegram_channel_id,
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    name: `member:${link.member_id}`,
  });

  if (invite.ok && invite.result) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: `✅ You're verified, ${member.name}!\n\nHere is your personal invite to ${tenant.name}:\n${invite.result.invite_link}\n\n(Single-use — don't share it.)`,
      disable_web_page_preview: true,
    });
  } else {
    console.error("[start] createChatInviteLink failed:", invite.description);
    await tg("sendMessage", { chat_id: chatId, text: "✅ Telegram connected! Invite link follows shortly." });
  }
}

// ── 3. Join requests: approve only verified, linked members ─────────────────

async function handleJoinRequest(db: SupabaseClient, req: { chat: TgChat; from: TgUser }) {
  const { data: link } = await db
    .from("telegram_links")
    .select("id, status, members(deposit)")
    .eq("telegram_user_id", req.from.id)
    .in("status", ["linked", "joined"])
    .maybeSingle();

  const member = link?.members as unknown as { deposit: number } | null;
  const eligible = !!link && !!member && Number(member.deposit) >= MIN_DEPOSIT_FOR_SIGNALS;

  await tg(eligible ? "approveChatJoinRequest" : "declineChatJoinRequest", {
    chat_id: req.chat.id,
    user_id: req.from.id,
  });

  if (eligible && link) {
    await db
      .from("telegram_links")
      .update({ status: "joined", joined_at: new Date().toISOString() })
      .eq("id", link.id);
  }
}

// ── HTTP entry point ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  // Telegram echoes the secret we registered with setWebhook.
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response(JSON.stringify({ error: "Bad secret" }), { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const mainChannelId = Number(Deno.env.get("MAIN_CHANNEL_ID") ?? 0);

  try {
    if (update.channel_post && update.channel_post.chat.id === mainChannelId) {
      await relayPost(db, update.channel_post);
    } else if (update.message?.text?.startsWith("/start")) {
      await handleStart(db, update.message);
    } else if (update.chat_join_request) {
      await handleJoinRequest(db, update.chat_join_request);
    }
  } catch (e) {
    // Always return 200 — otherwise Telegram retries the same update forever.
    console.error("[telegram-webhook] handler error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
