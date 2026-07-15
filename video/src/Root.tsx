import React from 'react';
import {Composition, Series} from 'remotion';
import {FPS, VIDEO_HEIGHT, VIDEO_WIDTH} from './lib/tokens';
import {Scene1ColdOpen} from './scenes/Scene1ColdOpen';
import {Scene2Dashboard} from './scenes/Scene2Dashboard';
import {Scene3Signals} from './scenes/Scene3Signals';
import {Scene4Education} from './scenes/Scene4Education';
import {Scene5Tiers} from './scenes/Scene5Tiers';
import {Scene6Transparency} from './scenes/Scene6Transparency';
import {Scene7CTA} from './scenes/Scene7CTA';

/** Scene durations in frames @ 30 fps — single source of truth. */
export const SCENE_DURATIONS = {
  Scene1ColdOpen: 540,
  Scene2Dashboard: 600,
  Scene3Signals: 660,
  Scene4Education: 600,
  Scene5Tiers: 690,
  Scene6Transparency: 810,
  Scene7CTA: 540,
} as const;

export const FULL_VIDEO_DURATION = Object.values(SCENE_DURATIONS).reduce(
  (a, b) => a + b,
  0,
);

const FullVideo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene1ColdOpen}>
      <Scene1ColdOpen />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene2Dashboard}>
      <Scene2Dashboard />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene3Signals}>
      <Scene3Signals />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene4Education}>
      <Scene4Education />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene5Tiers}>
      <Scene5Tiers />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene6Transparency}>
      <Scene6Transparency />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE_DURATIONS.Scene7CTA}>
      <Scene7CTA />
    </Series.Sequence>
  </Series>
);

const shared = {
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT,
  fps: FPS,
} as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Scene1ColdOpen"
      component={Scene1ColdOpen}
      durationInFrames={SCENE_DURATIONS.Scene1ColdOpen}
      {...shared}
    />
    <Composition
      id="Scene2Dashboard"
      component={Scene2Dashboard}
      durationInFrames={SCENE_DURATIONS.Scene2Dashboard}
      {...shared}
    />
    <Composition
      id="Scene3Signals"
      component={Scene3Signals}
      durationInFrames={SCENE_DURATIONS.Scene3Signals}
      {...shared}
    />
    <Composition
      id="Scene4Education"
      component={Scene4Education}
      durationInFrames={SCENE_DURATIONS.Scene4Education}
      {...shared}
    />
    <Composition
      id="Scene5Tiers"
      component={Scene5Tiers}
      durationInFrames={SCENE_DURATIONS.Scene5Tiers}
      {...shared}
    />
    <Composition
      id="Scene6Transparency"
      component={Scene6Transparency}
      durationInFrames={SCENE_DURATIONS.Scene6Transparency}
      {...shared}
    />
    <Composition
      id="Scene7CTA"
      component={Scene7CTA}
      durationInFrames={SCENE_DURATIONS.Scene7CTA}
      {...shared}
    />
    <Composition
      id="FullVideo"
      component={FullVideo}
      durationInFrames={FULL_VIDEO_DURATION}
      {...shared}
    />
  </>
);
