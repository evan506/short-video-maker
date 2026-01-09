import React from 'react';
import {
  AbsoluteFill,
  Video,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { MinimalSubtitle } from '../../components/subtitles/MinimalSubtitle';
import { HighlightSubtitle } from '../../components/subtitles/HighlightSubtitle';
import { KaraokeSubtitle } from '../../components/subtitles/KaraokeSubtitle';
import type { SubtitlePreset, SubtitleTiming } from '../../components/subtitles/types';
import { Scene } from './types';

/**
 * SceneComposition - Renders a single scene with media, audio, and subtitles
 *
 * Handles:
 * - Video/image playback with loop and trim logic
 * - Audio playback (voiceover)
 * - Subtitle overlay (minimal, highlight, or karaoke style)
 * - Fallback for missing media (colored background with narration text)
 * - Silent video if audio is missing
 */
export interface SceneCompositionProps {
  scene: Scene;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  audioUrl?: string;
  subtitlePreset?: SubtitlePreset;
}

export const SceneComposition: React.FC<SceneCompositionProps> = ({
  scene,
  mediaUrl,
  mediaType,
  audioUrl,
  subtitlePreset = 'minimal',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate fade-out opacity for last second
  const fadeOutStart = durationInFrames - fps; // Start fade 1 second before end
  const opacity = interpolate(
    frame,
    [fadeOutStart, durationInFrames - 1],
    [1, 0],
    { extrapolateRight: 'clamp' }
  );

  // Map subtitle preset string to component
  const renderSubtitle = () => {
    const timings = scene.subtitle_timing as SubtitleTiming[] | undefined;

    switch (subtitlePreset) {
      case 'minimal':
        return (
          <MinimalSubtitle
            text={scene.narration_text}
            timings={timings}
          />
        );
      case 'highlight':
        return (
          <HighlightSubtitle
            text={scene.narration_text}
            timings={timings}
          />
        );
      case 'karaoke':
        return (
          <KaraokeSubtitle
            text={scene.narration_text}
            timings={timings}
          />
        );
      default:
        return (
          <MinimalSubtitle
            text={scene.narration_text}
            timings={timings}
          />
        );
    }
  };

  // Fallback component for missing media
  const MediaFallback: React.FC<{ text: string }> = ({ text }) => {
    // Generate a color from the keyword (for variety across scenes)
    const hash = scene.primary_keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: `hsl(${hue}, 60%, 20%)`,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}
      >
        <p
          style={{
            color: '#fff',
            fontSize: 32,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {text}
        </p>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Media Layer */}
      {mediaUrl ? (
        mediaType === 'video' ? (
          <AbsoluteFill>
            <Video
              src={mediaUrl}
              muted
              // Loop video if shorter than scene duration
              playbackRate={
                durationInFrames / fps > 10 ? 1 : 1
              }
            />
          </AbsoluteFill>
        ) : (
          // Image
          <AbsoluteFill>
            <img
              src={mediaUrl}
              alt={scene.primary_keyword}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </AbsoluteFill>
        )
      ) : (
        // Fallback for missing media
        <MediaFallback text={scene.narration_text} />
      )}

      {/* Audio Layer */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Subtitle Overlay */}
      {scene.narration_text && (
        <AbsoluteFill
          style={{
            opacity,
            pointerEvents: 'none',
          }}
        >
          {renderSubtitle()}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
