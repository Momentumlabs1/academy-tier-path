/**
 * send-email — central transactional/marketing sender via Resend.
 *
 * One place the whole backend calls to send mail. Uses RESEND_API_KEY.
 * Per-brand sender identity: pass `brand` (name/accent/logoUrl) and we build the
 * From as "<Brand> <noreply@send.cosmos-candles.com>" — swap the domain once each
 * partner subdomain is verified in Resend (see docs/site/finalization-roadmap.md §1).
 *
 * Secrets: RESEND_API_KEY, [MAIL_FROM_DOMAIN=send.cosmos-candles.com], [SEND_SECRET].
 *
 * POST body — two modes:
 *   1) Templated (preferred):
 *      { kind, to, brand?, firstName?, dashboardUrl?, confirmUrl?, unsubUrl?, ...kindExtras }
 *      kinds: doi | welcome | deposit_confirmed | tier_unlocked | tier_nudge |
 *             inactivity_warning | new_lesson | broadcast
 *   2) Raw: { to, subject, html, fromName?, replyTo? }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildEmail, type BuildInput, type EmailKind } from "./_templates.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const TEMPLATE_KINDS: EmailKind[] = [
  "doi", "welcome", "deposit_confirmed", "tier_unlocked",
  "tier_nudge", "inactivity_warning", "new_lesson", "broadcast",
];

/**
 * DB `app_secrets` (RLS-locked, service-role only) is the source of truth —
 * env may hold stale keys from older setups; fall back to env only if the DB
 * has no value. Cached per cold start.
 */
let _secretCache: Record<string, string> | null = null;
async function loadSecrets(): Promise<Record<string, string>> {
  if (_secretCache) return _secretCache;
  _secretCache = {};
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data } = await admin.from("app_secrets").select("key, value");
    for (const row of data ?? []) _secretCache[row.key as string] = row.value as string;
  } catch (_e) { /* env-only */ }
  return _secretCache;
}
async function secret(key: string): Promise<string | undefined> {
  const db = await loadSecrets();
  return db[key] ?? Deno.env.get(key);
}

async function resendSend(payload: Record<string, unknown>) {
  const key = await secret("RESEND_API_KEY");
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, id: body?.id } : { ok: false, error: body?.message ?? `HTTP ${res.status}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Guard against an open relay: if SEND_SECRET is set, require it.
  const guard = await secret("SEND_SECRET");
  if (guard && req.headers.get("x-send-secret") !== guard) {
    return json({ error: "unauthorized" }, 401);
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const fromDomain = (await secret("MAIL_FROM_DOMAIN")) ?? "send.cosmos-candles.com";
  const brandName = String((b.brand as Record<string, unknown>)?.name ?? b.brandName ?? b.fromName ?? "Cosmos Candles Academy");
  const from = `${brandName} <noreply@${fromDomain}>`;

  // ── Mode 1: templated ──────────────────────────────────────────────────────
  if (typeof b.kind === "string" && TEMPLATE_KINDS.includes(b.kind as EmailKind)) {
    if (!b.to) return json({ error: "to required" }, 400);
    if (b.kind === "doi" && !b.confirmUrl) return json({ error: "confirmUrl required for doi" }, 400);
    const built = buildEmail(b as unknown as BuildInput);
    if (!built) return json({ error: "unknown kind" }, 400);
    const r = await resendSend({ from, to: b.to, subject: built.subject, html: built.html, reply_to: b.replyTo });
    return json(r, r.ok ? 200 : 502);
  }

  // ── Mode 2: raw ────────────────────────────────────────────────────────────
  if (!b.to || !b.subject || !b.html) return json({ error: "to, subject, html (or a valid kind) required" }, 400);
  const r = await resendSend({ from, to: b.to, subject: b.subject, html: b.html, reply_to: b.replyTo });
  return json(r, r.ok ? 200 : 502);
});
