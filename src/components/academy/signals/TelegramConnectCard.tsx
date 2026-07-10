import { useState } from "react";
import { CheckCircle2, Link2, Send } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { useMemberState } from "@/hooks/useMemberState";
import { cn } from "@/lib/utils";

// Replace with the real bot username once created via @BotFather.
const BOT_USERNAME = "AgentTradingRelayBot";
const STORAGE_KEY = "academy_telegram_linked";

/**
 * 3-step onboarding into the signal channel:
 * deposit verified → link Telegram account → join channel.
 * Until Supabase is live, the "linked" state is a local demo toggle;
 * in production the deep link carries a per-member token issued
 * server-side (telegram_links table) and the bot flips the status.
 */
export function TelegramConnectCard() {
  const state = useMemberState();
  const depositVerified = !!state.currentTier;
  const [linked, setLinked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  function connect() {
    // Production: open t.me/<bot>?start=<link_token from telegram_links>.
    window.open(`https://t.me/${BOT_USERNAME}?start=demo`, "_blank", "noopener");
    localStorage.setItem(STORAGE_KEY, "1");
    setLinked(true);
  }

  const steps = [
    {
      title: "Deposit verified",
      sub: depositVerified ? `${state.currentTier!.name} tier active` : "Deposit €100+ with our partner broker",
      done: depositVerified,
      icon: CheckCircle2,
    },
    {
      title: "Connect Telegram",
      sub: linked ? "Account linked to your membership" : "One tap — links your Telegram to this account",
      done: linked,
      icon: Link2,
    },
    {
      title: "Join the channel",
      sub: linked ? "Your personal invite arrives in the bot chat" : "Unlocks after connecting",
      done: false,
      icon: Send,
    },
  ];

  return (
    <Card variant="surface" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">Get into the signal channel</h2>
        {linked && (
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setLinked(false); }}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Reset (demo)
          </button>
        )}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isNext = !s.done && steps.slice(0, i).every((p) => p.done);
          return (
            <div
              key={s.title}
              className={cn(
                "rounded-2xl border p-3.5 transition-all",
                s.done ? "border-primary/40 bg-primary/10" : isNext ? "border-white/15 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60",
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  s.done ? "bg-primary/25 text-primary" : "bg-white/10 text-muted-foreground",
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">STEP {i + 1}</span>
                {s.done && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
              </div>
              <div className="mt-2 text-sm font-semibold leading-tight">{s.title}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.sub}</div>
              {s.title === "Connect Telegram" && isNext && depositVerified && (
                <button
                  onClick={connect}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-lime)] hover:opacity-90"
                >
                  <Send className="h-3.5 w-3.5" /> Connect now
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
