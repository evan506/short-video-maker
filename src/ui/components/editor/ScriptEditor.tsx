/**
 * ScriptEditor Component
 *
 * Main component for script generation and editing.
 * Provides tabbed interface with topic input form and script editor.
 *
 * T019-T027: Complete script editor implementation
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useScript } from '../../hooks/use-script';
import { useNavigate } from 'react-router-dom';

interface ScriptEditorProps {
  projectId: string;
}

interface TopicFormData {
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  targetDuration: 15 | 30 | 60;
  videoType: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const {
    scripts,
    currentScript,
    isLoading,
    isGenerating,
    isQuickEditing,
    isCreating,
    isRestoring,
    error,
    generateError,
    quickEditError,
    createError,
    restoreError,
    generateScript,
    quickEdit,
    createScript,
    restoreScript,
    refetchScripts,
  } = useScript(projectId);

  // Form state
  const [formData, setFormData] = useState<TopicFormData>({
    topic: '',
    platform: 'shorts',
    targetDuration: 30,
    videoType: 'Explainer',
  });

  // Validation state
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TopicFormData, string>>>({});

  // Script editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // Version history state
  const [historyOpen, setHistoryOpen] = useState(false);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewOperation, setPreviewOperation] = useState('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // T024: Loading states helper
  const isAnyLoading = isLoading || isGenerating || isQuickEditing || isCreating || isRestoring;

  // T020: Form validation
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TopicFormData, string>> = {};

    if (!formData.topic || formData.topic.length < 10) {
      errors.topic = 'Topic must be at least 10 characters';
    }
    if (formData.topic.length > 500) {
      errors.topic = 'Topic must be at most 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof TopicFormData) => (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Generate script
  const handleGenerateScript = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await generateScript(formData);
      showSnackbar('Script generated successfully!', 'success');
      setIsEditing(false);
    } catch (err) {
      showSnackbar(generateError?.message || 'Failed to generate script', 'error');
    }
  };

  // T022: Quick edit operations
  const handleQuickEdit = async (operation: 'shorten' | 'lengthen' | 'rephrase' | 'tone', tone?: string) => {
    if (!currentScript) return;

    try {
      const result = await quickEdit({ scriptId: currentScript.id, operation, tone });
      setPreviewContent(result.previewContent);
      setPreviewOperation(result.operation);
      setPreviewOpen(true);
    } catch (err) {
      showSnackbar(quickEditError?.message || 'Failed to generate preview', 'error');
    }
  };

  // Apply preview
  const handleApplyPreview = async () => {
    try {
      await createScript(previewContent, 'llm');
      setPreviewOpen(false);
      showSnackbar('New version saved!', 'success');
    } catch (err) {
      showSnackbar(createError?.message || 'Failed to save version', 'error');
    }
  };

  // T023: Manual editing
  const handleStartEditing = () => {
    if (currentScript) {
      setEditedContent(currentScript.content);
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (editedContent.length < 50) {
      showSnackbar('Script content must be at least 50 characters', 'error');
      return;
    }

    try {
      await createScript(editedContent, 'user');
      setIsEditing(false);
      showSnackbar('New version saved!', 'success');
    } catch (err) {
      showSnackbar(createError?.message || 'Failed to save version', 'error');
    }
  };

  // Restore version
  const handleRestoreVersion = async (scriptId: string) => {
    try {
      await restoreScript(scriptId);
      setHistoryOpen(false);
      showSnackbar('Version restored!', 'success');
    } catch (err) {
      showSnackbar(restoreError?.message || 'Failed to restore version', 'error');
    }
  };

  // T025: Show snackbar
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // T027: Navigate to storyboard
  const handleGoToStoryboard = () => {
    navigate(`/editor/${projectId}?tab=storyboard`);
  };

  return (
    <Box>
      {/* T025: Error display with retry */}
      {(error || generateError) && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetchScripts()}>
              Retry
            </Button>
          }
        >
          {error?.message || generateError?.message}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {/* T019: Tabbed interface - Topic Input Section */}
        {!currentScript && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Generate Script from Topic
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              {/* T020: Topic input */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Topic"
                  placeholder="Enter your video topic (e.g., '5 productivity tips for remote workers')"
                  value={formData.topic}
                  onChange={handleFieldChange('topic')}
                  error={!!formErrors.topic}
                  helperText={formErrors.topic || `${formData.topic.length}/500 characters`}
                  disabled={isGenerating}
                />
              </Grid>

              {/* Platform selector */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={formData.platform}
                    label="Platform"
                    onChange={handleFieldChange('platform')}
                    disabled={isGenerating}
                  >
                    <MenuItem value="shorts">YouTube Shorts</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                    <MenuItem value="reels">Instagram Reels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Duration selector */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={formData.targetDuration}
                    label="Duration"
                    onChange={handleFieldChange('targetDuration')}
                    disabled={isGenerating}
                  >
                    <MenuItem value={15}>15 seconds</MenuItem>
                    <MenuItem value={30}>30 seconds</MenuItem>
                    <MenuItem value={60}>60 seconds</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Video type selector */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Video Type</InputLabel>
                  <Select
                    value={formData.videoType}
                    label="Video Type"
                    onChange={handleFieldChange('videoType')}
                    disabled={isGenerating}
                  >
                    <MenuItem value="Explainer">Explainer</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                    <MenuItem value="Tutorial">Tutorial</MenuItem>
                    <MenuItem value="Recipe">Recipe</MenuItem>
                    <MenuItem value="Story">Story</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Generate button */}
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !formData.topic || formData.topic.length < 10}
                  startIcon={isGenerating ? <CircularProgress size={20} /> : null}
                >
                  {isGenerating ? 'Generating Script...' : 'Generate Script'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* T021: Script display area */}
        {currentScript && (
          <Box>
            {/* Header with actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Current Script (Version {currentScript.version})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<HistoryIcon />}
                  onClick={() => setHistoryOpen(true)}
                  disabled={isAnyLoading}
                >
                  Version History
                </Button>
                {!isEditing && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleStartEditing}
                    disabled={isAnyLoading}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>

            {/* Script content display/edit */}
            <TextField
              fullWidth
              multiline
              rows={15}
              value={isEditing ? editedContent : currentScript.content}
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={!isEditing || isCreating}
              error={isEditing && editedContent.length < 50}
              helperText={
                isEditing
                  ? `${editedContent.length}/50 characters minimum`
                  : `Source: ${currentScript.source.toUpperCase()} • ${new Date(currentScript.created_at).toLocaleString()}`
              }
              sx={{
                bgcolor: 'background.paper',
                '& .MuiInputBase-input.Mui-disabled': {
                  color: 'text.primary',
                },
              }}
            />

            {/* T023: Edit mode actions */}
            {isEditing && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={isCreating || editedContent.length < 50}
                  startIcon={isCreating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                  Save as New Version
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelEditing}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </Box>
            )}

            {/* T022: Quick edit buttons */}
            {!isEditing && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Edit Tools
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleQuickEdit('shorten')}
                    disabled={isQuickEditing || isAnyLoading}
                    startIcon={isQuickEditing ? <CircularProgress size={16} /> : null}
                  >
                    Shorten
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleQuickEdit('lengthen')}
                    disabled={isQuickEditing || isAnyLoading}
                    startIcon={isQuickEditing ? <CircularProgress size={16} /> : null}
                  >
                    Lengthen
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleQuickEdit('rephrase')}
                    disabled={isQuickEditing || isAnyLoading}
                    startIcon={isQuickEditing ? <CircularProgress size={16} /> : null}
                  >
                    Rephrase
                  </Button>
                  <Select
                    size="small"
                    defaultValue=""
                    displayEmpty
                    onChange={(e) =>
                      e.target.value && handleQuickEdit('tone', e.target.value as string)
                    }
                    disabled={isAnyLoading}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="" disabled>
                      Change Tone
                    </MenuItem>
                    <MenuItem value="Casual">Casual</MenuItem>
                    <MenuItem value="Professional">Professional</MenuItem>
                    <MenuItem value="Funny">Funny</MenuItem>
                    <MenuItem value="Inspirational">Inspirational</MenuItem>
                  </Select>
                </Box>
              </Box>
            )}

            {/* T027: Go to Storyboard button */}
            <Box sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={handleGoToStoryboard}
                disabled={isAnyLoading}
              >
                Go to Storyboard
              </Button>
            </Box>
          </Box>
        )}

        {/* T024: Loading overlay */}
        {isAnyLoading && (
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
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                {isGenerating && 'Generating script...'}
                {isQuickEditing && 'Processing quick edit...'}
                {isCreating && 'Saving version...'}
                {isRestoring && 'Restoring version...'}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* T021: Version History Sidebar */}
      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <Box sx={{ width: 400, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Version History</Typography>
            <IconButton onClick={() => setHistoryOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            {scripts.map((script) => (
              <ListItem
                key={script.id}
                divider
                selected={script.id === currentScript?.id}
                secondaryAction={
                  script.id !== currentScript?.id && (
                    <Button
                      size="small"
                      onClick={() => handleRestoreVersion(script.id)}
                      disabled={isRestoring}
                    >
                      Restore
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">Version {script.version}</Typography>
                      <Chip
                        label={script.source}
                        size="small"
                        color={script.source === 'llm' ? 'primary' : 'secondary'}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" sx={{ display: 'block' }}>
                        {script.content.slice(0, 50)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(script.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* T022: Preview Modal */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preview: {previewOperation}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Original
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2">{currentScript?.content}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Preview
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="body2">{previewContent}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyPreview}
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={20} /> : null}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* T025: Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
