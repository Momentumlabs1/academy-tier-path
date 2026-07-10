import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "../primitives/Card";
import { PillValue } from "../primitives/PillValue";
import type { Signal } from "@/lib/academy-data";

export function SignalOddsCard({ signal, dense = true }: { signal: Signal; dense?: boolean }) {
  return (
    <Card variant="surface" className="p-4">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>{signal.pair}</span>
        <span>{signal.side}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-display text-xl font-bold">{signal.asset}</span>
        <PillValue value={signal.payoutMultiple.toFixed(2)} active />
      </div>

      {!dense && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <PillValue label="LONG" value={signal.payoutMultiple.toFixed(2)} active />
          <PillValue label="DRAW" value={(signal.draw ?? 0).toFixed(2)} />
          <PillValue label="SHORT" value={(signal.loss ?? 0).toFixed(2)} />
        </div>
      )}

      <Link
        to="/signals"
        className="mt-4 flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-white/10 hover:text-foreground micro-press"
      >
        Trade this signal
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}