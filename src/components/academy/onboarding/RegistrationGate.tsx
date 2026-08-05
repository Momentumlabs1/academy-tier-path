/**
 * RegistrationGate — the dashboard auth guard.
 *
 * Public root ("/"): logged-out visitors see the branded master landing
 * (Cosmos Candles Academy) — the site can be browsed freely, register/login
 * happens only when they click "Sign up free" or open a member area.
 *
 * Protected routes (everything else under _app: /lessons, /signals, /tools, …):
 * no session → send the visitor into the funnel at /signup.
 *
 * Admins pass straight through. No overlay, no blur.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { TenantLandingView } from "@/components/academy/tenant/TenantLandingView";
import { COSMOS_MASTER } from "@/lib/tenants";

type Phase = "checking" | "landing" | "redirecting" | "authed";

export function RegistrationGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>("checking");

  // Root path is public; anything deeper is a protected member area.
  const isRoot = location.pathname === "/";

  useEffect(() => {
    let alive = true;
    const decide = (session: unknown) => {
      if (!alive) return;
      if (session) { setPhase("authed"); return; }
      // No session: on the root, show the public landing; elsewhere, funnel in.
      if (isRoot) { setPhase("landing"); return; }
      setPhase("redirecting");
      navigate({ to: "/signup" });
    };
    supabase.auth.getSession().then(({ data }) => {
      const mail = data.session?.user?.email?.toLowerCase();
      // Admins bypass the customer funnel entirely.
      if (mail && mail === ADMIN_EMAIL.toLowerCase()) { if (alive) setPhase("authed"); return; }
      decide(data.session);
    }).catch(() => {
      // getSession hung/failed (cold start, offline, blocked token refresh):
      // never trap the user on the spinner — on the root show the public landing,
      // elsewhere send them to register rather than an infinite "checking".
      if (!alive) return;
      if (isRoot) setPhase("landing"); else { setPhase("redirecting"); navigate({ to: "/signup" }); }
    });
    // Safety net: if nothing resolved within 6s, stop the infinite spinner.
    const t = setTimeout(() => {
      if (!alive) return;
      setPhase((p) => {
        if (p !== "checking") return p;
        if (!isRoot) navigate({ to: "/signup" });
        return isRoot ? "landing" : "redirecting";
      });
    }, 6000);
    // React to sign-out mid-session, and to a sign-in completing elsewhere.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => decide(session));
    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe(); };
  }, [navigate, isRoot]);

  if (phase === "authed") return <>{children}</>;
  if (phase === "landing") return <TenantLandingView tenant={COSMOS_MASTER} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.09_0.02_255)]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
