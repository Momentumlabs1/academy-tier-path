/**
 * CreatePartnerForm — the admin onboards a new affiliate in one step.
 *
 * Calls admin-tenants { action: "create_partner" } with the admin's own access
 * token (the edge function verifies it's the platform admin before creating any
 * auth user). On success the partner can immediately sign into /partner with the
 * email + password entered here.
 */
import { useState } from "react";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";

const FN = functionUrl("admin-tenants");

export function CreatePartnerForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rate, setRate] = useState("5");
  const [unit, setUnit] = useState<"usd_per_lot" | "percent">("usd_per_lot");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) { setBusy(false); setError("Not signed in."); return; }
    try {
      const res = await fetch(FN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "create_partner",
          name: name.trim(), slug: slug.trim() || undefined,
          email: email.trim(), password,
          partner_rate: Number(rate), partner_rate_unit: unit,
        }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok || data.error) { setError(data.error ?? `Error (${res.status})`); return; }
      setDone(`Partner "${data.tenant?.name ?? name}" created — they can sign in at /partner.`);
      setName(""); setSlug(""); setEmail(""); setPassword(""); setRate("5");
      // Refresh the tree so the new brand appears.
      if (typeof window !== "undefined") setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
      >
        <UserPlus className="h-4 w-4" /> Create a partner
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-5">
      <div className="mb-4 flex items-center gap-2 font-display text-base font-bold">
        <UserPlus className="h-4 w-4 text-primary" /> Create a partner
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Brand name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cosmos Elite"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Slug (optional)</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="cosmos-elite → /cosmos-elite"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Partner email (sign-in)</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Starting password</span>
          <input required type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="at least 6 characters"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Commission</span>
          <input required type="number" step="0.5" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as "usd_per_lot" | "percent")}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50">
            <option value="usd_per_lot">$ / Lot</option>
            <option value="percent">%</option>
          </select>
        </label>
      </div>

      {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      {done && <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4" /> {done}</div>}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Create
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Creates the sign-in and the brand and links them. From then on the partner sees only their own numbers at <span className="font-mono">/partner</span>.
      </p>
    </form>
  );
}
