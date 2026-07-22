/**
 * /willkommen — legacy funnel step, now a pass-through.
 *
 * The post-registration welcome experience moved INTO the dashboard
 * (OnboardingJourney): integrated Cosmo video → deposit ignite strip → live
 * deposit detection → celebration/unlock tour. This route only remains so old
 * links keep working; it forwards signed-in visitors to the dashboard and
 * everyone else to registration.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/willkommen")({
  head: () => ({ meta: [{ title: "Welcome — Cosmos Candles Academy" }] }),
  component: WelcomeForward,
});

function WelcomeForward() {
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      navigate({ to: data.session ? "/" : "/registrieren", replace: true });
    });
    return () => { alive = false; };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.09_0.02_255)]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
