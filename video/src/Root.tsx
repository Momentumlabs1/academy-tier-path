import React from 'react';
import {Composition} from 'remotion';
import {AD_DURATION, ORGANIC_DURATION, TimVideo} from './tim/TimVideo';
import {FPS, H, W} from './tim/theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TimReelOrganic"
        component={TimVideo}
        durationInFrames={ORGANIC_DURATION}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{variant: 'organic' as const}}
      />
      <Composition
        id="TimReelAd"
        component={TimVideo}
        durationInFrames={AD_DURATION}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{variant: 'ad' as const}}
      />
    </>
  );
};
