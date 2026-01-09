import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Composite Video Worker
 *
 * Orchestrates Remotion rendering to composite media, audio, and subtitles
 * into final MP4 video output.
 *
 * Process:
 * 1. Bundle Remotion project
 * 2. Calculate composition duration from scenes
 * 3. Render video with H.264 codec, AAC audio
 * 4. Upload to Supabase Storage
 * 5. Update exports table
 */

interface RenderJob {
  id: string;
  project_id: string;
  storyboard_script_version_snapshot: number;
  voice_id_snapshot: string;
  script_version_snapshot: number;
}

interface RenderOptions {
  projectId: string;
  renderJobId: string;
  outputPath: string;
}

interface RenderResult {
  success: boolean;
  outputPath?: string;
  durationSec?: number;
  fileSizeBytes?: number;
  error?: string;
}

/**
 * Main render orchestration function
 */
export async function renderCompositeVideo(
  renderJob: RenderJob,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<RenderResult> {
  const startTime = Date.now();

  try {
    console.log(`[Composite Worker] Starting render for job ${renderJob.id}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch scenes to calculate total duration
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('id, duration_sec_final, duration_sec_draft')
      .eq('project_id', renderJob.project_id)
      .order('order_index', { ascending: true });

    if (scenesError || !scenes || scenes.length === 0) {
      throw new Error(`Failed to fetch scenes: ${scenesError?.message || 'No scenes found'}`);
    }

    // Calculate total duration in seconds
    const totalDurationSec = scenes.reduce((sum, scene) => {
      const duration = scene.duration_sec_final || scene.duration_sec_draft;
      return sum + duration;
    }, 0);

    const totalFrames = Math.floor(totalDurationSec * 30); // 30 FPS
    console.log(`[Composite Worker] Total duration: ${totalDurationSec}s (${totalFrames} frames)`);

    // Step 2: Bundle Remotion project
    console.log('[Composite Worker] Bundling Remotion project...');
    const bundleLocation = await bundle({
      entryPoint: path.resolve('src/worker/remotion/index.ts'),
      webpackOverride: (config) => {
        // Custom webpack config for worker environment
        return {
          ...config,
          externals: ['@supabase/supabase-js'],
        };
      },
    });

    console.log(`[Composite Worker] Bundle created at ${bundleLocation}`);

    // Step 3: Get composition
    const compositionId = 'composite';
    const composition = await selectComposition({
      bundleLocation,
      id: compositionId,
      inputProps: {
        projectId: renderJob.project_id,
        renderJobId: renderJob.id,
      },
    });

    if (!composition) {
      throw new Error(`Composition "${compositionId}" not found`);
    }

    console.log(`[Composite Worker] Composition loaded: ${compositionId}`);

    // Step 4: Create output directory
    const outputDir = path.join(os.tmpdir(), 'remotion-renders');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `job-${renderJob.id}.mp4`);
    console.log(`[Composite Worker] Output path: ${outputPath}`);

    // Step 5: Render video
    console.log('[Composite Worker] Starting render...');
    const renderStartTime = Date.now();

    await renderMedia({
      bundleLocation,
      compositionId,
      inputProps: {
        projectId: renderJob.project_id,
        renderJobId: renderJob.id,
      },
      codec: 'h264',
      audioCodec: 'aac',
      outputLocation: outputPath,
      pixelFormat: 'yuv420p',
      frameRange: [0, totalFrames - 1],
      everyNthFrame: 1,
      numberOfGifLoops: 1,
      concurrency: 1,
      videoImageFormat: 'jpeg',
      crf: 23,
      envVariables: {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      },
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        console.log(`[Composite Worker] Render progress: ${percent}%`);
      },
    });

    const renderDuration = (Date.now() - renderStartTime) / 1000;
    console.log(`[Composite Worker] Render completed in ${renderDuration}s`);

    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created');
    }

    // Get file stats
    const stats = fs.statSync(outputPath);
    const fileSizeBytes = stats.size;

    console.log(`[Composite Worker] Output file size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);

    // Step 6: Upload to Supabase Storage
    console.log('[Composite Worker] Uploading to Supabase Storage...');
    const fileName = `exports/${renderJob.project_id}/${renderJob.id}.mp4`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, fs.createReadStream(outputPath), {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName);

    const videoUrl = publicUrlData.publicUrl;
    console.log(`[Composite Worker] Video uploaded: ${videoUrl}`);

    // Step 7: Create export record
    const { error: exportError } = await supabase
      .from('exports')
      .insert({
        project_id: renderJob.project_id,
        render_job_id: renderJob.id,
        video_url: videoUrl,
        duration_sec: Math.floor(totalDurationSec),
        file_size_bytes: fileSizeBytes,
        resolution: '1080x1920',
        format: 'mp4',
      });

    if (exportError) {
      throw new Error(`Failed to create export record: ${exportError.message}`);
    }

    // Clean up local file
    fs.unlinkSync(outputPath);

    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(`[Composite Worker] Total time: ${totalDuration}s`);

    return {
      success: true,
      outputPath: videoUrl,
      durationSec: Math.floor(totalDurationSec),
      fileSizeBytes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Composite Worker] Render failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Standalone execution for testing
 */
export async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const renderJobId = process.env.RENDER_JOB_ID || '';

  if (!supabaseUrl || !supabaseServiceKey || !renderJobId) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch render job
  const { data: renderJob, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('id', renderJobId)
    .single();

  if (error || !renderJob) {
    console.error('Failed to fetch render job:', error?.message);
    process.exit(1);
  }

  // Render video
  const result = await renderCompositeVideo(renderJob, supabaseUrl, supabaseServiceKey);

  if (result.success) {
    console.log('✅ Render successful');
    console.log(`Output: ${result.outputPath}`);
    console.log(`Duration: ${result.durationSec}s`);
    console.log(`Size: ${result.fileSizeBytes} bytes`);
    process.exit(0);
  } else {
    console.error('❌ Render failed:', result.error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
