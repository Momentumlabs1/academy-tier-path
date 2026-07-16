import { useState } from "react";
import { spysecret } from "@/integrations/spysecret/client";
import { HqCard, HqInput, PrimaryButton } from "./primitives";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await spysecret.auth.signInWithPassword({ email: email.trim(), password });
    if (error)
      setError(
        error.message === "Invalid login credentials"
          ? "E-Mail oder Passwort falsch."
          : error.message,
      );
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-3xl font-black text-primary-foreground shadow-[0_0_40px_-8px] shadow-primary/50">
            <span className="font-display">HQ</span>
          </div>
          <h1 className="font-display text-2xl font-bold">HQ — Life OS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dein Second Brain. Nur für dich.</p>
        </div>

        <HqCard className="p-5">
          <form onSubmit={signIn} className="space-y-3">
            <HqInput
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <HqInput
              type="password"
              autoComplete="current-password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error ? (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
            ) : null}
            <PrimaryButton type="submit" disabled={busy} className="w-full">
              {busy ? "Anmelden…" : "Anmelden"}
            </PrimaryButton>
          </form>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Login mit deinem Spy-Secret-Account (kontakt@momentumlabs.at). Zugriff haben nur
            freigeschaltete Owner-Accounts.
          </p>
        </HqCard>
      </div>
    </div>
  );
}
