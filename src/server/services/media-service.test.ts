/**
 * Unit tests for Media Service
 *
 * Tests:
 * - Video search with valid keywords
 * - Rate limiting logic
 * - Caching (in-memory Map)
 * - Retry logic with exponential backoff
 * - Error handling (429, 404, 500)
 * - Keyword extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import {
  searchVideos,
  searchVideosWithRetry,
  extractKeywordsFromNarration,
  clearExpiredCache,
  getCacheStats,
  type SearchParams,
  type MediaOption
} from './media-service';

describe('Media Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearExpiredCache();

    // Set required env var
    process.env.PEXELS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Clean up nock
    nock.cleanAll();
  });

  describe('searchVideos', () => {
    it('should return media options for valid keywords', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'https://player.vimeo.com/external/12345.mp4',
            image: 'https://example.com/thumb1.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          },
          {
            id: 67890,
            url: 'https://player.vimeo.com/external/67890.mp4',
            image: 'https://example.com/thumb2.jpg',
            duration: 8,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 1500,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'grilling steak',
        maxResults: 5
      };

      const result = await searchVideos(params);

      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toEqual({
        pexelsVideoId: 12345,
        videoUrl: 'https://player.vimeo.com/external/12345.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        durationSec: 5,
        width: 1080,
        height: 1920,
        aspectRatio: '9:16'
      });
      expect(result.totalResults).toBe(1500);
      expect(result.cached).toBe(false);
    });

    it('should filter videos by minimum duration', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 1,
            url: 'video1.mp4',
            image: 'thumb1.jpg',
            duration: 1, // Too short
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          },
          {
            id: 2,
            url: 'video2.mp4',
            image: 'thumb2.jpg',
            duration: 5, // Should pass
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 2,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5,
        minDuration: 3
      };

      const result = await searchVideos(params);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].pexelsVideoId).toBe(2);
    });

    it('should filter videos by minimum resolution', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 1,
            url: 'video1.mp4',
            image: 'thumb1.jpg',
            duration: 5,
            width: 480, // Too low
            height: 854,
            aspect_ratio: '9:16'
          },
          {
            id: 2,
            url: 'video2.mp4',
            image: 'thumb2.jpg',
            duration: 5,
            width: 1080, // Should pass
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 2,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5,
        minResolution: 720
      };

      const result = await searchVideos(params);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].pexelsVideoId).toBe(2);
    });

    it('should return cached result for same search parameters', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'video.mp4',
            image: 'thumb.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 100,
        page: 1,
        per_page: 10
      };

      const mock = nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      // First call should hit API
      const result1 = await searchVideos(params);
      expect(result1.cached).toBe(false);
      expect(mock.isDone()).toBe(true);

      // Second call should use cache
      const result2 = await searchVideos(params);
      expect(result2.cached).toBe(true);
      expect(result2.options).toEqual(result1.options);
    });

    it('should throw error when rate limit exceeded (429)', async () => {
      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(429, { error: 'Rate limit exceeded' });

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideos(params)).rejects.toThrow('rate limit');
    });

    it('should throw error for API errors (500)', async () => {
      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(500, { error: 'Internal server error' });

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideos(params)).rejects.toThrow('Media search failed');
    });

    it('should return empty array when no results found', async () => {
      const mockPexelsResponse = {
        videos: [],
        total_results: 0,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'xyznonexistent',
        maxResults: 5
      };

      const result = await searchVideos(params);

      expect(result.options).toHaveLength(0);
      expect(result.totalResults).toBe(0);
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.PEXELS_API_KEY;

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideos(params)).rejects.toThrow('PEXELS_API_KEY');

      // Restore for other tests
      process.env.PEXELS_API_KEY = 'test-api-key';
    });
  });

  describe('searchVideosWithRetry', () => {
    it('should return result on first successful attempt', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'video.mp4',
            image: 'thumb.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 100,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      const result = await searchVideosWithRetry(params);

      expect(result.options).toHaveLength(1);
    });

    it('should retry 3 times with exponential backoff', async () => {
      // Fail twice with 500, then succeed
      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(500, { error: 'Internal server error' })
        .get(/videos\/search/)
        .reply(500, { error: 'Internal server error' })
        .get(/videos\/search/)
        .reply(200, {
          videos: [
            {
              id: 12345,
              url: 'video.mp4',
              image: 'thumb.jpg',
              duration: 5,
              width: 1080,
              height: 1920,
              aspect_ratio: '9:16'
            }
          ],
          total_results: 100,
          page: 1,
          per_page: 10
        });

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      const startTime = Date.now();
      const result = await searchVideosWithRetry(params, 3);
      const endTime = Date.now();

      expect(result.options).toHaveLength(1);
      // Should have delayed with exponential backoff: 1s + 2s = ~3s minimum
      expect(endTime - startTime).toBeGreaterThanOrEqual(2900);
    });

    it('should throw error after max retries exhausted', async () => {
      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .times(3)
        .reply(500, { error: 'Internal server error' });

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideosWithRetry(params, 3)).rejects.toThrow('Media search failed after retries');
    });

    it('should not retry on rate limit errors (429)', async () => {
      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(429, { error: 'Rate limit exceeded' });

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideosWithRetry(params)).rejects.toThrow('rate limit');
    });

    it('should not retry on missing API key', async () => {
      delete process.env.PEXELS_API_KEY;

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await expect(searchVideosWithRetry(params)).rejects.toThrow('PEXELS_API_KEY');

      // Restore for other tests
      process.env.PEXELS_API_KEY = 'test-api-key';
    });
  });

  describe('extractKeywordsFromNarration', () => {
    it('should extract capitalized words from narration', async () => {
      const narration = 'The Grilling Steak scene shows a delicious meal being prepared on a barbecue grill';
      const keywords = await extractKeywordsFromNarration(narration);

      expect(keywords).toContain('grilling');
      expect(keywords).toContain('barbecue');
    });

    it('should return top 2-3 keywords', async () => {
      const narration = 'The Beach Sunset Ocean Waves crash against the shore in California';
      const keywords = await extractKeywordsFromNarration(narration);

      expect(keywords.length).toBeLessThanOrEqual(3);
      expect(keywords.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle short narrations gracefully', async () => {
      const narration = 'Short text';
      const keywords = await extractKeywordsFromNarration(narration);

      expect(Array.isArray(keywords)).toBe(true);
    });

    it('should filter out short words', async () => {
      const narration = 'The A An In At On Beach Sunset';
      const keywords = await extractKeywordsFromNarration(narration);

      // Should filter out words <= 3 characters
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('an');
    });
  });

  describe('cache management', () => {
    it('should track cache statistics', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'video.mp4',
            image: 'thumb.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 100,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await searchVideos(params);
      const stats = getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.rateLimitWindow).toBe(3600000); // 1 hour
      expect(stats.maxRequestsPerWindow).toBe(200);
    });

    it('should clear expired cache entries', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'video.mp4',
            image: 'thumb.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 100,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      await searchVideos(params);

      let stats = getCacheStats();
      expect(stats.size).toBe(1);

      // Clear expired (none should be expired yet)
      clearExpiredCache();

      stats = getCacheStats();
      expect(stats.size).toBe(1); // Still 1 since not expired
    });
  });

  describe('rate limiting', () => {
    it('should enforce minimum request interval', async () => {
      const mockPexelsResponse = {
        videos: [
          {
            id: 12345,
            url: 'video.mp4',
            image: 'thumb.jpg',
            duration: 5,
            width: 1080,
            height: 1920,
            aspect_ratio: '9:16'
          }
        ],
        total_results: 100,
        page: 1,
        per_page: 10
      };

      nock('https://api.pexels.com')
        .get(/videos\/search/)
        .times(2)
        .reply(200, mockPexelsResponse);

      const params: SearchParams = {
        keywords: 'test',
        maxResults: 5
      };

      // First request should succeed
      await searchVideos(params);

      // Second immediate request should fail rate limit
      await expect(searchVideos(params)).rejects.toThrow('Rate limit exceeded');
    });
  });
});
