// Live admin stats from Supabase — replaces the hardcoded demo numbers so the
// dashboard is deployable with real (or honestly empty) data.
//
// Reads the RLS-scoped `affiliate_dashboard` view (admin sees all rows via
// is_platform_admin(); affiliates would see only their own). Until the DB has
// data — or if the query fails — everything falls back to empty/zero, never to
// fake numbers. Branding (colors/logo) is merged in from the static TENANTS
// config by slug, exactly like the admin tenants page does.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TENANTS, type TenantConfig } from "@/lib/tenants";

export interface PartnerStat {
  slug: string;
  name: string;
  brand?: TenantConfig;
  clicks: number;
  leads: number;
  members: number;
  totalDeposits: number;
  partnerRate: number;
  partnerRateUnit: string;
}

export interface AdminStats {
  loading: boolean;
  error: string | null;
  partners: PartnerStat[];
  totals: { partners: number; members: number; leads: number; clicks: number; deposits: number };
}

const BRAND = Object.fromEntries(TENANTS.map((t) => [t.slug, t]));

const EMPTY_TOTALS = { partners: 0, members: 0, leads: 0, clicks: 0, deposits: 0 };

export function useAdminStats(): AdminStats {
  const [state, setState] = useState<AdminStats>({
    loading: true,
    error: null,
    partners: [],
    totals: EMPTY_TOTALS,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      // `affiliate_dashboard` is a DB view added by migration 008 — not yet in the
      // generated Database types, so query it untyped.
      const client = supabase as unknown as {
        from: (t: string) => { select: (c: string) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> };
      };
      const { data, error } = await client.from("affiliate_dashboard").select("*");
      if (!alive) return;
      if (error) {
        setState({ loading: false, error: error.message, partners: [], totals: EMPTY_TOTALS });
        return;
      }
      const partners: PartnerStat[] = (data ?? []).map((r: Record<string, unknown>) => ({
        slug: String(r.slug),
        name: String(r.name ?? r.slug),
        brand: BRAND[String(r.slug)],
        clicks: Number(r.clicks ?? 0),
        leads: Number(r.leads ?? 0),
        members: Number(r.members ?? 0),
        totalDeposits: Number(r.total_deposits ?? 0),
        partnerRate: Number(r.partner_rate ?? 0),
        partnerRateUnit: String(r.partner_rate_unit ?? "usd_per_lot"),
      }));
      const totals = partners.reduce(
        (a, p) => ({
          partners: a.partners + 1,
          members: a.members + p.members,
          leads: a.leads + p.leads,
          clicks: a.clicks + p.clicks,
          deposits: a.deposits + p.totalDeposits,
        }),
        { ...EMPTY_TOTALS },
      );
      setState({ loading: false, error: null, partners, totals });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
