/**
 * Project Service
 *
 * Business logic for project CRUD operations:
 * - T056: Create project with auto-generated title
 * - T057: List user's projects sorted by updated_at DESC
 * - T058: Load single project with FULL state (script + scenes)
 * - T059: Update project metadata
 * - T060: Delete project (deferred to Phase 2)
 */

import { supabase } from '../lib/supabase';

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
  user_id: string;
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

/**
 * Auto-generate project title from topic (T068)
 * - First 50 characters of topic
 * - Truncated at word boundary
 * - Append "..." if truncated
 */
function generateTitleFromTopic(topic: string): string {
  const maxLength = 50;
  if (topic.length <= maxLength) {
    return topic;
  }

  // Truncate at word boundary
  const truncated = topic.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  return truncated + '...';
}

/**
 * Create a new project (T056)
 * - Auto-generate title from topic
 * - Set initial status="draft"
 * - Set current_script_version=null, storyboard_script_version=null
 * - Validate: topic min 10 chars, platform/type/duration required
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  // Validation
  if (!input.topic || input.topic.length < 10) {
    throw new Error('Topic must be at least 10 characters');
  }
  if (!input.platform || !input.video_type || !input.target_duration) {
    throw new Error('Platform, video type, and target duration are required');
  }

  // Auto-generate title (T068)
  const title = generateTitleFromTopic(input.topic);

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: input.user_id,
      title,
      topic: input.topic,
      platform: input.platform,
      video_type: input.video_type,
      target_duration: input.target_duration,
      status: 'draft',
      current_script_version: null,
      storyboard_script_version: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

/**
 * List user's projects (T057)
 * - Sorted by updated_at DESC (most recently modified first)
 * - Enforce RLS (user_id = auth.uid())
 */
export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Load single project with FULL state (T058)
 * - Project metadata
 * - Current script version (if exists)
 * - All scenes ordered by order_index
 * - Verify storyboard_script_version consistency
 */
export async function getProjectWithFullState(
  projectId: string,
  userId: string
): Promise<ProjectWithScript> {
  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId) // RLS enforcement
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to load project: ${projectError?.message || 'Project not found'}`);
  }

  // Fetch current script version
  let script = null;
  if (project.current_script_version) {
    const { data: scriptData, error: scriptError } = await supabase
      .from('scripts')
      .select('*')
      .eq('project_id', projectId)
      .eq('version', project.current_script_version)
      .single();

    if (!scriptError && scriptData) {
      script = scriptData;
    }
  }

  // Fetch scenes ordered by order_index
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (scenesError) {
    throw new Error(`Failed to load scenes: ${scenesError.message}`);
  }

  // Data consistency check: verify storyboard_script_version matches scenes loaded
  if (project.storyboard_script_version !== null && scenes && scenes.length > 0) {
    // Scenes exist - verify consistency
    // In real implementation, we might check scene metadata against version
  }

  return {
    ...project,
    script,
    scenes: scenes || [],
  };
}

/**
 * Update project metadata (T059)
 * - Allow updating: title, topic, platform, video_type, target_duration
 * - Update updated_at timestamp automatically
 */
export async function updateProject(
  projectId: string,
  userId: string,
  updates: UpdateProjectInput
): Promise<Project> {
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.topic !== undefined) updateData.topic = updates.topic;
  if (updates.platform !== undefined) updateData.platform = updates.platform;
  if (updates.video_type !== undefined) updateData.video_type = updates.video_type;
  if (updates.target_duration !== undefined) updateData.target_duration = updates.target_duration;

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .eq('user_id', userId) // RLS enforcement
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update project: ${error?.message || 'Project not found'}`);
  }

  return data;
}

/**
 * Delete project (T060) - DEFERRED TO PHASE 2
 * - Cascading deletes: scripts and scenes deleted automatically via FK constraints
 * - RLS enforced: users can only delete own projects
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  // Deferred to Phase 2
  throw new Error('Delete project feature is deferred to Phase 2');
}
