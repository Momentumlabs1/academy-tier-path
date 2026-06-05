import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, BookOpen, LogIn, RefreshCw, Shield, UserPlus, Users, Zap,
} from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { AUDIT_LOG, type AuditEvent } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Admin" }] }),
  component: AdminAudit,
});

const ACTION_META: Record<AuditEvent["action"], { label: string; icon: React.ElementType; color: string }> = {
  member_created:    { label: "Member created",    icon: UserPlus,   color: "text-[oklch(0.78_0.16_150)]" },
  tier_changed:      { label: "Tier changed",      icon: RefreshCw,  color: "text-[oklch(0.7_0.18_270)]" },
  deposit_verified:  { label: "Deposit verified",  icon: Shield,     color: "text-primary" },
  lesson_updated:    { label: "Lesson updated",    icon: BookOpen,   color: "text-[oklch(0.82_0.16_80)]" },
  member_deactivated:{ label: "Member warning",    icon: Bell,       color: "text-amber-400" },
  broadcast_sent:    { label: "Broadcast sent",    icon: Zap,        color: "text-primary" },
  affiliate_created: { label: "Affiliate created", icon: Users,      color: "text-[oklch(0.7_0.18_270)]" },
  role_assigned:     { label: "Role assigned",     icon: LogIn,      color: "text-muted-foreground" },
};

const ALL_ACTIONS = Object.keys(ACTION_META) as AuditEvent["action"][];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function AdminAudit() {
  const [filter, setFilter] = useState<AuditEvent["action"] | "all">("all");
  const events = [...AUDIT_LOG]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((e) => filter === "all" || e.action === filter);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Audit Log" sub={`${events.length} events${filter !== "all" ? " (filtered)" : ""}`} />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground")}
        >
          All
        </button>
        {ALL_ACTIONS.map((a) => {
          const meta = ACTION_META[a];
          return (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === a ? "bg-white/15 text-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground")}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Log entries */}
      <div className="space-y-1.5">
        {events.map((e) => {
          const meta = ACTION_META[e.action];
          const Icon = meta.icon;
          return (
            <div key={e.id} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)] px-4 py-3">
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5", meta.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold">{e.target}</span>
                  <span className={cn("text-xs font-medium", meta.color)}>{meta.label}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                  <span>{e.actorEmail}</span>
                  <span>·</span>
                  <span>{timeAgo(e.createdAt)}</span>
                  <span>·</span>
                  <span title={e.createdAt}>{new Date(e.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No events for this filter.</div>
        )}
      </div>
    </div>
  );
}
