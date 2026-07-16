import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {FPS} from './theme';
import {Timeline} from './timeline';

// Subtle UI/trading sound design. Sources: Mixkit (free license, commercial use
// allowed, no attribution required), trimmed/filtered — clean, quiet, no "wind".
// All times in SOURCE seconds; mapped through the pause-cut timeline.

type SfxEvent = {at: number; file: string; vol: number; rate?: number};

const EVENTS: SfxEvent[] = [
  // intro: strategy pills pop, then the "Einfachheit" answer
  {at: 1.1, file: 'tick', vol: 0.18},
  {at: 1.75, file: 'tick', vol: 0.18},
  {at: 2.35, file: 'tick', vol: 0.18},
  {at: 2.95, file: 'tick', vol: 0.18},
  {at: 3.4, file: 'tick', vol: 0.18},
  {at: 4.05, file: 'shine', vol: 0.44}, // "Einfachheit schon."
  // chart build-up
  {at: 5.9, file: 'zoom', vol: 0.3}, // chart entrance
  {at: 6.6, file: 'ui', vol: 0.26}, // "Der einfachste Edge"-Pill
  {at: 9.0, file: 'whoosh', vol: 0.28},
  {at: 12.9, file: 'tick', vol: 0.2},
  {at: 13.6, file: 'tick', vol: 0.2},
  {at: 20.1, file: 'tick', vol: 0.18},
  {at: 24.7, file: 'shine', vol: 0.36}, // Value-Area-Box erscheint
  {at: 32.8, file: 'tick', vol: 0.2},
  {at: 35.3, file: 'tick', vol: 0.2},
  // scenario 1 — rejection short
  {at: 42.95, file: 'ui', vol: 0.3},
  {at: 43.0, file: 'zoom', vol: 0.28, rate: 1.12}, // punch-in on the M5 action
  {at: 45.9, file: 'whoosh', vol: 0.3},
  {at: 49.2, file: 'whoosh', vol: 0.27, rate: 0.82}, // retrace: darker, slower
  {at: 53.6, file: 'click', vol: 0.42}, // entry = mouse click
  {at: 57.8, file: 'check', vol: 0.22},
  {at: 60.5, file: 'check', vol: 0.22},
  {at: 63.2, file: 'tick', vol: 0.17},
  {at: 64.9, file: 'tick', vol: 0.17},
  {at: 66.4, file: 'tick', vol: 0.17},
  {at: 68.2, file: 'whoosh', vol: 0.33, rate: 0.78}, // explosive leg down
  {at: 69.6, file: 'pos', vol: 0.28}, // target hit
  {at: 70.35, file: 'sweep', vol: 0.36}, // scenario wipe
  // scenario 2 — acceptance long
  {at: 72.4, file: 'ui', vol: 0.3},
  {at: 76.2, file: 'zoom', vol: 0.28, rate: 1.12}, // punch-in scenario 2
  {at: 77.5, file: 'whoosh', vol: 0.27}, // breakout above the VAH
  {at: 84.3, file: 'tick', vol: 0.18},
  {at: 87.5, file: 'click', vol: 0.42}, // entry = mouse click
  {at: 88.2, file: 'check', vol: 0.2},
  {at: 91.5, file: 'tick', vol: 0.17},
  {at: 93.0, file: 'tick', vol: 0.17},
  {at: 94.4, file: 'tick', vol: 0.17},
  {at: 95.6, file: 'neg', vol: 0.27}, // stopped out
  {at: 96.45, file: 'zoom', vol: 0.25, rate: 0.85}, // zoom-out into the CTA
];

export const Sfx: React.FC<{timeline: Timeline}> = ({timeline}) => {
  return (
    <>
      {EVENTS.map((ev, i) => {
        const from = Math.round(timeline.srcToComp(ev.at) * FPS);
        const rate = ev.rate ?? 1;
        return (
          <Sequence key={i} from={from} durationInFrames={Math.ceil(45 / rate)}>
            <Audio
              src={staticFile(`assets/sfx/${ev.file}.wav`)}
              volume={ev.vol}
              playbackRate={rate}
            />
          </Sequence>
        );
      })}
    </>
  );
};
