/**
 * Enhanced SceneCard Component with Media Options Integration
 *
 * Extended SceneCard that displays Pexels video search results.
 * Shows media options thumbnails, selection state, and real-time updates.
 *
 * Features:
 * - Real-time media subscription via useMediaSubscription
 * - Horizontal scroll of video thumbnails
 * - Loading state during Pexels search
 * - Refresh button with rate limiting
 * - Selection persistence
 * - Error handling and retry
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  useTheme,
  Paper,
  Fade,
  CircularProgress,
  Button,
  IconButton,
  Stack,
  Alert,
  Collapse,
  alpha
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { VideoThumbnail, VideoPreviewModal } from './media-components';
import { useMediaSubscription } from '../../hooks/useMediaSubscription';
import { MediaOption } from './types/media';

// Extend Scene interface to include media search status
interface EnhancedScene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  duration_sec_draft: number;
  duration_sec_final: number | null;
  primary_keyword: string;
  subtitle_style_preset_id: number;
  created_at: string;
  updated_at: string;
  // Media search fields
  media_search_status?: 'searching' | 'completed' | 'no_results' | 'failed' | null;
  media_searched_at?: string | null;
  media_search_error?: string | null;
}

interface EnhancedSceneCardProps {
  scene: EnhancedScene;
  index: number;
  onEdit?: (scene: EnhancedScene) => void;
  onDragStart?: (e: React.DragEvent, scene: EnhancedScene) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, scene: EnhancedScene) => void;
  isDragging?: boolean;
  showSaveConfirmation?: boolean;
}

// Subtitle preset icons (simplified visual representation)
const PRESET_ICONS: Record<number, string> = {
  1: 'M', // Minimal
  2: 'H', // Highlight
  3: 'K'  // Karaoke
};

const PRESET_COLORS: Record<number, string> = {
  1: '#4caf50', // Green for Minimal
  2: '#ff9800', // Orange for Highlight
  3: '#2196f3'  // Blue for Karaoke
};

/**
 * EnhancedSceneCard Component
 *
 * Displays scene info with integrated media options section.
 */
export function EnhancedSceneCard({
  scene,
  index,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
  showSaveConfirmation = false
}: EnhancedSceneCardProps) {
  const theme = useTheme();

  // Media preview state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewOption, setPreviewOption] = useState<MediaOption | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [showMediaSection, setShowMediaSection] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Real-time media subscription
  const {
    mediaOptions,
    selectedOption,
    isLoading: isMediaLoading,
    error: mediaError,
    refresh: refreshMedia
  } = useMediaSubscription({
    sceneId: scene.id,
    enabled: true // Always enabled for automatic updates
  });

  /**
   * Handle thumbnail preview
   */
  const handlePreview = useCallback((option: MediaOption) => {
    setPreviewOption(option);
    setPreviewModalOpen(true);
  }, []);

  /**
   * Handle keyboard navigation for media options
   */
  const handleThumbnailKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    // Arrow left/right navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      setFocusedIndex(index - 1);
      // Focus the previous thumbnail
      const prevThumb = document.getElementById(`thumbnail-${scene.id}-${index - 1}`);
      prevThumb?.focus();
    } else if (e.key === 'ArrowRight' && index < mediaOptions.length - 1) {
      e.preventDefault();
      setFocusedIndex(index + 1);
      // Focus the next thumbnail
      const nextThumb = document.getElementById(`thumbnail-${scene.id}-${index + 1}`);
      nextThumb?.focus();
    }
  }, [scene.id, mediaOptions.length]);

  /**
   * Handle video selection
   */
  const handleSelect = useCallback(async (option: MediaOption) => {
    try {
      setSelectionError(null);

      // Call API to select video
      const { supabase } = await import('../services/supabase');
      const token = await supabase.auth.getSession();

      const response = await fetch('/api/v1/media/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.data.session?.access_token}`
        },
        body: JSON.stringify({
          sceneId: scene.id,
          mediaOptionId: option.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to select video');
      }

      // Real-time subscription will update the UI
      console.log('[SceneCard] Selected video:', option.id);
    } catch (err) {
      console.error('[SceneCard] Selection error:', err);
      setSelectionError(err instanceof Error ? err.message : 'Failed to select video');
    }
  }, [scene.id]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = useCallback(async () => {
    // Rate limiting: 60-second cooldown
    const now = Date.now();
    const secondsSinceLastRefresh = (now - lastRefreshTime) / 1000;

    if (secondsSinceLastRefresh < 60) {
      const remainingSeconds = Math.ceil(60 - secondsSinceLastRefresh);
      setRefreshError(`Please wait ${remainingSeconds} seconds before refreshing`);
      setTimeout(() => setRefreshError(null), 3000);
      return;
    }

    try {
      setIsRefreshing(true);
      setRefreshError(null);

      // Call refresh API
      const { supabase } = await import('../services/supabase');
      const token = await supabase.auth.getSession();

      const response = await fetch('/api/v1/media/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.data.session?.access_token}`
        },
        body: JSON.stringify({
          sceneId: scene.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to refresh media');
      }

      // Update last refresh time
      setLastRefreshTime(now);

      // Real-time subscription will update the UI
      console.log('[SceneCard] Refreshed media for scene:', scene.id);
    } catch (err) {
      console.error('[SceneCard] Refresh error:', err);
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh media');
      setTimeout(() => setRefreshError(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  }, [scene.id, lastRefreshTime]);

  /**
   * Handle card click (edit mode)
   */
  const handleClick = () => {
    // Don't open edit if clicking on media controls
    if (onEdit) {
      onEdit(scene);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, scene);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (onDrop) {
      onDrop(e, scene);
    }
  };

  /**
   * Render media search status indicator
   */
  const renderMediaStatus = () => {
    if (!scene.media_search_status || scene.media_search_status === 'failed') {
      return null;
    }

    switch (scene.media_search_status) {
      case 'searching':
        return (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Searching for media...
            </Typography>
          </Stack>
        );

      case 'completed':
        if (mediaOptions.length === 0) {
          return null; // No options to show
        }
        return (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AutoAwesomeIcon color="success" fontSize="small" />
              <Typography variant="caption" color="success.main" fontWeight={600}>
                {mediaOptions.length} video options found
              </Typography>
            </Stack>
          </Box>
        );

      case 'no_results':
        return (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="caption">
              No videos found for "{scene.primary_keyword}". Try updating the scene keywords.
            </Typography>
          </Alert>
        );

      default:
        return null;
    }
  };

  /**
   * Render media options section
   */
  const renderMediaOptions = () => {
    if (isMediaLoading && mediaOptions.length === 0) {
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
            <Typography variant="caption" color="text.secondary">
              Loading media options...
            </Typography>
          </Stack>
        </Box>
      );
    }

    if (mediaOptions.length === 0) {
      return null;
    }

    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        {/* Media options header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            VIDEO OPTIONS
          </Typography>
          <Box sx={{ flexGrow: 1 }} />

          {/* Refresh button */}
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isRefreshing || scene.media_search_status === 'searching'}
            sx={{ fontSize: '0.7rem' }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {/* Collapse button */}
          <IconButton
            size="small"
            onClick={() => setShowMediaSection(!showMediaSection)}
            sx={{ transform: showMediaSection ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Refresh error */}
        {refreshError && (
          <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
            <Typography variant="caption">{refreshError}</Typography>
          </Alert>
        )}

        {/* Selection error */}
        {selectionError && (
          <Alert severity="error" sx={{ mb: 1, py: 0 }}>
            <Typography variant="caption">{selectionError}</Typography>
          </Alert>
        )}

        {/* Media options thumbnails - collapsible */}
        <Collapse in={showMediaSection}>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 1,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                borderRadius: 3,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                }
              }
            }}
          >
            {mediaOptions.map((option, index) => (
              <Box
                key={option.id}
                id={`thumbnail-${scene.id}-${index}`}
                tabIndex={0}
                sx={{
                  minWidth: 120,
                  maxWidth: 120,
                  flexShrink: 0,
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                    borderRadius: 1
                  }
                }}
                onKeyDown={(e) => handleThumbnailKeyDown(e, index)}
              >
                <VideoThumbnail
                  mediaOption={option}
                  isSelected={option.is_selected}
                  onSelect={handleSelect}
                  onPreview={handlePreview}
                />
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <Card
      data-testid="scene-card"
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        border: `2px solid ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[6],
          borderColor: theme.palette.primary.light
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: Scene number + Drag handle + Save confirmation */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {onDragStart && (
              <DragIndicatorIcon
                sx={{
                  fontSize: 20,
                  color: 'text.secondary',
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Scene {index + 1}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Save confirmation checkmark */}
            {showSaveConfirmation && (
              <Fade in={showSaveConfirmation}>
                <CheckCircleIcon
                  sx={{
                    fontSize: 18,
                    color: 'success.main'
                  }}
                />
              </Fade>
            )}

            {/* Duration badge */}
            <Chip
              label={`${scene.duration_sec_draft}s`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: 'action.hover',
                color: 'text.secondary',
                fontWeight: 500
              }}
            />
          </Box>
        </Box>

        {/* Thumbnail placeholder */}
        <Box
          sx={{
            width: '100%',
            aspectRatio: '16/9',
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.light} 100%)`,
            borderRadius: 1,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '2rem',
            fontWeight: 'bold',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Scene number as large background text */}
          <Typography
            sx={{
              fontSize: '3rem',
              fontWeight: 700,
              opacity: 0.3,
              position: 'absolute'
            }}
          >
            {index + 1}
          </Typography>

          {/* Selected video overlay (if video is selected) */}
          {selectedOption && (
            <Box
              component="img"
              src={selectedOption.thumbnail_url}
              alt={selectedOption.video_url}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.8
              }}
            />
          )}
        </Box>

        {/* Narration text (truncated) */}
        <Typography
          variant="body2"
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            mb: 1.5,
            lineHeight: 1.4,
            color: 'text.primary'
          }}
        >
          {scene.narration_text}
        </Typography>

        {/* Media search status */}
        {renderMediaStatus()}

        {/* Media options section */}
        {renderMediaOptions()}

        {/* Footer: Keyword + Subtitle preset */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap'
          }}
        >
          {/* Keyword tag */}
          <Chip
            label={scene.primary_keyword}
            size="small"
            sx={{
              maxWidth: '60%',
              height: 24,
              fontSize: '0.7rem',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }
            }}
          />

          {/* Subtitle preset indicator */}
          <Paper
            sx={{
              px: 1,
              py: 0.25,
              backgroundColor: PRESET_COLORS[scene.subtitle_style_preset_id] || '#757575',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 600,
              borderRadius: 1,
              minWidth: 24,
              textAlign: 'center'
            }}
          >
            {PRESET_ICONS[scene.subtitle_style_preset_id] || '?'}
          </Paper>
        </Box>
      </CardContent>

      {/* Video Preview Modal */}
      {previewOption && (
        <VideoPreviewModal
          mediaOption={previewOption}
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewOption(null);
          }}
          onSelect={handleSelect}
        />
      )}
    </Card>
  );
}

export default EnhancedSceneCard;
