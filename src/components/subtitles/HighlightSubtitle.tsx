import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { SubtitleProps } from './types';

/**
 * HighlightSubtitle Remotion Component
 *
 * Displays text with a semi-transparent background box with rounded corners.
 * High contrast style for better readability on any background.
 *
 * @param text - Subtitle text to display
 * @param fontSize - Font size in pixels (default: 48)
 * @param fontFamily - Font family (default: system-ui)
 * @param color - Text color (default: white)
 * @param backgroundColor - Background color (default: rgba(0, 0, 0, 0.7))
 * @param bottomOffset - Distance from bottom in pixels (default: 80)
 * @param style - Additional CSS styles
 */
export const HighlightSubtitle: React.FC<SubtitleProps> = ({
  text,
  fontSize = 48,
  fontFamily = 'system-ui, -apple-system, sans-serif',
  color = '#ffffff',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  bottomOffset = 80,
  style = {},
}) => {
  const containerStyle: React.CSSProperties = {
    backgroundColor,
    padding: '16px 24px',
    borderRadius: '12px',
    maxWidth: '90%',
    ...style,
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily,
    color,
    textAlign: 'center',
    margin: 0,
    fontWeight: 500,
    lineHeight: 1.4,
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
      <div style={containerStyle}>
        <p style={textStyle}>{text}</p>
      </div>
    </AbsoluteFill>
  );
};
