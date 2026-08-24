/**
 * create-telegram-link — issues a deep-link token for a verified member so the
 * website's "Connect Telegram" button can hand them a t.me/<bot>?start=<token>
 * URL. The bot resolves the token in /start.
 *
 * Auth: the caller's Supabase access token. The member is derived from it.
 * Returns: { url: "https://t.me/<bot>?start=<token>" }
 *
 * WARUM DIE E-MAIL AUS DEM ANFRAGETEXT WEG MUSSTE (Pruefung 23.08.2026)
 * Die Funktion laeuft mit verify_jwt = false und suchte das Mitglied ueber
 * `.eq("email", body.email)` — mit dem Dienstschluessel, also an der RLS vorbei.
 * Schritt 3 gibt zudem ein BESTEHENDES Token zurueck, kein frisches. Und der
 * Bot akzeptiert in handleStart jeden Status ausser "revoked" und ueberschreibt
 * telegram_user_id mit dem, der den Link oeffnet.
 *
 * Damit reichte die Kenntnis einer fremden Mitglieds-Adresse:
 *   POST {"email":"..."} -> t.me-Link -> /start aus dem eigenen Telegram
 *   -> der Bot bindet den Zugang auf den Angreifer um und laesst ihn in den
 *      bezahlten Signalkanal; die Beitrittsanfragen des echten Mitglieds
 *      werden ab da abgelehnt, weil die Bindung nicht mehr ihm gehoert.
 *
 * Der Kopf sagte "Auth note (v1): ... once real Supabase Auth is wired, take
 * the member from the JWT instead of the request body." Supabase Auth IST
 * verdrahtet — mentor-chat macht es in derselben Codebasis richtig vor. Das
 * hier war eine liegengebliebene Notiz, kein Entwurf.
 *
 * Deploy: verify_jwt bleibt false, weil die Funktion den Token selbst prueft
 * und bei fehlendem Token eine saubere Meldung geben soll.
 * Secrets: TELEGRAM_BOT_TOKEN, SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MIN_DEPOSIT = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

let cachedBotUsername: string | null = null;
async function botUsername(): Promise<string> {
  if (cachedBotUsername) return cachedBotUsername;
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const j = await res.json();
  cachedBotUsername = j?.result?.username ?? "";
  return cachedBotUsername!;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Wer ruft? ─────────────────────────────────────────────────────────────
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearer) return json({ error: "unauthorized" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: userData, error: userErr } = await db.auth.getUser(bearer);
  const authUserId = userData?.user?.id;
  if (userErr || !authUserId) return json({ error: "unauthorized" }, 401);

  // ── Das Mitglied kommt aus dem Token, nicht aus dem Anfragetext ───────────
  const { data: member } = await db
    .from("members")
    .select("id, deposit, name, referred_by_tenant, access_revoked")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!member) return json({ error: "member_not_found" }, 404);
  // Ein vom Admin gesperrter Zugang bekommt keinen neuen Kanal-Link.
  if (member.access_revoked === true) return json({ error: "access_revoked" }, 403);
  if (Number(member.deposit) < MIN_DEPOSIT) {
    return json({ error: "deposit_not_verified", need: MIN_DEPOSIT }, 403);
  }

  // ── Der Kanal DIESES Mitglieds ────────────────────────────────────────────
  // Vorher: "erste aktive Marke" als Rueckfall — bei mehreren Partnern also
  // irgendeine. Ein Mitglied, das ueber Zeko kam, landete dann in einem
  // fremden Kanal, und der Partner, der es gebracht hat, sah es nie.
  // Ohne bekannte Herkunft faellt es auf die HAUSMARKE zurueck, nicht auf
  // "irgendeine aktive". Wer ueber niemanden kam, gehoert zu uns — das ist eine
  // Aussage, keine Vermutung. (Beim Durchlauf am 24.08. hatte der einzige
  // zahlende Kunde referred_by_tenant = NULL; ein hartes 409 haette ihn vom
  // Signalkanal ausgesperrt.)
  const HOUSE = "cosmos-candles";
  let tenantId: string | null = null;
  const slug = member.referred_by_tenant || HOUSE;
  {
    const { data: t } = await db.from("tenants")
      .select("id").eq("slug", slug).eq("active", true).maybeSingle();
    tenantId = t?.id ?? null;
  }
  if (!tenantId && slug !== HOUSE) {
    const { data: t } = await db.from("tenants")
      .select("id").eq("slug", HOUSE).eq("active", true).maybeSingle();
    tenantId = t?.id ?? null;
  }
  if (!tenantId) return json({ error: "no_channel_for_member" }, 409);

  // ── Token: vorhandenes wiederverwenden, sonst anlegen ─────────────────────
  const { data: existing } = await db
    .from("telegram_links")
    .select("link_token, status")
    .eq("member_id", member.id)
    .in("status", ["pending", "linked", "joined"])
    .maybeSingle();

  let token = existing?.link_token as string | undefined;
  if (!token) {
    const { data: created, error } = await db
      .from("telegram_links")
      .insert({ member_id: member.id, tenant_id: tenantId, status: "pending" })
      .select("link_token")
      .single();
    if (error || !created) return json({ error: "could_not_create_link" }, 500);
    token = created.link_token as string;
  }

  const user = await botUsername();
  if (!user) return json({ error: "bot_not_configured" }, 500);

  return json({ url: `https://t.me/${user}?start=${token}` });
});
