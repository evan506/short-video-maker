/**
 * BatchMediaSearch Component
 *
 * Triggers media search for all scenes at once with rate limiting.
 * Shows progress indicator and handles partial failures gracefully.
 *
 * Features:
 * - Batch search with 1 request/second rate limiting
 * - Real-time progress updates (X/Y scenes searched)
 * - Linear progress bar with percentage
 * - Error handling with retry functionality
 * - Completion summary with success/fail counts
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Card,
  CardContent,
  IconButton,
  Collapse,
  alpha,
  useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

// Scene interface (simplified)
export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  primary_keyword: string;
  media_search_status?: 'searching' | 'completed' | 'no_results' | 'failed' | null;
}

// Progress tracking interface
interface SearchProgress {
  total: number;
  completed: number;
  failed: number;
  isSearching: boolean;
}

// Result interface
interface SearchResult {
  sceneId: string;
  success: boolean;
  error?: string;
}

interface BatchMediaSearchProps {
  scenes: Scene[];
  onSearchComplete?: (results: SearchResult[]) => void;
}

/**
 * Rate-limited queue for batch search
 * Ensures only 1 request per second to Pexels API
 */
class SearchQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private readonly delayMs: number;

  constructor(delayMs: number = 1000) {
    this.delayMs = delayMs;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Rate limiting delay
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }
      }
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
  }
}

/**
 * BatchMediaSearch Component
 *
 * Provides "Search All Scenes" functionality with progress tracking.
 */
export function BatchMediaSearch({ scenes, onSearchComplete }: BatchMediaSearchProps) {
  const theme = useTheme();

  // Progress state
  const [progress, setProgress] = useState<SearchProgress>({
    total: scenes.length,
    completed: 0,
    failed: 0,
    isSearching: false
  });

  // Results tracking
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Queue ref (persistent across renders)
  const queueRef = useRef<SearchQueue | null>(null);

  if (!queueRef.current) {
    queueRef.current = new SearchQueue(1000); // 1 second delay
  }

  /**
   * Search single scene
   */
  const searchScene = useCallback(async (scene: Scene): Promise<SearchResult> => {
    try {
      const { supabase } = await import('../services/supabase');
      const token = await supabase.auth.getSession();

      const response = await fetch('/api/v1/media/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.data.session?.access_token}`
        },
        body: JSON.stringify({
          sceneId: scene.id,
          keywords: scene.primary_keyword,
          maxResults: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Search failed');
      }

      return {
        sceneId: scene.id,
        success: true
      };
    } catch (err) {
      console.error(`[BatchMediaSearch] Error searching scene ${scene.id}:`, err);
      return {
        sceneId: scene.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, []);

  /**
   * Handle batch search
   */
  const handleBatchSearch = useCallback(async () => {
    if (!queueRef.current || progress.isSearching) {
      return;
    }

    try {
      setError(null);
      setResults([]);
      setShowResults(false);

      // Reset progress
      setProgress({
        total: scenes.length,
        completed: 0,
        failed: 0,
        isSearching: true
      });

      const searchResults: SearchResult[] = [];
      let completedCount = 0;
      let failedCount = 0;

      // Queue all searches with rate limiting
      const searchPromises = scenes.map(async (scene) => {
        const result = await queueRef.current!.add(() => searchScene(scene));

        // Update progress
        completedCount++;
        if (!result.success) {
          failedCount++;
        }

        setProgress({
          total: scenes.length,
          completed: completedCount,
          failed: failedCount,
          isSearching: completedCount < scenes.length
        });

        searchResults.push(result);
        return result;
      });

      await Promise.all(searchPromises);

      // Final update
      setResults(searchResults);
      setShowResults(true);

      if (onSearchComplete) {
        onSearchComplete(searchResults);
      }

      console.log(`[BatchMediaSearch] Completed: ${completedCount - failedCount}/${scenes.length} succeeded`);
    } catch (err) {
      console.error('[BatchMediaSearch] Batch search error:', err);
      setError(err instanceof Error ? err.message : 'Batch search failed');
    } finally {
      setProgress(prev => ({ ...prev, isSearching: false }));
    }
  }, [scenes, searchScene, progress.isSearching, onSearchComplete]);

  /**
   * Retry failed scenes
   */
  const handleRetryFailed = useCallback(async () => {
    const failedScenes = scenes.filter(scene =>
      results.some(r => r.sceneId === scene.id && !r.success)
    );

    if (failedScenes.length === 0) {
      return;
    }

    setError(null);
    setShowResults(false);

    // Reset progress for retry
    setProgress({
      total: failedScenes.length,
      completed: 0,
      failed: 0,
      isSearching: true
    });

    const searchResults: SearchResult[] = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const scene of failedScenes) {
      const result = await queueRef.current!.add(() => searchScene(scene));

      completedCount++;
      if (!result.success) {
        failedCount++;
      }

      setProgress({
        total: failedScenes.length,
        completed: completedCount,
        failed: failedCount,
        isSearching: completedCount < failedScenes.length
      });

      searchResults.push(result);
    }

    // Update results with successful retries
    setResults(prev => {
      const updated = [...prev];
      searchResults.forEach((retryResult, index) => {
        const originalIndex = updated.findIndex(r => r.sceneId === retryResult.sceneId);
        if (originalIndex !== -1) {
          updated[originalIndex] = retryResult;
        }
      });
      return updated;
    });

    setShowResults(true);
  }, [scenes, results, searchScene]);

  /**
   * Calculate progress percentage
   */
  const progressPercent = Math.round((progress.completed / progress.total) * 100);

  /**
   * Render progress section
   */
  const renderProgress = () => {
    if (!progress.isSearching && progress.completed === 0) {
      return null;
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {progress.isSearching && (
            <Typography variant="body2" color="text.secondary">
              Searching scenes... {progress.completed}/{progress.total}
            </Typography>
          )}

          {!progress.isSearching && progress.failed === 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleIcon color="success" fontSize="small" />
              <Typography variant="body2" color="success.main" fontWeight={600}>
                All {progress.completed} scenes searched successfully!
              </Typography>
            </Stack>
          )}

          {!progress.isSearching && progress.failed > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <ErrorIcon color="error" fontSize="small" />
              <Typography variant="body2" color="error.main">
                {progress.completed - progress.failed} succeeded, {progress.failed} failed
              </Typography>
            </Stack>
          )}
        </Stack>

        <LinearProgress
          variant={progress.isSearching ? 'indeterminate' : 'determinate'}
          value={progress.isSearching ? undefined : progressPercent}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              transition: 'transform 0.3s ease'
            }
          }}
          aria-label={`Batch search progress: ${progress.completed} of ${progress.total} scenes searched`}
        />
      </Box>
    );
  };

  /**
   * Render error messages
   */
  const renderErrors = () => {
    if (results.length === 0 || results.every(r => r.success)) {
      return null;
    }

    const failedResults = results.filter(r => !r.success);

    return (
      <Collapse in={showResults}>
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            failedResults.length > 0 && (
              <Button
                color="inherit"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRetryFailed}
                disabled={progress.isSearching}
              >
                Retry Failed
              </Button>
            )
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {failedResults.length} scene{failedResults.length > 1 ? 's' : ''} failed to search
          </Typography>
        </Alert>

        <Box sx={{ mt: 1 }}>
          {failedResults.map((result) => {
            const scene = scenes.find(s => s.id === result.sceneId);
            return (
              <Card
                key={result.sceneId}
                variant="outlined"
                sx={{ mb: 1, borderColor: 'error.main' }}
              >
                <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ErrorIcon color="error" fontSize="small" />
                    <Typography variant="caption" sx={{ flexGrow: 1 }}>
                      Scene {scene?.order_index! + 1}: {scene?.primary_keyword}
                    </Typography>
                    <Typography variant="caption" color="error.main">
                      {result.error}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Collapse>
    );
  };

  // Filter scenes that need search
  const scenesNeedingSearch = scenes.filter(
    scene => !scene.media_search_status || scene.media_search_status === 'failed'
  );

  const allSearched = scenes.length > 0 && scenesNeedingSearch.length === 0;

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          size="large"
          startIcon={progress.isSearching ? null : <SearchIcon />}
          onClick={handleBatchSearch}
          disabled={progress.isSearching || scenes.length === 0}
          sx={{
            minWidth: 200,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {progress.isSearching ? (
            <span>Searching...</span>
          ) : (
            <span>
              Search All Scenes ({scenes.length})
            </span>
          )}
        </Button>

        {allSearched && !progress.isSearching && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="success" />
            <Typography variant="body2" color="text.secondary">
              All scenes have been searched
            </Typography>
          </Stack>
        )}
      </Stack>

      {/* Global error */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Progress indicator */}
      {renderProgress()}

      {/* Failed searches */}
      {renderErrors()}
    </Box>
  );
}

export default BatchMediaSearch;
