/**
 * Integration Tests: EnhancedSceneCard with Media Options
 *
 * Tests the integration of SceneCard with video media options,
 * real-time subscriptions, selection flow, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedSceneCard } from './SceneCard.enhanced';
import { MediaOption } from './types/media';
import * as supabaseModule from '../services/supabase';

// Mock Supabase client
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return { unsubscribe: jest.fn() };
      }),
    })),
    removeChannel: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('EnhancedSceneCard - Media Options Integration', () => {
  const mockScene = {
    id: 'scene-123',
    project_id: 'project-456',
    order_index: 0,
    narration_text: 'This is a test scene narration',
    duration_sec_draft: 5,
    duration_sec_final: null,
    primary_keyword: 'beach',
    subtitle_style_preset_id: 1,
    created_at: '2025-01-06T00:00:00Z',
    updated_at: '2025-01-06T00:00:00Z',
    media_search_status: 'completed' as const,
    media_searched_at: '2025-01-06T00:00:00Z',
    media_search_error: null,
  };

  const mockMediaOptions: MediaOption[] = [
    {
      id: 'media-1',
      scene_id: 'scene-123',
      pexels_video_id: 1234567,
      video_url: 'https://videos.pexels.com/video-1.mp4',
      thumbnail_url: 'https://images.pexels.com/thumb-1.jpg',
      duration_sec: 10,
      width: 1920,
      height: 1080,
      aspect_ratio: '16:9',
      is_selected: false,
      created_at: '2025-01-06T00:00:00Z',
      expires_at: '2025-01-07T00:00:00Z',
    },
    {
      id: 'media-2',
      scene_id: 'scene-123',
      pexels_video_id: 7654321,
      video_url: 'https://videos.pexels.com/video-2.mp4',
      thumbnail_url: 'https://images.pexels.com/thumb-2.jpg',
      duration_sec: 15,
      width: 1920,
      height: 1080,
      aspect_ratio: '16:9',
      is_selected: false,
      created_at: '2025-01-06T00:00:00Z',
      expires_at: '2025-01-07T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful auth session
    (supabaseModule.supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
        },
      },
      error: null,
    });
  });

  describe('Media Options Display', () => {
    it('should display media options when search is completed', async () => {
      // Mock successful media options fetch
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });
    });

    it('should show loading state while searching for media', async () => {
      const searchingScene = {
        ...mockScene,
        media_search_status: 'searching' as const,
      };

      render(<EnhancedSceneCard scene={searchingScene} index={0} />);

      expect(screen.getByText(/searching for media/i)).toBeInTheDocument();
    });

    it('should show no results message when search completes with no options', async () => {
      const noResultsScene = {
        ...mockScene,
        media_search_status: 'no_results' as const,
      };

      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      render(<EnhancedSceneCard scene={noResultsScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText(/no videos found/i)).toBeInTheDocument();
      });
    });

    it('should render VideoThumbnail components for each media option', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        const thumbnails = screen.getAllByRole('button', { name: /video option/i });
        expect(thumbnails).toHaveLength(2);
      });
    });
  });

  describe('Selection Flow', () => {
    it('should call media select API when thumbnail is clicked', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockMediaOptions[0] }),
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      const thumbnails = screen.getAllByRole('button', { name: /video option/i });
      await userEvent.click(thumbnails[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/media/select',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token',
            }),
            body: expect.stringContaining('"sceneId":"scene-123"'),
          })
        );
      });
    });

    it('should display selection error when API call fails', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Failed to select video' } }),
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      const thumbnails = screen.getAllByRole('button', { name: /video option/i });
      await userEvent.click(thumbnails[0]);

      await waitFor(() => {
        expect(screen.getByText(/failed to select video/i)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call media refresh API when refresh button is clicked', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/media/refresh',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"sceneId":"scene-123"'),
          })
        );
      });
    });

    it('should enforce 60-second rate limit on refresh', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      const refreshButton = await screen.findByRole('button', { name: /refresh/i });

      // First click should work
      await userEvent.click(refreshButton);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Immediate second click should be rate limited
      (global.fetch as jest.Mock).mockClear();
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/please wait.*seconds before refreshing/i)).toBeInTheDocument();
      });

      // Verify no additional API call was made
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should display refresh error when API call fails', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      const refreshButton = await screen.findByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate between thumbnails with arrow keys', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      const firstThumbnail = screen.getByRole('button', { name: /video option/i });
      firstThumbnail.focus();

      expect(firstThumbnail).toHaveFocus();

      // Press ArrowRight to move to next thumbnail
      fireEvent.keyDown(firstThumbnail, { key: 'ArrowRight' });

      await waitFor(() => {
        const allThumbnails = screen.getAllByRole('button', { name: /video option/i });
        expect(allThumbnails[1]).toHaveFocus();
      });
    });

    it('should not navigate past first thumbnail with ArrowLeft', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      const firstThumbnail = screen.getAllByRole('button', { name: /video option/i })[0];
      firstThumbnail.focus();

      // Press ArrowLeft at first thumbnail (should stay focused)
      fireEvent.keyDown(firstThumbnail, { key: 'ArrowLeft' });

      expect(firstThumbnail).toHaveFocus();
    });

    it('should show focus indicator on thumbnail when focused', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      const firstThumbnail = screen.getByRole('button', { name: /video option/i });
      firstThumbnail.focus();

      // Check for focus-visible outline style
      expect(firstThumbnail).toHaveFocus();
    });
  });

  describe('Collapsible Media Section', () => {
    it('should collapse media section when close button is clicked', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(screen.getByText('2 video options found')).toBeInTheDocument();
      });

      // Find and click the collapse button (IconButton with CloseIcon)
      const collapseButton = screen.getByRole('button', { name: '' }); // Close button has no text label
      const iconButtons = screen.getAllByRole('button');
      const closeButton = iconButtons.find(btn => btn.querySelector('svg'));

      if (closeButton) {
        await userEvent.click(closeButton);

        // Media options should be hidden (collapsed)
        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /video option/i })).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Real-time Subscription', () => {
    it('should subscribe to media options on mount', async () => {
      const { from } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      render(<EnhancedSceneCard scene={mockScene} index={0} />);

      await waitFor(() => {
        expect(supabaseModule.supabase.channel).toHaveBeenCalledWith(
          `scene_media_options:${mockScene.id}`
        );
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { from, unmount } = supabaseModule.supabase;
      (from().eq().order as jest.Mock).mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      });

      const { unmount: componentUnmount } = render(<EnhancedSceneCard scene={mockScene} index={0} />);

      componentUnmount();

      await waitFor(() => {
        expect(supabaseModule.supabase.removeChannel).toHaveBeenCalled();
      });
    });
  });
});
