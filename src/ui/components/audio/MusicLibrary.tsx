/**
 * MusicLibrary Component
 *
 * Displays curated library of background music tracks with filtering and preview.
 * Allows users to select and apply music to scenes with volume control.
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
  Slider,
  Collapse,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  MusicNote,
  Speed,
  VolumeUp,
} from '@mui/icons-material';

/**
 * Music track from API
 */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration_sec: number;
  mood: string[];
  energy_level: number;
  tempo: number;
  storage_url: string;
}

/**
 * MusicLibrary Component Props
 */
export interface MusicLibraryProps {
  sceneId?: string; // Optional scene ID for "Apply to Scene" functionality
  onMusicSelected?: (trackId: string, volume: number) => void; // Callback when music is applied
  compact?: boolean; // Compact mode for inline display
}

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * MusicCard Component
 *
 * Individual track card with metadata and preview playback.
 */
interface MusicCardProps {
  track: MusicTrack;
  isSelected: boolean;
  isPlaying: boolean;
  volume: number;
  onSelect: () => void;
  onPlayPreview: () => void;
  onStopPreview: () => void;
  onVolumeChange: (volume: number) => void;
  showVolumeControl?: boolean;
}

function MusicCard({
  track,
  isSelected,
  isPlaying,
  volume,
  onSelect,
  onPlayPreview,
  onStopPreview,
  onVolumeChange,
  showVolumeControl = false,
}: MusicCardProps) {
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
            zIndex: 1,
          }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={2}>
          {/* Track Title */}
          <Typography variant="h6" component="div" gutterBottom>
            {track.title}
          </Typography>

          {/* Artist */}
          <Typography variant="body2" color="text.secondary">
            by {track.artist}
          </Typography>

          {/* Metadata */}
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip
              icon={<MusicNote />}
              label={`${formatDuration(track.duration_sec)}`}
              size="small"
              variant="outlined"
            />

            <Chip
              icon={<Speed />}
              label={`${track.tempo} BPM`}
              size="small"
              variant="outlined"
            />

            <Chip
              label={`Energy: ${track.energy_level}/10`}
              size="small"
              color={track.energy_level > 7 ? 'error' : track.energy_level > 4 ? 'warning' : 'success'}
              variant="outlined"
            />
          </Stack>

          {/* Mood Tags */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {track.mood.map((m) => (
              <Chip
                key={m}
                label={m}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Stack>

          {/* Playback Controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            {!isPlaying ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={onPlayPreview}
                fullWidth
              >
                Preview
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                startIcon={<StopIcon />}
                onClick={onStopPreview}
                color="error"
                fullWidth
              >
                Stop
              </Button>
            )}

            <Button
              variant={isSelected ? "contained" : "outlined"}
              size="small"
              onClick={onSelect}
              disabled={isPlaying}
              fullWidth
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </Stack>

          {/* Volume Control (T036) */}
          {showVolumeControl && isSelected && (
            <Collapse in={isSelected}>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <VolumeUp fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    Volume: {Math.round(volume * 100)}%
                  </Typography>
                </Stack>
                <Slider
                  value={volume}
                  onChange={(_, newValue) => onVolumeChange(newValue as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Stack>
            </Collapse>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * MusicLibrary Component
 *
 * Features:
 * - T030: Track list display
 * - T031: Mood filter buttons (upbeat, calm, dramatic, inspirational)
 * - T032: Track cards with metadata
 * - T033: Play Preview button
 * - T034: GET /api/v1/music/library API call
 * - T035: Apply to Scene button
 * - T036: Volume slider (0-100%)
 */
export function MusicLibrary({
  sceneId,
  onMusicSelected,
  compact = false,
}: MusicLibraryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.4); // Default 40% volume

  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  /**
   * Fetch music library from API (T034)
   */
  const fetchMusicLibrary = useCallback(async (mood?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (mood) {
        params.append('mood', mood);
      }
      params.append('limit', '20');

      const response = await fetch(`/api/v1/music/library?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to fetch music library');
      }

      const data = await response.json();
      setTracks(data.tracks || []);
      setFilteredTracks(data.tracks || []);
    } catch (err: any) {
      console.error('[MusicLibrary] Failed to fetch tracks:', err);
      setError(err.message || 'Failed to load music library');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load music library on mount
   */
  useEffect(() => {
    fetchMusicLibrary();
  }, [fetchMusicLibrary]);

  /**
   * Filter tracks by mood (T031)
   */
  useEffect(() => {
    if (!selectedMood) {
      setFilteredTracks(tracks);
    } else {
      const filtered = tracks.filter((track) =>
        track.mood.some((m) => m.toLowerCase() === selectedMood.toLowerCase())
      );
      setFilteredTracks(filtered);
    }
  }, [selectedMood, tracks]);

  /**
   * Play preview (T033)
   */
  const handlePlayPreview = useCallback((track: MusicTrack) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Create new audio element
    const audio = new Audio(track.storage_url);
    audioRef.current = audio;
    setPlayingTrack(track.id);

    audio.onended = () => {
      setPlayingTrack(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      console.error('[MusicLibrary] Audio playback error');
      setPlayingTrack(null);
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error('[MusicLibrary] Failed to play audio:', err);
      setPlayingTrack(null);
    });
  }, []);

  /**
   * Stop preview
   */
  const handleStopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingTrack(null);
  }, []);

  /**
   * Select track (T035)
   */
  const handleSelectTrack = useCallback((track: MusicTrack) => {
    setSelectedTrack(track.id);

    // If sceneId provided, apply music to scene
    if (sceneId && onMusicSelected) {
      onMusicSelected(track.id, volume);
    }
  }, [sceneId, onMusicSelected, volume]);

  /**
   * Handle volume change (T036)
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);

    // If track selected, update scene with new volume
    if (selectedTrack && sceneId && onMusicSelected) {
      onMusicSelected(selectedTrack, newVolume);
    }
  }, [selectedTrack, sceneId, onMusicSelected]);

  /**
   * Filter by mood (T031)
   */
  const handleFilterByMood = useCallback((mood: string | null) => {
    setSelectedMood(mood);
  }, []);

  /**
   * Cleanup audio on unmount
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading music library...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h5" gutterBottom>
            Background Music Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a track to add atmosphere to your scene
          </Typography>
        </Box>

        {/* Mood Filter Buttons (T031) */}
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Filter by mood:
          </Typography>

          <Chip
            label="All"
            onClick={() => handleFilterByMood(null)}
            color={selectedMood === null ? 'primary' : 'default'}
            clickable
          />

          {['upbeat', 'calm', 'dramatic', 'inspirational'].map((mood) => (
            <Chip
              key={mood}
              label={mood.charAt(0).toUpperCase() + mood.slice(1)}
              onClick={() => handleFilterByMood(mood)}
              color={selectedMood === mood ? 'primary' : 'default'}
              clickable
            />
          ))}
        </Stack>

        {/* Results Count */}
        <Typography variant="caption" color="text.secondary">
          Showing {filteredTracks.length} track{filteredTracks.length !== 1 ? 's' : ''}
        </Typography>

        {/* Track Grid (T030, T032) */}
        <Grid container spacing={2}>
          {filteredTracks.map((track) => (
            <Grid item xs={12} sm={6} md={4} key={track.id}>
              <MusicCard
                track={track}
                isSelected={selectedTrack === track.id}
                isPlaying={playingTrack === track.id}
                volume={volume}
                onSelect={() => handleSelectTrack(track)}
                onPlayPreview={() => handlePlayPreview(track)}
                onStopPreview={handleStopPreview}
                onVolumeChange={handleVolumeChange}
                showVolumeControl={!!sceneId}
              />
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {filteredTracks.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
            }}
          >
            <MusicNote sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No tracks found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your mood filter
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default MusicLibrary;
