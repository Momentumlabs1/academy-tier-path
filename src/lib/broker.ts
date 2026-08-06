/**
 * broker.ts — single source of truth for the partner broker (TradeQuo).
 *
 * THE core message of the whole funnel: nobody ever deposits with US. Members
 * fund their OWN account at TradeQuo — a licensed, award-winning global broker
 * — and that verified deposit is what unlocks the academy for free.
 *
 * The deposit URL is env-swappable so the moment our IB referral link is live
 * we set VITE_BROKER_URL in Vercel and every CTA in the app points at it.
 */
/**
 * The broker relationship is mid-switch: TradeQuo is being replaced by VT Markets,
 * whose IB API credentials are not in hand yet.
 *
 * While this is true, nothing may send a member to a broker. Two reasons, and the
 * second is the sharper one:
 *
 *  · Sending new clients to a broker we are leaving books them under an IB
 *    relationship that is ending — their deposits may never be attributed.
 *
 *  · The trust strip makes specific regulatory claims (FSCA · CMA · FSA, a
 *    Trustpilot score, proof of reserves). Those are TradeQuo's. Repeating them
 *    next to a VT Markets sign-up, or beside a broker a member cannot actually
 *    reach, is a false statement about a regulated firm — not a cosmetic issue.
 *
 * So every deposit surface reads this flag and shows the notice instead of a link,
 * and the trust claims stay hidden until VT's own are confirmed. Registration, the
 * academy and every free surface are deliberately untouched: the funnel keeps
 * filling, only the hand-off pauses.
 *
 * To switch back on: set `paused: false`, point `url` at the new IB link, and
 * replace `trust` with VT Markets' own verifiable claims.
 */
export const BROKER_SWITCH = {
  paused: true,
  headline: "Broker connection is being upgraded",
  body:
    "We're moving to a new partner broker with a direct API, which makes deposits verify " +
    "in seconds instead of minutes. Deposits reopen shortly — everything else stays open.",
} as const;

export const BROKER = {
  name: "TradeQuo",
  // The master IB referral link — every client who registers through it is
  // placed under our master IB and shows up in the broker DB. Env-overridable.
  url: ((import.meta.env as Record<string, unknown>).VITE_BROKER_URL as string) ||
    "https://my.tradequo.com/register?referral=019f75ff-3dfe-7114-9ccd-eac9692578d4",
  /** Verifiable trust signals from the broker's own site. */
  trust: [
    { icon: "★", label: "4.9 on Trustpilot" },
    { icon: "🛡", label: "Licensed: FSCA · CMA · FSA" },
    { icon: "🏆", label: "International award-winning broker" },
    { icon: "✓", label: "Proof of Reserves" },
  ],
  /** The one-liner every deposit surface repeats. */
  oneLiner:
    "You never deposit with us. You fund your own account at TradeQuo — a licensed, award-winning global broker — and that's what unlocks everything here for free.",
} as const;

/**
 * Build the deposit link for a signed-in member, carrying their member id as a
 * tracking token. It rides the referral URL into the broker's registration and
 * lands in their `utm_uri` / `utm_campaign` columns — so we match this member to
 * their broker record by the token, NOT by requiring the same email on both
 * sides. Falls back to the plain referral link when there's no member id
 * (logged-out landing pages), or when an explicit brokerUrl override is given
 * (e.g. a partner's own IB link from the admin).
 */
export function depositUrl(memberId?: string, brokerUrl: string = BROKER.url): string {
  const base = usableBrokerUrl(brokerUrl);
  if (!memberId) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_campaign=cc_${memberId}&cc_uid=${memberId}`;
}

/**
 * Guard against un-configured partner links.
 *
 * Every partner in tenants.ts ships with a PLACEHOLDER brokerUrl
 * ("https://tradequo.com") until their own IB link is entered in the admin.
 * That placeholder carries no `referral=` id, so a member sent there lands on
 * the broker's marketing homepage and registers under NOBODY — the deposit can
 * never be attributed and the account never unlocks. Silently losing a paying
 * customer is the worst possible failure here, so any link without a referral
 * id falls back to the master IB link instead.
 */
export function usableBrokerUrl(brokerUrl?: string): string {
  return brokerUrl && /[?&]referral=[^&]+/.test(brokerUrl) ? brokerUrl : BROKER.url;
}
