/**
 * Text Hasher Utility
 *
 * Generates SHA-256 hashes for TTS cache keys.
 * Used to deduplicate TTS generation requests for identical text + voice combinations.
 */

import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash for TTS cache key
 *
 * Combines narration text and voice ID to create unique cache key.
 * Same text with different voice produces different hash.
 *
 * @param text - Narration text to hash
 * @param voiceId - Edge TTS voice ID (e.g., 'en-US-JennyNeural')
 * @returns SHA-256 hash as hexadecimal string
 *
 * @example
 * ```typescript
 * const hash1 = generateTextHash('Hello world', 'en-US-JennyNeural');
 * const hash2 = generateTextHash('Hello world', 'en-US-JennyNeural');
 * hash1 === hash2; // true - cache hit
 *
 * const hash3 = generateTextHash('Hello world', 'en-GB-SoniaNeural');
 * hash1 === hash3; // false - different voice, cache miss
 * ```
 */
export function generateTextHash(text: string, voiceId: string): string {
  // Normalize text: trim whitespace and convert to consistent case
  const normalizedText = text.trim().toLowerCase();

  // Combine text and voice ID with separator to prevent collisions
  // (e.g., "hello:voice1" vs "hellovoice:1")
  const combined = `${normalizedText}:${voiceId}`;

  // Generate SHA-256 hash
  return createHash('sha256')
    .update(combined, 'utf-8')
    .digest('hex');
}

/**
 * Validate text hash format
 *
 * @param hash - Hash string to validate
 * @returns true if hash is valid SHA-256 format (64 hex characters)
 */
export function isValidTextHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

/**
 * Extract metadata from hash for debugging
 *
 * @param hash - Text hash
 * @returns Object with hash metadata
 */
export function getHashMetadata(hash: string) {
  return {
    hash,
    length: hash.length,
    algorithm: 'sha256',
    isValid: isValidTextHash(hash),
  };
}
