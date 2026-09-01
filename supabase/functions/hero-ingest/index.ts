/**
 * hero-ingest — nimmt die HeroFX-Kunden entgegen, die von Diegos Rechner
 * geholt wurden.
 *
 * WARUM ES DAS BRAUCHT
 * Die Funktion `hero-sync` ruft Heros API vom Server aus ab. Seit dem 27.08.
 * beantwortet deren Cloudflare jeden Aufruf aus einem Rechenzentrum mit einer
 * Sperrseite — nachgemessen mit vollen Browser-Headern, von einer fabrikneuen
 * IP und ganz ohne Token. Aus einem echten, angemeldeten Browser kommen
 * dieselben Aufrufe mit 200 zurueck.
 *
 * Also derselbe Aufbau wie bei VT Markets: das Holen laeuft draussen
 * (~/hero-sync, angedockt an Diegos laufendes Chrome), hier kommt nur an, was
 * es gefunden hat. `hero-sync` bleibt liegen — sobald Hero unsere Server-IP
 * durchlaesst, ist der automatische Weg wieder da und dieser hier nur noch
 * Reserve.
 *
 * WARUM DAS AUSLESEN KEINEN DIENSTSCHLUESSEL BEKOMMT
 * Es laeuft auf einem Arbeitsrechner neben einem angemeldeten Browser. Ein
 * Datenbankschluessel mit vollen Rechten hat dort nichts verloren. Es weist
 * sich mit einem eigenen Geheimnis aus — derselbe Aufbau wie vt-ingest.
 *
 * DAS GEHEIMNIS
 * HERO_SYNC_SECRET, falls hinterlegt; sonst VT_SYNC_SECRET. Beide Skripte
 * laufen auf demselben Rechner, und ein zweites Geheimnis waere nur ein
 * weiterer Einrichtungsschritt ohne Sicherheitsgewinn. Wer sie trennen will,
 * legt HERO_SYNC_SECRET an — dann gilt nur noch das.
 *
 * DIE SPERRKLINKE LIEGT IN DER DATENBANK, NICHT HIER
 * hero_ingest_clients (Migration 069) hebt net_deposit nur an. Diese Funktion
 * prueft und reicht durch; sie rechnet nichts aus.
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
  client_type?: string | null;
  direct_ib_id?: string | null;
  utm_campaign?: string | null;
  registration_date?: string | null;
  current_balance_usd?: number | null;
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

  const pick = async (key: string) => {
    const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
    return String(data?.value ?? Deno.env.get(key) ?? "");
  };
  const expected = (await pick("HERO_SYNC_SECRET")) || (await pick("VT_SYNC_SECRET"));
  // Ohne hinterlegtes Geheimnis ist die Funktion ZU, nicht offen. Ein fehlender
  // Schluessel darf nie "jeder darf" bedeuten.
  if (!expected) return json({ error: "no sync secret configured" }, 503);
  if (!sameSecret(req.headers.get("x-sync-secret") ?? "", expected)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { clients?: Row[] };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const rows = (body.clients ?? []).filter((r) => (r.email ?? "").includes("@"));

  // Ein leerer Stapel ist ein Fehler, keine Nachricht. Hat das Auslesen nichts
  // gefunden, ist die Sitzung tot oder die API hat sich geaendert — beides muss
  // auffallen, statt als "0 Kunden, alles gut" durchzugehen.
  if (!rows.length) return json({ error: "no usable rows received" }, 400);

  const { data, error } = await db.rpc("hero_ingest_clients", { p_rows: rows });
  if (error) return json({ error: `ingest failed: ${error.message}` }, 500);

  // Erst jetzt zusammenrechnen: der Rollup verbindet Broker-Kunde und Mitglied
  // und bucht die Einzahlung. Scheitert er, sind die Kundendaten trotzdem
  // gespeichert — deshalb hier und nicht davor.
  const { data: rollup, error: rErr } = await db.rpc("apply_broker_rollup");
  if (rErr) console.error("[hero-ingest] rollup:", rErr.message);

  return json({
    ok: true,
    seen: data?.[0]?.seen ?? rows.length,
    raised: data?.[0]?.raised ?? 0,
    rollup: rollup ?? null,
  });
});
