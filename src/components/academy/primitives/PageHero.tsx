/**
 * PageHero — the standard header every academy page opens with.
 *
 * Before this, each page started with a bare eyebrow + h1 + paragraph sitting on
 * flat background, which made the app read as a stack of documents rather than a
 * product. Now every page opens on the same shape: signature particle artwork on
 * the right, a left-to-right scrim so the copy stays fully legible, an optional
 * ambient tint, and an optional stat/badge slot on the right edge.
 *
 * The artwork is decorative only — it is aria-hidden and hidden on small screens,
 * where there is no room for it and it would only cost bandwidth.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  children,
  aside,
  footer,
  art,
  tint,
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Supporting copy under the title. */
  children?: ReactNode;
  /** Right-aligned slot: a headline number, a badge, an action. */
  aside?: ReactNode;
  /** Full-width slot below the title row — progress bars and the like. */
  footer?: ReactNode;
  /** Imported artwork (see src/assets/a-*.jpg). Omit for a plain header. */
  art?: string;
  /** Ambient glow colour; defaults to the brand. */
  tint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius)] border border-white/8 bg-[color:var(--surface-2)]/60 p-5 sm:p-7",
        className,
      )}
    >
      {art && (
        <>
          <img
            src={art}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[58%] object-cover object-right opacity-70 sm:block"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, var(--surface-2) 34%, color-mix(in oklch, var(--surface-2) 55%, transparent) 62%, transparent)",
            }}
            aria-hidden
          />
        </>
      )}
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `color-mix(in oklch, ${tint ?? "var(--primary)"} 20%, transparent)` }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
          )}
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">{title}</h1>
          {children && <div className="mt-2 max-w-[58ch] text-sm text-muted-foreground">{children}</div>}
        </div>
        {aside && <div className="shrink-0 sm:text-right">{aside}</div>}
      </div>

      {footer && <div className="relative mt-5">{footer}</div>}
    </div>
  );
}
