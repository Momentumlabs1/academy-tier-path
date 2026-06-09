import type { TierKey } from "./academy-data";

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  deposit: number;
  monthlyLots: number;
  joinedAt: string;
  tier: TierKey | null;
  active: boolean;
  telegramHandle: string;
  affiliate: string | null;
}

export const ADMIN_MEMBERS: AdminMember[] = [
  { id: "m1", name: "Demo Trader", email: "demo@trader.dev", deposit: 1500, monthlyLots: 0.14, joinedAt: "2026-04-18", tier: "foundation", active: true, telegramHandle: "@demo_trader", affiliate: null },
  { id: "m2", name: "Alice Weber", email: "alice@weber.at", deposit: 3200, monthlyLots: 0.22, joinedAt: "2026-03-05", tier: "operator", active: true, telegramHandle: "@alice_w", affiliate: "fx-elite" },
  { id: "m3", name: "Bob Müller", email: "bob@mueller.de", deposit: 150, monthlyLots: 0.08, joinedAt: "2026-05-01", tier: "foundation", active: false, telegramHandle: "@bob_m", affiliate: null },
  { id: "m4", name: "Maria Schmidt", email: "maria@schmidt.de", deposit: 52000, monthlyLots: 1.45, joinedAt: "2025-11-20", tier: "elite", active: true, telegramHandle: "@maria_s", affiliate: null },
  { id: "m5", name: "Klaus Fischer", email: "k.fischer@gmail.com", deposit: 8500, monthlyLots: 0.31, joinedAt: "2026-01-14", tier: "operator", active: true, telegramHandle: "@klausf", affiliate: "crypto-masters" },
  { id: "m6", name: "Sarah Jung", email: "sarah.jung@web.de", deposit: 750, monthlyLots: 0.12, joinedAt: "2026-04-28", tier: "foundation", active: true, telegramHandle: "@sarah_j", affiliate: null },
  { id: "m7", name: "Tom Bauer", email: "t.bauer@outlook.com", deposit: 0, monthlyLots: 0, joinedAt: "2026-05-31", tier: null, active: false, telegramHandle: "@tombauer", affiliate: null },
  { id: "m8", name: "Anna Lehmann", email: "anna.lehmann@web.de", deposit: 4100, monthlyLots: 0.19, joinedAt: "2026-02-22", tier: "operator", active: true, telegramHandle: "@anna_l", affiliate: "fx-elite" },
  { id: "m9", name: "Felix Koch", email: "felix.koch@gmail.com", deposit: 65000, monthlyLots: 2.1, joinedAt: "2025-09-10", tier: "elite", active: true, telegramHandle: "@felixk", affiliate: null },
  { id: "m10", name: "Jana Wolf", email: "jana.wolf@gmx.de", deposit: 400, monthlyLots: 0.0, joinedAt: "2026-05-15", tier: "foundation", active: false, telegramHandle: "@jana_w", affiliate: "crypto-masters" },
];

export interface DepositEvent {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  type: "deposit" | "withdrawal";
  tierBefore: TierKey | null;
  tierAfter: TierKey | null;
  createdAt: string;
  note: string;
}

export const DEPOSITS_LEDGER: DepositEvent[] = [
  { id: "d1",  memberId: "m9",  memberName: "Felix Koch",    amount: 65000, type: "deposit",    tierBefore: null,         tierAfter: "elite",    createdAt: "2025-09-10T09:15:00Z", note: "Initial deposit via FXPro" },
  { id: "d2",  memberId: "m4",  memberName: "Maria Schmidt", amount: 50000, type: "deposit",    tierBefore: null,         tierAfter: "elite",    createdAt: "2025-11-20T11:30:00Z", note: "Initial deposit" },
  { id: "d3",  memberId: "m4",  memberName: "Maria Schmidt", amount: 2000,  type: "deposit",    tierBefore: "elite",      tierAfter: "elite",    createdAt: "2025-12-01T14:00:00Z", note: "Top-up" },
  { id: "d4",  memberId: "m5",  memberName: "Klaus Fischer", amount: 5000,  type: "deposit",    tierBefore: null,         tierAfter: "operator", createdAt: "2026-01-14T10:22:00Z", note: "Initial via IC Markets" },
  { id: "d5",  memberId: "m5",  memberName: "Klaus Fischer", amount: 3500,  type: "deposit",    tierBefore: "operator",   tierAfter: "operator", createdAt: "2026-02-03T16:45:00Z", note: "Top-up" },
  { id: "d6",  memberId: "m8",  memberName: "Anna Lehmann",  amount: 4100,  type: "deposit",    tierBefore: null,         tierAfter: "operator", createdAt: "2026-02-22T09:00:00Z", note: "Initial deposit" },
  { id: "d7",  memberId: "m2",  memberName: "Alice Weber",   amount: 2000,  type: "deposit",    tierBefore: null,         tierAfter: "operator", createdAt: "2026-03-05T13:10:00Z", note: "Initial via XM" },
  { id: "d8",  memberId: "m2",  memberName: "Alice Weber",   amount: 1200,  type: "deposit",    tierBefore: "operator",   tierAfter: "operator", createdAt: "2026-03-28T15:00:00Z", note: "Top-up" },
  { id: "d9",  memberId: "m1",  memberName: "Demo Trader",   amount: 1000,  type: "deposit",    tierBefore: null,         tierAfter: "foundation",createdAt: "2026-04-18T08:30:00Z", note: "Initial deposit" },
  { id: "d10", memberId: "m1",  memberName: "Demo Trader",   amount: 500,   type: "deposit",    tierBefore: "foundation", tierAfter: "foundation",createdAt: "2026-04-25T11:00:00Z", note: "Top-up" },
  { id: "d11", memberId: "m6",  memberName: "Sarah Jung",    amount: 750,   type: "deposit",    tierBefore: null,         tierAfter: "foundation",createdAt: "2026-04-28T14:20:00Z", note: "Initial deposit" },
  { id: "d12", memberId: "m3",  memberName: "Bob Müller",    amount: 150,   type: "deposit",    tierBefore: null,         tierAfter: "foundation",createdAt: "2026-05-01T09:45:00Z", note: "Initial deposit" },
  { id: "d13", memberId: "m10", memberName: "Jana Wolf",     amount: 400,   type: "deposit",    tierBefore: null,         tierAfter: "foundation",createdAt: "2026-05-15T10:30:00Z", note: "Initial deposit" },
  { id: "d14", memberId: "m9",  memberName: "Felix Koch",    amount: -5000, type: "withdrawal", tierBefore: "elite",      tierAfter: "elite",    createdAt: "2026-05-20T16:00:00Z", note: "Partial withdrawal" },
  { id: "d15", memberId: "m7",  memberName: "Tom Bauer",     amount: 0,     type: "deposit",    tierBefore: null,         tierAfter: null,       createdAt: "2026-05-31T08:00:00Z", note: "Account created, no deposit yet" },
];

export interface AuditEvent {
  id: string;
  actorEmail: string;
  action: "member_created" | "tier_changed" | "deposit_verified" | "lesson_updated" | "member_deactivated" | "broadcast_sent" | "affiliate_created" | "role_assigned";
  target: string;
  detail: string;
  createdAt: string;
}

export const AUDIT_LOG: AuditEvent[] = [
  { id: "a1",  actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Felix Koch",    detail: "New member registered via affiliate link",         createdAt: "2025-09-10T09:14:00Z" },
  { id: "a2",  actorEmail: "system",                  action: "tier_changed",       target: "Felix Koch",    detail: "null → elite (deposit: €65,000)",                  createdAt: "2025-09-10T09:16:00Z" },
  { id: "a3",  actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Maria Schmidt", detail: "New member registered",                            createdAt: "2025-11-20T11:29:00Z" },
  { id: "a4",  actorEmail: "system",                  action: "tier_changed",       target: "Maria Schmidt", detail: "null → elite (deposit: €50,000)",                  createdAt: "2025-11-20T11:31:00Z" },
  { id: "a5",  actorEmail: "kontakt@momentumlabs.at", action: "lesson_updated",    target: "l4",            detail: "Updated: Support, Resistance & Trend (tier: operator)", createdAt: "2025-12-05T14:00:00Z" },
  { id: "a6",  actorEmail: "kontakt@momentumlabs.at", action: "affiliate_created", target: "fx-elite",      detail: "New affiliate tenant: FX Elite Network",           createdAt: "2025-12-10T10:00:00Z" },
  { id: "a7",  actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Klaus Fischer", detail: "New member via fx-elite affiliate",                createdAt: "2026-01-14T10:21:00Z" },
  { id: "a8",  actorEmail: "system",                  action: "tier_changed",       target: "Klaus Fischer", detail: "null → operator (deposit: €5,000)",                createdAt: "2026-01-14T10:23:00Z" },
  { id: "a9",  actorEmail: "kontakt@momentumlabs.at", action: "affiliate_created", target: "crypto-masters",detail: "New affiliate tenant: Crypto Masters Club",         createdAt: "2026-02-01T09:00:00Z" },
  { id: "a10", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Anna Lehmann",  detail: "New member registered",                            createdAt: "2026-02-22T08:59:00Z" },
  { id: "a11", actorEmail: "system",                  action: "tier_changed",       target: "Anna Lehmann",  detail: "null → operator (deposit: €4,100)",                createdAt: "2026-02-22T09:01:00Z" },
  { id: "a12", actorEmail: "kontakt@momentumlabs.at", action: "broadcast_sent",    target: "all members",   detail: "Broadcast: Live session Friday 19:00 CET",         createdAt: "2026-02-28T11:00:00Z" },
  { id: "a13", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Alice Weber",   detail: "New member via fx-elite affiliate",                createdAt: "2026-03-05T13:09:00Z" },
  { id: "a14", actorEmail: "system",                  action: "tier_changed",       target: "Alice Weber",   detail: "null → operator (deposit: €2,000)",                createdAt: "2026-03-05T13:11:00Z" },
  { id: "a15", actorEmail: "kontakt@momentumlabs.at", action: "lesson_updated",    target: "l7",            detail: "Updated: The Live Trading Room — added video link", createdAt: "2026-03-15T16:30:00Z" },
  { id: "a16", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Demo Trader",   detail: "New member registered",                            createdAt: "2026-04-18T08:29:00Z" },
  { id: "a17", actorEmail: "system",                  action: "tier_changed",       target: "Demo Trader",   detail: "null → foundation (deposit: €1,000)",              createdAt: "2026-04-18T08:31:00Z" },
  { id: "a18", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Sarah Jung",    detail: "New member registered",                            createdAt: "2026-04-28T14:19:00Z" },
  { id: "a19", actorEmail: "system",                  action: "tier_changed",       target: "Sarah Jung",    detail: "null → foundation (deposit: €750)",                createdAt: "2026-04-28T14:21:00Z" },
  { id: "a20", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Bob Müller",    detail: "New member registered",                            createdAt: "2026-05-01T09:44:00Z" },
  { id: "a21", actorEmail: "system",                  action: "tier_changed",       target: "Bob Müller",    detail: "null → foundation (deposit: €150)",                createdAt: "2026-05-01T09:46:00Z" },
  { id: "a22", actorEmail: "kontakt@momentumlabs.at", action: "member_deactivated",target: "Bob Müller",    detail: "Activity warning sent: 0.08 lots / 0.1 required",  createdAt: "2026-05-12T10:00:00Z" },
  { id: "a23", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Jana Wolf",     detail: "New member via crypto-masters affiliate",          createdAt: "2026-05-15T10:29:00Z" },
  { id: "a24", actorEmail: "system",                  action: "tier_changed",       target: "Jana Wolf",     detail: "null → foundation (deposit: €400)",                createdAt: "2026-05-15T10:31:00Z" },
  { id: "a25", actorEmail: "kontakt@momentumlabs.at", action: "broadcast_sent",    target: "operator+",     detail: "Broadcast to Operator+: New Operator lessons live",createdAt: "2026-05-20T12:00:00Z" },
  { id: "a26", actorEmail: "kontakt@momentumlabs.at", action: "member_created",    target: "Tom Bauer",     detail: "New member registered, no deposit yet",            createdAt: "2026-05-31T07:59:00Z" },
  { id: "a27", actorEmail: "kontakt@momentumlabs.at", action: "lesson_updated",    target: "l4",            detail: "Published: Support, Resistance & Trend",           createdAt: "2026-06-04T14:25:00Z" },
  { id: "a28", actorEmail: "system",                  action: "tier_changed",       target: "Demo Trader",   detail: "foundation (deposit increased to €1,500)",         createdAt: "2026-04-25T11:01:00Z" },
];

// Deposit chart data: last 30 days (cumulative + daily)
export const DEPOSIT_CHART: { date: string; cumulative: number; daily: number }[] = [
  { date: "May 7",  cumulative: 130550, daily: 0 },
  { date: "May 8",  cumulative: 130550, daily: 0 },
  { date: "May 9",  cumulative: 130550, daily: 0 },
  { date: "May 10", cumulative: 130550, daily: 0 },
  { date: "May 11", cumulative: 130550, daily: 0 },
  { date: "May 12", cumulative: 130550, daily: 0 },
  { date: "May 13", cumulative: 130550, daily: 0 },
  { date: "May 14", cumulative: 130550, daily: 0 },
  { date: "May 15", cumulative: 130950, daily: 400 },
  { date: "May 16", cumulative: 130950, daily: 0 },
  { date: "May 17", cumulative: 130950, daily: 0 },
  { date: "May 18", cumulative: 130950, daily: 0 },
  { date: "May 19", cumulative: 130950, daily: 0 },
  { date: "May 20", cumulative: 125950, daily: -5000 },
  { date: "May 21", cumulative: 125950, daily: 0 },
  { date: "May 22", cumulative: 125950, daily: 0 },
  { date: "May 23", cumulative: 125950, daily: 0 },
  { date: "May 24", cumulative: 125950, daily: 0 },
  { date: "May 25", cumulative: 125950, daily: 0 },
  { date: "May 26", cumulative: 125950, daily: 0 },
  { date: "May 27", cumulative: 125950, daily: 0 },
  { date: "May 28", cumulative: 125950, daily: 0 },
  { date: "May 29", cumulative: 125950, daily: 0 },
  { date: "May 30", cumulative: 125950, daily: 0 },
  { date: "May 31", cumulative: 125950, daily: 0 },
  { date: "Jun 1",  cumulative: 125950, daily: 0 },
  { date: "Jun 2",  cumulative: 125950, daily: 0 },
  { date: "Jun 3",  cumulative: 125950, daily: 0 },
  { date: "Jun 4",  cumulative: 125950, daily: 0 },
  { date: "Jun 5",  cumulative: 135600, daily: 9650 },
];

export const ADMIN_KPI = {
  totalMembers: 10,
  activeMembers: 7,
  totalDeposits: 135600,
  newThisMonth: 3,
  tierBreakdown: [
    { tier: "No tier",   count: 1, color: "oklch(0.5 0.02 250)" },
    { tier: "Foundation", count: 4, color: "oklch(0.78 0.16 150)" },
    { tier: "Operator",   count: 3, color: "oklch(0.7 0.18 270)" },
    { tier: "Elite",      count: 2, color: "oklch(0.82 0.16 80)" },
  ],
};
