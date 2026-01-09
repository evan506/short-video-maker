import { supabase } from '../supabase';

/**
 * Render Job Queue Service
 *
 * Handles database polling and job dequeuing with FOR UPDATE SKIP LOCKED
 * to support multiple worker instances without race conditions.
 */

export interface RenderJob {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  current_step: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  progress: number;
  storyboard_script_version_snapshot: number;
  voice_id_snapshot: string;
  script_version_snapshot: number;
  retry_count: number;
  error_code?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface JobStep {
  id: string;
  render_job_id: string;
  step_name: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  status: 'pending' | 'running' | 'failed' | 'done';
  started_at?: string;
  ended_at?: string;
  log?: string;
  created_at: string;
}

/**
 * Dequeue a render job using FOR UPDATE SKIP LOCKED
 *
 * This SQL query atomically:
 * 1. Finds the oldest queued job
 * 2. Locks it exclusively (skipping already-locked jobs)
 * 3. Updates its status to 'running'
 * 4. Returns the job record
 *
 * @returns The dequeued job or null if no jobs available
 */
export async function dequeueJob(): Promise<RenderJob | null> {
  const { data, error } = await supabase.rpc('dequeue_render_job');

  if (error) {
    console.error('Failed to dequeue job:', error);
    throw new Error(`Job dequeue failed: ${error.message}`);
  }

  return data as RenderJob | null;
}

/**
 * Update job status
 *
 * @param jobId - Job ID to update
 * @param status - New status
 * @param currentStep - Current step (optional)
 * @param progress - Progress percentage (0-100)
 * @param errorCode - Error code (if failed)
 * @param errorMessage - Error message (if failed)
 */
export async function updateJobStatus(
  jobId: string,
  status: RenderJob['status'],
  currentStep?: RenderJob['current_step'],
  progress?: number,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (currentStep) updateData.current_step = currentStep;
  if (progress !== undefined) updateData.progress = progress;
  if (errorCode) updateData.error_code = errorCode;
  if (errorMessage) updateData.error_message = errorMessage;

  const { error } = await supabase
    .from('render_jobs')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job status:', error);
    throw new Error(`Job status update failed: ${error.message}`);
  }
}

/**
 * Get all job steps for a render job
 *
 * @param jobId - Render job ID
 * @returns Array of job steps
 */
export async function getJobSteps(jobId: string): Promise<JobStep[]> {
  const { data, error } = await supabase
    .from('job_steps')
    .select('*')
    .eq('render_job_id', jobId)
    .order('step_name', { ascending: true });

  if (error) {
    console.error('Failed to fetch job steps:', error);
    throw new Error(`Job steps fetch failed: ${error.message}`);
  }

  return data as JobStep[];
}

/**
 * Update job step status
 *
 * @param stepId - Step ID to update
 * @param status - New status
 * @param log - Log message (optional)
 */
export async function updateStepStatus(
  stepId: string,
  status: JobStep['status'],
  log?: string
): Promise<void> {
  const updateData: any = {
    status,
  };

  if (status === 'running') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'done' || status === 'failed') {
    updateData.ended_at = new Date().toISOString();
  }

  if (log) updateData.log = log;

  const { error } = await supabase
    .from('job_steps')
    .update(updateData)
    .eq('id', stepId);

  if (error) {
    console.error('Failed to update step status:', error);
    throw new Error(`Step status update failed: ${error.message}`);
  }
}

/**
 * Check if job is canceled
 *
 * @param jobId - Job ID to check
 * @returns True if job is canceled
 */
export async function isJobCanceled(jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('render_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (error) {
    console.error('Failed to check job status:', error);
    return false;
  }

  return data?.status === 'canceled';
}
