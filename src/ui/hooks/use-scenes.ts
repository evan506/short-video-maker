/**
 * React hook for scene management
 *
 * Provides TanStack Query mutations and queries for scene CRUD operations,
 * including generation, retrieval, deletion, and reordering.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  duration_sec_draft: number;
  duration_sec_final: number | null;
  primary_keyword: string;
  subtitle_style_preset_id: number;
  created_at: string;
  updated_at: string;
}

interface GenerateScenesParams {
  projectId: string;
  forceRegenerate?: boolean;
}

interface ReorderScenesParams {
  projectId: string;
  sceneIds: string[];
}

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get API fetcher with auth header
 */
async function fetchWithAuth(url: string, options?: RequestInit) {
  // Get Supabase session token
  // TODO: Replace with actual Supabase auth token retrieval
  const token = localStorage.getItem('sb-access-token') || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options?.headers
  };

  return fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });
}

/**
 * Query hook: Get all scenes for a project
 */
export function useScenes(projectId: string) {
  return useQuery({
    queryKey: ['scenes', projectId],
    queryFn: async () => {
      const response = await fetchWithAuth(`/api/v1/editor/projects/${projectId}/scenes`);
      if (!response.ok) {
        throw new Error('Failed to fetch scenes');
      }
      const data = await response.json();
      return {
        scenes: data.scenes as Scene[],
        scenesExist: data.scenesExist as boolean
      };
    },
    enabled: !!projectId
  });
}

/**
 * Mutation: Generate scenes for a project
 */
export function useGenerateScenes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, forceRegenerate = false }: GenerateScenesParams) => {
      const response = await fetchWithAuth(`/api/v1/editor/projects/${projectId}/scenes/generate`, {
        method: 'POST',
        body: JSON.stringify({ force_regenerate: forceRegenerate })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scenes');
      }

      return response.json() as Promise<Scene[]>;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch scenes
      queryClient.invalidateQueries({ queryKey: ['scenes', variables.projectId] });
      // Invalidate project to get updated storyboard_script_version
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    }
  });
}

/**
 * Mutation: Delete all scenes for a project
 */
export function useDeleteScenes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetchWithAuth(`/api/v1/editor/projects/${projectId}/scenes`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete scenes');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch scenes
      queryClient.invalidateQueries({ queryKey: ['scenes', variables] });
    }
  });
}

/**
 * Mutation: Reorder scenes (drag-and-drop)
 */
export function useReorderScenes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, sceneIds }: ReorderScenesParams) => {
      const response = await fetchWithAuth(`/api/v1/editor/projects/${projectId}/scenes/reorder`, {
        method: 'POST',
        body: JSON.stringify({ scene_ids: sceneIds })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder scenes');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch scenes
      queryClient.invalidateQueries({ queryKey: ['scenes', variables.projectId] });
    }
  });
}

/**
 * Query hook: Check for version mismatch
 *
 * Returns true if current script version differs from storyboard script version
 */
export function useVersionMismatch(projectId: string) {
  return useQuery({
    queryKey: ['version-mismatch', projectId],
    queryFn: async () => {
      // Get project data
      const response = await fetchWithAuth(`/api/v1/editor/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const project = await response.json();

      // Compare versions
      const currentScriptVersion = project.current_script_version;
      const storyboardScriptVersion = project.storyboard_script_version;

      return {
        hasMismatch: storyboardScriptVersion === null ||
                     storyboardScriptVersion !== currentScriptVersion,
        currentScriptVersion,
        storyboardScriptVersion
      };
    },
    enabled: !!projectId
  });
}
