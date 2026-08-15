/**
 * Where is this visitor? — the missing half of the broker routing.
 *
 * `brokerForCountry()` in lib/broker.ts has always had the rule right: US goes
 * to Hero, everyone else to VT. But nothing ever told it the country. The only
 * caller was `ACTIVE_BROKER = brokerForCountry(null)`, so every visitor got the
 * no-country fallback and the rule never actually ran. A routing table nobody
 * queries routes nothing.
 *
 * The country only exists at the edge — Vercel puts it on the request as
 * `x-vercel-ip-country`, and it is gone by the time React renders in the
 * browser. So it has to be read server-side and handed to the client, which is
 * what this does.
 *
 * Returns null rather than guessing when the header is absent (local dev, or a
 * host that does not set it). Null is the honest answer and `brokerForCountry`
 * already treats it as "unknown" — it must never be silently turned into "US",
 * because that flips which broker a real person is sent to.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** ISO-3166 alpha-2, upper-case, or null when the edge did not tell us. */
export const getVisitorCountry = createServerFn({ method: "GET" }).handler(async () => {
  const h = getRequest().headers;
  const raw =
    h.get("x-vercel-ip-country") ??
    // Cloudflare and Netlify equivalents, so this keeps working if hosting moves.
    h.get("cf-ipcountry") ??
    h.get("x-nf-client-connection-country") ??
    null;
  const code = String(raw ?? "").trim().toUpperCase();
  // "XX" and "T1" are Vercel's own placeholders for unknown / Tor.
  return { country: code && code.length === 2 && code !== "XX" && code !== "T1" ? code : null };
});
