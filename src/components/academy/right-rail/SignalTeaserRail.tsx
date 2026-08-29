/**
 * SignalTeaserRail — the live signal feed in the right rail, shown to everyone,
 * readable by nobody who hasn't deposited.
 *
 * WHY THE LOCK IS SERVER-SIDE
 * The old rail rendered a paragraph of copy behind a CSS blur. A blur is a
 * picture of a lock: the values still sit in the DOM, and anyone who opens the
 * inspector reads the entry and the stop. This component is fed by the
 * `signal_teasers` view (migration 038), which never selects a price. The bars
 * below are not covering anything up — there is genuinely nothing there to
 * cover. That is why they can be drawn as bars instead of smudges.
 *
 * WHAT A LOCKED MEMBER SEES: that NAS was called SHORT, that the desk set five
 * targets, that it happened two hours ago. Which is the honest version of the
 * pitch — the desk is working, and you are not in the room yet.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TELEGRAM_ENTRY } from "@/lib/broker";
import { cn } from "@/lib/utils";

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

/**
 * WIE LANGE EIN RUF ALS LEBEND GILT.
 *
 * Der Desk handelt kurzfristig; nach zehn Minuten ist der Trade durch. Bis
 * hierher stand auf einer Karte von GESTERN trotzdem "Running" — die Seite
 * behauptete damit einen offenen Trade, den es nicht mehr gibt. Das ist die
 * eine Sorte Fehler, die man auf einer Signalseite nicht machen darf: wer
 * darauf aufspringt, springt auf etwas Vergangenes.
 *
 * Ab hier gilt: aelter als zehn Minuten -> die Karte sagt "Inactive" und
 * nimmt sich optisch zurueck. Was der Desk GEMELDET hat (Ziele getroffen,
 * ausgestoppt, auf Einstand gezogen), bleibt stehen — das ist Vergangenheit
 * und bleibt wahr. Nur die Behauptung "laeuft gerade" verfaellt.
 */
const LIVE_WINDOW_MS = 10 * 60 * 1000;

/** "2h ago" beats a timestamp here: the point is that this is recent. */
function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const db = () =>
  supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: Teaser[] | null }>;
        };
      };
    };
  };

export function SignalTeaserRail({ locked }: { locked: boolean }) {
  const [rows, setRows] = useState<Teaser[] | null>(null);
  /* Eine tickende Uhr, damit eine Karte VOR den Augen des Besuchers auf
     "Inactive" umspringt. Ohne sie bliebe ein Ruf, der beim Seitenaufruf noch
     jung war, den ganzen Besuch lang "live" — und das Panel wuerde genau in
     dem Moment falsch, in dem jemand laenger hinsieht. Alle 30 Sekunden
     reicht: die Grenze liegt bei zehn Minuten, nicht bei Sekunden. */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    db().from("signal_teasers")
      .select("id, created_at, asset, side, targets, targets_hit, stopped_out, moved_to_be")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => { if (alive) setRows(data ?? []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  const live = rows && rows.length > 0;
  /* Der pulsende Punkt in der Ueberschrift ist ein Versprechen: "gerade
     passiert etwas". Er pulste bisher immer — auch wenn der juengste Ruf
     einen Tag alt war. Jetzt pulst er nur, wenn wirklich einer im
     Zehn-Minuten-Fenster liegt; sonst steht er ruhig. */
  const anyLive =
    now !== null && !!rows?.some((r) => now - new Date(r.created_at).getTime() <= LIVE_WINDOW_MS);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border p-5",
        locked
          ? "border-primary/25 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--primary)_9%,transparent),transparent_60%)]"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      {/* One soft bloom so the panel reads as the loudest thing in the rail. */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {anyLive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
            )}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", anyLive ? "bg-primary" : "bg-white/25")} />
          </span>
          <h3 className="font-display text-lg font-bold leading-none">Live signals</h3>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      </div>

      {/* WAS DIE LISTE ALLEIN NICHT SAGT.
          Einzelne Karten sind Einzelfaelle; die Frage dahinter ist "trifft der
          Desk ueberhaupt was". Diese Zeile beantwortet sie aus genau den Rufen,
          die darunter stehen — gezaehlt, nicht behauptet, und bewusst als
          "hat TP1 erreicht" formuliert und nicht als Rendite oder Trefferquote:
          ob jemand Geld verdient hat, haengt an seiner Position, nicht am Ruf. */}
      {live && rows && rows.length >= 3 && (
        <div className="relative mt-3.5 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Last {rows.length} calls
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {rows.filter((r) => r.targets_hit > 0).length}/{rows.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {rows.map((r) => (
              <span
                key={r.id}
                title={
                  r.stopped_out
                    ? "stopped out"
                    : r.targets_hit > 0
                      ? `${r.targets_hit} targets`
                      // Auch hier: nach dem Zeitfenster nicht mehr "running"
                      // behaupten. Dieselbe Regel wie auf den Karten.
                      : now !== null && now - new Date(r.created_at).getTime() > LIVE_WINDOW_MS
                        ? "closed"
                        : "running"
                }
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  r.stopped_out ? "bg-red-400/70" : r.targets_hit > 0 ? "bg-emerald-400/80" : "bg-white/15",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {rows.filter((r) => r.targets_hit > 0).length} reached at least their first target.
            What that was worth depends on your own position size.
          </p>
        </div>
      )}

      <div className="relative mt-3 space-y-2.5">
        {rows === null
          ? [0, 1, 2].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-white/[0.04]" />)
          : live
            ? rows.map((s) => <TeaserCard key={s.id} s={s} locked={locked} now={now} />)
            : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-muted-foreground">
                The desk posts every call in the private Telegram channel — instrument,
                entry, stop and targets. The last ones will appear here.
              </p>
            )}
      </div>

      {locked ? (
        <Link
          to="/tier"
          className="relative mt-4 flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:-translate-y-0.5"
        >
          Unlock the entries <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <a
          href={TELEGRAM_ENTRY.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-4 flex items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-3 text-sm font-bold transition-colors hover:bg-white/10"
        >
          Open the signal channel <ArrowRight className="h-4 w-4" />
        </a>
      )}

      {locked && (
        <p className="relative mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Entries, stops and targets go out live in the channel — from €100 verified deposit.
        </p>
      )}
    </div>
  );
}

function TeaserCard({ s, locked, now }: { s: Teaser; locked: boolean; now: number | null }) {
  const short = SHORT_SIDES.has(s.side);
  const Icon = short ? TrendingDown : TrendingUp;
  const tone = short ? "text-red-400" : "text-emerald-400";
  const toneBg = short ? "bg-red-400/10 border-red-400/25" : "bg-emerald-400/10 border-emerald-400/25";
  const accent = short ? "bg-red-400" : "bg-emerald-400";

  /* Solange die Uhr noch nicht steht (erster Frame), gilt der Ruf als lebend —
     lieber einmal zu frisch als ein falsches "Inactive" auf einem Ruf, der
     gerade erst reinkam. */
  const stale = now !== null && now - new Date(s.created_at).getTime() > LIVE_WINDOW_MS;

  /**
   * DER AUSGANG IST DIE NACHRICHT.
   *
   * Vorher stand auf jeder Karte fuenfmal untereinander "in Telegram" — einmal
   * je Zeile fuer Entry, Stop und die Ziele. Fuer ein gesperrtes Mitglied war
   * das eine schraffierte Leiste und damit ehrlich; fuer ein freigeschaltetes
   * war es eine Wand aus demselben Wort, die wie ein Fehler aussah. Die Zahlen
   * gehoeren in den Kanal, das bleibt so — aber das muss man einmal sagen,
   * nicht fuenfmal.
   *
   * Der Platz gehoert jetzt dem, was der Desk nach dem Ruf gemeldet hat:
   * getroffene Ziele, auf Einstand gezogen, ausgestoppt. Gemessen, nicht
   * behauptet — genau die Sorte Beleg, die diese Seite sonst nirgends hat.
   */
  const outcome = s.stopped_out
    ? { text: "Stopped out", cls: "text-red-400/90", dot: "bg-red-400" }
    : s.targets_hit > 0
      ? {
          text: `TP${s.targets_hit} reached${s.moved_to_be ? " · stop at break-even" : ""}`,
          cls: "text-emerald-400/90",
          dot: "bg-emerald-400",
        }
      : s.moved_to_be
        ? { text: "Moved to break-even", cls: "text-foreground/70", dot: "bg-white/40" }
        // Ein alter Ruf ohne gemeldetes Ergebnis "laeuft" nicht mehr. Das
        // Wort waere schlicht falsch, siehe LIVE_WINDOW_MS.
        : stale
          ? { text: "Closed — no target reported", cls: "text-foreground/45", dot: "bg-white/25" }
          : { text: "Running", cls: "text-foreground/55", dot: "bg-white/30" };

  const body = (
    <>
      {/* Farbkante links: SHORT rot, LONG gruen. Die Richtung ist die erste
          Information, die jemand sucht — sie soll ohne Lesen ankommen. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-2xl transition-opacity", accent, stale ? "opacity-25" : "opacity-90")}
      />
      <div className="flex items-center gap-2">
        <span className="font-display text-base font-black tracking-tight">{s.asset}</span>
        {s.side && (
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase", tone, toneBg)}>
            <Icon className="h-3 w-3" /> {s.side}
          </span>
        )}
        {/* Der Zustand steht neben dem Instrument, nicht im Kleingedruckten:
            "laeuft gerade" und "vorbei" sind zwei verschiedene Angebote. */}
        {stale ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground">
            Inactive
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Live
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">{ago(s.created_at)}</span>
      </div>

      {locked ? (
        /* Schraffierte Leisten statt verwischter Zahlen. Darunter liegt nichts,
           weil der Server nie eine geschickt hat. */
        <div className="mt-2.5 space-y-1.5">
          {["Entry", "Stop"].concat(Array.from({ length: Math.min(s.targets, 3) }, (_, i) => `TP${i + 1}`)).map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
              <span
                className="relative h-3.5 flex-1 overflow-hidden rounded-[5px] border border-white/10"
                style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.11) 0 6px, rgba(255,255,255,0.03) 6px 12px)" }}
                aria-label="locked"
              />
              <Lock className="h-3 w-3 shrink-0 text-white/25" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Der Ausgang, gross genug um ihn zu lesen. */}
          {/* Ziele als Punktreihe: auf einen Blick lesbar, ohne sie zu zaehlen. */}
          {s.targets > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {Array.from({ length: s.targets }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    s.stopped_out
                      ? "bg-white/10"
                      : i < s.targets_hit
                        ? "bg-emerald-400"
                        : "bg-white/12",
                  )}
                />
              ))}
            </div>
          )}
          <div className={cn("mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold", outcome.cls)}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", outcome.dot)} />
            {outcome.text}
          </div>
        </>
      )}

      {/* Der Pfeil sagt, dass die Karte irgendwohin fuehrt. Er kommt beim
          Zeigen, damit die Liste im Ruhezustand ruhig bleibt. */}
      <ArrowRight
        aria-hidden
        className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-70"
      />
    </>
  );

  /**
   * DIE KARTE FUEHRT DORTHIN, WO DER RUF WIRKLICH STEHT.
   *
   * Vorher war sie ein totes Rechteck: man las "GOLD SELL", tippte drauf, und
   * nichts passierte. Auf dem Handy ist eine Kachel, die aussieht wie ein
   * Knopf und keiner ist, die haeufigste Sackgasse ueberhaupt.
   * Gesperrt fuehrt sie zur Freischaltung, freigeschaltet in den Kanal — also
   * genau an die Stelle, an der die Zahlen stehen, die auf der Karte fehlen.
   */
  const shell = cn(
    "group relative block overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.995]",
    stale ? "border-white/8 bg-white/[0.025]" : "border-white/12 bg-white/[0.045]",
  );

  return locked ? (
    <Link to="/tier" className={shell} aria-label={`${s.asset} ${s.side} — unlock the entries`}>
      {body}
    </Link>
  ) : (
    <a
      href={TELEGRAM_ENTRY.url}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
      aria-label={`${s.asset} ${s.side} — open in the signal channel`}
    >
      {body}
    </a>
  );
}

