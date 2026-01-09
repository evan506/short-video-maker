/**
 * useRenderJob Hook
 *
 * Manages render job status polling with 2-second interval (T065).
 * Provides real-time updates for render job progress.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import type { RenderJobWithSteps } from '../../server/services/render-service';

/**
 * Hook return value
 */
interface UseRenderJobReturn {
  job: RenderJobWithSteps | null;
  isLoading: boolean;
  error: string | null;
  isPolling: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Fetch render job status from API
 */
async function fetchRenderJob(jobId: string): Promise<RenderJobWithSteps> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const token = session.access_token;
  const response = await fetch(`/api/v1/render/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch job: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook for polling render job status
 *
 * Polls every 2 seconds while job is in queued/running state.
 * Stops polling when job succeeds, fails, or is canceled.
 *
 * @param jobId - Render job UUID
 * @returns Render job state and operations
 *
 * @example
 * ```tsx
 * const { job, isLoading, isPolling, lastUpdated } = useRenderJob(jobId);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (!job) return null;
 *
 * return (
 *   <div>
 *     <div>Progress: {job.progress}%</div>
 *     <div>Last updated: {lastUpdated?.toLocaleString()}</div>
 *   </div>
 * );
 * ```
 */
export function useRenderJob(jobId: string | null): UseRenderJobReturn {
  const [job, setJob] = useState<RenderJobWithSteps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Fetch job data
   */
  const fetchData = useCallback(async () => {
    if (!jobId || !mountedRef.current) return;

    try {
      const data = await fetchRenderJob(jobId);

      if (!mountedRef.current) return;

      setJob(data);
      setError(null);
      setLastUpdated(new Date());
      setIsLoading(false);

      // Stop polling if job reached terminal state
      if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
        stopPolling();
      }
    } catch (err: any) {
      if (!mountedRef.current) return;

      console.error('[useRenderJob] Failed to fetch job:', err);
      setError(err.message || 'Failed to fetch job status');
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [jobId]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return; // Already polling
    }

    console.log('[useRenderJob] Starting polling for job:', jobId);

    // Initial fetch
    fetchData();

    // Poll every 2 seconds (T065)
    pollingIntervalRef.current = setInterval(() => {
      fetchData();
    }, 2000);

    setIsPolling(true);
  }, [jobId, fetchData]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('[useRenderJob] Stopping polling for job:', jobId);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setIsPolling(false);
  }, [jobId]);

  /**
   * Effect: Start polling when jobId changes
   */
  useEffect(() => {
    if (!jobId) {
      setIsLoading(false);
      return;
    }

    // Start polling immediately
    startPolling();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [jobId, startPolling, stopPolling]);

  return {
    job,
    isLoading,
    error,
    isPolling,
    lastUpdated,
    refetch,
    startPolling,
    stopPolling,
  };
}
