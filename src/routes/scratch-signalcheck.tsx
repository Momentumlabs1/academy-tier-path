// WEGWERF-SEITE — nur zum Ansehen der Signalkarten ohne Login.
// Wird nach dem Screenshot geloescht und NIE committet.
import { createFileRoute } from "@tanstack/react-router";
import { SignalTeaserRail } from "@/components/academy/right-rail/SignalTeaserRail";

export const Route = createFileRoute("/scratch-signalcheck")({ component: Vorschau });

function Vorschau() {
  return (
    <div className="min-h-screen bg-[#05070e] p-6 font-sans text-white">
      <div className="mx-auto grid max-w-[860px] gap-8 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">freigeschaltet</p>
          <SignalTeaserRail locked={false} />
        </div>
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">gesperrt</p>
          <SignalTeaserRail locked={true} />
        </div>
      </div>
    </div>
  );
}
