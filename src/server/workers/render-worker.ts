import express from 'express';
import { renderMedia } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import {
  dequeueJob,
  updateJobStatus,
  getJobSteps,
  updateStepStatus,
  isJobCanceled,
  type RenderJob,
  type JobStep,
} from '../services/job-queue.service';

/**
 * Remotion Render Worker
 *
 * Polls database for queued render jobs and processes them through 4 steps:
 * 1. TTS Generation - Generate voiceover audio
 * 2. Subtitle Generation - Generate subtitle timings
 * 3. Media Fetch - Fetch background videos/images
 * 4. Render Composite - Render final video with Remotion
 */

// Worker configuration
const POLL_INTERVAL_MS = 2000; // 2 seconds
const STALLED_JOB_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const RENDER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Job state machine
type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
type JobStepName = 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
type StepState = 'pending' | 'running' | 'failed' | 'done';

/**
 * Main worker polling loop
 */
async function startWorker(): Promise<void> {
  console.log('🎬 Remotion Render Worker starting...');
  console.log(`📊 Polling interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`⏱️  Stalled job threshold: ${STALLED_JOB_THRESHOLD_MS}ms`);
  console.log(`🔨 Render timeout: ${RENDER_TIMEOUT_MS}ms`);

  // Start stalled job reaper
  startStalledJobReaper();

  // Start health check server
  startHealthCheckServer();

  // Main polling loop
  while (true) {
    try {
      // Check for cancellation before polling
      if (await isWorkerShuttingDown()) {
        console.log('🛑 Worker shutdown requested');
        break;
      }

      // Dequeue next job
      const job = await dequeueJob();

      if (!job) {
        // No jobs available, wait and poll again
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      console.log(`📦 Dequeued job ${job.id} for project ${job.project_id}`);

      // Process job
      await processJob(job);
    } catch (error) {
      console.error('❌ Error in polling loop:', error);
      // Continue polling despite errors
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

/**
 * Process a single render job through all steps
 */
async function processJob(job: RenderJob): Promise<void> {
  try {
    console.log(`🎬 Processing job ${job.id}`);

    // Get job steps
    const steps = await getJobSteps(job.id);
    console.log(`📋 Job has ${steps.length} steps`);

    // Process each step sequentially
    for (const step of steps) {
      // Check if job is canceled
      if (await isJobCanceled(job.id)) {
        console.log(`🚫 Job ${job.id} was canceled`);
        return;
      }

      // Process step
      await processStep(job, step);
    }

    // All steps completed successfully
    console.log(`✅ Job ${job.id} completed successfully`);
    await updateJobStatus(
      job.id,
      'succeeded',
      undefined,
      100,
      undefined,
      undefined
    );
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);

    // Mark job as failed
    await updateJobStatus(
      job.id,
      'failed',
      undefined,
      undefined,
      'RENDER_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Process a single job step
 */
async function processStep(job: RenderJob, step: JobStep): Promise<void> {
  console.log(`⚙️  Processing step: ${step.step_name}`);

  // Mark step as running
  await updateStepStatus(step.id, 'running', 'Step started');

  try {
    // Check for cancellation
    if (await isJobCanceled(job.id)) {
      console.log(`🚫 Job ${job.id} was canceled during ${step.step_name}`);
      return;
    }

    // Process step based on step name
    switch (step.step_name) {
      case 'tts_generation':
        await processTTSGeneration(job, step);
        break;
      case 'subtitle_generation':
        await processSubtitleGeneration(job, step);
        break;
      case 'media_fetch':
        await processMediaFetch(job, step);
        break;
      case 'render_composite':
        await processRenderComposite(job, step);
        break;
      default:
        throw new Error(`Unknown step: ${step.step_name}`);
    }

    // Mark step as done
    await updateStepStatus(step.id, 'done', 'Step completed');
    console.log(`✅ Step ${step.step_name} completed`);
  } catch (error) {
    // Mark step as failed
    await updateStepStatus(
      step.id,
      'failed',
      `Step failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error; // Re-throw to fail the entire job
  }
}

/**
 * Step 1: TTS Generation
 * Generate voiceover audio using Google Cloud TTS
 */
async function processTTSGeneration(job: RenderJob, step: JobStep): Promise<void> {
  console.log(`🎤 Generating TTS for job ${job.id}`);

  // TODO: Implement TTS generation using google-tts-service
  // This will:
  // 1. Fetch scene narration text from database
  // 2. Call Google Cloud TTS API
  // 3. Store audio files in Supabase Storage
  // 4. Update scenes table with audio URLs

  await updateJobStatus(job.id, 'running', 'tts_generation', 25);
  console.log(`🎤 TTS generation complete for job ${job.id}`);
}

/**
 * Step 2: Subtitle Generation
 * Generate subtitle timings using Google Cloud TTS timepoints
 */
async function processSubtitleGeneration(job: RenderJob, step: JobStep): Promise<void> {
  console.log(`📝 Generating subtitles for job ${job.id}`);

  // TODO: Implement subtitle generation
  // This will:
  // 1. Fetch scenes with TTS audio
  // 2. Call Google Cloud TTS with enableTimepoints: ['WORDS']
  // 3. Parse timepoints into word timings
  // 4. Update scenes.subtitle_timing JSONB column

  await updateJobStatus(job.id, 'running', 'subtitle_generation', 50);
  console.log(`📝 Subtitle generation complete for job ${job.id}`);
}

/**
 * Step 3: Media Fetch
 * Fetch background videos/images from stock media APIs
 */
async function processMediaFetch(job: RenderJob, step: JobStep): Promise<void> {
  console.log(`🎬 Fetching media for job ${job.id}`);

  // TODO: Implement media fetch
  // This will:
  // 1. Fetch scene keywords from database
  // 2. Call Pexels/Pixabay APIs to download media
  // 3. Upload media files to Supabase Storage
  // 4. Update scenes table with media URLs

  await updateJobStatus(job.id, 'running', 'media_fetch', 75);
  console.log(`🎬 Media fetch complete for job ${job.id}`);
}

/**
 * Step 4: Render Composite
 * Render final video using Remotion
 */
async function processRenderComposite(job: RenderJob, step: JobStep): Promise<void> {
  console.log(`🎬 Rendering composite video for job ${job.id}`);

  // Bundle Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../../worker/remotion/index.ts'),
    webpackOverride: (config) => config,
  });

  console.log(`📦 Bundle created at ${bundleLocation}`);

  // TODO: Implement video rendering
  // This will:
  // 1. Fetch all scene data (media URLs, audio URLs, subtitle timings)
  // 2. Call renderMedia() to render video
  // 3. Upload rendered video to Supabase Storage
  // 4. Update exports table with video URL

  await updateJobStatus(job.id, 'running', 'render_composite', 100);
  console.log(`🎬 Composite render complete for job ${job.id}`);

  // Clean up bundle
  try {
    await fs.rm(bundleLocation, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to clean up bundle:', error);
  }
}

/**
 * Stalled job reaper
 * Finds and marks jobs as failed if they've been running too long
 */
function startStalledJobReaper(): void {
  const REAPER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      console.log('⏰ Running stalled job reaper...');

      // TODO: Query for jobs stuck in 'running' status
      // SELECT * FROM render_jobs
      // WHERE status = 'running'
      // AND updated_at < NOW() - INTERVAL '15 minutes'
      // Then mark them as failed with error_message = 'Job stalled (timeout)'

      console.log('⏰ Stalled job reaper complete');
    } catch (error) {
      console.error('❌ Error in stalled job reaper:', error);
    }
  }, REAPER_INTERVAL_MS);
}

/**
 * Health check server
 * Provides /health endpoint for ECS load balancer
 */
function startHealthCheckServer(): void {
  const app = express();
  const PORT = 9000;

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  app.listen(PORT, () => {
    console.log(`🏥 Health check server listening on port ${PORT}`);
  });
}

/**
 * Check if worker is shutting down
 */
async function isWorkerShuttingDown(): Promise<boolean> {
  // TODO: Implement graceful shutdown logic
  // Check for SIGTERM/SIGINT signals
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the worker
 */
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('💀 Worker crashed:', error);
    process.exit(1);
  });
}

export { startWorker };
