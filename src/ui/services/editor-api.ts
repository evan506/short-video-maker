/**
 * Editor API Client
 *
 * This module provides a typed API client for communicating with the
 * Script & Storyboard Editor backend endpoints.
 *
 * All requests include authentication headers (if available) and handle
 * common error scenarios.
 *
 * NOTE: This requires axios or fetch to be configured.
 * For now, we use fetch with a simple wrapper.
 */

import type {
  Project,
  Script,
  Scene,
  CreateProjectDto,
  UpdateProjectDto,
  CreateScriptDto,
  UpdateScriptDto,
  CreateScenesDto,
  UpdateSceneDto,
  ReorderScenesDto,
} from '../../types/editor';

// API base URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3123';
const EDITOR_BASE_URL = `${API_URL}/api/v1/editor`;

/**
 * Get auth token for API requests
 * Integrated with Supabase Auth
 */
const getAuthToken = async (): Promise<string | null> => {
  const { auth } = await import('./supabase');
  return await auth.getAccessToken();
};

/**
 * Make an authenticated API request
 */
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${EDITOR_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    console.error('API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      url,
      error
    });
    throw new Error(error.error || error.message || `API error: ${response.status}`);
  }

  return response;
};

// ==================== PROJECT API ====================

/**
 * Create a new project
 */
export const createProject = async (data: CreateProjectDto): Promise<Project> => {
  const response = await apiRequest('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

/**
 * Get all projects for the authenticated user
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await apiRequest('/projects', {
    method: 'GET',
  });
  return response.json();
};

/**
 * Get a single project by ID
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await apiRequest(`/projects/${projectId}`, {
    method: 'GET',
  });
  return response.json();
};

/**
 * Update a project
 */
export const updateProject = async (
  projectId: string,
  data: UpdateProjectDto
): Promise<Project> => {
  const response = await apiRequest(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
};

/**
 * Delete a project (deferred to Phase 2)
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await apiRequest(`/projects/${projectId}`, {
    method: 'DELETE',
  });
};

// ==================== SCRIPT API ====================

/**
 * Generate a new script using LLM
 */
export const generateScript = async (
  projectId: string,
  params: {
    topic: string;
    platform: 'shorts' | 'tiktok' | 'reels';
    targetDuration: 15 | 30 | 60;
    videoType: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  }
): Promise<Script> => {
  // Map camelCase to snake_case for server
  const requestBody = {
    topic: params.topic,
    platform: params.platform,
    target_duration: params.targetDuration,
    video_type: params.videoType,
  };

  const response = await apiRequest(`/projects/${projectId}/scripts/generate`, {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  return response.json();
};

/**
 * Get all script versions for a project
 */
export const getScripts = async (projectId: string): Promise<Script[]> => {
  const response = await apiRequest(`/projects/${projectId}/scripts`, {
    method: 'GET',
  });
  return response.json();
};

/**
 * Create a new script manually
 */
export const createScript = async (data: CreateScriptDto): Promise<Script> => {
  const response = await apiRequest('/scripts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
};

/**
 * Quick edit a script (shorten, lengthen, rephrase, tone)
 * Returns preview content (not saved)
 */
export const quickEditScript = async (
  scriptId: string,
  operation: 'shorten' | 'lengthen' | 'rephrase' | 'tone',
  tone?: string
): Promise<{
  previewContent: string;
  operation: string;
  originalContent: string;
}> => {
  const response = await apiRequest(`/scripts/${scriptId}/edit/${operation}`, {
    method: 'POST',
    body: JSON.stringify(tone ? { tone } : {}),
  });
  return response.json();
};

/**
 * Restore a previous script version
 */
export const restoreScript = async (scriptId: string): Promise<Script> => {
  const response = await apiRequest(`/scripts/${scriptId}/restore`, {
    method: 'POST',
  });
  return response.json();
};

// ==================== SCENE API ====================

/**
 * Generate scenes from the latest script
 */
export const generateScenes = async (projectId: string): Promise<Scene[]> => {
  const response = await apiRequest(`/projects/${projectId}/scenes/generate`, {
    method: 'POST',
  });
  return response.json();
};

/**
 * Get all scenes for a project
 */
export const getScenes = async (projectId: string): Promise<Scene[]> => {
  const response = await apiRequest(`/projects/${projectId}/scenes`, {
    method: 'GET',
  });
  return response.json();
};

/**
 * Delete all scenes for a project (prepare for regeneration)
 */
export const deleteScenes = async (projectId: string): Promise<void> => {
  await apiRequest(`/projects/${projectId}/scenes`, {
    method: 'DELETE',
  });
};

/**
 * Update a single scene
 */
export const updateScene = async (
  sceneId: string,
  data: UpdateSceneDto
): Promise<Scene> => {
  const response = await apiRequest(`/scenes/${sceneId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
};

/**
 * Batch update multiple scenes (e.g., "Apply to all")
 */
export const batchUpdateScenes = async (
  sceneIds: string[],
  data: UpdateSceneDto
): Promise<Scene[]> => {
  const response = await apiRequest('/scenes/batch', {
    method: 'PATCH',
    body: JSON.stringify({ scene_ids: sceneIds, ...data }),
  });
  return response.json();
};

/**
 * Reorder scenes (drag-and-drop)
 */
export const reorderScenes = async (
  projectId: string,
  sceneIds: string[]
): Promise<void> => {
  await apiRequest(`/projects/${projectId}/scenes/reorder`, {
    method: 'POST',
    body: JSON.stringify({ scene_ids: sceneIds }),
  });
};

// Export all API functions as a single object for convenience
export const editorApi = {
  // Projects
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,

  // Scripts
  generateScript,
  getScripts,
  createScript,
  quickEditScript,
  restoreScript,

  // Scenes
  generateScenes,
  getScenes,
  deleteScenes,
  updateScene,
  batchUpdateScenes,
  reorderScenes,
};
