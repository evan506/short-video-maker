import { useState, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { SubtitleTiming, SubtitlePreset } from '../../../components/subtitles/types';

interface UseSubtitlePreviewOptions {
  /** Initial subtitle preset */
  initialPreset?: SubtitlePreset;
  /** Scene ID for database updates */
  sceneId: string;
  /** Project ID */
  projectId: string;
}

interface UseSubtitlePreviewReturn {
  /** Current subtitle preset */
  preset: SubtitlePreset;
  /** Update subtitle preset */
  setPreset: (preset: SubtitlePreset) => void;
  /** Apply current preset to all scenes in project */
  applyToAllScenes: () => Promise<void>;
  /** Check if timing data is word-level */
  isWordLevel: boolean;
  /** Get active word/sentence index for current frame */
  getActiveIndex: (timings: SubtitleTiming) => number;
}

/**
 * useSubtitlePreview Hook
 *
 * Hook for managing subtitle preview state and timing interpolation.
 * Provides functions for preset switching, bulk updates, and frame-to-word mapping.
 *
 * @param options - Hook options
 * @returns Hook return value with preset state and helper functions
 */
export function useSubtitlePreview({
  initialPreset = 'minimal',
  sceneId,
  projectId,
}: UseSubtitlePreviewOptions): UseSubtitlePreviewReturn {
  const [preset, setPresetState] = useState<SubtitlePreset>(initialPreset);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /**
   * Convert frame number to milliseconds
   */
  const frameToMs = useCallback((frameNumber: number): number => {
    return (frameNumber / fps) * 1000;
  }, [fps]);

  /**
   * Determine if timing data is word-level or sentence-level
   */
  const isWordLevel = useCallback((timings: SubtitleTiming): boolean => {
    if (!timings || timings.length === 0) return false;
    const first = timings[0];
    return 'word' in first;
  }, []);

  /**
   * Get active word/sentence index for current frame
   */
  const getActiveIndex = useCallback((timings: SubtitleTiming): number => {
    if (!timings || timings.length === 0) return -1;

    const currentMs = frameToMs(frame);

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        return i;
      }
    }
    return -1;
  }, [frame, frameToMs]);

  /**
   * Update subtitle preset for a single scene
   */
  const setPreset = useCallback(async (newPreset: SubtitlePreset) => {
    setPresetState(newPreset);

    // TODO: Update database with new preset
    // This will be implemented when we add the API endpoint
    // await updateSceneSubtitlePreset(sceneId, newPreset);
  }, [sceneId]);

  /**
   * Apply current preset to all scenes in the project
   */
  const applyToAllScenes = useCallback(async () => {
    // TODO: Implement bulk update
    // This will update all scenes in the project with the current preset
    // await updateAllScenesSubtitlePreset(projectId, preset);

    console.log(`Applying preset "${preset}" to all scenes in project ${projectId}`);
  }, [projectId, preset]);

  return {
    preset,
    setPreset,
    applyToAllScenes,
    isWordLevel: isWordLevel([]), // Will be called with actual timings in component
    getActiveIndex,
  };
}
