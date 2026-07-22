/**
 * visual-search — "durchsuche das ganze Internet mit diesem Bild".
 *
 * Nimmt eine Bild-URL, ruft die SerpApi Google-Lens-API auf und liefert
 * visuell aehnliche, KAUFBARE Produkte zurueck (Titel, Preis, Haendler,
 * Kauflink, Thumbnail, Lagerstatus). Optional gefiltert auf einen Maximalpreis.
 * Treffer werden in sniper_finds gespeichert (dedup ueber unique(source,external_id)).
 *
 * WICHTIG (Realitaet, siehe docs/vinted-sniper/empfehlung-architektur.md):
 *  - Google Lens findet AEHNLICHE/kaufbare Treffer im ganzen Web — nicht
 *    garantiert exakt dasselbe Teil, und ohne Domain-Filter. Fuer Vinted-
 *    spezifische Live-Treffer ist der Poller zustaendig.
 *  - Es KOSTET pro Suche (SerpApi Free: 250/Monat, danach ~7,50 $/1000).
 *
 * Auth: Header  x-sniper-key: <SNIPER_KEY>  (wenn SNIPER_KEY gesetzt ist).
 * Secrets: SERPAPI_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, [SNIPER_KEY].
 *
 * Body: {
 *   imageUrl: string,           // oeffentlich erreichbare Bild-URL
 *   maxPrice?: number,          // Artikelpreis-Obergrenze (EUR)
 *   country?: string,           // Lens-Land, default "at"
 *   inspirationId?: string,     // optional: verknuepft Treffer mit Inspiration
 *   store?: boolean             // default true: Treffer in DB speichern
 * }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sniper-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

type LensMatch = {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  source_icon?: string;
  thumbnail?: string;
  image?: string;
  in_stock?: boolean;
  condition?: string;
  price?: {
    value?: string;
    extracted_value?: number;
    currency?: string;
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Auth-Gate (Kostenschutz)
  const gate = Deno.env.get("SNIPER_KEY");
  if (gate && req.headers.get("x-sniper-key") !== gate) {
    return json({ error: "unauthorized" }, 401);
  }

  const serpKey = Deno.env.get("SERPAPI_KEY");
  if (!serpKey) return json({ error: "SERPAPI_KEY not configured" }, 500);

  let body: {
    imageUrl?: string;
    maxPrice?: number;
    country?: string;
    inspirationId?: string;
    store?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) return json({ error: "imageUrl required" }, 400);
  const maxPrice = typeof body.maxPrice === "number" ? body.maxPrice : undefined;
  const country = (body.country || "at").toLowerCase();
  const store = body.store !== false;

  // ── SerpApi Google Lens ────────────────────────────────────────────────────
  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    type: "visual_matches",
    hl: "de",
    country,
    api_key: serpKey,
  });
  let matches: LensMatch[] = [];
  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await res.json();
    if (data.error) return json({ error: `SerpApi: ${data.error}` }, 502);
    matches = Array.isArray(data.visual_matches) ? data.visual_matches : [];
  } catch (e) {
    return json({ error: `SerpApi request failed: ${(e as Error).message}` }, 502);
  }

  // ── Normalisieren + filtern ─────────────────────────────────────────────────
  const results = matches
    .map((m) => {
      const price = m.price?.extracted_value ?? null;
      const currency = m.price?.currency ?? "EUR";
      return {
        source: "lens",
        external_id: m.link || `${m.position ?? ""}-${m.title ?? ""}`,
        title: m.title ?? "(ohne Titel)",
        price,
        currency,
        url: m.link ?? null,
        image_url: m.thumbnail || m.image || null,
        source_name: m.source ?? null,
        in_stock: m.in_stock ?? null,
        condition: m.condition ?? null,
      };
    })
    .filter((r) => r.url) // ohne Kauflink nutzlos
    .filter((r) => maxPrice == null || r.price == null || r.price <= maxPrice);

  // ── Speichern (dedup) ────────────────────────────────────────────────────────
  let stored = 0;
  if (store && results.length) {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const rows = results.map((r) => ({
      ...r,
      inspiration_id: body.inspirationId ?? null,
      status: "new",
    }));
    const { error, count } = await db
      .from("sniper_finds")
      .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true, count: "exact" });
    if (!error) stored = count ?? 0;
  }

  return json({
    count: results.length,
    stored,
    maxPrice: maxPrice ?? null,
    results,
    note:
      "Google Lens liefert visuell aehnliche, kaufbare Treffer im ganzen Web — " +
      "nicht garantiert exakt dasselbe Teil. Fuer Vinted-Live-Treffer den Poller nutzen.",
  });
});
