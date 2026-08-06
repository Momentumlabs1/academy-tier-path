/**
 * LivePartnerCase — Zeko Global, as proof rather than as decoration.
 *
 * The strongest thing this pitch can do is stop describing the white-label
 * promise and point at a partner already running on it. So this section leads
 * with an actual screenshot of an actual live partner landing page: his name in
 * the nav, his character, his palette, his headline, his follower count. The
 * only trace of us is the small "powered by" line — which is exactly the claim
 * being made, shown instead of asserted.
 *
 * The pitch film lives here too, and only here. It stars Zeko and runs on his
 * page; an earlier version of this route opened with it under the caption "this
 * is what your link opens", which was simply untrue about whose video it is.
 * Framed as "the film on his page", it does real work: it shows a partner what
 * their own page would carry.
 *
 * The side-by-side with our own landing is the point of the section. Same engine,
 * two brands that share nothing visually — which is the question every serious
 * partner asks first: "will this look like your product or mine?"
 */
import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";

export function LivePartnerCase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="space-y-10">
      <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <img
          src="/partner/partner-page-zeko.jpg"
          alt="The live Zeko Global landing page: his own name, character, colours and headline, with a small 'powered by Cosmos Candles' badge"
          loading="lazy"
          className="w-full"
        />
        <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-3.5">
          <span className="text-sm text-foreground/70">
            Zeko Global — live right now, built on this system.
          </span>
          <a
            href="/zekoglobal"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Open his page <ArrowUpRight className="h-4 w-4" />
          </a>
        </figcaption>
      </figure>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <h3 className="font-display text-xl font-bold">His brand, not ours.</h3>
          <p className="mt-3 leading-relaxed text-foreground/70">
            His name in the nav, his character, his colours, his headline, his 155,000
            followers. The only thing that points back to us is one small line at the top.
            His audience joins <em>him</em>.
          </p>
          <p className="mt-3 leading-relaxed text-foreground/70">
            Yours is a separate component again: your own page, your own broker link, your
            own Telegram channel, your own numbers. Nothing is shared between partners —
            he cannot see your customers and you cannot see his.
          </p>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img
            src="/partner/partner-page-cosmos.jpg"
            alt="The Cosmos Candles landing page for comparison: blue palette, the Cosmo mascot"
            loading="lazy"
            className="w-full"
          />
          <figcaption className="border-t border-white/8 px-5 py-3 text-sm text-foreground/70">
            The same engine running our own brand — for comparison.
          </figcaption>
        </figure>
      </div>

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
              aria-label="Play the film that runs on a partner page"
              className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/10"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </button>
          )}
        </div>
        <figcaption className="border-t border-white/8 px-5 py-3 text-sm text-foreground/70">
          The film that runs on Zeko's page — and would run on yours, with your character.
        </figcaption>
      </figure>
    </div>
  );
}
