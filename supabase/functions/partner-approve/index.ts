/**
 * partner-approve — macht aus einer Bewerbung einen Partner mit Zugang.
 *
 * Vorher war "Approve" auf /admin/partners ein Klick auf ein Statusetikett: es
 * schrieb ein Wort in die Datenbank und sonst passierte nichts. Kein Login,
 * keine Marke, keine E-Mail. Der Bewerber wartete auf eine Nachricht, die
 * niemand schickte, und das Formular hatte ihm eine innerhalb weniger Stunden
 * versprochen.
 *
 * Vier Dinge in einem Schritt, in dieser Reihenfolge:
 *   1. Login anlegen und einladen  (inviteUserByEmail — der Bewerber setzt
 *      sein Passwort selbst, wir sehen es nie)
 *   2. Marke anlegen               (tenants-Zeile, owner_user_id = neuer User)
 *   3. Bewerbung auf approved      (mit tenant_slug, damit nachvollziehbar
 *                                   bleibt, was aus welcher Bewerbung wurde)
 *   4. E-Mail mit den nächsten Schritten
 *
 * IDEMPOTENT: existiert der Login oder die Marke schon, wird sie
 * weiterverwendet statt zu scheitern. Ein zweiter Klick auf "Freigeben" darf
 * keinen zweiten Partner erzeugen.
 *
 * ADMIN ONLY. Der Aufrufer muss ein gültiges JWT mitschicken; die Adresse
 * darin muss die Plattform-Admin-Adresse sein. Ohne diese Prüfung könnte jeder
 * mit dem öffentlichen Schlüssel Partner anlegen.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://cosmos-candles.com";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function secret(db: ReturnType<typeof admin>, key: string): Promise<string> {
  const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return String(data?.value ?? Deno.env.get(key) ?? "");
}

/**
 * Kennungen, die es schon als Route gibt.
 *
 * admin-tenants prueft dagegen — dieser Weg nicht. Wird ein Partner "Signals"
 * oder "Login" genannt, bekam er cosmos-candles.com/signals als Werbelink,
 * und dort liegt die App-Route. Sein Link fuehrte also nie auf seine Seite,
 * und er haette es erst gemerkt, wenn Besucher sich wundern.
 *
 * Bewusst eine Kopie der Liste aus src/lib/tenants.ts: eine Edge-Funktion kann
 * nicht aus dem Frontend importieren. Kommt eine Route dazu, gehoert sie an
 * beide Stellen.
 */
const RESERVED_SLUGS = new Set([
  "admin", "partner", "partner-programm", "partner-program", "login", "signals", "lessons",
  "tools", "tier", "unlocks", "notifications", "settings", "t", "api", "assets", "hegemony",
  "auth", "dashboard", "registrieren", "willkommen", "signup", "welcome", "reset-password",
  "impressum", "datenschutz",
]);

/** "Zeko Global" → "zeko-global". Kollisionen bekommen eine Zahl angehängt. */
function slugify(s: string): string {
  return (s || "partner")
    .toLowerCase()
    .replace(/[äàáâ]/g, "a").replace(/[öòóô]/g, "o").replace(/[üùúû]/g, "u").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "partner";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const db = admin();

  // ── Wer ruft? Nur der Plattform-Admin darf Partner anlegen. ────────────────
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const { data: userRes } = await db.auth.getUser(jwt);
  const callerEmail = (userRes?.user?.email ?? "").toLowerCase();
  const adminEmail = (await secret(db, "ADMIN_EMAIL")) || "kontakt@momentumlabs.at";
  const isAdmin = !!callerEmail && callerEmail === adminEmail.toLowerCase();
  // Mitarbeiter aus dem Team-Bereich duerfen ebenfalls freigeben — die Tabelle
  // pflegt nur der Admin, also bleibt die Entscheidung, WER das darf, bei ihm.
  let isStaff = false;
  if (!isAdmin && callerEmail) {
    const { data: st } = await db.from("staff_members")
      .select("email").eq("active", true).ilike("email", callerEmail).maybeSingle();
    isStaff = !!st;
  }
  if (!callerEmail || (!isAdmin && !isStaff)) {
    return json({ error: "unauthorized" }, 403);
  }

  let body: { application_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  if (!body.application_id) return json({ error: "application_id required" }, 400);

  const { data: app } = await db
    .from("partner_applications")
    .select("id, name, email, phone, channel, reach, niche, status")
    .eq("id", body.application_id)
    .maybeSingle();
  if (!app) return json({ error: "application not found" }, 404);
  if (!app.email) return json({ error: "application has no email" }, 400);

  // ── 1. Login anlegen — OHNE Supabases Mailer ──────────────────────────────
  //
  // inviteUserByEmail waere der naheliegende Weg, verschickt die Einladung aber
  // ueber Supabases eingebauten Mailer, und der ist hart limitiert: nach ein
  // paar Mails im selben Zeitfenster antwortet er "email rate limit exceeded"
  // und die Freigabe scheitert komplett. Beim Testen ist genau das passiert,
  // nachdem am selben Tag ein paar Passwort-Resets rausgingen.
  //
  // Also: Nutzer still anlegen, den Einladungslink selbst erzeugen und ueber
  // unseren eigenen Versand schicken — derselbe Weg, den password-reset schon
  // geht, und aus demselben Grund.
  let userId: string | null = null;
  const created = await db.auth.admin.createUser({
    email: app.email,
    email_confirm: true,          // kein Bestaetigungsmail von Supabase
  });
  if (created.data?.user?.id) {
    userId = created.data.user.id;
  } else {
    // Schon registriert (z. B. bereits Mitglied) → vorhandenen Nutzer suchen.
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === app.email.toLowerCase());
    userId = found?.id ?? null;
    if (!userId) return json({ error: `could not create login: ${created.error?.message}` }, 502);
  }

  // Link, ueber den er sein Passwort selbst setzt. Wir erzeugen nie eins und
  // sehen keins.
  let inviteUrl = `${SITE_URL}/login`;
  try {
    const link = await db.auth.admin.generateLink({
      type: "recovery",
      email: app.email,
      // Auf die Passwort-Seite, NICHT direkt ins Portal: der Recovery-Link
      // loggt zwar ein, aber ohne gesetztes Passwort ist der zweite Besuch
      // eine verschlossene Tuer. ?next= schickt ihn danach ins Portal.
      options: { redirectTo: `${SITE_URL}/reset-password?next=/partner` },
    });
    const action = (link.data?.properties as { action_link?: string } | undefined)?.action_link;
    if (action) inviteUrl = action;
  } catch (e) {
    console.error("[partner-approve] generateLink failed:", e);
  }

  // ── 2. Marke ──────────────────────────────────────────────────────────────
  // Bereits vergebener Slug bekommt ein Suffix — zwei Partner mit gleichem
  // Namen duerfen sich nicht gegenseitig ueberschreiben.
  const base = slugify(app.channel || app.name || "partner");
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await db.from("tenants").select("slug").eq("slug", slug).maybeSingle();
    // Eine belegte Route zaehlt wie eine belegte Kennung: weiterzaehlen.
    if (!taken && !RESERVED_SLUGS.has(slug)) break;
    slug = `${base}-${i}`;
  }

  const { data: existing } = await db
    .from("tenants").select("slug").eq("owner_user_id", userId).maybeSingle();

  if (existing) {
    slug = existing.slug;                       // idempotent: schon freigegeben
  } else {
    const { error: tErr } = await db.from("tenants").insert({
      slug,
      name: app.name || slug,
      active: true,
      owner_user_id: userId,
      partner_rate: 6.0,
      partner_rate_unit: "usd_per_lot",
      // Kanäle und Broker-Link kommen im Onboarding dazu — bewusst leer, damit
      // nichts an einen halb eingerichteten Partner ausgeliefert wird.
      telegram_channel_id: null,
      telegram_info_channel_id: null,
      broker_affiliate_url: null,
    });
    if (tErr) return json({ error: `tenant: ${tErr.message}` }, 502);
  }

  // ── 3. Bewerbung schliessen ───────────────────────────────────────────────
  await db.from("partner_applications")
    .update({ status: "approved", tenant_slug: slug })
    .eq("id", app.id);

  // ── 4. E-Mail. Scheitert sie, ist der Partner trotzdem angelegt — deshalb
  //      ganz am Ende und ohne den Vorgang abzubrechen. ──────────────────────
  let mailed = false;
  try {
    const sendSecret = await secret(db, "SEND_SECRET");
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sendSecret ? { "x-send-secret": sendSecret } : {}),
      },
      body: JSON.stringify({
        kind: "partner_approved",
        to: app.email,
        firstName: (app.name || "").split(" ")[0],
        dashboardUrl: `${SITE_URL}/partner`,
        resetUrl: inviteUrl,
      }),
    });
    mailed = res.ok;
    if (!res.ok) console.error("[partner-approve] mail failed:", res.status, await res.text());
  } catch (e) {
    console.error("[partner-approve] mail threw:", e);
  }

  return json({ ok: true, slug, user_id: userId, mailed });
});
