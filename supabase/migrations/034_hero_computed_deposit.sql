-- Derive the real deposit instead of approximating it with the balance.
--
-- WHY THE BALANCE WAS NOT ENOUGH
-- The ratchet in 033 takes the high-water mark of the balance. That is right for
-- a FIRST deposit, where balance ≈ deposit. It is wrong for every tier after:
--   · a member up on the year shows a balance above what they deposited and gets
--     a tier they did not pay for;
--   · a member down on the year tops up to 2,000, shows 1,600, and does NOT get
--     Operator even though the money arrived. That one costs a customer.
--
-- THE IDENTITY
--     balance = deposits - withdrawals + realised P&L
--   → deposits - withdrawals = balance - realised P&L
--
-- Hero gives us both sides. `closed_trades` returns
-- `summary:{lots, commission, swap, profit}` per window, so the realised result is
-- profit + swap + commission, and `net deposit = balance - that`.
--
-- VERIFIED ON REAL DATA before this was written. Account 2060981 (user 809086):
--     balance                 10,465.13
--     realised P&L               -34.87   (3 trades, 11.01 lots, 34 windows swept)
--     → derived net deposit   10,500.00   ← exactly round
-- Two irregular numbers producing a round deposit is not a coincidence; the
-- identity holds.
--
-- COST, AND WHY COVERAGE IS TRACKED PER ACCOUNT
-- Hero caps a trade query at 31 days, so a full history means one call per month
-- per account — and a single real customer here has 30 live accounts. Recomputing
-- that every run would be ~1,000 calls. So each account records the range it has
-- already been swept for (`pnl_from` … `pnl_through`) and its running total; a run
-- only fetches what is missing, and a run cut short by its deadline simply resumes
-- next time.
--
-- The derived figure is only trustworthy when the sweep reaches back to the
-- account's start — a partial sweep understates the P&L and would overstate the
-- deposit. So `computed_deposit_usd` is written ONLY for complete coverage, and
-- the ratchet falls back to the balance until then.
--
-- What this still cannot see: money the broker books outside trades — bonuses,
-- credits, deposit fees. Hero exposing `totalDeposits` would remove the estimate
-- entirely; this is the version that does not depend on them shipping it.

ALTER TABLE public.broker_accounts
  ADD COLUMN IF NOT EXISTS pnl_usd     NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS pnl_from    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pnl_through TIMESTAMPTZ;

COMMENT ON COLUMN public.broker_accounts.pnl_usd IS
  'Realised profit+swap+commission accumulated over [pnl_from, pnl_through]. Partial until the sweep reaches the account start.';

ALTER TABLE public.broker_clients
  ADD COLUMN IF NOT EXISTS computed_deposit_usd NUMERIC(14,2);

COMMENT ON COLUMN public.broker_clients.computed_deposit_usd IS
  'balance - realised P&L, summed over accounts with COMPLETE trade coverage. NULL when any account is still mid-sweep. Preferred over current_balance_usd by the ratchet.';

-- Ratchet now prefers the derived deposit and falls back to the balance.
-- Still monotonic: a withdrawal lowers the derived figure, and a member must not
-- lose a tier they paid for because they took profit out.
CREATE OR REPLACE FUNCTION public.promote_balances_to_net_deposit(p_broker TEXT)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT broker, client_id,
           COALESCE(computed_deposit_usd, current_balance_usd) AS observed
      FROM broker_clients
     WHERE broker = p_broker
  ), upd AS (
    UPDATE broker_clients bc
       SET net_deposit = GREATEST(COALESCE(bc.net_deposit, 0), src.observed)
      FROM src
     WHERE bc.broker = src.broker
       AND bc.client_id = src.client_id
       AND src.observed IS NOT NULL
       AND (bc.net_deposit IS NULL OR src.observed > bc.net_deposit)
    RETURNING 1
  )
  SELECT count(*)::INTEGER FROM upd;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_balances_to_net_deposit(TEXT) FROM anon, authenticated, public;
