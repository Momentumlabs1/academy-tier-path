import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Bubble, BubbleSegment} from './Bubble';
import {Captions} from './Captions';
import {Chart} from './chart/Chart';
import {IntroTimeline} from './IntroTimeline';
import {CAPTIONS_CTA_AD, CAPTIONS_CTA_ORGANIC, CAPTIONS_MAIN, Caption} from './captions';
import {ensureFont} from './fonts';
import {COLORS, FPS, TRIM} from './theme';

export type Variant = 'organic' | 'ad';

// -- timing ---------------------------------------------------------------
// organic: one straight take, src 0.4 .. 108.7
// ad:      src 0.4 .. 100.35, then jump to the ad-CTA take, src 109.95 .. 122.6
export const PART_A_END_SRC = 100.35;
export const PART_B_START_SRC = 109.95;
export const PART_B_END_SRC = 122.6;
export const ORGANIC_END_SRC = 108.7;

// epsilon guards against IEEE-754 (100.35-0.4)*30 = 2998.4999... landing one frame short
const roundF = (x: number) => Math.round(x + 1e-6);

export const partAFrames = roundF((PART_A_END_SRC - TRIM) * FPS); // 2999
export const partBFrames = roundF((PART_B_END_SRC - PART_B_START_SRC) * FPS); // 380

export const ORGANIC_DURATION = roundF((ORGANIC_END_SRC - TRIM) * FPS);
export const AD_DURATION = partAFrames + partBFrames;

const AD_CTA_SHIFT = PART_B_START_SRC - PART_A_END_SRC; // 9.6s cut out

export const TimVideo: React.FC<{variant: Variant}> = ({variant}) => {
  ensureFont();
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps; // composition seconds

  // composition time -> source time
  const tSrc =
    variant === 'ad' && t >= PART_A_END_SRC - TRIM ? t + TRIM + AD_CTA_SHIFT : t + TRIM;

  const captions: Caption[] = useMemo(() => {
    const shift = (list: Caption[], by: number) =>
      list.map((c) => ({...c, s: c.s - by, e: c.e - by}));
    if (variant === 'organic') {
      return shift([...CAPTIONS_MAIN, ...CAPTIONS_CTA_ORGANIC], TRIM);
    }
    return [...shift(CAPTIONS_MAIN, TRIM), ...shift(CAPTIONS_CTA_AD, TRIM + AD_CTA_SHIFT)];
  }, [variant]);

  const bubbleSegments: BubbleSegment[] = useMemo(() => {
    if (variant === 'organic') {
      return [{fromFrame: 0, durationInFrames: ORGANIC_DURATION, startFromSec: TRIM}];
    }
    return [
      {fromFrame: 0, durationInFrames: partAFrames, startFromSec: TRIM},
      {fromFrame: partAFrames, durationInFrames: partBFrames, startFromSec: PART_B_START_SRC},
    ];
  }, [variant]);

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
        <IntroTimeline />
        <Chart tSrc={tSrc} />
        <Bubble segments={bubbleSegments} />
        <Captions captions={captions} />
      </AbsoluteFill>

      {variant === 'organic' ? (
        <Audio
          src={audioSrc}
          startFrom={Math.round(TRIM * FPS)}
          volume={(f) =>
            interpolate(f, [0, 4, ORGANIC_DURATION - 26, ORGANIC_DURATION - 4], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      ) : (
        <>
          <Sequence from={0} durationInFrames={partAFrames}>
            <Audio
              src={audioSrc}
              startFrom={Math.round(TRIM * FPS)}
              volume={(f) =>
                interpolate(f, [0, 4, partAFrames - 4, partAFrames - 1], [0, 1, 1, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              }
            />
          </Sequence>
          <Sequence from={partAFrames} durationInFrames={partBFrames}>
            <Audio
              src={audioSrc}
              startFrom={Math.round(PART_B_START_SRC * FPS + 1e-6)}
              volume={(f) =>
                interpolate(f, [0, 3, partBFrames - 26, partBFrames - 4], [0, 1, 1, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              }
            />
          </Sequence>
        </>
      )}

      <AbsoluteFill style={{background: '#000', opacity: endFade, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
