import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BROKERS } from "@/lib/broker";
import { cn } from "@/lib/utils";

/**
 * PartnerBrokerLinks — der eigene Werbelink des Partners, je Broker, mit Ampel.
 *
 * WARUM ES DAS GIBT
 * Ein Partner hat bei jedem Broker einen eigenen Link, und welchen sein
 * Publikum braucht, haengt am Land. Zekos Leute sitzen ueberwiegend in den USA
 * und gehen ueber HeroFX; VT Markets kommt spaeter dazu. Bis hierher gab es
 * genau EIN Feld (tenants.broker_affiliate_url) und keinen Weg, den zweiten
 * nachzureichen — "kommt spaeter" war eine Sackgasse.
 *
 * WARUM ER ES SELBST EINTRAEGT
 * Dieser Link bewegt in unserem System kein Geld; er ist die Adresse, die der
 * Partner seinem eigenen Publikum gibt. Ist sie falsch, schadet sie nur ihm,
 * und er sieht es sofort. Die Kontonummer, an der die Provisionszuordnung
 * haengt, ist ein anderes Feld und braucht weiterhin eine Bestaetigung von
 * Hand (siehe PartnerIbSetup).
 *
 * WAS DIE AMPEL SAGT
 * Gruen heisst NUR: hier ist ein Link hinterlegt. Sie behauptet nicht, dass er
 * funktioniert oder dass der Broker den Partner kennt — das kann diese Seite
 * nicht wissen, und eine Ampel, die mehr behauptet als sie geprueft hat, ist
 * schlimmer als keine.
 */

type Row = { broker: string; url: string };

const db = () =>
  supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: Row[] | null }> };
      upsert: (v: Record<string, unknown>, o?: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };

/**
 * Wer bekommt welchen Link.
 *
 * Steht so in broker.ts (brokerForCountry): US -> HeroFX, alles andere -> VT
 * Markets. Das hier ist nur die Beschriftung derselben Regel — sie wird NICHT
 * hier entschieden, damit beides nicht auseinanderlaufen kann.
 */
const ORDER = [
  { key: "hero" as const, region: "United States" },
  { key: "vt" as const,   region: "Everywhere else" },
];

export function PartnerBrokerLinks({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    db().from("tenant_broker_links").select("broker, url").eq("tenant_slug", slug)
      .then(({ data }) => setRows(data ?? []));
  }, [slug]);

  async function save(broker: string) {
    const url = (draft[broker] ?? "").trim();
    if (!url) return;
    // Ein Link, der nicht wie einer aussieht, wird gar nicht erst gespeichert —
    // sonst steht die Ampel auf gruen fuer etwas, das niemanden irgendwohin
    // bringt.
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
      setError("That does not look like a link. It should start with https:// —");
      return;
    }
    setBusy(broker);
    setError(null);
    const { error: e } = await db().from("tenant_broker_links")
      .upsert({ tenant_slug: slug, broker, url, updated_at: new Date().toISOString() },
              { onConflict: "tenant_slug,broker" });
    setBusy(null);
    if (e) { setError(e.message); return; }
    setRows((prev) => [...(prev ?? []).filter((r) => r.broker !== broker), { broker, url }]);
    setDraft((d) => ({ ...d, [broker]: "" }));
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h3 className="font-display text-base font-bold">Your broker links</h3>
      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        The address you give your own audience. Which one someone needs depends on where
        they live: <strong className="text-foreground/85">the US goes through HeroFX,
        everywhere else through VT Markets</strong>. Add the ones you have — the other can
        follow later without anything breaking.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ORDER.map(({ key, region }) => {
          const broker = BROKERS[key];
          const row = rows?.find((r) => r.broker === key);
          const set = Boolean(row?.url);
          const loading = rows === null;

          return (
            <div key={key} className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold">{broker.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{region}</div>
                </div>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      set
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-400"
                        : "border-red-400/25 bg-red-400/10 text-red-400",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", set ? "bg-emerald-400" : "bg-red-400")} />
                    {set ? "Link added" : "Missing"}
                  </span>
                )}
              </div>

              {set ? (
                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 font-mono text-[11px] text-foreground/80">
                    {row!.url}
                  </code>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(row!.url);
                      setCopied(key);
                      setTimeout(() => setCopied(null), 1600);
                    }}
                    aria-label={`Copy ${broker.name} link`}
                    className="shrink-0 rounded-lg border border-white/12 p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {copied === key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <>
                  {/* Keine Sackgasse: fehlt der Link, steht daneben, wo man ihn holt. */}
                  <a
                    href={broker.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    Get your {broker.name} link <ArrowUpRight className="h-3 w-3" />
                  </a>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder="https://…"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[oklch(0.11_0.03_258)] px-2.5 py-2 text-base outline-none focus:border-primary/50 sm:text-[12px]"
                    />
                    <button
                      onClick={() => save(key)}
                      disabled={busy === key || !(draft[key] ?? "").trim()}
                      className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-primary-foreground disabled:opacity-40"
                    >
                      {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Green means a link is stored here — not that the broker has approved you. Your
        customers and payouts live in your broker portal.
      </p>
    </div>
  );
}
