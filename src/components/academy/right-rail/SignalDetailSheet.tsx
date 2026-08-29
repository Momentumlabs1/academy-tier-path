import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Loader2, Lock, Send, TrendingDown, TrendingUp, X } from "lucide-react";
import { TelegramFallback } from "@/components/academy/signals/telegram-handoff";
import { openPersonalSignalChannel } from "@/lib/signal-channel";
import { cn } from "@/lib/utils";

/**
 * SignalDetailSheet — was hinter einer angetippten Signalkarte aufgeht.
 *
 * WARUM NICHT DIREKT NACH TELEGRAM
 * Die Karte fuehrte vorher mit einem Tipp aus der Akademie heraus in eine
 * fremde App. Das ist ein harter Sprung fuer etwas, das erstmal nur eine
 * Frage beantwortet ("was war das fuer ein Ruf?"). Jetzt oeffnet sich hier
 * die Karte in gross: derselbe Ruf, mit Uhrzeit, Zielstand und Ausgang —
 * und der Weg nach Telegram ist ein bewusster zweiter Schritt.
 *
 * WELCHER TELEGRAM-LINK — DER PUNKT, DEN DER NUTZER GEMELDET HAT
 * Es gibt zwei Kanaele: die oeffentliche INFO-Gruppe und die SIGNALGRUPPE.
 * Die Karte zeigte auf die Info-Gruppe. Fuer jemanden ohne Zugang ist das
 * richtig — fuer ein Mitglied, das eingezahlt und seine Stufe freigeschaltet
 * hat, ist es eine Beleidigung: es schickt ihn genau an den Ort, den er
 * bezahlt hat zu verlassen, und die Zahlen, die er sucht, stehen woanders.
 *
 * Freigeschaltet fuehrt der Knopf deshalb ueber `create-telegram-link` in die
 * SIGNALGRUPPE — ein persoenlicher Zugang, an die Sitzung gebunden, nicht an
 * eine geteilte Adresse. Gesperrt fuehrt er zur Freischaltung. Es gibt keinen
 * Fall mehr, in dem ein zahlendes Mitglied in der Info-Gruppe landet.
 */

interface Teaser {
  id: string;
  created_at: string;
  asset: string;
  side: string;
  targets: number;
  targets_hit: number;
  stopped_out: boolean;
  moved_to_be: boolean;
}

const SHORT_SIDES = new Set(["SELL", "SHORT"]);

function fullStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SignalDetailSheet({
  s, locked, stale, onClose,
}: { s: Teaser; locked: boolean; stale: boolean; onClose: () => void }) {
  const short = SHORT_SIDES.has(s.side);
  const Icon = short ? TrendingDown : TrendingUp;
  const [busy, setBusy] = useState(false);
  const [noApp, setNoApp] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Escape schliesst. Ein Fenster ohne diesen Weg raus fuehlt sich auf dem
  // Rechner an wie ein Haenger, nicht wie ein Fenster.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Persoenlicher Zugang zur SIGNALGRUPPE — nicht die Info-Gruppe. */
  async function openSignalChannel() {
    setBusy(true);
    setFailed(false);
    const r = await openPersonalSignalChannel();
    if (!r.ok && r.url) setNoApp(r.url);   // Telegram-App reagierte nicht
    else if (!r.ok) setFailed(true);       // Link kam gar nicht zustande
    setBusy(false);
  }

  const outcome = s.stopped_out
    ? { text: "Stopped out", cls: "text-red-400", dot: "bg-red-400" }
    : s.targets_hit > 0
      ? { text: `TP${s.targets_hit} reached${s.moved_to_be ? " · stop moved to break-even" : ""}`, cls: "text-emerald-400", dot: "bg-emerald-400" }
      : s.moved_to_be
        ? { text: "Moved to break-even", cls: "text-foreground/70", dot: "bg-white/40" }
        : stale
          ? { text: "Closed — no target reported", cls: "text-foreground/50", dot: "bg-white/25" }
          : { text: "Running", cls: "text-foreground/60", dot: "bg-white/30" };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${s.asset} ${s.side}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes sdsIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .sds-card { animation: sdsIn .3s cubic-bezier(.22,1,.36,1) backwards; }
        @media (prefers-reduced-motion: reduce) { .sds-card { animation: none; } }
      `}</style>

      {/* Klick INNEN darf nicht schliessen — sonst faellt das Fenster zu,
          sobald jemand den Text markieren will. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="sds-card relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[oklch(0.15_0.03_258)] shadow-2xl sm:rounded-3xl"
      >
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", short ? "bg-red-400" : "bg-emerald-400")} />

        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pb-6 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-2xl font-black tracking-tight">{s.asset}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase",
                short ? "border-red-400/25 bg-red-400/10 text-red-400" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-400",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {s.side}
            </span>
            {stale ? (
              <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
                Inactive
              </span>
            ) : (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live
              </span>
            )}
          </div>

          <p className="mt-1 text-[12px] text-muted-foreground">Called {fullStamp(s.created_at)}</p>

          {/* Zielstand als Reihe — dieselbe Sprache wie auf der Karte, nur
              gross genug, um die Zahl daneben lesen zu koennen. */}
          {s.targets > 0 && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Targets</span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{s.targets_hit}/{s.targets}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {Array.from({ length: s.targets }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-full",
                      s.stopped_out ? "bg-white/10" : i < s.targets_hit ? "bg-emerald-400" : "bg-white/12",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={cn("mt-4 flex items-center gap-2 text-sm font-semibold", outcome.cls)}>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", outcome.dot)} />
            {outcome.text}
          </div>

          {/* Was hier NICHT steht, und warum. Ohne diesen Satz sucht man die
              Zahlen und haelt ihr Fehlen fuer einen Fehler. */}
          <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
            Entry, stop and every target go out in the signal channel — never on this page.
            {locked
              ? " They stay hidden until your deposit is verified."
              : " Open the channel to see the exact levels for this call."}
          </p>

          {locked ? (
            <Link
              to="/tier"
              onClick={onClose}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Lock className="h-4 w-4" /> Unlock the entries <ArrowRight className="h-4 w-4" />
            </Link>
          ) : noApp ? (
            <div className="mt-5">
              <TelegramFallback url={noApp} onRetry={() => void openSignalChannel()} />
            </div>
          ) : (
            <>
              <button
                onClick={() => void openSignalChannel()}
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Open the signal channel
              </button>
              {failed && (
                <p className="mt-2 text-center text-[12px] text-destructive">
                  Could not create your channel link. Try again in a moment — or reach us in support.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
