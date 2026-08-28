import { useEffect, useState } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * PartnerChannelPulse — Begruessung plus das, was seit dem letzten Besuch in
 * SEINEM Kanal passiert ist.
 *
 * WARUM ES DAS GIBT
 * Das Portal zeigte Klicks, Kunden und Einzahlungen — alles Zahlen ueber
 * Fremde. Was der Partner taeglich wissen will, stand nirgends: laeuft mein
 * Kanal? Der Bot stellt dort mehrmals taeglich Rufe ein, und das ist die
 * sichtbarste Leistung, die er von uns bekommt. Sie lag ungenutzt in
 * signal_relays.delivered.
 *
 * WARUM DIE BEGRUESSUNG KEIN SCHMUCK IST
 * "Guten Tag, Zeko" allein waere Deko. Die Zeile darunter beantwortet die
 * Frage, mit der jemand ein Partnerportal oeffnet — "ist etwas passiert?" —
 * und zwar mit einer gezaehlten Zahl, nicht mit einer Floskel. Gab es nichts,
 * steht das auch so da; ein Portal, das jeden Tag Betrieb behauptet, glaubt
 * einem beim dritten Mal niemand mehr.
 */

type Stats = {
  signals_total: number;
  signals_7d: number;
  signals_30d: number;
  failed_30d: number;
  last_signal_at: string | null;
};

const rpc = () =>
  supabase as unknown as {
    rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: Stats[] | null }>;
  };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function PartnerChannelPulse({ slug, name, live }: { slug: string; name: string; live: boolean }) {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    rpc().rpc("partner_channel_stats", { p_slug: slug })
      .then(({ data }) => setS(data?.[0] ?? null));
  }, [slug]);

  const first = (name || slug).split(" ")[0];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold sm:text-2xl">
        {greeting()}, {first}.
      </h2>

      {/* Eine Zeile, die sagt, ob es sich lohnt weiterzulesen. */}
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {!live ? (
          <>Your brand is still being set up — the steps below show where we are.</>
        ) : s === null ? (
          <>Checking your channel…</>
        ) : s.signals_7d > 0 ? (
          <>
            The desk sent{" "}
            <span className="font-semibold text-foreground">{s.signals_7d} calls</span> into your
            channel this week. The last one {ago(s.last_signal_at)}.
          </>
        ) : s.signals_total > 0 ? (
          <>
            Quiet week — no calls into your channel in the last seven days. The last one{" "}
            {ago(s.last_signal_at)}.
          </>
        ) : (
          <>Nothing has gone into your channel yet.</>
        )}
      </p>

      {live && s && s.signals_total > 0 && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ["This week", s.signals_7d],
              ["Last 30 days", s.signals_30d],
              ["All time", s.signals_total],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-white/8 bg-black/20 px-3.5 py-3">
                <div className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{label}</div>
                <div className="mt-0.5 font-display text-xl font-black tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Calls the desk relayed into your Telegram channel — counted, not estimated.
          </div>

          {/* Fehler werden gezeigt, nicht verschwiegen. Wer merkt, dass zwei
              Rufe nicht ankamen, fragt nach — und genau das soll er. */}
          {s.failed_30d > 0 && (
            <div className={cn(
              "mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-[12px]",
              "border-amber-400/25 bg-amber-400/10 text-amber-200/90",
            )}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>
                {s.failed_30d} {s.failed_30d === 1 ? "call" : "calls"} could not be delivered in the
                last 30 days. Usually the original message was deleted before we copied it — tell us
                if it keeps happening.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
