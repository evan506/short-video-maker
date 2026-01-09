import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  OffthreadVideo,
} from 'remotion';
import { SubtitlePreview } from '../../components/subtitles';
import type { SubtitlePreset, SubtitleTiming } from '../../components/subtitles/types';

/**
 * Remotion Video Component
 *
 * Renders a scene with media (video/image), audio (voiceover), and subtitles.
 * Used by the render worker to generate final video output.
 *
 * Props:
 * - sceneVideoUrl: URL of the background video/image
 * - voiceoverUrl: URL of the TTS voiceover audio
 * - subtitleText: Text content for subtitles
 * - subtitlePreset: Subtitle style preset (minimal, highlight, karaoke)
 * - subtitleTimings: Word/sentence timing data for karaoke mode
 * - durationInFrames: Total duration of the scene (overrides Composition default)
 */
interface RemotionVideoProps {
  sceneVideoUrl?: string;
  voiceoverUrl?: string;
  subtitleText?: string;
  subtitlePreset?: SubtitlePreset;
  subtitleTimings?: SubtitleTiming;
  durationInFrames?: number;
}

export const RemotionVideo: React.FC<RemotionVideoProps> = ({
  sceneVideoUrl,
  voiceoverUrl,
  subtitleText = '',
  subtitlePreset = 'minimal',
  subtitleTimings,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate duration from props or use default
  const actualDuration = durationInFrames || 300;

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Video/Image */}
      {sceneVideoUrl && (
        <AbsoluteFill>
          <OffthreadVideo src={sceneVideoUrl} muted />
        </AbsoluteFill>
      )}

      {/* Voiceover Audio */}
      {voiceoverUrl && (
        <Audio src={voiceoverUrl} />
      )}

      {/* Subtitle Overlay */}
      {subtitleText && subtitlePreset && (
        <Sequence from={0} durationInFrames={actualDuration}>
          <SubtitlePreview
            preset={subtitlePreset}
            text={subtitleText}
            timings={subtitleTimings}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
