import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bell, BellRing, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import artInbox from "@/assets/a-inbox.jpg";
import { useMemberState } from "@/hooks/useMemberState";
import { Card } from "@/components/academy/primitives/Card";
import { PageHero } from "@/components/academy/primitives/PageHero";
import { type Notification } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Cosmos Candles Academy" },
      { name: "description", content: "Your inbox." },
    ],
  }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<Notification["type"], React.ElementType> = {
  tier_unlocked: Sparkles,
  close_to_next_tier: TrendingUp,
  inactive_warning: AlertTriangle,
  new_lesson: BookOpen,
  announcement: BellRing,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationsPage() {
  const state = useMemberState();
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(state.notifications.filter((n) => n.readAt).map((n) => n.id)),
  );

  function markAll() {
    setReadIds(new Set(state.notifications.map((n) => n.id)));
  }

  const unread = state.notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes cosmo-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .cosmo-float { animation: cosmo-float 4s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .cosmo-float { animation: none } }
      `}</style>
      <PageHero
        eyebrow="Inbox"
        title="Notifications"
        art={artInbox}
        aside={
          unread > 0 ? (
            <button
              onClick={markAll}
              className="shrink-0 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      >
        {unread > 0 ? (
          <>
            <span className="font-semibold text-foreground">{unread} unread</span> — tier unlocks, new lessons and
            deposit confirmations land here.
          </>
        ) : (
          "All caught up — tier unlocks, new lessons and deposit confirmations land here."
        )}
      </PageHero>

      {state.notifications.length === 0 && (
        <div className="flex flex-col items-center gap-5 rounded-[var(--radius)] border border-dashed border-white/10 bg-[color:var(--surface-2)] px-6 py-14 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--primary) 45%, transparent), transparent 70%)" }}
              aria-hidden
            />
            <img
              src="/cosmo/cosmo-head.png"
              alt="Cosmo"
              className="cosmo-float relative h-24 w-24 object-contain drop-shadow-xl"
            />
          </div>
          <div className="max-w-[46ch] space-y-1.5">
            <h2 className="font-display text-xl font-bold text-balance">You're all caught up</h2>
            <p className="text-sm text-muted-foreground">
              No notifications yet. Cosmo will ping you here the moment you unlock a new tier, a fresh lesson drops, or your deposit gets verified. Keep learning and they'll roll in.
            </p>
          </div>
          <Link
            to="/lessons"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] hover:opacity-90 transition-opacity"
          >
            Continue learning
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {state.notifications.map((n) => {
          const isRead = readIds.has(n.id);
          const Icon = TYPE_ICON[n.type] ?? Bell;
          const inner = (
            <Card
              variant="surface"
              className={cn("flex items-start gap-4 p-4 transition-opacity", isRead && "opacity-60")}
              onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
            >
              <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", isRead ? "bg-white/5 text-muted-foreground" : "bg-primary/15 text-primary")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{n.title}</span>
                  {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</div>
              </div>
            </Card>
          );

          if (n.link) {
            return (
              <Link key={n.id} to={n.link as "/"} className="block">
                {inner}
              </Link>
            );
          }
          return <div key={n.id}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
