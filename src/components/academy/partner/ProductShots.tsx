/**
 * ProductShots — what a partner's audience actually lands in.
 *
 * These are frames from the real product, not mock-ups and not stock: a lesson
 * recorded on the live orderflow terminal, a footprint chart with a marked
 * liquidity cluster, and a teaching board. A partner is being asked to put their
 * own audience behind this, so the depth of the material has to be visible
 * rather than asserted.
 *
 * Deliberately NOT the place for the pitch film. That film stars Zeko and runs
 * on his landing page, so it belongs in the case-study section where that framing
 * is honest — putting it up top under a generic caption was a straight
 * misrepresentation of whose video it is.
 */
interface Shot {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
}

import { LESSONS } from "@/lib/academy-data";

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
    caption: "The orderflow tools they learn to read.",
  },
  {
    src: "/posters/l3.jpg",
    alt: "A lesson board from the academy course on trading psychology",
    caption: `${LESSONS.length} lessons, from the first candle upward.`,
  },
];

export function ProductShots() {
  return (
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
  );
}
