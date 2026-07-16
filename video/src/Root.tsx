import React from 'react';
import {Composition} from 'remotion';
import {ORGANIC_DURATION, TimVideo} from './tim/TimVideo';
import {FPS, H, W} from './tim/theme';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TimReel"
      component={TimVideo}
      durationInFrames={ORGANIC_DURATION}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{variant: 'organic' as const}}
    />
  );
};
