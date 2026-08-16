/**
 * Partner commission staircase — mirrors docs/verguetung-modell.md §3.
 *
 * The payout per lot climbs with the total customer volume booked under a
 * partner. Volume is tracked in EUR on tenants.partner_volume; the master keeps
 * (15 − partnerRate) USD/lot.
 */
export interface CommissionLevel {
  level: number;
  /** inclusive lower bound of customer volume (EUR) */
  fromVolume: number;
  /** exclusive upper bound (EUR); null = open-ended top tier */
  toVolume: number | null;
  /** partner payout, USD per lot */
  usdPerLot: number;
}

/**
 * ONE RATE, both brokers: 6 USD per lot at HeroFX and at VT Markets.
 *
 * This was a four-step ladder (5 / 6 / 8 / 10 by volume) invented while the
 * broker terms were still unknown. The real deal is flat, so the ladder was
 * describing a payout nobody had agreed to — and it was on the public partner
 * page, which made it a promise.
 *
 * Kept as an array rather than a single number because volumeToNextLevel and
 * the portal already read it, and a one-entry ladder answers "no next level"
 * correctly. If tiered rates are ever actually negotiated, they go back here.
 */
export const COMMISSION_LADDER: CommissionLevel[] = [
  { level: 1, fromVolume: 0, toVolume: null, usdPerLot: 6 },
];

export const MASTER_IB_USD_PER_LOT = 15;

/** The staircase level for a given customer volume (EUR). */
export function levelForVolume(volume: number): CommissionLevel {
  return [...COMMISSION_LADDER].reverse().find((l) => volume >= l.fromVolume) ?? COMMISSION_LADDER[0];
}

/** Volume still needed to reach the next level; null if already at the top. */
export function volumeToNextLevel(volume: number): { next: CommissionLevel; remaining: number } | null {
  const current = levelForVolume(volume);
  const next = COMMISSION_LADDER.find((l) => l.level === current.level + 1);
  if (!next) return null;
  return { next, remaining: Math.max(0, next.fromVolume - volume) };
}
