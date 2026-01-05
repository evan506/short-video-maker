/**
 * SceneEditDialog Component
 *
 * Modal dialog for editing scene properties:
 * - Duration (with validation ≥1s and total duration check)
 * - Keyword
 * - Subtitle preset selector
 * - "Apply to all" confirmation for subtitle presets
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useUpdateScene, useBatchUpdateScenes } from '../../hooks/use-scenes';

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

interface SceneEditDialogProps {
  open: boolean;
  scene: Scene | null;
  allScenes?: Scene[];
  projectTargetDuration?: number; // Target duration for total duration check
  onClose: () => void;
  onSave?: (updatedScene: Scene) => void;
}

// Subtitle presets
const SUBTITLE_PRESETS = [
  { id: 1, name: 'Minimal', description: 'Static text at bottom' },
  { id: 2, name: 'Highlight', description: 'Text with background box' },
  { id: 3, name: 'Karaoke', description: 'Word-by-word highlighting (visual only)' }
];

/**
 * SceneEditDialog Component
 *
 * Features:
 * - Duration editing with validation (T048)
 * - Keyword editing (T049)
 * - Subtitle preset selector (T050)
 * - "Apply to all" button with confirmation (T051)
 * - Total duration check (blocks save if sum exceeds target)
 */
export function SceneEditDialog({
  open,
  scene,
  allScenes = [],
  projectTargetDuration = 60,
  onClose,
  onSave
}: SceneEditDialogProps) {
  // Form state
  const [duration, setDuration] = useState<number>(scene?.duration_sec_draft || 5);
  const [keyword, setKeyword] = useState<string>(scene?.primary_keyword || '');
  const [subtitlePreset, setSubtitlePreset] = useState<number>(scene?.subtitle_style_preset_id || 1);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [showApplyToAllConfirm, setShowApplyToAllConfirm] = useState<boolean>(false);

  // Validation state
  const [durationError, setDurationError] = useState<string>('');
  const [totalDurationError, setTotalDurationError] = useState<string>('');

  // Mutations
  const updateScene = useUpdateScene();
  const batchUpdateScenes = useBatchUpdateScenes();

  // Update form when scene changes
  useEffect(() => {
    if (scene) {
      setDuration(scene.duration_sec_draft);
      setKeyword(scene.primary_keyword);
      setSubtitlePreset(scene.subtitle_style_preset_id);
      setApplyToAll(false);
      setDurationError('');
      setTotalDurationError('');
    }
  }, [scene]);

  // Validate duration (≥1 second)
  const validateDuration = (value: number) => {
    if (value < 1) {
      setDurationError('Duration must be at least 1 second');
      return false;
    }
    setDurationError('');
    return true;
  };

  // Check total duration (sum of all scenes)
  const validateTotalDuration = (newDuration: number) => {
    if (!scene) return true;

    const currentTotal = allScenes.reduce((sum, s) => sum + s.duration_sec_draft, 0);
    const currentSceneDuration = scene.duration_sec_draft;
    const newTotal = currentTotal - currentSceneDuration + newDuration;

    if (newTotal > projectTargetDuration) {
      setTotalDurationError(
        `Total duration would be ${newTotal}s (exceeds ${projectTargetDuration}s target)`
      );
      return false;
    }

    setTotalDurationError('');
    return true;
  };

  // Handle duration change
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setDuration(value);
    validateDuration(value);
    validateTotalDuration(value);
  };

  // Handle save
  const handleSave = async () => {
    if (!scene) return;

    // Validate duration
    if (!validateDuration(duration)) {
      return;
    }

    // Validate total duration
    if (!validateTotalDuration(duration)) {
      return;
    }

    // Validate keyword
    if (!keyword.trim()) {
      setDurationError('Keyword cannot be empty');
      return;
    }

    // If "Apply to all" is checked for subtitle preset, show confirmation
    if (applyToAll) {
      setShowApplyToAllConfirm(true);
      return;
    }

    // Perform single scene update
    try {
      const updatedScene = await updateScene.mutateAsync({
        sceneId: scene.id,
        updates: {
          duration_sec_draft: duration,
          primary_keyword: keyword.trim(),
          subtitle_style_preset_id: subtitlePreset
        }
      });

      if (onSave) {
        onSave(updatedScene);
      }
      onClose();
    } catch (error) {
      console.error('Failed to update scene:', error);
    }
  };

  // Handle "Apply to all" confirmation
  const handleApplyToAllConfirm = async () => {
    if (!scene || !allScenes.length) return;

    try {
      const sceneIds = allScenes.map(s => s.id);

      await batchUpdateScenes.mutateAsync({
        sceneIds,
        updates: {
          subtitle_style_preset_id: subtitlePreset
        }
      });

      setShowApplyToAllConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to apply to all:', error);
    }
  };

  // Handle cancel "Apply to all"
  const handleApplyToAllCancel = () => {
    setShowApplyToAllConfirm(false);
    setApplyToAll(false);
  };

  const isValid = !durationError && !totalDurationError && keyword.trim() && duration >= 1;
  const isPending = updateScene.isPending || batchUpdateScenes.isPending;

  return (
    <>
      {/* Main Edit Dialog */}
      <Dialog open={open && !showApplyToAllConfirm} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Scene {scene?.order_index !== undefined ? scene.order_index + 1 : ''}</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Duration field (T048) */}
            <TextField
              label="Duration (seconds)"
              type="number"
              value={duration}
              onChange={handleDurationChange}
              error={!!durationError || !!totalDurationError}
              helperText={durationError || totalDurationError || `Current: ${scene?.duration_sec_draft}s`}
              inputProps={{ min: 1, step: 1 }}
              fullWidth
              disabled={isPending}
            />

            {/* Keyword field (T049) */}
            <TextField
              label="Primary Keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter main keyword for this scene"
              fullWidth
              disabled={isPending}
              helperText="Used for visual search and thumbnail generation"
            />

            {/* Subtitle preset selector (T050) */}
            <FormControl fullWidth>
              <InputLabel>Subtitle Preset</InputLabel>
              <Select
                value={subtitlePreset}
                onChange={(e) => setSubtitlePreset(e.target.value as number)}
                label="Subtitle Preset"
                disabled={isPending}
              >
                {SUBTITLE_PRESETS.map((preset) => (
                  <MenuItem key={preset.id} value={preset.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2">{preset.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {preset.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* "Apply to all" checkbox (T051) */}
            {scene && (
              <Box
                sx={{
                  p: 2,
                  border: `1px solid ${applyToAll ? 'primary.main' : 'divider'}`,
                  borderRadius: 1,
                  backgroundColor: applyToAll ? 'action.selected' : 'transparent'
                }}
              >
                <Typography variant="body2" gutterBottom color={applyToAll ? 'primary.main' : 'text.primary'}>
                  Apply subtitle preset to all scenes?
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  This will overwrite the subtitle preset for all {allScenes.length} scenes
                </Typography>
                <Button
                  size="small"
                  variant={applyToAll ? 'contained' : 'outlined'}
                  onClick={() => setApplyToAll(!applyToAll)}
                  disabled={isPending}
                >
                  {applyToAll ? 'Selected' : 'Apply to All'}
                </Button>
              </Box>
            )}

            {/* Total duration info */}
            {scene && allScenes.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Total duration: {allScenes.reduce((sum, s) => {
                    const currentSceneDuration = s.id === scene.id ? duration : s.duration_sec_draft;
                    return sum + currentSceneDuration;
                  }, 0)}s / {projectTargetDuration}s
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!isValid || isPending}
            startIcon={isPending ? <CircularProgress size={16} /> : null}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* "Apply to All" Confirmation Dialog (T051) */}
      <Dialog open={showApplyToAllConfirm} onClose={handleApplyToAllCancel}>
        <DialogTitle>Apply to All Scenes?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will overwrite the subtitle preset for all {allScenes.length} scenes.
          </Alert>
          <Typography variant="body1" gutterBottom>
            You're about to apply the <strong>{SUBTITLE_PRESETS.find(p => p.id === subtitlePreset)?.name}</strong> subtitle preset to all scenes.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will change the subtitle style for the entire storyboard. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleApplyToAllCancel} disabled={batchUpdateScenes.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyToAllConfirm}
            variant="contained"
            color="warning"
            disabled={batchUpdateScenes.isPending}
            startIcon={batchUpdateScenes.isPending ? <CircularProgress size={16} /> : null}
          >
            {batchUpdateScenes.isPending ? 'Applying...' : 'Apply to All'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
