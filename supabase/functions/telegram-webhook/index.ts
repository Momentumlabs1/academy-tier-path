/**
 * telegram-webhook — the white-label relay bot brain (production-hardened v2).
 *
 * Flow: verify secret → dedupe by update_id → PROCESS SYNCHRONOUSLY → ACK 200.
 * (v1 used EdgeRuntime.waitUntil for background processing, but background
 *  tasks did not run reliably on Supabase, so the fan-out never happened.
 *  A relay to a handful of channels finishes in ~1s, well within Telegram's
 *  webhook timeout, and update_id dedup guards against redelivery.)
 *
 * SOURCE detection: a channel post is relayed if it comes from the configured
 * MAIN_CHANNEL_ID or from any channel that is not itself a destination
 * (channels are broadcast-only, so the only non-destination channel the bot
 * sees posts from is the main one). Works whether MAIN_CHANNEL_ID is set
 * correctly, wrong, or not at all — and never relays a destination back out.
 *
 * THREE JOBS: fan-out (copyMessage / copyMessages for albums), /start account
 * linking, and chat_join_request gating (deposit ≥ €100).
 *
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, [MAIN_CHANNEL_ID].
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT_FOR_SIGNALS = 100; // Foundation threshold (€)
const ALBUM_DEBOUNCE_MS = 2500;      // wait for all album parts to arrive
const MAX_429_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

    if (json?.error_code === 429 && attempt < MAX_429_RETRIES) {
      const retryAfter = Number(json?.parameters?.retry_after ?? 1);
      const waitMs = Math.ceil(retryAfter * 1000 * (1 + Math.random() * 0.25));
      console.warn(`[tg] 429 on ${method}, waiting ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }
    return json;
  }
  return { ok: false, description: "429 retries exhausted" };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TgChat { id: number; title?: string; type: string }
interface TgUser { id: number; username?: string; first_name?: string }
interface TgMessage {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  caption?: string;
  media_group_id?: string;
  entities?: unknown[];
  caption_entities?: unknown[];
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

// ── Fan-out: single post ─────────────────────────────────────────────────────

async function copyOne(t: TenantRow, fromChat: number, messageId: number) {
  try {
    const copy = await tg<{ message_id: number }>("copyMessage", {
      chat_id: t.telegram_channel_id,
      from_chat_id: fromChat,
      message_id: messageId,
    });
    if (!copy.ok) throw new Error(copy.description ?? "copyMessage failed");
    const footer = footerFor(t);
    if (footer) await tg("sendMessage", { chat_id: t.telegram_channel_id, text: footer, disable_web_page_preview: true });
    return { ok: true, message_id: copy.result?.message_id };
  } catch (e) {
    console.error(`[relay] → ${t.slug} failed:`, e);
    return { ok: false, error: String(e) };
  }
}

// ── Auto-formatter (Tim's spec) ──────────────────────────────────────────────
//
// Tim types a shorthand in the main channel; the bot renders a clean signal
// and relays THAT (instead of copying the shorthand). Only Gold & NAS100 get
// auto-calculated take-profits:
//   R = |entry − stop|;  TP1..4 = 0.5R,1R,1.5R,2R (in trade direction);
//   TP5 = Open.  Calculated prices are rounded to the nearest 0.50.
// Anything that isn't a recognisable Gold/NAS100 signal returns null and is
// copied verbatim, so normal announcements are never mangled.

const roundHalf = (x: number) => (Math.round(x * 2) / 2).toFixed(2);

function formatSignal(raw: string): string | null {
  const lower = raw.toLowerCase();

  const dir = /\b(buy|long)\b/.test(lower) ? "BUY" : /\b(sell|short)\b/.test(lower) ? "SELL" : null;
  if (!dir) return null;

  let asset: string | null = null;
  if (/\bgold\b|xau/.test(lower)) asset = "GOLD (XAU/USD)";
  else if (/nas\s?100|us\s?100|nasdaq/.test(lower)) asset = "NAS100";
  if (!asset) return null; // spec: auto-format applies to Gold & NAS100 only

  // Strip asset tokens so "nas100" doesn't leak a "100" into the number scan.
  const numStr = lower.replace(/nas\s?100|us\s?100/g, " ").replace(/gold|xau\/?usd/g, " ");

  const slMatch = numStr.match(/(?:sl|stop(?:\s*loss)?)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
  if (!slMatch) return null;
  const sl = parseFloat(slMatch[1]);

  let entry: number | null = null;
  const entryMatch = numStr.match(/(?:entry|@)\s*[:=]?\s*(\d+(?:\.\d+)?)/);
  if (entryMatch) entry = parseFloat(entryMatch[1]);
  if (entry == null) {
    const nums = (numStr.match(/\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
    const idx = nums.indexOf(sl);
    if (idx > -1) nums.splice(idx, 1);
    entry = nums[0] ?? null;
  }
  if (entry == null || !isFinite(entry) || !isFinite(sl) || entry === sl) return null;

  const R = Math.abs(entry - sl);
  const sign = dir === "BUY" ? 1 : -1;
  const tp = (m: number) => roundHalf(entry! + sign * m * R);

  const arrow = dir === "BUY" ? "🟢 BUY NOW" : "🔴 SELL NOW";
  return [
    `${arrow} — ${asset}`,
    ``,
    `📍 Entry     ${entry.toFixed(2)}`,
    `🛑 Stop      ${sl.toFixed(2)}`,
    ``,
    `🎯 TP1 (0.5R)   ${tp(0.5)}`,
    `🎯 TP2 (1.0R)   ${tp(1)}`,
    `🎯 TP3 (1.5R)   ${tp(1.5)}`,
    `🎯 TP4 (2.0R)   ${tp(2)}`,
    `🎯 TP5          Open`,
  ].join("\n");
}

// Send our own formatted signal (+ brand footer inline) instead of a raw copy.
async function sendFormatted(t: TenantRow, body: string) {
  try {
    const footer = footerFor(t);
    const text = footer ? `${body}\n\n${footer}` : body;
    const res = await tg<{ message_id: number }>("sendMessage", {
      chat_id: t.telegram_channel_id, text, disable_web_page_preview: true,
    });
    if (!res.ok) throw new Error(res.description ?? "sendMessage failed");
    return { ok: true, message_id: res.result?.message_id };
  } catch (e) {
    console.error(`[relay] formatted → ${t.slug} failed:`, e);
    return { ok: false, error: String(e) };
  }
}

async function relaySingle(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  // A recognisable Gold/NAS100 signal is rendered clean; everything else is
  // copied verbatim (footer sent separately, preserving original formatting).
  const rendered = post.text ? formatSignal(post.text) : null;
  const delivered: Record<string, unknown> = {};
  for (const t of tenants) {
    delivered[t.slug] = rendered
      ? await sendFormatted(t, rendered)
      : await copyOne(t, post.chat.id, post.message_id);
  }
  await logRelay(db, post.chat.id, post.message_id, rendered ?? post.text ?? post.caption ?? "[media]", delivered);
}

// ── Fan-out: media album (multiple parts, same media_group_id) ───────────────

async function relayAlbum(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  await db.from("telegram_album_parts").upsert(
    { media_group_id: post.media_group_id, source_chat_id: post.chat.id, source_message_id: post.message_id },
    { onConflict: "media_group_id,source_message_id", ignoreDuplicates: true },
  );
  await sleep(ALBUM_DEBOUNCE_MS);

  const { data: claimed } = await db
    .from("telegram_album_parts")
    .update({ relayed: true })
    .eq("media_group_id", post.media_group_id)
    .eq("relayed", false)
    .select("source_message_id");
  if (!claimed?.length) return; // another invocation already relayed this group

  const messageIds = (claimed as { source_message_id: number }[])
    .map((r) => Number(r.source_message_id)).sort((a, b) => a - b);

  const delivered: Record<string, unknown> = {};
  for (const t of tenants) {
    try {
      const copy = await tg("copyMessages", { chat_id: t.telegram_channel_id, from_chat_id: post.chat.id, message_ids: messageIds });
      if (!copy.ok) throw new Error(copy.description ?? "copyMessages failed");
      const footer = footerFor(t);
      if (footer) await tg("sendMessage", { chat_id: t.telegram_channel_id, text: footer, disable_web_page_preview: true });
      delivered[t.slug] = { ok: true, count: messageIds.length };
    } catch (e) {
      delivered[t.slug] = { ok: false, error: String(e) };
    }
  }
  await logRelay(db, post.chat.id, messageIds[0], post.caption ?? `[album ×${messageIds.length}]`, delivered);
}

async function logRelay(db: SupabaseClient, chatId: number, messageId: number, text: string, delivered: Record<string, unknown>) {
  await db.from("signal_relays").upsert(
    { source_chat_id: chatId, source_message_id: messageId, preview: text.slice(0, 140), delivered },
    { onConflict: "source_chat_id,source_message_id", ignoreDuplicates: true },
  );
}

// ── Edit sync: propagate an edit of the source post to every relayed copy ─────
//
// The original fan-out stored each brand's copied message_id in
// signal_relays.delivered ({ "<slug>": { ok, message_id } }). On an
// edited_channel_post we look that row up and call editMessageText /
// editMessageCaption on each copy so all channels stay in sync.
//
// Limitation: albums are copied with copyMessages (no per-part id map), so a
// caption edit inside an album can't be targeted — only single messages sync.

interface DeliveredEntry { ok?: boolean; message_id?: number }

async function relayEdit(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  const { data: row } = await db
    .from("signal_relays")
    .select("delivered")
    .eq("source_chat_id", post.chat.id)
    .eq("source_message_id", post.message_id)
    .maybeSingle();

  const delivered = (row?.delivered ?? null) as Record<string, DeliveredEntry> | null;
  if (!delivered) return; // never relayed (or album) — nothing to edit

  const isCaption = post.text == null && post.caption != null;
  // If the edited post is a recognisable signal, re-render it the same way the
  // original relay did, so formatted copies stay formatted after an edit.
  const rendered = post.text ? formatSignal(post.text) : null;
  const results: Record<string, unknown> = {};

  for (const t of tenants) {
    const d = delivered[t.slug];
    if (!d?.ok || !d.message_id) { results[t.slug] = { ok: false, error: "no original copy" }; continue; }

    let method: string;
    let payload: Record<string, unknown>;
    if (rendered) {
      const footer = footerFor(t);
      method = "editMessageText";
      payload = { chat_id: t.telegram_channel_id, message_id: d.message_id, text: footer ? `${rendered}\n\n${footer}` : rendered, disable_web_page_preview: true };
    } else if (isCaption) {
      method = "editMessageCaption";
      payload = { chat_id: t.telegram_channel_id, message_id: d.message_id, caption: post.caption, caption_entities: post.caption_entities };
    } else {
      method = "editMessageText";
      payload = { chat_id: t.telegram_channel_id, message_id: d.message_id, text: post.text, entities: post.entities };
    }

    const res = await tg(method, payload);
    // "message is not modified" means the copy already matches — treat as ok.
    const notModified = !res.ok && (res.description ?? "").includes("not modified");
    results[t.slug] = res.ok || notModified ? { ok: true, message_id: d.message_id } : { ok: false, error: res.description };
  }

  await db.from("signal_relays")
    .update({ edited_at: new Date().toISOString(), edit_delivered: results })
    .eq("source_chat_id", post.chat.id)
    .eq("source_message_id", post.message_id);
}

// ── /start <token>: bind Telegram account → member ──────────────────────────

async function handleStart(db: SupabaseClient, msg: TgMessage) {
  const token = msg.text?.split(/\s+/)[1];
  const chatId = msg.chat.id;

  if (!token) {
    await tg("sendMessage", { chat_id: chatId, text: "👋 Welcome! To get signal access, deposit with our partner broker and use the »Connect Telegram« button on your member dashboard." });
    return;
  }

  const { data: link } = await db
    .from("telegram_links")
    .select("id, status, member_id, members(deposit, name), tenants(name, telegram_channel_id)")
    .eq("link_token", token).maybeSingle();

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
    await tg("sendMessage", { chat_id: chatId, text: `✅ Telegram connected, ${member.name}! Your signal channel goes live shortly.` });
    return;
  }

  const invite = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: tenant.telegram_channel_id,
    creates_join_request: true,
    name: `member:${link.member_id}`.slice(0, 32),
  });

  if (invite.ok && invite.result) {
    await tg("sendMessage", { chat_id: chatId, text: `✅ You're verified, ${member.name}!\n\nTap to request access to ${tenant.name}:\n${invite.result.invite_link}\n\nYou'll be approved automatically.`, disable_web_page_preview: true });
  } else {
    await tg("sendMessage", { chat_id: chatId, text: "✅ Telegram connected! Your channel invite follows shortly." });
  }
}

// ── chat_join_request: approve verified linked members ──────────────────────

async function handleJoinRequest(db: SupabaseClient, reqObj: { chat: TgChat; from: TgUser }) {
  const { data: link } = await db
    .from("telegram_links").select("id, members(deposit, activity_status)")
    .eq("telegram_user_id", reqObj.from.id).in("status", ["linked", "joined"]).maybeSingle();

  const member = link?.members as unknown as { deposit: number; activity_status: string } | null;
  // Gate on BOTH: funded (deposit ≥ threshold) AND not inactivity-revoked. An
  // inactivity-kicked member must trade again (status leaves 'inactive') before
  // they can rejoin — otherwise the activity kick would be instantly undone.
  const eligible =
    !!link && !!member &&
    Number(member.deposit) >= MIN_DEPOSIT_FOR_SIGNALS &&
    member.activity_status !== "inactive";

  await tg(eligible ? "approveChatJoinRequest" : "declineChatJoinRequest", { chat_id: reqObj.chat.id, user_id: reqObj.from.id });
  if (eligible && link) {
    await db.from("telegram_links").update({ status: "joined", joined_at: new Date().toISOString() }).eq("id", link.id);
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

async function processUpdate(update: TgUpdate) {
  const db = admin();

  // Shared source check: the main channel OR any channel that isn't itself a
  // destination (channels are broadcast-only, so the only non-destination
  // channel the bot sees posts from is the main one).
  const isSourceChat = (chatId: number, destIds: Set<number>) =>
    chatId === Number(Deno.env.get("MAIN_CHANNEL_ID") ?? 0) || !destIds.has(chatId);

  const post = update.channel_post;
  if (post) {
    const tenants = await activeTenants(db);
    const destIds = new Set(tenants.map((t) => Number(t.telegram_channel_id)));
    if (isSourceChat(post.chat.id, destIds) && tenants.length) {
      if (post.media_group_id) await relayAlbum(db, post, tenants);
      else await relaySingle(db, post, tenants);
    }
    return;
  }

  // Edit in the main channel → edit every relayed copy so channels stay in sync.
  const edited = update.edited_channel_post;
  if (edited) {
    const tenants = await activeTenants(db);
    const destIds = new Set(tenants.map((t) => Number(t.telegram_channel_id)));
    if (isSourceChat(edited.chat.id, destIds) && tenants.length) {
      await relayEdit(db, edited, tenants);
    }
    return;
  }
  if (update.message?.text?.startsWith("/start")) { await handleStart(db, update.message); return; }
  if (update.chat_join_request) { await handleJoinRequest(db, update.chat_join_request); }
}

// ── HTTP entry point ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

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

  const db = admin();
  // Idempotency: drop redelivered updates before any side effects.
  const { error: dupErr } = await db.from("telegram_updates").insert({ update_id: update.update_id });
  if (dupErr) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  }

  // Process synchronously so the relay actually completes, then ACK.
  try {
    await processUpdate(update);
  } catch (e) {
    console.error("[telegram-webhook] process error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
