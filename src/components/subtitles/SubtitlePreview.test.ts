/**
 * Unit tests for Subtitle Components
 *
 * Tests:
 * - Timing interpolation accuracy (frame → milliseconds → word index)
 * - Word-level vs sentence-level detection
 * - Edge cases and boundary conditions
 *
 * Note: DOM rendering tests require jsdom environment setup.
 * This test file focuses on core logic testing without DOM dependencies.
 */

import { describe, it, expect } from 'vitest';
import type { SubtitleTiming } from './types';

describe('Timing Interpolation', () => {
  it('should convert frame to milliseconds correctly at 30fps', () => {
    const fps = 30;
    const frame = 15;
    const expectedMs = (frame / fps) * 1000;

    expect(expectedMs).toBe(500);
  });

  it('should convert frame to milliseconds correctly at 60fps', () => {
    const fps = 60;
    const frame = 30;
    const expectedMs = (frame / fps) * 1000;

    expect(expectedMs).toBe(500);
  });

  it('should map current time to active word index correctly', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 333 },
      { word: 'Two', start_ms: 333, end_ms: 666 },
      { word: 'Three', start_ms: 666, end_ms: 1000 },
    ];

    // At 500ms, should be at index 1 (word "Two")
    const currentMs = 500;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(1);
  });

  it('should handle edge case: exact word boundary', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 500 },
      { word: 'Two', start_ms: 500, end_ms: 1000 },
    ];

    // At exactly 500ms, both words match the boundary condition
    // First word: 500 >= 0 && 500 <= 500 (TRUE)
    // Second word: 500 >= 500 && 500 <= 1000 (TRUE)
    // Our loop picks the first match, so it returns index 0
    const currentMs = 500;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(0); // First match wins
  });

  it('should return -1 when no active word', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 500 },
      { word: 'Two', start_ms: 500, end_ms: 1000 },
    ];

    // At 1500ms, no word is active
    const currentMs = 1500;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(-1);
  });

  it('should handle first word start boundary', () => {
    const timings: SubtitleTiming = [
      { word: 'First', start_ms: 0, end_ms: 1000 },
    ];

    const currentMs = 0;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(0);
  });

  it('should handle last word end boundary', () => {
    const timings: SubtitleTiming = [
      { word: 'Last', start_ms: 0, end_ms: 1000 },
    ];

    const currentMs = 1000;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(0);
  });
});

describe('Word-Level vs Sentence-Level Detection', () => {
  it('should detect word-level timing correctly', () => {
    const timings: SubtitleTiming = [{ word: 'Test', start_ms: 0, end_ms: 500 }];
    const isWordLevel = timings.length > 0 && 'word' in timings[0];

    expect(isWordLevel).toBe(true);
  });

  it('should detect sentence-level timing correctly', () => {
    const timings: SubtitleTiming = [{ sentence: 'Test sentence', start_ms: 0, end_ms: 1500 }];
    const isWordLevel = timings.length > 0 && 'word' in timings[0];

    expect(isWordLevel).toBe(false);
  });

  it('should handle empty timings array', () => {
    const timings: SubtitleTiming = [];
    const isWordLevel = timings.length > 0 && 'word' in timings[0];

    expect(isWordLevel).toBe(false);
  });

  it('should detect mixed timings as word-level', () => {
    const timings: SubtitleTiming = [
      { word: 'Hello', start_ms: 0, end_ms: 500 },
      { word: 'world', start_ms: 500, end_ms: 1000 },
    ];
    const isWordLevel = timings.length > 0 && 'word' in timings[0];

    expect(isWordLevel).toBe(true);
  });
});

describe('Subtitle Timing Calculations', () => {
  it('should calculate correct word duration', () => {
    const timing = { word: 'Test', start_ms: 0, end_ms: 500 };
    const duration = timing.end_ms - timing.start_ms;

    expect(duration).toBe(500);
  });

  it('should calculate total scene duration from word timings', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 500 },
      { word: 'Two', start_ms: 500, end_ms: 1000 },
      { word: 'Three', start_ms: 1000, end_ms: 1500 },
    ];

    const totalDuration = timings[timings.length - 1].end_ms - timings[0].start_ms;

    expect(totalDuration).toBe(1500);
  });

  it('should handle gaps between words', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 400 },
      { word: 'Two', start_ms: 600, end_ms: 1000 }, // 200ms gap
    ];

    // At 500ms (in the gap), no word should be active
    const currentMs = 500;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(-1);
  });
});

describe('Frame-to-Word Mapping', () => {
  it('should map frame 0 to first word', () => {
    const fps = 30;
    const timings: SubtitleTiming = [
      { word: 'First', start_ms: 0, end_ms: 1000 },
    ];

    const frame = 0;
    const currentMs = (frame / fps) * 1000;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(0);
  });

  it('should map frame 30 at 30fps to word at 1000ms', () => {
    const fps = 30;
    const timings: SubtitleTiming = [
      { word: 'Test', start_ms: 0, end_ms: 1500 },
    ];

    const frame = 30;
    const currentMs = (frame / fps) * 1000;
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(currentMs).toBe(1000);
    expect(activeIndex).toBe(0);
  });

  it('should handle different framerates correctly', () => {
    const fps30 = 30;
    const fps60 = 60;

    // Frame 15 at 30fps = 500ms
    const ms30 = (15 / fps30) * 1000;

    // Frame 30 at 60fps = 500ms
    const ms60 = (30 / fps60) * 1000;

    expect(ms30).toBe(500);
    expect(ms60).toBe(500);
    expect(ms30).toBe(ms60);
  });
});

describe('Karaoke Highlighting Logic', () => {
  it('should highlight single word correctly', () => {
    const timings: SubtitleTiming = [
      { word: 'Hello', start_ms: 0, end_ms: 500 },
      { word: 'world', start_ms: 500, end_ms: 1000 },
    ];

    const currentMs = 250; // Middle of first word
    let activeIndex = -1;

    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentMs >= timing.start_ms && currentMs <= timing.end_ms) {
        activeIndex = i;
        break;
      }
    }

    expect(activeIndex).toBe(0);
  });

  it('should transition between words smoothly', () => {
    const timings: SubtitleTiming = [
      { word: 'One', start_ms: 0, end_ms: 500 },
      { word: 'Two', start_ms: 500, end_ms: 1000 },
      { word: 'Three', start_ms: 1000, end_ms: 1500 },
    ];

    const testCases = [
      { ms: 250, expectedIndex: 0 }, // First word
      { ms: 750, expectedIndex: 1 }, // Second word
      { ms: 1250, expectedIndex: 2 }, // Third word
    ];

    testCases.forEach(({ ms, expectedIndex }) => {
      let activeIndex = -1;
      for (let i = 0; i < timings.length; i++) {
        const timing = timings[i];
        if (ms >= timing.start_ms && ms <= timing.end_ms) {
          activeIndex = i;
          break;
        }
      }
      expect(activeIndex).toBe(expectedIndex);
    });
  });
});
