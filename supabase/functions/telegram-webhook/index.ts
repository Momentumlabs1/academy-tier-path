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

/**
 * Config from the database, falling back to the environment.
 *
 * Function secrets can only be set with the CLI or the dashboard, which puts
 * every configuration change behind a deploy and behind whoever happens to have
 * the CLI logged in. The bot token, the source group id and the webhook secret
 * are not code — they change when a group is renamed or a bot is rotated, and
 * that should not require shipping.
 *
 * So they are read from `app_secrets` first, exactly as hero-sync and send-email
 * already do, and from the environment second. Existing deployments that set
 * them as secrets keep working untouched; new values can be set with one UPDATE.
 *
 * Cached per instance: this is called for every Telegram API call, and a database
 * round trip per relayed message would be absurd.
 */
const cfgCache = new Map<string, string>();

async function cfg(key: string): Promise<string> {
  const hit = cfgCache.get(key);
  if (hit !== undefined) return hit;

  let value = Deno.env.get(key) ?? "";
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
    if (data?.value) value = String(data.value);
  } catch { /* env only */ }

  cfgCache.set(key, value);
  return value;
}

async function tg<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }> {
  const token = await cfg("TELEGRAM_BOT_TOKEN");
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
interface TgUser { id: number; username?: string; first_name?: string; is_bot?: boolean }
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
  /** Groups send edits here, not as edited_channel_post. */
  edited_message?: TgMessage;
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

// ── Translation ──────────────────────────────────────────────────────────────
/**
 * The desk writes in German. Members read English — the whole platform is
 * English — so anything relayed has to arrive in English.
 *
 * The auto-formatter below already rebuilds recognised Gold/NAS100 signals in
 * English, but it only covers signals. Everything around them — "SL hit, nicht so
 * schlimm, war ein low risk trade", "Performance Heute", "Starker Abschluss —
 * trotz 2 SLs auf Gold insgesamt +5 RR mitgenommen" — was relayed verbatim.
 *
 * TWO RULES THAT MATTER MORE THAN THE TRANSLATION ITSELF:
 *
 *   1. NUMBERS ARE NEVER TOUCHED. Entries, stops, targets, R multiples, tickers.
 *      A model that "helpfully" reformats 29 826.90 into 29,826.90 — or worse,
 *      rounds it — is handing someone a wrong price to trade on. The prompt
 *      forbids it and the check below verifies it: if the digits in the output
 *      do not match the digits in the input, the translation is discarded.
 *
 *   2. FAILURE MEANS ORIGINAL, NEVER NOTHING. No key, timeout, rate limit,
 *      refusal — every path returns the source text. A signal that arrives in
 *      German is a small annoyance; a signal that does not arrive is a member
 *      watching a trade they were supposed to be in.
 */
const TRANSLATE_MODEL = Deno.env.get("TRANSLATE_MODEL") ?? "claude-haiku-4-5";

const TRANSLATE_SYSTEM = [
  "You translate trading-desk messages into English for a trading academy.",
  "",
  "Rules:",
  "- Output ONLY the translated message. No preamble, no quotes, no explanation.",
  "- NEVER alter any number, price, ticker, symbol or R-multiple. Copy every digit",
  "  and separator exactly as it appears, including spaces inside numbers.",
  "- Keep all emoji, line breaks, bullet characters and layout exactly as they are.",
  "- Keep trading terms in their standard English form (Entry, SL, TP, buy, sell, lot).",
  "- If the message is already English, return it completely unchanged.",
  "- Translate naturally, the way a trader would write it — not word for word.",
].join("\n");

/** Digits only, for verifying the model changed no number. */
const digitsOf = (s: string) => (s.match(/\d/g) ?? []).join("");

async function toEnglish(text: string): Promise<string> {
  const src = (text ?? "").trim();
  if (!src) return text;

  const apiKey = await cfg("ANTHROPIC_API_KEY");
  if (!apiKey) return text; // not configured — relay untranslated rather than not at all

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        max_tokens: 1024,
        system: TRANSLATE_SYSTEM,
        messages: [{ role: "user", content: src }],
      }),
    });
    if (!res.ok) {
      console.error("[translate] HTTP", res.status, (await res.text()).slice(0, 160));
      return text;
    }
    const j = await res.json();
    const out = (j?.content ?? [])
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("")
      .trim();
    if (!out) return text;

    // The guard: same digits in, same digits out, or we keep the original.
    if (digitsOf(out) !== digitsOf(src)) {
      console.error("[translate] digits changed — keeping original");
      return text;
    }
    return out;
  } catch (e) {
    console.error("[translate] failed:", e);
    return text;
  }
}

// ── Desk results ─────────────────────────────────────────────────────────────
/**
 * Pull real numbers out of the recap the desk already posts.
 *
 * The site used to claim "74% signal accuracy", typed by hand. This is what
 * replaces it: the same kind of figure, except every row traces back to the
 * Telegram message it came from.
 *
 * The recap looks like this, with the asset as a bare heading and each closed
 * trade as a bullet in R:
 *
 *     📊 Performance Heute
 *     NAS SELL
 *     • +1 RR
 *     • −0.5 RR
 *     XAUUSD
 *     • −1 RR
 *     🔥 Gesamtergebnis: +5 RR
 *
 * TWO THINGS THIS HAS TO GET RIGHT.
 *
 * The MINUS SIGN. The desk writes U+2212 (−), not a hyphen. Parsing only ASCII
 * "-" silently reads every loss as a win, which would turn a break-even week into
 * a perfect one. Every dash variant is normalised before the number is read.
 *
 * The TOTAL LINE IS NOT A TRADE. "Gesamtergebnis: +5 RR" is the sum of the
 * bullets above it; counting it as another trade both inflates the total and adds
 * a phantom win. It is recognised and skipped, in German and English.
 */
interface DeskResult { asset: string | null; direction: string | null; r: number; idx: number }

function parseRecap(text: string): DeskResult[] {
  if (!/performance|recap|gesamtergebnis|total result/i.test(text)) return [];

  const out: DeskResult[] = [];
  let asset: string | null = null;
  let direction: string | null = null;

  text.split("\n").forEach((raw, idx) => {
    // U+2212 minus, en dash, em dash → ASCII hyphen. Without this every loss
    // parses as a gain.
    const line = raw.replace(/[−–—]/g, "-").trim();
    if (!line) return;

    // Sum line, not a trade.
    if (/gesamt|total|summe|overall/i.test(line)) return;

    const rr = line.match(/([+-]?\d+(?:[.,]\d+)?)\s*RR?\b/i);
    if (rr && /^[•\-*▪]/.test(line)) {
      const r = parseFloat(rr[1].replace(",", "."));
      if (Number.isFinite(r)) out.push({ asset, direction, r, idx });
      return;
    }

    // An asset heading: short, no bullet, names an instrument. Everything under
    // it belongs to it until the next heading.
    const head = line.match(/^([A-Za-z0-9]{2,10})(?:\s+(BUY|SELL|LONG|SHORT))?\s*$/i);
    if (head) {
      asset = head[1].toUpperCase();
      direction = head[2] ? head[2].toUpperCase() : null;
    }
  });

  return out;
}

async function storeRecap(db: SupabaseClient, post: TgMessage) {
  const text = post.text ?? post.caption ?? "";
  const rows = parseRecap(text);
  if (!rows.length) return;

  // Dated by arrival. The desk posts "Performance Heute" at the end of its own
  // trading day, so the message date is the trading date.
  const tradedOn = new Date().toISOString().slice(0, 10);

  const { error } = await db.from("desk_results").upsert(
    rows.map((r) => ({
      traded_on: tradedOn,
      asset: r.asset,
      direction: r.direction,
      r_multiple: r.r,
      source_chat_id: post.chat.id,
      source_message_id: post.message_id,
      line_index: r.idx,
    })),
    { onConflict: "source_chat_id,source_message_id,line_index" },
  );
  if (error) console.error("[recap] store failed:", error.message);
  else console.log(`[recap] stored ${rows.length} results`);
}

// ── Fan-out: single post ─────────────────────────────────────────────────────

/**
 * Relay one message to one tenant, in English.
 *
 * Plain text is sent as our own message so the translation is what lands. Media
 * still goes through copyMessage — but with the caption replaced, which is why
 * this cannot simply forward: a forward carries the original caption and no way
 * to change it.
 */
async function copyOne(t: TenantRow, post: TgMessage) {
  try {
    const footer = footerFor(t);

    if (post.text) {
      const body = await toEnglish(post.text);
      const res = await tg<{ message_id: number }>("sendMessage", {
        chat_id: t.telegram_channel_id,
        text: footer ? `${body}\n\n${footer}` : body,
        disable_web_page_preview: true,
      });
      if (!res.ok) throw new Error(res.description ?? "sendMessage failed");
      return { ok: true, message_id: res.result?.message_id };
    }

    const caption = post.caption ? await toEnglish(post.caption) : undefined;
    const copy = await tg<{ message_id: number }>("copyMessage", {
      chat_id: t.telegram_channel_id,
      from_chat_id: post.chat.id,
      message_id: post.message_id,
      // Only sent when we have one: passing caption: undefined would strip it.
      ...(caption !== undefined ? { caption } : {}),
    });
    if (!copy.ok) throw new Error(copy.description ?? "copyMessage failed");
    if (footer) await tg("sendMessage", { chat_id: t.telegram_channel_id, text: footer, disable_web_page_preview: true });
    return { ok: true, message_id: copy.result?.message_id };
  } catch (e) {
    console.error(`[relay] → ${t.slug} failed:`, e);
    return { ok: false, error: String(e) };
  }
}

// ── Why there is no auto-formatter here any more ────────────────────────────
//
// There used to be one: it read entry and stop out of the desk's shorthand and
// computed TP1..TP5 as R multiples. It was removed, and the reason is worth
// keeping so nobody rebuilds it.
//
// It computed values THE DESK ALREADY WRITES. Every real signal from the desk
// arrives with TP1 through TP5 spelled out. The formatter re-derived them, which
// means it could only ever agree with the source or be wrong about it.
//
// And it was wrong. The desk writes thousands with a space — "Entry : 30 135.09"
// — which parsed as 30, failed the sanity check, and made the whole message fall
// through as "not a signal". Every genuine signal hit that path; the only message
// that ever formatted correctly was a hand-typed test without spaces.
//
// So the relay now does two things: translate, and forward. Both are needed,
// neither can silently corrupt a price, and the desk's own numbers arrive
// exactly as the desk wrote them.

async function relaySingle(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  const delivered: Record<string, unknown> = {};
  for (const t of tenants) {
    delivered[t.slug] = await copyOne(t, post);
  }
  await logRelay(db, post.chat.id, post.message_id, post.text ?? post.caption ?? "[media]", delivered);
  // Parsed AFTER the relay: a parser bug must not stop a signal going out.
  await storeRecap(db, post);
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
//
// Same call is also why ALBUM CAPTIONS ARE NOT TRANSLATED: copyMessages takes no
// caption override, unlike copyMessage. A multi-photo post therefore arrives with
// its original German caption. Single photos, single videos and all plain text do
// get translated. Fixing this means sending each part individually and losing the
// album grouping — worse for the reader than one untranslated caption, so it
// stays as it is until someone actually posts albums with captions that matter.

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

  // Translate ONCE, not per tenant: same source text, and every tenant would
  // otherwise pay for the same call — and could get slightly different wording,
  // so the channels would drift apart.
  const enText = post.text ? await toEnglish(post.text) : null;
  const enCaption = post.caption ? await toEnglish(post.caption) : null;

  const results: Record<string, unknown> = {};

  for (const t of tenants) {
    const d = delivered[t.slug];
    if (!d?.ok || !d.message_id) { results[t.slug] = { ok: false, error: "no original copy" }; continue; }

    let method: string;
    let payload: Record<string, unknown>;
    if (isCaption) {
      method = "editMessageCaption";
      // No caption_entities: they carry byte offsets into the ORIGINAL German
      // text, and applying them to the translation would bold the wrong words —
      // or be rejected outright for pointing past the end of the string.
      payload = { chat_id: t.telegram_channel_id, message_id: d.message_id, caption: enCaption ?? post.caption };
    } else {
      // The footer has to be re-appended. copyOne sends body and footer as ONE
      // message for plain text, so editing with the body alone would silently
      // delete every partner's broker link from that post.
      const footer = footerFor(t);
      const body = enText ?? post.text ?? "";
      method = "editMessageText";
      payload = {
        chat_id: t.telegram_channel_id,
        message_id: d.message_id,
        text: footer ? `${body}\n\n${footer}` : body,
        disable_web_page_preview: true,
      };
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
  const isSourceChat = async (chatId: number, destIds: Set<number>) =>
    chatId === Number(await cfg("MAIN_CHANNEL_ID") || 0) || !destIds.has(chatId);

  const post = update.channel_post;
  if (post) {
    const tenants = await activeTenants(db);
    const destIds = new Set(tenants.map((t) => Number(t.telegram_channel_id)));
    if ((await isSourceChat(post.chat.id, destIds)) && tenants.length) {
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
    if ((await isSourceChat(edited.chat.id, destIds)) && tenants.length) {
      await relayEdit(db, edited, tenants);
    }
    return;
  }
  if (update.message?.text?.startsWith("/start")) { await handleStart(db, update.message); return; }

  // A GROUP as the source. Telegram delivers channel posts as `channel_post` but
  // group messages as `message` — so a main "channel" that is actually a group
  // (which is what the desk runs) produced no relay at all. Nothing arrived,
  // nothing errored.
  //
  // The channel path can infer its source ("any chat that is not a destination"),
  // because a bot only sees posts in channels it was added to. That inference is
  // unsafe for groups: the bot can sit in ordinary chats, and every message in
  // any of them would fan out to every partner. So a group source must be named
  // explicitly by MAIN_CHANNEL_ID.
  const groupMsg = update.message ?? update.edited_message;
  if (groupMsg) {
    const mainId = Number(await cfg("MAIN_CHANNEL_ID") || 0);
    const isSource = mainId !== 0 && groupMsg.chat.id === mainId;
    const hasContent = Boolean(groupMsg.text || groupMsg.caption || groupMsg.media_group_id);
    // Skip only OUR OWN messages, not every bot's.
    //
    // The obvious filter — ignore anything from a bot — would ignore everything.
    // The source group is itself the far end of another relay: the desk posts in
    // Tim's own group, his copy bot mirrors it into "Agent stick", and our system
    // reads from there. So in the source group EVERY message has a bot as its
    // author. Filtering on is_bot would have relayed precisely nothing, silently.
    //
    // What actually has to be excluded is a loop through ourselves, which is only
    // our own bot. Its id is the part of the token before the colon, so no extra
    // API call is needed to know it.
    const selfId = Number((await cfg("TELEGRAM_BOT_TOKEN")).split(":")[0] || 0);
    const isSelf = selfId !== 0 && groupMsg.from?.id === selfId;
    if (isSource && hasContent && !isSelf) {
      const tenants = await activeTenants(db);
      if (tenants.length) {
        if (update.edited_message) await relayEdit(db, groupMsg, tenants);
        else if (groupMsg.media_group_id) await relayAlbum(db, groupMsg, tenants);
        else await relaySingle(db, groupMsg, tenants);
      }
    }
    return;
  }

  if (update.chat_join_request) { await handleJoinRequest(db, update.chat_join_request); }
}

// ── HTTP entry point ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const secret = await cfg("TELEGRAM_WEBHOOK_SECRET");
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
