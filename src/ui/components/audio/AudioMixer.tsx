/**
 * AudioMixer Component
 *
 * UI for mixing voiceover and background music with volume controls and job status tracking.
 * Allows users to configure audio mixing parameters and monitor job progress.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Paper,
  TextField,
  Chip,
  IconButton,
} from '@mui/material';
import {
  VolumeUp,
  MusicNote,
  RecordVoiceOver,
  Mix,
  PlayArrow,
  Stop,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

/**
 * Audio mixing job status from API
 */
export interface AudioMixJob {
  id: string;
  scene_id: string;
  job_type: 'mixing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  options: {
    voiceoverVolume: number;
    musicVolume: number;
    musicId: string;
    fadeInDuration: number;
    fadeOutDuration: number;
    voiceoverUrl: string;
    musicUrl: string;
  };
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * AudioMixer Component Props
 */
export interface AudioMixerProps {
  sceneId: string;
  voiceoverUrl?: string; // Voiceover audio URL (if already generated)
  musicTrackId?: string; // Selected music track ID
  musicTrackTitle?: string; // Selected music track title (for display)
  onMixComplete?: (audioUrl: string) => void; // Callback when mix completes
  compact?: boolean; // Compact mode for inline display
}

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * AudioMixer Component
 *
 * Provides UI for:
 * - Volume control sliders (voiceover and music)
 * - Fade duration configuration
 * - Mix audio button with job creation
 * - Job status polling with progress display
 * - Mixed audio playback when complete
 */
export const AudioMixer: React.FC<AudioMixerProps> = ({
  sceneId,
  voiceoverUrl,
  musicTrackId,
  musicTrackTitle,
  onMixComplete,
  compact = false,
}) => {
  // Volume controls (0-100 scale, converted to 0-1 for API)
  const [voiceoverVolume, setVoiceoverVolume] = useState<number>(80);
  const [musicVolume, setMusicVolume] = useState<number>(40);

  // Fade duration controls (1-10 seconds)
  const [fadeInDuration, setFadeInDuration] = useState<number>(1);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(1);

  // Job state
  const [currentJob, setCurrentJob] = useState<AudioMixJob | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'creating' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [mixedAudioUrl, setMixedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio playback
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  /**
   * T045: Create AudioMixer UI with volume sliders
   * Handle volume slider changes
   */
  const handleVoiceoverVolumeChange = useCallback((event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setVoiceoverVolume(value);
  }, []);

  const handleMusicVolumeChange = useCallback((event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setMusicVolume(value);
  }, []);

  /**
   * T046: Add "Mix Audio" button
   * Create audio mixing job via API
   */
  const handleMixAudio = useCallback(async () => {
    if (!musicTrackId) {
      setError('Please select a background music track first');
      return;
    }

    if (!voiceoverUrl) {
      setError('Please generate a voiceover first');
      return;
    }

    setError(null);
    setJobStatus('creating');
    setCurrentJob(null);
    setMixedAudioUrl(null);

    try {
      // Convert 0-100 scale to 0-1 for API
      const apiVoiceoverVolume = voiceoverVolume / 100;
      const apiMusicVolume = musicVolume / 100;

      const response = await fetch(`/api/v1/scenes/${sceneId}/audio/mix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          musicId: musicTrackId,
          voiceoverVolume: apiVoiceoverVolume,
          musicVolume: apiMusicVolume,
          fadeInDuration,
          fadeOutDuration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create mixing job');
      }

      const data = await response.json();
      setCurrentJob(data);
      setJobStatus('pending');

      // Start polling for job status
      pollJobStatus(data.jobId);
    } catch (err: any) {
      setError(err.message || 'Failed to create mixing job');
      setJobStatus('failed');
    }
  }, [sceneId, musicTrackId, voiceoverUrl, voiceoverVolume, musicVolume, fadeInDuration, fadeOutDuration]);

  /**
   * T047: Poll job status
   * Poll for job completion with exponential backoff
   */
  const pollJobStatus = useCallback(async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (60 * 5s)
    const pollInterval = 2000; // 2 seconds

    const poll = async () => {
      attempts++;

      try {
        const response = await fetch(`/api/v1/scenes/${sceneId}/audio/status`);

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();

        if (data.status === 'completed') {
          setJobStatus('completed');
          setMixedAudioUrl(data.audioUrl);

          // Notify parent component
          if (onMixComplete && data.audioUrl) {
            onMixComplete(data.audioUrl);
          }
          return;
        }

        if (data.status === 'failed') {
          setJobStatus('failed');
          setError(data.error || 'Mixing job failed');
          return;
        }

        if (data.status === 'processing') {
          setJobStatus('processing');
        }

        // Continue polling if not completed/failed
        if (attempts < maxAttempts && (data.status === 'pending' || data.status === 'processing')) {
          setTimeout(poll, pollInterval);
        } else if (attempts >= maxAttempts) {
          setJobStatus('failed');
          setError('Job timed out. Please try again.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to check job status');
        setJobStatus('failed');
      }
    };

    poll();
  }, [sceneId, onMixComplete]);

  /**
   * T048: Display mixed audio player
   * Play/pause mixed audio
   */
  const handlePlayMixedAudio = useCallback(() => {
    if (!mixedAudioUrl) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [mixedAudioUrl, isPlaying]);

  const handleRetry = useCallback(() => {
    setError(null);
    setJobStatus('idle');
    setCurrentJob(null);
    setMixedAudioUrl(null);
  }, []);

  /**
   * Determine if mix button should be enabled
   */
  const canMix = musicTrackId && voiceoverUrl && jobStatus === 'idle';
  const isMixing = jobStatus === 'creating' || jobStatus === 'pending' || jobStatus === 'processing';

  return (
    <Card elevation={compact ? 0 : 2}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Mix color="primary" />
              <Typography variant={compact ? "h6" : "h5"} fontWeight="bold">
                Audio Mixer
              </Typography>
            </Box>
            {jobStatus === 'completed' && (
              <Chip
                icon={<CheckCircle />}
                label="Ready"
                color="success"
                size="small"
              />
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={handleRetry}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* T045: Volume Controls */}
          <Grid container spacing={2}>
            {/* Voiceover Volume */}
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <RecordVoiceOver color="primary" fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    Voiceover Volume
                  </Typography>
                  <Chip label={`${voiceoverVolume}%`} size="small" />
                </Box>
                <Slider
                  value={voiceoverVolume}
                  onChange={handleVoiceoverVolumeChange}
                  disabled={isMixing}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>
            </Grid>

            {/* Music Volume */}
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <MusicNote color="secondary" fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    Music Volume
                  </Typography>
                  <Chip label={`${musicVolume}%`} size="small" />
                </Box>
                <Slider
                  value={musicVolume}
                  onChange={handleMusicVolumeChange}
                  disabled={isMixing}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Fade Duration Controls */}
          <Grid container spacing={2}>
            {/* Fade In */}
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Fade In Duration
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Slider
                    value={fadeInDuration}
                    onChange={(e, v) => setFadeInDuration(Array.isArray(v) ? v[0] : v)}
                    disabled={isMixing}
                    min={0}
                    max={10}
                    step={0.5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}s`}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    value={fadeInDuration}
                    onChange={(e) => setFadeInDuration(parseFloat(e.target.value) || 0)}
                    disabled={isMixing}
                    inputProps={{ min: 0, max: 10, step: 0.5 }}
                    size="small"
                    sx={{ width: 80 }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Fade Out */}
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Fade Out Duration
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Slider
                    value={fadeOutDuration}
                    onChange={(e, v) => setFadeOutDuration(Array.isArray(v) ? v[0] : v)}
                    disabled={isMixing}
                    min={0}
                    max={10}
                    step={0.5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}s`}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    value={fadeOutDuration}
                    onChange={(e) => setFadeOutDuration(parseFloat(e.target.value) || 0)}
                    disabled={isMixing}
                    inputProps={{ min: 0, max: 10, step: 0.5 }}
                    size="small"
                    sx={{ width: 80 }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* T046: Mix Audio Button */}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleMixAudio}
            disabled={!canMix || isMixing}
            startIcon={isMixing ? <CircularProgress size={20} /> : <Mix />}
          >
            {isMixing ? 'Mixing Audio...' : 'Mix Audio'}
          </Button>

          {/* Job Status Display */}
          {isMixing && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mixing Progress
              </Typography>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {jobStatus === 'creating' && 'Creating mixing job...'}
                {jobStatus === 'pending' && 'Job queued, waiting for worker...'}
                {jobStatus === 'processing' && 'Processing audio mix...'}
              </Typography>
            </Box>
          )}

          {/* T048: Mixed Audio Player */}
          {jobStatus === 'completed' && mixedAudioUrl && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Typography variant="body2" fontWeight="medium">
                    Mixed Audio Ready
                  </Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={handlePlayMixedAudio}
                    color="primary"
                  >
                    {isPlaying ? <Stop /> : <PlayArrow />}
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Voiceover: {voiceoverVolume}% | Music: {musicVolume}% | Fades: {formatDuration(fadeInDuration)} in / {formatDuration(fadeOutDuration)} out
              </Typography>

              {/* Hidden audio element for playback */}
              <audio
                ref={audioRef}
                src={mixedAudioUrl}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  setError('Failed to play mixed audio');
                  setIsPlaying(false);
                }}
              />
            </Paper>
          )}

          {/* Job Failed Display */}
          {jobStatus === 'failed' && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleRetry}
                  startIcon={<Refresh />}
                >
                  Retry
                </Button>
              }
            >
              Mixing failed. Please try again.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AudioMixer;
