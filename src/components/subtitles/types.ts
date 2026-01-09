/**
 * Shared types for subtitle components
 */

export type SubtitlePreset = 'minimal' | 'highlight' | 'karaoke';

export interface WordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface SentenceTiming {
  sentence: string;
  start_ms: number;
  end_ms: number;
}

export type SubtitleTiming = WordTiming[] | SentenceTiming[];

export interface SubtitleProps {
  /** Text content to display */
  text: string;
  /** Timing data for synchronization (word-level or sentence-level) */
  timings?: SubtitleTiming;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Text color */
  color?: string;
  /** Background color (for highlight preset) */
  backgroundColor?: string;
  /** Position from bottom (in pixels) */
  bottomOffset?: number;
  /** Additional CSS styles */
  style?: React.CSSProperties;
}

export interface KaraokeSubtitleProps extends SubtitleProps {
  /** Whether word-level timing is available */
  isWordLevel?: boolean;
}

export interface SubtitlePreviewProps {
  /** Scene ID for database updates */
  sceneId: string;
  /** Project ID */
  projectId: string;
  /** Current text content */
  text: string;
  /** Current subtitle preset */
  preset: SubtitlePreset;
  /** Timing data (optional, for preview) */
  timings?: SubtitleTiming;
  /** On preset change callback */
  onPresetChange: (preset: SubtitlePreset) => void;
  /** Preview mode (true) or render mode (false) */
  isPreview?: boolean;
}
