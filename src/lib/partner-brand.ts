/**
 * partner-brand — the "Split-Skin" co-branding layer.
 *
 * ONE central Cosmo academy, skinned per referring partner. Cosmo is always the
 * star (education, welcome video, dashboard); the partner is a subtle, recurring
 * ACCENT (logo initials, accent colour, name, their Telegram) carried through the
 * whole funnel: landing → /signup → /welcome → dashboard.
 *
 * How it travels WITHOUT a DB fetch on every academy page: the partner landing
 * stamps a slim `cosmo_brand` cookie (JSON). Every downstream page reads it via
 * `usePartnerBrand()`. `cosmo_ref` (slug only) stays as the attribution cookie the
 * RegistrationGate/DB-trigger reads; `cosmo_brand` is purely the visual skin.
 */
import { useEffect, useState } from "react";
import type { TenantConfig } from "./tenants";
import { BRAND } from "./tenants";
import { BROKER } from "./broker";

/** Der Mandanten-slug unserer eigenen Marke — nie ein Partner. */
const HAUS = "cosmos-candles";
// sessionStorage-Schluessel: von welcher Landingpage DIESER Besuch kommt (usePartnerBrand).
const VIA_KEY = "cc_via";

/**
 * Herkunft festhalten — mit EINER Regel: das Haus ueberschreibt nie einen Partner.
 *
 * Der Fehler, den das verhindert (gemessen am 05.09.): die Partner-Bruecke
 * schickt jeden Besucher auf die Cosmos-Seite. Die stempelte dort ihren eigenen
 * slug in cosmo_ref — also wurde JEDER Partnerbesucher beim ersten Klick zum
 * Hauskunden. Der Partner brachte den Kunden, wir bekamen ihn, und auffallen
 * wuerde es nie: unsere eigene Abrechnung stimmt ja.
 *
 * Umgekehrt gilt es nicht. Wer erst bei uns war und spaeter ueber einen
 * Partner-Reel kommt, gehoert dem Partner — er hat diese Anmeldung ausgeloest.
 * Deshalb: ein Partner darf ueberschreiben, das Haus nicht.
 *
 * Das deckt sich mit dem Bot (`set_partner` ueberschreibt eine bestehende
 * Zuordnung ebenfalls nicht) und mit `members.referred_by_tenant`, das nach dem
 * Anlegen gesperrt ist — eine falsche Zuordnung ist danach endgueltig.
 */
export function stampAttribution(tenant: TenantConfig): void {
  if (typeof document === "undefined") return;
  // Die Seite, von der DIESER Besuch kommt — vor jeder Rueckkehr unten, also
  // auch fuer das Haus. Siehe markierteHerkunft().
  try { sessionStorage.setItem(VIA_KEY, tenant.slug); } catch { /* privater Modus */ }
  const vorhanden = (document.cookie.match(/(?:^|;\s*)cosmo_ref=([^;]*)/) || [])[1];
  const bestehtSchon = Boolean(vorhanden && decodeURIComponent(vorhanden) !== "");
  if (tenant.slug === HAUS && bestehtSchon) return; // Partner behaelt seinen Kunden.

  document.cookie = `cosmo_ref=${encodeURIComponent(tenant.slug)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  writePartnerBrand(tenant);
}

export interface PartnerBrand {
  slug: string;
  name: string;
  logoInitials: string;
  /** Portrait des Partners. Bei einer Personenmarke ist das Gesicht das
   *  Argument — die Initialen sind der Notnagel, wenn keins hinterlegt ist. */
  mascotHeadUrl?: string;
  /** Partner accent — used sparingly (badges, ring, highlight), never as the whole page. */
  accentColor: string;
  primaryColor: string;
  telegramChannel: string;
  /** Broker dieser Marke; leer = nach Land entscheiden. Siehe brokerFor(). */
  broker?: "hero" | "vt";
  brokerName: string;
  /** "#" until the partner's broker link is configured. */
  brokerUrl: string;
}

/**
 * The central academy. Never re-branded per partner — this is the constant star.
 *
 * The colours come from `BRAND` rather than being written out again: this object
 * used to carry its own copy of the palette, which is why the /signup CTA
 * stayed lime green after the rest of the funnel had moved to azure.
 */
export const COSMO = {
  name: "Cosmo",
  fullName: "Cosmos Candles Academy",
  logoInitials: "CC",
  primaryColor: BRAND.primary,
  accentColor: BRAND.accent,
  bgFrom: BRAND.bgFrom,
  bgTo: BRAND.bgTo,
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
    mascotHeadUrl: tenant.mascotHeadUrl,
    accentColor: tenant.accentColor,
    primaryColor: tenant.primaryColor,
    telegramChannel: tenant.telegramChannel,
    broker: tenant.broker,
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
      // Diese Liste ist eine AUFZAEHLUNG, keine Kopie: was hier nicht steht,
      // faellt beim Lesen weg, egal ob es geschrieben wurde. Am 05.09. genau
      // so aufgefallen — das Portrait des Partners war im Cookie und kam nie
      // an. `broker` fehlte still seit jeher: die Broker-Wahl des Partners
      // ueberlebte das Lesen nie. Faellt derzeit nicht auf, weil ohnehin jeder
      // zu Hero geht — waere aber genau der Fehler, der beim Zurueckdrehen
      // niemandem auffaellt.
      mascotHeadUrl: b.mascotHeadUrl,
      broker: b.broker,
      accentColor: b.accentColor ?? COSMO.accentColor,
      primaryColor: b.primaryColor ?? COSMO.primaryColor,
      telegramChannel: b.telegramChannel ?? "#",
      brokerName: b.brokerName ?? "VT Markets",
      // Never a bare broker homepage: a link without a referral id sends the
      // member off unattributed (see usableBrokerUrl in broker.ts).
      brokerUrl: b.brokerUrl ?? BROKER.url,
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
/**
 * ANZEIGE FOLGT DEM KLICK DIESES BESUCHS, NICHT EINEM ALTEN COOKIE.
 *
 * Vorfall 10.09.: Diego klickt auf Cosmos eigener Seite "Start" — und /preview
 * zeigt Zeko, mit Zekos Telegram-Link. Grund: Wochen vorher war er einmal auf
 * /zekoglobal; das Marken-Cookie haelt 30 Tage, und das Haus ueberschreibt es
 * absichtlich nie (stampAttribution). /preview las nur dieses Cookie. Damit
 * landete JEDER, der irgendwann ueber einen Partner kam und jetzt ueber ein
 * Cosmo-Video kommt, bei diesem Partner — auf dessen Seite und in dessen Kanal.
 *
 * Jetzt merkt sich jede Landingpage im sessionStorage, dass DIESER Besuch von
 * ihr kommt. Kam er vom Haus, gilt fuer diesen Besuch das Haus. Das
 * Zuordnungs-Cookie (cosmo_ref) bleibt davon unberuehrt — geaendert wird nur,
 * was der Besucher jetzt sieht und in welchen Kanal ihn der Knopf schickt.
 * Ohne Markierung (Direktaufruf von /preview) gilt wie bisher das Cookie.
 */
export function markierteHerkunft(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(VIA_KEY); } catch { return null; }
}

export function usePartnerBrand(): PartnerBrand | null {
  const [brand, setBrand] = useState<PartnerBrand | null>(null);
  useEffect(() => {
    setBrand(markierteHerkunft() === HAUS ? null : readPartnerBrand());
  }, []);
  return brand;
}
