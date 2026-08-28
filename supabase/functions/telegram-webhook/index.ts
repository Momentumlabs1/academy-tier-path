/**
 * telegram-webhook — the white-label relay bot brain (production-hardened v2).
 *
 * Flow: verify secret → dedupe by update_id → PROCESS SYNCHRONOUSLY → ACK 200.
 * (v1 used EdgeRuntime.waitUntil for background processing, but background
 *  tasks did not run reliably on Supabase, so the fan-out never happened.
 *  A relay to a handful of channels finishes in ~1s, well within Telegram's
 *  webhook timeout, and update_id dedup guards against redelivery.)
 *
 * SOURCE detection: exactly one chat feeds the relay — MAIN_CHANNEL_ID — and
 * within it exactly one courier, cosmos-reader. Any other chat the bot is in is
 * recorded in `telegram_chats_seen` and ignored.
 *
 * WHO DELIVERS THE SOURCE MESSAGES: Telegram never hands a bot the messages of
 * another bot, and the desk's calls arrive in the source group via Tim's copy
 * bot. A user-account reader (cosmos-reader on the IONOS box) reads that group
 * over MTProto and POSTs each message here in Telegram's own update shape,
 * stamped `via_reader`.
 *
 * That stamp is required, because the rule above is one-directional: Telegram
 * withholds BOT messages from a bot but delivers HUMAN ones normally. Anything a
 * person posted in the source group therefore arrived twice — once straight from
 * Telegram, once from the reader — and was relayed twice. update_id dedup cannot
 * catch that; they are genuinely different updates.
 *
 * The same asymmetry is why media cannot be copied. copyMessage needs nothing
 * but a chat id and a message id, yet it fails on every desk photo with "message
 * to copy not found": that message was never delivered to our bot, so for the
 * Bot API it does not exist, and no amount of admin rights changes that. The
 * reader downloads the file instead and ships the bytes in `media_b64`; this
 * function uploads them ONCE and fans the returned file_id out to the rest.
 *
 * FOUR JOBS: fan-out (upload/sendPhoto for reader media, copyMessage for
 * anything Telegram did deliver, copyMessages for albums), mirroring the info
 * channel into `info_posts` for the website, /start account linking, and
 * chat_join_request gating (deposit ≥ €100).
 *
 * Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, MAIN_CHANNEL_ID,
 * [INFO_CHANNEL_ID].
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

// ── Uploading a file the reader downloaded for us ───────────────────────────

/** Which Bot API method takes this kind of file, and under which field name. */
function methodFor(mime: string): { method: string; field: string } {
  if (mime.startsWith("video/")) return { method: "sendVideo", field: "video" };
  if (mime.startsWith("image/")) return { method: "sendPhoto", field: "photo" };
  return { method: "sendDocument", field: "document" };
}

/** The file_id Telegram hands back, whatever kind of file it was. */
function fileIdOf(result: Record<string, unknown> | undefined): string | null {
  if (!result) return null;
  const photo = result.photo as { file_id: string }[] | undefined;
  if (photo?.length) return photo[photo.length - 1].file_id;
  for (const key of ["video", "document", "animation"]) {
    const obj = result[key] as { file_id?: string } | undefined;
    if (obj?.file_id) return obj.file_id;
  }
  return null;
}

/**
 * Upload the bytes ONCE. Every further channel is sent the returned file_id
 * instead, so a photo crosses the wire a single time no matter how many
 * partners there are — and the file_id is what `desk_media` needs anyway.
 */
async function uploadMedia(
  chatId: number, b64: string, mime: string, caption?: string,
): Promise<{ ok: boolean; message_id?: number; file_id?: string; error?: string }> {
  const token = await cfg("TELEGRAM_BOT_TOKEN");
  const { method, field } = methodFor(mime);

  let bin: Uint8Array;
  try {
    const raw = atob(b64);
    bin = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  } catch {
    return { ok: false, error: "media_b64 is not valid base64" };
  }

  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp"
            : mime.startsWith("video/") ? "mp4" : "jpg";
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append(field, new Blob([bin], { type: mime }), `desk.${ext}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", body: form });
  const json = await res.json();
  if (!json?.ok) return { ok: false, error: json?.description ?? `${method} failed` };

  return {
    ok: true,
    message_id: json.result?.message_id,
    file_id: fileIdOf(json.result) ?? undefined,
  };
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TgChat { id: number; title?: string; type: string }
interface TgUser { id: number; username?: string; first_name?: string; is_bot?: boolean }
interface TgPhoto { file_id: string; file_unique_id: string; width: number; height: number }
interface TgMessage {
  message_id: number;
  chat: TgChat;
  /** Unix seconds; Telegram sends it on every message. */
  date?: number;
  photo?: TgPhoto[];
  from?: TgUser;
  text?: string;
  caption?: string;
  media_group_id?: string;
  /**
   * Set ONLY by cosmos-reader: the message carries a photo/video/document.
   * `photo` above stays empty because Telethon's file references are not
   * Bot-API file_ids. This flag is what tells the router the message HAS content
   * when there is no text and no caption at all — a chart posted without a word
   * used to count as empty and be dropped. The file itself rides in `media_b64`.
   */
  has_media?: boolean;
  /**
   * The file itself, base64, also only ever set by cosmos-reader.
   *
   * The first attempt at reader media used copyMessage, which needs no file at
   * all — just a chat id and a message id. It failed on every single photo with
   * "Bad Request: message to copy not found", and the reason is not fixable with
   * permissions: Telegram never delivered the message to our bot, because it
   * came from another bot, so as far as the Bot API is concerned that message
   * does not exist for us. The user account CAN see the file, so it downloads it
   * and ships the bytes here.
   */
  media_b64?: string;
  media_mime?: string;
  /**
   * Stamped by cosmos-reader on everything it forwards, and the ONLY thing the
   * router accepts from the source group.
   *
   * Telegram withholds a bot's messages from another bot, which is why the
   * reader exists — but it delivers HUMAN messages to our bot perfectly well.
   * So anything a person posted in the source group arrived twice: once
   * straight from Telegram, once from the reader, and both were relayed. It
   * only showed up when someone posted a photo by hand and it landed in the
   * partner channels twice.
   */
  via_reader?: boolean;
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
  telegram_info_channel_id: number | null;
  broker_affiliate_url: string | null;
  signal_footer: string | null;
  info_footer: string | null;
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
    .select("slug, name, telegram_channel_id, telegram_info_channel_id, broker_affiliate_url, signal_footer, info_footer")
    .eq("active", true);
  return (data as TenantRow[]) ?? [];
}

function footerFor(t: TenantRow): string | null {
  const lines = [t.signal_footer, t.broker_affiliate_url ? `👉 ${t.broker_affiliate_url}` : null].filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

/**
 * Is this actually a trade call, or is it desk chatter?
 *
 * The footer — "Trade this signal with our partner broker" plus the referral
 * link — used to go under EVERY relayed message. The desk talks in that group:
 * "That's bold, pipettes pulled exactly at BE", "I think one or the other is
 * still in it". Each of those arrived in the partner channels with a broker
 * link stapled underneath, which reads as spam and devalues the link for the
 * messages where it belongs.
 *
 * A call names a direction AND carries a price marker (entry, stop or target).
 * Requiring both keeps "I'm long here" out and lets the desk's actual format —
 * "🔴 NAS SELL / Entry : 30 170.06 / SL : 30 195.06" — through. A recap counts
 * too: it is the result of the calls and the one other message where the link
 * makes sense.
 */
function isTradeSignal(text: string): boolean {
  const t = (text ?? "").toUpperCase();
  const hasSide = /\b(BUY|SELL|LONG|SHORT)\b/.test(t);
  const hasLevel = /\b(ENTRY|SL|TP\s*\d|TAKE[\s-]?PROFIT|STOP)\b/.test(t);
  const isRecap = /(PERFORMANCE|GESAMTERGEBNIS|TOTAL RESULT|RECAP)/.test(t);
  return (hasSide && hasLevel) || isRecap;
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
    // Only under real calls, not under every exchange in the desk.
    const footer = isTradeSignal(post.text ?? post.caption ?? "") ? footerFor(t) : null;

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

/**
 * Keep the chart screenshots the desk posts.
 *
 * They used to pass straight through — copied to each channel and forgotten —
 * so the website had nothing real to show. Telegram gives a bot no access to
 * history, so anything posted before this shipped is gone for good; this is
 * where the collection starts.
 *
 * Stored UNAPPROVED. A chart screenshot can carry an account balance, a name, or
 * a losing week nobody meant to publish, so nothing reaches the site until a
 * human ticks it. Silent on failure: a screenshot we fail to record must never
 * stop a signal going out.
 */
async function storeMedia(db: SupabaseClient, post: TgMessage) {
  const photos = post.photo;
  // ⚠️ Media delivered by cosmos-reader arrives with `has_media` but WITHOUT a
  // `photo` array, because a user-account reader has no Bot-API file_id to put
  // there. Those posts are handled by relayMedia, which stores the file_id it
  // gets back from the upload — this path only sees media Telegram delivered.
  if (!photos?.length) return;
  // Telegram sends the same image in several sizes; the last is the largest.
  const best = photos[photos.length - 1];
  try {
    await db.from("desk_media").upsert({
      file_id: best.file_id,
      file_unique_id: best.file_unique_id,
      caption: post.caption ?? null,
      width: best.width,
      height: best.height,
      source_chat_id: post.chat.id,
      source_message_id: post.message_id,
    }, { onConflict: "file_unique_id", ignoreDuplicates: true });
  } catch (e) {
    console.error("[media] store failed:", e);
  }
}

/**
 * Media from the reader: one upload, then the file_id for everyone else.
 *
 * The caption carries the footer too — a separate footer message under a chart
 * would be a second notification for one post.
 */
async function relayMedia(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  const chans = tenants.filter((t) => t.telegram_channel_id);
  const body = post.caption ? await toEnglish(post.caption) : "";
  const wantsFooter = isTradeSignal(post.caption ?? "");
  const mime = post.media_mime ?? "image/jpeg";

  const delivered: Record<string, unknown> = {};
  let fileId: string | null = null;

  for (const t of chans) {
    const footer = wantsFooter ? footerFor(t) : null;
    // Telegram caps a caption at 1024 characters; body + footer stays well under.
    const caption = [body, footer].filter(Boolean).join("\n\n") || undefined;

    if (!fileId) {
      const up = await uploadMedia(Number(t.telegram_channel_id), post.media_b64!, mime, caption);
      if (up.ok && up.file_id) fileId = up.file_id;
      delivered[t.slug] = up.ok
        ? { ok: true, message_id: up.message_id }
        : { ok: false, error: up.error };
      if (!up.ok) console.error(`[media] upload → ${t.slug} failed:`, up.error);
      continue;
    }

    const { method, field } = methodFor(mime);
    const res = await tg<{ message_id: number }>(method, {
      chat_id: t.telegram_channel_id,
      [field]: fileId,
      ...(caption ? { caption } : {}),
    });
    delivered[t.slug] = res.ok
      ? { ok: true, message_id: res.result?.message_id }
      : { ok: false, error: res.description };
    if (!res.ok) console.error(`[media] → ${t.slug} failed:`, res.description);
  }

  await logRelay(db, post.chat.id, post.message_id, post.caption ?? "[media]", delivered);

  // Now there IS a real file_id, so the website gallery can finally be fed.
  if (fileId) {
    try {
      await db.from("desk_media").upsert({
        file_id: fileId,
        // `file_unique_id` carries a UNIQUE index and is what makes this upsert
        // idempotent, but Telegram only returns one for a file it already knew.
        // The source post identifies this image exactly as well, so it stands in
        // — without it every redelivery would add another gallery row.
        file_unique_id: `src:${post.chat.id}:${post.message_id}`,
        caption: post.caption ?? null,
        source_chat_id: post.chat.id,
        source_message_id: post.message_id,
      }, { onConflict: "file_unique_id", ignoreDuplicates: true });
    } catch (e) {
      console.error("[media] store failed:", e);
    }
  }
}

async function relaySingle(db: SupabaseClient, post: TgMessage, tenants: TenantRow[]) {
  // The reader shipped the file with the update — that path uploads instead of copying.
  if (post.media_b64) return relayMedia(db, post, tenants);

  const delivered: Record<string, unknown> = {};
  // activeTenants now returns partners that may have only an INFO channel, so
  // the signal paths filter here rather than in the query.
  for (const t of tenants.filter((x) => x.telegram_channel_id)) {
    delivered[t.slug] = await copyOne(t, post);
  }
  await logRelay(db, post.chat.id, post.message_id, post.text ?? post.caption ?? "[media]", delivered);
  // Both AFTER the relay: a parser or storage bug must not stop a signal.
  await storeRecap(db, post);
  await storeMedia(db, post);
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
  for (const t of tenants.filter((x) => x.telegram_channel_id)) {
    try {
      const copy = await tg("copyMessages", { chat_id: t.telegram_channel_id, from_chat_id: post.chat.id, message_ids: messageIds });
      if (!copy.ok) throw new Error(copy.description ?? "copyMessages failed");
      // Same rule as copyOne: the link belongs under calls, not under a chart
      // the desk posted to show what happened.
      const footer = isTradeSignal(post.caption ?? "") ? footerFor(t) : null;
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

  // Decided once from the SOURCE text: an edit must not add a footer to a
  // message that never had one, nor drop one that did.
  const wantsFooter = isTradeSignal(post.text ?? post.caption ?? "");

  const results: Record<string, unknown> = {};

  for (const t of tenants.filter((x) => x.telegram_channel_id)) {
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
      const footer = wantsFooter ? footerFor(t) : null;
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
    .from("telegram_links").select("id, tenant_id, members(deposit, activity_status), tenants(telegram_channel_id)")
    .eq("telegram_user_id", reqObj.from.id).in("status", ["linked", "joined"]).maybeSingle();

  const member = link?.members as unknown as { deposit: number; activity_status: string } | null;
  // Und in den Kanal SEINER Marke, nicht in irgendeinen.
  //
  // Geprueft wurde bisher nur "ist dieser Telegram-Nutzer ein zahlendes
  // Mitglied" — nicht, ob der Kanal, an dem er klopft, ueberhaupt zu seiner
  // Marke gehoert. Ein Mitglied von uns konnte also den Einladungslink von
  // Zekos Kanal irgendwo auftreiben und wurde dort eingelassen: Zekos
  // Mitgliederzahl steigt um jemanden, der nie zu ihm gehoerte, und unser
  // Kunde liest die Signale in einem fremden Kanal.
  const ownChannel = (link?.tenants as unknown as { telegram_channel_id: number | string | null } | null)?.telegram_channel_id;
  const channelMatches = ownChannel != null && Number(ownChannel) === Number(reqObj.chat.id);
  // Gate on BOTH: funded (deposit ≥ threshold) AND not inactivity-revoked. An
  // inactivity-kicked member must trade again (status leaves 'inactive') before
  // they can rejoin — otherwise the activity kick would be instantly undone.
  const eligible =
    !!link && !!member && channelMatches &&
    Number(member.deposit) >= MIN_DEPOSIT_FOR_SIGNALS &&
    member.activity_status !== "inactive";

  await tg(eligible ? "approveChatJoinRequest" : "declineChatJoinRequest", { chat_id: reqObj.chat.id, user_id: reqObj.from.id });
  if (eligible && link) {
    await db.from("telegram_links").update({ status: "joined", joined_at: new Date().toISOString() }).eq("id", link.id);
  }
}

/**
 * The info channel: mirrored to the website AND fanned out to every partner.
 *
 * This is the second half of the white-label structure. The signal relay copies
 * the desk's calls into each partner's signal channel; this copies the content
 * Diego writes once — market notes, education, the Cosmo posts — into each
 * partner's own info channel, so a partner's audience sees the partner's brand
 * instead of ours.
 *
 * Cosmos-Candles-Info is the SOURCE, so it is never a destination: its own
 * tenant row leaves telegram_info_channel_id NULL and it cannot copy to itself.
 *
 * Translation runs here too. If Diego writes in English `toEnglish` returns the
 * text unchanged (the prompt says so explicitly), so this costs nothing on
 * English posts and saves the German ones.
 *
 * The delivery map is stored on the row so an edit in the source can update
 * every copy — otherwise a corrected post stays wrong in every partner channel,
 * which is exactly the failure the signal relay already learned to avoid.
 */
async function storeInfoPost(db: SupabaseClient, msg: TgMessage, tenants: TenantRow[]) {
  const raw = (msg.text ?? msg.caption ?? "").trim();
  const photo = msg.photo?.length ? msg.photo[msg.photo.length - 1].file_id : null;
  if (!raw && !photo) return;

  const body = raw ? await toEnglish(raw) : "";
  const delivered: Record<string, unknown> = {};

  for (const t of tenants.filter((x) => x.telegram_info_channel_id)) {
    try {
      const text = t.info_footer ? `${body}\n\n${t.info_footer}` : body;
      if (msg.text) {
        const res = await tg<{ message_id: number }>("sendMessage", {
          chat_id: t.telegram_info_channel_id,
          text,
          disable_web_page_preview: true,
        });
        if (!res.ok) throw new Error(res.description ?? "sendMessage failed");
        delivered[t.slug] = { ok: true, message_id: res.result?.message_id };
      } else {
        const copy = await tg<{ message_id: number }>("copyMessage", {
          chat_id: t.telegram_info_channel_id,
          from_chat_id: msg.chat.id,
          message_id: msg.message_id,
          ...(raw ? { caption: text } : {}),
        });
        if (!copy.ok) throw new Error(copy.description ?? "copyMessage failed");
        delivered[t.slug] = { ok: true, message_id: copy.result?.message_id };
      }
    } catch (e) {
      console.error(`[info] → ${t.slug} failed:`, e);
      delivered[t.slug] = { ok: false, error: String(e) };
    }
  }

  // The website copy is stored LAST and never blocks the fan-out: a member
  // waiting on a Telegram post matters more than the dashboard rail.
  const { error } = await db.from("info_posts").upsert(
    {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      text: body || null,
      photo_file_id: photo,
      delivered,
      posted_at: new Date((msg.date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chat_id,message_id" },
  );
  if (error) console.error("[info_posts] upsert failed:", error.message);
}

/** An edit in the info channel → edit every copy, and the website row. */
async function editInfoPost(db: SupabaseClient, msg: TgMessage, tenants: TenantRow[]) {
  const { data: row } = await db
    .from("info_posts").select("delivered")
    .eq("chat_id", msg.chat.id).eq("message_id", msg.message_id).maybeSingle();

  const raw = (msg.text ?? msg.caption ?? "").trim();
  const body = raw ? await toEnglish(raw) : "";
  const delivered = (row?.delivered ?? null) as Record<string, DeliveredEntry> | null;

  for (const t of tenants.filter((x) => x.telegram_info_channel_id)) {
    const d = delivered?.[t.slug];
    if (!d?.ok || !d.message_id) continue;
    const text = t.info_footer ? `${body}\n\n${t.info_footer}` : body;
    const isCaption = msg.text == null && msg.caption != null;
    await tg(isCaption ? "editMessageCaption" : "editMessageText", {
      chat_id: t.telegram_info_channel_id,
      message_id: d.message_id,
      ...(isCaption ? { caption: text } : { text, disable_web_page_preview: true }),
    });
  }

  await db.from("info_posts")
    .update({ text: body || null, updated_at: new Date().toISOString() })
    .eq("chat_id", msg.chat.id).eq("message_id", msg.message_id);
}

// ── Admin-Befehle ────────────────────────────────────────────────────────────
//
// Die private Gruppe "Cosmos Admin 🔔" (ADMIN_ALERT_CHAT_ID) empfaengt nicht
// nur die Alerts aus den DB-Triggern — der Admin kann von unterwegs handeln:
// /freigeben, /deposit, /wer. Autorisierung ist die Gruppen-Mitgliedschaft
// selbst (privat, Invite-only, vom Reader-Account verwaltet); der Chat-Id-
// Vergleich unten haelt jeden anderen Chat drausssen.

async function handleAdminCommand(db: SupabaseClient, msg: TgMessage) {
  const reply = (text: string) =>
    tg("sendMessage", { chat_id: msg.chat.id, text, disable_web_page_preview: true });
  const [cmd, ...args] = (msg.text ?? "").trim().split(/\s+/);

  try {
    if (cmd === "/hilfe" || cmd === "/start" || cmd === "/help") {
      await reply(
        "🔧 Admin-Befehle:\n\n" +
        "/wer email@x.com — Mitglied nachschlagen (Deposit, seit wann)\n" +
        "/deposit email@x.com 250 — Deposit manuell setzen (schaltet Stufe frei)\n" +
        "/freigeben email@x.com — Partner-Bewerbung annehmen (Login + Marke + Einladungs-Mail)\n" +
        "/hilfe — diese Liste",
      );
      return;
    }

    if (cmd === "/wer") {
      const email = (args[0] ?? "").toLowerCase();
      if (!email) { await reply("Nutzung: /wer email@x.com"); return; }
      const { data: m } = await db.from("members")
        .select("email, deposit, created_at").ilike("email", email).maybeSingle();
      if (!m) { await reply(`Kein Mitglied mit ${email} gefunden.`); return; }
      await reply(`👤 ${m.email}\nDeposit: ${m.deposit ?? 0} €\nRegistriert: ${String(m.created_at).slice(0, 16).replace("T", " ")}`);
      return;
    }

    if (cmd === "/deposit") {
      const email = (args[0] ?? "").toLowerCase();
      const amount = Number(args[1]);
      if (!email || !Number.isFinite(amount) || amount < 0) {
        await reply("Nutzung: /deposit email@x.com 250"); return;
      }
      const { data: m } = await db.from("members")
        .select("id, email, deposit").ilike("email", email).maybeSingle();
      if (!m) { await reply(`Kein Mitglied mit ${email} gefunden.`); return; }
      const { error } = await db.from("members").update({ deposit: amount }).eq("id", m.id);
      if (error) { await reply(`Fehler: ${error.message}`); return; }
      await reply(`✅ Deposit fuer ${m.email}: ${m.deposit ?? 0} € → ${amount} €. Stufe schaltet sich automatisch frei.\n(Mail an den Kunden geht dabei NICHT automatisch raus.)`);
      return;
    }

    if (cmd === "/freigeben") {
      const email = (args[0] ?? "").toLowerCase();
      if (!email) { await reply("Nutzung: /freigeben email@x.com"); return; }
      const { data: app } = await db.from("partner_applications")
        .select("id, name, email, status").ilike("email", email)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!app) { await reply(`Keine Bewerbung mit ${email} gefunden.`); return; }
      const sendSecret = await cfg("SEND_SECRET");
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/partner-approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sendSecret ? { "x-internal-secret": sendSecret } : {}),
        },
        body: JSON.stringify({ application_id: app.id }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { await reply(`Freigabe fehlgeschlagen: ${out.error ?? res.status}`); return; }
      await reply(`✅ ${app.name || app.email} freigegeben — Marke "${out.slug}".` +
        (out.mailed ? " Einladungs-Mail ist raus." : " ⚠️ Mail konnte nicht gesendet werden."));
      return;
    }

    await reply("Unbekannter Befehl. /hilfe zeigt alles.");
  } catch (e) {
    console.error("[telegram-webhook] admin command error:", e);
    await reply(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

async function processUpdate(update: TgUpdate) {
  const db = admin();

  const mainChatId = Number(await cfg("MAIN_CHANNEL_ID") || 0);
  const infoId = Number(await cfg("INFO_CHANNEL_ID") || 0);
  const adminChatId = Number(await cfg("ADMIN_ALERT_CHAT_ID") || 0);

  // Admin-Gruppe zuerst: Befehle duerfen nie in den Signal-Umschreiber laufen.
  const adminMsg = update.message ?? update.edited_message;
  if (adminChatId !== 0 && adminMsg && adminMsg.chat.id === adminChatId) {
    if ((adminMsg.text ?? "").startsWith("/")) await handleAdminCommand(db, adminMsg);
    return;
  }

  /**
   * Which chat is allowed to feed the relay.
   *
   * This used to be "MAIN_CHANNEL_ID **or any channel that is not a relay
   * destination**". That second clause was a fallback for the case where
   * MAIN_CHANNEL_ID was unset or wrong, and it was safe only while the bot sat
   * in exactly one non-destination chat.
   *
   * It is not safe any more. The bot is being added to the info channel so the
   * dashboard can mirror it, and under the old rule every marketing post there
   * matched "not a destination" and would have been copied into each partner's
   * signal channel as if the desk had called a trade. The same applies to any
   * chat anyone ever adds this bot to.
   *
   * So: once MAIN_CHANNEL_ID is set — it is, and it points at the desk's
   * supergroup — it is the ONLY source. The inference survives solely as a
   * bootstrap for an unconfigured install.
   */
  const isSourceChat = (chatId: number, destIds: Set<number>) =>
    mainChatId !== 0 ? chatId === mainChatId : !destIds.has(chatId);

  // The info channel: fanned out to partner info channels + mirrored for the
  // website. Never relayed as a signal.
  const ownChat = update.channel_post ?? update.edited_channel_post ?? update.message ?? update.edited_message;
  if (ownChat && infoId !== 0 && ownChat.chat.id === infoId) {
    const tenants = await activeTenants(db);
    if (update.edited_channel_post ?? update.edited_message) await editInfoPost(db, ownChat, tenants);
    else await storeInfoPost(db, ownChat, tenants);
    return;
  }

  // Anything else that is neither the source nor a destination gets RECORDED and
  // dropped. Recorded because a channel's numeric id cannot be looked up from
  // outside — a bot can only learn it by receiving a post — so this is how
  // INFO_CHANNEL_ID gets discovered after someone adds the bot to a channel.
  // Dropped because guessing what an unknown chat is for is how the old rule
  // ended up relaying the wrong thing.
  if (ownChat && ownChat.chat.id < 0 && mainChatId !== 0 && ownChat.chat.id !== mainChatId) {
    // Both kinds of destination: a partner may have an info channel and no
    // signal channel, and our own copies posted there must not be mistaken for
    // an unknown chat.
    const rows = await activeTenants(db);
    const dests = new Set([
      ...rows.map((t) => Number(t.telegram_channel_id)),
      ...rows.map((t) => Number(t.telegram_info_channel_id)),
    ].filter((n) => Number.isFinite(n) && n !== 0));
    if (!dests.has(ownChat.chat.id)) {
      await db.from("telegram_chats_seen").upsert(
        {
          chat_id: ownChat.chat.id,
          title: ownChat.chat.title ?? null,
          chat_type: ownChat.chat.type ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "chat_id" },
      );
      console.log("[router] ignored post from unconfigured chat", ownChat.chat.id, ownChat.chat.title ?? "");
      return;
    }
  }

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
    // has_media carries the caption-less chart screenshots: without it a photo
    // posted without a word was counted as empty and dropped.
    const hasContent = Boolean(groupMsg.text || groupMsg.caption || groupMsg.media_group_id || groupMsg.has_media);
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

    // ONE path out of the source group, and it is the reader.
    //
    // Telegram delivers human messages from that group to us directly, so a
    // photo posted by hand was relayed twice — once from this delivery and once
    // from the reader's copy of the same message. Dedup by update_id cannot
    // catch it: the two arrive as genuinely different updates.
    //
    // Dropping the direct one costs nothing. The reader sees every message in
    // the group, human or bot, and the relay has been fully dependent on it
    // since the day it was built — bot posts never arrive any other way.
    if (isSource && !groupMsg.via_reader) {
      console.log("[router] dropped direct delivery from the source group; the reader is the only path", groupMsg.message_id);
      return;
    }

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

  // Fehlt das Geheimnis, ist die Funktion ZU — nicht offen.
  //
  // Vorher stand hier `if (secret && ...)`: ohne hinterlegtes Geheimnis fiel die
  // Pruefung ersatzlos weg und JEDER konnte eine Telegram-Update-Struktur an
  // diese Adresse schicken. Die wandert dann durch den Signal-Umschreiber in
  // JEDEN Partnerkanal — gefaelschte Trade-Rufe an alle Kunden gleichzeitig.
  // Ein leerer Schluessel entsteht schnell: neue Umgebung, vergessener Eintrag
  // in app_secrets, vertippter Name. Genau dann darf nicht alles offenstehen.
  // vt-ingest macht es an derselben Stelle richtig ("Ein fehlender Schluessel
  // darf nie 'jeder darf' bedeuten").
  const secret = await cfg("TELEGRAM_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
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
  //
  // NUR die Eindeutigkeitsverletzung ist ein Duplikat. Vorher galt JEDER Fehler
  // dieses Inserts als "schon gesehen" und das Update wurde verworfen — ein
  // Verbindungsabbruch, eine geaenderte RLS-Regel, eine volle Tabelle, und ein
  // echter Ruf des Desks verschwand still, mit 200 und ok:true nach aussen. Bei
  // einem Signalprodukt ist das der teuerste Fehler ueberhaupt: niemand merkt
  // es, und der Trade ist weg.
  //
  // Deshalb: 23505 (unique_violation) heisst wirklich doppelt -> verwerfen.
  // Alles andere wird laut protokolliert und TROTZDEM verarbeitet. Ein Signal
  // zweimal zu schicken ist peinlich; eines zu verlieren kostet Geld.
  const { error: dupErr } = await db.from("telegram_updates").insert({ update_id: update.update_id });
  if (dupErr?.code === "23505") {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  }
  if (dupErr) {
    console.error("[telegram-webhook] Dedupe-Insert fehlgeschlagen, verarbeite trotzdem:", dupErr.code, dupErr.message);
  }

  // Process synchronously so the relay actually completes, then ACK.
  try {
    await processUpdate(update);
  } catch (e) {
    console.error("[telegram-webhook] process error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
