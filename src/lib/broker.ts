/**
 * broker.ts — which broker a visitor is sent to, and how their deposit gets back
 * to us.
 *
 * There are two, and which one a member sees depends on where they are:
 *
 *   · HeroFX for the United States. MetaTrader stopped accepting US clients, and
 *     Hero operates out of St Lucia under NON-SOLICITATION rather than
 *     non-acceptance — a US resident may open an account if they come of their
 *     own accord, which is not the same as us being allowed to target the US.
 *     So: a US visitor who arrives is shown Hero. We do not run US-targeted
 *     campaigns pointing at it. That distinction is the whole legal basis.
 *
 *   · VT Markets for everyone else.
 *
 * TradeQuo, the previous broker, is gone. Nothing here refers to it any more —
 * including the trust claims, which named TradeQuo's specific regulators and had
 * no business appearing beside a different broker's sign-up.
 *
 * Both are currently PAUSED (see BROKER_SWITCH): the IB API credentials are not
 * finished on either side, and sending a member to a broker we cannot yet read
 * deposits from means their academy would never unlock.
 */

/** A member's own id rides the registration link so we can match them later. */
export type BrokerKey = "hero" | "vt";

export interface BrokerConfig {
  key: BrokerKey;
  name: string;
  /** Registration URL, without the per-member tracking parameter. */
  url: string;
  /**
   * Query parameter that carries OUR member id through registration.
   *
   * Hero stores `click_id` on the client record — verified end to end: the value
   * survives the redirect, lands on the customer, and their back office shows it
   * as "Last UTM mark → Click Id". Whether their API returns it is still open;
   * until it does we match on email and fall back to registration timestamp.
   */
  trackingParam: string;
  /** Verifiable claims from that broker's own material. Empty until confirmed. */
  trust: { icon: string; label: string }[];
}

export const BROKERS: Record<BrokerKey, BrokerConfig> = {
  hero: {
    key: "hero",
    name: "HeroFX",
    // Straight to the registration form, NOT the marketing homepage. Two reasons,
    // and the second is the important one:
    //   · fewer clicks between the ad and the account;
    //   · the homepage DROPS our tracking parameter. Every "Open Account" button
    //     on herofx.co points at `…/auth/register?partner_code=2248356` with no
    //     click_id, so a visitor who lands on the homepage and clicks through
    //     arrives without the id that tells us which member they are. Hero does
    //     also stash click_id in a cookie on .herofx.co, which is why anything
    //     worked at all — but a cookie is not a guarantee, and testing showed two
    //     competing click_id cookies with no defined winner. Linking straight to
    //     the form carries the value in the URL as well.
    url: "https://portal.herofx.co/auth/register?partner_code=2248356",
    trackingParam: "click_id",
    // Deliberately empty. Repeating a regulator's name we have not verified for
    // THIS broker is a false statement about a licensed firm, not a copy detail.
    trust: [],
  },
  vt: {
    key: "vt",
    name: "VT Markets",
    url: ((import.meta.env as Record<string, unknown>).VITE_BROKER_URL as string) || "",
    // VT's portal captured every parameter we threw at it into a `deeplink`
    // object — click_id, sub_id, utm_campaign and more. Whether any of it reaches
    // the client record and comes back through their IB API is unconfirmed, and
    // their documented endpoints expose no such field.
    trackingParam: "click_id",
    trust: [],
  },
};

/**
 * The broker relationship is mid-switch. Until the IB credentials are finished,
 * nothing may hand a member off: a deposit we cannot read is a member whose
 * academy never opens and a partner who never gets credited.
 *
 * To switch on: set `paused: false`, fill VT's `url`, and put each broker's own
 * verified claims into `trust`.
 */
export const BROKER_SWITCH = {
  paused: true,
  headline: "Broker connection is being upgraded",
  body:
    "We're moving to a new partner broker with a direct API, which makes deposits verify " +
    "in seconds instead of minutes. Deposits reopen shortly — everything else stays open.",
} as const;

/** Default surface for copy that must name a broker before one is chosen. */
export const BROKER = {
  name: "our partner broker",
  url: BROKERS.vt.url,
  trust: [] as { icon: string; label: string }[],
  oneLiner:
    "You never deposit with us. You fund your own account at a licensed, regulated broker — " +
    "and that's what unlocks everything here for free.",
} as const;

/**
 * Pick the broker for a visitor.
 *
 * `countryCode` is an ISO-3166 alpha-2 from the edge (Vercel sets
 * `x-vercel-ip-country`). Unknown country falls to VT, which is the safe default:
 * Hero is the exception granted by where the visitor already is, never the
 * fallback we push people toward.
 */
export function brokerForCountry(countryCode?: string | null): BrokerConfig {
  return (countryCode ?? "").toUpperCase() === "US" ? BROKERS.hero : BROKERS.vt;
}

/**
 * Build the registration link for a member, carrying their id as the tracking
 * parameter so the broker record can be matched back without relying on the
 * member typing the same email address on both sides.
 *
 * Falls back to the plain link when there is no member id (logged-out pages).
 */
export function depositUrl(
  memberId?: string,
  broker: BrokerConfig = BROKERS.vt,
  overrideUrl?: string,
): string {
  const base = usableBrokerUrl(overrideUrl, broker);
  if (!memberId) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${broker.trackingParam}=${encodeURIComponent(memberId)}`;
}

/**
 * Guard against un-configured partner links.
 *
 * A partner created in the admin starts with no broker link of their own. Sending
 * a member to a bare broker homepage registers them under NOBODY: the deposit is
 * never attributed, the academy never unlocks, and the loss is silent. So any
 * link without a recognisable referral marker falls back to the master link.
 */
export function usableBrokerUrl(brokerUrl?: string, broker: BrokerConfig = BROKERS.vt): string {
  const hasRef = brokerUrl && /[?&](referral|partner_code|ib|aff)=[^&]+/i.test(brokerUrl);
  return hasRef ? brokerUrl! : broker.url;
}
