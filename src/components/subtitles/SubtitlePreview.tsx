import React from 'react';
import { MinimalSubtitle } from './MinimalSubtitle';
import { HighlightSubtitle } from './HighlightSubtitle';
import { KaraokeSubtitle } from './KaraokeSubtitle';
import type { SubtitlePreset, SubtitleProps } from './types';

/**
 * SubtitlePreview Component
 *
 * Wrapper component that renders the appropriate subtitle preset based on the selected preset.
 * This component is used both in the storyboard preview and during final render to ensure WYSIWYG consistency.
 *
 * @param preset - Subtitle preset to render ('minimal' | 'highlight' | 'karaoke')
 * @param props - SubtitleProps to pass to the selected preset component
 */
export const SubtitlePreview: React.FC<SubtitleProps & { preset: SubtitlePreset }> = ({
  preset,
  ...props
}) => {
  switch (preset) {
    case 'minimal':
      return <MinimalSubtitle {...props} />;
    case 'highlight':
      return <HighlightSubtitle {...props} />;
    case 'karaoke':
      return <KaraokeSubtitle {...props} timings={props.timings} isWordLevel={isWordLevelTiming(props.timings)} />;
    default:
      // Default to minimal if unknown preset
      return <MinimalSubtitle {...props} />;
  }
};

/**
 * Helper function to determine if timing data is word-level or sentence-level
 */
function isWordLevelTiming(timings?: any[]): boolean {
  if (!timings || timings.length === 0) return false;
  const first = timings[0];
  return 'word' in first;
}

export default SubtitlePreview;
