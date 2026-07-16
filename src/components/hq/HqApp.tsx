import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { Bell, Brain, CalendarCheck2, Rocket, Settings, X } from "lucide-react";
import { hq } from "@/integrations/hq/client";
import { fetchNotifications, markNotificationsRead } from "@/lib/hq/api";
import { cn } from "@/lib/utils";
import { LoginScreen } from "./LoginScreen";
import { TodayTab } from "./TodayTab";
import { VenturesTab } from "./VenturesTab";
import { BrainTab } from "./BrainTab";
import { SettingsTab } from "./SettingsTab";
import { LoadingRow } from "./primitives";

type Tab = "today" | "ventures" | "brain" | "settings";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "today", label: "Heute", icon: CalendarCheck2 },
  { key: "ventures", label: "Ventures", icon: Rocket },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "settings", label: "Setup", icon: Settings },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Späte Session";
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Servus";
  return "Guten Abend";
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const feed = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });

  useEffect(() => {
    markNotificationsRead()
      .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))
      .catch(() => {});
  }, [qc]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mt-auto max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">🔔 Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {feed.isLoading ? (
          <LoadingRow />
        ) : (feed.data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Noch keine Notifications — der Morning Brief kommt automatisch.
          </p>
        ) : (
          <div className="space-y-3">
            {(feed.data ?? []).map((n) => (
              <div key={n.id} className="rounded-xl bg-white/[0.04] p-3.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("de-AT", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/75">
                  {n.body}
                </p>
                <div className="mt-1.5 text-[10px] text-muted-foreground">
                  via {n.sent_via.join(" · ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HqApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("today");
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    hq.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = hq.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const feed = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: !!session,
    refetchInterval: 5 * 60_000,
  });
  const unread = (feed.data ?? []).filter((n) => !n.read_at).length;

  if (session === undefined) {
    return <div className="min-h-dvh bg-background" />;
  }
  if (!session) {
    return <LoginScreen />;
  }

  const dateLabel = new Date().toLocaleDateString("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <div className="font-display text-lg font-bold leading-tight">
              {greeting()}, Diego 👋
            </div>
            <div className="text-[11px] text-muted-foreground">{dateLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowFeed(true)}
            aria-label="Notifications öffnen"
            className="relative rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                {unread}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        {tab === "today" ? <TodayTab /> : null}
        {tab === "ventures" ? <VenturesTab /> : null}
        {tab === "brain" ? <BrainTab /> : null}
        {tab === "settings" ? <SettingsTab userEmail={session.user.email ?? ""} /> : null}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-surface-1/90 backdrop-blur-lg">
        <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
                tab === t.key ? "text-primary" : "text-muted-foreground",
              )}
            >
              <t.icon
                className={cn(
                  "h-5 w-5",
                  tab === t.key && "drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]",
                )}
              />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {showFeed ? <NotificationsPanel onClose={() => setShowFeed(false)} /> : null}
    </div>
  );
}
