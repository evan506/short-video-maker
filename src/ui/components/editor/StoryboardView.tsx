/**
 * StoryboardView Component
 *
 * Displays scene cards in a grid layout with version mismatch detection,
 * one-time generation logic, and regenerate confirmation dialog.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import {
  useScenes,
  useGenerateScenes,
  useDeleteScenes,
  useVersionMismatch
} from '../../hooks/use-scenes';

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

interface StoryboardViewProps {
  projectId: string;
}

/**
 * StoryboardView Component
 *
 * Features:
 * - One-time generation: Auto-generates scenes on first visit
 * - Version mismatch detection: Shows warning if script changed
 * - Scene grid display with SceneCard components
 * - Regenerate confirmation dialog
 */
export function StoryboardView({ projectId }: StoryboardViewProps) {
  const theme = useTheme();
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Queries
  const { data: scenesData, isLoading: isLoadingScenes, error: scenesError } = useScenes(projectId);
  const { data: versionData, isLoading: isLoadingVersion } = useVersionMismatch(projectId);

  // Mutations
  const generateScenes = useGenerateScenes();
  const deleteScenes = useDeleteScenes();

  const scenes = scenesData?.scenes || [];
  const scenesExist = scenesData?.scenesExist || false;
  const hasVersionMismatch = versionData?.hasMismatch || false;

  // One-time generation logic (T041)
  useEffect(() => {
    if (!hasInitialized && !isLoadingScenes && !isLoadingVersion) {
      setHasInitialized(true);

      // If no scenes exist, generate them automatically
      if (!scenesExist) {
        handleGenerateScenes();
      }
    }
  }, [hasInitialized, isLoadingScenes, isLoadingVersion, scenesExist]);

  /**
   * Generate scenes (first time or regenerate)
   */
  const handleGenerateScenes = async () => {
    try {
      await generateScenes.mutateAsync({
        projectId,
        forceRegenerate: hasVersionMismatch
      });
      setShowRegenerateDialog(false);
    } catch (error) {
      console.error('Failed to generate scenes:', error);
    }
  };

  /**
   * Show regenerate confirmation dialog
   */
  const handleShowRegenerateDialog = () => {
    setShowRegenerateDialog(true);
  };

  /**
   * Cancel regeneration
   */
  const handleCancelRegenerate = () => {
    setShowRegenerateDialog(false);
  };

  // Loading state
  if (isLoadingScenes || isLoadingVersion) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Loading storyboard...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (scenesError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load scenes: {scenesError.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Version Mismatch Warning Banner (T039) */}
      {hasVersionMismatch && scenesExist && (
        <Alert
          severity="warning"
          icon={<WarningIcon fontSize="inherit" />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={handleShowRegenerateDialog}
            >
              Regenerate Scenes
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Script has been updated.</strong> Scenes may not match the current script.
            Click "Regenerate Scenes" to update the storyboard, or keep the existing scenes.
          </Typography>
        </Alert>
      )}

      {/* Header with actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h5" component="h2">
          Storyboard
        </Typography>
        {scenesExist && !hasVersionMismatch && (
          <Button
            variant="outlined"
            color="warning"
            onClick={handleShowRegenerateDialog}
          >
            Regenerate Scenes
          </Button>
        )}
      </Box>

      {/* Scene Grid Layout (T038) */}
      {scenes.length === 0 ? (
        // Empty state
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {generateScenes.isPending ? (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Generating scenes from script...
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                No scenes yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Generate a script first, then scenes will be automatically created.
              </Typography>
            </>
          )}
        </Paper>
      ) : (
        // Scene grid
        <Grid container spacing={2}>
          {scenes.map((scene, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={scene.id}>
              <SceneCard scene={scene} index={index} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Regenerate Confirmation Dialog (T040) */}
      <Dialog
        open={showRegenerateDialog}
        onClose={handleCancelRegenerate}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regenerate Scenes?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will overwrite your existing scenes with new ones generated from the
            current script.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Any manual edits you made to scenes will be lost. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRegenerate} disabled={generateScenes.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateScenes}
            variant="contained"
            color="warning"
            disabled={generateScenes.isPending}
            startIcon={generateScenes.isPending ? <CircularProgress size={20} /> : null}
          >
            {generateScenes.isPending ? 'Regenerating...' : 'Regenerate Anyway'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * SceneCard Component
 *
 * Displays individual scene with narration, duration, and keyword
 */
interface SceneCardProps {
  scene: Scene;
  index: number;
}

function SceneCard({ scene, index }: SceneCardProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        },
        cursor: 'pointer'
      }}
    >
      {/* Scene number */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Scene {index + 1}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {scene.duration_sec_draft}s
        </Typography>
      </Box>

      {/* Thumbnail placeholder */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: theme.palette.action.hover,
          borderRadius: 1,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.text.hint
        }}
      >
        <Typography variant="caption">Thumbnail</Typography>
      </Box>

      {/* Narration text */}
      <Typography
        variant="body2"
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          mb: 1
        }}
      >
        {scene.narration_text}
      </Typography>

      {/* Keyword badge */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          flexWrap: 'wrap'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 1,
            py: 0.5,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderRadius: 1
          }}
        >
          {scene.primary_keyword}
        </Typography>
      </Box>
    </Paper>
  );
}
