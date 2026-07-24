import { Lock, Play, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useSignedVideoUrl } from "@/hooks/useSignedVideoUrl";

/**
 * 16:9 lesson video player. Two sources, one component:
 * - `videoObject` set → the real course recording in the private Supabase
 *   `academy-videos` bucket, played via a gated, time-limited SIGNED URL
 *   (fetched on play, `preload="none"` — never pre-loaded).
 * - otherwise → the YouTube placeholder (thumbnail before play, no network cost).
 * Locked: a blurred/branded poster with an unlock CTA instead of the player.
 */
export function LessonVideo({
  youtubeId,
  videoObject,
  poster,
  title,
  playing,
  onPlay,
  locked,
  lockedTier,
}: {
  youtubeId: string;
  videoObject?: string;
  poster?: string;
  title: string;
  playing: boolean;
  onPlay: () => void;
  locked?: boolean;
  lockedTier?: string;
}) {
  const isSupabase = Boolean(videoObject);
  const { url, loading, error, load } = useSignedVideoUrl(videoObject);
  const brandedPoster = "radial-gradient(120% 120% at 50% 0%, oklch(0.22 0.06 260), oklch(0.1 0.03 260))";
  const ytThumb = `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;

  // Request the signed URL only once the (entitled) member presses play.
  useEffect(() => {
    if (isSupabase && playing && !locked) load();
  }, [isSupabase, playing, locked, load]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black shadow-[var(--shadow-card)]">
      {locked ? (
        <>
          {poster ? (
            <img src={poster} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm" />
          ) : isSupabase ? (
            <div className="absolute inset-0" style={{ background: brandedPoster }} />
          ) : (
            <img src={ytThumb} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm" />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Lock className="h-6 w-6 text-white/80" />
            </div>
            <div className="text-sm font-semibold text-white/90">This lesson unlocks at {lockedTier}</div>
            <Link
              to="/tier"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lime)] transition-transform hover:scale-[1.03]"
            >
              See how to unlock
            </Link>
          </div>
        </>
      ) : playing && isSupabase ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {url ? (
            <video src={url} controls autoPlay playsInline preload="none" className="h-full w-full">
              Dein Browser unterstützt kein Video.
            </video>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-sm text-white/70">
              <span>{error === "locked" ? "Dieses Video ist für deine Stufe noch gesperrt." : error}</span>
              <button onClick={load} className="text-primary hover:underline">Erneut versuchen</button>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          )}
          {loading && !url && !error && <span className="sr-only">Lädt…</span>}
        </div>
      ) : playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button onClick={onPlay} className="group absolute inset-0 h-full w-full" aria-label={`Play: ${title}`}>
          {poster ? (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : isSupabase ? (
            <div className="absolute inset-0" style={{ background: brandedPoster }} />
          ) : (
            <img
              src={ytThumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lime)] transition-transform duration-300 group-hover:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 fill-current" />
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
