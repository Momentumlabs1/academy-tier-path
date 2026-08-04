import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import artSettings from "@/assets/a-settings.jpg";
import { useMemberState } from "@/hooks/useMemberState";
import { AvatarUploader } from "@/components/academy/settings/AvatarUploader";
import { Card } from "@/components/academy/primitives/Card";
import { PageHero } from "@/components/academy/primitives/PageHero";
import { formatMoney, formatDate } from "@/lib/format";
import { TierTag } from "@/components/academy/primitives/TierTag";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cosmos Candles Academy" },
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
  // Local echo so the new picture shows instantly, before the member state refetches.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const rows = [
    { label: "Name", value: profile.name || "—" },
    { label: "Email", value: profile.email || "—" },
    { label: "Telegram", value: profile.telegramHandle || "Not connected" },
    { label: "Deposit", value: formatMoney(state.lifetimeDeposits, "€") },
    { label: "Joined", value: profile.joinedAt ? formatDate(profile.joinedAt) : "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Your account" title="Settings" art={artSettings}>
        Your details are synced automatically from the Cosmos Candles onboarding bot. Need a change? Message
        support and we'll update it for you.
      </PageHero>

      <Card variant="surface" className="micro-lift">
        <div className="border-b border-white/5 p-6">
          <div className="mb-4">
            <div className="font-display text-lg font-bold">{displayName}</div>
            {tier ? (
              <TierTag tier={tier.key} />
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Below Foundation</span>
            )}
          </div>
          <AvatarUploader
            name={profile.name}
            email={profile.email}
            avatarUrl={avatarUrl ?? profile.avatarUrl}
            onChange={setAvatarUrl}
          />
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
