/**
 * useMemberState — the logged-in customer's live dashboard state.
 *
 * Previously this returned hard-coded demo numbers (deposit 1500, a fake
 * profile, canned notifications). For a deployable site all of that is gone:
 * the state is now loaded from Supabase for the *actual* signed-in member —
 * their `members` row (deposit/tier/activity), their `notifications`, and their
 * `lesson_progress` — all RLS-scoped so a member only ever sees their own data.
 *
 * The public API is unchanged: `useMemberState()` still returns a synchronous
 * `MemberState`. While the first load is in flight (or when nobody is signed
 * in) it returns a zeroed state — a brand-new member with €0 deposited, no tier
 * and everything locked — which is the correct "before first deposit" picture,
 * never a fake number.
 *
 * Data flows through a single <MemberProvider> so the whole dashboard shares one
 * fetch instead of every card querying independently.
 */
import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIVITY_MIN_LOTS_PER_MONTH, nextTierFor, tierForDeposit, TIERS, type Notification, type Tier } from "@/lib/academy-data";
import { PRODUCTS, type Product } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";

export interface MemberState {
  memberId: string;
  profile: { name: string; email: string; telegramHandle: string; joinedAt: string; avatarUrl: string };
  lifetimeDeposits: number;
  currentTier: Tier | undefined;
  nextTier: Tier | undefined;
  nextTierRemaining: number;
  progressPctToNext: number;
  isActive: boolean;
  /** DB-authoritative activity state: "active" | "grace" | "inactive". */
  activityStatus: "active" | "grace" | "inactive";
  monthlyLots: number;
  monthlyLotsRequired: number;
  unlockedProducts: Product[];
  lockedProducts: Product[];
  notifications: Notification[];
  unreadNotifications: number;
  /** false until the first Supabase load resolves; lets cards show skeletons if they want. */
  loaded: boolean;
}

/** Raw shape we pull from Supabase before deriving the tier maths. */
interface MemberInput {
  memberId: string;
  profile: { name: string; email: string; telegramHandle: string; joinedAt: string; avatarUrl: string };
  deposit: number;
  monthlyLots: number;
  activityStatus: "active" | "grace" | "inactive";
  /**
   * Vom Admin gesperrt (members.active = false).
   *
   * Das Feld wurde bisher NIRGENDS gelesen. "Zugang sperren" im Admin setzte
   * es, und in der Web-App aenderte sich nichts: der Gesperrte sah Signale,
   * Lektionen und Werkzeuge unveraendert weiter. Ein Schalter, der aussieht,
   * als entziehe er Zugang, aber keinen entzieht, ist schlimmer als kein
   * Schalter — man glaubt, es sei erledigt.
   */
  disabled: boolean;
  /**
   * Vom Admin geschenkter Vollzugang (Team, Tests, Partner-Demo).
   *
   * Ist er gesetzt, gilt DIESE Stufe statt der aus der Einzahlung berechneten.
   * Eine erfundene Einzahlung waere der falsche Weg gewesen: apply_broker_rollup
   * bucht die Differenz zwischen Broker-Summe und Kassenbuch — auch negativ —
   * und haette einen Handeintrag beim naechsten Abgleich wieder abgezogen.
   * Ausserdem soll ein geschenkter Zugang nirgends als Umsatz auftauchen.
   */
  tierOverride: string | null;
  notifications: Notification[];
  loaded: boolean;
}

const EMPTY_INPUT: MemberInput = {
  memberId: "",
  profile: { name: "", email: "", telegramHandle: "", joinedAt: "", avatarUrl: "" },
  deposit: 0,
  monthlyLots: 0,
  activityStatus: "active",
  disabled: false,
  tierOverride: null,
  notifications: [],
  loaded: false,
};

function progressBetween(deposit: number, current: Tier | undefined, next: Tier | undefined): number {
  if (!next) return 1;
  const lower = current?.minDeposit ?? 0;
  const upper = next.minDeposit;
  if (upper <= lower) return 1;
  return Math.max(0, Math.min(1, (deposit - lower) / (upper - lower)));
}

function deriveState(input: MemberInput): MemberState {
  const deposit = input.deposit;
  // Der Freibrief schlaegt die Einzahlung — aber nur nach OBEN. Wer bezahlt
  // hat, verliert nichts, falls jemand einen niedrigeren Wert eintraegt.
  const overrideTier = input.tierOverride
    ? TIERS.find((t) => t.key === input.tierOverride)
    : undefined;
  const byDeposit = tierForDeposit(deposit);
  const currentTier =
    overrideTier && (!byDeposit || TIERS.indexOf(overrideTier) > TIERS.indexOf(byDeposit))
      ? overrideTier
      : byDeposit;
  const nextTier = nextTierFor(deposit);
  const reached = currentTier ? TIERS.findIndex((t) => t.key === currentTier.key) : -1;
  const unlockedProducts = PRODUCTS.filter((p) => TIERS.findIndex((t) => t.key === p.requires) <= reached);
  const lockedProducts = PRODUCTS.filter((p) => !unlockedProducts.includes(p));
  return {
    memberId: input.memberId,
    profile: input.profile,
    lifetimeDeposits: deposit,
    currentTier,
    nextTier,
    nextTierRemaining: nextTier ? Math.max(0, nextTier.minDeposit - deposit) : 0,
    progressPctToNext: progressBetween(deposit, currentTier, nextTier),
    // DB-authoritative once activity enforcement is live; before a member has any
    // trades the server defaults them to "active", so a funded member isn't shown
    // inactive just for having 0 lots yet.
    isActive: input.activityStatus === "active" && deposit > 0,
    activityStatus: input.activityStatus,
    monthlyLots: input.monthlyLots,
    monthlyLotsRequired: ACTIVITY_MIN_LOTS_PER_MONTH,
    unlockedProducts,
    lockedProducts,
    notifications: input.notifications,
    unreadNotifications: input.notifications.filter((n) => !n.readAt).length,
    loaded: input.loaded,
  };
}

const MemberContext = createContext<MemberInput>(EMPTY_INPUT);

/** Load the signed-in member's row + notifications from Supabase. */
async function fetchMemberInput(): Promise<MemberInput> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { ...EMPTY_INPUT, loaded: true };

  // The academy tables (members/notifications) were added by migrations 001+ and
  // aren't in the generated Database types yet, so query through an untyped view
  // of the client (same pattern as useAdminStats). RLS still scopes every row.
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
        order: (col: string, o: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null }>;
      };
    };
  };

  const [{ data: member }, { data: notifRows }] = await Promise.all([
    client.from("members").select("id, name, email, telegram_handle, active, access_revoked, tier_override, deposit, monthly_lots, activity_status, joined_at, avatar_url").eq("auth_user_id", user.id).maybeSingle(),
    client.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }),
  ]);

  const notifications: Notification[] = (notifRows ?? []).map((n) => ({
    id: String(n.id),
    type: n.type as Notification["type"],
    title: String(n.title),
    body: String(n.body),
    link: (n.link as string | null) ?? undefined,
    createdAt: String(n.created_at),
    readAt: (n.read_at as string | null) ?? null,
  }));

  // Fall back to auth metadata for a just-registered member whose `members`
  // row hasn't been provisioned by the broker webhook yet.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    memberId: (member?.id as string) ?? "",
    profile: {
      name: (member?.name as string) ?? (typeof meta.name === "string" ? meta.name : "") ?? "",
      email: (member?.email as string) ?? user.email ?? "",
      telegramHandle: (member?.telegram_handle as string) ?? "",
      joinedAt: (member?.joined_at as string) ?? "",
      avatarUrl: (member?.avatar_url as string) ?? "",
    },
    // Gesperrt wird ueber die Einzahlung gesperrt, nicht ueber eine zweite
    // Abfrage an jeder Stelle: die Stufe und damit ALLES Freigeschaltete
    // leitet sich hieraus ab. Eine 0 schliesst deshalb zuverlaessig jede
    // Tuer, auch die, an die beim naechsten Feature niemand denkt.
    //
    // Geprueft wird access_revoked, NICHT active. `active` ist ein berechneter
    // Wert (recalculate_tier_after_deposit setzt active = deposit > 0) und ist
    // fuer 9 von 12 Mitgliedern schlicht "hat noch nicht eingezahlt" — daran
    // eine Sperre festzumachen waere sinnentstellt. access_revoked setzt nur
    // ein Mensch, und keine Verrechnung fasst es an (Migration 054).
    deposit: member?.access_revoked === true ? 0 : Number(member?.deposit ?? 0),
    disabled: member?.access_revoked === true,
    tierOverride: (member?.tier_override as string | null) ?? null,
    monthlyLots: Number(member?.monthly_lots ?? 0),
    activityStatus: ((member?.activity_status as string) ?? "active") as MemberInput["activityStatus"],
    notifications,
    loaded: true,
  };
}

// Separate context so components (e.g. the onboarding deposit-watcher) can
// force a re-fetch without prop-drilling — value is a stable function.
const MemberRefreshContext = createContext<() => void>(() => {});

export function MemberProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState<MemberInput>(EMPTY_INPUT);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchMemberInput()
        .then((next) => { if (alive) setInput(next); })
        .catch(() => { if (alive) setInput({ ...EMPTY_INPUT, loaded: true }); });
    };
    load();
    // Reload whenever auth state changes (sign-in after the registration gate).
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [refreshTick]);

  return createElement(
    MemberRefreshContext.Provider,
    { value: () => setRefreshTick((t) => t + 1) },
    createElement(MemberContext.Provider, { value: input }, children),
  );
}

export function useMemberState(): MemberState {
  const input = useContext(MemberContext);
  return useMemo(() => deriveState(input), [input]);
}

/** Force a live re-fetch of the member row (deposit watcher, post-action refresh). */
export function useMemberRefresh(): () => void {
  return useContext(MemberRefreshContext);
}
