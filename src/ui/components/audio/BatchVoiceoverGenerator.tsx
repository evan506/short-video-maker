/**
 * BatchVoiceoverGenerator Component
 *
 * UI for batch TTS generation across all project scenes.
 * Provides progress tracking, per-scene status display, and retry functionality.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  Refresh,
  Close,
  Speed,
} from '@mui/icons-material';

/**
 * Per-scene status for batch generation
 */
export interface SceneGenerationStatus {
  sceneId: string;
  sceneNumber: number;
  title: string;
  narrationText: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  audioUrl?: string;
  duration?: number;
}

/**
 * Batch generation response from API
 */
export interface BatchGenerationResponse {
  jobId: string;
  sceneCount: number;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
}

/**
 * BatchVoiceoverGenerator Props
 */
export interface BatchVoiceoverGeneratorProps {
  projectId: string;
  scenes: Array<{
    id: string;
    scene_number: number;
    title: string;
    narration_text: string;
  }>;
  onGenerationComplete?: (scenes: SceneGenerationStatus[]) => void; // Callback when batch completes
  compact?: boolean; // Compact mode for inline display
}

/**
 * Scene status icon component
 */
interface StatusIconProps {
  status: SceneGenerationStatus['status'];
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Pending color="action" />;
    case 'processing':
      return <CircularProgress size={24} />;
    case 'completed':
      return <CheckCircle color="success" />;
    case 'failed':
      return <ErrorIcon color="error" />;
    default:
      return <Pending />;
  }
};

/**
 * BatchVoiceoverGenerator Component
 *
 * T049: Add "Generate All Voiceovers" button
 * T053: Create BatchVoiceoverGenerator.tsx with progress overlay
 * T054: Display "X/Y scenes generated" progress counter
 * T055: Show per-scene status (pending/processing/completed/failed)
 * T056: Handle failures gracefully - continue with remaining scenes
 * T057: Provide "Retry Failed Scenes" button after batch completes
 */
export const BatchVoiceoverGenerator: React.FC<BatchVoiceoverGeneratorProps> = ({
  projectId,
  scenes,
  onGenerationComplete,
  compact = false,
}) => {
  // Batch generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);

  // Progress tracking
  const [sceneStatuses, setSceneStatuses] = useState<SceneGenerationStatus[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Polling refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Initialize scene statuses
   */
  const initializeSceneStatuses = useCallback(() => {
    const statuses: SceneGenerationStatus[] = scenes.map((scene) => ({
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      title: scene.title,
      narrationText: scene.narration_text,
      status: 'pending' as const,
    }));
    setSceneStatuses(statuses);
    setCompletedCount(0);
    setFailedCount(0);
    setError(null);
  }, [scenes]);

  /**
   * T049: Add "Generate All Voiceovers" button
   * Start batch generation
   */
  const handleStartBatch = useCallback(async () => {
    if (scenes.length === 0) {
      setError('No scenes found in project');
      return;
    }

    setIsGenerating(true);
    setIsDialogOpen(true);
    initializeSceneStatuses();

    try {
      // T050: Call POST /api/v1/scenes/tts/batch
      const response = await fetch(`/api/v1/scenes/tts/batch?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start batch generation');
      }

      const data: BatchGenerationResponse = await response.json();
      setBatchJobId(data.jobId);

      // Start polling for job status
      startPolling(data.jobId);
    } catch (err: any) {
      setError(err.message || 'Failed to start batch generation');
      setIsGenerating(false);
    }
  }, [projectId, scenes.length, initializeSceneStatuses]);

  /**
   * T054: Display "X/Y scenes generated" progress counter
   * Poll for batch job status
   */
  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Poll every 2 seconds
    pollingRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        // Fetch status for each scene
        const statusPromises = scenes.map(async (scene) => {
          const response = await fetch(`/api/v1/scenes/${scene.id}/audio/status`);

          if (!response.ok) {
            return {
              sceneId: scene.id,
              sceneNumber: scene.scene_number,
              title: scene.title,
              narrationText: scene.narration_text,
              status: 'failed' as const,
              error: 'Failed to fetch status',
            };
          }

          const data = await response.json();

          // Map API status to our status
          let status: SceneGenerationStatus['status'] = 'pending';
          if (data.status === 'completed') {
            status = 'completed';
          } else if (data.status === 'processing') {
            status = 'processing';
          } else if (data.status === 'failed') {
            status = 'failed';
          }

          return {
            sceneId: scene.id,
            sceneNumber: scene.scene_number,
            title: scene.title,
            narrationText: scene.narration_text,
            status,
            error: data.error,
            audioUrl: data.audioUrl,
            duration: data.startedAt && data.completedAt
              ? new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()
              : undefined,
          };
        });

        const updatedStatuses = await Promise.all(statusPromises);

        if (!isMountedRef.current) return;

        setSceneStatuses(updatedStatuses);

        // Calculate counts
        const completed = updatedStatuses.filter(s => s.status === 'completed').length;
        const failed = updatedStatuses.filter(s => s.status === 'failed').length;

        setCompletedCount(completed);
        setFailedCount(failed);

        // Check if batch is complete (all scenes completed or failed)
        const allDone = updatedStatuses.every(
          s => s.status === 'completed' || s.status === 'failed'
        );

        if (allDone) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          setIsGenerating(false);

          // Notify parent component
          if (onGenerationComplete) {
            onGenerationComplete(updatedStatuses);
          }

          // T056: Handle failures gracefully
          // Don't show error alert if some scenes succeeded
          if (failed === updatedStatuses.length) {
            setError('All scenes failed to generate');
          }
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        console.error('[BatchVoiceoverGenerator] Polling error:', err);
        // Don't stop polling on transient errors
      }
    }, 2000);
  }, [scenes, onGenerationComplete]);

  /**
   * T057: Provide "Retry Failed Scenes" button
   * Retry only failed scenes
   */
  const handleRetryFailed = useCallback(async () => {
    const failedScenes = sceneStatuses.filter(s => s.status === 'failed');

    if (failedScenes.length === 0) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Reset failed scenes to pending
    setSceneStatuses(prev =>
      prev.map(status =>
        status.status === 'failed' ? { ...status, status: 'pending' as const, error: undefined } : status
      )
    );

    // Retry each failed scene individually
    const retryPromises = failedScenes.map(async (scene) => {
      try {
        const response = await fetch(`/api/v1/scenes/${scene.sceneId}/tts/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: scene.narrationText,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate');
        }

        return { sceneId: scene.sceneId, success: true };
      } catch (err) {
        return { sceneId: scene.sceneId, success: false };
      }
    });

    await Promise.all(retryPromises);

    // Restart polling to track retries
    if (batchJobId) {
      startPolling(batchJobId);
    } else {
      setIsGenerating(false);
    }
  }, [sceneStatuses, batchJobId, startPolling]);

  /**
   * Close dialog and cleanup
   */
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);

    // Stop polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // If generation is complete, keep the results
    if (!isGenerating) {
      return;
    }

    // If still generating, cancel and reset
    setIsGenerating(false);
  }, [isGenerating]);

  /**
   * Calculate progress percentage
   */
  const progressPercentage = scenes.length > 0
    ? (completedCount / scenes.length) * 100
    : 0;

  /**
   * Determine overall batch status
   */
  const getBatchStatus = (): 'success' | 'partial' | 'failed' => {
    if (completedCount === scenes.length) return 'success';
    if (completedCount > 0 || failedCount > 0) return 'partial';
    return 'failed';
  };

  const batchStatus = getBatchStatus();

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  /**
   * T049: "Generate All Voiceovers" button (compact mode)
   */
  if (compact) {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={isGenerating ? <CircularProgress size={16} /> : <PlayArrow />}
          onClick={handleStartBatch}
          disabled={isGenerating || scenes.length === 0}
          fullWidth
        >
          {isGenerating ? `Generating (${completedCount}/${scenes.length})` : 'Generate All Voiceovers'}
        </Button>

        {isGenerating && (
          <Box mt={1}>
            <LinearProgress variant="determinate" value={progressPercentage} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {completedCount} of {scenes.length} scenes completed
              {failedCount > 0 && ` (${failedCount} failed)`}
            </Typography>
          </Box>
        )}
      </>
    );
  }

  /**
   * T053: Progress overlay (full mode)
   */
  return (
    <>
      {/* T049: Main button */}
      <Button
        variant="contained"
        size="large"
        startIcon={<Speed />}
        onClick={handleStartBatch}
        disabled={isGenerating || scenes.length === 0}
        fullWidth
      >
        Generate All Voiceovers ({scenes.length} scenes)
      </Button>

      {/* Progress Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: 500 }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Speed color="primary" />
              <Typography variant="h6">
                Batch Voiceover Generation
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} disabled={isGenerating}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* Error Display */}
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            {/* T054: Progress counter */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {completedCount} / {scenes.length} scenes
                  {failedCount > 0 && ` (${failedCount} failed)`}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ height: 10, borderRadius: 5 }}
              />
              {!isGenerating && batchStatus === 'partial' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Some scenes failed to generate. You can retry them below.
                </Alert>
              )}
            </Box>

            <Divider />

            {/* T055: Per-scene status */}
            <Typography variant="subtitle2" fontWeight="medium">
              Scene Status
            </Typography>
            <List dense>
              {sceneStatuses.map((sceneStatus) => (
                <ListItem key={sceneStatus.sceneId}>
                  <ListItemIcon>
                    <StatusIcon status={sceneStatus.status} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Scene ${sceneStatus.sceneNumber}: ${sceneStatus.title}`}
                    secondary={sceneStatus.error || (
                      sceneStatus.status === 'completed'
                        ? `Completed in ${sceneStatus.duration ? Math.round(sceneStatus.duration / 1000) + 's' : 'N/A'}`
                        : sceneStatus.status === 'processing'
                        ? 'Processing...'
                        : 'Pending'
                    )}
                  />
                  <Chip
                    label={sceneStatus.status}
                    size="small"
                    color={
                      sceneStatus.status === 'completed'
                        ? 'success'
                        : sceneStatus.status === 'failed'
                        ? 'error'
                        : sceneStatus.status === 'processing'
                        ? 'info'
                        : 'default'
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* T057: Retry failed button */}
            {!isGenerating && failedCount > 0 && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleRetryFailed}
                    startIcon={<Refresh />}
                  >
                    Retry Failed ({failedCount})
                  </Button>
                }
              >
                {failedCount} scene{failedCount > 1 ? 's' : ''} failed to generate
              </Alert>
            )}

            {/* Success message */}
            {!isGenerating && batchStatus === 'success' && (
              <Alert
                severity="success"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleCloseDialog}
                  >
                    Close
                  </Button>
                }
              >
                All {scenes.length} scenes generated successfully!
              </Alert>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BatchVoiceoverGenerator;
