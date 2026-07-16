// life-brief — HQ Life-OS notification brain (deployed on the SPYSECRET project).
//
// Actions (POST {action}):
//   tick             cron, hourly: sends morning/evening brief when the local
//                    hour in life_settings.timezone matches and none was sent
//                    for that local day yet (DST-safe by construction).
//   brief            {variant: 'morning'|'evening'} force-send (owner or cron).
//   test             sends a test message via the configured channels (owner).
//   telegram-detect  reads getUpdates of the bot token (body.token or saved),
//                    stores the newest private-chat id, sends a confirmation
//                    message (owner).
//
// Auth: x-cron-secret header must equal life_settings.cron_secret (cron path),
//       OR Authorization: Bearer <JWT> of a user listed in life_owners.
//
// Delivery: Telegram (token + chat id from life_settings) → email fallback via
// Resend (RESEND_API_KEY, already configured for spy-secret.com) → always logs
// into life_notifications so the dashboard feed shows everything.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Settings {
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  brief_morning: boolean;
  brief_evening: boolean;
  morning_hour: number;
  evening_hour: number;
  email_fallback: boolean;
  notify_email: string;
  timezone: string;
  cron_secret: string;
}

function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

async function loadSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db.from("life_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error(`life_settings missing: ${error?.message}`);
  return data as Settings;
}

async function isOwnerRequest(req: Request, db: SupabaseClient): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await anon.auth.getUser(auth.slice(7));
  const email = data?.user?.email?.toLowerCase();
  const uid = data?.user?.id;
  if (uid) {
    const { data: byId } = await db
      .from("life_owners")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();
    if (byId) return true;
  }
  if (email) {
    const { data: byEmail } = await db
      .from("life_owners")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (byEmail) return true;
  }
  return false;
}

// ── Local-time helpers (DST-safe via Intl) ───────────────────────────────────

function localParts(tz: string, d = new Date()): { date: string; hour: number; pretty: string } {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  // formatToParts, not format(): plain format() appends locale text ("18 Uhr")
  // which turns Number() into NaN and would silently disable the cron tick.
  const hourStr =
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(hourStr);
  const pretty = new Intl.DateTimeFormat("de-AT", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(d);
  return { date, hour: hour === 24 ? 0 : hour, pretty };
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fmtInt = (n: number) => new Intl.NumberFormat("de-AT").format(Math.round(n));
const fmtEur = (n: number) => `€${new Intl.NumberFormat("de-AT", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))}`;

// ── Delivery channels ────────────────────────────────────────────────────────

async function sendTelegram(s: Settings, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!s.telegram_bot_token || !s.telegram_chat_id) return { ok: false, error: "telegram not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${s.telegram_bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: s.telegram_chat_id, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await res.json();
    return j.ok ? { ok: true } : { ok: false, error: j.description ?? "sendMessage failed" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function sendEmail(s: Settings, subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };
  try {
    const html = `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap;">${
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }</pre>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "HQ <noreply@notify.spy-secret.com>", to: [s.notify_email], subject, text, html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function deliver(db: SupabaseClient, s: Settings, kind: string, title: string, body: string) {
  const sentVia: string[] = ["feed"];
  const errors: Record<string, string> = {};

  const tg = await sendTelegram(s, `${title}\n\n${body}`);
  if (tg.ok) sentVia.push("telegram");
  else if (tg.error) errors.telegram = tg.error;

  // Email when telegram is unconfigured/failed and fallback is on.
  if (!tg.ok && s.email_fallback) {
    const mail = await sendEmail(s, title, body);
    if (mail.ok) sentVia.push("email");
    else if (mail.error) errors.email = mail.error;
  }

  await db.from("life_notifications").insert({ kind, title, body, sent_via: sentVia });
  return { sent_via: sentVia, errors };
}

// ── Brief composition ────────────────────────────────────────────────────────

const P_EMOJI: Record<number, string> = { 1: "🔴", 2: "🟡", 3: "⚪" };

async function composeBrief(db: SupabaseClient, s: Settings, variant: "morning" | "evening") {
  const { date: today, pretty } = localParts(s.timezone);

  const [tasksQ, planQ, blocksQ, spyQ, contentQ] = await Promise.all([
    db.from("life_tasks").select("title, priority, due_date, done_at, updated_at").order("priority").order("due_date", { ascending: true, nullsFirst: false }).limit(200),
    db.from("life_day_plans").select("focus, reflection").eq("day", today).maybeSingle(),
    db.from("life_day_blocks").select("start_min, duration_min, title, done").eq("day", today).order("start_min"),
    db.rpc("life_spysecret_kpis"),
    db.rpc("life_content_kpis"),
  ]);

  const tasks = (tasksQ.data ?? []) as { title: string; priority: number; due_date: string | null; done_at: string | null; updated_at: string }[];
  const open = tasks.filter((t) => !t.done_at);
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const doneToday = tasks.filter((t) => t.done_at && t.done_at.slice(0, 10) === today).length;
  const blocks = (blocksQ.data ?? []) as { start_min: number; duration_min: number; title: string; done: boolean }[];
  const focus = planQ.data?.focus ?? null;
  const spy = (spyQ.data ?? {}) as Record<string, number>;
  const content = (contentQ.data ?? {}) as Record<string, unknown>;

  const spyLine = spyQ.error
    ? "📊 Spy Secret: Daten gerade nicht verfügbar"
    : `📊 Spy Secret: MRR ${fmtEur(spy.mrr_eur ?? 0)} · ${spy.paying_active ?? 0} Zahler · ${spy.in_trial ?? 0} Trials`;
  const contentLine = contentQ.error
    ? ""
    : `🎬 Content: ${fmtInt(Number(content.total_views ?? 0))} Views gesamt · +${fmtInt(Number(content.views_7d ?? 0))} in 7 Tagen`;

  if (variant === "morning") {
    const top = open.slice(0, 5).map((t, i) => {
      const due = t.due_date ? ` (bis ${t.due_date.slice(8, 10)}.${t.due_date.slice(5, 7)}.)` : "";
      return `${i + 1}. ${P_EMOJI[t.priority] ?? "⚪"} ${t.title}${due}`;
    });
    const plan = blocks.map((b) => `${hhmm(b.start_min)}–${hhmm(b.start_min + b.duration_min)} · ${b.title}`);

    const lines = [
      `🎯 Fokus: ${focus ?? "— noch nicht gesetzt"}`,
      "",
      top.length ? `✅ Top-Aufgaben:\n${top.join("\n")}` : "✅ Keine offenen Aufgaben — leg welche im HQ an!",
      overdue.length ? `⚠️ ${overdue.length} Aufgabe(n) überfällig` : null,
      "",
      plan.length ? `⏰ Tagesplan:\n${plan.join("\n")}` : "⏰ Noch keine Zeitblöcke geplant.",
      "",
      spyLine,
      `   Gestern: ${fmtInt(spy.visitors_yesterday ?? 0)} Besucher`,
      contentLine || null,
    ].filter((l): l is string => l !== null);

    return { title: `🌅 HQ Morning Brief — ${pretty}`, body: lines.join("\n") };
  }

  const doneBlocks = blocks.filter((b) => b.done).length;
  const openP1 = open.filter((t) => t.priority === 1).length;
  const lines = [
    `✅ Heute erledigt: ${doneToday} Aufgabe(n) · ${doneBlocks}/${blocks.length} Blöcke`,
    `📬 Offen: ${open.length} Aufgaben (davon ${openP1} × 🔴 Top-Prio)`,
    "",
    spyQ.error
      ? "📊 Spy Secret: Daten gerade nicht verfügbar"
      : `📊 Heute: ${fmtInt(spy.visitors_today ?? 0)} Besucher · ${fmtInt(spy.scans_today ?? 0)} Scans · ${spy.new_paying_today ?? 0} neue Zahler · MRR ${fmtEur(spy.mrr_eur ?? 0)}`,
    contentLine || null,
    "",
    "✍️ Kurze Reflexion im HQ eintragen — was war heute gut?",
  ].filter((l): l is string => l !== null);

  return { title: `🌙 HQ Abend-Review — ${pretty}`, body: lines.join("\n") };
}

async function alreadySentToday(db: SupabaseClient, s: Settings, kind: string): Promise<boolean> {
  const { date: today } = localParts(s.timezone);
  // Local day start expressed as UTC instant: scan the last 26h and compare local dates.
  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const { data } = await db.from("life_notifications").select("created_at").eq("kind", kind).gte("created_at", since).order("created_at", { ascending: false }).limit(5);
  return (data ?? []).some((n) => localParts(s.timezone, new Date(n.created_at)).date === today);
}

// ── Telegram chat detection ──────────────────────────────────────────────────

async function telegramDetect(db: SupabaseClient, s: Settings, tokenFromBody?: string) {
  const token = (tokenFromBody || s.telegram_bot_token || "").trim();
  if (!token) return json({ error: "Kein Bot-Token. Erst Token von @BotFather eintragen." }, 400);

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`, { signal: AbortSignal.timeout(15000) });
  const j = await res.json();
  if (!j.ok) return json({ error: `Telegram: ${j.description ?? "getUpdates failed"}` }, 400);

  const updates = (j.result ?? []) as Array<{ message?: { chat?: { id: number; type: string; first_name?: string; username?: string } } }>;
  const chats = updates.map((u) => u.message?.chat).filter((c): c is NonNullable<typeof c> => !!c && c.type === "private");
  const chat = chats[chats.length - 1];
  if (!chat) {
    return json({ error: "Kein Chat gefunden. Öffne deinen Bot in Telegram, schick ihm /start und versuch es nochmal." }, 404);
  }

  await db.from("life_settings").update({ telegram_bot_token: token, telegram_chat_id: String(chat.id) }).eq("id", 1);
  const fresh = { ...s, telegram_bot_token: token, telegram_chat_id: String(chat.id) };
  await sendTelegram(fresh, "✅ HQ verbunden! Hier kommen ab jetzt dein Morning Brief und Abend-Review an.");
  return json({ ok: true, chat_id: String(chat.id), name: chat.first_name ?? chat.username ?? "?" });
}

// ── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const db = admin();
    const settings = await loadSettings(db);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "tick");

    const cronOk = req.headers.get("x-cron-secret") === settings.cron_secret && !!settings.cron_secret;
    const ownerOk = cronOk ? true : await isOwnerRequest(req, db);
    if (!cronOk && !ownerOk) return json({ error: "forbidden" }, 403);

    if (action === "tick") {
      const { hour } = localParts(settings.timezone);
      const jobs: Array<"morning" | "evening"> = [];
      if (settings.brief_morning && hour === settings.morning_hour) jobs.push("morning");
      if (settings.brief_evening && hour === settings.evening_hour) jobs.push("evening");

      const results: Record<string, unknown> = {};
      for (const variant of jobs) {
        const kind = `brief_${variant}`;
        if (await alreadySentToday(db, settings, kind)) {
          results[variant] = "already sent";
          continue;
        }
        const { title, body: text } = await composeBrief(db, settings, variant);
        results[variant] = await deliver(db, settings, kind, title, text);
      }
      return json({ ok: true, hour, ran: jobs, results });
    }

    if (action === "brief") {
      const variant = body.variant === "evening" ? "evening" : "morning";
      const { title, body: text } = await composeBrief(db, settings, variant);
      const r = await deliver(db, settings, `brief_${variant}`, title, text);
      return json({ ok: true, title, ...r });
    }

    if (action === "test") {
      const r = await deliver(db, settings, "test", "🔔 HQ Test", "Deine HQ-Notifications funktionieren. 🚀");
      return json({ ok: true, ...r });
    }

    if (action === "telegram-detect") {
      return await telegramDetect(db, settings, typeof body.token === "string" ? body.token : undefined);
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("[life-brief]", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
