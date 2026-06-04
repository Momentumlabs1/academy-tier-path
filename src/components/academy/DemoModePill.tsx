import { DEMO_MODE } from "@/lib/academy-data";

export function DemoModePill() {
  if (!DEMO_MODE) return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      DEMO MODE
    </div>
  );
}