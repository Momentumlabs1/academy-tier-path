/**
 * /registrieren — the old German path, kept as a permanent redirect to /signup.
 *
 * The site is English throughout, so the address bar had no business saying
 * "registrieren". The route itself has to stay: this path has been the sign-up
 * URL for the whole life of the funnel, so it sits in bookmarks, in whatever
 * Google has indexed, and in any link a partner has already shared. Deleting it
 * would turn all of those into a 404.
 *
 * Redirecting in `beforeLoad` means the router never renders anything here — the
 * visitor lands on /signup directly, with no flash of an intermediate screen.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/registrieren")({
  beforeLoad: () => {
    throw redirect({ to: "/signup", replace: true });
  },
});
