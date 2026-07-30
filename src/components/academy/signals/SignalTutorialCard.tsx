/**
 * SignalTutorialCard — "copy your first signal", permanently available.
 *
 * This player used to live only inside PostDepositWelcome, which is dismissible
 * and remembers the dismissal in localStorage. So the one video that teaches the
 * core mechanic disappeared for good the first time somebody closed the welcome
 * card — exactly the people who would want to rewatch it. It now has a permanent
 * home on the Signals page; the welcome card renders the same component.
 *
 * The file is streamed from the private bucket through a gated signed URL that
 * is only fetched once the viewer actually hits play.
 */
import { useEffect, useState } from "react";
import { Loader2, PlayCircle, Sparkles } from "lucide-react";
import { useSignedVideoUrl } from "@/hooks/useSignedVideoUrl";
import { COSMO } from "@/lib/partner-brand";

export function SignalTutorialCard({
  accent,
  title = "Copy your first signal",
  subtitle = "Entry, stop-loss, take-profit — how to mirror a signal into your account.",
  className,
}: {
  accent: string;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const { url, loading, error, load } = useSignedVideoUrl("signals-tutorial.mp4");

  useEffect(() => { if (playing) load(); }, [playing, load]);

  return (
    <div className={"overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] " + (className ?? "")}>
      <div className="relative aspect-video bg-black">
        {playing ? (
          url ? (
            <video src={url} controls autoPlay playsInline preload="none" className="h-full w-full" />
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/70">
              <span>{error === "locked" ? "Available after your deposit." : error}</span>
              <button onClick={load} className="text-primary hover:underline">Try again</button>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/60" /></div>
          )
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0"
            aria-label={`Play: ${title}`}
            style={{ background: `linear-gradient(160deg, ${COSMO.bgFrom}, ${COSMO.bgTo})` }}
          >
            <img
              src="/posters/copysignals.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-black/25" />
            <span className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="h-14 w-14 text-white/80 drop-shadow transition-transform group-hover:scale-110" />
            </span>
          </button>
        )}
        {loading && !url && !error && <span className="sr-only">Loading…</span>}
      </div>
      <div className="flex items-start gap-3 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
        <div>
          <div className="font-display text-sm font-bold">{title}</div>
          <div className="mt-0.5 text-xs text-foreground/60">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
