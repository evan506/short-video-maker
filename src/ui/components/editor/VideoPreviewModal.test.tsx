/**
 * VideoPreviewModal Component Tests
 *
 * Tests for VideoPreviewModal component functionality including:
 * - Modal opens and closes
 * - Video plays
 * - Select button calls onSelect
 * - Backdrop click closes modal
 * - Esc key closes modal
 * - Focus trapping
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoPreviewModal } from './VideoPreviewModal';
import { MediaOption } from './types/media';

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

describe('VideoPreviewModal Component', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={false}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Video Preview')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={onClose}
        onSelect={vi.fn()}
      />
    );

    const backdrop = container.querySelector('[role="presentation"]');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should close on X button click', () => {
    const onClose = vi.fn();
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={onClose}
        onSelect={vi.fn()}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close on Esc key press', async () => {
    const onClose = vi.fn();
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={onClose}
        onSelect={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onSelect with mediaOption when select button is clicked', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={onClose}
        onSelect={onSelect}
      />
    );

    const selectButton = screen.getByRole('button', { name: /select this video/i });
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockMediaOption);
    expect(onClose).toHaveBeenCalledTimes(1); // Should also close
  });

  it('should disable select button when isSelecting is true', () => {
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        isSelecting={true}
      />
    );

    const selectButton = screen.getByRole('button', { name: /selecting/i });
    expect(selectButton).toBeDisabled();
  });

  it('should display video metadata chips', () => {
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    // Check for metadata chips
    expect(screen.getByText(/Duration: 0:10/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolution: 1080p/i)).toBeInTheDocument();
    expect(screen.getByText(/1080x1920/i)).toBeInTheDocument();
    expect(screen.getByText(/Aspect Ratio: 9:16/i)).toBeInTheDocument();
    expect(screen.getByText(/Pexels ID: 12345/i)).toBeInTheDocument();
  });

  it('should display video ID', () => {
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Video ID: test-media-option-1/i)).toBeInTheDocument();
  });

  it('should render video element', () => {
    const { container } = render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
  });

  it('should call close when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={onClose}
        onSelect={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA attributes', () => {
    render(
      <VideoPreviewModal
        mediaOption={mockMediaOption}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'video-preview-modal-title');
  });

  it('should display correct resolution label for different resolutions', () => {
    const { rerender } = render(
      <VideoPreviewModal
        mediaOption={{
          ...mockMediaOption,
          height: 2160, // 4K
        }}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Resolution: 4K/i)).toBeInTheDocument();

    rerender(
      <VideoPreviewModal
        mediaOption={{
          ...mockMediaOption,
          height: 1440, // 2K
        }}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Resolution: 2K/i)).toBeInTheDocument();

    rerender(
      <VideoPreviewModal
        mediaOption={{
          ...mockMediaOption,
          height: 720, // 720p
        }}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Resolution: 720p/i)).toBeInTheDocument();
  });

  it('should return null when mediaOption is null', () => {
    const { container } = render(
      <VideoPreviewModal
        mediaOption={null}
        isOpen={true}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
