/**
 * FunnelShell — the Cosmo-branded page frame for the onboarding funnel
 * (/registrieren, /willkommen). Cosmo is the star: its wordmark leads. The
 * referring partner appears only as a subtle "empfohlen von …" accent chip in
 * the header, so the co-branding travels without ever re-skinning the academy.
 */
import type { ReactNode } from "react";
import { COSMO, type PartnerBrand } from "@/lib/partner-brand";

export function FunnelShell({ brand, children }: { brand: PartnerBrand | null; children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col text-foreground"
      style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom} 0%, ${COSMO.bgTo} 100%)` }}
    >
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        {/* Cosmo — always the lead brand */}
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-black"
            style={{ background: COSMO.primaryColor }}
          >
            {COSMO.logoInitials}
          </span>
          <span className="font-display text-lg font-bold">{COSMO.fullName}</span>
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

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">{children}</main>

      <footer className="px-4 py-6 text-center text-[11px] text-muted-foreground">
        {COSMO.fullName} · Trading involves risk — 74–89% of retail CFD accounts lose money.
      </footer>
    </div>
  );
}
