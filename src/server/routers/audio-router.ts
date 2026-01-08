/**
 * Audio Router
 *
 * API endpoints for TTS preview generation and audio management.
 */

import express, { type Request, type Response } from 'express';
import { generateVoiceover, getAvailableVoices } from '../services/tts-service';
import { lookupCache, insertCache } from '../services/audio-cache';
import { uploadAudioFile, generateSignedUrl } from '../services/audio-storage';
import { supabase } from '../lib/supabase';

const router = express.Router();

/**
 * GET /api/v1/voices
 *
 * List available Edge TTS voices
 */
router.get('/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await getAvailableVoices();
    res.status(200).json({ voices });
  } catch (error: any) {
    console.error('[AudioRouter] Failed to fetch voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/scenes/:sceneId/tts/preview
 *
 * Generate TTS preview for a scene
 *
 * Request body:
 * {
 *   "text": string;        // Narration text
 *   "voiceId": string;     // Voice ID (e.g., 'en-US-JennyNeural')
 * }
 *
 * Response:
 * {
 *   "audioUrl": string;    // Signed URL to audio file
 *   "duration": number;    // Duration in seconds
 *   "cached": boolean;     // Whether result was from cache
 * }
 */
router.post('/scenes/:sceneId/tts/preview', async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const { text, voiceId } = req.body;

    // Validate input
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    if (!voiceId) {
      res.status(400).json({ error: 'Voice ID is required' });
      return;
    }

    // Fetch scene to get project_id
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('project_id, narration_text')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }

    const projectId = scene.project_id;
    const narrationText = text || scene.narration_text;

    if (!narrationText) {
      res.status(400).json({ error: 'Scene has no narration text' });
      return;
    }

    // Check cache first
    const cacheResult = await lookupCache(projectId, sceneId, voiceId, narrationText);

    if (cacheResult.found && !cacheResult.expired && cacheResult.audioUrl) {
      // Cache hit - generate fresh signed URL
      const audioUrl = await generateSignedUrl(
        `${projectId}/${sceneId}/voiceover.mp3`,
        60 // 60 seconds TTL
      );

      res.status(200).json({
        audioUrl,
        duration: cacheResult.entry?.duration_seconds || 0,
        cached: true,
      });
      return;
    }

    // Cache miss - generate new TTS
    console.log(`[TTS] Generating for scene ${sceneId}, voice ${voiceId}`);
    const startTime = Date.now();

    const ttsResult = await generateVoiceover(narrationText, { voice: voiceId });

    const generationTime = Date.now() - startTime;
    console.log(`[TTS] Generated in ${generationTime}ms, size: ${ttsResult.audioBuffer.length} bytes`);

    // Upload to Supabase Storage
    const storagePath = await uploadAudioFile(
      projectId,
      sceneId,
      'voiceover',
      ttsResult.audioBuffer,
      { upsert: true }
    );

    // Generate signed URL
    const audioUrl = await generateSignedUrl(storagePath, 60);

    // Insert into cache (10 minute TTL)
    await insertCache(
      projectId,
      sceneId,
      voiceId,
      narrationText,
      audioUrl,
      10 // 10 minutes
    );

    // Insert record into scene_audio table
    const { error: audioError } = await supabase.from('scene_audio').insert({
      scene_id: sceneId,
      audio_type: 'voiceover',
      storage_url: storagePath,
      duration_sec: ttsResult.durationSeconds,
      file_format: 'mp3',
      bit_rate: 48, // Edge TTS default: 48kbitrate
      sample_rate: 24000, // Edge TTS default: 24khz
      file_size_bytes: ttsResult.audioBuffer.length,
      metadata: {
        voice_id: voiceId,
        generation_time_ms: generationTime,
      },
    });

    if (audioError) {
      console.error('[TTS] Failed to insert scene_audio record:', audioError);
      // Don't fail the request - audio was still generated successfully
    }

    res.status(200).json({
      audioUrl,
      duration: ttsResult.durationSeconds,
      cached: false,
    });
  } catch (error: any) {
    console.error('[AudioRouter] TTS generation failed:', error);
    res.status(500).json({
      error: 'TTS generation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/scenes/tts/batch
 *
 * Batch generate TTS previews for all scenes in a project
 *
 * Request query:
 * - projectId: Project UUID
 *
 * Response:
 * {
 *   "jobId": string;      // Batch job ID
 *   "sceneCount": number; // Number of scenes to process
 * }
 */
router.post('/scenes/tts/batch', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    // Fetch all scenes for project
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('id, narration_text')
      .eq('project_id', projectId);

    if (scenesError) {
      throw scenesError;
    }

    if (!scenes || scenes.length === 0) {
      res.status(404).json({ error: 'No scenes found for project' });
      return;
    }

    // Get project voice selection
    const { data: project } = await supabase
      .from('projects')
      .select('voice_id')
      .eq('id', projectId)
      .single();

    const voiceId = project?.voice_id || 'en-US-JennyNeural';

    // Create audio_generation_jobs records for each scene
    const jobs = scenes.map((scene) => ({
      scene_id: scene.id,
      job_type: 'voiceover',
      status: 'pending',
      tts_provider: 'edge-tts',
      voice_name: voiceId,
    }));

    const { error: jobsError } = await supabase
      .from('audio_generation_jobs')
      .insert(jobs);

    if (jobsError) {
      throw jobsError;
    }

    // TODO: Trigger worker to process jobs (not implemented in this work package)
    console.log(`[Batch] Created ${jobs.length} TTS jobs for project ${projectId}`);

    res.status(200).json({
      jobId: projectId, // Using projectId as jobId for now
      sceneCount: jobs.length,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('[AudioRouter] Batch TTS failed:', error);
    res.status(500).json({
      error: 'Batch TTS generation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/scenes/:sceneId/audio/mix
 *
 * Create audio mixing job for a scene
 *
 * Request body:
 * {
 *   "voiceoverVolume": number;  // Optional, default 0.8
 *   "musicVolume": number;     // Optional, default 0.4
 *   "musicId": string;          // Required - background music track ID
 *   "fadeInDuration": number;   // Optional, default 1 second
 *   "fadeOutDuration": number;  // Optional, default 1 second
 * }
 *
 * Response:
 * {
 *   "jobId": string;     // Job record ID
 *   "status": string;    // "pending"
 * }
 */
router.post('/scenes/:sceneId/audio/mix', async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;
    const {
      voiceoverVolume = 0.8,
      musicVolume = 0.4,
      musicId,
      fadeInDuration = 1,
      fadeOutDuration = 1,
    } = req.body;

    // Validate musicId
    if (!musicId) {
      res.status(400).json({ error: 'Music ID is required' });
      return;
    }

    // Fetch scene to get project_id
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('project_id')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }

    const projectId = scene.project_id;

    // Fetch scene audio records to verify voiceover exists
    const { data: voiceoverAudio, error: voiceoverError } = await supabase
      .from('scene_audio')
      .select('storage_url')
      .eq('scene_id', sceneId)
      .eq('audio_type', 'voiceover')
      .single();

    if (voiceoverError || !voiceoverAudio) {
      res.status(400).json({ error: 'Voiceover not found. Please generate voiceover first.' });
      return;
    }

    // Fetch music track
    const { data: musicTrack, error: musicError } = await supabase
      .from('background_music')
      .select('storage_url')
      .eq('id', musicId)
      .single();

    if (musicError || !musicTrack) {
      res.status(404).json({ error: 'Music track not found' });
      return;
    }

    // Create audio_generation_jobs record
    const { data: job, error: jobError } = await supabase
      .from('audio_generation_jobs')
      .insert({
        scene_id: sceneId,
        job_type: 'mixing',
        status: 'pending',
        options: {
          voiceoverVolume,
          musicVolume,
          musicId,
          fadeInDuration,
          fadeOutDuration,
          voiceoverUrl: voiceoverAudio.storage_url,
          musicUrl: musicTrack.storage_url,
        },
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw jobError || new Error('Failed to create job');
    }

    // TODO: Trigger worker to process job (not implemented in this work package)
    console.log(`[AudioRouter] Created mixing job ${job.id} for scene ${sceneId}`);

    res.status(200).json({
      jobId: job.id,
      status: 'pending',
    });
  } catch (error: any) {
    console.error('[AudioRouter] Audio mixing job creation failed:', error);
    res.status(500).json({
      error: 'Failed to create mixing job',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/scenes/:sceneId/audio/status
 *
 * Check audio generation job status
 *
 * Response:
 * {
 *   "status": string;  // pending, processing, completed, failed
 *   "audioUrl": string; // Available if status=completed
 *   "error": string;   // Available if status=failed
 * }
 */
router.get('/scenes/:sceneId/audio/status', async (req: Request, res: Response) => {
  try {
    const { sceneId } = req.params;

    // Fetch latest job for scene
    const { data: job, error: jobError } = await supabase
      .from('audio_generation_jobs')
      .select('*')
      .eq('scene_id', sceneId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw jobError;
    }

    if (!job) {
      res.status(404).json({ error: 'No audio job found for scene' });
      return;
    }

    // If completed, fetch audio URL from scene_audio
    let audioUrl: string | undefined;
    if (job.status === 'completed') {
      const { data: audio } = await supabase
        .from('scene_audio')
        .select('storage_url')
        .eq('scene_id', sceneId)
        .eq('audio_type', 'voiceover')
        .maybeSingle();

      if (audio) {
        audioUrl = await generateSignedUrl(audio.storage_url, 60);
      }
    }

    res.status(200).json({
      status: job.status,
      audioUrl,
      error: job.error_message,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    });
  } catch (error: any) {
    console.error('[AudioRouter] Status check failed:', error);
    res.status(500).json({
      error: 'Failed to check audio status',
      message: error.message,
    });
  }
});

export default router;
