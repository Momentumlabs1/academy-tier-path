import { Lock, Play, Clapperboard } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * 16:9 self-hosted lesson video player.
 * - Before play: shows a poster/gradient with a play overlay (no autoload).
 * - On play: mounts a native <video> element (autoplay, controls) from Supabase Storage.
 * - Locked: shows a blurred poster with an unlock CTA instead of the player.
 * - No videoUrl yet: shows a "coming soon" state.
 */
export function LessonVideo({
  videoUrl,
  posterUrl,
  title,
  playing,
  onPlay,
  locked,
  lockedTier,
}: {
  videoUrl?: string;
  posterUrl?: string;
  title: string;
  playing: boolean;
  onPlay: () => void;
  locked?: boolean;
  lockedTier?: string;
}) {
  const poster = (
    <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-[#101826] to-black" />
  );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black shadow-[var(--shadow-card)]">
      {locked ? (
        <>
          {posterUrl ? (
            <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm" />
          ) : (
            poster
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
      ) : !videoUrl ? (
        <>
          {poster}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Clapperboard className="h-6 w-6 text-white/70" />
            </div>
            <div className="text-sm font-semibold text-white/80">This video is coming soon</div>
          </div>
        </>
      ) : playing ? (
        <video
          className="absolute inset-0 h-full w-full bg-black"
          src={videoUrl}
          poster={posterUrl}
          controls
          autoPlay
          playsInline
          controlsList="nodownload"
        />
      ) : (
        <button onClick={onPlay} className="group absolute inset-0 h-full w-full" aria-label={`Play: ${title}`}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            poster
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
