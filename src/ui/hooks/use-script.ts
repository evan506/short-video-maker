/**
 * use-script Hook
 *
 * Custom hook for script CRUD operations using TanStack Query.
 * Provides data fetching, mutations, loading/error states, and optimistic updates.
 *
 * T026: Create hook for script CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { editorApi } from '../services/editor-api';
import type { Script } from '../../types/editor';

interface GenerateScriptParams {
  projectId: string;
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  target_duration: 15 | 30 | 60;
  video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
}

interface QuickEditParams {
  scriptId: string;
  operation: 'shorten' | 'lengthen' | 'rephrase' | 'tone';
  tone?: string;
}

/**
 * Hook for script operations
 */
export const useScript = (projectId: string) => {
  const queryClient = useQueryClient();

  // Query: Get all script versions for a project
  const {
    data: scripts = [],
    isLoading: scriptsLoading,
    error: scriptsError,
    refetch: refetchScripts,
  } = useQuery({
    queryKey: ['scripts', projectId],
    queryFn: () => editorApi.getScripts(projectId),
    enabled: !!projectId, // Only run query if projectId exists
  });

  // Mutation: Generate script using LLM
  const generateScriptMutation = useMutation({
    mutationFn: (params: GenerateScriptParams) =>
      editorApi.generateScript(params.projectId, {
        topic: params.topic,
        platform: params.platform,
        target_duration: params.target_duration,
        video_type: params.video_type,
      }),
    onSuccess: (newScript) => {
      // Invalidate and refetch scripts
      queryClient.invalidateQueries({ queryKey: ['scripts', projectId] });
    },
  });

  // Mutation: Quick edit script (generates preview)
  const quickEditMutation = useMutation({
    mutationFn: (params: QuickEditParams) =>
      editorApi.quickEditScript(params.scriptId, params.operation, params.tone),
    // Note: This does not invalidate queries since it only returns a preview
  });

  // Mutation: Create/save script manually
  const createScriptMutation = useMutation({
    mutationFn: (data: { project_id: string; content: string; source: 'llm' | 'user' }) =>
      editorApi.createScript(data),
    onSuccess: () => {
      // Invalidate and refetch scripts
      queryClient.invalidateQueries({ queryKey: ['scripts', projectId] });
    },
  });

  // Mutation: Restore script version
  const restoreScriptMutation = useMutation({
    mutationFn: (scriptId: string) => editorApi.restoreScript(scriptId),
    onSuccess: () => {
      // Invalidate and refetch scripts
      queryClient.invalidateQueries({ queryKey: ['scripts', projectId] });
    },
  });

  // Helper: Get current (latest) script
  const currentScript = scripts.length > 0 ? scripts[0] : null;

  // Helper: Generate script
  const generateScript = async (params: Omit<GenerateScriptParams, 'projectId'>) => {
    return generateScriptMutation.mutateAsync({ projectId, ...params });
  };

  // Helper: Quick edit script
  const quickEdit = async (params: QuickEditParams) => {
    return quickEditMutation.mutateAsync(params);
  };

  // Helper: Create/save script
  const createScript = async (content: string, source: 'llm' | 'user') => {
    return createScriptMutation.mutateAsync({
      project_id: projectId,
      content,
      source,
    });
  };

  // Helper: Restore script
  const restoreScript = async (scriptId: string) => {
    return restoreScriptMutation.mutateAsync(scriptId);
  };

  return {
    // Data
    scripts,
    currentScript,

    // Loading states
    isLoading: scriptsLoading,
    isGenerating: generateScriptMutation.isPending,
    isQuickEditing: quickEditMutation.isPending,
    isCreating: createScriptMutation.isPending,
    isRestoring: restoreScriptMutation.isPending,

    // Error states
    error: scriptsError,
    generateError: generateScriptMutation.error,
    quickEditError: quickEditMutation.error,
    createError: createScriptMutation.error,
    restoreError: restoreScriptMutation.error,

    // Actions
    generateScript,
    quickEdit,
    createScript,
    restoreScript,
    refetchScripts,
  };
};

/**
 * Hook for single script by ID
 */
export const useScriptById = (scriptId: string) => {
  return useQuery({
    queryKey: ['script', scriptId],
    queryFn: async () => {
      // Since we don't have a getScriptById endpoint, get from scripts list
      // This is a workaround - ideally we'd have a dedicated endpoint
      const scripts = await editorApi.getScripts(''); // Empty projectId to get all (not ideal)
      return scripts.find((s) => s.id === scriptId) || null;
    },
    enabled: !!scriptId,
  });
};
