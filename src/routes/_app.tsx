import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/academy/layout/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});