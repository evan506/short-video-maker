import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { KaraokeSubtitleProps } from './types';

/**
 * KaraokeSubtitle Remotion Component
 *
 * Displays text with word-by-word highlighting synchronized with audio timing.
 * Supports both word-level and sentence-level timing data.
 * Active words are highlighted with a background color.
 *
 * @param text - Full subtitle text
 * @param timings - Array of word or sentence timings with start_ms and end_ms
 * @param isWordLevel - Whether timing data is word-level (true) or sentence-level (false)
 * @param fontSize - Font size in pixels (default: 48)
 * @param fontFamily - Font family (default: system-ui)
 * @param color - Text color (default: white)
 * @param backgroundColor - Background color for active words (default: rgba(59, 130, 246, 0.8))
 * @param bottomOffset - Distance from bottom in pixels (default: 80)
 * @param style - Additional CSS styles
 */
export const KaraokeSubtitle: React.FC<KaraokeSubtitleProps> = ({
  text,
  timings = [],
  isWordLevel = true,
  fontSize = 48,
  fontFamily = 'system-ui, -apple-system, sans-serif',
  color = '#ffffff',
  backgroundColor = 'rgba(59, 130, 246, 0.8)',
  bottomOffset = 80,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert frame to milliseconds
  const currentMs = (frame / fps) * 1000;

  // Determine which word/sentence is currently active
  const getActiveIndex = (): number => {
    if (!timings || timings.length === 0) return -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        return i;
      }
    }
    return -1;
  };

  const activeIndex = getActiveIndex();

  // Render word-level or sentence-level karaoke
  const renderContent = () => {
    if (isWordLevel && timings.length > 0) {
      // Word-level: Render each word with individual highlighting
      const words = (timings as Array<{ word: string; start_ms: number; end_ms: number }>);

      return (
        <p
          style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            color,
            textAlign: 'center',
            margin: 0,
            fontWeight: 500,
            lineHeight: 1.4,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.3em',
            ...style,
          }}
        >
          {words.map((wordTiming, index) => {
            const isActive = index === activeIndex;

            const wordStyle: React.CSSProperties = {
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'background-color 0.1s ease-in-out',
              ...(isActive ? { backgroundColor } : {}),
            };

            return (
              <span key={index} style={wordStyle}>
                {wordTiming.word}
              </span>
            );
          })}
        </p>
      );
    } else {
      // Sentence-level: Highlight entire sentence when active
      return (
        <div
          style={{
            backgroundColor: activeIndex >= 0 ? backgroundColor : 'transparent',
            padding: '16px 24px',
            borderRadius: '12px',
            transition: 'background-color 0.1s ease-in-out',
            maxWidth: '90%',
          }}
        >
          <p
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              color,
              textAlign: 'center',
              margin: 0,
              fontWeight: 500,
              lineHeight: 1.4,
              ...style,
            }}
          >
            {text}
          </p>
        </div>
      );
    }
  };

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: `${bottomOffset}px`,
      }}
    >
      {renderContent()}
    </AbsoluteFill>
  );
};
