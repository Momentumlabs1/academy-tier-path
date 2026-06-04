import { DEMO_MODE } from "@/lib/academy-data";

export function DemoModePill() {
  if (!DEMO_MODE) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      Demo mode
    </div>
  );
}