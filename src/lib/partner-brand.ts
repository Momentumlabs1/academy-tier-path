/**
 * partner-brand — the "Split-Skin" co-branding layer.
 *
 * ONE central Cosmo academy, skinned per referring partner. Cosmo is always the
 * star (education, welcome video, dashboard); the partner is a subtle, recurring
 * ACCENT (logo initials, accent colour, name, their Telegram) carried through the
 * whole funnel: landing → /registrieren → /willkommen → dashboard.
 *
 * How it travels WITHOUT a DB fetch on every academy page: the partner landing
 * stamps a slim `cosmo_brand` cookie (JSON). Every downstream page reads it via
 * `usePartnerBrand()`. `cosmo_ref` (slug only) stays as the attribution cookie the
 * RegistrationGate/DB-trigger reads; `cosmo_brand` is purely the visual skin.
 */
import { useEffect, useState } from "react";
import type { TenantConfig } from "./tenants";

export interface PartnerBrand {
  slug: string;
  name: string;
  logoInitials: string;
  /** Partner accent — used sparingly (badges, ring, highlight), never as the whole page. */
  accentColor: string;
  primaryColor: string;
  telegramChannel: string;
  brokerName: string;
  /** "#" until the partner's broker link is configured. */
  brokerUrl: string;
}

/** The central academy. Never re-branded per partner — this is the constant star. */
export const COSMO = {
  name: "Cosmo",
  fullName: "Cosmos Candles Academy",
  logoInitials: "CC",
  primaryColor: "oklch(0.88 0.19 140)",
  accentColor: "oklch(0.7 0.18 270)",
  bgFrom: "oklch(0.16 0.05 260)",
  bgTo: "oklch(0.10 0.03 260)",
} as const;

const COOKIE = "cosmo_brand";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches cosmo_ref

/** Stamp the referring partner's skin so the academy can co-brand downstream. */
export function writePartnerBrand(tenant: TenantConfig): void {
  if (typeof document === "undefined") return;
  const brand: PartnerBrand = {
    slug: tenant.slug,
    name: tenant.name,
    logoInitials: tenant.logoInitials,
    accentColor: tenant.accentColor,
    primaryColor: tenant.primaryColor,
    telegramChannel: tenant.telegramChannel,
    brokerName: tenant.brokerName,
    brokerUrl: tenant.brokerUrl,
  };
  const value = encodeURIComponent(JSON.stringify(brand));
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function readPartnerBrand(): PartnerBrand | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE + "=([^;]*)"));
  if (!m) return null;
  try {
    const b = JSON.parse(decodeURIComponent(m[1])) as Partial<PartnerBrand>;
    if (!b.slug || !b.name) return null;
    return {
      slug: b.slug,
      name: b.name,
      logoInitials: b.logoInitials ?? b.name.slice(0, 2).toUpperCase(),
      accentColor: b.accentColor ?? COSMO.accentColor,
      primaryColor: b.primaryColor ?? COSMO.primaryColor,
      telegramChannel: b.telegramChannel ?? "#",
      brokerName: b.brokerName ?? "unserem Partner-Broker",
      brokerUrl: b.brokerUrl ?? "#",
    };
  } catch {
    return null;
  }
}

/**
 * React hook: the current partner skin (or null for direct/no-partner visitors).
 * Reads the cookie on mount — client-only, so it returns null on the first SSR
 * paint and fills in after hydration (accents fade in, page never blocks).
 */
export function usePartnerBrand(): PartnerBrand | null {
  const [brand, setBrand] = useState<PartnerBrand | null>(null);
  useEffect(() => { setBrand(readPartnerBrand()); }, []);
  return brand;
}
