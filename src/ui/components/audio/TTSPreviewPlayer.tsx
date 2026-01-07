/**
 * TTSPreviewPlayer Component
 *
 * Audio player for TTS preview with play/pause/stop controls.
 * Displays loading state, cached badge, duration, and error messages with retry.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import ReplayIcon from '@mui/icons-material/Replay';
import VolumeUp from '@mui/icons-material/VolumeUp';
import SpeedIcon from '@mui/icons-material/Speed';
import {
  useTTSPreview,
  type TTSPreviewResponse,
} from '../../hooks/useTTSPreview';

/**
 * TTSPreviewPlayer Component Props
 */
export interface TTSPreviewPlayerProps {
  sceneId: string;
  narrationText: string;
  onPlaybackComplete?: () => void;
  compact?: boolean; // Compact mode for inline display
}

/**
 * TTSPreviewPlayer Component
 *
 * Features:
 * - Play/Pause/Stop controls (T023)
 * - Loading state with spinner (T025)
 * - Displays cached badge (T027)
 * - Error handling with retry button (T029)
 * - Shows duration
 * - Supports compact mode for scene cards
 */
export function TTSPreviewPlayer({
  sceneId,
  narrationText,
  onPlaybackComplete,
  compact = false,
}: TTSPreviewPlayerProps) {
  // State
  const [preview, setPreview] = useState<TTSPreviewResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // TTS preview hook
  const { generatePreview, isGenerating, error, clearError } = useTTSPreview();

  /**
   * Generate TTS preview
   */
  const handleGenerate = useCallback(async () => {
    clearError();
    const result = await generatePreview(sceneId, narrationText);
    if (result) {
      setPreview(result);
    }
  }, [sceneId, narrationText, generatePreview, clearError]);

  /**
   * Play audio
   */
  const handlePlay = useCallback(() => {
    if (!audioRef.current || !preview) {
      return;
    }

    audioRef.current.play();
    setIsPlaying(true);

    // Update playback position every 100ms
    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setPlaybackPosition(audioRef.current.currentTime);
      }
    }, 100);
  }, [preview]);

  /**
   * Pause audio
   */
  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  /**
   * Stop audio and reset position
   */
  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setPlaybackPosition(0);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  /**
   * Retry after error
   */
  const handleRetry = useCallback(() => {
    clearError();
    handleGenerate();
  }, [clearError, handleGenerate]);

  /**
   * Cleanup audio on unmount
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Setup audio element when preview changes
   */
  useEffect(() => {
    if (preview && !audioRef.current) {
      const audio = new Audio(preview.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackPosition(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
      };

      audio.onerror = () => {
        console.error('[TTSPreviewPlayer] Audio playback error');
        setIsPlaying(false);
      };

      // Auto-play if not in compact mode
      if (!compact) {
        handlePlay();
      }
    }

    return () => {
      if (audioRef.current && !preview) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [preview, compact, onPlaybackComplete, handlePlay]);

  // Error state (T029)
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<ReplayIcon />}
            onClick={handleRetry}
          >
            Retry
          </Button>
        }
        sx={{ mb: 1 }}
      >
        {error}
      </Alert>
    );
  }

  // Loading state (T025)
  if (isGenerating) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: compact ? 0.5 : 1,
        }}
      >
        <CircularProgress size={compact ? 16 : 20} />
        <Typography variant="body2" color="text.secondary">
          Generating preview...
        </Typography>
      </Box>
    );
  }

  // No preview generated yet
  if (!preview) {
    return (
      <Button
        variant={compact ? 'text' : 'outlined'}
        size="small"
        startIcon={<VolumeUp />}
        onClick={handleGenerate}
        disabled={!narrationText || narrationText.trim().length === 0}
        sx={{
          fontSize: compact ? '0.7rem' : '0.875rem',
          py: compact ? 0.25 : 1,
        }}
      >
        Preview Voiceover
      </Button>
    );
  }

  // Audio player controls (T023)
  const progressPercent = preview.duration > 0
    ? (playbackPosition / preview.duration) * 100
    : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: compact ? 0.5 : 1,
        px: compact ? 0 : 1,
        bgcolor: compact ? 'transparent' : 'action.hover',
        borderRadius: 1,
      }}
    >
      {/* Play/Pause/Stop buttons */}
      <Stack direction="row" spacing={0.5}>
        {!isPlaying ? (
          <IconButton
            size="small"
            onClick={handlePlay}
            disabled={!preview}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: compact ? 16 : 20 }} />
          </IconButton>
        ) : (
          <IconButton
            size="small"
            onClick={handlePause}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <PauseIcon sx={{ fontSize: compact ? 16 : 20 }} />
          </IconButton>
        )}

        <IconButton
          size="small"
          onClick={handleStop}
          disabled={!preview}
          sx={{
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
            '&:disabled': { color: 'text.disabled' },
          }}
        >
          <StopIcon sx={{ fontSize: compact ? 16 : 20 }} />
        </IconButton>
      </Stack>

      {/* Info: Duration + Cached badge */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Cached badge (T027) */}
          {preview.cached && (
            <Chip
              label="Cached"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: 'success.main',
                color: 'success.contrastText',
              }}
            />
          )}

          {/* Duration */}
          <Typography variant="caption" color="text.secondary">
            {Math.floor(playbackPosition)}s / {Math.floor(preview.duration)}s
          </Typography>

          {/* Progress bar */}
          {!compact && (
            <Box
              sx={{
                flexGrow: 1,
                height: 4,
                bgcolor: 'action.disabledBackground',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  bgcolor: 'primary.main',
                  transition: 'width 0.1s linear',
                }}
              />
            </Box>
          )}
        </Stack>
      </Box>

      {/* Compact mode: Regenerate button */}
      {compact && (
        <IconButton
          size="small"
          onClick={handleGenerate}
          disabled={isGenerating}
          title="Regenerate preview"
        >
          <ReplayIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default TTSPreviewPlayer;
