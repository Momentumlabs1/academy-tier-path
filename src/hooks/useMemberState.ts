import { ACTIVITY_MIN_LOTS_PER_MONTH, CURRENT_MEMBER, NOTIFICATIONS, nextTierFor, tierForDeposit, TIERS, type Notification, type Tier } from "@/lib/academy-data";
import { PRODUCTS, type Product } from "@/lib/products";
export interface MemberState {
  profile: { name: string; email: string; telegramHandle: string; joinedAt: string };
  lifetimeDeposits: number;
  currentTier: Tier | undefined;
  nextTier: Tier | undefined;
  nextTierRemaining: number;
  progressPctToNext: number;
  isActive: boolean;
  monthlyLots: number;
  monthlyLotsRequired: number;
  unlockedProducts: Product[];
  lockedProducts: Product[];
  notifications: Notification[];
  unreadNotifications: number;
}
function progressBetween(deposit: number, current: Tier | undefined, next: Tier | undefined): number {
  if (!next) return 1;
  const lower = current?.minDeposit ?? 0;
  const upper = next.minDeposit;
  if (upper <= lower) return 1;
  return Math.max(0, Math.min(1, (deposit - lower) / (upper - lower)));
}
export function useMemberState(): MemberState {
  const deposit = CURRENT_MEMBER.deposit;
  const currentTier = tierForDeposit(deposit);
  const nextTier = nextTierFor(deposit);
  const reached = currentTier ? TIERS.findIndex((t) => t.key === currentTier.key) : -1;
  const unlockedProducts = PRODUCTS.filter((p) => TIERS.findIndex((t) => t.key === p.requires) <= reached);
  const lockedProducts = PRODUCTS.filter((p) => !unlockedProducts.includes(p));
  const isActive = CURRENT_MEMBER.monthlyLots >= ACTIVITY_MIN_LOTS_PER_MONTH;
  return {
    profile: { name: CURRENT_MEMBER.name, email: CURRENT_MEMBER.email, telegramHandle: CURRENT_MEMBER.telegramHandle, joinedAt: CURRENT_MEMBER.joinedAt },
    lifetimeDeposits: deposit, currentTier, nextTier,
    nextTierRemaining: nextTier ? Math.max(0, nextTier.minDeposit - deposit) : 0,
    progressPctToNext: progressBetween(deposit, currentTier, nextTier),
    isActive,
    monthlyLots: CURRENT_MEMBER.monthlyLots,
    monthlyLotsRequired: ACTIVITY_MIN_LOTS_PER_MONTH,
    unlockedProducts, lockedProducts,
    notifications: NOTIFICATIONS,
    unreadNotifications: NOTIFICATIONS.filter((n) => !n.readAt).length,
  };
}
