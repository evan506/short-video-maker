/**
 * TTS Service
 *
 * Integrates Edge TTS (Microsoft Edge Text-to-Speech) for voiceover generation.
 * Provides retry logic, error handling, and audio format optimization.
 */

import * as edgeTts from 'edge-tts';

/**
 * Edge TTS voice metadata
 */
export interface Voice {
  id: string;
  name: string;
  locale: string;
  gender: 'Male' | 'Female';
  description?: string;
}

/**
 * TTS generation options
 */
export interface TTSOptions {
  /**
   * Voice ID (e.g., 'en-US-JennyNeural')
   * @default 'en-US-JennyNeural'
   */
  voice?: string;

  /**
   * Speech rate (0.5 to 2.0, where 1.0 is normal)
   * @default 1.0
   */
  rate?: string;

  /**
   * Pitch (-10 to +10, where 0 is normal)
   * @default '0%'
   */
  pitch?: string;

  /**
   * Volume (0 to 100, where 100 is normal)
   * @default '+0%'
   */
  volume?: string;

  /**
   * Output format
   * @default 'audio-24khz-48kbitrate-mono-mp3'
   */
  format?: string;
}

/**
 * TTS generation result
 */
export interface TTSResult {
  audioBuffer: Buffer;
  durationSeconds: number;
  format: string;
}

/**
 * Default TTS options
 */
const DEFAULT_OPTIONS: Required<TTSOptions> = {
  voice: 'en-US-JennyNeural',
  rate: '+0%',
  pitch: '0%',
  volume: '+0%',
  format: 'audio-24khz-48kbitrate-mono-mp3',
};

/**
 * Get list of available Edge TTS voices
 *
 * @returns Array of voice metadata
 */
export async function getAvailableVoices(): Promise<Voice[]> {
  try {
    const voices = await edgeTts.listVoices();

    return voices.map((v: any) => ({
      id: v.Name,
      name: v.FriendlyName,
      locale: v.Locale,
      gender: v.Gender,
      description: v.Description,
    }));
  } catch (error) {
    console.error('Failed to fetch Edge TTS voices:', error);
    throw new Error('Edge TTS service unavailable');
  }
}

/**
 * Generate voiceover from text using Edge TTS
 *
 * @param text - Narration text
 * @param options - TTS generation options
 * @param maxRetries - Maximum retry attempts (default: 2)
 * @returns Audio buffer and metadata
 *
 * @throws Error if generation fails after all retries
 *
 * @example
 * ```typescript
 * const result = await generateVoiceover('Hello world', {
 *   voice: 'en-US-JennyNeural',
 *   rate: '+10%'
 * });
 * console.log(`Generated ${result.durationSeconds}s audio`);
 * ```
 */
export async function generateVoiceover(
  text: string,
  options: TTSOptions = {},
  maxRetries: number = 2
): Promise<TTSResult> {
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for TTS generation');
  }

  if (text.length > 5000) {
    throw new Error('Text too long (max 5000 characters)');
  }

  // Merge with defaults
  const opts: Required<TTSOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TTS] Generating voiceover (attempt ${attempt + 1}/${maxRetries + 1}):`, {
        textLength: text.length,
        voice: opts.voice,
        format: opts.format,
      });

      // Generate audio using edge-tts
      const audioBuffer = await generateWithEdgeTTS(text, opts);

      // Estimate duration (Edge TTS doesn't provide this directly)
      // Average speech rate: ~150 words per minute
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationSeconds = (wordCount / 150) * 60;

      console.log(`[TTS] Success: Generated ${audioBuffer.length} bytes, ~${estimatedDurationSeconds.toFixed(1)}s`);

      return {
        audioBuffer,
        durationSeconds: estimatedDurationSeconds,
        format: opts.format,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[TTS] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on validation errors
      if (error.message.includes('Text is required') || error.message.includes('too long')) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[TTS] Retrying after ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries failed
  throw new Error(
    `TTS generation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Internal: Generate audio with Edge TTS library
 */
async function generateWithEdgeTTS(
  text: string,
  options: Required<TTSOptions>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    // Build Edge TTS communicate object
    const communicate = {
      voice: options.voice,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
    };

    // Create Edge TTS stream
    edgeTts(text, communicate)
      .on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      })
      .on('end', () => {
        // Concatenate all chunks into single buffer
        const audioBuffer = Buffer.concat(chunks);
        resolve(audioBuffer);
      })
      .on('error', (error: Error) => {
        reject(new Error(`Edge TTS stream error: ${error.message}`));
      });
  });
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate voice ID format
 *
 * @param voiceId - Voice ID to validate
 * @returns true if valid
 */
export function isValidVoiceId(voiceId: string): boolean {
  // Edge TTS voice IDs follow pattern: xx-XX-NameNeural
  // e.g., en-US-JennyNeural, en-GB-SoniaNeural
  return /^[a-z]{2}-[A-Z]{2}-[A-Z][a-zA-Z]+Neural$/.test(voiceId);
}

/**
 * Get recommended voices for short-form video content
 *
 * @returns Array of recommended voice IDs
 */
export function getRecommendedVoices(): string[] {
  return [
    'en-US-JennyNeural',       // Female, clear, friendly
    'en-US-GuyNeural',         // Male, conversational
    'en-GB-SoniaNeural',       // Female, British accent
    'en-GB-RyanNeural',        // Male, British accent
    'en-AU-NatashaNeural',     // Female, Australian accent
    'en-IN-NeerjaNeural',      // Female, Indian accent
    'en-IN-PrabhatNeural',     // Male, Indian accent
  ];
}
