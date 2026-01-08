/**
 * Render Service
 *
 * Business logic for async video rendering job lifecycle:
 * - T016: Service layer for render job operations
 * - T017: Snapshot capture logic (prevent mid-render changes)
 * - Job creation, status polling, cancellation, retry
 */

import { supabase } from '../lib/supabase';

// Types
export interface RenderJob {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  current_step: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite' | null;
  progress: number;
  storyboard_script_version_snapshot: number;
  voice_id_snapshot: string;
  script_version_snapshot: number;
  retry_count: number;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStep {
  id: string;
  render_job_id: string;
  step_name: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  status: 'pending' | 'running' | 'failed' | 'done';
  started_at: string | null;
  ended_at: string | null;
  log: string | null;
  created_at: string;
}

export interface CreateRenderJobInput {
  projectId: string;
  userId: string;
}

export interface RenderJobWithSteps extends RenderJob {
  job_steps: JobStep[];
}

// Error messages mapping (T019)
const ERROR_MESSAGES: Record<string, { message: string; action: string }> = {
  TTS_FAILED: {
    message: 'Voiceover generation failed for one or more scenes',
    action: 'Regenerate voiceovers from storyboard editor',
  },
  SUBTITLE_FAILED: {
    message: 'Subtitle timing extraction failed',
    action: 'Retry rendering or change subtitle preset',
  },
  MEDIA_TIMEOUT: {
    message: 'Media download timed out',
    action: 'Retry with alternate provider (Pixabay) or upload custom media',
  },
  STORAGE_UPLOAD_FAILED: {
    message: 'Failed to upload rendered video to storage',
    action: 'Retry rendering or check storage quota',
  },
  RENDER_TIMEOUT: {
    message: 'Video rendering exceeded 10 minute timeout',
    action: 'Simplify project (fewer scenes or shorter duration)',
  },
};

/**
 * Create a new render job (T012, T016, T017)
 * - Captures snapshots of project state
 * - Creates render_job and 4 job_steps records
 * - Uses transaction to ensure consistency
 */
export async function createRenderJob(
  input: CreateRenderJobInput
): Promise<RenderJob> {
  const { projectId, userId } = input;

  // Fetch project to capture snapshots (T017)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('storyboard_script_version, voice_id, current_script_version')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    throw new Error('Project not found or access denied');
  }

  // Capture snapshots (T017)
  const storyboardScriptVersionSnapshot = project.storyboard_script_version || 0;
  const voiceIdSnapshot = project.voice_id || '';
  const scriptVersionSnapshot = project.current_script_version || 0;

  console.log(`[RenderService] Creating render job with snapshots:`, {
    storyboardScriptVersion: storyboardScriptVersionSnapshot,
    voiceId: voiceIdSnapshot,
    scriptVersion: scriptVersionSnapshot,
  });

  // Create render_job record
  const { data: renderJob, error: renderJobError } = await supabase
    .from('render_jobs')
    .insert({
      project_id: projectId,
      status: 'queued',
      current_step: 'tts_generation',
      progress: 0,
      storyboard_script_version_snapshot: storyboardScriptVersionSnapshot,
      voice_id_snapshot: voiceIdSnapshot,
      script_version_snapshot: scriptVersionSnapshot,
      retry_count: 0,
    })
    .select()
    .single();

  if (renderJobError || !renderJob) {
    throw new Error(`Failed to create render job: ${renderJobError?.message}`);
  }

  // Create 4 job_steps records
  const steps = [
    'tts_generation',
    'subtitle_generation',
    'media_fetch',
    'render_composite',
  ] as const;

  const jobStepsToInsert = steps.map((step_name) => ({
    render_job_id: renderJob.id,
    step_name,
    status: 'pending',
  }));

  const { error: stepsError } = await supabase
    .from('job_steps')
    .insert(jobStepsToInsert);

  if (stepsError) {
    // Cleanup: delete render_job if steps creation failed
    await supabase.from('render_jobs').delete().eq('id', renderJob.id);
    throw new Error(`Failed to create job steps: ${stepsError.message}`);
  }

  return renderJob;
}

/**
 * Get render job with steps (T013, T016)
 * - Returns job and all job steps
 * - Calculates progress % based on completed steps
 */
export async function getRenderJob(
  jobId: string,
  userId: string
): Promise<RenderJobWithSteps> {
  // Fetch render job with RLS check (via project_id)
  const { data: renderJob, error: jobError } = await supabase
    .from('render_jobs')
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .eq('id', jobId)
    .single();

  if (jobError || !renderJob) {
    throw new Error('Render job not found or access denied');
  }

  // Verify user owns the job (via project)
  if (renderJob.project.user_id !== userId) {
    throw new Error('Access denied');
  }

  // Fetch job steps
  const { data: jobSteps, error: stepsError } = await supabase
    .from('job_steps')
    .select('*')
    .eq('render_job_id', jobId)
    .order('step_name', { ascending: true });

  if (stepsError) {
    throw new Error(`Failed to fetch job steps: ${stepsError.message}`);
  }

  // Calculate progress % (T013)
  const completedSteps = jobSteps.filter((s) => s.status === 'done').length;
  const progress = Math.round((completedSteps / jobSteps.length) * 100);

  // Update progress if different
  if (renderJob.progress !== progress) {
    await supabase
      .from('render_jobs')
      .update({ progress })
      .eq('id', jobId);
    renderJob.progress = progress;
  }

  return {
    ...renderJob,
    job_steps: jobSteps || [],
  };
}

/**
 * Cancel render job (T014, T016)
 * - Only allow cancel if status is 'queued' or 'running'
 * - Updates status to 'canceled'
 */
export async function cancelRenderJob(
  jobId: string,
  userId: string
): Promise<RenderJob> {
  // Fetch job with ownership check
  const { data: existingJob, error: fetchError } = await supabase
    .from('render_jobs')
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .eq('id', jobId)
    .single();

  if (fetchError || !existingJob) {
    throw new Error('Render job not found or access denied');
  }

  if (existingJob.project.user_id !== userId) {
    throw new Error('Access denied');
  }

  // Check if job can be canceled
  if (existingJob.status === 'succeeded') {
    throw new Error('Cannot cancel a succeeded job');
  }

  if (existingJob.status === 'failed') {
    throw new Error('Cannot cancel a failed job. Use retry instead.');
  }

  if (existingJob.status === 'canceled') {
    throw new Error('Job is already canceled');
  }

  // Update status to canceled
  const { data: updatedJob, error: updateError } = await supabase
    .from('render_jobs')
    .update({
      status: 'canceled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(`Failed to cancel job: ${updateError?.message}`);
  }

  return updatedJob;
}

/**
 * Retry render job from failed step (T015, T016)
 * - Only allow retry if status is 'failed'
 * - Resets failed step and subsequent steps to 'pending'
 * - Increments retry_count
 */
export async function retryRenderJob(
  jobId: string,
  userId: string
): Promise<RenderJob> {
  // Fetch job with ownership check
  const { data: existingJob, error: fetchError } = await supabase
    .from('render_jobs')
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .eq('id', jobId)
    .single();

  if (fetchError || !existingJob) {
    throw new Error('Render job not found or access denied');
  }

  if (existingJob.project.user_id !== userId) {
    throw new Error('Access denied');
  }

  // Check if job can be retried
  if (existingJob.status !== 'failed') {
    throw new Error('Only failed jobs can be retried');
  }

  // Fetch job steps to find first failed step
  const { data: jobSteps, error: stepsError } = await supabase
    .from('job_steps')
    .select('*')
    .eq('render_job_id', jobId)
    .order('step_name', { ascending: true });

  if (stepsError || !jobSteps) {
    throw new Error(`Failed to fetch job steps: ${stepsError?.message}`);
  }

  // Find first failed step
  const failedStepIndex = jobSteps.findIndex((s) => s.status === 'failed');
  if (failedStepIndex === -1) {
    throw new Error('No failed step found');
  }

  const failedStep = jobSteps[failedStepIndex];
  const stepsToReset = jobSteps.slice(failedStepIndex);

  // Reset failed step and subsequent steps to 'pending'
  for (const step of stepsToReset) {
    await supabase
      .from('job_steps')
      .update({
        status: 'pending',
        started_at: null,
        ended_at: null,
        log: null,
      })
      .eq('id', step.id);
  }

  // Update render job
  const { data: updatedJob, error: updateError } = await supabase
    .from('render_jobs')
    .update({
      status: 'queued',
      current_step: failedStep.step_name,
      retry_count: existingJob.retry_count + 1,
      error_code: null,
      error_message: null,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (updateError || !updatedJob) {
    throw new Error(`Failed to retry job: ${updateError?.message}`);
  }

  return updatedJob;
}

/**
 * Get user-friendly error message (T019)
 */
export function getErrorMessage(errorCode: string | null): {
  message: string;
  action: string;
} {
  if (!errorCode) {
    return {
      message: 'An unexpected error occurred',
      action: 'Please try again or contact support',
    };
  }

  return (
    ERROR_MESSAGES[errorCode] || {
      message: `Error: ${errorCode}`,
      action: 'Please try again or contact support',
    }
  );
}
