/**
 * Editor API Validators
 *
 * This file contains Zod validation schemas for the Script & Storyboard Editor API.
 * All validators enforce constraints from the feature specification.
 */

import { z } from 'zod';

/**
 * Project validators
 */
export const createProjectSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters').max(500, 'Topic must be at most 500 characters'),
  platform: z.enum(['shorts', 'tiktok', 'reels'], {
    errorMap: () => ({ message: 'Platform must be one of: shorts, tiktok, reels' })
  }),
  video_type: z.enum(['Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story'], {
    errorMap: () => ({ message: 'Video type must be one of: Explainer, Marketing, Tutorial, Recipe, Story' })
  }),
  target_duration: z.union([z.literal(15), z.literal(30), z.literal(60)], {
    errorMap: () => ({ message: 'Target duration must be one of: 15, 30, 60' })
  }),
});

export const updateProjectSchema = z.object({
  title: z.string().optional(),
  topic: z.string().min(10).max(500).optional(),
  platform: z.enum(['shorts', 'tiktok', 'reels']).optional(),
  video_type: z.enum(['Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story']).optional(),
  target_duration: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

/**
 * Script validators
 */
export const generateScriptSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
});

export const createScriptSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  content: z.string().min(50, 'Script content must be at least 50 characters'),
  source: z.enum(['llm', 'user'], {
    errorMap: () => ({ message: 'Source must be either "llm" or "user"' })
  }),
});

export const updateScriptSchema = z.object({
  content: z.string().min(50, 'Script content must be at least 50 characters').optional(),
});

export const restoreScriptSchema = z.object({
  script_id: z.string().uuid('Invalid script ID format'),
});

/**
 * Quick edit operation validators
 */
export const quickEditSchema = z.object({
  operation: z.enum(['shorten', 'lengthen', 'rephrase', 'tone'], {
    errorMap: () => ({ message: 'Operation must be one of: shorten, lengthen, rephrase, tone' })
  }),
  tone: z.string().optional(), // Required for 'tone' operation
});

/**
 * Scene validators
 */
export const createScenesSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  script_version: z.number().int().positive('Script version must be a positive integer'),
});

export const updateSceneSchema = z.object({
  narration_text: z.string().optional(),
  duration_sec_draft: z.number().int().positive('Duration must be at least 1 second').optional(),
  primary_keyword: z.string().min(1, 'Keyword cannot be empty').optional(),
  subtitle_style_preset_id: z.number().int().positive('Preset ID must be a positive integer').optional(),
  order_index: z.number().int().nonnegative('Order index must be non-negative').optional(),
});

export const reorderScenesSchema = z.object({
  scene_ids: z.array(z.string().uuid('Invalid scene ID format')).min(1, 'At least one scene ID is required'),
});

/**
 * Type inference from schemas
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type RestoreScriptInput = z.infer<typeof restoreScriptSchema>;
export type QuickEditInput = z.infer<typeof quickEditSchema>;
export type CreateScenesInput = z.infer<typeof createScenesSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type ReorderScenesInput = z.infer<typeof reorderScenesSchema>;
