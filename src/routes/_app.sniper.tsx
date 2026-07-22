import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ExternalLink, ImagePlus, Loader2, ScanSearch, Sparkles, Tag } from "lucide-react";
import { Card } from "@/components/academy/primitives/Card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sniper")({
  head: () => ({
    meta: [
      { title: "Sniper — Bild-Suche & Deals" },
      { name: "description", content: "Lade ein Teil hoch und finde ähnliche, kaufbare Treffer im ganzen Internet." },
    ],
  }),
  component: SniperPage,
});

const SNIPER_KEY = import.meta.env.VITE_SNIPER_KEY as string | undefined;

type Find = {
  title: string;
  price: number | null;
  currency: string;
  url: string;
  image_url: string | null;
  source_name: string | null;
  in_stock: boolean | null;
  condition: string | null;
};

type Attributes = {
  aesthetic: string;
  garment: string;
  colors: string[];
  patterns: string[];
  keywords_de: string[];
  keywords_en: string[];
  brand_guess: string;
  price_band: string;
};

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const headers = SNIPER_KEY ? { "x-sniper-key": SNIPER_KEY } : undefined;
  const { data, error } = await supabase.functions.invoke(fn, { body, headers });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

function SniperPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [maxPrice, setMaxPrice] = useState(6);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Find[] | null>(null);
  const [attrs, setAttrs] = useState<Attributes | null>(null);
  const [searchUrls, setSearchUrls] = useState<{ keyword: string; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `inspo/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sniper").upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("sniper").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e) {
      setError(`Upload fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function runSearch() {
    if (!imageUrl) return setError("Bitte zuerst ein Bild hochladen oder eine Bild-URL einfügen.");
    setError(null);
    setSearching(true);
    setResults(null);
    try {
      const res = await invoke<{ results: Find[] }>("visual-search", {
        imageUrl,
        maxPrice,
        country: "at",
      });
      setResults(res.results);
    } catch (e) {
      setError(`Suche fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  }

  async function runAnalyse() {
    if (!imageUrl) return setError("Bitte zuerst ein Bild hochladen oder eine Bild-URL einfügen.");
    setError(null);
    setAnalysing(true);
    setAttrs(null);
    try {
      const res = await invoke<{ attributes: Attributes; searchUrls: { keyword: string; url: string }[] }>(
        "vision-keywords",
        { imageUrl },
      );
      setAttrs(res.attributes);
      setSearchUrls(res.searchUrls);
    } catch (e) {
      setError(`Analyse fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Sniper</h1>
        <p className="mt-1 text-muted-foreground">
          Teil hochladen → ähnliche, <span className="text-foreground">kaufbare</span> Treffer im ganzen Internet
          (Preis + Kauflink). Für Vinted-Live-Deals nutzt der Poller dieselben Presets.
        </p>
      </div>

      {/* ── Eingabe ─────────────────────────────────────────────── */}
      <Card variant="surface" className="space-y-4 p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Bild-URL
              </span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… oder Bild hochladen →"
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Bild hochladen
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <label className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Max €
                </span>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="w-20 rounded-xl bg-white/5 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
            </div>
          </div>

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Inspiration"
              className="h-28 w-28 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runSearch}
            disabled={searching || !imageUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] hover:brightness-110 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Ähnliche im ganzen Internet finden
          </button>
          <button
            onClick={runAnalyse}
            disabled={analysing || !imageUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            {analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Vinted-Suchbegriffe erzeugen
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-amber-400">{error}</p>}
        <p className="text-[11px] text-muted-foreground">
          Hinweis: Google Lens liefert <span className="text-foreground/80">ähnliche</span> kaufbare Treffer im Web —
          nicht garantiert exakt dasselbe Teil. Jede Suche kostet ein SerpApi-Guthaben (Free: 250/Monat).
        </p>
      </Card>

      {/* ── Vinted-Keywords ─────────────────────────────────────── */}
      {attrs && (
        <Card variant="surface" className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-bold">
              {attrs.aesthetic} · {attrs.garment}
              {attrs.brand_guess && <span className="text-muted-foreground"> · evtl. {attrs.brand_guess}</span>}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchUrls.map((s) => (
              <a
                key={s.keyword}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25"
              >
                <Tag className="h-3 w-3" /> {s.keyword}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Farben: {attrs.colors.join(", ") || "–"} · Muster: {attrs.patterns.join(", ") || "–"} · Neuwert:{" "}
            {attrs.price_band}
          </p>
        </Card>
      )}

      {/* ── Treffer ─────────────────────────────────────────────── */}
      {results && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{results.length} Treffer</h2>
            <span className="text-xs text-muted-foreground">≤ {maxPrice} € markiert</span>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine kaufbaren Treffer unter deinem Limit. Limit erhöhen oder anderes Bild probieren.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((r, i) => {
                const good = r.price != null && r.price <= maxPrice;
                return (
                  <a
                    key={r.url + i}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-col overflow-hidden rounded-2xl bg-[color:var(--surface-2)]/60 ring-1 ring-white/5 transition hover:ring-primary/40"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-white/5">
                      {r.image_url ? (                        <img
                          src={r.image_url}
                          alt={r.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImagePlus className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <div className="line-clamp-2 text-xs font-medium">{r.title}</div>
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <span
                          className={cn(
                            "font-display text-sm font-bold tabular-nums",
                            good ? "text-primary" : "text-foreground/80",
                          )}
                        >
                          {r.price != null ? `${r.price} ${r.currency}` : "Preis?"}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      {r.source_name && (
                        <span className="truncate text-[10px] text-muted-foreground">{r.source_name}</span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
