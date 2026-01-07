/**
 * useTTSPreview Hook
 *
 * Manages TTS preview generation for scene narration text.
 * Handles preview generation, caching, playback state, and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';

/**
 * TTS preview response from API
 */
export interface TTSPreviewResponse {
  audioUrl: string;
  duration: number;
  cached: boolean;
}

/**
 * Hook return value
 */
interface UseTTSPreviewReturn {
  generatePreview: (sceneId: string, text: string) => Promise<TTSPreviewResponse | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Fetch scene to get project_id
 */
async function fetchSceneProjectId(sceneId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scenes')
    .select('project_id')
    .eq('id', sceneId)
    .single();

  if (error) {
    console.error('[useTTSPreview] Failed to fetch scene:', error);
    throw new Error(`Failed to fetch scene: ${error.message}`);
  }

  return data?.project_id || null;
}

/**
 * Fetch project's selected voice_id
 */
async function fetchProjectVoiceId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('voice_id')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('[useTTSPreview] Failed to fetch project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data?.voice_id || null;
}

/**
 * Generate TTS preview for a scene
 */
async function fetchTTSPreview(
  sceneId: string,
  text: string,
  voiceId: string
): Promise<TTSPreviewResponse> {
  const response = await fetch(`/api/v1/scenes/${sceneId}/tts/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to generate preview: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook for managing TTS preview generation
 *
 * @returns TTS preview state and operations
 *
 * @example
 * ```tsx
 * const { generatePreview, isGenerating, error, clearError } = useTTSPreview();
 *
 * const handlePreview = async () => {
 *   const result = await generatePreview(sceneId, narrationText);
 *   if (result) {
 *     console.log('Audio URL:', result.audioUrl);
 *     console.log('Cached:', result.cached);
 *   }
 * };
 * ```
 */
export function useTTSPreview(): UseTTSPreviewReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatingRef = useRef<Set<string>>(new Set());

  /**
   * Generate TTS preview for a scene
   *
   * @param sceneId - Scene UUID
   * @param text - Narration text (for validation/context)
   * @returns Preview response or null if failed
   */
  const generatePreview = useCallback(async (
    sceneId: string,
    text: string
  ): Promise<TTSPreviewResponse | null> => {
    // Prevent duplicate requests
    if (generatingRef.current.has(sceneId)) {
      console.warn('[useTTSPreview] Preview already generating for scene:', sceneId);
      return null;
    }

    // Validate inputs
    if (!sceneId) {
      setError('Scene ID is required');
      return null;
    }

    if (!text || text.trim().length === 0) {
      setError('Narration text is required');
      return null;
    }

    setIsGenerating(true);
    setError(null);
    generatingRef.current.add(sceneId);

    try {
      // Step 1: Fetch scene to get project_id
      const projectId = await fetchSceneProjectId(sceneId);

      if (!projectId) {
        setError('Scene not found or has no project');
        return null;
      }

      // Step 2: Fetch project's selected voice_id
      const voiceId = await fetchProjectVoiceId(projectId);

      if (!voiceId) {
        setError('Please select a voice first in the Voice Library');
        return null;
      }

      // Step 3: Generate TTS preview with voiceId
      const result = await fetchTTSPreview(sceneId, text, voiceId);

      // Log cache hits for analytics
      if (result.cached) {
        console.log('[useTTSPreview] Cache hit for scene:', sceneId);
      } else {
        console.log('[useTTSPreview] Generated new preview for scene:', sceneId);
      }

      return result;
    } catch (err: any) {
      console.error('[useTTSPreview] Failed to generate preview:', err);
      setError(err.message || 'Failed to generate preview. Please try again.');
      return null;
    } finally {
      setIsGenerating(false);
      generatingRef.current.delete(sceneId);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generatePreview,
    isGenerating,
    error,
    clearError,
  };
}
