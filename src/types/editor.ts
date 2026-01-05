/**
 * Editor TypeScript Types
 *
 * This file contains TypeScript type definitions for the Script & Storyboard Editor feature.
 * All types match the database schema defined in data-model.md.
 */

/**
 * Project entity
 * Represents a video creation project with topic, configuration, and current status
 */
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
  voice_id: string | null; // Reserved for Phase 2
  created_at: string;
  updated_at: string;
}

/**
 * Script entity
 * Represents a versioned narration script for a project
 */
export interface Script {
  id: string;
  project_id: string;
  version: number;
  content: string;
  source: 'llm' | 'user';
  created_at: string;
}

/**
 * Scene entity
 * Represents a single visual scene within a storyboard
 */
export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  duration_sec_draft: number;
  duration_sec_final: number | null; // NULL in Phase 1
  primary_keyword: string;
  subtitle_style_preset_id: number;
  created_at: string;
  updated_at: string;
}

/**
 * SubtitlePreset entity
 * Represents subtitle style preset (reference data)
 */
export interface SubtitlePreset {
  id: number;
  name: string;
  description: string | null;
  config: Record<string, unknown>; // JSONB config
}

/**
 * DTOs for API operations
 */

/** Create project DTO */
export interface CreateProjectDto {
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration: 15 | 30 | 60;
}

/** Update project DTO */
export interface UpdateProjectDto {
  title?: string;
  topic?: string;
  platform?: 'shorts' | 'tiktok' | 'reels';
  video_type?: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration?: 15 | 30 | 60;
}

/** Create script DTO */
export interface CreateScriptDto {
  project_id: string;
  content: string;
  source: 'llm' | 'user';
}

/** Update script DTO */
export interface UpdateScriptDto {
  content?: string;
}

/** Create scenes DTO */
export interface CreateScenesDto {
  project_id: string;
  script_version: number;
}

/** Update scene DTO */
export interface UpdateSceneDto {
  narration_text?: string;
  duration_sec_draft?: number;
  primary_keyword?: string;
  subtitle_style_preset_id?: number;
  order_index?: number;
}

/** Reorder scenes DTO */
export interface ReorderScenesDto {
  scene_ids: string[];
}

/**
 * Quick edit operation types
 */
export type QuickEditOperation = 'shorten' | 'lengthen' | 'rephrase' | 'tone';

/**
 * Phase 2 types (spec only - not implemented in Phase 1)
 */

/** Render job entity (Phase 2) */
export interface RenderJob {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  current_step: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  progress: number; // 0-100
  retry_count: number;
  storyboard_script_version_snapshot: number;
  voice_id_snapshot: string;
  script_version_snapshot: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Job step entity (Phase 2) */
export interface JobStep {
  id: string;
  render_job_id: string;
  step_name: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  status: 'pending' | 'running' | 'failed' | 'done';
  start_time: string | null;
  end_time: string | null;
  log: string | null;
}
