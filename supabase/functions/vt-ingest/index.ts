/**
 * vt-ingest — nimmt die aus dem VT-Backoffice ausgelesenen Kunden entgegen.
 *
 * VT Markets hat fuer Partner keine Schnittstelle, ueber die man Einzahlungen
 * abfragen koennte. Ihr eigener Kontakt hat als einzigen Weg das Auslesen des
 * Partner-Backoffice genannt: von Hand anmelden, Captcha loesen, danach darf
 * ein Programm die Seiten der angemeldeten Sitzung mitlesen. Das Auslesen
 * laeuft deshalb ausserhalb (~/vt-sync, Playwright); hier kommt nur an, was es
 * gefunden hat.
 *
 * WARUM DAS AUSLESEN NICHT DEN DIENSTSCHLUESSEL BEKOMMT
 * Es laeuft auf Diegos Rechner neben einem angemeldeten Browser. Ein
 * Datenbankschluessel mit vollen Rechten hat dort nichts verloren. Stattdessen
 * schickt es die Zeilen hierher und weist sich mit einem eigenen Geheimnis aus,
 * das nur fuer diesen einen Zweck gilt und jederzeit ersetzt werden kann —
 * derselbe Aufbau wie beim Telegram-Reader und seinem Webhook.
 *
 * DIE SPERRKLINKE LIEGT IN DER DATENBANK, NICHT HIER
 * vt_ingest_clients (Migration 047) hebt net_deposit nur an. Wer einmal eine
 * Stufe erreicht hat, verliert sie nicht, weil eine Portalseite halb geladen
 * war. Diese Funktion validiert und reicht durch; sie rechnet nichts aus.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

interface Row {
  client_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  country?: string | null;
  net_deposit?: number | null;
  first_deposit_amount_usd?: number | null;
  current_balance_usd?: number | null;
  volume_lots?: number | null;
  base_currency?: string | null;
  campaign_source?: string | null;
}

/** Zeitgleicher Vergleich, damit die Laufzeit nichts ueber das Geheimnis verraet. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: sec } = await db.from("app_secrets").select("value").eq("key", "VT_SYNC_SECRET").maybeSingle();
  const expected = String(sec?.value ?? Deno.env.get("VT_SYNC_SECRET") ?? "");
  // Ohne hinterlegtes Geheimnis ist die Funktion zu, nicht offen. Ein fehlender
  // Schluessel darf nie "jeder darf" bedeuten.
  if (!expected) return json({ error: "VT_SYNC_SECRET ist nicht hinterlegt" }, 503);
  if (!sameSecret(req.headers.get("x-sync-secret") ?? "", expected)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { clients?: Row[] };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const raw = (body.clients ?? []).filter((r) => (r.email ?? "").includes("@"));

  // ── Waehrung ──────────────────────────────────────────────────────────────
  // VT fuehrt jedes Konto in der Waehrung des Kunden. Bei den bestehenden steht
  // dort EUR, nicht USD — und die Stufenschwellen (100 / 2000 / 50000) werden
  // gegen USD verglichen. Eine EUR-Zahl ungerechnet einzusetzen waere ein
  // stiller Fehler in der Groessenordnung von 8 %.
  //
  // Der Kurs steht in app_secrets als FX_EUR_USD. Fehlt er, wird mit 1.0
  // gerechnet, und das ist Absicht: EUR ist mehr wert als USD, also ist eine
  // EUR-Zahl als USD gelesen immer ZU KLEIN. Der Fehler geht damit in die
  // Richtung "schaltet spaeter frei", nie in Richtung "schaltet eine Stufe
  // frei, die niemand bezahlt hat".
  const rates: Record<string, number> = { USD: 1 };
  for (const cur of new Set(raw.map((r) => (r.base_currency ?? "USD").toUpperCase()))) {
    if (cur === "USD") continue;
    const { data } = await db.from("app_secrets").select("value").eq("key", `FX_${cur}_USD`).maybeSingle();
    const rate = Number(data?.value ?? 0);
    if (!rate || !Number.isFinite(rate)) {
      console.warn(`[vt-ingest] Kein Kurs FX_${cur}_USD hinterlegt — rechne 1.0 (konservativ).`);
      rates[cur] = 1;
    } else {
      rates[cur] = rate;
    }
  }

  const conv = (v: number | null | undefined, cur: string) =>
    v == null || !Number.isFinite(Number(v)) ? null : Number(v) * (rates[cur] ?? 1);

  const rows = raw.map((r) => {
    const cur = (r.base_currency ?? "USD").toUpperCase();
    return {
      ...r,
      net_deposit: conv(r.net_deposit, cur),
      first_deposit_amount_usd: conv(r.first_deposit_amount_usd, cur),
      current_balance_usd: conv(r.current_balance_usd, cur),
    };
  });
  // Ein leerer Stapel ist ein Fehler, keine Nachricht. Wenn das Auslesen nichts
  // gefunden hat, ist die Sitzung tot oder die Seite hat sich geaendert — und
  // beides muss auffallen, statt als "0 Kunden, alles gut" durchzugehen.
  if (!rows.length) return json({ error: "keine verwertbaren Zeilen empfangen" }, 400);

  const { data, error } = await db.rpc("vt_ingest_clients", { p_rows: rows });
  if (error) {
    console.error("[vt-ingest] vt_ingest_clients:", error.message);
    return json({ error: error.message }, 500);
  }
  const stat = Array.isArray(data) ? data[0] : data;

  // Erst jetzt die Verrechnung: Mitglied zuordnen, Stufe setzen, Partner
  // gutschreiben. Dieselbe Funktion, die hero-sync am Ende ruft.
  const { data: rollup, error: rErr } = await db.rpc("apply_broker_rollup");
  if (rErr) console.error("[vt-ingest] apply_broker_rollup:", rErr.message);

  return json({ ok: true, received: rows.length, ...stat, rollup: rollup ?? null });
});
