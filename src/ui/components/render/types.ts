/**
 * Render UI Types
 *
 * Type definitions for render job progress tracking UI components.
 */

import type { RenderJob, JobStep } from '../../../server/services/render-service';

/**
 * Render job with UI-specific computed fields
 */
export interface RenderJobUI extends RenderJob {
  job_steps: JobStep[];
}

/**
 * Step name to user-friendly label mapping
 */
export const STEP_LABELS: Record<string, string> = {
  tts_generation: 'Generating voiceovers',
  subtitle_generation: 'Generating subtitles',
  media_fetch: 'Downloading media',
  render_composite: 'Rendering video',
};

/**
 * Step status to label mapping
 */
export const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting',
  running: 'In progress',
  done: 'Completed',
  failed: 'Failed',
};

/**
 * Job status to label mapping
 */
export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  running: 'Rendering',
  succeeded: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
};
