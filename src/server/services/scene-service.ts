/**
 * Scene Service - Scene CRUD operations and generation logic
 *
 * Handles scene generation from scripts, persistence, and retrieval.
 * Manages one-time generation policy and version tracking.
 */

import { generateScenes as generateScenesUtil } from '../../lib/scene-utils';
import { supabase } from '../lib/supabase';
import { extractKeywordsForScenes } from './llm-service';

export interface GenerateScenesParams {
  projectId: string;
  scriptContent: string;
  scriptVersion: number;
  maxScenes?: number;
}

export interface Scene {
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

/**
 * Generate scenes from script content
 *
 * This function:
 * 1. Generates scenes from script using scene-utils
 * 2. Extracts meaningful keywords using LLM
 * 3. Saves scenes to database with order_index
 * 4. Updates project's storyboard_script_version
 */
export async function generateScenes(params: GenerateScenesParams): Promise<Scene[]> {
  const { projectId, scriptContent, scriptVersion, maxScenes = 20 } = params;

  // Validate script content
  if (!scriptContent || scriptContent.trim().length < 50) {
    throw new Error('Script content must be at least 50 characters');
  }

  // Generate scene drafts using utility
  const sceneDrafts = generateScenesUtil(scriptContent, maxScenes);

  if (sceneDrafts.length === 0) {
    throw new Error('Failed to generate scenes from script');
  }

  // Extract keywords using LLM
  console.log(`[Scene Service] Extracting keywords for ${sceneDrafts.length} scenes using LLM...`);
  let keywords: string[];

  try {
    keywords = await extractKeywordsForScenes(sceneDrafts);
    console.log(`[Scene Service] LLM keywords extracted successfully:`, keywords);
  } catch (error) {
    console.error('[Scene Service] LLM keyword extraction failed, using fallback:', error);
    // Use rule-based keywords from scene-utils as fallback
    keywords = sceneDrafts.map(draft => draft.primary_keyword);
  }

  // Prepare scenes for insertion with LLM-extracted keywords
  const scenesToInsert = sceneDrafts.map((draft, index) => ({
    project_id: projectId,
    order_index: index,
    narration_text: draft.narration_text,
    duration_sec_draft: draft.duration_sec_draft,
    primary_keyword: keywords[index] || draft.primary_keyword, // Use LLM keyword or fallback
    subtitle_style_preset_id: 1 // Default to "Minimal" preset
  }));

  // Insert scenes in batch
  const { data: insertedScenes, error: insertError } = await supabase
    .from('scenes')
    .insert(scenesToInsert)
    .select();

  if (insertError) {
    throw new Error(`Failed to create scenes: ${insertError.message}`);
  }

  // Update project's storyboard_script_version
  const { error: updateError } = await supabase
    .from('projects')
    .update({ storyboard_script_version: scriptVersion })
    .eq('id', projectId);

  if (updateError) {
    throw new Error(`Failed to update project: ${updateError.message}`);
  }

  return insertedScenes;
}

/**
 * Get all scenes for a project
 */
export async function getScenesByProject(projectId: string): Promise<Scene[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch scenes: ${error.message}`);
  }

  return data || [];
}

/**
 * Check if scenes exist for a project
 */
export async function scenesExist(projectId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check scenes: ${error.message}`);
  }

  return data !== null;
}

/**
 * Delete all scenes for a project (prepare for regeneration)
 */
export async function deleteScenes(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to delete scenes: ${error.message}`);
  }
}

/**
 * Get version mismatch status
 *
 * Returns true if script has been updated since scenes were generated
 */
export async function hasVersionMismatch(projectId: string): Promise<boolean> {
  // Get project to compare versions
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('current_script_version, storyboard_script_version')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  // Mismatch if storyboard version differs from current version
  // or if storyboard version is null (scenes never generated)
  return (
    project.storyboard_script_version === null ||
    project.storyboard_script_version !== project.current_script_version
  );
}

/**
 * Regenerate scenes (delete existing and generate new)
 *
 * This is used when user explicitly clicks "Regenerate scenes"
 * or when there's a version mismatch and user confirms regeneration.
 */
export async function regenerateScenes(params: GenerateScenesParams): Promise<Scene[]> {
  const { projectId } = params;

  // Delete existing scenes
  await deleteScenes(projectId);

  // Generate new scenes
  return generateScenes(params);
}

/**
 * Update a single scene
 */
export async function updateScene(sceneId: string, updates: Partial<Scene>): Promise<Scene> {
  // Validate duration if provided
  if (updates.duration_sec_draft !== undefined) {
    if (updates.duration_sec_draft < 1) {
      throw new Error('Duration must be at least 1 second');
    }
  }

  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update scene: ${error.message}`);
  }

  return data;
}

/**
 * Batch update multiple scenes
 *
 * Updates the same fields across multiple scenes (e.g., "Apply to all" for subtitle presets).
 */
export async function batchUpdateScenes(sceneIds: string[], updates: Partial<Scene>): Promise<Scene[]> {
  if (!Array.isArray(sceneIds) || sceneIds.length === 0) {
    throw new Error('scene_ids must be a non-empty array');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('updates must be an object');
  }

  // Validate duration if provided in updates
  if (updates.duration_sec_draft !== undefined) {
    if (updates.duration_sec_draft < 1) {
      throw new Error('Duration must be at least 1 second');
    }
  }

  // Perform batch update
  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .in('id', sceneIds)
    .select();

  if (error) {
    throw new Error(`Failed to batch update scenes: ${error.message}`);
  }

  return data;
}

/**
 * Reorder scenes (drag-and-drop)
 *
 * Updates order_index for all scenes based on new arrangement.
 */
export async function reorderScenes(projectId: string, sceneIds: string[]): Promise<void> {
  // Validate all scene IDs belong to this project
  const { data: existingScenes, error: fetchError } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId);

  if (fetchError) {
    throw new Error(`Failed to fetch scenes: ${fetchError.message}`);
  }

  const existingSceneIds = new Set(existingScenes.map(s => s.id));

  // Verify all provided IDs belong to this project
  for (const sceneId of sceneIds) {
    if (!existingSceneIds.has(sceneId)) {
      throw new Error(`Scene ${sceneId} does not belong to project ${projectId}`);
    }
  }

  // Update order_index for each scene
  for (let i = 0; i < sceneIds.length; i++) {
    const sceneId = sceneIds[i];
    const { error: updateError } = await supabase
      .from('scenes')
      .update({ order_index: i })
      .eq('id', sceneId);

    if (updateError) {
      throw new Error(`Failed to reorder scene ${sceneId}: ${updateError.message}`);
    }
  }
}
