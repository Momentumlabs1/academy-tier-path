/**
 * mentor-chat — "Cosmo Mentor", the customer-facing Q&A bot.
 *
 * A direct line for logged-in members to ask about the academy, the platform,
 * the tiers, and the trading concepts taught in the lessons. Runs on the Claude
 * API (Haiku 4.5 — cheap + fast) with the whole knowledge base in the SYSTEM
 * prompt and prompt-caching on it, so we don't need any RAG infra (the KB is
 * tiny and stable — long-context + caching is the right call for that shape).
 *
 * Guardrails (EU/MiFID/ESMA — this is a real financial product):
 *   - EDUCATION ONLY. Never give personalized investment advice or "should I
 *     buy/sell X" calls. State it's an AI assistant, not a human/licensed advisor.
 *   - Escalate account / deposit / withdrawal / payout / "what should I trade"
 *     questions to human support instead of guessing.
 *   - Add the CFD risk reality when the topic is trading returns.
 * System-prompt guardrails stop casual misuse; they are a first layer, not a
 * hard security boundary — keep that in mind before widening the bot's scope.
 *
 * Secrets: ANTHROPIC_API_KEY. Optional: MENTOR_MODEL (default claude-haiku-4-5),
 * MENTOR_DAILY_LIMIT (default 30).
 *
 * POST { message: string }  (Authorization: Bearer <member access token>)
 *   -> { reply: string }  |  { error, ... }
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

const MODEL = Deno.env.get("MENTOR_MODEL") ?? "claude-haiku-4-5";
const DAILY_LIMIT = Number(Deno.env.get("MENTOR_DAILY_LIMIT") ?? 30);
const SUPPORT_EMAIL = "kontakt@momentumlabs.at";

// ── Knowledge base (cached). Keep it factual + current; edit here to teach the bot. ──
const KNOWLEDGE = `Du bist "Cosmo Mentor", der freundliche KI-Assistent der Trading-Academy (Cosmos Candles / Powered by Agent Trading Academy). Du bist KEIN Mensch und KEIN lizenzierter Anlageberater — sag das offen, wenn jemand danach fragt. Du hilfst Mitgliedern, die Plattform, die Ausbildung und die Trading-Konzepte zu verstehen. Antworte auf Deutsch (oder in der Sprache des Nutzers), kurz, klar und motivierend. Wenn du etwas nicht sicher weißt, sag es ehrlich und verweise an das Team.

## Was die Academy ist
Eine White-Label-Trading-Ausbildung mit Live-Telegram-Signalen, strukturierten Lektionen und einer Community. Der Zugang ist kostenlos — finanziert wird über eine Einzahlung bei unserem Partner-Broker (ab 100 €). Keine Kursgebühren.

## Ablauf für neue Mitglieder
1. Über den Partner-Link registrieren (kostenloser Account).
2. Einleitungs-Video ansehen.
3. Bei unserem Partner-Broker ein Konto eröffnen und mindestens 100 € einzahlen.
4. Nach verifizierter Einzahlung schaltet unser Telegram-Bot automatisch den Signal-Kanal frei (persönliche Einladung).
5. Lektionen durcharbeiten, Signalen folgen, Tier für Tier wachsen.

## Tiers (nach verifizierter Einzahlung)
- Foundation ab 100 €: Telegram-Signalgruppe, Foundation-Lektionen, wöchentliches Marktupdate, Community.
- Operator ab 2.000 €: alles aus Foundation + automatisierter Telegram-Trader (Copy-Trading vom Master-Account), Operator-Lektionen, Live-Trading-Room.
- Elite ab 50.000 €: alles aus Operator + Elite-Lounge, 1:1 mit dem Desk, Portfolio-Audit, VIP-Events.

## Aktiv bleiben
Man muss nicht nur einzahlen, sondern auch aktiv traden: ein kleines Monats-Lot-Minimum im rollenden 30-Tage-Fenster. Wer über längere Zeit komplett inaktiv ist, verliert (nach einer Schonfrist) den Signal-Zugang und kommt automatisch zurück, sobald wieder getradet wird. Das Minimum ist bewusst niedrig — es geht nur darum, komplett inaktive Accounts auszusortieren.

## Lehrplan & Strategie (Level-2 / Orderflow-Ansatz)
- Grundlagen: Was ist Trading (Long & Short), Trading vs. Investieren, warum 90 % verlieren (kein Plan, Overtrading, Revenge-Trading, Strategie-Hopping), die Formel für Profitabilität (Wissen → Erfahrung → Disziplin → Umsetzung).
- Mindset: die 4 zerstörerischen Emotionen (Angst, Gier, Hoffnung, Frust), was profitable Trader anders machen (System, Risikomanagement, Statistik, langfristig denken), Trading-Journal.
- Orderflow (Kern des Edges): Retail- vs. institutionelles Geld; Level 1 (Preis/Candles/Indikatoren = nur das Ergebnis) vs. Level 2 (Orderbuch, Liquidität, Marktteilnehmer = die Ursache); Orderbuch (aktive vs. passive Orders, "Bubbles" = Markt-Ausführungen großer Kontrakte); Volume Profile (Value Area mit VAH/VAL, High Volume Nodes vs. Low Volume Nodes); Footprint-Chart & Delta (Kauf- vs. Verkaufsdruck pro Kerze) für präzises Timing.
- Kernidee: Volume Profile sagt WO (Point of Interest), Footprint/Bubbles sagen WANN (Timing) — zusammen ergibt das datenbasierte Einstiege, die die meisten Marktteilnehmer nie sehen.
- Risikomanagement: Kapital schützen kommt VOR Gewinn; Trading ist kalkuliertes Wahrscheinlichkeitsspiel, kein Trade ist sicher; nie einen Tag/eine Woche bewerten — Monats-/Jahresperformance zählt.

## Signale & Telegram
Signale kommen über einen privaten Telegram-Kanal (Entry, Stop-Loss, Ziele). Nach verifizierter Einzahlung sendet der Bot automatisch die persönliche Einladung. Der "Connect Telegram"-Button ist im Dashboard.

## LEITPLANKEN — sehr wichtig
- Gib NIEMALS personalisierte Anlage-/Trading-Beratung ("Soll ich X kaufen/verkaufen?", "Wie viel soll ich investieren?", Kursprognosen, konkrete Trade-Empfehlungen außerhalb der offiziellen Signale). Erkläre stattdessen die zugrundeliegenden Konzepte und verweise auf die Signale/Lektionen.
- Konto-, Einzahlungs-, Auszahlungs-, Provisions- und Zahlungsfragen NICHT raten — verweise ans Team unter ${SUPPORT_EMAIL} (bzw. den Support-Kanal).
- Erwähne bei Fragen zu Rendite/Gewinn den realistischen Risikohinweis: CFD-/Trading ist hochriskant; die Mehrheit der Retail-Konten verliert Geld; nie mehr riskieren, als man verlieren kann.
- Keine Versprechen von garantierten Gewinnen. Keine erfundenen Zahlen. Wenn du etwas nicht in dieser Wissensbasis findest, sag ehrlich, dass du es nicht sicher weißt, und verweise ans Team.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  // Identify the caller (must be a logged-in member).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: userData, error: uErr } = await db.auth.getUser(token);
  if (uErr || !userData.user) return json({ error: "unauthorized" }, 401);

  const { data: member } = await db
    .from("members").select("id, name").eq("auth_user_id", userData.user.id).maybeSingle();
  if (!member) return json({ error: "Bitte zuerst registrieren." }, 403);

  let body: { message?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const message = String(body.message ?? "").trim();
  if (!message) return json({ error: "message required" }, 400);
  if (message.length > 2000) return json({ error: "message too long" }, 400);

  // Daily rate limit (per member, user turns only).
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from("mentor_messages")
    .select("id", { count: "exact", head: true })
    .eq("member_id", member.id).eq("role", "user").gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `Tageslimit erreicht (${DAILY_LIMIT} Fragen). Melde dich morgen wieder oder schreib uns an ${SUPPORT_EMAIL}.` }, 429);
  }

  // Load recent history for context (last ~10 turns), oldest first.
  const { data: histRows } = await db
    .from("mentor_messages")
    .select("role, content").eq("member_id", member.id)
    .order("created_at", { ascending: false }).limit(10);
  const history = (histRows ?? []).reverse().map((r) => ({ role: r.role as "user" | "assistant", content: String(r.content) }));

  // Call the Claude API. System prompt is cached (stable, reused across members).
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: KNOWLEDGE, cache_control: { type: "ephemeral" } }],
      messages: [...history, { role: "user", content: message }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[mentor-chat] anthropic error", res.status, data?.error);
    return json({ error: "Der Mentor ist gerade nicht erreichbar. Bitte später erneut versuchen." }, 502);
  }
  const reply = Array.isArray(data?.content)
    ? data.content.filter((b: { type?: string }) => b?.type === "text").map((b: { text?: string }) => b.text ?? "").join("").trim()
    : "";
  if (!reply) return json({ error: "Keine Antwort erhalten." }, 502);

  // Persist the exchange (service role — bypasses RLS).
  await db.from("mentor_messages").insert([
    { member_id: member.id, role: "user", content: message },
    { member_id: member.id, role: "assistant", content: reply },
  ]);

  return json({ reply });
});
