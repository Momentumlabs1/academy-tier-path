import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bubble, BubbleSegment} from './Bubble';
import {Captions} from './Captions';
import {Chart} from './chart/Chart';
import {IntroTimeline} from './IntroTimeline';
import {CAPTIONS_CTA_AD, CAPTIONS_CTA_ORGANIC, CAPTIONS_MAIN, Caption} from './captions';
import {Sfx} from './Sfx';
import {ensureFont} from './fonts';
import {COLORS, FPS} from './theme';
import {AD_TIMELINE, ORGANIC_TIMELINE, Timeline} from './timeline';

export type Variant = 'organic' | 'ad';

export const ORGANIC_DURATION = ORGANIC_TIMELINE.durationInFrames;
export const AD_DURATION = AD_TIMELINE.durationInFrames;

export const TimVideo: React.FC<{variant: Variant}> = ({variant}) => {
  ensureFont();
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps; // composition seconds

  const timeline: Timeline = variant === 'ad' ? AD_TIMELINE : ORGANIC_TIMELINE;
  const tSrc = timeline.compToSrc(t);

  const captions: Caption[] = useMemo(() => {
    const src = variant === 'organic' ? [...CAPTIONS_MAIN, ...CAPTIONS_CTA_ORGANIC] : [...CAPTIONS_MAIN, ...CAPTIONS_CTA_AD];
    return src
      .map((c) => ({...c, s: timeline.srcToComp(c.s), e: timeline.srcToComp(c.e)}))
      .filter((c) => c.e - c.s > 0.05);
  }, [variant, timeline]);

  const bubbleSegments: BubbleSegment[] = useMemo(
    () =>
      timeline.segs.map((s) => ({
        fromFrame: s.fromFrame,
        durationInFrames: s.durationInFrames,
        startFromSec: s.srcStartFrame / FPS,
      })),
    [timeline],
  );

  // micro reframe at the very start ("camera settles"), then slow drift-in
  const settle = interpolate(t, [0, 0.7], [1, 0], {extrapolateRight: 'clamp'});
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.022]);
  const rot = settle * 0.5;
  const dy = settle * 8;

  // end fade
  const endFade = interpolate(frame, [durationInFrames - 22, durationInFrames - 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const audioSrc = staticFile('assets/tim-audio-norm.m4a');

  return (
    <AbsoluteFill style={{background: COLORS.bg}}>
      <AbsoluteFill
        style={{
          transform: `scale(${drift * (1 + settle * 0.012)}) rotate(${rot}deg) translateY(${dy}px)`,
          transformOrigin: '50% 42%',
        }}
      >
        <IntroTimeline tSrc={tSrc} />
        <Chart tSrc={tSrc} />
        <Bubble segments={bubbleSegments} />
        <Captions captions={captions} />
      </AbsoluteFill>

      <Sfx timeline={timeline} />

      {timeline.segs.map((seg, i) => {
        const isLast = i === timeline.segs.length - 1;
        const d = seg.durationInFrames;
        return (
          <Sequence key={i} from={seg.fromFrame} durationInFrames={d}>
            <Audio
              src={audioSrc}
              startFrom={seg.srcStartFrame}
              volume={(f) =>
                interpolate(
                  f,
                  isLast ? [0, 2, d - 26, d - 4] : [0, 2, d - 2, d],
                  isLast ? [0, 1, 1, 0] : [0, 1, 1, 0],
                  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                )
              }
            />
          </Sequence>
        );
      })}

      <AbsoluteFill style={{background: '#000', opacity: endFade, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
