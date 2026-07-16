// Data layer for the HQ Life-OS dashboard.
//
// Private data (tasks, notes, day plans, settings, notifications) lives in the
// dedicated "momentum-hq" Supabase project. Business KPIs are READ from
// existing product infrastructure and nothing HQ-related is stored there:
//   - Spy Secret: pre-existing admin-dashboard-v3 edge function (admin-gated)
//   - Trading:    the academy's own Supabase (when its env is configured)
import { hq } from "@/integrations/hq/client";
import { spysecret, SPYSECRET_URL } from "@/integrations/spysecret/client";
import type {
  ContentKpis,
  DayBlock,
  DayPlan,
  LifeNote,
  LifeNotification,
  LifeSettings,
  LifeTask,
  SpyKpis,
  TradingSnapshot,
  Venture,
} from "./types";

function fail(msg: string | undefined, fallback: string): never {
  throw new Error(msg || fallback);
}

/** Local date (device timezone) as YYYY-MM-DD — sv-SE locale formats exactly that. */
export function todayISO(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// ── Ventures ─────────────────────────────────────────────────────────────────

export async function fetchVentures(): Promise<Venture[]> {
  const { data, error } = await hq
    .from("life_ventures")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) fail(error.message, "Ventures laden fehlgeschlagen");
  return (data ?? []) as unknown as Venture[];
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<LifeTask[]> {
  const { data, error } = await hq
    .from("life_tasks")
    .select("*")
    .order("priority")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) fail(error.message, "Aufgaben laden fehlgeschlagen");
  return (data ?? []) as unknown as LifeTask[];
}

export async function addTask(input: {
  title: string;
  priority: 1 | 2 | 3;
  due_date?: string | null;
  venture_slug?: string | null;
}) {
  const { error } = await hq.from("life_tasks").insert({
    title: input.title,
    priority: input.priority,
    due_date: input.due_date ?? null,
    venture_slug: input.venture_slug ?? null,
  });
  if (error) fail(error.message, "Aufgabe anlegen fehlgeschlagen");
}

export async function setTaskDone(id: string, done: boolean) {
  const { error } = await hq
    .from("life_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) fail(error.message, "Aufgabe aktualisieren fehlgeschlagen");
}

export async function setTaskPriority(id: string, priority: 1 | 2 | 3) {
  const { error } = await hq.from("life_tasks").update({ priority }).eq("id", id);
  if (error) fail(error.message, "Priorität ändern fehlgeschlagen");
}

export async function deleteTask(id: string) {
  const { error } = await hq.from("life_tasks").delete().eq("id", id);
  if (error) fail(error.message, "Aufgabe löschen fehlgeschlagen");
}

// ── Second Brain notes ───────────────────────────────────────────────────────

export async function fetchNotes(): Promise<LifeNote[]> {
  const { data, error } = await hq
    .from("life_notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) fail(error.message, "Notizen laden fehlgeschlagen");
  return (data ?? []) as unknown as LifeNote[];
}

export async function addNote(input: {
  body: string;
  title?: string | null;
  kind: LifeNote["kind"];
  tags: string[];
  venture_slug?: string | null;
}) {
  const { error } = await hq.from("life_notes").insert({
    body: input.body,
    title: input.title ?? null,
    kind: input.kind,
    tags: input.tags,
    venture_slug: input.venture_slug ?? null,
  });
  if (error) fail(error.message, "Notiz speichern fehlgeschlagen");
}

export async function setNotePinned(id: string, pinned: boolean) {
  const { error } = await hq.from("life_notes").update({ pinned }).eq("id", id);
  if (error) fail(error.message, "Notiz pinnen fehlgeschlagen");
}

export async function deleteNote(id: string) {
  const { error } = await hq.from("life_notes").delete().eq("id", id);
  if (error) fail(error.message, "Notiz löschen fehlgeschlagen");
}

// ── Day planner ──────────────────────────────────────────────────────────────

export async function fetchDayPlan(day: string): Promise<DayPlan> {
  const { data, error } = await hq
    .from("life_day_plans")
    .select("day, focus, reflection")
    .eq("day", day)
    .maybeSingle();
  if (error) fail(error.message, "Tagesplan laden fehlgeschlagen");
  return (data ?? { day, focus: null, reflection: null }) as unknown as DayPlan;
}

export async function upsertDayPlan(
  day: string,
  patch: Partial<Pick<DayPlan, "focus" | "reflection">>,
) {
  const { error } = await hq
    .from("life_day_plans")
    .upsert({ day, ...patch }, { onConflict: "day" });
  if (error) fail(error.message, "Tagesplan speichern fehlgeschlagen");
}

export async function fetchDayBlocks(day: string): Promise<DayBlock[]> {
  const { data, error } = await hq
    .from("life_day_blocks")
    .select("*")
    .eq("day", day)
    .order("start_min");
  if (error) fail(error.message, "Zeitblöcke laden fehlgeschlagen");
  return (data ?? []) as unknown as DayBlock[];
}

export async function addDayBlock(input: {
  day: string;
  start_min: number;
  duration_min: number;
  title: string;
  venture_slug?: string | null;
}) {
  const { error } = await hq
    .from("life_day_blocks")
    .insert({ ...input, venture_slug: input.venture_slug ?? null });
  if (error) fail(error.message, "Zeitblock anlegen fehlgeschlagen");
}

export async function setBlockDone(id: string, done: boolean) {
  const { error } = await hq.from("life_day_blocks").update({ done }).eq("id", id);
  if (error) fail(error.message, "Zeitblock aktualisieren fehlgeschlagen");
}

export async function deleteBlock(id: string) {
  const { error } = await hq.from("life_day_blocks").delete().eq("id", id);
  if (error) fail(error.message, "Zeitblock löschen fehlgeschlagen");
}

// ── Settings + notifications ─────────────────────────────────────────────────

export async function fetchSettings(): Promise<LifeSettings> {
  const { data, error } = await hq
    .from("life_settings")
    .select(
      "id, telegram_bot_token, telegram_chat_id, brief_morning, brief_evening, morning_hour, evening_hour, email_fallback, notify_email, timezone",
    )
    .eq("id", 1)
    .single();
  if (error) fail(error.message, "Einstellungen laden fehlgeschlagen");
  return data as unknown as LifeSettings;
}

export async function updateSettings(patch: Partial<Omit<LifeSettings, "id">>) {
  const { error } = await hq.from("life_settings").update(patch).eq("id", 1);
  if (error) fail(error.message, "Einstellungen speichern fehlgeschlagen");
}

export async function fetchNotifications(): Promise<LifeNotification[]> {
  const { data, error } = await hq
    .from("life_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) fail(error.message, "Notifications laden fehlgeschlagen");
  return (data ?? []) as unknown as LifeNotification[];
}

export async function markNotificationsRead() {
  const { error } = await hq
    .from("life_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) fail(error.message, "Notifications markieren fehlgeschlagen");
}

// ── Spy Secret KPIs (read-only, existing admin-dashboard-v3 function) ───────

/** Best-effort login into the SPYSECRET project for KPI read access. */
export async function connectSpySecret(email: string, password: string): Promise<boolean> {
  const { error } = await spysecret.auth.signInWithPassword({ email, password });
  return !error;
}

export async function hasSpySecretSession(): Promise<boolean> {
  const { data } = await spysecret.auth.getSession();
  return !!data.session;
}

export async function fetchSpyKpis(): Promise<SpyKpis | null> {
  const { data } = await spysecret.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null; // not connected — card shows a hint

  const res = await fetch(`${SPYSECRET_URL}/functions/v1/admin-dashboard-v3?range=today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) fail(`admin-dashboard-v3: HTTP ${res.status}`, "Spy-Secret-KPIs fehlgeschlagen");
  const payload = (await res.json()) as {
    kpis: Record<string, number>;
    timelines?: { daily_30d?: { date: string; visitors: number }[] };
  };
  const k = payload.kpis ?? {};
  const daily = (payload.timelines?.daily_30d ?? [])
    .slice(-14)
    .map((d) => ({ day: d.date, visitors: d.visitors }));
  return {
    mrr_eur: k.mrr_eur ?? 0,
    pro_active: k.subs_pro_active ?? k.pro_users ?? 0,
    basic_active: k.subs_basic_active ?? k.basic_users ?? 0,
    in_trial: k.in_trial_users ?? 0,
    past_due: k.subs_past_due ?? 0,
    new_paying_today: k.new_paying_today ?? 0,
    visitors_today: k.visitors_today ?? 0,
    visitors_trend_pct: k.visitors_trend_pct ?? 0,
    scans_today: k.scans_today ?? 0,
    new_users_today: k.users_new_in_range ?? 0,
    daily,
  };
}

/** UGC video stats, read directly from existing tables (RLS decides access). */
export async function fetchContentKpis(): Promise<ContentKpis | null> {
  const { data: session } = await spysecret.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await spysecret
    .from("affiliate_videos")
    .select("current_views, current_likes, caption, platform, video_url")
    .order("current_views", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error || !data || data.length === 0) return null;
  const rows = data as {
    current_views: number | null;
    current_likes: number | null;
    caption: string | null;
    platform: string;
    video_url: string;
  }[];
  const top = rows[0];
  return {
    video_count: rows.length,
    total_views: rows.reduce((s, v) => s + Number(v.current_views ?? 0), 0),
    total_likes: rows.reduce((s, v) => s + Number(v.current_likes ?? 0), 0),
    top_video: top
      ? {
          caption: (top.caption ?? "(ohne Caption)").slice(0, 80),
          platform: top.platform,
          views: Number(top.current_views ?? 0),
          url: top.video_url,
        }
      : null,
  };
}

// ── life-brief edge function (Telegram/E-Mail, momentum-hq project) ─────────

export async function invokeBrief(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await hq.functions.invoke("life-brief", { body });
  if (error) {
    // FunctionsHttpError carries the response — surface its message if present.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      const j = await ctx.json().catch(() => null);
      if (j?.error) throw new Error(String(j.error));
    }
    throw new Error(error.message || "life-brief fehlgeschlagen");
  }
  return (data ?? {}) as Record<string, unknown>;
}

// ── Trading snapshot (academy's own Supabase; optional) ─────────────────────

export async function fetchTradingSnapshot(): Promise<TradingSnapshot | null> {
  try {
    const mod = await import("@/integrations/supabase/client");
    // The academy's generated Database type is empty, so query untyped.
    const academy = mod.supabase as unknown as import("@supabase/supabase-js").SupabaseClient;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [tenants, members, relays, latest] = await Promise.all([
      academy.from("tenants").select("slug", { count: "exact", head: true }).eq("active", true),
      academy.from("members").select("id", { count: "exact", head: true }),
      academy
        .from("signal_relays")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      academy
        .from("signal_relays")
        .select("preview, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (tenants.error && members.error) return null;
    return {
      tenants: tenants.count ?? 0,
      members: members.count ?? 0,
      relays24h: relays.count ?? 0,
      latestSignal: latest.data
        ? { preview: latest.data.preview as string, created_at: latest.data.created_at as string }
        : null,
    };
  } catch {
    return null; // env not configured (e.g. local dev) — card shows a hint instead
  }
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export const fmtInt = (n: number) => new Intl.NumberFormat("de-AT").format(Math.round(n));
export const fmtEur = (n: number) =>
  `€${new Intl.NumberFormat("de-AT", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))}`;
export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("de-AT", { notation: "compact", maximumFractionDigits: 1 }).format(n);
export const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
