/**
 * Google Cloud TTS Service
 *
 * Integrates Google Cloud Text-to-Speech API for voiceover generation with
 * word-level timing support for Karaoke subtitles.
 *
 * Key features:
 * - Word-level timing extraction via timepoints API
 * - Fallback to sentence-level timing when word timings unavailable
 * - Retry logic with exponential backoff (max 3 attempts)
 * - Graceful handling of API quota errors (HTTP 429)
 *
 * Cost Estimate (Standard voices):
 * - $4.00 per 1 million characters
 * - Typical 100-word scene (~500 characters) costs ~$0.002 (0.2 cents)
 * - Well below the 2 cent per render requirement
 *
 * @see https://cloud.google.com/text-to-speech/docs
 */

import textToSpeech from '@google-cloud/text-to-speech';

/**
 * Google Cloud TTS client instance
 */
let ttsClient: textToSpeech.TextToSpeechClient | null = null;

/**
 * Word-level timing entry for Karaoke subtitles
 */
export interface WordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}

/**
 * Sentence-level timing entry (fallback when word-level unavailable)
 */
export interface SentenceTiming {
  sentence: string;
  start_ms: number;
  end_ms: number;
}

/**
 * TTS generation options
 */
export interface GoogleTTSOptions {
  /**
   * Voice ID (e.g., 'en-US-Neural2-A')
   * @default 'en-US-Neural2-A'
   */
  voice?: string;

  /**
   * Language code (e.g., 'en-US', 'en-GB')
   * @default 'en-US'
   */
  languageCode?: string;

  /**
   * Speaking rate (0.25 to 4.0, where 1.0 is normal)
   * @default 1.0
   */
  rate?: number;

  /**
   * Pitch (-20.0 to 20.0, where 0.0 is normal)
   * @default 0.0
   */
  pitch?: number;

  /**
   * Volume gain (-96.0 to 16.0, where 0.0 is normal)
   * @default 0.0
   */
  volumeGainDb?: number;

  /**
   * Output encoding format
   * @default 'MP3'
   */
  encoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';

  /**
   * Enable word-level timepoints
   * @default true
   */
  enableTimepoints?: boolean;

  /**
   * Maximum retry attempts
   * @default 3
   */
  maxRetries?: number;
}

/**
 * TTS generation result
 */
export interface GoogleTTSResult {
  audioBuffer: Buffer;
  durationSeconds: number;
  format: string;
  timings: Array<WordTiming | SentenceTiming>;
  isWordLevel: boolean;
}

/**
 * Timepoint from Google Cloud TTS API response
 */
interface Timepoint {
  timeSeconds: number;
  markName: string;
}

/**
 * Initialize Google Cloud TTS client with credentials from environment
 *
 * @throws Error if GOOGLE_APPLICATION_CREDENTIALS not set
 */
function initializeClient(): textToSpeech.TextToSpeechClient {
  if (ttsClient) {
    return ttsClient;
  }

  // Check for credentials
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable not set. ' +
      'Please provide path to Google Cloud service account JSON key.'
    );
  }

  try {
    ttsClient = new textToSpeech.TextToSpeechClient();
    console.log('[GoogleTTS] Client initialized successfully');
    return ttsClient;
  } catch (error: any) {
    console.error('[GoogleTTS] Failed to initialize client:', error);
    throw new Error(`Google Cloud TTS client initialization failed: ${error.message}`);
  }
}

/**
 * Generate voiceover from text using Google Cloud TTS
 *
 * @param text - Narration text
 * @param options - TTS generation options
 * @returns Audio buffer and metadata
 *
 * @throws Error if generation fails after all retries
 *
 * @example
 * ```typescript
 * const result = await generateVoiceoverWithTimings('Hello world', {
 *   voice: 'en-US-Neural2-A',
 *   languageCode: 'en-US'
 * });
 * console.log(`Generated ${result.durationSeconds}s audio with ${result.timings.length} word timings`);
 * ```
 */
export async function generateVoiceoverWithTimings(
  text: string,
  options: GoogleTTSOptions = {}
): Promise<GoogleTTSResult> {
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for TTS generation');
  }

  if (text.length > 5000) {
    throw new Error('Text too long (max 5000 characters for Google Cloud TTS)');
    // Note: 5000 is the maximum request size limit for Google Cloud TTS synthesizeSpeech API
  }

  // Merge with defaults
  const opts: Required<GoogleTTSOptions> = {
    voice: options.voice || 'en-US-Neural2-A',
    languageCode: options.languageCode || 'en-US',
    rate: options.rate ?? 1.0,
    pitch: options.pitch ?? 0.0,
    volumeGainDb: options.volumeGainDb ?? 0.0,
    encoding: options.encoding || 'MP3',
    enableTimepoints: options.enableTimepoints !== false,
    maxRetries: options.maxRetries ?? 3,
  };

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      console.log(`[GoogleTTS] Generating voiceover (attempt ${attempt + 1}/${opts.maxRetries}):`, {
        textLength: text.length,
        voice: opts.voice,
        languageCode: opts.languageCode,
        enableTimepoints: opts.enableTimepoints,
      });

      const result = await generateWithGoogleTTS(text, opts);

      console.log(`[GoogleTTS] Success: Generated ${result.audioBuffer.length} bytes, ` +
        `~${result.durationSeconds.toFixed(1)}s, ${result.timings.length} timings ` +
        `(${result.isWordLevel ? 'word-level' : 'sentence-level'})`);

      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`[GoogleTTS] Attempt ${attempt + 1} failed:`, error.message);

      // Check for quota error (HTTP 429)
      if (error.message.includes('QUOTA_EXCEEDED') || error.code === 429) {
        console.warn('[GoogleTTS] API quota exceeded. Implementing graceful degradation...');
        throw new Error(
          'Google Cloud TTS quota exceeded. Please try again later or upgrade your quota.'
        );
      }

      // Don't retry on validation errors
      if (error.message.includes('Text is required') || error.message.includes('too long')) {
        throw error;
      }

      // Don't retry on authentication errors
      if (error.message.includes('authentication') || error.message.includes('credentials')) {
        throw error;
      }

      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      if (attempt < opts.maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.log(`[GoogleTTS] Retrying after ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries failed
  throw new Error(
    `Google Cloud TTS generation failed after ${opts.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Internal: Generate audio with Google Cloud TTS API
 */
async function generateWithGoogleTTS(
  text: string,
  options: Required<GoogleTTSOptions>
): Promise<GoogleTTSResult> {
  const client = initializeClient();

  // Build API request
  const request: textToSpeech.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
    input: { text },
    voice: {
      languageCode: options.languageCode,
      name: options.voice,
    },
    audioConfig: {
      audioEncoding: options.encoding,
      speakingRate: options.rate,
      pitch: options.pitch,
      volumeGainDb: options.volumeGainDb,
    },
  };

  // Add timepoints if enabled
  if (options.enableTimepoints) {
    request.timepoints = [{
      'timepoint-type': 'WORDS' as any, // Type: 'WORDS' | 'SSML_MARKS'
    }];
  }

  // Call API
  const [response] = await client.synthesizeSpeech(request);

  if (!response.audioContent) {
    throw new Error('Google Cloud TTS returned empty audio content');
  }

  // Parse timepoints
  const audioBuffer = Buffer.from(response.audioContent);
  const timings = parseTimepoints(response.timepoints || [], text, options.enableTimepoints);

  // Estimate duration from audio buffer size
  // MP3: ~128 kbps = 16 KB/s
  const estimatedDurationSeconds = estimateDuration(audioBuffer, options.encoding);

  return {
    audioBuffer,
    durationSeconds: estimatedDurationSeconds,
    format: options.encoding,
    timings,
    isWordLevel: timings.length > 0 && 'word' in timings[0],
  };
}

/**
 * Parse timepoints from API response into word/sentence timings
 *
 * @param timepoints - Array of timepoints from API response
 * @param text - Original narration text
 * @param enableTimepoints - Whether word-level timing was requested
 * @returns Array of word or sentence timings
 */
function parseTimepoints(
  timepoints: Timepoint[],
  text: string,
  enableTimepoints: boolean
): Array<WordTiming | SentenceTiming> {
  // If no timepoints returned, use sentence-level fallback
  if (!timepoints || timepoints.length === 0) {
    console.warn('[GoogleTTS] No timepoints returned, using sentence-level fallback');
    return createSentenceLevelFallback(text);
  }

  // Parse word-level timings
  const words = text.split(/\s+/);
  const wordTimings: WordTiming[] = [];

  for (let i = 0; i < timepoints.length; i++) {
    const timepoint = timepoints[i];
    const word = words[i] || '';

    const startMs = Math.round(timepoint.timeSeconds * 1000);
    const endMs = i < timepoints.length - 1
      ? Math.round(timepoints[i + 1].timeSeconds * 1000)
      : startMs + 200; // Default 200ms duration for last word

    wordTimings.push({
      word,
      start_ms: startMs,
      end_ms: endMs,
    });
  }

  // If parsing failed or returned empty, fallback to sentence-level
  if (wordTimings.length === 0) {
    console.warn('[GoogleTTS] Word timing parsing failed, using sentence-level fallback');
    return createSentenceLevelFallback(text);
  }

  return wordTimings;
}

/**
 * Create sentence-level fallback timing
 *
 * @param text - Narration text
 * @returns Array with single sentence timing entry
 */
function createSentenceLevelFallback(text: string): Array<SentenceTiming> {
  // Estimate duration based on word count (150 words/minute average)
  const wordCount = text.split(/\s+/).length;
  const estimatedDurationMs = Math.round((wordCount / 150) * 60 * 1000);

  return [{
    sentence: text,
    start_ms: 0,
    end_ms: estimatedDurationMs,
  }];
}

/**
 * Estimate audio duration from buffer size
 *
 * @param buffer - Audio buffer
 * @param encoding - Audio encoding format
 * @returns Estimated duration in seconds
 */
function estimateDuration(buffer: Buffer, encoding: string): number {
  const bitrateMap: Record<string, number> = {
    'MP3': 128000,      // 128 kbps
    'LINEAR16': 256000, // 16-bit, 16kHz mono
    'OGG_OPUS': 64000,  // 64 kbps
  };

  const bitrate = bitrateMap[encoding] || 128000;
  const durationSeconds = (buffer.length * 8) / bitrate;

  return durationSeconds;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get list of available Google Cloud TTS voices
 *
 * @returns Array of voice metadata
 */
export async function getAvailableVoices(): Promise<textToSpeech.protos.google.cloud.texttospeech.v1.IVoice[]> {
  try {
    const client = initializeClient();
    const [response] = await client.listVoices({});

    return response.voices || [];
  } catch (error: any) {
    console.error('[GoogleTTS] Failed to fetch voices:', error);
    throw new Error(`Failed to fetch Google Cloud TTS voices: ${error.message}`);
  }
}

/**
 * Get recommended voices for short-form video content
 *
 * @returns Array of recommended voice IDs
 */
export function getRecommendedVoices(): string[] {
  return [
    'en-US-Neural2-A',      // Female, clear, friendly
    'en-US-Neural2-C',      // Male, conversational
    'en-GB-Neural2-B',      // Female, British accent
    'en-GB-Neural2-A',      // Male, British accent
    'en-AU-Neural2-B',      // Female, Australian accent
    'en-IN-Neural2-B',      // Female, Indian accent
    'en-IN-Neural2-A',      // Male, Indian accent
  ];
}

/**
 * Validate voice ID format
 *
 * @param voiceId - Voice ID to validate
 * @returns true if valid
 */
export function isValidVoiceId(voiceId: string): boolean {
  // Google Cloud TTS voice IDs follow pattern: xx-XX-Type-X
  // e.g., en-US-Neural2-A, en-GB-Wavenet-B, en-IN-Standard-A
  return /^[a-z]{2}-[A-Z]{2}-[A-Z][a-zA-Z]+[0-9]-[A-Z]$/.test(voiceId) ||
         /^[a-z]{2}-[A-Z]{2}-[A-Z][a-z]+-[A-Z]$/.test(voiceId); // For "Standard" voices
}

/**
 * Store subtitle timings in database for a scene
 *
 * @param supabase - Supabase client
 * @param sceneId - Scene ID
 * @param timings - Array of word/sentence timings
 */
export async function storeSubtitleTimings(
  supabase: any,
  sceneId: string,
  timings: Array<WordTiming | SentenceTiming>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('scenes')
      .update({ subtitle_timing: timings as any })
      .eq('id', sceneId);

    if (error) {
      throw error;
    }

    console.log(`[GoogleTTS] Stored ${timings.length} timings for scene ${sceneId}`);
  } catch (error: any) {
    console.error('[GoogleTTS] Failed to store subtitle timings:', error);
    throw new Error(`Failed to store subtitle timings: ${error.message}`);
  }
}
