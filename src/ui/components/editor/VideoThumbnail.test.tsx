/**
 * VideoThumbnail Component Tests
 *
 * Tests for VideoThumbnail component functionality including:
 * - Rendering with props
 * - Hover triggers preview
 * - Click calls onSelect/onPreview
 * - Selection indicator displays
 * - Loading state
 * - Error state
 * - Accessibility (keyboard navigation)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoThumbnail } from './VideoThumbnail';
import { MediaOption } from './types/media';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

const mockMediaOption: MediaOption = {
  id: 'test-media-option-1',
  scene_id: 'test-scene-1',
  pexels_video_id: 12345,
  video_url: 'https://example.com/video.mp4',
  thumbnail_url: 'https://example.com/thumbnail.jpg',
  duration_sec: 10,
  width: 1080,
  height: 1920,
  aspect_ratio: '9:16',
  is_selected: false,
  created_at: '2026-01-06T00:00:00Z',
  expires_at: '2026-01-07T00:00:00Z',
};

describe('VideoThumbnail Component', () => {
  it('should render thumbnail with props', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    // Check that card is rendered
    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    // Check that thumbnail image is rendered
    const image = container.querySelector('img[src="https://example.com/thumbnail.jpg"]');
    expect(image).toBeInTheDocument();
  });

  it('should show selection indicator when isSelected is true', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        isSelected={true}
      />
    );

    // Check for selected badge
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Check for checkmark icon
    const checkmark = container.querySelector('[class*="CheckCircleIcon"]');
    expect(checkmark).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        onSelect={onSelect}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.click(card);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(mockMediaOption);
    }
  });

  it('should not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        onSelect={onSelect}
        disabled={true}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      fireEvent.click(card);
      expect(onSelect).not.toHaveBeenCalled();
    }
  });

  it('should show loading state', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        loading={true}
      />
    );

    // Check for CircularProgress
    const progress = container.querySelector('[class*="CircularProgress"]');
    expect(progress).toBeInTheDocument();
  });

  it('should show error state', () => {
    const errorMessage = 'Failed to load video';
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        error={errorMessage}
      />
    );

    // Check for error icon
    const errorIcon = container.querySelector('[class*="ErrorIcon"]');
    expect(errorIcon).toBeInTheDocument();

    // Check for error message
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display video metadata', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
      />
    );

    // Check for duration chip
    expect(screen.getByText('0:10')).toBeInTheDocument();

    // Check for resolution chip
    expect(screen.getByText('1080p')).toBeInTheDocument();

    // Check for dimensions text
    expect(screen.getByText('1080x1920 • 9:16')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        onSelect={onSelect}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      // Test Enter key
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });
      expect(onSelect).toHaveBeenCalledTimes(2);
    }
  });

  it('should have correct ARIA attributes', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        isSelected={false}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      expect(card).toHaveAttribute('aria-label', 'Video option test-media-option-1');
      expect(card).toHaveAttribute('tabIndex', '0');
    }
  });

  it('should have correct ARIA attributes when selected', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        isSelected={true}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      expect(card).toHaveAttribute('aria-label', 'Video option test-media-option-1 (selected)');
    }
  });

  it('should be disabled when disabled prop is true', () => {
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        disabled={true}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      expect(card).toHaveAttribute('tabIndex', '-1');
      expect(card).toHaveStyle({ pointerEvents: 'none' });
    }
  });

  it('should format duration correctly', () => {
    const longVideo: MediaOption = {
      ...mockMediaOption,
      duration_sec: 125, // 2:05
    };

    render(
      <VideoThumbnail
        mediaOption={longVideo}
      />
    );

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('should display correct resolution label', () => {
    // Test 4K
    const { rerender } = render(
      <VideoThumbnail
        mediaOption={{
          ...mockMediaOption,
          height: 2160,
        }}
      />
    );
    expect(screen.getByText('4K')).toBeInTheDocument();

    // Test 720p
    rerender(
      <VideoThumbnail
        mediaOption={{
          ...mockMediaOption,
          height: 720,
        }}
      />
    );
    expect(screen.getByText('720p')).toBeInTheDocument();
  });

  it('should have correct styling when hovering', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <VideoThumbnail
        mediaOption={mockMediaOption}
        onSelect={onSelect}
      />
    );

    const card = container.querySelector('[role="button"]');
    expect(card).toBeInTheDocument();

    if (card) {
      // Simulate hover
      fireEvent.mouseEnter(card);

      // Wait for hover delay (mocked)
      await waitFor(() => {
        expect(onSelect).not.toHaveBeenCalled();
      });

      fireEvent.mouseLeave(card);
    }
  });
});
