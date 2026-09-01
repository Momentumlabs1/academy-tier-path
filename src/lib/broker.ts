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
    // Path-style referral, not a query parameter: the code aAaRH40s IS the last
    // path segment. That matters twice below — usableBrokerUrl has to recognise
    // it as "carries a referral", and depositUrl appends click_id with ?, not &.
    // Hardcoded like Hero's, with an env override for staging; it was read from
    // VITE_BROKER_URL only, which meant an empty string in every build where
    // nobody had set it — and an empty URL silently pinned everyone to Hero.
    url:
      ((import.meta.env as Record<string, unknown>).VITE_BROKER_URL as string) ||
      "https://vtm.pro/la5-com/global/aAaRH40s",
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
/**
 * WHERE A MEMBER IS SENT — Telegram, not the broker.
 *
 * The website no longer links to the broker at all. That is a funnel decision,
 * not a technical one, and the reasoning is worth keeping because it is easy to
 * "helpfully" add a direct button back later:
 *
 * The broker's own sign-up is the expensive step — identity documents,
 * two-factor, a wait for approval. Most of the people who drop out drop out
 * THERE, and a direct button hands exactly those people a path where nobody can
 * help them and nobody finds out they left. Routing everyone through Telegram
 * first costs the self-sufficient nothing (the broker link is in the chat, one
 * tap away) and gives everyone else a person.
 *
 * The automatic unlock stays regardless: hero-sync reads balances every five
 * minutes, so someone who deposits without ever opening Telegram is still
 * unlocked. Telegram is the route; the balance check is the safety net.
 */
export const TELEGRAM_ENTRY = {
  /**
   * The public handle, not a `+hash` invite link. Both work, but a hash reads
   * like something forwarded to you rather than somewhere you meant to go — and
   * this is the first thing a visitor clicks.
   */
  url: "https://t.me/cosmoscandles",
  label: "Join on Telegram",
} as const;

export const BROKER_SWITCH = {
  // OPEN. HeroFX is live and readable end to end: clients, balances and trades all
  // come back through their partnership API, and the academy unlocks off the
  // balance without anyone touching it. VT Markets is still unconfigured, which is
  // why brokerForCountry below sends everyone to Hero rather than falling back.
  paused: false,
  headline: "Broker connection is being upgraded",
  body:
    "We're moving to a new partner broker with a direct API, which makes deposits verify " +
    "in seconds instead of minutes. Deposits reopen shortly — everything else stays open.",
} as const;

/** Default surface for copy that must name a broker before one is chosen. */
export const BROKER = {
  get name() { return ACTIVE_BROKER.name; },
  get url() { return ACTIVE_BROKER.url; },
  trust: [] as { icon: string; label: string }[],
  // "a licensed, regulated broker" stood in this sentence and is gone. Hero is a
  // Saint Lucia company with no investment-services licence anywhere; claiming
  // otherwise on the page that sends people to them is a false statement about a
  // financial firm — and the first one a regulator would read.
  oneLiner:
    "You never deposit with us. You fund your own account at our partner broker — " +
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
/**
 * Der Broker fuer EINE Marke — Partner schlaegt Land.
 *
 * brokerForCountry entscheidet nach Herkunft des Besuchers, und fuer die
 * Hausmarke ist das richtig. Fuer einen Partner, dessen Publikum ohnehin in
 * den USA sitzt, ist es falsch herum: sein Setter-Bot verschickt den
 * Hero-Link mit seinem eigenen Partner-Code, waehrend die Akademie daneben VT
 * nannte. Der Kunde eroeffnet dann beim einen und zahlt beim anderen ein —
 * und die Zuordnung greift nie, weil der Broker den Kunden gar nicht kennt.
 *
 * Ist am Mandanten ein Broker hinterlegt, gilt der. Sonst wie bisher das Land.
 */
export function brokerFor(preferred?: BrokerKey | null, countryCode?: string | null): BrokerConfig {
  if (preferred && BROKERS[preferred]?.url) return BROKERS[preferred];
  return brokerForCountry(countryCode);
}

export function brokerForCountry(countryCode?: string | null): BrokerConfig {
  // VT has no registration URL yet, and a broker with no URL is not a fallback —
  // it is a dead button. Until it is configured, everyone goes to Hero.
  if (!BROKERS.vt.url) return BROKERS.hero;
  return (countryCode ?? "").toUpperCase() === "US" ? BROKERS.hero : BROKERS.vt;
}

/**
 * The broker to use when no country is known — which is every client-side render,
 * since the country header only exists at the edge.
 *
 * ONE place decides this. Components used to hardcode `BROKERS.vt`, which is how a
 * deposit button ends up silently pointing at a broker that has no link at all.
 *
 * A NOTE ON WHERE HERO MAY BE PROMOTED. HeroFX Ltd is registered in Saint Lucia
 * (company register 2023-00356) and holds no EU, UK or US investment-services
 * licence — the number is a company registration, not a financial one. Their own
 * terms state that clients act "of your own free will without solicitation from
 * HeroFX Ltd". A broker accepting someone who arrives is not the same as us being
 * allowed to advertise to them: marketing an unauthorised broker to retail clients
 * inside the EU/UK is the platform's exposure, not the broker's.
 *
 * This constant decides where a member is SENT. It does not decide where the
 * academy may run paid acquisition. Those are separate calls, and the second needs
 * advice this codebase cannot give.
 */
export const ACTIVE_BROKER: BrokerConfig = brokerForCountry(null);

/**
 * Build the registration link for a member, carrying their id as the tracking
 * parameter so the broker record can be matched back without relying on the
 * member typing the same email address on both sides.
 *
 * Falls back to the plain link when there is no member id (logged-out pages).
 */
export function depositUrl(
  memberId?: string,
  broker: BrokerConfig = ACTIVE_BROKER,
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
export function usableBrokerUrl(brokerUrl?: string, broker: BrokerConfig = ACTIVE_BROKER): string {
  // Two shapes of referral marker, because the two brokers use different ones:
  // Hero puts it in the query (?partner_code=…), VT puts it in the path
  // (/global/aAaRH40s). Checking only for the query form rejected every valid
  // VT link as "unconfigured" and fell back to the master — silently reassigning
  // a partner's customer to us.
  const hasRef =
    !!brokerUrl &&
    (/[?&](referral|partner_code|ib|aff)=[^&]+/i.test(brokerUrl) ||
      /vtm\.pro\/[^?#]+\/[A-Za-z0-9]{6,}/.test(brokerUrl));
  return hasRef ? brokerUrl! : broker.url;
}
