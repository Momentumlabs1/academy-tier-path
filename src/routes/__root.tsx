import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function CosmoMascot({ className }: { className?: string }) {
  return (
    <div className={"relative mx-auto flex items-center justify-center " + (className ?? "")}>
      <span
        aria-hidden
        className="absolute inset-1 rounded-full blur-2xl motion-safe:animate-glow"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--primary) 55%, transparent) 0%, transparent 70%)",
        }}
      />
      <img
        src="/cosmo/cosmo-head.png"
        alt="Cosmo, the Cosmos Candles mascot"
        className="relative h-32 w-32 max-w-full object-contain drop-shadow-xl"
      />
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <CosmoMascot />
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Error 404
          </span>
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight text-foreground">
            Cosmo can't find that page
          </h1>
          <p className="mx-auto max-w-[42ch] text-sm text-muted-foreground">
            This chart doesn't exist — the link may be broken or the page has moved.
            Let's get you back to solid ground.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <CosmoMascot />
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Something broke
          </span>
          <h1 className="text-balance font-display text-3xl font-bold tracking-tight text-foreground">
            This page didn't load
          </h1>
          <p className="mx-auto max-w-[42ch] text-sm text-muted-foreground">
            A glitch on our end stopped this page from rendering. Try again in a moment,
            or head back to your dashboard — Cosmo's got your back.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Trading Academy" },
      { name: "description", content: "A premium member education platform for traders, offering tiered content, progress tracking, and automated trading tools." },
      { property: "og:title", content: "Trading Academy" },
      { property: "og:description", content: "A premium member education platform for traders, offering tiered content, progress tracking, and automated trading tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Trading Academy" },
      { name: "twitter:description", content: "A premium member education platform for traders, offering tiered content, progress tracking, and automated trading tools." },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon-64.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
