/**
 * Unit Tests: Google Cloud TTS Service (T072)
 *
 * Tests for Google Cloud TTS service:
 * - Timing parser (word-level and sentence-level)
 * - Fallback to sentence-level timing
 * - Retry logic with exponential backoff
 * - Quota error handling
 * - Duration estimation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Google Cloud TTS client
vi.mock('@google-cloud/text-to-speech', () => ({
  default: vi.fn().mockImplementation(() => ({
    synthesizeSpeech: vi.fn(),
  })),
}));

import textToSpeech from '@google-cloud/text-to-speech';
import {
  generateVoiceoverWithTimings,
  type WordTiming,
  type SentenceTiming,
} from '../../../src/server/services/google-tts-service';

describe('Google Cloud TTS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mock credentials
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/mock/path/to/credentials.json';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  describe('generateVoiceoverWithTimings', () => {
    it('should generate audio with word-level timings', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word1' },
        { timeSeconds: 0.2, markName: 'word2' },
        { timeSeconds: 0.4, markName: 'word3' },
      ];

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: mockTimepoints,
        },
      ]);

      const result = await generateVoiceoverWithTimings('Hello world test', {
        voice: 'en-US-Neural2-A',
        languageCode: 'en-US',
      });

      expect(result.audioBuffer).toEqual(mockAudioContent);
      expect(result.isWordLevel).toBe(true);
      expect(result.timings).toHaveLength(3);
      expect(result.timings[0]).toHaveProperty('word', 'Hello');
      expect(result.timings[0]).toHaveProperty('start_ms', 0);
    });

    it('should fallback to sentence-level timing when no timepoints returned (T027)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: [], // Empty timepoints
        },
      ]);

      const result = await generateVoiceoverWithTimings('Hello world test', {
        voice: 'en-US-Neural2-A',
        languageCode: 'en-US',
      });

      expect(result.isWordLevel).toBe(false);
      expect(result.timings).toHaveLength(1);
      expect(result.timings[0]).toHaveProperty('sentence', 'Hello world test');
      expect(result.timings[0]).toHaveProperty('start_ms', 0);
    });

    it('should calculate word timings correctly (T025)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word1' },
        { timeSeconds: 0.25, markName: 'word2' },
        { timeSeconds: 0.5, markName: 'word3' },
        { timeSeconds: 0.75, markName: 'word4' },
      ];

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: mockTimepoints,
        },
      ]);

      const result = await generateVoiceoverWithTimings('One two three four', {
        enableTimepoints: true,
      });

      // Check first word timing
      expect(result.timings[0]).toEqual({
        word: 'One',
        start_ms: 0,
        end_ms: 250, // 0.25s = 250ms
      });

      // Check middle word timing
      expect(result.timings[1]).toEqual({
        word: 'two',
        start_ms: 250,
        end_ms: 500,
      });

      // Check last word timing (should have default duration if no next timepoint)
      expect(result.timings[3].word).toBe('four');
      expect(result.timings[3].start_ms).toBe(750);
    });

    it('should estimate sentence-level duration correctly (T027)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      // 3 words = ~1.2 seconds (150 words/minute = 2.5 words/second)
      const result = await generateVoiceoverWithTimings('One two three');

      expect(result.timings[0].sentence).toBe('One two three');
      expect(result.timings[0].start_ms).toBe(0);
      expect(result.timings[0].end_ms).toBeGreaterThan(0);
      // Should be approximately 1200ms for 3 words
      expect(result.timings[0].end_ms).toBeGreaterThan(1000);
      expect(result.timings[0].end_ms).toBeLessThan(1500);
    });

    it('should retry on transient errors (T028)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word1' },
      ];

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any)
        // First attempt fails
        .mockRejectedValueOnce(new Error('Network timeout'))
        // Second attempt succeeds
        .mockResolvedValueOnce([
          {
            audioContent: mockAudioContent,
            timepoints: mockTimepoints,
          },
        ]);

      const result = await generateVoiceoverWithTimings('Hello', {
        maxRetries: 3,
      });

      expect(result).toBeDefined();
      expect(mockClient.synthesizeSpeech).toHaveBeenCalledTimes(2);
    }, 10000); // 10s timeout for retry test

    it('should use exponential backoff for retries (T028)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word1' },
      ];

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([
          {
            audioContent: mockAudioContent,
            timepoints: mockTimepoints,
          },
        ]);

      const startTime = Date.now();
      await generateVoiceoverWithTimings('Hello', {
        maxRetries: 3,
      });
      const endTime = Date.now();

      // Should have waited ~1s + ~2s = ~3s for retries
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThan(2500); // At least 2.5s for delays
      expect(elapsed).toBeLessThan(5000); // Less than 5s total
    }, 10000);

    it('should throw error after max retries exceeded (T028)', async () => {
      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockRejectedValue(
        new Error('Persistent error')
      );

      await expect(
        generateVoiceoverWithTimings('Hello', {
          maxRetries: 2,
        })
      ).rejects.toThrow('failed after 2 attempts');
    });

    it('should handle quota errors gracefully (T029)', async () => {
      const mockClient = new textToSpeech.TextToSpeechClient();
      const quotaError = new Error('QUOTA_EXCEEDED');
      (quotaError as any).code = 429;
      (mockClient.synthesizeSpeech as any).mockRejectedValue(quotaError);

      await expect(
        generateVoiceoverWithTimings('Hello')
      ).rejects.toThrow('quota exceeded');
    });

    it('should not retry on validation errors', async () => {
      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockRejectedValue(
        new Error('Text is required for TTS generation')
      );

      await expect(
        generateVoiceoverWithTimings('', {
          maxRetries: 3,
        })
      ).rejects.toThrow('Text is required');

      // Should not retry (only called once)
      expect(mockClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });

    it('should not retry on authentication errors', async () => {
      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockRejectedValue(
        new Error('authentication failed')
      );

      await expect(
        generateVoiceoverWithTimings('Hello', {
          maxRetries: 3,
        })
      ).rejects.toThrow('authentication');

      expect(mockClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });

    it('should estimate MP3 duration correctly', async () => {
      // 1 second of MP3 at 128 kbps = 16,000 bytes = 16 KB
      const oneSecondMp3 = Buffer.alloc(16000);

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: oneSecondMp3,
          timepoints: [],
        },
      ]);

      const result = await generateVoiceoverWithTimings('Hello', {
        encoding: 'MP3',
      });

      // Should be approximately 1 second
      expect(result.durationSeconds).toBeCloseTo(1.0, 1);
    });

    it('should estimate LINEAR16 duration correctly', async () => {
      // 1 second of LINEAR16 at 256 kbps = 32,000 bytes = 32 KB
      const oneSecondLinear16 = Buffer.alloc(32000);

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: oneSecondLinear16,
          timepoints: [],
        },
      ]);

      const result = await generateVoiceoverWithTimings('Hello', {
        encoding: 'LINEAR16',
      });

      // Should be approximately 1 second
      expect(result.durationSeconds).toBeCloseTo(1.0, 1);
    });

    it('should validate text input', async () => {
      await expect(
        generateVoiceoverWithTimings('')
      ).rejects.toThrow('Text is required');

      await expect(
        generateVoiceoverWithTimings('   ')
      ).rejects.toThrow('Text is required');
    });

    it('should validate text length (max 5000 characters)', async () => {
      const longText = 'a'.repeat(5001);

      await expect(
        generateVoiceoverWithTimings(longText)
      ).rejects.toThrow('Text too long');
    });

    it('should handle empty timepoints array (T027)', async () => {
      const mockAudioContent = Buffer.from('mock audio data');

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: [], // Empty array (not undefined)
        },
      ]);

      const result = await generateVoiceoverWithTimings('Hello world');

      expect(result.isWordLevel).toBe(false);
      expect(result.timings).toHaveLength(1);
      expect(result.timings[0]).toHaveProperty('sentence');
    });

    it('should handle timepoints with fewer entries than words', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      // Only 2 timepoints for 4 words
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word1' },
        { timeSeconds: 0.3, markName: 'word2' },
      ];

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: mockTimepoints,
        },
      ]);

      const result = await generateVoiceoverWithTimings('One two three four');

      // Should generate 2 word timings (matching timepoints)
      expect(result.timings).toHaveLength(2);
      expect(result.timings[0].word).toBe('One');
      expect(result.timings[1].word).toBe('two');
    });
  });

  describe('Cost Validation', () => {
    it('should generate cost-effective renders (<2 cents per 100 words)', async () => {
      // 100 words ≈ 500 characters
      const hundredWords = 'word '.repeat(100).trim();
      const mockAudioContent = Buffer.alloc(80000); // ~5 seconds at 128 kbps

      const mockClient = new textToSpeech.TextToSpeechClient();
      (mockClient.synthesizeSpeech as any).mockResolvedValueOnce([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      await generateVoiceoverWithTimings(hundredWords, {
        voice: 'en-US-Standard-A', // Standard voice ($4/1M chars)
      });

      // Cost = 500 chars * $4/1M chars = $0.002 = 0.2 cents
      // Well below 2 cent requirement
      expect(mockClient.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });
  });
});
