import { Lock, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * 16:9 lesson video player.
 * - Before play: shows the YouTube thumbnail with a play overlay (no network cost).
 * - On play: embeds the privacy-friendly YouTube iframe with autoplay.
 * - Locked: shows a blurred poster with an unlock CTA instead of the player.
 */
export function LessonVideo({
  youtubeId,
  title,
  playing,
  onPlay,
  locked,
  lockedTier,
}: {
  youtubeId: string;
  title: string;
  playing: boolean;
  onPlay: () => void;
  locked?: boolean;
  lockedTier?: string;
}) {
  const thumb = `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black shadow-[var(--shadow-card)]">
      {locked ? (
        <>
          <img src={thumb} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-30 blur-sm" />
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
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
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
