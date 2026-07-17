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

export const COMMISSION_LADDER: CommissionLevel[] = [
  { level: 1, fromVolume: 0,       toVolume: 25_000,  usdPerLot: 5 },
  { level: 2, fromVolume: 25_000,  toVolume: 50_000,  usdPerLot: 6 },
  { level: 3, fromVolume: 50_000,  toVolume: 100_000, usdPerLot: 8 },
  { level: 4, fromVolume: 100_000, toVolume: null,    usdPerLot: 10 },
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
