/**
 * vision-keywords — Inspirationsbild -> strukturierte Vinted-Suchbegriffe.
 *
 * Ein guenstiger Claude-Haiku-Vision-Call liest aus einem Bild:
 *   { aesthetic, garment, colors[], patterns[], keywords_de[], keywords_en[],
 *     brand_guess, price_band }
 * Daraus baut die App Vinted-Presets/Such-URLs (Recall). Marke bleibt nur ein
 * WEICHER Tipp (VLMs erkennen Marken ohne Logo unzuverlaessig) — nie hart filtern.
 *
 * Kosten: Haiku 4.5 ~ 4 $ / 1000 Bilder (bewusst kleines Modell wegen
 * "so kostenlos wie moeglich"). Modell absichtlich nicht Opus.
 *
 * Auth: Header x-sniper-key. Secrets: ANTHROPIC_API_KEY, [SNIPER_KEY].
 * Body: { imageUrl: string, domain?: string }  // domain default vinted.at
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

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

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    aesthetic: { type: "string", description: "z.B. fairycore, coquette, y2k, cottagecore, sequin" },
    garment: { type: "string", enum: ["tops", "dresses", "skirts", "sets", "knit", "other"] },
    colors: { type: "array", items: { type: "string" } },
    patterns: { type: "array", items: { type: "string" } },
    keywords_de: { type: "array", items: { type: "string" } },
    keywords_en: { type: "array", items: { type: "string" } },
    brand_guess: { type: "string", description: "nur wenn Logo/Schnitt eindeutig, sonst leer" },
    price_band: { type: "string", description: "grobes Preisband des Neuwerts, z.B. '20-40 EUR'" },
  },
  required: [
    "aesthetic",
    "garment",
    "colors",
    "patterns",
    "keywords_de",
    "keywords_en",
    "brand_guess",
    "price_band",
  ],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = Deno.env.get("SNIPER_KEY");
  if (gate && req.headers.get("x-sniper-key") !== gate) {
    return json({ error: "unauthorized" }, 401);
  }
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: { imageUrl?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) return json({ error: "imageUrl required" }, 400);
  const domain = body.domain || "vinted.at";

  const client = new Anthropic({ apiKey });
  let attrs: Record<string, unknown>;
  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      // Structured Outputs (von Haiku 4.5 unterstuetzt) -> sauberes JSON
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text:
                "Analysiere dieses Mode-Inspirationsbild fuer Second-Hand-Reselling " +
                "(Zielgruppe junge Frauen 20-30). Fuelle das Schema aus. Keywords als " +
                "kurze, gut suchbare Begriffe (Deutsch UND Englisch), inkl. Aesthetic-" +
                "Woerter (fairycore/coquette/y2k/...) und konkrete Merkmale (mesh, " +
                "pailletten, spitze, blumenmuster). brand_guess nur bei sichtbarem Logo.",
            },
          ],
        },
      ],
    } as unknown as Parameters<typeof client.messages.create>[0]);

    const textBlock = (msg.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === "text",
    );
    attrs = JSON.parse(textBlock?.text ?? "{}");
  } catch (e) {
    return json({ error: `Anthropic request failed: ${(e as Error).message}` }, 502);
  }

  // Fertige vinted.at-Such-URLs aus den ersten Keywords bauen
  const kws = [
    ...((attrs.keywords_de as string[]) || []),
    ...((attrs.keywords_en as string[]) || []),
  ].slice(0, 5);
  const priceTo = (attrs.garment === "dresses" ? 12 : 6);
  const searchUrls = kws.map((kw) => ({
    keyword: kw,
    url:
      `https://www.${domain}/catalog?search_text=${encodeURIComponent(kw)}` +
      `&price_to=${priceTo}&currency=EUR&order=newest_first`,
  }));

  return json({ attributes: attrs, priceTo, searchUrls });
});
