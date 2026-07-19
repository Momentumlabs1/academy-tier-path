/**
 * resolveTenant — get a landing-page config for a slug, static OR DB-backed.
 *
 * Order:
 *   1) a hand-tuned static brand in tenants.ts (e.g. zekoglobal), else
 *   2) a partner row created in the admin ("Neuen Partner anlegen") — rendered
 *      with buildTenantConfig defaults + any overrides in the tenant's config
 *      jsonb, so a freshly-onboarded partner has a full page at their link.
 *
 * Runs in the route loader (SSR + client). The public tenants_public_read RLS
 * policy (active = true) lets the anon key read active brands.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildTenantConfig, getTenant, type TenantConfig } from "./tenants";

export async function resolveTenant(slug: string): Promise<TenantConfig | null> {
  const staticTenant = getTenant(slug);
  if (staticTenant) return staticTenant;

  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          eq: (k: string, v: boolean) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
        };
      };
    };
  };

  try {
    const { data } = await client
      .from("tenants")
      .select("slug, name, config, active")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (!data) return null;
    return buildTenantConfig(String(data.slug), String(data.name), (data.config as Record<string, unknown>) ?? {});
  } catch {
    return null;
  }
}
