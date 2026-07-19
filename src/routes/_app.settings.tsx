import { createFileRoute } from "@tanstack/react-router";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { formatMoney, formatDate } from "@/lib/format";
import { TierTag } from "@/components/academy/primitives/TierTag";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Agent Trading Academy" },
      { name: "description", content: "Account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useMemberState();
  const tier = state.currentTier;
  const { profile } = state;
  const displayName = profile.name || profile.email || "—";
  const rows = [
    { label: "Name", value: profile.name || "—" },
    { label: "Email", value: profile.email || "—" },
    { label: "Telegram", value: profile.telegramHandle || "Not connected" },
    { label: "Deposit", value: formatMoney(state.lifetimeDeposits, "€") },
    { label: "Joined", value: profile.joinedAt ? formatDate(profile.joinedAt) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Account synced from your onboarding bot. Contact support to edit.</p>
      </div>

      <Card variant="surface" className="micro-lift">
        <div className="flex items-center gap-4 border-b border-white/5 p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.7_0.2_290)] text-lg font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-lg font-bold">{displayName}</div>
            {tier ? (
              <TierTag tier={tier.key} />
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Below Foundation</span>
            )}
          </div>
        </div>
        <dl className="divide-y divide-white/5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-6 py-4 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
