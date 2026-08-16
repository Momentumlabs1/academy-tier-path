/**
 * The visitor's country, fetched once per page load.
 *
 * `brokerForCountry()` decides which broker a member is handed to, and until
 * now it was always called with null — so the rule never ran and everybody got
 * the fallback. The country only exists at the edge (see lib/api/geo.functions),
 * which means one round trip; there is no way to know it in the first render.
 *
 * Cached at module scope on purpose. Several components on the same page ask
 * for it (the rail card, the deposit strip, the tier page) and the answer
 * cannot change between them — one request, one answer, no flicker where two
 * buttons briefly disagree about which broker they point at.
 *
 * `null` while loading AND when unknown. Both mean the same thing to the
 * caller — "no country, use the safe default" — and collapsing them keeps
 * callers from having to invent a third behaviour for a state that lasts
 * 200 ms.
 */
import { useEffect, useState } from "react";
import { getVisitorCountry } from "@/lib/api/geo.functions";

let cached: string | null | undefined;      // undefined = not asked yet
let inflight: Promise<string | null> | null = null;

export function useVisitorCountry(): string | null {
  const [country, setCountry] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached !== undefined) return;
    let alive = true;
    inflight ??= getVisitorCountry()
      .then((r) => (r as { country: string | null }).country ?? null)
      .catch(() => null)
      .then((c) => { cached = c; return c; });
    inflight.then((c) => { if (alive) setCountry(c); });
    return () => { alive = false; };
  }, []);

  return country;
}
