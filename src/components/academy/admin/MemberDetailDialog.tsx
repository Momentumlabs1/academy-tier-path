import { useState } from "react";
import { Loader2, ShieldCheck, Trash2, X, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, tierForDeposit, type TierKey } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";

export interface MemberRow {
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

/**
 * Member detail sheet — opened by clicking a row in /admin/members.
 *
 * Shows the account at a glance and carries the admin-only actions: unlocking a
 * member at a chosen deposit level (for friends/testers who never went through
 * the broker), toggling access, and deleting the row.
 *
 * The tier is derived from `members.deposit` (see tierForDeposit), so writing the
 * deposit is what actually unlocks content. Every unlock also writes a
 * `deposit_events` + `audit_log` entry flagged as manual, so a comped account
 * stays distinguishable from a real broker deposit.
 */
export function MemberDetailDialog({
  member,
  onClose,
  onChanged,
  onDeleted,
}: {
  member: MemberRow;
  onClose: () => void;
  onChanged: (patch: Partial<MemberRow>) => void;
  onDeleted: () => void;
}) {
  const [amount, setAmount] = useState(String(member.deposit > 0 ? member.deposit : 5000));
  const [note, setNote] = useState("Manual unlock — comped account, no real deposit");
  const [busy, setBusy] = useState<null | "unlock" | "toggle" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parsed = Number(amount.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const resultTier = valid ? tierForDeposit(parsed) : undefined;
  const tierName = resultTier?.name ?? "No tier";

  // `deposit_events` / `audit_log` aren't in the generated Database types — query untyped.
  const client = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
      };
      insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
  };

  async function unlock() {
    if (!valid || busy) return;
    setBusy("unlock");
    setError(null);

    const nextTier = (resultTier?.key ?? null) as TierKey | null;
    const { error: upErr } = await client
      .from("members")
      .update({
        deposit: parsed,
        tier: nextTier,
        active: parsed > 0,
        activity_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.id);

    if (upErr) {
      setError(upErr.message);
      setBusy(null);
      return;
    }

    const trail = note.trim() || "Manual unlock";
    await client.from("deposit_events").insert({
      member_id: member.id,
      amount: parsed,
      type: "deposit",
      tier_before: member.tier,
      tier_after: nextTier,
      note: trail,
    });
    await client.from("audit_log").insert({
      action: "tier_changed",
      target: member.email || member.id,
      detail: `Manual unlock → ${formatMoney(parsed, "€")} (${tierName}). ${trail}`,
    });

    onChanged({ deposit: parsed, tier: nextTier, active: parsed > 0 });
    setBusy(null);
    onClose();
  }

  async function toggleActive() {
    if (busy) return;
    setBusy("toggle");
    setError(null);
    const next = !member.active;
    const { error: e } = await client
      .from("members")
      .update({ active: next, activity_status: next ? "active" : "inactive", updated_at: new Date().toISOString() })
      .eq("id", member.id);
    if (e) {
      setError(e.message);
      setBusy(null);
      return;
    }
    await client.from("audit_log").insert({
      action: "member_deactivated",
      target: member.email || member.id,
      detail: next ? "Access re-enabled by admin" : "Access disabled by admin",
    });
    onChanged({ active: next });
    setBusy(null);
  }

  async function remove() {
    if (busy) return;
    setBusy("delete");
    setError(null);
    const { error: e } = await client.from("members").delete().eq("id", member.id);
    if (e) {
      setError(e.message);
      setBusy(null);
      return;
    }
    await client.from("audit_log").insert({
      action: "member_deactivated",
      target: member.email || member.id,
      detail: "Member row deleted by admin",
    });
    setBusy(null);
    onDeleted();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[oklch(0.16_0.06_250)] p-5 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Identity */}
        <div className="flex items-center gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/60 to-[oklch(0.7_0.2_290)] text-sm font-bold text-primary-foreground">
            {member.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold">{member.name}</h2>
            <p className="truncate text-[11px] text-muted-foreground">{member.email}</p>
          </div>
        </div>

        {/* Facts */}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Fact label="Tier" value={member.tier ? (TIERS.find((t) => t.key === member.tier)?.name ?? member.tier) : "No tier"} />
          <Fact label="Deposit" value={member.deposit > 0 ? formatMoney(member.deposit, "€") : "—"} />
          <Fact label="Lots / month" value={member.monthlyLots.toFixed(2)} />
          <Fact label="Access" value={member.active ? "Active" : "Inactive"} />
          <Fact label="Affiliate" value={member.affiliate ?? "—"} />
          <Fact label="Joined" value={member.joinedAt || "—"} />
          {member.telegramHandle && <Fact label="Telegram" value={member.telegramHandle} />}
        </dl>

        {/* Unlock */}
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3.5">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Manual unlock</span>
          </div>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Deposit to credit (€)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => setAmount(String(t.minDeposit))}
                className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                {t.name} · {formatMoney(t.minDeposit, "€")}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Note (stored in the ledger)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />

          <div className="mt-3 text-xs">
            <span className="text-muted-foreground">Result: </span>
            <span className="font-semibold">
              {formatMoney(member.deposit, "€")} → {valid ? formatMoney(parsed, "€") : "—"}
            </span>
            <span className="text-muted-foreground"> · tier </span>
            <span className="font-semibold" style={{ color: resultTier?.color }}>
              {tierName}
            </span>
          </div>

          <button
            onClick={unlock}
            disabled={!valid || busy !== null}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy === "unlock" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Unlocking…
              </>
            ) : (
              "Unlock member"
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={toggleActive}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            {busy === "toggle" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
            {member.active ? "Disable access" : "Enable access"}
          </button>

          {confirmDelete ? (
            <button
              onClick={remove}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Really delete?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500/10 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold">{value}</dd>
    </div>
  );
}
