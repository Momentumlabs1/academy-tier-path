/**
 * zugang — der Knopf "Open my academy" aus der Freischalt-Mail.
 *
 * Die Mail enthaelt keinen Supabase-Anmeldelink (der verfaellt nach einer
 * Stunde), sondern /zugang?t=<token> aus access_invites, 7 Tage gueltig. Erst
 * beim Klick mintet diese Funktion einen frischen Anmeldelink und gibt ihn der
 * Seite zurueck, die sofort dorthin weiterleitet. Mehrfach klicken ist in den
 * 7 Tagen erlaubt — wer den Tab schliesst, bevor das Passwort sitzt, soll nicht
 * ausgesperrt sein.
 *
 * Oeffentlich (kein JWT): der Token IST der Nachweis. 48 Hex-Zeichen, nicht
 * erratbar.
 *
 * POST { t } -> { url } | 404 unbekannt | 410 abgelaufen
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = "https://cosmos-candles.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let t = "";
  try { t = String((await req.json()).t ?? ""); } catch { /* leer */ }
  if (!/^[0-9a-f]{32,128}$/.test(t)) return json({ error: "unbekannt" }, 404);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } });

  const { data: invite } = await db.from("access_invites")
    .select("token, email, expires_at, used_at").eq("token", t).maybeSingle();
  if (!invite) return json({ error: "unbekannt" }, 404);
  if (new Date(invite.expires_at).getTime() < Date.now()) return json({ error: "abgelaufen", email: invite.email }, 410);

  const { data, error } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
    options: { redirectTo: `${SITE}/` },
  });
  const url = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (error || !url) return json({ error: `Link: ${error?.message ?? "leer"}` }, 500);

  if (!invite.used_at) {
    await db.from("access_invites").update({ used_at: new Date().toISOString() }).eq("token", t);
  }
  return json({ url });
});
