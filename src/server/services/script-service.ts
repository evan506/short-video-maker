/**
 * Script Service - Script CRUD operations and versioning logic
 *
 * Handles script creation, versioning, and persistence.
 * Manages script versions with source tracking (llm/user).
 */

import { supabase } from '../lib/supabase';

export interface CreateScriptParams {
  projectId: string;
  content: string;
  source: 'llm' | 'user';
}

export interface UpdateScriptParams {
  scriptId: string;
  content?: string;
}

/**
 * Generate a new script version using LLM
 */
export async function generateScriptVersion(params: {
  projectId: string;
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  targetDuration: 15 | 30 | 60;
  videoType: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
}) {
  const { projectId, topic, platform, targetDuration, videoType } = params;

  // Dynamically import llm-service to avoid circular dependencies
  const { generateScript } = await import('./llm-service');

  // Call LLM service
  const llmResponse = await generateScript({ topic, platform, targetDuration, videoType });

  // Get next version number
  const nextVersion = await getNextVersionNumber(projectId);

  // Create script record
  const { data, error } = await supabase
    .from('scripts')
    .insert({
      project_id: projectId,
      version: nextVersion,
      content: llmResponse.content,
      source: 'llm'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create script: ${error.message}`);
  }

  // Update project's current script version
  const { error: updateError } = await supabase
    .from('projects')
    .update({ current_script_version: nextVersion })
    .eq('id', projectId);

  if (updateError) {
    throw new Error(`Failed to update project: ${updateError.message}`);
  }

  return data;
}

/**
 * Create a new script version manually (user-edited)
 */
export async function createScriptVersion(params: CreateScriptParams) {
  const { projectId, content, source } = params;

  // Validate content length
  if (content.length < 50) {
    throw new Error('Script content must be at least 50 characters');
  }

  // Get next version number
  const nextVersion = await getNextVersionNumber(projectId);

  // Create script record
  const { data, error } = await supabase
    .from('scripts')
    .insert({
      project_id: projectId,
      version: nextVersion,
      content,
      source
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create script: ${error.message}`);
  }

  // Update project's current script version
  const { error: updateError } = await supabase
    .from('projects')
    .update({ current_script_version: nextVersion })
    .eq('id', projectId);

  if (updateError) {
    throw new Error(`Failed to update project: ${updateError.message}`);
  }

  return data;
}

/**
 * Get all script versions for a project
 */
export async function getScriptsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch scripts: ${error.message}`);
  }

  return data;
}

/**
 * Get a single script by ID
 */
export async function getScriptById(scriptId: string) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', scriptId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch script: ${error.message}`);
  }

  return data;
}

/**
 * Restore a previous script version (creates new version with restored content)
 */
export async function restoreScriptVersion(scriptId: string) {
  // Get the script to restore
  const script = await getScriptById(scriptId);

  // Create new version with restored content
  return createScriptVersion({
    projectId: script.project_id,
    content: script.content,
    source: 'user' // Restoration is a user action
  });
}

/**
 * Get the next version number for a project
 */
async function getNextVersionNumber(projectId: string): Promise<number> {
  // Get current max version
  const { data, error } = await supabase
    .from('scripts')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle to allow null result

  if (error) {
    throw new Error(`Failed to get next version number: ${error.message}`);
  }

  // If no scripts exist, start at version 1
  if (!data) {
    return 1;
  }

  // Increment max version
  return data.version + 1;
}

/**
 * Get current script for a project
 */
export async function getCurrentScript(projectId: string) {
  // Get project to find current script version
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('current_script_version')
    .eq('id', projectId)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  if (!project.current_script_version) {
    return null;
  }

  // Get the current script version
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .eq('version', project.current_script_version)
    .single();

  if (error) {
    throw new Error(`Failed to fetch current script: ${error.message}`);
  }

  return data;
}
