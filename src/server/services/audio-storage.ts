/**
 * Audio Storage Service
 *
 * Handles Supabase Storage operations for audio files.
 * Manages upload, download, and signed URL generation for TTS previews and mixed audio.
 */

import { supabase } from '../lib/supabase';

/**
 * Storage bucket name for audio files
 */
export const AUDIO_BUCKET = 'audio-files';

/**
 * Upload audio file to Supabase Storage
 *
 * @param projectId - Project UUID
 * @param sceneId - Scene UUID
 * @param audioType - Type of audio ('voiceover', 'music', 'mixed')
 * @param fileBuffer - Audio file buffer
 * @param options - Upload options
 * @returns Storage path
 *
 * @example
 * ```typescript
 * const buffer = fs.readFileSync('voiceover.mp3');
 * const path = await uploadAudioFile(
 *   projectUuid,
 *   sceneUuid,
 *   'voiceover',
 *   buffer,
 *   { upsert: true }
 * );
 * ```
 */
export async function uploadAudioFile(
  projectId: string,
  sceneId: string,
  audioType: 'voiceover' | 'music' | 'mixed',
  fileBuffer: Buffer,
  options: { upsert?: boolean } = {}
): Promise<string> {
  // Construct storage path: audio-files/{project_id}/{scene_id}/{audio_type}.mp3
  const storagePath = `${projectId}/${sceneId}/${audioType}.mp3`;

  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'audio/mpeg',
      upsert: options.upsert ?? false,
    });

  if (error) {
    throw new Error(`Failed to upload audio file: ${error.message}`);
  }

  return data.path;
}

/**
 * Generate signed URL for audio playback
 *
 * Signed URLs provide temporary access to private audio files.
 * Default TTL is 60 seconds.
 *
 * @param storagePath - Storage path (e.g., 'project-uuid/scene-uuid/voiceover.mp3')
 * @param ttlSeconds - Time-to-live in seconds (default: 60)
 * @returns Signed URL
 *
 * @example
 * ```typescript
 * const url = await generateSignedUrl('project-123/scene-456/voiceover.mp3', 60);
 * // Returns: https://xyz.supabase.co/storage/v1/object/sign/audio-files/...?token=...
 * ```
 */
export async function generateSignedUrl(
  storagePath: string,
  ttlSeconds: number = 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Get public URL for audio file (if bucket is public)
 *
 * Use this only for audio-files bucket with public policies enabled.
 * For private files, use generateSignedUrl instead.
 *
 * @param storagePath - Storage path
 * @returns Public URL
 */
export function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Download audio file from Supabase Storage
 *
 * @param storagePath - Storage path
 * @returns File buffer
 */
export async function downloadAudioFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download audio file: ${error.message}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete audio file from Supabase Storage
 *
 * @param storagePath - Storage path
 */
export async function deleteAudioFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete audio file: ${error.message}`);
  }
}

/**
 * List all audio files for a scene
 *
 * @param projectId - Project UUID
 * @param sceneId - Scene UUID
 * @returns Array of storage paths
 */
export async function listSceneAudioFiles(
  projectId: string,
  sceneId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .list(`${projectId}/${sceneId}`);

  if (error) {
    throw new Error(`Failed to list audio files: ${error.message}`);
  }

  return data.map((file) => `${projectId}/${sceneId}/${file.name}`);
}

/**
 * Check if audio file exists in storage
 *
 * @param storagePath - Storage path
 * @returns true if file exists
 */
export async function audioFileExists(storagePath: string): Promise<boolean> {
  try {
    await supabase.storage
      .from(AUDIO_BUCKET)
      .getMetadata(storagePath);
    return true;
  } catch (error: any) {
    if (error?.status === 404) {
      return false;
    }
    throw error;
  }
}
