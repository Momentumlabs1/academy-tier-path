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
  // Hosted, not inlined: a base64 logo blows up every message and Gmail clips
  // mails over 102 kB. This is a downscaled copy of the site wordmark so the
  // header is not a 500 kB download on mobile data.
  logoUrl: "https://cosmos-candles.com/email-logo.png",
  supportEmail: "kontakt@momentumlabs.at",
};

const money = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Shared responsive shell. `body` is trusted HTML built below; user text is escaped by callers. */
function shell(brand: Brand, opts: { preheader: string; body: string; unsubUrl?: string }) {
  const b = { ...DEFAULT_BRAND, ...brand };
  // Images are blocked by default in most clients, so the logo carries alt text
  // that reads as the brand name rather than "image".
  const logo = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${esc(b.name)}" width="150" height="72"
         style="width:150px;height:auto;display:block;border:0;outline:none;text-decoration:none">`
    : `<span style="font-weight:800;font-size:18px;color:#f2ede4;letter-spacing:.02em">${esc(b.name)}</span>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${esc(b.name)}</title></head>
<body style="margin:0;padding:0;background:#070a10;color:#e9edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070a10;padding:32px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#0d141e;border:1px solid #1b2534;border-radius:20px;overflow:hidden">
    <!-- accent hairline: the one flash of brand colour that survives image blocking -->
    <tr><td style="height:3px;line-height:3px;font-size:0;background:${b.accent}">&nbsp;</td></tr>
    <tr><td align="center" style="padding:26px 28px 22px">${logo}</td></tr>
    <tr><td style="padding:0 32px 32px">${opts.body}</td></tr>
    <tr><td style="padding:20px 32px;border-top:1px solid #1b2534;background:#0a101a;color:#6b7788;font-size:11px;line-height:1.7">
      <div style="color:#8fa2b8;font-weight:700;font-size:12px;margin-bottom:6px">${esc(b.name)}</div>
      Trading involves risk — 74–89% of retail CFD accounts lose money when trading CFDs.
      Past performance does not predict future results.<br>
      ${b.supportEmail ? `<a href="mailto:${b.supportEmail}" style="color:#8fa2b8;text-decoration:underline">${b.supportEmail}</a>` : ""}
      ${b.supportEmail && opts.unsubUrl ? ` &nbsp;·&nbsp; ` : ""}
      ${opts.unsubUrl ? `<a href="${opts.unsubUrl}" style="color:#8fa2b8;text-decoration:underline">Unsubscribe</a>` : ""}
    </td></tr>
  </table>
  <div style="color:#3f4a5a;font-size:11px;margin-top:16px">© ${esc(b.name)}</div>
</td></tr></table></body></html>`;
}

function button(accent: string, href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:${accent};color:#08111a;font-weight:800;
    text-decoration:none;padding:13px 24px;border-radius:11px;font-size:15px">${esc(label)}</a>`;
}
function h1(t: string) { return `<h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#f4f7fb">${esc(t)}</h1>`; }
function p(t: string) { return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#b7c1cf">${t}</p>`; }

export type EmailKind =
  | "password_reset" | "partner_approved" | "doi" | "welcome" | "deposit_confirmed" | "tier_unlocked"
  | "tier_nudge" | "inactivity_warning" | "new_lesson" | "broadcast";

export interface BuildInput {
  kind: EmailKind;
  brand?: Partial<Brand>;
  firstName?: string;
  confirmUrl?: string;
  resetUrl?: string;
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
    // Sent by the `password-reset` function, which mints the recovery link with
    // the admin API and mails it from OUR domain. Supabase's own mailer would
    // send this from noreply@mail.app.supabase.io, which reads as phishing and
    // lands in spam — the whole reason this kind exists.
    case "password_reset":
      return { subject: `Reset your password — ${brand.name}`,
        html: wrap("Set a new password — the link expires shortly.", h1("Set a new password") + p(`${hi}we got a request to reset the password for your <b>${esc(brand.name)}</b> account. Click below to choose a new one.`) + `<div style="margin:22px 0">${button(a, input.resetUrl ?? dash, "Set a new password")}</div>` + p(`<span style="color:#6b7788;font-size:13px">The link works once and expires shortly. If you didn't ask for this, ignore this e-mail — nothing changes.</span>`)) };
    /**
     * Aufnahme ins Partnerprogramm. Bewusst KURZ: die naechsten Schritte stehen
     * im Partnerbereich, nicht hier. Eine Mail, die den ganzen Ablauf erklaert,
     * wird nicht gelesen und ist am naechsten Tag veraltet — die Seite nicht.
     */
    case "partner_approved":
      return {
        subject: `You're in — your access to the ${brand.name} partner program`,
        html: wrap("Your application is accepted — here's what happens next.",
          h1("You're in" + (input.firstName ? `, ${esc(input.firstName)}` : "") + ".") +
          p("We read your application and accepted you into the partner program. Your access is set up.") +
          p("The partner portal tells you what happens now — what we take care of, and the two things we need from you.") +
          `<div style="margin:22px 0">${button(a, input.resetUrl ?? dash, "Set up your access")}</div>` +
          p(`<span style="color:#6b7788;font-size:13px">The button sets your password, once. After that you can reach your portal any time at ${esc(dash)}.</span>`)),
      };

    case "doi":
      return {
        subject: `Please confirm your e-mail — ${brand.name}`,
        html: wrap("One click and you're in.",
          h1("Just one more click") +
          p(`${hi}please confirm your e-mail so we can send you signals and updates from <b>${esc(brand.name)}</b>.`) +
          `<div style="margin:22px 0">${button(a, input.confirmUrl ?? dash, "Confirm e-mail")}</div>` +
          p(`<span style="color:#6b7788;font-size:13px">Didn't sign up? Just ignore this e-mail.</span>`)),
      };

    case "welcome":
      return {
        subject: `Welcome to ${brand.name} 👋`,
        html: wrap("Your access is live — here's what's next.",
          h1(`Welcome${input.firstName ? `, ${esc(input.firstName)}` : ""}!`) +
          p("Your account is ready. You now have access to the Academy — and your welcome video is already waiting in the dashboard.") +
          p("Next step: your first deposit of €100+ unlocks signals, tools and the higher levels. Your money stays in <b>your own</b> broker account.") +
          `<div style="margin:22px 0">${button(a, dash, "Go to dashboard")}</div>`),
      };

    case "deposit_confirmed":
      return {
        subject: `Deposit confirmed — welcome to the ${input.tierName ?? "next"} level 🎉`,
        html: wrap("Your deposit landed — new content unlocked.",
          h1("Deposit confirmed 🎉") +
          p(`${hi}your deposit${input.depositAmount ? ` of <b>${money(input.depositAmount)}</b>` : ""} has arrived${input.tierName ? ` — you are now in the <b style="color:${a}">${esc(input.tierName)}</b> level` : ""}.`) +
          p("Your new signals, lessons and tools are unlocked as of now. Good luck — and remember: keep your risk per trade under control.") +
          `<div style="margin:22px 0">${button(a, dash, "See what's unlocked")}</div>`),
      };

    case "tier_unlocked":
      return {
        subject: `${input.tierName ?? "New level"} unlocked`,
        html: wrap("A new level just opened.",
          h1(`${esc(input.tierName ?? "New level")} unlocked`) +
          p(`${hi}nice! You reached the <b style="color:${a}">${esc(input.tierName ?? "")}</b> level. New perks are live in your dashboard.`) +
          `<div style="margin:22px 0">${button(a, dash, "View perks")}</div>`),
      };

    case "tier_nudge":
      return {
        subject: `Only ${input.amountToNext ? money(input.amountToNext) : "one small step"} to ${input.nextTierName ?? "the next level"}`,
        html: wrap("You are one step from the next level.",
          h1("You are almost at the next level") +
          p(`${hi}you are only ${input.amountToNext ? `<b>${money(input.amountToNext)}</b>` : "one small step"} away from <b style="color:${a}">${esc(input.nextTierName ?? "the next level")}</b> — with more signals, tools and calls.`) +
          `<div style="margin:22px 0">${button(a, dash + "/tier", "Go to the next level")}</div>`),
      };

    case "inactivity_warning":
      return {
        subject: "Your signals will pause soon ⏳",
        html: wrap("Quick reminder to keep your access active.",
          h1("Stay active to keep it running") +
          p(`${hi}we have not seen any activity on your account for ${input.daysInactive ?? "a few"} days. To keep your signal access active, log in and place your next trade.`) +
          `<div style="margin:22px 0">${button(a, dash, "Stay active now")}</div>`),
      };

    case "new_lesson":
      return {
        subject: `New lesson: ${input.lessonTitle ?? "just released"}`,
        html: wrap("Fresh content in the Academy.",
          h1("New lesson available") +
          p(`${hi}fresh material for you: <b>${esc(input.lessonTitle ?? "")}</b> is now in your Academy.`) +
          `<div style="margin:22px 0">${button(a, input.lessonUrl ?? (dash + "/lessons"), "Watch the lesson")}</div>`),
      };

    case "broadcast":
      return {
        subject: input.title ?? `Update from ${brand.name}`,
        html: wrap(input.title ?? "News",
          (input.title ? h1(input.title) : "") + (input.bodyHtml ?? "") +
          `<div style="margin:22px 0">${button(a, dash, "Go to dashboard")}</div>`),
      };

    default:
      return null;
  }
}
