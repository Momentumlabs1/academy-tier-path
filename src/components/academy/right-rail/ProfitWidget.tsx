import { Link } from "@tanstack/react-router";
import { PROFIT_THIS_MONTH, PROFIT_TRADERS } from "@/lib/academy-data";
import { formatMoney } from "@/lib/format";
import { ArrowRight } from "lucide-react";

export function ProfitWidget() {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profit</div>
      <div className="mt-1 font-display text-4xl font-bold tracking-tight">
        {formatMoney(PROFIT_THIS_MONTH)}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {PROFIT_TRADERS.map((t, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[color:var(--surface-1)] bg-gradient-to-br from-primary/80 to-[oklch(0.65_0.2_290)] text-[11px] font-bold text-primary-foreground"
            >
              {t}
            </div>
          ))}
        </div>
        <Link
          to="/signals"
          aria-label="View signals behind this profit"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}