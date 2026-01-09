import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import { RemotionVideo } from './RemotionVideo';

/**
 * Remotion Root Component
 *
 * Registers video compositions for rendering.
 * Each composition represents a renderable video with specific dimensions and FPS.
 *
 * Compositions:
 * - 'video': Legacy composition for testing (1080x1920 portrait, 30fps)
 * - 'composite': Full video composition with database integration (1080x1920 portrait, 30fps)
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Legacy composition for backward compatibility */}
      <Composition
        id="video"
        component={RemotionVideo}
        durationInFrames={300} // 10 seconds at 30fps (will be overridden by actual job)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* Full composition with database integration */}
      <Composition
        id="composite"
        component={VideoComposition}
        durationInFrames={1800} // 60 seconds at 30fps (will be calculated dynamically)
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          projectId: '',
          renderJobId: '',
        }}
        // Calculate duration dynamically based on scenes
        calculateMetadata={async ({ props }) => {
          // This is a placeholder - actual duration calculation happens in VideoComposition
          return {
            durationInFrames: 1800,
            props,
          };
        }}
      />
    </>
  );
};
