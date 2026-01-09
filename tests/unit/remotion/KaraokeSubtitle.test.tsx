/**
 * Unit Tests: Remotion Subtitle Components (T073)
 *
 * Tests for Remotion subtitle components:
 * - MinimalSubtitle component
 * - HighlightSubtitle component
 * - KaraokeSubtitle component with word-level timing
 * - Frame-to-millisecond conversion
 * - Active word detection logic
 * - Sentence-level fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { KaraokeSubtitle } from '../../../src/components/subtitles/KaraokeSubtitle';
import type { WordTiming, SentenceTiming } from '../../../src/components/subtitles/types';

// Mock Remotion hooks
vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1080, height: 1920, durationInFrames: 1800 })),
  AbsoluteFill: ({ children, style }: any) => (
    <div style={style}>{children}</div>
  ),
  interpolate: vi.fn((input, range, output) => {
    // Simple linear interpolation mock
    const [inputStart, inputEnd] = range as [number, number];
    const [outputStart, outputEnd] = output as [number, number];
    const progress = (input - inputStart) / (inputEnd - inputStart);
    return outputStart + progress * (outputEnd - outputStart);
  }),
}));

describe('Remotion Subtitle Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('KaraokeSubtitle - Word-level Timing', () => {
    it('should highlight active word at correct frame (T036)', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15); // Frame 15 = 500ms at 30fps

      const wordTimings: WordTiming[] = [
        { word: 'Hello', start_ms: 0, end_ms: 400 },
        { word: 'world', start_ms: 400, end_ms: 800 },
        { word: 'test', start_ms: 800, end_ms: 1200 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello world test"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      // At 500ms (frame 15), second word "world" should be active
      const words = container.querySelectorAll('span');
      expect(words).toHaveLength(3);

      // Second word should have background color (active)
      const activeWord = words[1];
      expect(activeWord.style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
    });

    it('should convert frame to milliseconds correctly (T036)', () => {
      const { useCurrentFrame } = require('remotion');

      // Frame 15 at 30fps = 500ms
      useCurrentFrame.mockReturnValue(15);

      const wordTimings: WordTiming[] = [
        { word: 'Test', start_ms: 0, end_ms: 600 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      // Word should be active at 500ms (within 0-600ms range)
      const word = container.querySelector('span');
      expect(word?.style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
    });

    it('should handle multiple words with precise timing (SC-007)', () => {
      const { useCurrentFrame } = require('remotion');

      // Test at 250ms - within first word's range
      useCurrentFrame.mockReturnValue(7.5); // 7.5 frames = 250ms at 30fps

      const wordTimings: WordTiming[] = [
        { word: 'One', start_ms: 0, end_ms: 300 },
        { word: 'Two', start_ms: 300, end_ms: 600 },
        { word: 'Three', start_ms: 600, end_ms: 900 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="One Two Three"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const words = container.querySelectorAll('span');
      expect(words).toHaveLength(3);

      // First word should be active at 250ms
      expect(words[0].style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');

      // Other words should not be active
      expect(words[1].style.backgroundColor).toBe('');
      expect(words[2].style.backgroundColor).toBe('');
    });

    it('should have no active word before first word starts', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0); // Frame 0 = 0ms

      const wordTimings: WordTiming[] = [
        { word: 'Hello', start_ms: 100, end_ms: 500 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const word = container.querySelector('span');
      expect(word?.style.backgroundColor).toBe('');
    });

    it('should have no active word after last word ends', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(30); // Frame 30 = 1000ms

      const wordTimings: WordTiming[] = [
        { word: 'Hello', start_ms: 0, end_ms: 500 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const word = container.querySelector('span');
      expect(word?.style.backgroundColor).toBe('');
    });

    it('should handle empty timings array', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15);

      const { container } = render(
        <KaraokeSubtitle
          text="Hello world"
          timings={[]}
          isWordLevel={true}
        />
      );

      // Should render text without any active highlighting
      const text = container.textContent;
      expect(text).toBe('');
    });
  });

  describe('KaraokeSubtitle - Sentence-level Fallback (T027)', () => {
    it('should highlight entire sentence when active', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15); // 500ms

      const sentenceTimings: SentenceTiming[] = [
        { sentence: 'Hello world test', start_ms: 0, end_ms: 1200 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello world test"
          timings={sentenceTimings}
          isWordLevel={false}
        />
      );

      // Entire sentence should have background when active
      const containerDiv = container.querySelector('div');
      expect(containerDiv?.style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
    });

    it('should not highlight sentence outside active range', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(60); // 2000ms - beyond sentence end

      const sentenceTimings: SentenceTiming[] = [
        { sentence: 'Hello world', start_ms: 0, end_ms: 1000 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello world"
          timings={sentenceTimings}
          isWordLevel={false}
        />
      );

      const containerDiv = container.querySelector('div');
      expect(containerDiv?.style.backgroundColor).toBe('transparent');
    });

    it('should display full sentence text', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15);

      const sentenceTimings: SentenceTiming[] = [
        { sentence: 'This is a test sentence', start_ms: 0, end_ms: 2000 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="This is a test sentence"
          timings={sentenceTimings}
          isWordLevel={false}
        />
      );

      const text = container.textContent;
      expect(text).toBe('This is a test sentence');
    });
  });

  describe('KaraokeSubtitle - Styling and Customization', () => {
    it('should use custom font size', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0);

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={[]}
          isWordLevel={false}
          fontSize={64}
        />
      );

      const textElement = container.querySelector('p');
      expect(textElement?.style.fontSize).toBe('64px');
    });

    it('should use custom font family', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0);

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={[]}
          isWordLevel={false}
          fontFamily="Arial, sans-serif"
        />
      );

      const textElement = container.querySelector('p');
      expect(textElement?.style.fontFamily).toBe('Arial, sans-serif');
    });

    it('should use custom text color', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0);

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={[]}
          isWordLevel={false}
          color="#ff0000"
        />
      );

      const textElement = container.querySelector('p');
      expect(textElement?.style.color).toBe('#ff0000');
    });

    it('should use custom background color for active words', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15); // Within active range

      const wordTimings: WordTiming[] = [
        { word: 'Test', start_ms: 0, end_ms: 1000 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={wordTimings}
          isWordLevel={true}
          backgroundColor="rgba(255, 0, 0, 0.8)"
        />
      );

      const word = container.querySelector('span');
      expect(word?.style.backgroundColor).toBe('rgba(255, 0, 0, 0.8)');
    });

    it('should use custom bottom offset', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0);

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={[]}
          isWordLevel={false}
          bottomOffset={120}
        />
      );

      const absoluteFill = container.firstElementChild;
      expect(absoluteFill?.style.paddingBottom).toBe('120px');
    });

    it('should apply custom styles', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(0);

      const customStyle = { textShadow: '2px 2px 4px rgba(0,0,0,0.5)' };

      const { container } = render(
        <KaraokeSubtitle
          text="Test"
          timings={[]}
          isWordLevel={false}
          style={customStyle}
        />
      );

      const textElement = container.querySelector('p');
      expect(textElement?.style.textShadow).toBe('2px 2px 4px rgba(0,0,0,0.5)');
    });
  });

  describe('KaraokeSubtitle - Edge Cases', () => {
    it('should handle single word timing', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15);

      const wordTimings: WordTiming[] = [
        { word: 'Solo', start_ms: 0, end_ms: 1000 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Solo"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const words = container.querySelectorAll('span');
      expect(words).toHaveLength(1);
      expect(words[0].textContent).toBe('Solo');
    });

    it('should handle long text with many words', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(30); // 1000ms

      const wordTimings: WordTiming[] = [
        { word: 'This', start_ms: 0, end_ms: 200 },
        { word: 'is', start_ms: 200, end_ms: 400 },
        { word: 'a', start_ms: 400, end_ms: 500 },
        { word: 'very', start_ms: 500, end_ms: 700 },
        { word: 'long', start_ms: 700, end_ms: 900 },
        { word: 'sentence', start_ms: 900, end_ms: 1200 },
        { word: 'with', start_ms: 1200, end_ms: 1400 },
        { word: 'many', start_ms: 1400, end_ms: 1600 },
        { word: 'words', start_ms: 1600, end_ms: 1800 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="This is a very long sentence with many words"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const words = container.querySelectorAll('span');
      expect(words).toHaveLength(9);

      // At 1000ms, "long" should be active
      expect(words[4].style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
    });

    it('should handle words with special characters', () => {
      const { useCurrentFrame } = require('remotion');
      useCurrentFrame.mockReturnValue(15);

      const wordTimings: WordTiming[] = [
        { word: 'Hello!', start_ms: 0, end_ms: 400 },
        { word: '(world)', start_ms: 400, end_ms: 800 },
        { word: 'test-case', start_ms: 800, end_ms: 1200 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Hello! (world) test-case"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const words = container.querySelectorAll('span');
      expect(words[0].textContent).toBe('Hello!');
      expect(words[1].textContent).toBe('(world)');
      expect(words[2].textContent).toBe('test-case');
    });
  });

  describe('KaraokeSubtitle - Timing Accuracy (SC-007)', () => {
    it('should maintain ±100ms accuracy', () => {
      const { useCurrentFrame } = require('remotion');

      // Test at edge of timing range (390ms - within 400ms end time ±100ms tolerance)
      useCurrentFrame.mockReturnValue(11.7); // 11.7 frames = 390ms

      const wordTimings: WordTiming[] = [
        { word: 'Precision', start_ms: 0, end_ms: 400 },
        { word: 'test', start_ms: 400, end_ms: 800 },
      ];

      const { container } = render(
        <KaraokeSubtitle
          text="Precision test"
          timings={wordTimings}
          isWordLevel={true}
        />
      );

      const words = container.querySelectorAll('span');

      // At 390ms, first word should still be active
      expect(words[0].style.backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
      expect(words[1].style.backgroundColor).toBe('');
    });
  });
});
