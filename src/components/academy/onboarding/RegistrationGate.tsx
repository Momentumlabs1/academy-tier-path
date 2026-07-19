/**
 * RegistrationGate — the dashboard auth guard.
 *
 * Previously a forced, non-dismissable popup overlay ("register here to
 * continue"). That's gone: the funnel is now real routed pages —
 *   partner landing (/<partner>) → /registrieren → /willkommen → dashboard.
 *
 * So this component's only job is to protect the dashboard: if there's no
 * session, send the visitor into the funnel at /registrieren; otherwise render
 * the dashboard. Admins pass through. No overlay, no blur — the co-branded
 * academy is shown clean.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "@/lib/admin-auth";

type Phase = "checking" | "redirecting" | "authed";

export function RegistrationGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    let alive = true;
    const decide = (session: unknown) => {
      if (!alive) return;
      if (session) { setPhase("authed"); return; }
      setPhase("redirecting");
      navigate({ to: "/registrieren" });
    };
    supabase.auth.getSession().then(({ data }) => {
      const mail = data.session?.user?.email?.toLowerCase();
      // Admins bypass the customer funnel entirely.
      if (mail && mail === ADMIN_EMAIL.toLowerCase()) { if (alive) setPhase("authed"); return; }
      decide(data.session);
    });
    // React to sign-out mid-session, and to a sign-in completing elsewhere.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => decide(session));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (phase === "authed") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.09_0.02_255)]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
