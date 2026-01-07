/**
 * useTTSPreview Hook
 *
 * Manages TTS preview generation for scene narration text.
 * Handles preview generation, caching, playback state, and error handling.
 */

import { useState, useCallback, useRef } from 'react';

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
 * Generate TTS preview for a scene
 */
async function fetchTTSPreview(sceneId: string): Promise<TTSPreviewResponse> {
  const response = await fetch(`/api/v1/scenes/${sceneId}/tts/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
 * @param projectId - Project UUID (optional, for context)
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
export function useTTSPreview(projectId?: string): UseTTSPreviewReturn {
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
      const result = await fetchTTSPreview(sceneId);

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
  }, [projectId]);

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
