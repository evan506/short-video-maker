-- Migration: 20250106_audio_voiceover_integration.sql
-- Feature: 003 - Audio Voiceover Integration with Edge TTS
-- Description: Create tables for audio generation, job tracking, music library, and TTS caching

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: scene_audio
-- Stores generated audio files for scenes (voiceover, background music, or mixed audio)
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

-- Indexes for scene_audio
CREATE INDEX idx_scene_audio_scene_id ON scene_audio(scene_id);
CREATE INDEX idx_scene_audio_scene_type ON scene_audio(scene_id, audio_type);

-- Table: audio_generation_jobs
-- Tracks TTS and audio mixing job status for observability and retry logic
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

-- Indexes for audio_generation_jobs
CREATE INDEX idx_audio_generation_jobs_status ON audio_generation_jobs(status, created_at);
CREATE INDEX idx_audio_generation_jobs_scene_id ON audio_generation_jobs(scene_id);

-- Table: background_music
-- Curated library of ~20 royalty-free background music tracks
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

-- Indexes for background_music
CREATE INDEX idx_background_music_mood ON background_music USING GIN(mood);
CREATE INDEX idx_background_music_title ON background_music USING GIN(to_tsvector('english', title));
CREATE INDEX idx_background_music_energy ON background_music(energy_level);

-- Table: tts_previews
-- Cached TTS preview audio for scene narration text, keyed by text_hash
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

-- Indexes for tts_previews
CREATE UNIQUE INDEX idx_tts_previews_hash_voice ON tts_previews(text_hash, voice_id);
CREATE INDEX idx_tts_previews_expires_at ON tts_previews(expires_at);

-- RLS (Row-Level Security) Policies
-- Enable RLS on tables with user-specific data
ALTER TABLE scene_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_previews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own scene audio
CREATE POLICY "Users can read own scene audio"
ON scene_audio FOR SELECT
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Users can read their own audio generation jobs
CREATE POLICY "Users can read own audio jobs"
ON audio_generation_jobs FOR SELECT
USING (
  scene_id IN (
    SELECT id FROM scenes WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Users can read their own TTS previews
CREATE POLICY "Users can read own TTS previews"
ON tts_previews FOR SELECT
USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- Note: background_music table does not require RLS as it's a shared library for all users
