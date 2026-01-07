/**
 * useVoiceSelection Hook
 *
 * Manages voice selection state for a project.
 * Handles voice selection, persistence, and API updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../server/lib/supabase';

/**
 * Voice metadata from API
 */
export interface Voice {
  id: string;
  name: string;
  locale: string;
  gender: 'Male' | 'Female';
  description?: string;
}

/**
 * Hook return value
 */
interface UseVoiceSelectionReturn {
  selectedVoiceId: string | null;
  setSelectedVoiceId: (voiceId: string) => void;
  applyVoice: (projectId: string, voiceId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch voice selection for a project from database
 */
async function fetchProjectVoice(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('voice_id')
    .eq('id', projectId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch project voice: ${error.message}`);
  }

  return data?.voice_id || null;
}

/**
 * Update voice selection for a project
 */
async function updateProjectVoice(projectId: string, voiceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .update({ voice_id: voiceId })
    .eq('id', projectId);

  if (error) {
    throw new Error(`Failed to update project voice: ${error.message}`);
  }

  return true;
}

/**
 * Hook for managing voice selection
 *
 * @param projectId - Project UUID (optional, for loading existing selection)
 * @returns Voice selection state and operations
 *
 * @example
 * ```tsx
 * const { selectedVoiceId, setSelectedVoiceId, applyVoice, isLoading, error } =
 *   useVoiceSelection(projectId);
 *
 * const handleApplyVoice = async () => {
 *   if (selectedVoiceId) {
 *     const success = await applyVoice(projectId, selectedVoiceId);
 *     if (success) {
 *       console.log('Voice applied!');
 *     }
 *   }
 * };
 * ```
 */
export function useVoiceSelection(projectId?: string): UseVoiceSelectionReturn {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing voice selection when projectId changes
  useEffect(() => {
    if (!projectId) {
      setSelectedVoiceId(null);
      return;
    }

    const loadVoiceSelection = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const voiceId = await fetchProjectVoice(projectId);
        setSelectedVoiceId(voiceId);
      } catch (err: any) {
        console.error('[useVoiceSelection] Failed to load voice:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoiceSelection();
  }, [projectId]);

  // Apply voice selection to project
  const applyVoice = useCallback(async (projectId: string, voiceId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await updateProjectVoice(projectId, voiceId);

      if (success) {
        setSelectedVoiceId(voiceId);
      }

      return success;
    } catch (err: any) {
      console.error('[useVoiceSelection] Failed to apply voice:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    selectedVoiceId,
    setSelectedVoiceId,
    applyVoice,
    isLoading,
    error,
  };
}
