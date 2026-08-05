/**
 * mentor-chat — "Cosmo", the member-facing AI mentor.
 *
 * A direct line for funded members to ask about the academy, the platform, the
 * tiers and the trading concepts the course teaches. Runs on the Claude API
 * (Haiku 4.5 by default) with the whole knowledge base in the SYSTEM prompt and
 * prompt-caching on it.
 *
 * Knowledge comes from the `mentor_knowledge` table — curated platform facts
 * plus the head trader's actual lesson narration. The corpus is ~18k tokens, so
 * long-context + caching beats RAG infra at this size, and editing a row changes
 * what the bot knows on the next request with no redeploy. Cache reads make the
 * marginal cost of that corpus ≈ 0.2 ct per message.
 *
 * Gating: Cosmo is a Foundation perk — members below MENTOR_MIN_DEPOSIT get a
 * 403 with `locked: true` so the widget can show the upsell instead.
 *
 * Escalation: Claude can call the `escalate_to_human` tool for account/payout
 * topics, complaints, or anything it isn't sure about. That opens a row in
 * `mentor_escalations` and e-mails support; the human answer is written back
 * into the member's thread by a DB trigger (see migration 020).
 *
 * Guardrails (EU/MiFID/ESMA — this is a real financial product):
 *   - EDUCATION ONLY. Never personalized investment advice or "should I buy X".
 *   - Never guess on account / deposit / withdrawal / payout questions — escalate.
 *   - State the CFD risk reality when the topic is returns.
 * System-prompt guardrails stop casual misuse; they are a first layer, not a
 * hard security boundary — keep that in mind before widening the bot's scope.
 *
 * Secrets: ANTHROPIC_API_KEY. Optional: MENTOR_MODEL (default claude-haiku-4-5),
 * MENTOR_DAILY_LIMIT (default 30), MENTOR_MIN_DEPOSIT (default 100),
 * SUPPORT_EMAIL (default kontakt@momentumlabs.at).
 *
 * POST { message: string }  (Authorization: Bearer <member access token>)
 *   -> { reply: string, escalated?: boolean }
 *   -> 403 { error, locked: true, minDeposit } when below the deposit gate
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
const MIN_DEPOSIT = Number(Deno.env.get("MENTOR_MIN_DEPOSIT") ?? 100);
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "kontakt@momentumlabs.at";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

/** Behaviour rules. The course/platform knowledge itself lives in the DB. */
const PERSONA = `You are "Cosmo", the AI mentor of the Cosmos Candles trading academy.

You are NOT a human and NOT a licensed financial advisor — say so plainly whenever someone asks or assumes otherwise.

HOW TO ANSWER
- Always answer in the language the member writes in (German members get German, English get English). The knowledge below is a mix of English and German source material — translate freely, never apologise for the source language.
- Short, clear, concrete, encouraging. Prefer 2-6 sentences plus a list when it helps. No walls of text.
- Teach from the academy's own material below. When a question maps to a lesson, name it ("that's lesson 9 — Level 1 vs Level 2").
- If the knowledge base doesn't cover it, say so honestly instead of inventing an answer.

HARD GUARDRAILS
- NEVER give personalized investment advice: no "should I buy/sell X", no position sizing for their account, no price predictions, no trade recommendations beyond explaining the official signals. Explain the underlying concept instead.
- NEVER guess about a member's account, deposit, withdrawal, payout, commission, KYC or billing. Use the escalate_to_human tool.
- When the topic is returns/profit, state the reality: trading and CFDs are high-risk, most retail accounts lose money, never risk more than you can afford to lose.
- No guaranteed-profit promises. No invented numbers, names or dates.

WHEN TO HAND OVER TO A HUMAN (use the escalate_to_human tool)
- Account, deposit, withdrawal, payout, commission, KYC, billing or technical account problems.
- Complaints, refund requests, anything legal, or an angry member.
- The member explicitly asks for a human.
- Anything you genuinely cannot answer from the knowledge base.
Call the tool instead of guessing. Tell the member briefly and warmly that you're passing it to the team — do not invent a response time.`;

const ESCALATE_TOOL = {
  name: "escalate_to_human",
  description:
    "Hand this conversation to a human support agent. Use for account, deposit, withdrawal, payout, commission, KYC, billing or technical account issues; complaints or legal topics; an explicit request for a human; or any question you cannot answer from the knowledge base. Opens a support ticket — the member gets the human's answer in this same chat.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        enum: ["account_or_payment", "technical", "complaint", "unknown_answer", "human_requested"],
        description: "Why this needs a human.",
      },
      summary: {
        type: "string",
        description:
          "One or two sentences for the support agent: what the member wants and anything already established. Write it in German.",
      },
    },
    required: ["reason", "summary"],
  },
};

interface AnthropicBlock { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }

async function callClaude(apiKey: string, system: unknown, messages: unknown[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, tools: [ESCALATE_TOOL], messages }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const textOf = (blocks: AnthropicBlock[]) =>
  blocks.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("").trim();

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "unauthorized" }, 401);

  const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: userData, error: uErr } = await db.auth.getUser(token);
  if (uErr || !userData.user) return json({ error: "unauthorized" }, 401);

  const { data: member } = await db
    .from("members").select("id, name, email, deposit").eq("auth_user_id", userData.user.id).maybeSingle();
  if (!member) return json({ error: "Please sign up first." }, 403);

  // ── Foundation gate: Cosmo is a perk, not a free demo. ──
  const deposit = Number(member.deposit ?? 0);
  if (deposit < MIN_DEPOSIT) {
    return json({ error: `Cosmo schaltet ab ${MIN_DEPOSIT} € frei.`, locked: true, minDeposit: MIN_DEPOSIT }, 403);
  }

  let body: { message?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const message = String(body.message ?? "").trim();
  if (!message) return json({ error: "message required" }, 400);
  if (message.length > 2000) return json({ error: "message too long" }, 400);

  // Daily rate limit (per member, user turns only).
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from("mentor_messages").select("id", { count: "exact", head: true })
    .eq("member_id", member.id).eq("role", "user").gte("created_at", since.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `Tageslimit erreicht (${DAILY_LIMIT} Fragen). Melde dich morgen wieder oder schreib uns an ${SUPPORT_EMAIL}.` }, 429);
  }

  // ── Knowledge base from the DB, concatenated into one cached system block. ──
  const { data: kb } = await db
    .from("mentor_knowledge").select("title, content")
    .eq("is_active", true).order("sort", { ascending: true }).order("slug", { ascending: true });
  const corpus = (kb ?? []).map((d) => `## ${d.title}\n${d.content}`).join("\n\n---\n\n");

  const system = [
    { type: "text", text: PERSONA },
    { type: "text", text: `# ACADEMY KNOWLEDGE BASE\n\n${corpus}`, cache_control: { type: "ephemeral" } },
  ];

  // History for context (last ~10 turns), oldest first. A human support reply is
  // replayed to the model as an assistant turn so the thread stays coherent.
  const { data: histRows } = await db
    .from("mentor_messages").select("role, content").eq("member_id", member.id)
    .order("created_at", { ascending: false }).limit(10);
  const history = (histRows ?? []).reverse().map((r) => ({
    role: r.role === "user" ? "user" as const : "assistant" as const,
    content: r.role === "support" ? `[Support-Team]: ${r.content}` : String(r.content),
  }));

  const messages: unknown[] = [...history, { role: "user", content: message }];

  const first = await callClaude(apiKey, system, messages);
  if (!first.ok) {
    console.error("[mentor-chat] anthropic error", first.status, first.data?.error);
    return json({ error: "Cosmo is unavailable right now. Please try again shortly." }, 502);
  }

  const blocks: AnthropicBlock[] = Array.isArray(first.data?.content) ? first.data.content : [];
  const toolUse = blocks.find((b) => b?.type === "tool_use" && b?.name === "escalate_to_human");
  let reply = textOf(blocks);
  let escalated = false;

  if (toolUse) {
    const input = (toolUse.input ?? {}) as { reason?: string; summary?: string };
    const reason = String(input.reason ?? "unknown_answer");
    const summary = String(input.summary ?? message);

    // Open the ticket with a small transcript snapshot for context.
    const { data: esc } = await db.from("mentor_escalations").insert({
      member_id: member.id,
      question: message,
      reason,
      context: { summary, recent: history.slice(-6) },
    }).select("id").maybeSingle();
    escalated = true;

    // Notify support (best-effort — a mail failure must not break the chat).
    try {
      const { data: sec } = await db.from("app_secrets").select("value").eq("key", "SEND_SECRET").maybeSingle();
      const ticket = String(esc?.id ?? "").slice(0, 8);
      await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sec?.value ? { "x-send-secret": String(sec.value) } : {}),
        },
        body: JSON.stringify({
          to: SUPPORT_EMAIL,
          subject: `[Cosmo] Support-Anfrage von ${member.name ?? member.email ?? "Mitglied"} (${reason})`,
          replyTo: member.email ?? undefined,
          html:
            `<h2>Cosmo hat eine Frage an das Team weitergeleitet</h2>` +
            `<p><b>Mitglied:</b> ${escapeHtml(String(member.name ?? "—"))} &lt;${escapeHtml(String(member.email ?? "—"))}&gt;<br>` +
            `<b>Einzahlung:</b> ${deposit} €<br>` +
            `<b>Grund:</b> ${escapeHtml(reason)}<br>` +
            `<b>Ticket:</b> ${escapeHtml(ticket)}</p>` +
            `<p><b>Frage:</b><br>${escapeHtml(message)}</p>` +
            `<p><b>Cosmos Zusammenfassung:</b><br>${escapeHtml(summary)}</p>` +
            `<p>Beantworten im Admin-Bereich unter <b>/admin/support</b> — die Antwort erscheint automatisch im Chat des Mitglieds.</p>`,
        }),
      });
    } catch (e) {
      console.error("[mentor-chat] support mail failed", e);
    }

    // Let Claude phrase the hand-over itself, in the member's language.
    const second = await callClaude(apiKey, system, [
      ...messages,
      { role: "assistant", content: blocks },
      {
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: toolUse.id,
          content:
            "Ticket opened. The support team has been notified by e-mail and will answer in this chat. Confirm this to the member briefly and warmly, in their language. Do not promise a specific response time.",
        }],
      },
    ]);
    if (second.ok && Array.isArray(second.data?.content)) {
      const t = textOf(second.data.content as AnthropicBlock[]);
      if (t) reply = t;
    }
    if (!reply) reply = "I am passing this straight to our team — their answer will appear here in the chat. 📩";
  }

  if (!reply) return json({ error: "No answer received." }, 502);

  await db.from("mentor_messages").insert([
    { member_id: member.id, role: "user", content: message },
    { member_id: member.id, role: "assistant", content: reply },
  ]);

  return json({ reply, escalated });
});
