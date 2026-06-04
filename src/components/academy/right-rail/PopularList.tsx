import { POPULAR } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  blue: "bg-[oklch(0.65_0.18_240)]",
  lime: "bg-primary",
  magenta: "bg-[oklch(0.72_0.2_330)]",
  violet: "bg-[oklch(0.6_0.2_290)]",
};

export function PopularList() {
  return (
    <div className="space-y-3">
      {POPULAR.map((p) => (
        <div key={p.id} className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white shadow-[var(--shadow-card)]",
              TONE[p.tileTone],
              p.tileTone === "lime" && "text-primary-foreground",
            )}
          >
            {p.symbol}
          </div>
          <div className="flex flex-1 items-center justify-between rounded-full bg-white/5 px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-bold text-muted-foreground">{p.rank}</span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{p.category}</div>
                <div className="text-sm font-semibold">{p.label}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}