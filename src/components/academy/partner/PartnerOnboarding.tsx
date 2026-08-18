/**
 * PartnerOnboarding — was ein frisch freigegebener Partner als Erstes sieht.
 *
 * Die Freigabe legt Login und Marke an, aber sonst nichts: keine Kanäle, kein
 * Broker-Link. Ohne diese Ansicht landet jemand nach der Einladung in einem
 * Dashboard voller Nullen und weiß nicht, ob etwas kaputt ist oder ob er noch
 * etwas tun muss. Das ist der Moment, in dem man einen Partner verliert — er
 * hat gerade zugesagt und findet eine leere Seite vor.
 *
 * Deshalb steht hier, was WIR tun, was ER tut, und in welcher Reihenfolge.
 *
 * Sie verschwindet von selbst, sobald die Marke eingerichtet ist (ein Kanal
 * hinterlegt). Ein Onboarding, das nach dem Onboarding stehen bleibt, ist
 * Dekoration und macht das Dashboard unübersichtlich.
 */
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  body: string;
  who: "wir" | "du";
  done?: boolean;
}

/**
 * Holt sich den Stand selbst statt ihn durchgereicht zu bekommen: die
 * Partner-Zeile aus affiliate_dashboard fuehrt den Kanal nicht, und diese
 * Ansicht haengt genau daran. Beide Abfragen sind per RLS auf die eigene Marke
 * beschraenkt.
 */
const db = () => supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (c: string, v: string) => Promise<{ data: Record<string, unknown>[] | null }> };
  };
};

export function PartnerOnboarding({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<{ hasChannel: boolean; hasIbClaim: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      db().from("tenants").select("telegram_channel_id").eq("slug", slug),
      db().from("tenant_ib_claims").select("id").eq("tenant_slug", slug),
    ]).then(([t, c]) => {
      if (!alive) return;
      setState({
        hasChannel: Boolean((t.data ?? [])[0]?.telegram_channel_id),
        hasIbClaim: (c.data ?? []).length > 0,
      });
    }).catch(() => { if (alive) setState({ hasChannel: false, hasIbClaim: false }); });
    return () => { alive = false; };
  }, [slug]);

  // Erst rendern, wenn der Stand bekannt ist — sonst blitzt die Anleitung bei
  // einem laengst eingerichteten Partner kurz auf.
  if (!state) return null;
  const { hasChannel, hasIbClaim } = state;
  // Eingerichtet? Dann hat der Partner die Anleitung hinter sich.
  if (hasChannel) return null;

  const steps: Step[] = [
    {
      who: "wir",
      title: "Wir melden uns bei dir",
      body: "Kurzer Call: wir gehen deine Nische durch, deinen Kanal und wie deine Leute am besten reinkommen.",
    },
    {
      who: "du",
      title: "Broker-Konto über unseren Link eröffnen",
      body: "Unten auf dieser Seite. Ein Konto, das woanders eröffnet wird, hängt nicht unter uns und kann nie abgerechnet werden.",
      done: hasIbClaim,
    },
    {
      who: "du",
      title: "Deine Kontonummer hier eintragen",
      body: "Damit ordnen wir dir dein Volumen zu. Wir bestätigen sie von Hand gegen die Broker-Daten.",
      done: hasIbClaim,
    },
    {
      who: "wir",
      title: "Wir bauen deine Seite und deine Kanäle",
      body: "Landingpage unter deinem Namen, dein Signalkanal, dein Infokanal, dein eigener Bot. Du musst nichts installieren.",
    },
    {
      who: "wir",
      title: "Wir schalten dich scharf",
      body: "Ab dann laufen Signale automatisch in deine Kanäle, und dein Dashboard hier zeigt echte Zahlen statt Nullen.",
    },
  ];

  return (
    <div className="rounded-[22px] border border-primary/25 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)] p-5 sm:p-7">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
        <Check className="h-3 w-3" /> Aufgenommen
      </span>

      <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
        Willkommen{name ? `, ${name}` : ""}. So geht es weiter.
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/70">
        Dein Zugang steht. Die Zahlen unten sind noch leer — das ist richtig so, deine Marke wird
        gerade eingerichtet. Zwei Dinge brauchen wir von dir, den Rest machen wir.
      </p>

      <ol className="mt-6 space-y-2.5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={cn(
              "flex gap-3 rounded-2xl border p-4",
              s.done
                ? "border-emerald-400/25 bg-emerald-400/[0.06]"
                : s.who === "du"
                  ? "border-primary/25 bg-primary/[0.05]"
                  : "border-white/10 bg-white/[0.03]",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black",
                s.done
                  ? "bg-emerald-400/20 text-emerald-400"
                  : s.who === "du"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-white/60",
              )}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{s.title}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    s.who === "du"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-white/12 bg-white/5 text-muted-foreground",
                  )}
                >
                  {s.who === "du" ? "du" : "wir"}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <a
          href="https://t.me/cosmoscandles"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <MessageSquare className="h-4 w-4" /> Direkt schreiben <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Wir melden uns in der Regel am selben Werktag.
        </span>
      </div>
    </div>
  );
}
