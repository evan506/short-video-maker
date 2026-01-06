/**
 * useMediaSubscription Hook
 *
 * Real-time subscription to scene_media_options table changes.
 * Automatically updates when Pexels search completes or selections change.
 *
 * Features:
 * - Subscribes to INSERT, UPDATE, DELETE events
 * - Real-time UI updates without page refresh
 * - Automatic cleanup on unmount
 * - Error handling and reconnection logic
 * - Filters by scene_id
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { MediaOption } from '../components/editor/types/media';

export interface UseMediaSubscriptionOptions {
  sceneId: string;
  enabled?: boolean;
}

export interface UseMediaSubscriptionReturn {
  mediaOptions: MediaOption[];
  selectedOption: MediaOption | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * useMediaSubscription Hook
 *
 * Subscribes to scene_media_options table for a specific scene.
 * Updates in real-time when options are added, updated, or removed.
 *
 * @param options - Subscription options
 * @returns Media options, selected option, and state
 */
export function useMediaSubscription(
  options: UseMediaSubscriptionOptions
): UseMediaSubscriptionReturn {
  const { sceneId, enabled = true } = options;

  const [mediaOptions, setMediaOptions] = useState<MediaOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<MediaOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  /**
   * Fetch initial media options
   */
  const fetchMediaOptions = useCallback(async () => {
    if (!enabled || !sceneId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scene_media_options')
        .select('*')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      if (mountedRef.current) {
        const options = data || [];
        setMediaOptions(options);

        // Find selected option
        const selected = options.find(opt => opt.is_selected) || null;
        setSelectedOption(selected);
      }
    } catch (err) {
      console.error('[useMediaSubscription] Fetch error:', err);
      if (mountedRef.current) {
        setError(err as Error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sceneId, enabled]);

  /**
   * Refresh media options (manual refresh)
   */
  const refresh = useCallback(async () => {
    await fetchMediaOptions();
  }, [fetchMediaOptions]);

  /**
   * Setup real-time subscription
   */
  useEffect(() => {
    if (!enabled || !sceneId) {
      return;
    }

    // Fetch initial data
    fetchMediaOptions();

    // Setup real-time subscription
    const channel = supabase
      .channel(`scene_media_options:${sceneId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scene_media_options',
          filter: `scene_id=eq.${sceneId}`
        },
        (payload) => {
          console.log('[useMediaSubscription] Real-time update:', payload);

          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (!mountedRef.current) return;

          switch (eventType) {
            case 'INSERT':
              // New media option added (Pexels search result)
              setMediaOptions(prev => [...prev, newRecord as MediaOption]);

              // Auto-select if this is the first option
              if (mediaOptions.length === 0 && (newRecord as MediaOption).is_selected) {
                setSelectedOption(newRecord as MediaOption);
              }
              break;

            case 'UPDATE':
              // Media option updated (selection changed)
              setMediaOptions(prev => {
                return prev.map(option => {
                  if (option.id === newRecord.id) {
                    return newRecord as MediaOption;
                  }
                  // Deselect other options if one was selected
                  if ((newRecord as MediaOption).is_selected && option.is_selected) {
                    return { ...option, is_selected: false };
                  }
                  return option;
                });
              });

              // Update selected option
              if ((newRecord as MediaOption).is_selected) {
                setSelectedOption(newRecord as MediaOption);
              } else if (selectedOption?.id === newRecord.id) {
                // Current selection was deselected
                setSelectedOption(null);
              }
              break;

            case 'DELETE':
              // Media option removed (refresh deleted old options)
              setMediaOptions(prev => prev.filter(opt => opt.id !== oldRecord.id));

              // Clear selected option if it was deleted
              if (selectedOption?.id === oldRecord.id) {
                setSelectedOption(null);
              }
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('[useMediaSubscription] Subscription status:', status);

        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('[useMediaSubscription] Subscription error');
          if (mountedRef.current) {
            setError(new Error('Real-time subscription failed'));
          }
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      mountedRef.current = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sceneId, enabled]);

  return {
    mediaOptions,
    selectedOption,
    isLoading,
    error,
    refresh
  };
}

export default useMediaSubscription;
