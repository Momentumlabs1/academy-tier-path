/**
 * video-url — issues a short-lived SIGNED URL for a gated academy video.
 *
 * The lesson/tutorial videos live in the PRIVATE `academy-videos` bucket (no
 * public read, no hotlinking, never on YouTube). A logged-in member requests
 * ONE specific video by object name; this function verifies their identity and
 * entitlement (deposit → tier) server-side and only then hands back a
 * time-limited signed URL. A member below the required tier never receives a
 * URL — the client is never trusted for entitlement.
 *
 * Nothing is pre-loaded: the frontend calls this only when the member presses
 * play, so the site stays fast (see useSignedVideoUrl + preload="none").
 *
 * POST { object: "lesson-01.mp4" }  (Authorization: Bearer <member access token>)
 *   -> { url }  |  { error, ... }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const BUCKET = "academy-videos";
const TTL = 60 * 60 * 2; // 2h signed URL

// Authoritative access rule per video. "funded" = any deposit > 0; otherwise a
// tier floor. Keep this in sync with the lesson tiers in src/lib/academy-data.ts.
const RULE: Record<string, "funded" | "foundation" | "operator" | "elite"> = {
  "signals-tutorial.mp4": "funded",   // post-deposit tutorial
  "lesson-01.mp4": "foundation",      // What Is Trading?
  "lesson-03.mp4": "foundation",      // Why 90% of Traders Lose
  "lesson-04.mp4": "operator",        // What Is Retail Money?
  "lesson-05.mp4": "operator",        // Level 1 vs. Level 2 Data
  "lesson-06.mp4": "elite",           // Volume Profile
};

const TIER_RANK = { foundation: 0, operator: 1, elite: 2 } as const;
function tierRankForDeposit(d: number): number {
  if (d >= 50_000) return TIER_RANK.elite;
  if (d >= 2_000) return TIER_RANK.operator;
  if (d >= 100) return TIER_RANK.foundation;
  return -1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let object = "";
  try { object = String((await req.json())?.object ?? ""); } catch { /* bad body */ }
  const rule = RULE[object];
  if (!rule) return json({ error: "unknown video" }, 400);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Identify the member from their access token.
  const { data: userData, error: uErr } = await db.auth.getUser(token);
  if (uErr || !userData.user) return json({ error: "unauthorized" }, 401);

  // Entitlement: their live deposit → tier, checked against the video's rule.
  const { data: member } = await db
    .from("members")
    .select("deposit, tier_override, access_revoked")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  // Ein vom Admin entzogener Zugang sieht keine Videos, egal was sonst gilt.
  if (member?.access_revoked === true) return json({ error: "access_revoked" }, 403);
  const deposit = Number(member?.deposit ?? 0);

  // DER FREIBRIEF GILT AUCH HIER.
  //
  // Diese Funktion rechnete die Stufe ausschliesslich aus der Einzahlung. Ein
  // vom Admin freigeschaltetes Konto (members.tier_override, Migration 055)
  // hat aber deposit = 0 — die Oberflaeche sagte "Elite", und JEDE Lektion
  // antwortete hier mit 403 locked. Genau so sah es am 24.08. aus: das Video
  // blieb schwarz und der Player fragte in einer Schleife nach.
  //
  // Die Berechtigung ist der HOEHERE der beiden Werte.
  const overrideRank =
    member?.tier_override && member.tier_override in TIER_RANK
      ? TIER_RANK[member.tier_override as keyof typeof TIER_RANK]
      : -1;
  const rank = Math.max(tierRankForDeposit(deposit), overrideRank);

  const allowed = rule === "funded" ? (deposit > 0 || overrideRank >= 0) : rank >= TIER_RANK[rule];
  if (!allowed) return json({ error: "locked", rule }, 403);

  // Hand back a time-limited signed URL for exactly this object.
  const { data: signed, error: sErr } = await db.storage.from(BUCKET).createSignedUrl(object, TTL);
  if (sErr || !signed?.signedUrl) return json({ error: sErr?.message ?? "sign failed" }, 500);

  return json({ url: signed.signedUrl });
});
