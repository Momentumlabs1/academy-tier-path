/**
 * /willkommen — the old German path, kept as a permanent redirect to /welcome.
 *
 * Same reasoning as /registrieren: the page moved, the address did not have to
 * break with it. This one was already a forwarder rather than a real screen, so
 * a visitor arriving here now takes one router-level hop to /welcome, which then
 * decides between the dashboard and sign-up based on the session.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/willkommen")({
  beforeLoad: () => {
    throw redirect({ to: "/welcome", replace: true });
  },
});
