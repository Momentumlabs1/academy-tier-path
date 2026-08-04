/**
 * /:slug — clean path-based partner link, e.g. cosmos-candles.com/maxpartner.
 *
 * This is the link the founder actually sends. Real app routes (/admin,
 * /partner, /login, /lessons, …) are defined explicitly and always win over
 * this dynamic segment; RESERVED_SLUGS is a belt-and-suspenders guard so a
 * partner can never claim a slug that collides with one. Everything else
 * resolves to a branded landing (static brand or a DB partner) via the same
 * view as /t/:slug.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { resolveTenant } from "@/lib/resolve-tenant";
import { RESERVED_SLUGS } from "@/lib/tenants";
import { TenantLandingView } from "@/components/academy/tenant/TenantLandingView";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const slug = params.slug;
    // Never intercept reserved names or asset-like paths (favicon.ico, …).
    if (RESERVED_SLUGS.has(slug.toLowerCase()) || slug.includes(".")) throw notFound();
    const tenant = await resolveTenant(slug);
    if (!tenant) throw notFound();
    return { tenant };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.tenant.name} — Powered by Agent Trading` : "Cosmos Candles Academy" },
      { name: "description", content: loaderData?.tenant.description ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.15_0.06_260)] px-4 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">This link may be invalid or expired.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-primary hover:underline">Back to the Academy</Link>
      </div>
    </div>
  ),
  component: SlugLanding,
});

function SlugLanding() {
  const { tenant } = Route.useLoaderData();
  return <TenantLandingView tenant={tenant} />;
}
