/**
 * /<slug>/admin — a superpartner's own admin area (e.g. /zekoglobal/admin).
 *
 * Sign-in is password-only: the slug in the URL identifies the account, so the
 * partner never types (and the page never receives) an e-mail address. The
 * partner-admin edge function resolves the owner server-side and hands back a
 * session, which we install with setSession.
 *
 * Two states before the dashboard:
 *   ?invite=<token>  — one-time link from the invite mail: choose a password.
 *   no token         — the returning sign-in: one password field.
 *
 * Everything below the gate is RLS-scoped exactly like /partner: the
 * affiliate_dashboard view only returns brands this user owns.
 */
import { createFileRoute, useParams, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { PartnerCard, type PartnerRow } from "./partner";

const MIN_PASSWORD = 10;
const FN = functionUrl("partner-admin");

export const Route = createFileRoute("/$slug_/admin")({
  validateSearch: (s: Record<string, unknown>) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  head: () => ({ meta: [{ title: "Partner Admin" }] }),
  component: PartnerAdmin,
});

const untyped = () =>
  supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
    };
  };

async function call(action: string, payload: Record<string, unknown>) {
  const res = await fetch(FN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    session?: { access_token: string; refresh_token: string };
  };
  return { ok: res.ok, ...data };
}

function PartnerAdmin() {
  const { slug } = useParams({ from: "/$slug_/admin" });
  const { invite } = useSearch({ from: "/$slug_/admin" });

  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    const signedIn = !!session.session;
    setAuthed(signedIn);
    setChecking(false);
    if (!signedIn) return;
    const { data, error } = await untyped().from("affiliate_dashboard").select("*");
    if (error) {
      setError(error.message);
      return;
    }
    setRows(
      (data ?? []).map((r) => ({
        tenant_id: String(r.tenant_id),
        slug: String(r.slug),
        name: String(r.name ?? r.slug),
        partner_rate: Number(r.partner_rate ?? 0),
        partner_rate_unit: String(r.partner_rate_unit ?? "usd_per_lot"),
        partner_volume: Number(r.partner_volume ?? 0),
        partner_profile: (r.partner_profile as Record<string, string>) ?? {},
        clicks: Number(r.clicks ?? 0),
        leads: Number(r.leads ?? 0),
        members: Number(r.members ?? 0),
        total_deposits: Number(r.total_deposits ?? 0),
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) return <Gate slug={slug} invite={invite} onDone={load} />;

  return (
    <div className="min-h-screen bg-[oklch(0.11_0.03_255)] px-4 py-8 text-foreground [background-image:var(--gradient-page-wash)]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold">Partner Admin</div>
            <div className="text-sm text-muted-foreground">/{slug}</div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setAuthed(false);
              setRows(null);
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
        )}

        {rows === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-8 text-center">
            <div className="font-display text-lg font-bold">Nothing linked to this login yet</div>
            <p className="mt-2 text-sm text-muted-foreground">Reach out to the master to get your brand unlocked.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {rows.map((r) => (
              <PartnerCard key={r.tenant_id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Password-only gate — sets the password on first use, signs in after that. */
function Gate({ slug, invite, onDone }: { slug: string; invite?: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setup = !!invite;
  const tooShort = setup && password.length > 0 && password.length < MIN_PASSWORD;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    let r = setup
      ? await call("accept", { slug, token: invite, password })
      : await call("login", { slug, password });

    // Opening the invite mail a second time is the normal way to land here: the
    // token was already redeemed, so `accept` refuses it. But by then a password
    // exists — so try the password they just typed as a plain sign-in instead of
    // dead-ending them on "this link is no longer valid".
    if (setup && !r.session) {
      const retry = await call("login", { slug, password });
      if (retry.session) r = retry;
    }

    if (!r.session) {
      setBusy(false);
      setError(
        setup
          ? "This invite link was already used. Open " + `/${slug}/admin` +
            " and sign in with the password you chose."
          : r.error ?? "Wrong password.",
      );
      return;
    }

    const { error: sErr } = await supabase.auth.setSession(r.session);
    setBusy(false);
    if (sErr) {
      setError(sErr.message);
      return;
    }
    // Drop the one-time token from the URL so a reload can't replay it.
    if (setup) window.history.replaceState({}, "", `/${slug}/admin`);
    onDone();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)] px-4 text-foreground [background-image:var(--gradient-page-wash)]">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-7 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">/{slug}</span>
          </div>
          <div className="mt-1 font-display text-lg font-bold leading-tight">
            {setup ? "Choose your password" : "Partner Admin"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {setup
              ? "Set it once — it's tied to the address this invite was sent to."
              : "Enter your password to open your dashboard."}
          </div>
        </div>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Password</span>
          <input
            type="password"
            required
            autoFocus
            autoComplete={setup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-primary/50"
            placeholder={setup ? `At least ${MIN_PASSWORD} characters` : "••••••••"}
          />
          {tooShort && <span className="mt-1 block text-[11px] text-amber-400">At least {MIN_PASSWORD} characters.</span>}
        </label>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy || (setup && password.length < MIN_PASSWORD)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {setup ? "Set password & open dashboard" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
