/**
 * Real-time Subscription Behavior Tests
 *
 * Tests the useMediaSubscription hook's real-time update handling,
 * including INSERT, UPDATE, DELETE events and reconnection logic.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMediaSubscription } from './useMediaSubscription';
import { supabase } from '../services/supabase';
import { MediaOption } from '../components/editor/types/media';

// Mock Supabase client
jest.mock('../services/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

describe('useMediaSubscription - Real-time Behavior', () => {
  const mockSceneId = 'scene-123';

  const mockMediaOptions: MediaOption[] = [
    {
      id: 'media-1',
      scene_id: mockSceneId,
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
      scene_id: mockSceneId,
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

  let mockChannel: any;
  let eventCallbacks: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventCallbacks = new Map();

    // Mock Supabase channel
    mockChannel = {
      on: jest.fn((event, config, callback) => {
        eventCallbacks.set('postgres_changes', callback);
        return mockChannel;
      }),
      subscribe: jest.fn((callback) => {
        // Simulate successful subscription
        setTimeout(() => {
          if (callback) callback('SUBSCRIBED');
        }, 0);
        return mockChannel;
      }),
    };

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    // Mock Supabase from query
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMediaOptions,
        error: null,
      }),
    });
  });

  describe('INSERT Event Handling', () => {
    it('should add new media option when INSERT event is received', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(2);
      });

      // Simulate INSERT event from Pexels search
      const newOption: MediaOption = {
        id: 'media-3',
        scene_id: mockSceneId,
        pexels_video_id: 9999999,
        video_url: 'https://videos.pexels.com/video-3.mp4',
        thumbnail_url: 'https://images.pexels.com/thumb-3.jpg',
        duration_sec: 20,
        width: 1920,
        height: 1080,
        aspect_ratio: '16:9',
        is_selected: false,
        created_at: '2025-01-06T01:00:00Z',
        expires_at: '2025-01-07T01:00:00Z',
      };

      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'INSERT',
            new: newOption,
            old: null,
          });
        }
      });

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(3);
        expect(result.current.mediaOptions[2]).toEqual(newOption);
      });
    });

    it('should auto-select first option if it arrives as selected', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Start with empty options
      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(2);
        expect(result.current.selectedOption).toBeNull();
      });

      // Simulate INSERT of auto-selected option
      const selectedOption: MediaOption = {
        ...mockMediaOptions[0],
        is_selected: true,
      };

      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'INSERT',
            new: selectedOption,
            old: null,
          });
        }
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toEqual(selectedOption);
      });
    });
  });

  describe('UPDATE Event Handling', () => {
    it('should update media option when selection changes', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(2);
      });

      // Simulate UPDATE event (user selected video)
      const updatedOption: MediaOption = {
        ...mockMediaOptions[0],
        is_selected: true,
      };

      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'UPDATE',
            new: updatedOption,
            old: mockMediaOptions[0],
          });
        }
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toEqual(updatedOption);
        expect(result.current.mediaOptions[0].is_selected).toBe(true);
      });
    });

    it('should deselect other options when one is selected', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Start with both options selected (shouldn't happen, but test robustness)
      const optionsWithSelection = [
        { ...mockMediaOptions[0], is_selected: true },
        { ...mockMediaOptions[1], is_selected: true },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: optionsWithSelection,
          error: null,
        }),
      });

      const { rerender } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.selectedOption).toBeTruthy();
      });

      // Simulate UPDATE event (second option selected, first deselected)
      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'UPDATE',
            new: { ...mockMediaOptions[1], is_selected: true },
            old: mockMediaOptions[1],
          });
        }
      });

      await waitFor(() => {
        // First option should be deselected
        expect(result.current.mediaOptions[0].is_selected).toBe(false);
        // Second option should be selected
        expect(result.current.mediaOptions[1].is_selected).toBe(true);
      });
    });

    it('should clear selectedOption when current selection is deselected', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Start with selected option
      const selectedOption = { ...mockMediaOptions[0], is_selected: true };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [selectedOption, mockMediaOptions[1]],
          error: null,
        }),
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toEqual(selectedOption);
      });

      // Simulate UPDATE event (deselect current option)
      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'UPDATE',
            new: { ...selectedOption, is_selected: false },
            old: selectedOption,
          });
        }
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toBeNull();
      });
    });
  });

  describe('DELETE Event Handling', () => {
    it('should remove media option when DELETE event is received', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(2);
      });

      // Simulate DELETE event (refresh removed old options)
      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'DELETE',
            new: null,
            old: mockMediaOptions[0],
          });
        }
      });

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(1);
        expect(result.current.mediaOptions[0].id).toBe('media-2');
      });
    });

    it('should clear selectedOption if deleted option was selected', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Start with selected option
      const selectedOption = { ...mockMediaOptions[0], is_selected: true };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [selectedOption, mockMediaOptions[1]],
          error: null,
        }),
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toEqual(selectedOption);
      });

      // Simulate DELETE event of selected option
      act(() => {
        const callback = eventCallbacks.get('postgres_changes');
        if (callback) {
          callback({
            eventType: 'DELETE',
            new: null,
            old: selectedOption,
          });
        }
      });

      await waitFor(() => {
        expect(result.current.selectedOption).toBeNull();
        expect(result.current.mediaOptions).toHaveLength(1);
      });
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should subscribe on mount when enabled', async () => {
      renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(
          `scene_media_options:${mockSceneId}`
        );
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'scene_media_options',
            filter: `scene_id=eq.${mockSceneId}`,
          }),
          expect.any(Function)
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });
    });

    it('should not subscribe when disabled', async () => {
      renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: false })
      );

      await waitFor(() => {
        expect(supabase.channel).not.toHaveBeenCalled();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      });
    });

    it('should handle subscription errors gracefully', async () => {
      // Mock subscription error
      mockChannel.subscribe = jest.fn((callback) => {
        setTimeout(() => {
          if (callback) callback('SUBSCRIPTION_ERROR');
        }, 0);
        return mockChannel;
      });

      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Real-time subscription failed');
      });
    });
  });

  describe('Manual Refresh', () => {
    it('should refetch media options when refresh is called', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(2);
      });

      // Mock new data for refresh
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockMediaOptions[0]], // Only one option after refresh
          error: null,
        }),
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.mediaOptions).toHaveLength(1);
      });
    });

    it('should handle refresh errors gracefully', async () => {
      const { result } = renderHook(() =>
        useMediaSubscription({ sceneId: mockSceneId, enabled: true })
      );

      // Mock error on refresh
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Network error')),
      });

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toBe('Network error');
      });
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should handle subscriptions for different scenes independently', async () => {
      const scene1Id = 'scene-1';
      const scene2Id = 'scene-2';

      const { result: result1 } = renderHook(() =>
        useMediaSubscription({ sceneId: scene1Id, enabled: true })
      );

      const { result: result2 } = renderHook(() =>
        useMediaSubscription({ sceneId: scene2Id, enabled: true })
      );

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(`scene_media_options:${scene1Id}`);
        expect(supabase.channel).toHaveBeenCalledWith(`scene_media_options:${scene2Id}`);
      });

      // Verify both subscriptions are active
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
    });
  });
});
