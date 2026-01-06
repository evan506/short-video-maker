/**
 * VideoPreviewModal Component
 *
 * Modal dialog for previewing videos in full quality with sound.
 * Displays video metadata and provides selection button.
 *
 * Features:
 * - Full video playback with sound
 * - Video controls (play, pause, volume, fullscreen)
 * - Metadata display (duration, resolution, aspect ratio)
 * - "Select this video" button
 * - Close on backdrop click, Esc key, or X button
 * - Focus trapping for accessibility
 * - Stop playback on close
 */

import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { VideoPreviewModalProps } from './types/media';

/**
 * VideoPreviewModal Component
 *
 * Displays a modal with full video playback capabilities.
 */
export function VideoPreviewModal({
  mediaOption,
  isOpen,
  onClose,
  onSelect,
  isSelecting = false,
}: VideoPreviewModalProps) {
  const theme = useTheme();
  const videoRefRef = useRef<HTMLVideoElement>(null);
  const dialogRefRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [volume, setVolume] = React.useState(1);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Stop video playback
    if (videoRefRef.current) {
      videoRefRef.current.pause();
      videoRefRef.current.currentTime = 0;
    }

    setIsPlaying(false);
    onClose();
  };

  /**
   * Handle select button click
   */
  const handleSelect = () => {
    if (mediaOption && onSelect) {
      onSelect(mediaOption);
      handleClose();
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (videoRefRef.current) {
      if (isPlaying) {
        videoRefRef.current.pause();
      } else {
        videoRefRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  /**
   * Toggle mute
   */
  const toggleMute = () => {
    if (videoRefRef.current) {
      videoRefRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  /**
   * Handle volume change
   */
  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const vol = Array.isArray(newValue) ? newValue[0] : newValue;
    if (videoRefRef.current) {
      videoRefRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (videoRefRef.current) {
      setCurrentTime(videoRefRef.current.currentTime);
    }
  };

  /**
   * Handle loaded metadata
   */
  const handleLoadedMetadata = () => {
    if (videoRefRef.current) {
      setDuration(videoRefRef.current.duration);
      setIsLoading(false);
    }
  };

  /**
   * Handle fullscreen
   */
  const handleFullscreen = () => {
    if (videoRefRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRefRef.current.requestFullscreen();
      }
    }
  };

  /**
   * Format time for display
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Close only if clicking on the backdrop, not the dialog content
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  /**
   * Handle Esc key press
   */
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  /**
   * Focus trapping for accessibility
   */
  useEffect(() => {
    if (isOpen && dialogRefRef.current) {
      const focusableElements = dialogRefRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);

  /**
   * Format duration for display
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get resolution label
   */
  const getResolutionLabel = (): string => {
    if (!mediaOption) return '';
    if (mediaOption.height >= 2160) return '4K';
    if (mediaOption.height >= 1440) return '2K';
    if (mediaOption.height >= 1080) return '1080p';
    if (mediaOption.height >= 720) return '720p';
    return `${mediaOption.height}p`;
  };

  if (!mediaOption) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      onClick={handleBackdropClick}
      maxWidth="md"
      fullWidth
      PaperProps={{
        ref: dialogRefRef,
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
      aria-labelledby="video-preview-modal-title"
    >
      <DialogTitle
        id="video-preview-modal-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Video Preview
        </Typography>
        <IconButton
          onClick={handleClose}
          aria-label="Close modal"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        {/* Video Player */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 aspect ratio for display
            bgcolor: 'black',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 2,
          }}
        >
          <Box
            component="video"
            ref={videoRefRef.current}
            src={mediaOption.video_url}
            muted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />

          {/* Loading Spinner */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1,
              }}
            >
              <CircularProgress size={60} sx={{ color: 'white' }} />
            </Box>
          )}

          {/* Video Controls Overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: alpha(theme.palette.common.black, 0.7),
              p: 1,
              opacity: 0,
              transition: 'opacity 0.3s',
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            {/* Progress Bar */}
            <Box
              sx={{
                width: '100%',
                height: 4,
                bgcolor: alpha(theme.palette.common.white, 0.3),
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                if (videoRefRef.current) {
                  videoRefRef.current.currentTime = percentage * duration;
                }
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${(currentTime / duration) * 100}%`,
                  bgcolor: theme.palette.primary.main,
                  borderRadius: 2,
                }}
              />
            </Box>

            {/* Control Buttons */}
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                onClick={togglePlayPause}
                sx={{ color: 'white' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                size="small"
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>

              <IconButton
                onClick={toggleMute}
                sx={{ color: 'white' }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                size="small"
              >
                {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>

              <Typography variant="caption" sx={{ color: 'white', ml: 1 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              <IconButton
                onClick={handleFullscreen}
                sx={{ color: 'white' }}
                aria-label="Fullscreen"
                size="small"
              >
                <FullscreenIcon />
              </IconButton>
            </Stack>
          </Box>
        </Box>

        {/* Video Metadata */}
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
          <Chip
            icon={<PlayArrowIcon />}
            label={`Duration: ${formatDuration(mediaOption.duration_sec)}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Resolution: ${getResolutionLabel()}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${mediaOption.width}x${mediaOption.height}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Aspect Ratio: ${mediaOption.aspect_ratio}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Pexels ID: ${mediaOption.pexels_video_id}`}
            size="small"
            color="info"
            variant="outlined"
          />
        </Stack>

        {/* Additional Info */}
        <Typography variant="body2" color="text.secondary">
          Video ID: {mediaOption.id}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isSelecting}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          startIcon={<CheckCircleIcon />}
          disabled={isSelecting}
          sx={{
            bgcolor: theme.palette.success.main,
            '&:hover': {
              bgcolor: theme.palette.success.dark,
            },
          }}
        >
          {isSelecting ? 'Selecting...' : 'Select this video'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default VideoPreviewModal;
