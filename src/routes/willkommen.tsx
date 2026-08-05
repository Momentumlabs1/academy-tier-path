/**
 * /willkommen — the old German path, kept as a permanent redirect to /welcome.
 *
 * Same reasoning as /registrieren: the page moved, the address did not have to
 * break with it. This one was already a forwarder rather than a real screen, so
 * a visitor arriving here now takes one router-level hop to /welcome, which then
 * decides between the dashboard and sign-up based on the session.
 *
 * statusCode 301 for the same reason as /registrieren: a permanent move should
 * answer with a permanent code.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/willkommen")({
  beforeLoad: () => {
    throw redirect({ to: "/welcome", replace: true, statusCode: 301 });
  },
});
