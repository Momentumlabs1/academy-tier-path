import type { ReactNode } from "react";

export function SectionTitle({
  children,
  action,
  eyebrow,
}: {
  children: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </span>
        )}
        <h2 className="text-balance font-display text-2xl font-bold tracking-tight">
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}
