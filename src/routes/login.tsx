import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { adminSignIn } from "@/lib/admin-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await adminSignIn(email, password);
    setBusy(false);
    if (res.ok) navigate({ to: "/admin" });
    else setError(res.error);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[oklch(0.11_0.03_255)] px-4 py-10 text-foreground [background-image:var(--gradient-page-wash)]">
      {/* Cosmos Candles brand mark — quiet, this is the staff door. */}
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <img src="/cosmos-logo.png" alt="Cosmos Candles Academy" className="h-8 w-auto opacity-90" />
      </div>

      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[oklch(0.15_0.045_255)] p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.62_0.16_232)] text-primary-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <div className="font-display text-lg font-bold leading-tight">Command Center</div>
            <div className="text-[11px] text-muted-foreground">Staff sign-in — admins only</div>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email address</span>
          <input
            type="email" required autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="kontakt@…"
          />
        </label>
        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Password</span>
          <input
            type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="••••••••"
          />
        </label>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}

        <button
          type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
