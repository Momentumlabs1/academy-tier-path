import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { resolveTenant } from "@/lib/resolve-tenant";
import { TenantLandingView } from "@/components/academy/tenant/TenantLandingView";

export const Route = createFileRoute("/t/$slug")({
  loader: async ({ params }) => {
    const tenant = await resolveTenant(params.slug);
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
        <h1 className="font-display text-3xl font-bold">Affiliate not found</h1>
        <p className="mt-2 text-muted-foreground">This link may be invalid or expired.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-primary hover:underline">Back to Academy</Link>
      </div>
    </div>
  ),
  component: TenantLanding,
});

function TenantLanding() {
  const { tenant } = Route.useLoaderData();
  return <TenantLandingView tenant={tenant} />;
}
