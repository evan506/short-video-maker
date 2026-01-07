/**
 * VoiceLibrary Component
 *
 * Displays list of available Edge TTS voices with sample playback.
 * Allows users to select and apply a voice to their project.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  VolumeUp,
  Person,
  Language,
} from '@mui/icons-material';
import { useVoiceSelection, type Voice } from '../../hooks/useVoiceSelection';

/**
 * VoiceCard Component
 *
 * Individual voice card with details and sample playback.
 */
interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlaySample: () => void;
  onStopSample: () => void;
}

function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  onSelect,
  onPlaySample,
  onStopSample,
}: VoiceCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
        },
      }}
    >
      {isSelected && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: theme.palette.primary.main,
            fontSize: 24,
          }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={2}>
          {/* Voice Name */}
          <Typography variant="h6" component="div" gutterBottom>
            {voice.name}
          </Typography>

          {/* Voice Metadata */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              icon={<Person />}
              label={voice.gender}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<Language />}
              label={voice.locale}
              size="small"
              variant="outlined"
            />
          </Stack>

          {/* Description (if available) */}
          {voice.description && (
            <Typography variant="body2" color="text.secondary">
              {voice.description}
            </Typography>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {/* Play/Stop Sample Button */}
            <Button
              variant={isPlaying ? 'contained' : 'outlined'}
              size="small"
              startIcon={isPlaying ? <StopIcon /> : <PlayArrowIcon />}
              onClick={isPlaying ? onStopSample : onPlaySample}
              disabled={!isSelected && !isPlaying}
            >
              {isPlaying ? 'Stop' : 'Sample'}
            </Button>

            {/* Select Voice Button */}
            {!isSelected && (
              <Button
                variant="contained"
                size="small"
                onClick={onSelect}
                disabled={isPlaying}
              >
                Select
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Main VoiceLibrary Component Props
 */
interface VoiceLibraryProps {
  projectId: string;
  onVoiceApplied?: (voiceId: string) => void;
}

/**
 * VoiceLibrary Component
 *
 * Fetches and displays available voices with selection and sample playback.
 */
export function VoiceLibrary({ projectId, onVoiceApplied }: VoiceLibraryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Voice selection hook
  const {
    selectedVoiceId,
    setSelectedVoiceId,
    applyVoice,
    isLoading: isApplying,
  } = useVoiceSelection(projectId);

  // Fetch voices on mount
  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/voices');
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }

        const data = await response.json();
        setVoices(data.voices || []);
      } catch (err: any) {
        console.error('[VoiceLibrary] Failed to fetch voices:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Handle voice selection
  const handleSelectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
  }, [setSelectedVoiceId]);

  // Handle apply voice button
  const handleApplyVoice = useCallback(async () => {
    if (!selectedVoiceId) {
      return;
    }

    const success = await applyVoice(projectId, selectedVoiceId);

    if (success && onVoiceApplied) {
      onVoiceApplied(selectedVoiceId);
    }
  }, [selectedVoiceId, projectId, applyVoice, onVoiceApplied]);

  // Play sample audio
  const handlePlaySample = useCallback((voiceId: string) => {
    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }

    // Create new audio element with sample URL
    // Note: Using static sample files for MVP (T018)
    // In production, generate samples on-demand or host pre-generated files
    const sampleUrl = `/static/voice-samples/${voiceId}.mp3`;

    const audio = new Audio(sampleUrl);
    audio.play().catch((err) => {
      console.error('[VoiceLibrary] Failed to play sample:', err);
      // Fallback: Generate sample on-the-fly using TTS API
      // This would call POST /api/scenes/:sceneId/tts/preview
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    setAudioElement(audio);
    setPlayingVoiceId(voiceId);
  }, [audioElement]);

  // Stop sample playback
  const handleStopSample = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    setPlayingVoiceId(null);
  }, [audioElement]);

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading voices...
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="error">
          Failed to load voices: {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (voices.length === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="info">
          No voices available. Please check your TTS service configuration.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          <VolumeUp sx={{ mr: 1, verticalAlign: 'middle' }} />
          Voice Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a voice for your project. Click "Sample" to preview each voice.
        </Typography>
      </Box>

      {/* Selected Voice Display */}
      {selectedVoiceId && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleApplyVoice}
              disabled={isApplying}
              startIcon={isApplying ? <CircularProgress size={16} /> : undefined}
            >
              Apply Selected
            </Button>
          }
        >
          Selected: {voices.find((v) => v.id === selectedVoiceId)?.name}
        </Alert>
      )}

      {/* Voice Grid */}
      <Grid container spacing={2}>
        {voices.map((voice) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={voice.id}>
            <VoiceCard
              voice={voice}
              isSelected={selectedVoiceId === voice.id}
              isPlaying={playingVoiceId === voice.id}
              onSelect={() => handleSelectVoice(voice.id)}
              onPlaySample={() => handlePlaySample(voice.id)}
              onStopSample={handleStopSample}
            />
          </Grid>
        ))}
      </Grid>

      {/* Footer Instructions */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Tip:</strong> Your selected voice will be used for all voiceovers
          in this project. You can change it at any time.
        </Typography>
      </Box>
    </Box>
  );
}

export default VoiceLibrary;
