import { cn } from "@/lib/utils";

export function PillValue({
  label,
  value,
  active = false,
  className,
}: {
  label?: string;
  value: string | number;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[68px] flex-col items-center justify-center rounded-full px-3 py-1.5 text-center transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-[color:var(--surface-2)]/70 text-foreground",
        className,
      )}
    >
      {label && (
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            active ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      )}
      <span className="font-display text-sm font-bold leading-none">{value}</span>
    </div>
  );
}