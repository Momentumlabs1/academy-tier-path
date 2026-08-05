/**
 * FunnelShell — the Cosmo-branded page frame for the onboarding funnel
 * (/signup, /welcome). Cosmo is the star: its wordmark leads. The
 * referring partner appears only as a subtle "empfohlen von …" accent chip in
 * the header, so the co-branding travels without ever re-skinning the academy.
 */
import type { ReactNode } from "react";
import { COSMO, type PartnerBrand } from "@/lib/partner-brand";

export function FunnelShell({ brand, children }: { brand: PartnerBrand | null; children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden text-foreground"
      style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom} 0%, ${COSMO.bgTo} 100%)` }}
    >
      {/* Scoped, reduced-motion-safe mascot motion + glow — shared by the hero. */}
      <style>{`
        @keyframes cosmo-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .cosmo-float { animation: cosmo-float 5.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cosmo-float { animation: none; } }
      `}</style>

      {/* Ambient brand light — a soft lime + blue wash behind the whole funnel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(720px 420px at 88% -6%, color-mix(in oklch, ${COSMO.primaryColor} 14%, transparent), transparent 60%), radial-gradient(560px 360px at 6% 108%, color-mix(in oklch, ${COSMO.accentColor} 16%, transparent), transparent 60%)`,
        }}
      />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        {/* Cosmo — always the lead brand */}
        <div className="flex items-center gap-3">
          <span
            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
            style={{ background: `color-mix(in oklch, ${COSMO.primaryColor} 22%, transparent)` }}
          >
            <img src="/cosmo/cosmo-head.png" alt="Cosmo" className="h-8 w-8 object-contain" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">{COSMO.fullName}</span>
        </div>

        {/* Partner — subtle recurring accent */}
        {brand && (
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: `color-mix(in oklch, ${brand.accentColor} 40%, transparent)`,
              background: `color-mix(in oklch, ${brand.accentColor} 12%, transparent)`,
            }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black text-white"
              style={{ background: brand.accentColor }}
            >
              {brand.logoInitials}
            </span>
            <span className="text-foreground/80">recommended by {brand.name}</span>
          </div>
        )}
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8">{children}</main>

      <footer className="relative px-4 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        {COSMO.fullName} · Trading involves risk — 74–89% of retail CFD accounts lose money.
      </footer>
    </div>
  );
}
