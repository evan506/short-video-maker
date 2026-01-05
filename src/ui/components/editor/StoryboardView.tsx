/**
 * StoryboardView Component - Updated for WP03
 *
 * Displays scene cards in a grid layout with:
 * - Scene editing (duration, keyword, subtitle preset)
 * - Drag-and-drop reordering
 * - Version mismatch detection
 * - One-time generation logic
 * - Visual save confirmation
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
  Snackbar,
  Typography,
  useTheme
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SceneCard } from './SceneCard';
import { SceneEditDialog } from './SceneEditDialog';
import {
  useScenes,
  useGenerateScenes,
  useDeleteScenes,
  useVersionMismatch,
  useReorderScenes
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
  projectTargetDuration?: number;
}

/**
 * StoryboardView Component
 *
 * Features:
 * - Scene grid with editable cards (T043, T055)
 * - Edit dialog with validation (T044, T048-T051)
 * - Drag-and-drop reordering (T052)
 * - Optimistic updates (T053)
 * - Visual save confirmation (T054)
 * - Version mismatch detection
 * - One-time generation
 */
export function StoryboardView({ projectId, projectTargetDuration = 60 }: StoryboardViewProps) {
  const theme = useTheme();

  // Dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Drag-and-drop state
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null);
  const [scenesOrder, setScenesOrder] = useState<Scene[]>([]);

  // Initialization flag
  const [hasInitialized, setHasInitialized] = useState(false);

  // Queries
  const { data: scenesData, isLoading: isLoadingScenes, error: scenesError } = useScenes(projectId);
  const { data: versionData, isLoading: isLoadingVersion } = useVersionMismatch(projectId);

  // Mutations
  const generateScenes = useGenerateScenes();
  const deleteScenes = useDeleteScenes();
  const reorderScenes = useReorderScenes();

  const scenes = scenesData?.scenes || [];
  const scenesExist = scenesData?.scenesExist || false;
  const hasVersionMismatch = versionData?.hasMismatch || false;

  // Sync scenesOrder when scenes change
  useEffect(() => {
    if (scenes.length > 0 && scenesOrder.length === 0) {
      setScenesOrder([...scenes]);
    } else if (scenes.length > 0 && scenes.length === scenesOrder.length) {
      // Update if data changed but order is same
      setScenesOrder([...scenes]);
    }
  }, [scenes]);

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

  /**
   * Open edit dialog for a scene
   */
  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
  };

  /**
   * Close edit dialog
   */
  const handleCloseEditDialog = () => {
    setEditingScene(null);
  };

  /**
   * Handle scene save
   */
  const handleSceneSave = (updatedScene: Scene) => {
    // Show save confirmation (T054)
    setShowSaveConfirmation(true);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      setShowSaveConfirmation(false);
    }, 2000);
  };

  /**
   * Drag-and-drop handlers (T052)
   */
  const handleDragStart = (e: React.DragEvent, scene: Scene) => {
    setDraggedScene(scene);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetScene: Scene) => {
    e.preventDefault();

    if (!draggedScene || draggedScene.id === targetScene.id) {
      setDraggedScene(null);
      return;
    }

    // Reorder scenes locally (optimistic update)
    const newOrder = [...scenesOrder];
    const draggedIndex = newOrder.findIndex(s => s.id === draggedScene.id);
    const targetIndex = newOrder.findIndex(s => s.id === targetScene.id);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedScene);

    // Update order_index for all scenes
    const reorderedScenes = newOrder.map((scene, index) => ({
      ...scene,
      order_index: index
    }));

    setScenesOrder(reorderedScenes);
    setDraggedScene(null);

    // Call reorder endpoint
    try {
      const sceneIds = reorderedScenes.map(s => s.id);
      await reorderScenes.mutateAsync({
        projectId,
        sceneIds
      });
    } catch (error) {
      console.error('Failed to reorder scenes:', error);
      // Rollback on error
      setScenesOrder([...scenes]);
    }
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

      {/* Save confirmation snackbar (T054) */}
      <Snackbar
        open={showSaveConfirmation}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          icon={<CheckCircleIcon fontSize="inherit" />}
          severity="success"
          sx={{ width: '100%' }}
        >
          Scene saved successfully!
        </Alert>
      </Snackbar>

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
        // Scene grid with drag-and-drop (T052)
        <Grid container spacing={2}>
          {scenesOrder.map((scene, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={scene.id}>
              <SceneCard
                scene={scene}
                index={index}
                onEdit={handleEditScene}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedScene?.id === scene.id}
                showSaveConfirmation={showSaveConfirmation && editingScene?.id === scene.id}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Scene Edit Dialog (T044) */}
      <SceneEditDialog
        open={!!editingScene}
        scene={editingScene}
        allScenes={scenes}
        projectTargetDuration={projectTargetDuration}
        onClose={handleCloseEditDialog}
        onSave={handleSceneSave}
      />

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
