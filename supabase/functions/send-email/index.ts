/**
 * send-email — central transactional/marketing sender via Resend.
 *
 * One place the whole backend calls to send mail. Uses RESEND_API_KEY.
 * Per-brand sender identity: pass `tenant` and we build the From as
 * "<Brand> <noreply@send.cosmos-candles.com>" (transactional) — swap the domain
 * once each partner subdomain is verified in Resend (see docs/site/finalization-roadmap.md §1).
 *
 * Secrets: RESEND_API_KEY, [MAIL_FROM_DOMAIN=send.cosmos-candles.com], [ACCESS_SYNC_SECRET reuse or SEND_SECRET].
 *
 * POST body:
 *   { to, subject, html, fromName?, replyTo? }        // generic
 *   { kind: "doi", to, confirmUrl, brandName? }        // double-opt-in confirm mail
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const FROM_DOMAIN = Deno.env.get("MAIL_FROM_DOMAIN") ?? "send.cosmos-candles.com";

function doiHtml(confirmUrl: string, brandName: string) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0b0f16;color:#f2ede4;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#131a24;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 8px">Nur noch ein Klick</h1>
      <p style="color:#a9b0bd;font-size:14px;line-height:1.6">Bitte bestätige deine E-Mail-Adresse, damit wir dir Signale und Updates von ${brandName} schicken dürfen.</p>
      <a href="${confirmUrl}" style="display:inline-block;margin:16px 0;background:#75B9F5;color:#0b0f16;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px">E-Mail bestätigen</a>
      <p style="color:#6b7280;font-size:12px;line-height:1.6">Du hast dich nicht angemeldet? Dann ignoriere diese Mail einfach.</p>
    </div>
  </body></html>`;
}

async function resendSend(payload: Record<string, unknown>) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, id: body?.id } : { ok: false, error: body?.message ?? `HTTP ${res.status}` };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const brandName = String(b.brandName ?? b.fromName ?? "CosmoTrades");
  const from = `${brandName} <noreply@${FROM_DOMAIN}>`;

  if (b.kind === "doi") {
    if (!b.to || !b.confirmUrl) return json({ error: "to and confirmUrl required" }, 400);
    const r = await resendSend({
      from, to: b.to, subject: `Bitte bestätige deine E-Mail — ${brandName}`,
      html: doiHtml(String(b.confirmUrl), brandName),
    });
    return json(r, r.ok ? 200 : 502);
  }

  if (!b.to || !b.subject || !b.html) return json({ error: "to, subject, html required" }, 400);
  const r = await resendSend({ from, to: b.to, subject: b.subject, html: b.html, reply_to: b.replyTo });
  return json(r, r.ok ? 200 : 502);
});
