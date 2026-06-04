import type { ReactNode } from "react";

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-2xl font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}