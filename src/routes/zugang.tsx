/**
 * /zugang?t=… — wohin der Knopf "Open my academy" aus der Freischalt-Mail fuehrt.
 *
 * Die Mail traegt einen eigenen, 7 Tage gueltigen Token (access_invites) statt
 * eines Supabase-Anmeldelinks, der nach einer Stunde verfaellt. Diese Seite
 * tauscht den Token bei der Edge Function `zugang` gegen einen frischen
 * Anmeldelink und leitet sofort weiter. Nach der Anmeldung faengt die App den
 * Kunden mit "Passwort waehlen" ab (PasswordSetupGate), dann kommt das
 * Willkommen.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { functionUrl } from "@/integrations/supabase/functions-url";
import { FunnelShell } from "@/components/academy/onboarding/FunnelShell";
import { usePartnerBrand } from "@/lib/partner-brand";

export const Route = createFileRoute("/zugang")({
  head: () => ({ meta: [{ title: "Opening your academy — Cosmos Candles Academy" }] }),
  component: ZugangPage,
});

function ZugangPage() {
  const navigate = useNavigate();
  const brand = usePartnerBrand();
  const [fehler, setFehler] = useState<null | "abgelaufen" | "unbekannt" | "netz">(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    fetch(functionUrl("zugang"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) { window.location.replace(j.url); return; }
        setFehler(r.status === 410 ? "abgelaufen" : "unbekannt");
      })
      .catch(() => setFehler("netz"));
  }, []);

  return (
    <FunnelShell brand={brand}>
      <div className="mx-auto w-full max-w-md">
        {!fehler && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening your academy…
          </div>
        )}
        {fehler && (
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-7 text-center">
            <KeyRound className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-xl font-bold">
              {fehler === "abgelaufen" ? "This link has expired" : fehler === "netz" ? "Connection problem" : "This link doesn't work"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">
              {fehler === "netz"
                ? "Please try the button in your e-mail again in a moment."
                : "No problem: sign in with the e-mail address your access was sent to, and use \"Forgot password\" to choose one."}
            </p>
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Go to sign in <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </FunnelShell>
  );
}
