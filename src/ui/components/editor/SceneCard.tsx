/**
 * SceneCard Component
 *
 * Individual scene card with thumbnail, narration, duration, keyword, and preset.
 * Displays drag handle and opens edit dialog on click.
 * Includes TTS preview button and player (WP04: T024-T029).
 */

import React, { useState } from 'react';
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
  Collapse,
  Button,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { TTSPreviewPlayer } from '../audio/TTSPreviewPlayer';

interface Scene {
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
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  onEdit?: (scene: Scene) => void;
  onDragStart?: (e: React.DragEvent, scene: Scene) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, scene: Scene) => void;
  isDragging?: boolean;
  showSaveConfirmation?: boolean;
  projectId?: string; // For TTS preview context
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
 * SceneCard Component
 *
 * Displays:
 * - Thumbnail placeholder (colored div with gradient)
 * - Narration text (truncated)
 * - Duration badge
 * - Keyword tag
 * - Subtitle preset indicator
 * - Drag handle for reordering
 * - Save confirmation checkmark
 */
export function SceneCard({
  scene,
  index,
  onEdit,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
  showSaveConfirmation = false,
  projectId,
}: SceneCardProps) {
  const theme = useTheme();

  // TTS preview state (T024-T029)
  const [showPreview, setShowPreview] = useState(false);

  const handleClick = () => {
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
   * Toggle TTS preview section
   * Prevents card click when preview button is clicked
   */
  const handleTogglePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreview((prev) => !prev);
  };

  /**
   * Prevent card click when interacting with preview player
   */
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

        {/* Thumbnail placeholder (T055) */}
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

        {/* TTS Preview Section (T024-T029) */}
        <Box sx={{ mt: 1.5 }}>
          {/* Preview Voiceover button */}
          {!showPreview ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<VolumeUpIcon />}
              onClick={handleTogglePreview}
              disabled={!scene.narration_text || scene.narration_text.trim().length === 0}
              sx={{
                fontSize: '0.75rem',
                py: 0.5,
                width: '100%',
                justifyContent: 'flex-start',
              }}
            >
              Preview Voiceover
            </Button>
          ) : (
            <Collapse in={showPreview}>
              <Box
                onClick={handlePreviewClick}
                sx={{
                  p: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                {/* Header: Close button */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    TTS Preview
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleTogglePreview}
                    sx={{ transform: showPreview ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <ExpandMoreIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                {/* TTS Preview Player */}
                <TTSPreviewPlayer
                  sceneId={scene.id}
                  narrationText={scene.narration_text}
                  compact={true}
                />
              </Box>
            </Collapse>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
