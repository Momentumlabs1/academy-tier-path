/**
 * ProductShots — the real thing, not a description of it.
 *
 * A prospective partner's first question is "what IS this", and the honest
 * answer is visual. The recruitment page used to answer it in paragraphs, which
 * is the slowest possible way to say "live signals, a course, and orderflow
 * software" — and the reader is deciding in seconds whether to keep scrolling.
 *
 * So these are actual frames from the actual product: the pitch film, a real
 * lesson recorded off the real orderflow terminal, and a real footprint chart.
 * Not mock-ups and not stock. The captions are one line each on purpose; the
 * picture is doing the work, and anything longer competes with it.
 */
import { useRef, useState } from "react";
import { Play } from "lucide-react";

interface Shot {
  src: string;
  alt: string;
  caption: string;
  /** wide shots get the full row; the rest pair up */
  wide?: boolean;
}

const SHOTS: Shot[] = [
  {
    src: "/partner/orderflow-lesson.jpg",
    alt: "A Cosmos Candles lesson recorded on the live orderflow terminal, showing volume profile and footprint data",
    caption: "Lessons recorded on the real terminal — not slides.",
    wide: true,
  },
  {
    src: "/partner/footprint.jpg",
    alt: "Footprint chart with a marked liquidity cluster and cumulative volume delta",
    caption: "The orderflow tools your audience learns to read.",
  },
  {
    src: "/posters/l3.jpg",
    alt: "A lesson from the Cosmos Candles academy course",
    caption: "Twelve lessons, from the first candle upward.",
  },
];

export function ProductShots() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-4">
      {/* The pitch film. Poster-first, click to play: an autoplaying video on a
          cold page is noise, and this one is worth choosing to watch. */}
      <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            src="/pitch.mp4"
            poster="/pitch-poster.jpg"
            controls={playing}
            playsInline
            preload="none"
            className="h-full w-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <button
              type="button"
              onClick={() => videoRef.current?.play()}
              aria-label="Play the product film"
              className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/10"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </button>
          )}
        </div>
        <figcaption className="border-t border-white/8 px-5 py-3 text-sm text-foreground/70">
          The whole product in 90 seconds — this is what your link opens.
        </figcaption>
      </figure>

      <div className="grid gap-4 sm:grid-cols-2">
        {SHOTS.map((s) => (
          <figure
            key={s.src}
            className={`overflow-hidden rounded-2xl border border-white/10 bg-black ${s.wide ? "sm:col-span-2" : ""}`}
          >
            <img src={s.src} alt={s.alt} loading="lazy" className="w-full" />
            <figcaption className="border-t border-white/8 px-5 py-3 text-sm text-foreground/70">
              {s.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
