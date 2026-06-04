import { createFileRoute } from "@tanstack/react-router";
import { CURRENT_MEMBER, tierForDeposit } from "@/lib/academy-data";
import { TierBadge } from "@/components/academy/TierBadge";

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
  const tier = tierForDeposit(CURRENT_MEMBER.deposit);
  const rows = [
    { label: "Name", value: CURRENT_MEMBER.name },
    { label: "Email", value: CURRENT_MEMBER.email },
    { label: "Telegram", value: CURRENT_MEMBER.telegramHandle },
    { label: "Deposit", value: `$${CURRENT_MEMBER.deposit.toLocaleString()}` },
    { label: "Joined", value: new Date(CURRENT_MEMBER.joinedAt).toLocaleDateString() },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Account details forwarded from the onboarding bot. Edits go through support.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-border p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-accent text-lg font-semibold">
            {CURRENT_MEMBER.name.charAt(0)}
          </div>
          <div>
            <div className="text-lg font-semibold">{CURRENT_MEMBER.name}</div>
            <TierBadge tier={tier.key} />
          </div>
        </div>
        <dl className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-6 py-4 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}