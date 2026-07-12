/**
 * telegram-webhook — the white-label relay bot brain (production-hardened).
 *
 * ONE bot (create via @BotFather) is admin in the MAIN signal channel and in
 * every brand channel. Telegram calls this function for every update.
 *
 * FAST PATH (must be < a couple seconds so Telegram doesn't redeliver):
 *   verify secret → parse → dedupe by update_id → ACK 200 → process in the
 *   background (EdgeRuntime.waitUntil). All real work (fan-out, DB writes,
 *   Bot API calls) happens AFTER the 200 is sent.
 *
 * THREE JOBS:
 *  1. FAN-OUT   — a post in the MAIN channel is copied (copyMessage, so NO
 *                 "forwarded from" header) into every active tenant channel,
 *                 plus that brand's footer with its own affiliate link.
 *                 Multi-media posts (albums) are batched by media_group_id
 *                 and relayed as one group via copyMessages.
 *  2. LINKING   — /start <token> deep link binds a verified member's Telegram
 *                 account and hands out a single-use invite.
 *  3. GATING    — chat_join_request is approved only for a linked member whose
 *                 verified deposit ≥ €100 (Foundation).
 *
 * Rate limits are respected by reacting to HTTP 429 `parameters.retry_after`
 * (Telegram: ~30 msg/s global, ~1 msg/s per chat) with jittered backoff.
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, MAIN_CHANNEL_ID
 *
 * Register the webhook (see /admin/signals for the ready-to-copy command):
 *   setWebhook?url=…&secret_token=…&drop_pending_updates=true
 *     &allowed_updates=["channel_post","edited_channel_post","message","chat_join_request"]
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT_FOR_SIGNALS = 100; // Foundation threshold (€)
const ALBUM_DEBOUNCE_MS = 2500;      // wait for all album parts to arrive
const MAX_429_RETRIES = 3;

// EdgeRuntime is provided by Supabase; fall back to inline await locally.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
function runBackground(p: Promise<unknown>) {
  try {
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(p);
      return;
    }
  } catch { /* not available */ }
  // Local/dev: swallow errors so they don't crash the isolate.
  p.catch((e) => console.error("[bg]", e));
}

// ── Telegram Bot API helper (with 429 flood control) ─────────────────────────

async function tg<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const url = `https://api.telegram.org/bot${token}/${method}`;

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    // Telegram signals rate limiting via 429 + parameters.retry_after (seconds).
    if (json?.error_code === 429 && attempt < MAX_429_RETRIES) {
      const retryAfter = Number(json?.parameters?.retry_after ?? 1);
      // Wait at least retry_after; add up to 25% jitter to avoid a thundering herd.
      const waitMs = Math.ceil(retryAfter * 1000 * (1 + Math.random() * 0.25));
      console.warn(`[tg] 429 on ${method}, waiting ${waitMs}ms (attempt ${attempt + 1})`);
      await sleep(waitMs);
      continue;
    }
    return json;
  }
  return { ok: false, description: "429 retries exhausted" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Types (only the fields we use) ───────────────────────────────────────────

interface TgChat { id: number; title?: string; type: string }
interface TgUser { id: number; username?: string; first_name?: string }
interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  caption?: string;
  media_group_id?: string;
}
interface TgUpdate {
  update_id: number;
  channel_post?: TgMessage;
  edited_channel_post?: TgMessage;
  message?: TgMessage;
  chat_join_request?: { chat: TgChat; from: TgUser };
}

interface TenantRow {
  slug: string;
  name: string;
  telegram_channel_id: number | null;
  broker_affiliate_url: string | null;
  signal_footer: string | null;
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function activeTenants(db: SupabaseClient): Promise<TenantRow[]> {
  const { data } = await db
    .from("tenants")
    .select("slug, name, telegram_channel_id, broker_affiliate_url, signal_footer")
    .eq("active", true)
    .not("telegram_channel_id", "is", null);
  return (data as TenantRow[]) ?? [];
}

function footerFor(t: TenantRow): string | null {
  const lines = [t.signal_footer, t.broker_affiliate_url ? `👉 ${t.broker_affiliate_url}` : null].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

// ── 1a. Fan-out of a SINGLE post ─────────────────────────────────────────────

async function relaySingle(db: SupabaseClient, post: TgMessage) {
  const tenants = await activeTenants(db);
  if (!tenants.length) return;

  const delivered: Record<string, unknown> = {};
  for (const t of tenants) {
    delivered[t.slug] = await copyOne(t, post.chat.id, post.message_id);
  }
  await logRelay(db, post.chat.id, post.message_id, post.text ?? post.caption ?? "[media]", delivered);
}

async function copyOne(t: TenantRow, fromChat: number, messageId: number) {
  try {
    const copy = await tg<{ message_id: number }>("copyMessage", {
      chat_id: t.telegram_channel_id,
      from_chat_id: fromChat,
      message_id: messageId,
    });
    if (!copy.ok) throw new Error(copy.description ?? "copyMessage failed");

    const footer = footerFor(t);
    if (footer) {
      await tg("sendMessage", { chat_id: t.telegram_channel_id, text: footer, disable_web_page_preview: true });
    }
    return { ok: true, message_id: copy.result?.message_id };
  } catch (e) {
    console.error(`[relay] → ${t.slug} failed:`, e);
    return { ok: false, error: String(e) };
  }
}

// ── 1b. Fan-out of a MEDIA ALBUM (multiple posts, same media_group_id) ───────
// Album parts arrive as separate updates. We buffer each part, debounce, then
// one invocation "claims" the group and relays all parts together.

async function bufferAlbumPart(db: SupabaseClient, post: TgMessage) {
  await db.from("telegram_album_parts").upsert(
    { media_group_id: post.media_group_id, source_chat_id: post.chat.id, source_message_id: post.message_id },
    { onConflict: "media_group_id,source_message_id", ignoreDuplicates: true },
  );

  // Debounce, then try to claim + relay the whole group exactly once.
  await sleep(ALBUM_DEBOUNCE_MS);

  // Atomic claim: whoever flips relayed=false→true for the group gets the rows.
  const { data: claimed } = await db
    .from("telegram_album_parts")
    .update({ relayed: true })
    .eq("media_group_id", post.media_group_id)
    .eq("relayed", false)
    .select("source_message_id");

  if (!claimed?.length) return; // another invocation already relayed this group

  const messageIds = (claimed as { source_message_id: number }[])
    .map((r) => Number(r.source_message_id))
    .sort((a, b) => a - b);

  const tenants = await activeTenants(db);
  const delivered: Record<string, unknown> = {};
  for (const t of tenants) {
    try {
      const copy = await tg<{ message_id: number }[]>("copyMessages", {
        chat_id: t.telegram_channel_id,
        from_chat_id: post.chat.id,
        message_ids: messageIds,
      });
      if (!copy.ok) throw new Error(copy.description ?? "copyMessages failed");
      const footer = footerFor(t);
      if (footer) await tg("sendMessage", { chat_id: t.telegram_channel_id, text: footer, disable_web_page_preview: true });
      delivered[t.slug] = { ok: true, count: messageIds.length };
    } catch (e) {
      console.error(`[relay-album] → ${t.slug} failed:`, e);
      delivered[t.slug] = { ok: false, error: String(e) };
    }
  }
  await logRelay(db, post.chat.id, messageIds[0], post.caption ?? `[album ×${messageIds.length}]`, delivered);
}

async function logRelay(
  db: SupabaseClient, chatId: number, messageId: number, text: string, delivered: Record<string, unknown>,
) {
  await db.from("signal_relays").upsert(
    { source_chat_id: chatId, source_message_id: messageId, preview: text.slice(0, 140), delivered },
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

  const { data: link } = await db
    .from("telegram_links")
    .select("id, status, member_id, members(deposit, name), tenants(name, telegram_channel_id)")
    .eq("link_token", token)
    .maybeSingle();

  if (!link || link.status === "revoked") {
    await tg("sendMessage", { chat_id: chatId, text: "❌ This link is invalid or expired. Please use the »Connect Telegram« button on your dashboard again." });
    return;
  }

  const member = link.members as unknown as { deposit: number; name: string } | null;
  const tenant = link.tenants as unknown as { name: string; telegram_channel_id: number | null } | null;

  if (!member || Number(member.deposit) < MIN_DEPOSIT_FOR_SIGNALS) {
    await tg("sendMessage", { chat_id: chatId, text: "⏳ Your deposit hasn't been verified yet. Access unlocks automatically once the broker confirms it." });
    return;
  }

  await db.from("telegram_links").update({
    telegram_user_id: msg.from?.id ?? chatId,
    telegram_username: msg.from?.username ?? null,
    status: "linked",
    linked_at: new Date().toISOString(),
  }).eq("id", link.id);

  if (!tenant?.telegram_channel_id) {
    await tg("sendMessage", { chat_id: chatId, text: `✅ Telegram connected, ${member.name}! Your signal channel goes live shortly — you'll get the invite here.` });
    return;
  }

  // Join-request link: no member_limit (mutually exclusive with creates_join_request);
  // the bot gates each request individually in handleJoinRequest.
  const invite = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: tenant.telegram_channel_id,
    creates_join_request: true,
    name: `member:${link.member_id}`.slice(0, 32),
  });

  if (invite.ok && invite.result) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: `✅ You're verified, ${member.name}!\n\nTap to request access to ${tenant.name}:\n${invite.result.invite_link}\n\nYou'll be approved automatically.`,
      disable_web_page_preview: true,
    });
  } else {
    console.error("[start] createChatInviteLink failed:", invite.description);
    await tg("sendMessage", { chat_id: chatId, text: "✅ Telegram connected! Your channel invite follows shortly." });
  }
}

// ── 3. Join requests: approve only verified, linked members ─────────────────

async function handleJoinRequest(db: SupabaseClient, reqObj: { chat: TgChat; from: TgUser }) {
  const { data: link } = await db
    .from("telegram_links")
    .select("id, members(deposit)")
    .eq("telegram_user_id", reqObj.from.id)
    .in("status", ["linked", "joined"])
    .maybeSingle();

  const member = link?.members as unknown as { deposit: number } | null;
  const eligible = !!link && !!member && Number(member.deposit) >= MIN_DEPOSIT_FOR_SIGNALS;

  await tg(eligible ? "approveChatJoinRequest" : "declineChatJoinRequest", {
    chat_id: reqObj.chat.id,
    user_id: reqObj.from.id,
  });

  if (eligible && link) {
    await db.from("telegram_links").update({ status: "joined", joined_at: new Date().toISOString() }).eq("id", link.id);
  }
}

// ── Router (runs in the background, after we've already ACKed) ────────────────

async function processUpdate(update: TgUpdate) {
  const db = admin();
  const mainChannelId = Number(Deno.env.get("MAIN_CHANNEL_ID") ?? 0);

  const post = update.channel_post;
  if (post && post.chat.id === mainChannelId) {
    if (post.media_group_id) await bufferAlbumPart(db, post);
    else await relaySingle(db, post);
    return;
  }
  if (update.message?.text?.startsWith("/start")) {
    await handleStart(db, update.message);
    return;
  }
  if (update.chat_join_request) {
    await handleJoinRequest(db, update.chat_join_request);
  }
  // edited_channel_post is intentionally ignored (v1 policy): relayed copies
  // are independent messages; propagating edits needs a stored id mapping.
}

// ── HTTP entry point: verify → dedupe → ACK fast → process in background ─────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // 1. Auth: Telegram echoes the secret we set via setWebhook.
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

  // 2. Idempotency: drop redelivered updates before any side effects.
  const db = admin();
  const { error: dupErr } = await db.from("telegram_updates").insert({ update_id: update.update_id });
  if (dupErr) {
    // Unique-violation → already processed. Any error here → still ACK so
    // Telegram stops retrying; better a rare miss than an infinite retry loop.
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  }

  // 3. Process in the background, ACK immediately.
  runBackground(processUpdate(update).catch((e) => console.error("[telegram-webhook] process error:", e)));

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
