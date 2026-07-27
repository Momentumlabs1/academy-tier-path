/**
 * deposit-intent — a tiny per-member flag set the moment a member clicks a
 * "Deposit at TradeQuo" CTA. The dashboard uses it to show a "we're verifying
 * your deposit…" state instead of the cold pre-deposit screen, until the broker
 * sync books the deposit (members.deposit > 0) and the celebration takes over.
 *
 * localStorage only (no server round-trip); safe in private mode.
 */
const KEY = (email: string) => `onb_dep_click:${email.toLowerCase()}`;
const WINDOW_MS = 3 * 60 * 60 * 1000; // treat a click as "pending" for 3 hours

export function markDepositClick(email: string): void {
  if (!email) return;
  try { localStorage.setItem(KEY(email), String(Date.now())); } catch { /* private mode */ }
}

export function depositClickedRecently(email: string): boolean {
  return depositClickedAt(email) > 0;
}

/**
 * When the member clicked "Deposit" (epoch ms), or 0 if there's no live click.
 * The verifying screen counts down from this, so a member who deposits and comes
 * back six minutes later sees four minutes left — not a fresh ten.
 */
export function depositClickedAt(email: string): number {
  if (!email) return 0;
  try {
    const v = Number(localStorage.getItem(KEY(email)) || 0);
    return v > 0 && Date.now() - v < WINDOW_MS ? v : 0;
  } catch { return 0; }
}

export function clearDepositClick(email: string): void {
  if (!email) return;
  try { localStorage.removeItem(KEY(email)); } catch { /* private mode */ }
}
