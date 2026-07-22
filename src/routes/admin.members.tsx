import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/academy/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/members")({
  head: () => ({ meta: [{ title: "Members — Admin" }] }),
  component: AdminMembers,
});

type SortKey = "name" | "deposit" | "monthlyLots" | "joinedAt";

// Shape the table UI needs — mapped from the `members` DB row (snake_case).
interface Member {
  id: string;
  name: string;
  email: string;
  deposit: number;
  monthlyLots: number;
  joinedAt: string;
  tier: TierKey | null;
  active: boolean;
  telegramHandle: string | null;
  affiliate: string | null;
}

// Live members from Supabase. Until the DB has rows — or if the query fails —
// we fall back to an empty list, never to fake demo numbers.
function useMembers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Member[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          };
        };
      };
      const { data, error } = await client
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) {
        setRows([]);
        setError(error.message);
        setLoading(false);
        return;
      }
      const mapped: Member[] = (data ?? []).map((r) => ({
        id: String(r.id),
        name: String(r.name ?? r.email ?? "—"),
        email: String(r.email ?? ""),
        deposit: Number(r.deposit ?? 0),
        monthlyLots: Number(r.monthly_lots ?? 0),
        joinedAt: String(r.joined_at ?? r.created_at ?? "").slice(0, 10),
        tier: (r.tier as TierKey | null) ?? null,
        active: Boolean(r.active),
        telegramHandle: (r.telegram_handle as string | null) ?? null,
        affiliate: (r.affiliate_slug as string | null) ?? null,
      }));
      setRows(mapped);
      setError(null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { loading, error, rows };
}

const TIER_COLORS: Record<string, string> = {
  foundation: "oklch(0.78 0.16 150)",
  operator: "oklch(0.7 0.18 270)",
  elite: "oklch(0.82 0.16 80)",
};

function TierPill({ tier }: { tier: string | null }) {
  if (!tier) return <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">No tier</span>;
  const t = TIERS.find((x) => x.key === tier);
  if (!t) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
      style={{ backgroundColor: `color-mix(in oklch, ${t.color} 18%, transparent)`, color: t.color }}
    >
      {t.name}
    </span>
  );
}

function AdminMembers() {
  const { loading, error, rows } = useMembers();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  }

  const filtered = rows
    .filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "deposit") return mul * (a.deposit - b.deposit);
      if (sortKey === "monthlyLots") return mul * (a.monthlyLots - b.monthlyLots);
      if (sortKey === "joinedAt") return mul * (a.joinedAt.localeCompare(b.joinedAt));
      return 0;
    });

  function Th({ label, k }: { label: string; k?: SortKey }) {
    const active = k && sortKey === k;
    return (
      <th
        className={cn("py-3 pl-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground", k && "cursor-pointer hover:text-foreground")}
        onClick={k ? () => toggleSort(k) : undefined}
      >
        {label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  const totalDeposit = filtered.reduce((s, m) => s + m.deposit, 0);
  const active = filtered.filter((m) => m.active).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Members"
        sub={`${filtered.length} members · ${active} active · ${formatMoney(totalDeposit, "€")} total`}
      />

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Couldn't load data: {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[oklch(0.16_0.06_250)] pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 sm:max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[oklch(0.16_0.06_250)]">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-white/5">
            <tr>
              <Th label="Name" k="name" />
              <Th label="Tier" />
              <Th label="Deposit" k="deposit" />
              <Th label="Lots/mo" k="monthlyLots" />
              <Th label="Activity" />
              <Th label="Affiliate" />
              <Th label="Joined" k="joinedAt" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((m: Member) => (
              <tr key={m.id} className="group hover:bg-white/[0.03] transition-colors">
                <td className="py-3 pl-4 pr-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-[oklch(0.7_0.2_290)] text-[11px] font-bold text-primary-foreground">
                      {m.name.charAt(0)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pl-4"><TierPill tier={m.tier} /></td>
                <td className="py-3 pl-4 font-mono text-sm">{m.deposit > 0 ? formatMoney(m.deposit, "€") : "—"}</td>
                <td className="py-3 pl-4 font-mono text-sm">{m.monthlyLots.toFixed(2)}</td>
                <td className="py-3 pl-4">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    m.active ? "bg-[oklch(0.78_0.16_150)]/15 text-[oklch(0.78_0.16_150)]" : "bg-amber-400/10 text-amber-400",
                  )}>
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 pl-4 text-xs text-muted-foreground">{m.affiliate ?? "—"}</td>
                <td className="py-3 pl-4 text-xs text-muted-foreground">{m.joinedAt || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="h-6 w-6 text-muted-foreground/60" />
            <div className="text-sm text-muted-foreground">No members yet.</div>
            <div className="text-[11px] text-muted-foreground/70">No data yet — as soon as members sign up, they'll show up here.</div>
          </div>
        )}

        {!loading && rows.length > 0 && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No members match your search.</div>
        )}
      </div>
    </div>
  );
}
