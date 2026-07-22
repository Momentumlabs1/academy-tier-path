/**
 * _templates.ts — the full transactional e-mail template library.
 *
 * One shared branded layout (`shell`) + one builder per e-mail kind. Every
 * builder returns { subject, html } and takes a small typed payload. Brand is
 * pass-through so partner co-branding works (accent colour + name), Cosmo stays
 * the constant. Plain inline CSS only — e-mail clients strip <style>/external.
 */

export interface Brand {
  name: string;        // e.g. "Cosmos Candles Academy" or a partner brand
  accent: string;      // hex, e.g. "#75B9F5"
  logoUrl?: string;    // optional partner logo (falls back to wordmark)
  supportEmail?: string;
}

const DEFAULT_BRAND: Brand = {
  name: "Cosmos Candles Academy",
  accent: "#75B9F5",
  supportEmail: "kontakt@momentumlabs.at",
};

const money = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Shared responsive shell. `body` is trusted HTML built below; user text is escaped by callers. */
function shell(brand: Brand, opts: { preheader: string; body: string; unsubUrl?: string }) {
  const b = { ...DEFAULT_BRAND, ...brand };
  const logo = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${esc(b.name)}" height="34" style="height:34px;display:block">`
    : `<span style="font-weight:800;font-size:18px;color:#f2ede4">${esc(b.name)}</span>`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"></head>
<body style="margin:0;background:#080b11;color:#e9edf3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080b11;padding:28px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0f1620;border:1px solid #1c2636;border-radius:18px;overflow:hidden">
    <tr><td style="padding:22px 28px;border-bottom:1px solid #1c2636">${logo}</td></tr>
    <tr><td style="padding:28px">${opts.body}</td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #1c2636;color:#6b7788;font-size:11px;line-height:1.6">
      Trading beinhaltet Risiko — 74–89 % der Retail-CFD-Konten verlieren Geld.<br>
      ${b.supportEmail ? `Fragen? <a href="mailto:${b.supportEmail}" style="color:#8fa2b8">${b.supportEmail}</a> · ` : ""}
      ${opts.unsubUrl ? `<a href="${opts.unsubUrl}" style="color:#8fa2b8">Abmelden</a>` : ""}
    </td></tr>
  </table>
  <div style="color:#3f4a5a;font-size:11px;margin-top:14px">© ${esc(b.name)}</div>
</td></tr></table></body></html>`;
}

function button(accent: string, href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:${accent};color:#08111a;font-weight:800;
    text-decoration:none;padding:13px 24px;border-radius:11px;font-size:15px">${esc(label)}</a>`;
}
function h1(t: string) { return `<h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#f4f7fb">${esc(t)}</h1>`; }
function p(t: string) { return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#b7c1cf">${t}</p>`; }

export type EmailKind =
  | "doi" | "welcome" | "deposit_confirmed" | "tier_unlocked"
  | "tier_nudge" | "inactivity_warning" | "new_lesson" | "broadcast";

export interface BuildInput {
  kind: EmailKind;
  brand?: Partial<Brand>;
  firstName?: string;
  confirmUrl?: string;
  dashboardUrl?: string;
  unsubUrl?: string;
  // per-kind extras
  tierName?: string;
  depositAmount?: number;
  nextTierName?: string;
  amountToNext?: number;
  daysInactive?: number;
  lessonTitle?: string;
  lessonUrl?: string;
  title?: string;   // broadcast
  bodyHtml?: string; // broadcast (trusted, admin-authored)
}

/** Build { subject, html } for a given kind. Returns null for unknown kinds. */
export function buildEmail(input: BuildInput): { subject: string; html: string } | null {
  const brand: Brand = { ...DEFAULT_BRAND, ...(input.brand ?? {}) };
  const a = brand.accent;
  const hi = input.firstName ? `${esc(input.firstName)}, ` : "";
  const dash = input.dashboardUrl ?? "https://cosmos-candles.com";
  const wrap = (preheader: string, body: string) =>
    shell(brand, { preheader, body, unsubUrl: input.unsubUrl });

  switch (input.kind) {
    case "doi":
      return {
        subject: `Bitte bestätige deine E-Mail — ${brand.name}`,
        html: wrap("Ein Klick und du bist dabei.",
          h1("Nur noch ein Klick") +
          p(`${hi}bitte bestätige deine E-Mail, damit wir dir Signale und Updates von <b>${esc(brand.name)}</b> schicken dürfen.`) +
          `<div style="margin:22px 0">${button(a, input.confirmUrl ?? dash, "E-Mail bestätigen")}</div>` +
          p(`<span style="color:#6b7788;font-size:13px">Du hast dich nicht angemeldet? Ignoriere diese Mail einfach.</span>`)),
      };

    case "welcome":
      return {
        subject: `Willkommen bei ${brand.name} 👋`,
        html: wrap("Dein Zugang ist frei — so geht's weiter.",
          h1(`Willkommen${input.firstName ? `, ${esc(input.firstName)}` : ""}!`) +
          p("Dein Account steht. Ab jetzt hast du Zugriff auf die Academy — und dein Willkommens-Video wartet schon im Dashboard.") +
          p("Der nächste Schritt: deine erste Einzahlung ab 100 € schaltet Signale, Tools und die höheren Level frei. Dein Geld bleibt dabei auf <b>deinem eigenen</b> Broker-Konto.") +
          `<div style="margin:22px 0">${button(a, dash, "Zum Dashboard")}</div>`),
      };

    case "deposit_confirmed":
      return {
        subject: `Einzahlung bestätigt — willkommen im ${input.tierName ?? "nächsten"} Level 🎉`,
        html: wrap("Deine Einzahlung ist da — neue Inhalte freigeschaltet.",
          h1("Einzahlung bestätigt 🎉") +
          p(`${hi}deine Einzahlung${input.depositAmount ? ` über <b>${money(input.depositAmount)}</b>` : ""} ist angekommen${input.tierName ? ` — du bist jetzt im <b style="color:${a}">${esc(input.tierName)}</b>-Level` : ""}.`) +
          p("Deine neuen Signale, Lektionen und Tools sind ab sofort freigeschaltet. Viel Erfolg — und denk dran: Risiko pro Trade im Griff behalten.") +
          `<div style="margin:22px 0">${button(a, dash, "Freigeschaltete Inhalte ansehen")}</div>`),
      };

    case "tier_unlocked":
      return {
        subject: `${input.tierName ?? "Neues Level"} freigeschaltet`,
        html: wrap("Ein neues Level ist offen.",
          h1(`${esc(input.tierName ?? "Neues Level")} freigeschaltet`) +
          p(`${hi}stark! Du hast das <b style="color:${a}">${esc(input.tierName ?? "")}</b>-Level erreicht. Neue Perks sind ab sofort in deinem Dashboard aktiv.`) +
          `<div style="margin:22px 0">${button(a, dash, "Perks ansehen")}</div>`),
      };

    case "tier_nudge":
      return {
        subject: `Nur noch ${input.amountToNext ? money(input.amountToNext) : "ein kleiner Schritt"} bis ${input.nextTierName ?? "zum nächsten Level"}`,
        html: wrap("Du bist kurz vorm nächsten Level.",
          h1("Du bist fast im nächsten Level") +
          p(`${hi}dir fehlen nur noch ${input.amountToNext ? `<b>${money(input.amountToNext)}</b>` : "ein kleiner Schritt"} bis <b style="color:${a}">${esc(input.nextTierName ?? "zum nächsten Level")}</b> — mit mehr Signalen, Tools und Calls.`) +
          `<div style="margin:22px 0">${button(a, dash + "/tier", "Zum nächsten Level")}</div>`),
      };

    case "inactivity_warning":
      return {
        subject: "Deine Signale pausieren bald ⏳",
        html: wrap("Kurze Erinnerung, damit dein Zugang aktiv bleibt.",
          h1("Bleib aktiv, damit's weiterläuft") +
          p(`${hi}wir haben seit ${input.daysInactive ?? "einigen"} Tagen keine Aktivität auf deinem Konto gesehen. Damit dein Signal-Zugang aktiv bleibt, log dich kurz ein und mach deinen nächsten Trade.`) +
          `<div style="margin:22px 0">${button(a, dash, "Jetzt aktiv bleiben")}</div>`),
      };

    case "new_lesson":
      return {
        subject: `Neue Lektion: ${input.lessonTitle ?? "frisch verfügbar"}`,
        html: wrap("Frischer Content in der Academy.",
          h1("Neue Lektion verfügbar") +
          p(`${hi}es gibt frischen Stoff: <b>${esc(input.lessonTitle ?? "")}</b> ist jetzt in deiner Academy.`) +
          `<div style="margin:22px 0">${button(a, input.lessonUrl ?? (dash + "/lessons"), "Lektion ansehen")}</div>`),
      };

    case "broadcast":
      return {
        subject: input.title ?? `Update von ${brand.name}`,
        html: wrap(input.title ?? "Neuigkeiten",
          (input.title ? h1(input.title) : "") + (input.bodyHtml ?? "") +
          `<div style="margin:22px 0">${button(a, dash, "Zum Dashboard")}</div>`),
      };

    default:
      return null;
  }
}
