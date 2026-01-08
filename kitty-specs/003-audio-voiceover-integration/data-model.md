# Data Model: Audio Voiceover Integration

**Feature**: 003 - Audio Voiceover Integration with Edge TTS
**Date**: 2026-01-06
**Status**: Final

## Migration SQL

```sql
-- Migration: 20250106_audio_voiceover_integration.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: scene_audio
CREATE TABLE scene_audio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('voiceover', 'music', 'mixed')),
  storage_url TEXT NOT NULL,
  duration_sec DECIMAL(10, 2),
  file_format TEXT DEFAULT 'mp3',
  bit_rate INTEGER DEFAULT 128 CHECK (bit_rate IN (64, 96, 128, 192, 256)),
  sample_rate INTEGER DEFAULT 44100 CHECK (sample_rate IN (44100, 48000)),
  file_size_bytes BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scene_audio_scene_id ON scene_audio(scene_id);
CREATE INDEX idx_scene_audio_scene_type ON scene_audio(scene_id, audio_type);

-- Table: audio_generation_jobs
CREATE TABLE audio_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID REFERENCES scenes(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('voiceover', 'mixing')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tts_provider TEXT,
  voice_name TEXT,
  options JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_generation_jobs_status ON audio_generation_jobs(status, created_at);
CREATE INDEX idx_audio_generation_jobs_scene_id ON audio_generation_jobs(scene_id);

-- Table: background_music
CREATE TABLE background_music (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT,
  source_url TEXT NOT NULL,
  storage_url TEXT,
  duration_sec DECIMAL(10, 2),
  mood TEXT[] NOT NULL DEFAULT '{}',
  energy_level INTEGER NOT NULL CHECK (energy_level >= 1 AND energy_level <= 10),
  tempo INTEGER,
  genre TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_royalty_free BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_background_music_mood ON background_music USING GIN(mood);
CREATE INDEX idx_background_music_title ON background_music USING GIN(to_tsvector('english', title));
CREATE INDEX idx_background_music_energy ON background_music(energy_level);

-- Table: tts_previews
CREATE TABLE tts_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX idx_tts_previews_hash_voice ON tts_previews(text_hash, voice_id);
CREATE INDEX idx_tts_previews_expires_at ON tts_previews(expires_at);

-- RLS Policies
ALTER TABLE scene_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scene audio"
ON scene_audio FOR SELECT
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can read own audio jobs"
ON audio_generation_jobs FOR SELECT
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can read own TTS previews"
ON tts_previews FOR SELECT
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

## Entity Descriptions

### scene_audio
Stores generated audio files for scenes (voiceover, background music, or mixed audio).

**Key fields**:
- `scene_id`: Foreign key to parent scene
- `audio_type`: Type of audio ('voiceover', 'music', 'mixed')
- `storage_url`: Supabase Storage path
- `duration_sec`: Audio duration for video sync

### audio_generation_jobs
Tracks TTS and audio mixing job status for observability and retry logic.

**State machine**: `pending → processing → completed/failed`

**Key fields**:
- `job_type`: 'voiceover' or 'mixing'
- `status`: Job progress tracking
- `error_message`: Failure details

### background_music
Curated library of ~20 royalty-free background music tracks.

**Key fields**:
- `mood`: Array of mood tags for filtering
- `energy_level`: 1-10 scale for intensity
- `tempo`: BPM for matching scene pace

### tts_previews
Cached TTS preview audio keyed by text_hash for fast replay.

**Key fields**:
- `text_hash`: SHA-256 of `narration_text + voice_id`
- `expires_at`: 10-minute TTL for cache cleanup
- `audio_url`: Signed URL to cached audio

## Access Patterns

### TTS Preview Generation Flow
1. Check cache: `SELECT * FROM tts_previews WHERE text_hash = ? AND voice_id = ? AND expires_at > NOW()`
2. If miss: Generate TTS, upload to Storage, insert cache record
3. Return signed URL

### Audio Mixing Flow
1. Create `audio_generation_jobs` record (status='pending')
2. Worker picks up job → status='processing'
3. Worker mixes audio → creates `scene_audio` record → status='completed'

### Cleanup Queries
```sql
-- Expired cache cleanup
DELETE FROM tts_previews WHERE expires_at < NOW();

-- Old job cleanup (30 days)
DELETE FROM audio_generation_jobs WHERE created_at < NOW() - INTERVAL '30 days';
```
