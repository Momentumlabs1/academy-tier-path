/**
 * /partner-programm — the old German spelling, kept as a permanent redirect to
 * /partner-program.
 *
 * "Programm" with two m's is German; the site is English throughout, so the
 * recruitment page had no business carrying the last German word left in a URL.
 * The path itself has to stay: it is the address that has been handed to
 * prospective partners, so it lives in sent mail and in whatever Google has
 * indexed. Deleting it would turn those into a 404.
 *
 * Same shape as the /registrieren and /willkommen redirects: `beforeLoad` so the
 * router renders nothing here, and 301 rather than the router's default 307, so
 * a search engine carries this URL's standing over instead of treating the two
 * spellings as competing pages.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partner-programm")({
  beforeLoad: () => {
    throw redirect({ to: "/partner-program", replace: true, statusCode: 301 });
  },
});
