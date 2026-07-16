import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HqApp } from "@/components/hq/HqApp";

export const Route = createFileRoute("/hq")({
  head: () => ({
    meta: [
      { title: "HQ — Life OS" },
      {
        name: "description",
        content: "Persönliches Command Center: Ventures, Tagesplan, Second Brain.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#14101f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "HQ" },
    ],
    links: [
      { rel: "manifest", href: "/hq.webmanifest" },
      { rel: "apple-touch-icon", href: "/hq-icon-180.png" },
    ],
  }),
  component: HqPage,
});

// Client-only: the dashboard depends on Supabase auth (localStorage), so we
// render nothing during SSR and mount the app after hydration.
function HqPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-dvh bg-background" />;
  return <HqApp />;
}
