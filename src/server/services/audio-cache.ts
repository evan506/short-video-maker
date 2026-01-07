/**
 * Audio Cache Service
 *
 * Manages TTS preview caching using Supabase database.
 * Handles cache lookup, insertion, and cleanup operations.
 */

import { supabase } from '../lib/supabase';
import { generateTextHash } from '../utils/text-hasher';

/**
 * Cache entry metadata
 */
export interface CacheEntry {
  id: string;
  project_id: string;
  scene_id: string;
  voice_id: string;
  text_hash: string;
  audio_url: string;
  created_at: string;
  expires_at: string;
}

/**
 * Cache lookup result
 */
export interface CacheLookupResult {
  found: boolean;
  entry?: CacheEntry;
  audioUrl?: string;
  expired?: boolean;
}

/**
 * Default cache TTL (10 minutes)
 */
const DEFAULT_CACHE_TTL_MINUTES = 10;

/**
 * Lookup TTS preview in cache
 *
 * @param projectId - Project UUID
 * @param sceneId - Scene UUID
 * @param voiceId - Voice ID
 * @param text - Narration text
 * @returns Cache lookup result
 *
 * @example
 * ```typescript
 * const result = await lookupCache(
 *   projectUuid,
 *   sceneUuid,
 *   'en-US-JennyNeural',
 *   'Hello world'
 * );
 *
 * if (result.found && !result.expired) {
 *   console.log('Cache hit:', result.audioUrl);
 * } else {
 *   console.log('Cache miss - generate new TTS');
 * }
 * ```
 */
export async function lookupCache(
  projectId: string,
  sceneId: string,
  voiceId: string,
  text: string
): Promise<CacheLookupResult> {
  // Generate cache key
  const textHash = generateTextHash(text, voiceId);

  // Query database for cache entry
  const { data, error } = await supabase
    .from('tts_previews')
    .select('*')
    .eq('text_hash', textHash)
    .eq('voice_id', voiceId)
    .eq('scene_id', sceneId)
    .maybeSingle();

  if (error) {
    console.error('[Cache] Database lookup failed:', error);
    return { found: false };
  }

  // No cache entry found
  if (!data) {
    console.log('[Cache] Miss - no entry found');
    return { found: false };
  }

  // Check if expired
  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;

  if (isExpired) {
    console.log('[Cache] Miss - entry expired');
    return {
      found: true,
      entry: data,
      expired: true,
    };
  }

  // Cache hit - return signed URL
  console.log('[Cache] Hit - returning cached audio');
  return {
    found: true,
    entry: data,
    audioUrl: data.audio_url,
    expired: false,
  };
}

/**
 * Insert TTS preview into cache
 *
 * @param projectId - Project UUID
 * @param sceneId - Scene UUID
 * @param voiceId - Voice ID
 * @param text - Narration text
 * @param audioUrl - Storage URL or signed URL for audio file
 * @param ttlMinutes - Cache TTL in minutes (default: 10)
 * @returns Created cache entry
 *
 * @example
 * ```typescript
 * const entry = await insertCache(
 *   projectUuid,
 *   sceneUuid,
 *   'en-US-JennyNeural',
 *   'Hello world',
 *   'https://storage.supabase.co/...',
 *   10
 * );
 * console.log('Cached until:', entry.expires_at);
 * ```
 */
export async function insertCache(
  projectId: string,
  sceneId: string,
  voiceId: string,
  text: string,
  audioUrl: string,
  ttlMinutes: number = DEFAULT_CACHE_TTL_MINUTES
): Promise<CacheEntry> {
  // Generate cache key
  const textHash = generateTextHash(text, voiceId);

  // Calculate expiration timestamp
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

  // Insert cache entry
  const { data, error } = await supabase
    .from('tts_previews')
    .insert({
      project_id: projectId,
      scene_id: sceneId,
      voice_id: voiceId,
      text_hash: textHash,
      audio_url: audioUrl,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Cache] Insert failed:', error);
    throw new Error(`Failed to insert cache entry: ${error.message}`);
  }

  console.log('[Cache] Inserted new entry, expires at:', expiresAt.toISOString());
  return data;
}

/**
 * Delete expired cache entries
 *
 * Cleanup job to remove old TTS previews from database.
 * Should be run periodically (e.g., cron job every hour).
 *
 * @returns Number of deleted entries
 *
 * @example
 * ```typescript
 * const deleted = await cleanupExpiredCache();
 * console.log(`Cleaned up ${deleted} expired entries`);
 * ```
 */
export async function cleanupExpiredCache(): Promise<number> {
  const { data, error } = await supabase
    .from('tts_previews')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[Cache] Cleanup failed:', error);
    throw new Error(`Failed to cleanup cache: ${error.message}`);
  }

  // Note: Supabase doesn't return count on delete, so we estimate
  console.log('[Cache] Cleanup completed');
  return 0; // TODO: Use count() in separate query if needed
}

/**
 * Clear all cache entries for a project
 *
 * Useful for clearing cache when project is deleted or user requests manual cache clear.
 *
 * @param projectId - Project UUID
 * @returns Number of deleted entries
 */
export async function clearProjectCache(projectId: string): Promise<number> {
  const { error } = await supabase
    .from('tts_previews')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('[Cache] Project cache clear failed:', error);
    throw new Error(`Failed to clear project cache: ${error.message}`);
  }

  console.log(`[Cache] Cleared all cache entries for project: ${projectId}`);
  return 0;
}

/**
 * Get cache statistics
 *
 * @param projectId - Optional project UUID to scope stats
 * @returns Cache statistics
 */
export async function getCacheStats(projectId?: string): Promise<{
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
}> {
  const query = supabase
    .from('tts_previews')
    .select('*', { count: 'exact', head: true });

  if (projectId) {
    query.eq('project_id', projectId);
  }

  const { count: total } = await query;

  // Count active (not expired)
  const activeQuery = supabase
    .from('tts_previews')
    .select('*', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString());

  if (projectId) {
    activeQuery.eq('project_id', projectId);
  }

  const { count: active } = await activeQuery;

  // Expired = total - active
  const expired = (total || 0) - (active || 0);

  return {
    totalEntries: total || 0,
    activeEntries: active || 0,
    expiredEntries: expired,
  };
}
