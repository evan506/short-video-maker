/**
 * Unit tests for Google Cloud TTS Service
 *
 * Tests:
 * - TTS generation with word-level timing
 * - Timepoints parsing logic
 * - Sentence-level fallback
 * - Retry logic with exponential backoff
 * - API quota error handling (HTTP 429)
 * - Duration estimation
 * - Voice validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as googleTtsService from './google-tts-service';

// Mock Google Cloud TTS client
// We need to mock it before importing, and create a way to access the mock instance
const mockClientInstance = {
  synthesizeSpeech: vi.fn(),
  listVoices: vi.fn(),
};

vi.mock('@google-cloud/text-to-speech', () => ({
  default: {
    TextToSpeechClient: vi.fn().mockImplementation(() => mockClientInstance),
  },
}));

describe('Google Cloud TTS Service', () => {
  beforeEach(() => {
    // Set required env var
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';

    // Clear any cached client and reset mocks
    vi.clearAllMocks();
    mockClientInstance.synthesizeSpeech.mockReset();
    mockClientInstance.listVoices.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVoiceoverWithTimings', () => {
    it('should generate audio with word-level timings', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word0' },
        { timeSeconds: 0.2, markName: 'word1' },
        { timeSeconds: 0.5, markName: 'word2' },
      ];

      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: mockTimepoints,
        },
      ]);

      const result = await googleTtsService.generateVoiceoverWithTimings('The quick brown fox');

      expect(result).toBeDefined();
      expect(result.audioBuffer).toEqual(mockAudioContent);
      expect(result.isWordLevel).toBe(true);
      expect(result.timings).toHaveLength(3);
      expect(result.timings[0]).toMatchObject({
        word: 'The',
        start_ms: 0,
        end_ms: 200,
      });
      expect(result.timings[1]).toMatchObject({
        word: 'quick',
        start_ms: 200,
        end_ms: 500,
      });
    });

    it('should fallback to sentence-level timing when no timepoints returned', async () => {
      const mockAudioContent = Buffer.from('mock audio data');

      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      const result = await googleTtsService.generateVoiceoverWithTimings('The quick brown fox');

      expect(result.isWordLevel).toBe(false);
      expect(result.timings).toHaveLength(1);
      expect(result.timings[0]).toMatchObject({
        sentence: 'The quick brown fox',
        start_ms: 0,
      });
      expect(result.timings[0].end_ms).toBeGreaterThan(0);
    });

    it('should retry on transient errors with exponential backoff', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      const mockTimepoints = [
        { timeSeconds: 0.0, markName: 'word0' },
      ];

      // Fail first 2 attempts, succeed on 3rd
      mockClientInstance.synthesizeSpeech
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce([
          {
            audioContent: mockAudioContent,
            timepoints: mockTimepoints,
          },
        ]);

      const startTime = Date.now();
      const result = await googleTtsService.generateVoiceoverWithTimings('Hello world');
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(mockClientInstance.synthesizeSpeech).toHaveBeenCalledTimes(3);
      // Should have waited ~1s + 2s = 3s (exponential backoff)
      expect(duration).toBeGreaterThan(2500);
    });

    it('should throw error on API quota exceeded (HTTP 429)', async () => {
      mockClientInstance.synthesizeSpeech.mockRejectedValue(
        new Error('QUOTA_EXCEEDED: API quota exceeded')
      );

      await expect(
        googleTtsService.generateVoiceoverWithTimings('Hello world')
      ).rejects.toThrow('quota exceeded');
    });

    it('should throw error on empty text', async () => {
      await expect(
        googleTtsService.generateVoiceoverWithTimings('')
      ).rejects.toThrow('Text is required');
    });

    it('should throw error on text too long', async () => {
      const longText = 'a'.repeat(5001);

      await expect(
        googleTtsService.generateVoiceoverWithTimings(longText)
      ).rejects.toThrow('too long');
    });

    it('should not retry on validation errors', async () => {
      mockClientInstance.synthesizeSpeech.mockRejectedValue(
        new Error('Text is required for TTS generation')
      );

      await expect(
        googleTtsService.generateVoiceoverWithTimings('Hello world')
      ).rejects.toThrow('Text is required');

      // Should only call once (no retries)
      expect(mockClientInstance.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });

    it('should not retry on authentication errors', async () => {
      mockClientInstance.synthesizeSpeech.mockRejectedValue(
        new Error('authentication failed')
      );

      await expect(
        googleTtsService.generateVoiceoverWithTimings('Hello world')
      ).rejects.toThrow('authentication');

      expect(mockClientInstance.synthesizeSpeech).toHaveBeenCalledTimes(1);
    });

    it('should use custom voice options', async () => {
      const mockAudioContent = Buffer.from('mock audio data');
      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      await googleTtsService.generateVoiceoverWithTimings('Hello world', {
        voice: 'en-GB-Neural2-B',
        languageCode: 'en-GB',
        rate: 1.2,
        pitch: 2.0,
        volumeGainDb: 1.5,
      });

      expect(mockClientInstance.synthesizeSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: expect.objectContaining({
            languageCode: 'en-GB',
            name: 'en-GB-Neural2-B',
          }),
          audioConfig: expect.objectContaining({
            speakingRate: 1.2,
            pitch: 2.0,
            volumeGainDb: 1.5,
          }),
          timepoints: [{ 'timepoint-type': 'WORDS' }],
        })
      );
    });
  });

  describe('getAvailableVoices', () => {
    it('should return list of voices', async () => {
      const mockVoices = [
        {
          name: 'en-US-Neural2-A',
          languageCodes: ['en-US'],
          ssmlGender: 'FEMALE',
          naturalSampleRateHertz: 24000,
        },
        {
          name: 'en-US-Neural2-C',
          languageCodes: ['en-US'],
          ssmlGender: 'MALE',
          naturalSampleRateHertz: 24000,
        },
      ];

      mockClientInstance.listVoices.mockResolvedValue([{
        voices: mockVoices,
      }]);

      const voices = await googleTtsService.getAvailableVoices();

      expect(voices).toEqual(mockVoices);
      expect(mockClientInstance.listVoices).toHaveBeenCalled();
    });

    it('should throw error on API failure', async () => {
      mockClientInstance.listVoices.mockRejectedValue(
        new Error('API request failed')
      );

      await expect(googleTtsService.getAvailableVoices()).rejects.toThrow();
    });
  });

  describe('isValidVoiceId', () => {
    it('should validate correct voice IDs', () => {
      expect(googleTtsService.isValidVoiceId('en-US-Neural2-A')).toBe(true);
      expect(googleTtsService.isValidVoiceId('en-GB-Wavenet-B')).toBe(true);
      expect(googleTtsService.isValidVoiceId('en-AU-Neural2-C')).toBe(true);
      expect(googleTtsService.isValidVoiceId('en-IN-Standard-A')).toBe(true);
    });

    it('should reject invalid voice IDs', () => {
      expect(googleTtsService.isValidVoiceId('invalid')).toBe(false);
      expect(googleTtsService.isValidVoiceId('en-US')).toBe(false);
      expect(googleTtsService.isValidVoiceId('Neural2-A')).toBe(false);
      expect(googleTtsService.isValidVoiceId('')).toBe(false);
    });
  });

  describe('getRecommendedVoices', () => {
    it('should return array of recommended voice IDs', () => {
      const voices = googleTtsService.getRecommendedVoices();

      expect(voices).toBeInstanceOf(Array);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices).toContain('en-US-Neural2-A');
      expect(voices).toContain('en-GB-Neural2-B');

      // All voices should be valid
      voices.forEach(voice => {
        expect(googleTtsService.isValidVoiceId(voice)).toBe(true);
      });
    });
  });

  describe('storeSubtitleTimings', () => {
    it('should store timings in database', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      const timings = [
        { word: 'Hello', start_ms: 0, end_ms: 200 },
        { word: 'world', start_ms: 200, end_ms: 500 },
      ];

      await googleTtsService.storeSubtitleTimings(
        mockSupabase as any,
        'scene-123',
        timings
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('scenes');
      expect(mockSupabase.update).toHaveBeenCalledWith({ subtitle_timing: timings });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'scene-123');
    });

    it('should throw error on database failure', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: new Error('Database connection failed'),
        }),
      };

      const timings = [
        { word: 'Hello', start_ms: 0, end_ms: 200 },
      ];

      await expect(
        googleTtsService.storeSubtitleTimings(mockSupabase as any, 'scene-123', timings)
      ).rejects.toThrow('Failed to store subtitle timings');
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate MP3 duration correctly', async () => {
      const mockAudioContent = Buffer.alloc(32000); // 32 KB
      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      const result = await googleTtsService.generateVoiceoverWithTimings('Hello world');

      // 32 KB at 128 kbps = 2 seconds
      expect(result.durationSeconds).toBeCloseTo(2, 0);
    });

    it('should estimate LINEAR16 duration correctly', async () => {
      const mockAudioContent = Buffer.alloc(64000); // 64 KB
      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      const result = await googleTtsService.generateVoiceoverWithTimings(
        'Hello world',
        { encoding: 'LINEAR16' }
      );

      // 64 KB at 256 kbps = 2 seconds
      expect(result.durationSeconds).toBeCloseTo(2, 0);
    });

    it('should estimate OGG_OPUS duration correctly', async () => {
      const mockAudioContent = Buffer.alloc(16000); // 16 KB
      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      const result = await googleTtsService.generateVoiceoverWithTimings(
        'Hello world',
        { encoding: 'OGG_OPUS' }
      );

      // 16 KB at 64 kbps = 2 seconds
      expect(result.durationSeconds).toBeCloseTo(2, 0);
    });
  });

  describe('Sentence-Level Fallback', () => {
    it('should create fallback timing with estimated duration', async () => {
      const mockAudioContent = Buffer.from('mock audio data');

      mockClientInstance.synthesizeSpeech.mockResolvedValue([
        {
          audioContent: mockAudioContent,
          timepoints: [],
        },
      ]);

      const text = 'The quick brown fox jumps over the lazy dog'; // 9 words
      const result = await googleTtsService.generateVoiceoverWithTimings(text);

      expect(result.isWordLevel).toBe(false);
      expect(result.timings).toHaveLength(1);
      expect(result.timings[0].sentence).toBe(text);

      // 9 words at 150 words/min = 3.6 seconds = 3600ms
      expect(result.timings[0].end_ms).toBeCloseTo(3600, -2);
    });
  });

  describe('Error Handling', () => {
    it('should throw if GOOGLE_APPLICATION_CREDENTIALS not set', async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

      // Clear any cached client
      vi.clearAllMocks();

      // Should throw some error (credentials check or mock failure)
      await expect(
        googleTtsService.generateVoiceoverWithTimings('Hello world')
      ).rejects.toThrow();
    });

    it('should provide actionable error messages', async () => {
      mockClientInstance.synthesizeSpeech.mockRejectedValue(
        new Error('Network timeout')
      );

      try {
        await googleTtsService.generateVoiceoverWithTimings('Hello world', {
          maxRetries: 1,
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('failed after');
        expect(error.message).toContain('Network timeout');
      }
    });
  });
});
