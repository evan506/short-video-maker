import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SubtitleProps } from './types';

/**
 * MinimalSubtitle Remotion Component
 *
 * Displays white text at the bottom of the video with no background.
 * Clean and simple subtitle style for minimal aesthetic.
 *
 * @param text - Subtitle text to display
 * @param fontSize - Font size in pixels (default: 48)
 * @param fontFamily - Font family (default: system-ui)
 * @param color - Text color (default: white)
 * @param bottomOffset - Distance from bottom in pixels (default: 80)
 * @param style - Additional CSS styles
 */
export const MinimalSubtitle: React.FC<SubtitleProps> = ({
  text,
  fontSize = 48,
  fontFamily = 'system-ui, -apple-system, sans-serif',
  color = '#ffffff',
  bottomOffset = 80,
  style = {},
}) => {
  const textStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily,
    color,
    textAlign: 'center',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    padding: '0 20px',
    margin: 0,
    fontWeight: 500,
    lineHeight: 1.4,
    ...style,
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
      <p style={textStyle}>{text}</p>
    </AbsoluteFill>
  );
};
