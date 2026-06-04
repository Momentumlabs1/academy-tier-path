import { TIERS, type TierKey } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

export function TierBadge({ tier, className }: { tier: TierKey; className?: string }) {
  const t = TIERS.find((x) => x.key === tier)!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklch, ${t.color} 18%, transparent)`, color: t.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
      {t.name}
    </span>
  );
}