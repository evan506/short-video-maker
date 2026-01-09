import React from 'react';
import { Composition } from 'remotion';
import { RemotionVideo } from './RemotionVideo';

/**
 * Remotion Root Component
 *
 * Registers video compositions for rendering.
 * Each composition represents a renderable video with specific dimensions and FPS.
 *
 * Compositions:
 * - 'video': Main video composition (1080x1920 portrait, 30fps)
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="video"
        component={RemotionVideo}
        durationInFrames={300} // 10 seconds at 30fps (will be overridden by actual job)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
