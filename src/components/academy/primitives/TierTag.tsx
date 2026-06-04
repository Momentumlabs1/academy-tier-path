import { TIERS, type TierKey } from "@/lib/academy-data";
import { cn } from "@/lib/utils";

export function TierTag({ tier, className }: { tier: TierKey; className?: string }) {
  const t = TIERS.find((x) => x.key === tier)!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/90",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color }} />
      {t.name}
    </span>
  );
}