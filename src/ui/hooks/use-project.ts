/**
 * React Hook: use-project
 *
 * Provides project CRUD operations (T070):
 * - useCreateProject: Create new project
 * - useProjects: List user's projects (sorted by updated_at DESC)
 * - useProject: Load single project with FULL state (script + scenes)
 * - useUpdateProject: Update project metadata
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types
export interface Project {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration: 15 | 30 | 60;
  status: 'draft' | 'rendering' | 'done' | 'failed';
  current_script_version: number | null;
  storyboard_script_version: number | null;
  voice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithScript extends Project {
  script: {
    id: string;
    version: number;
    content: string;
    source: 'llm' | 'user';
    created_at: string;
  } | null;
  scenes: Array<{
    id: string;
    order_index: number;
    narration_text: string;
    duration_sec_draft: number;
    duration_sec_final: number | null;
    primary_keyword: string;
    subtitle_style_preset_id: number;
    created_at: string;
    updated_at: string;
  }>;
}

export interface CreateProjectInput {
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration: 15 | 30 | 60;
}

export interface UpdateProjectInput {
  title?: string;
  topic?: string;
  platform?: 'shorts' | 'tiktok' | 'reels';
  video_type?: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration?: 15 | 30 | 60;
}

// API base URL
const API_BASE = '/api/v1/editor';

/**
 * Create a new project (T056, T070)
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      return response.json() as Promise<Project>;
    },
    onSuccess: () => {
      // Invalidate projects list query
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * List user's projects (T057, T064, T070)
 * - Sorted by updated_at DESC
 * - Paginated if list >50 projects
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/projects`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch projects');
      }

      const data = await response.json();
      return data.projects as Project[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Load single project with FULL state (T058, T066, T070)
 * - Project metadata
 * - Current script version
 * - All scenes ordered by order_index
 * - Data consistency checks
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/projects/${projectId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load project');
      }

      const data = await response.json();
      return data as ProjectWithScript;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update project metadata (T059, T070)
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: UpdateProjectInput }) => {
      const response = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update project');
      }

      return response.json() as Promise<Project>;
    },
    onSuccess: (_, variables) => {
      // Invalidate both project detail and projects list
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
