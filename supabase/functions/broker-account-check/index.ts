/**
 * broker-account-check — "does the broker know this member yet?"
 *
 * The academy unlocks on a deposit that the broker reports against an email
 * address. If a member registers at HeroFX with a different address than the one
 * they use here, nothing ever matches: their deposit lands, their academy stays
 * shut, and NOBODY FINDS OUT — not them, not us. They conclude the product is
 * broken and leave. That silence is the actual failure, not the typo.
 *
 * HeroFX cannot hand back our own tracking id to fix this properly. Their
 * registration and partnership systems are separate databases, and bridging them
 * would mean opening a hole in a licensed broker's firewall — a reasonable no.
 *
 * What they do expose is a search:
 *     GET /partnership/clients/?search=<email>
 *
 * which is enough to turn a silent mismatch into an immediate, answerable
 * question. This endpoint asks it on the member's behalf and returns yes/no.
 *
 * DELIBERATELY NOT A LOOKUP TOOL. It answers only for the caller's OWN addresses,
 * taken from their session — never from the request body. Accepting an arbitrary
 * email here would turn a partner token into an oracle that reveals whether any
 * given person banks with HeroFX, which is exactly the kind of thing their
 * database separation exists to prevent.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://portal.herofx.co/api";

/** Cloudflare rejects anything that does not look like a browser. */
const BROWSERISH = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://portal.herofx.co/",
  "Origin": "https://portal.herofx.co",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "not signed in" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Whose addresses may we ask about? Only the caller's — resolved from their
  // token, never from anything they send us.
  const { data: userData, error: uErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (uErr || !userData?.user) return json({ error: "not signed in" }, 401);

  const { data: member } = await admin
    .from("members")
    .select("id, email, broker_email")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!member) return json({ error: "no member record" }, 404);

  let token = Deno.env.get("HEROFX_API_TOKEN");
  try {
    const { data } = await admin.from("app_secrets").select("value").eq("key", "HEROFX_API_TOKEN").maybeSingle();
    if (data?.value) token = data.value as string;
  } catch { /* env only */ }
  if (!token) return json({ error: "broker not configured" }, 500);

  const candidates = [member.email, member.broker_email]
    .map((e) => (e ?? "").toLowerCase().trim())
    .filter((e, i, a) => e && a.indexOf(e) === i) as string[];

  for (const email of candidates) {
    let res: Response;
    try {
      res = await fetch(`${API}/partnership/clients/?search=${encodeURIComponent(email)}`, {
        headers: { ...BROWSERISH, "X-Access-Token": token },
      });
    } catch {
      return json({ error: "broker unreachable" }, 502);
    }
    if (!res.ok) continue;
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) continue;
    const rows = (Array.isArray(body) ? body : (body.results as unknown[]) ?? []) as Record<string, unknown>[];
    // `search` matches partial strings, so an exact comparison is required — a
    // "found" that is really somebody else's address is worse than a "not found".
    const hit = rows.find((r) => String(r.email ?? "").toLowerCase().trim() === email);
    if (hit) {
      return json({ found: true, matchedEmail: email, registeredAt: hit.dateJoined ?? null });
    }
  }

  return json({ found: false, checked: candidates });
});
