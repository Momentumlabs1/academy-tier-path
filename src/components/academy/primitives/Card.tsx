import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "panel" | "surface" | "inner" | "hero";

export function Card({
  className,
  variant = "surface",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    panel: "bg-[color:var(--surface-1)] border border-white/5",
    surface: "bg-[color:var(--surface-2)] border border-white/[0.06]",
    inner: "bg-[color:var(--surface-3)] border border-white/[0.04]",
    hero: "border border-white/10",
  };
  return (
    <div
      {...rest}
      className={cn(
        "rounded-[var(--radius)] shadow-[var(--shadow-card)] micro-lift",
        styles[variant],
        className,
      )}
      style={
        variant === "hero"
          ? { background: "var(--gradient-card-hero)", ...rest.style }
          : rest.style
      }
    />
  );
}