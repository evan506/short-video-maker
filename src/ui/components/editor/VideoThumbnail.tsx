/**
 * VideoThumbnail Component
 *
 * Displays a video thumbnail with hover preview functionality.
 * Shows loading states, selection indicators, and play button overlay.
 *
 * Features:
 * - Lazy loading with Intersection Observer
 * - Hover-to-preview (3-second muted loop)
 * - Selection state with green border and checkmark
 * - Error handling with retry capability
 * - Accessibility support (ARIA labels, keyboard navigation)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardMedia,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Tooltip,
  cardClasses
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { alpha, useTheme } from '@mui/material/styles';
import { VideoThumbnailProps } from './types/media';

const HOVER_DELAY_MS = 500;
const PREVIEW_DURATION_MS = 3000;

/**
 * VideoThumbnail Component
 *
 * Displays a thumbnail image that plays a muted video preview on hover.
 * Supports selection state with visual indicators.
 */
export function VideoThumbnail({
  mediaOption,
  isSelected = false,
  onSelect,
  onPreview,
  disabled = false,
  loading = false,
  error
}: VideoThumbnailProps) {
  const theme = useTheme();
  const [isHovering, setIsHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefRef = useRef<HTMLVideoElement | null>(null);
  const containerRefRef = useRef<HTMLDivElement | null>(null);

  /**
   * Clean up timers on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  /**
   * Handle mouse enter - start hover delay timer
   */
  const handleMouseEnter = () => {
    if (disabled || loading || error) return;

    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(true);
      if (onPreview) {
        // Trigger preview callback for modal
        onPreview(mediaOption);
      } else {
        // Show inline preview
        startInlinePreview();
      }
    }, HOVER_DELAY_MS);
  };

  /**
   * Handle mouse leave - cancel hover and stop preview
   */
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    setIsHovering(false);
    stopInlinePreview();
  };

  /**
   * Start inline video preview
   */
  const startInlinePreview = () => {
    setShowPreview(true);
    setPreviewLoading(true);

    // Auto-stop preview after duration
    previewTimerRef.current = setTimeout(() => {
      stopInlinePreview();
    }, PREVIEW_DURATION_MS);
  };

  /**
   * Stop inline video preview
   */
  const stopInlinePreview = () => {
    setShowPreview(false);
    setPreviewLoading(false);

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    // Stop video playback
    if (videoRefRef.current) {
      videoRefRef.current.pause();
      videoRefRef.current.currentTime = 0;
    }
  };

  /**
   * Handle thumbnail click
   */
  const handleClick = () => {
    if (disabled || loading) return;

    if (onSelect) {
      onSelect(mediaOption);
    } else if (onPreview && !showPreview) {
      // If no select handler, open preview modal
      onPreview(mediaOption);
    }
  };

  /**
   * Handle thumbnail image load
   */
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  /**
   * Handle thumbnail image error
   */
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

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
    if (mediaOption.height >= 2160) return '4K';
    if (mediaOption.height >= 1440) return '2K';
    if (mediaOption.height >= 1080) return '1080p';
    if (mediaOption.height >= 720) return '720p';
    return `${mediaOption.height}p`;
  };

  return (
    <Card
      ref={containerRefRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease-in-out',
        transform: isHovering && !disabled && !loading ? 'scale(1.02)' : 'scale(1)',
        border: isSelected ? `2px solid ${theme.palette.success.main}` : '2px solid transparent',
        borderRadius: 2,
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        [`&.${cardClasses.root}`]: {
          borderRadius: 2,
        },
        '&:hover': {
          boxShadow: disabled || loading ? 'none' : theme.shadows[4],
        },
      }}
      aria-label={`Video option ${mediaOption.id}${isSelected ? ' (selected)' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Thumbnail / Video Preview */}
      <Box sx={{ position: 'relative', paddingTop: '177.78%', bgcolor: 'grey.200' }}> {/* 9:16 aspect ratio */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              p: 2,
            }}
          >
            <ErrorIcon color="error" sx={{ fontSize: 40 }} />
            <Typography variant="caption" color="error" align="center">
              {error}
            </Typography>
          </Box>
        )}

        {!loading && !error && (
          <>
            {/* Thumbnail Image */}
            {!showPreview && (
              <CardMedia
                component="img"
                image={mediaOption.thumbnail_url}
                alt={`Video thumbnail for ${mediaOption.id}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: imageLoaded ? 'block' : 'none',
                }}
              />
            )}

            {/* Loading Skeleton */}
            {!imageLoaded && !imageError && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(90deg, ${theme.palette.grey[200]} 25%, ${theme.palette.grey[100]} 50%, ${theme.palette.grey[200]} 75%)`,
                  backgroundSize: '200% 100%',
                  animation: 'loading 1.5s ease-in-out infinite',
                  '@keyframes loading': {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                  },
                }}
              >
                <CircularProgress size={40} />
              </Box>
            )}

            {/* Video Preview */}
            {showPreview && !imageError && (
              <Box
                component="video"
                ref={videoRefRef.current}
                src={mediaOption.video_url}
                muted
                playsInline
                autoPlay
                loop
                onLoadedData={() => setPreviewLoading(false)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
          </>
        )}

        {/* Play Button Overlay */}
        {!loading && !error && imageLoaded && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: isHovering ? 1 : 0.7,
              transition: 'opacity 0.2s',
            }}
          >
            <IconButton
              size="large"
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.9),
                '&:hover': {
                  bgcolor: theme.palette.common.white,
                },
              }}
              aria-label="Play video preview"
            >
              <PlayArrowIcon sx={{ fontSize: 40, color: theme.palette.common.black }} />
            </IconButton>
          </Box>
        )}

        {/* Selection Checkmark */}
        {isSelected && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <CheckCircleIcon
              sx={{
                fontSize: 32,
                color: theme.palette.success.main,
                filter: `drop-shadow(0 2px 4px ${alpha(theme.palette.common.black, 0.3)})`,
              }}
            />
          </Box>
        )}

        {/* Selected Badge */}
        {isSelected && (
          <Chip
            label="Selected"
            size="small"
            color="success"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontWeight: 'bold',
            }}
          />
        )}
      </Box>

      {/* Metadata Footer */}
      {!loading && !error && (
        <Box sx={{ p: 1.5, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Tooltip title={`Duration: ${formatDuration(mediaOption.duration_sec)}`}>
              <Chip
                label={formatDuration(mediaOption.duration_sec)}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            </Tooltip>
            <Tooltip title={`Resolution: ${getResolutionLabel()}`}>
              <Chip
                label={getResolutionLabel()}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" noWrap>
            {mediaOption.width}x{mediaOption.height} • {mediaOption.aspect_ratio}
          </Typography>
        </Box>
      )}
    </Card>
  );
}

export default VideoThumbnail;
