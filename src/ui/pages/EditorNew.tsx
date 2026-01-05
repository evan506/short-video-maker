/**
 * EditorNew Page Component
 *
 * Create new project page (T061):
 * - Form for topic, platform, video type, target duration
 * - Auto-generates title from topic (T068)
 * - Redirects to /editor/:projectId after creation
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../hooks/use-project';

/**
 * EditorNew Component
 *
 * Features:
 * - Project creation form (T061)
 * - Title auto-generation from topic (T068)
 * - Validation: topic min 10 chars
 * - Redirect to editor after creation
 */
export function EditorNew() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  // Form state
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<'shorts' | 'tiktok' | 'reels'>('shorts');
  const [videoType, setVideoType] = useState<'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story'>('Explainer');
  const [targetDuration, setTargetDuration] = useState<15 | 30 | 60>(60);
  const [error, setError] = useState('');

  // Validation
  const isValid = topic.length >= 10 && platform && videoType && targetDuration;

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate topic
    if (topic.length < 10) {
      setError('Topic must be at least 10 characters');
      return;
    }

    try {
      const project = await createProject.mutateAsync({
        topic,
        platform,
        video_type: videoType,
        target_duration: targetDuration
      });

      // Redirect to editor with project ID (T061)
      navigate(`/editor/${project.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Project
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Enter your topic and video settings to get started. The title will be auto-generated from your topic.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Topic field (minimum 10 characters) */}
            <TextField
              label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe your video topic (minimum 10 characters)"
              multiline
              rows={4}
              required
              fullWidth
              error={topic.length > 0 && topic.length < 10}
              helperText={topic.length > 0 && topic.length < 10 ? 'Topic must be at least 10 characters' : `${topic.length}/10 characters`}
              disabled={createProject.isPending}
            />

            {/* Platform selector */}
            <FormControl required fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as 'shorts' | 'tiktok' | 'reels')}
                label="Platform"
                disabled={createProject.isPending}
              >
                <MenuItem value="shorts">YouTube Shorts</MenuItem>
                <MenuItem value="tiktok">TikTok</MenuItem>
                <MenuItem value="reels">Instagram Reels</MenuItem>
              </Select>
            </FormControl>

            {/* Video type selector */}
            <FormControl required fullWidth>
              <InputLabel>Video Type</InputLabel>
              <Select
                value={videoType}
                onChange={(e) => setVideoType(e.target.value as 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story')}
                label="Video Type"
                disabled={createProject.isPending}
              >
                <MenuItem value="Explainer">Explainer</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
                <MenuItem value="Tutorial">Tutorial</MenuItem>
                <MenuItem value="Recipe">Recipe</MenuItem>
                <MenuItem value="Story">Story</MenuItem>
              </Select>
            </FormControl>

            {/* Target duration selector */}
            <FormControl required fullWidth>
              <InputLabel>Target Duration</InputLabel>
              <Select
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value as 15 | 30 | 60)}
                label="Target Duration"
                disabled={createProject.isPending}
              >
                <MenuItem value={15}>15 seconds</MenuItem>
                <MenuItem value={30}>30 seconds</MenuItem>
                <MenuItem value={60}>60 seconds</MenuItem>
              </Select>
            </FormControl>

            {/* Submit button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={createProject.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!isValid || createProject.isPending}
                startIcon={createProject.isPending ? <CircularProgress size={20} /> : null}
              >
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}

export default EditorNew;
