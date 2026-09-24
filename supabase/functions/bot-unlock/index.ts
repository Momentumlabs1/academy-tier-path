/**
 * bot-unlock — aus einem Telegram-Lead wird ein Academy-Konto.
 *
 * DER NEUE ABLAUF (Ansage 05.09.): niemand registriert sich mehr vorne. Der
 * Besucher geht von der Landingpage direkt nach Telegram, redet dort mit dem
 * Bot, zahlt beim Broker ein — und ERST DANN entsteht sein Konto, automatisch.
 * Er wird genau einmal gefragt: mit welcher E-Mail hast du beim Broker
 * registriert? Diese eine Antwort erledigt beides — sie ist der Schluessel, mit
 * dem die Einzahlung ihm zugeordnet wird, UND die Adresse, an die sein Zugang
 * geht.
 *
 * WARUM DAS HIER LIEGT UND NICHT IM BOT
 * Der Bot hat den Service-Key und koennte alles selbst. Aber hier haengen drei
 * Dinge zusammen, die einzeln nichts wert sind: das Auth-Konto, die
 * Partner-Zuordnung und der Anmeldelink. Laufen die auseinander — Konto ohne
 * Partner, Partner ohne Link —, merkt es niemand, bis der Partner nach seiner
 * Provision fragt. In einer Funktion im Repo sind sie zusammen les- und
 * pruefbar; verteilt auf Python-Zeilen auf einem Server sind sie es nicht.
 *
 * DIE PARTNER-ZUORDNUNG IST DER EIGENTLICHE GRUND FUER DIESE FUNKTION.
 * `members.referred_by_tenant` ist nach dem Anlegen gesperrt (024). Wer hier
 * ohne Partner angelegt wird, gehoert fuer immer dem Haus. Deshalb kommt der
 * Partner aus dem Lead — dorthin hat ihn der Beitritts-Waechter geschrieben,
 * als der Kunde ueber den Einladungslink des Partners in den Kanal kam.
 *
 * POST { telegram_user_id, email }
 * Antwort:
 *   { status: "angelegt"  , tier, deposit }  Konto neu, Link verschickt
 *   { status: "vorhanden" , tier, deposit }  Konto gab es schon, Link verschickt
 *   { status: "nicht_gefunden" }             Adresse steht nicht in unseren
 *                                            Broker-Daten — der Bot sagt dann,
 *                                            dass es noch dauert, statt zu
 *                                            schweigen. Siehe unten.
 *
 * Auth: Header x-bot-secret == app_secrets.BOT_UNLOCK_SECRET.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Nur der Bot. Ein offener Endpunkt hier hiesse: wer eine fremde
  // Broker-Adresse kennt, laesst sich ein Konto darauf anlegen.
  //
  // Ein EIGENES Geheimnis statt eines Vergleichs mit dem Service-Key: den gibt
  // es in zwei gueltigen Formaten (Legacy-JWT und sb_secret_...), und zwei
  // gueltige Schluessel sind nicht derselbe String. Am 05.09. genau daran
  // gescheitert — 403, obwohl der Aufrufer berechtigt war.
  //
  // Der Bot holt sich den Wert selbst aus app_secrets; er steht in keiner .env
  // und in keinem Repo.
  const { data: geheim } = await db
    .from("app_secrets").select("value").eq("key", "BOT_UNLOCK_SECRET").maybeSingle();
  const erwartet = (geheim?.value ?? "") as string;
  if (!erwartet || req.headers.get("x-bot-secret") !== erwartet) {
    return json({ error: "forbidden" }, 403);
  }

  let body: { telegram_user_id?: number; email?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const email = String(body.email ?? "").trim().toLowerCase();
  const tgId = Number(body.telegram_user_id ?? 0);
  if (!email.includes("@")) return json({ error: "email fehlt" }, 400);

  // ── 1. Steht die Adresse ueberhaupt in unseren Broker-Daten? ──────────────
  //
  // Ohne diese Pruefung koennte jeder irgendeine Adresse nennen und bekaeme ein
  // Konto — und der Abgleich wuerde spaeter fremde Einzahlungen darauf buchen.
  //
  // ilike statt =: bei Hero kommen Adressen mal gross, mal klein zurueck.
  const { data: klient } = await db
    .from("broker_clients")
    .select("client_id, email, net_deposit, current_balance_usd")
    .ilike("email", email)
    .maybeSingle();

  if (!klient) {
    // KEIN Fehler, sondern eine Tatsache mit zwei moeglichen Ursachen: die
    // Adresse ist falsch, ODER unser Abgleich hat sie noch nicht gesehen (der
    // laeuft ueber einen Browser auf Diegos Rechner — ist der aus, steht er).
    // Der Bot muss das dem Kunden sagen koennen, statt ihn im Dunkeln zu
    // lassen: ein Kunde, der eingezahlt hat und nichts hoert, denkt, er wurde
    // abgezogen.
    return json({ status: "nicht_gefunden" });
  }

  // ── 2. Der Partner, dem dieser Kunde gehoert ─────────────────────────────
  let partner: string | null = null;
  let token: string | null = null;
  let marke: string | null = null;
  if (tgId) {
    const { data: lead } = await db
      .from("setter_leads")
      .select("partner_slug, tenant_slug, token")
      .eq("telegram_user_id", tgId)
      .maybeSingle();
    partner = lead?.partner_slug ?? lead?.tenant_slug ?? null;
    token = lead?.token ?? null;
    marke = lead?.tenant_slug ?? null;
  }

  // Eigene Marken (19.09., SAIF) haben eine eigene Akademie auf ihrer Website.
  // Der Anmeldelink muss DORTHIN fuehren, sonst landet ein SAIF-Kunde auf
  // cosmos-candles.com. Massgeblich ist der Bot, mit dem der Lead geredet hat
  // (tenant_slug), nicht ein Unterpartner. Ohne academy_url: wie bisher.
  let akademie: string | null = null;
  if (marke && marke !== "cosmos-candles") {
    const { data: t } = await db.from("tenants").select("config").eq("slug", marke).maybeSingle();
    const url = (t?.config as Record<string, unknown> | null)?.academy_url;
    if (typeof url === "string" && url.startsWith("https://")) akademie = url;
  }

  // ── 3. Konto anlegen, falls es keins gibt ────────────────────────────────
  const { data: schon } = await db
    .from("members").select("id, tier, deposit").eq("email", email).maybeSingle();

  let status: "angelegt" | "vorhanden" = schon ? "vorhanden" : "angelegt";

  if (!schon) {
    // Ohne Passwort. Der Kunde bekommt einen Anmeldelink — ein Passwort, das
    // er sich waehrend eines Telegram-Gespraechs ausdenken soll, ist genau die
    // Huerde, die wir gerade abgeschafft haben.
    //
    // email_confirm: true, weil die Adresse bereits belegt ist: sie steht beim
    // Broker auf einem Konto, auf das er eingezahlt hat. Eine zweite
    // Bestaetigungsmail waere eine Huerde ohne Erkenntnisgewinn.
    const { error: e } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        app: "academy",                       // ohne das legt der Trigger nichts an
        needs_password: true,                 // 18.09.: die App fragt zuerst nach dem eigenen Passwort
        referred_by_tenant: partner ?? "",    // 024: danach nicht mehr aenderbar
        ...(token ? { setter_token: token } : {}),
      },
    });
    if (e) {
      // "already registered" heisst: Auth-Konto ja, members-Zeile nein. Kein
      // Abbruch — weiter unten wird sie ohnehin nachgezogen.
      if (!/already/i.test(e.message)) return json({ error: e.message }, 500);
      status = "vorhanden";
    }
  }

  // ── 4. Die Broker-Adresse festschreiben und abrechnen ────────────────────
  //
  // broker_email ist die Spalte, auf die apply_broker_rollup matcht. Sie ist
  // gegen das Mitglied gesperrt (Waechter) — hier schreiben wir mit der
  // Service-Rolle, an der der Waechter absichtlich vorbeilaeuft.
  await db.from("members").update({ broker_email: email }).eq("email", email);
  await db.rpc("apply_broker_rollup");

  const { data: mitglied } = await db
    .from("members").select("id, tier, deposit").eq("email", email).maybeSingle();

  // ── 5. Der Anmeldelink ───────────────────────────────────────────────────
  const { data: link, error: linkFehler } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
    // Muss in der Redirect-Allowlist (Auth → URL Configuration) stehen, sonst
    // ersetzt Supabase das Ziel still durch die Site URL.
    ...(akademie ? { options: { redirectTo: akademie } } : {}),
  });
  if (linkFehler) return json({ error: `Link: ${linkFehler.message}` }, 500);

  const ziel = (link as { properties?: { action_link?: string } })?.properties?.action_link;
  // Keine Mail mehr von hier (18.09.): sie behauptete "Your deposit is through",
  // sobald jemand seine Broker-Mail nannte — auch ohne Einzahlung. Die
  // Zugangs-Mail kommt jetzt bei der echten Freischaltung (Bot grant_vip ->
  // member-freischalten). Der Link hier geht weiter in den Chat.

  return json({
    status,
    tier: mitglied?.tier ?? null,
    deposit: mitglied?.deposit ?? null,
    partner,
    login_link: ziel ?? null,   // der Bot schickt ihn auch im Chat — nicht jeder liest Mails
  });
});
