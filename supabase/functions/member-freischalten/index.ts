/**
 * member-freischalten — jemanden freischalten und ihm alles per Mail schicken.
 *
 * Ansage Diego 18.09.: "wenn ich freischalten druecke, soll er eine E-Mail
 * bekommen mit Zugang zur Signalgruppe und zur Akademie — dass ich ihm das
 * nicht erklaeren muss. So soll es dann auch mit einem Kunden laufen." Und:
 * das Konto wird angelegt, der Kunde waehlt sich aber selbst ein Passwort,
 * bevor das Willkommen kommt.
 *
 * Zwei Aufrufer, ein Ablauf:
 *   - Admin-Bereich (/admin/members, Knopf "Freischalten"): Bearer-JWT von
 *     kontakt@momentumlabs.at. Optional mit Betrag -> Stufe (wie "Manual
 *     unlock"), sonst nur Zugang + Mail.
 *   - Setter-Bot nach erkannter Einzahlung: x-bot-secret == BOT_UNLOCK_SECRET,
 *     ohne Betrag (die Stufe kommt dort aus dem Broker-Abgleich).
 *
 * Was passiert:
 *   1. Auth-Konto: gibt es keins, wird es angelegt (bestaetigt, OHNE Passwort,
 *      needs_password = true). Gibt es eins, das sich nie angemeldet hat,
 *      bekommt es needs_password = true — die App fragt dann zuerst danach.
 *   2. members-Zeile anlegen, falls sie fehlt (z. B. Partner-Konten, die der
 *      Trigger bewusst ueberspringt).
 *   3. Mit Betrag: deposit/tier setzen + Beleg in deposit_events + audit_log —
 *      genau wie der "Manual unlock"-Dialog, damit der naechste Abgleich die
 *      Stufe nicht wieder zuruecknimmt.
 *   4. Persoenlicher Einladungslink in die VIP-Gruppe (einmal nutzbar).
 *   5. Zugangs-Link /zugang?t=… (7 Tage), der beim Klick einen frischen
 *      Anmeldelink mintet (Supabase-Links verfallen nach 1 h).
 *   6. Mail "access_granted" ueber send-email + Zeile in die Admin-Gruppe.
 *
 * POST { email, amount?, note?, firstName?, dryRun? }
 * dryRun: nichts wird angelegt, gesendet oder geschrieben — die Antwort zeigt,
 * was passieren wuerde, inklusive der fertigen Mail.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type User } from "jsr:@supabase/supabase-js@2";
import { buildEmail } from "../send-email/_templates.ts";

const SITE = "https://cosmos-candles.com";
const ADMIN_EMAIL = "kontakt@momentumlabs.at";
const TENANT = "cosmos-candles";

// Dieselben Schwellen wie src/lib/academy-data.ts (TIERS).
const TIERS = [
  { key: "elite", name: "Elite", min: 50_000 },
  { key: "operator", name: "Operator", min: 2_000 },
  { key: "foundation", name: "Foundation", min: 100 },
];
const tierFor = (d: number) => TIERS.find((t) => d >= t.min) ?? null;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function zufall(n = 24) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows } = await db.from("app_secrets").select("key, value")
    .in("key", ["BOT_UNLOCK_SECRET", "TELEGRAM_BOT_TOKEN", "SEND_SECRET"]);
  const secret = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value as string]));

  // ── Wer ruft? Diego (Admin-JWT) oder der Bot (eigenes Geheimnis) ─────────
  let aufrufer: "admin" | "bot" | null = null;
  const botHeader = req.headers.get("x-bot-secret");
  if (botHeader && secret.BOT_UNLOCK_SECRET && botHeader === secret.BOT_UNLOCK_SECRET) {
    aufrufer = "bot";
  } else {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data } = await db.auth.getUser(jwt);
      if (data.user?.email?.toLowerCase() === ADMIN_EMAIL) aufrufer = "admin";
    }
  }
  if (!aufrufer) return json({ error: "forbidden" }, 403);

  let body: { email?: string; amount?: number | string; note?: string; firstName?: string; dryRun?: boolean };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-Mail ungueltig" }, 400);
  const amount = Number(String(body.amount ?? "0").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return json({ error: "Betrag ungueltig" }, 400);
  const dry = Boolean(body.dryRun);
  const schritte: string[] = [];

  // ── 1. Auth-Konto ────────────────────────────────────────────────────────
  // Es gibt keine "Nutzer per Mail"-Abfrage in der Admin-API; die Liste ist
  // klein genug, um sie seitenweise zu durchsuchen.
  let user: User | null = null;
  for (let page = 1; page <= 50 && !user; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: `Nutzerliste: ${error.message}` }, 500);
    user = data.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
    if (data.users.length < 1000) break;
  }
  if (!user) {
    schritte.push("Konto neu anlegen (ohne Passwort)");
    if (!dry) {
      const { data, error } = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { app: "academy", needs_password: true, ...(body.firstName ? { name: body.firstName } : {}) },
      });
      if (error || !data.user) return json({ error: `Konto: ${error?.message}` }, 500);
      user = data.user;
    }
  } else if (!user.last_sign_in_at) {
    schritte.push("vorhandenes Konto, nie angemeldet -> fragt beim ersten Mal nach dem Passwort");
    if (!dry) {
      await db.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata ?? {}), needs_password: true },
      });
    }
  } else {
    schritte.push("vorhandenes Konto mit Anmeldung — Passwort bleibt, wie es ist");
  }

  // ── 2. members-Zeile ─────────────────────────────────────────────────────
  let { data: mitglied } = await db.from("members")
    .select("id, email, tier, deposit").ilike("email", email).maybeSingle();
  if (!mitglied) {
    schritte.push("members-Zeile anlegen");
    if (!dry && user) {
      const { data, error } = await db.from("members").insert({
        auth_user_id: user.id, email, name: body.firstName || email.split("@")[0], active: false,
      }).select("id, email, tier, deposit").single();
      if (error) return json({ error: `members: ${error.message}` }, 500);
      mitglied = data;
    }
  }

  // ── 3. Stufe (nur mit Betrag, nur nach oben) ─────────────────────────────
  const vorher = Number(mitglied?.deposit ?? 0);
  const ziel = amount > vorher ? tierFor(amount) : null;
  if (amount > vorher) {
    schritte.push(`Stufe ${ziel?.name ?? "keine"} (${amount} €, manuell)`);
    if (!dry && mitglied) {
      const note = (body.note ?? "").trim() || "Manual unlock — comped account, no real deposit";
      const { error: e1 } = await db.from("members").update({
        deposit: amount, tier: ziel?.key ?? null, active: amount > 0,
        activity_status: "active", updated_at: new Date().toISOString(),
      }).eq("id", mitglied.id);
      if (e1) return json({ error: `Stufe: ${e1.message}` }, 500);
      const { error: e2 } = await db.from("deposit_events").insert({
        member_id: mitglied.id, amount, type: "deposit",
        tier_before: mitglied.tier ?? null, tier_after: ziel?.key ?? null, note,
      });
      if (e2) return json({ error: `Beleg: ${e2.message}` }, 500);
      await db.from("audit_log").insert({
        action: "tier_changed", target: email,
        detail: `Freischalten (${aufrufer}) → ${amount} € (${ziel?.name ?? "No tier"}). ${note}`,
      });
    }
  }

  // ── 4. VIP-Einladung (einmal nutzbar) ────────────────────────────────────
  let vipUrl: string | null = null;
  const { data: tenant } = await db.from("tenants").select("telegram_channel_id").eq("slug", TENANT).maybeSingle();
  if (tenant?.telegram_channel_id && secret.TELEGRAM_BOT_TOKEN) {
    schritte.push("persoenlicher VIP-Einladungslink");
    if (!dry) {
      const r = await fetch(`https://api.telegram.org/bot${secret.TELEGRAM_BOT_TOKEN}/createChatInviteLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tenant.telegram_channel_id, member_limit: 1,
          name: `mail-${email.split("@")[0]}`.slice(0, 32),
        }),
      }).then((x) => x.json()).catch((e) => ({ ok: false, description: String(e) }));
      if (r.ok) vipUrl = r.result.invite_link;
      else schritte.push(`VIP-Link fehlgeschlagen: ${r.description} — Mail geht ohne VIP-Knopf`);
    } else {
      vipUrl = "https://t.me/+PROBE";
    }
  }

  // ── 5. Zugangs-Link (7 Tage) ─────────────────────────────────────────────
  const token = zufall();
  const accessUrl = `${SITE}/zugang?t=${token}`;
  if (!dry) {
    const { error } = await db.from("access_invites").insert({ token, email, created_by: aufrufer });
    if (error) return json({ error: `Zugangs-Link: ${error.message}` }, 500);
  }

  // ── 6. Mail + Admin-Gruppe ───────────────────────────────────────────────
  const mailInput = { kind: "access_granted" as const, to: email, firstName: body.firstName, vipUrl: vipUrl ?? undefined, accessUrl };
  if (dry) {
    const built = buildEmail(mailInput);
    return json({ ok: true, dryRun: true, email, aufrufer, schritte, vipUrl, accessUrl, mail: built });
  }
  const mail = await fetch(`${url}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      ...(secret.SEND_SECRET ? { "x-send-secret": secret.SEND_SECRET } : {}),
    },
    body: JSON.stringify(mailInput),
  }).then((x) => x.json()).catch((e) => ({ ok: false, error: String(e) }));

  await db.rpc("admin_alert", {
    p_text: `🔓 Freigeschaltet (${aufrufer === "bot" ? "Bot nach Einzahlung" : "Admin"})\n${email}` +
      (ziel ? ` · ${ziel.name}` : "") + `\nMail: ${mail?.ok ? "raus ✅" : "FEHLER " + (mail?.error ?? "")}`,
  });

  return json({ ok: Boolean(mail?.ok), email, aufrufer, schritte, vipUrl, accessUrl, mail });
});
