-- Migration: Visuals and Video Rendering
-- Description: Create render_jobs, job_steps, exports tables and extend scenes table for subtitle timing
-- Date: 2025-01-08
-- Feature: 004-visuals-video-rendering

BEGIN;

-- ============================================
-- Create render_jobs table
-- ============================================
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  current_step TEXT CHECK (current_step IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  storyboard_script_version_snapshot INTEGER NOT NULL,
  voice_id_snapshot TEXT NOT NULL,
  script_version_snapshot INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for render_jobs
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status_created_at ON render_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_render_jobs_updated_at ON render_jobs(updated_at);

-- ============================================
-- Create job_steps table
-- ============================================
CREATE TABLE IF NOT EXISTS job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  render_job_id UUID NOT NULL REFERENCES render_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL CHECK (step_name IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'failed', 'done')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (render_job_id, step_name)
);

-- Create indexes for job_steps
CREATE INDEX IF NOT EXISTS idx_job_steps_render_job_id_step_name ON job_steps(render_job_id, step_name);
CREATE INDEX IF NOT EXISTS idx_job_steps_render_job_id_status ON job_steps(render_job_id, status);

-- ============================================
-- Create exports table
-- ============================================
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  render_job_id UUID NOT NULL UNIQUE REFERENCES render_jobs(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  resolution TEXT NOT NULL DEFAULT '1080x1920',
  format TEXT NOT NULL DEFAULT 'mp4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for exports
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_render_job_id ON exports(render_job_id);
CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at DESC);

-- ============================================
-- Extend scenes table with subtitle columns
-- ============================================
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS subtitle_timing JSONB,
  ADD COLUMN IF NOT EXISTS subtitle_style_preset_id TEXT REFERENCES subtitle_presets(id);

-- Add comment for subtitle_timing
COMMENT ON COLUMN scenes.subtitle_timing IS 'Word/sentence-level timing data for Karaoke subtitle synchronization. Format: [{"word": "The", "start_ms": 0, "end_ms": 200}, ...]';

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_scenes_subtitle_timing ON scenes USING GIN (subtitle_timing);

-- ============================================
-- Create updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for render_jobs
DROP TRIGGER IF EXISTS update_render_jobs_updated_at ON render_jobs;
CREATE TRIGGER update_render_jobs_updated_at
  BEFORE UPDATE ON render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for render_jobs
-- ============================================
CREATE POLICY "Users can view own render_jobs"
ON render_jobs FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own render_jobs"
ON render_jobs FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own render_jobs"
ON render_jobs FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- ============================================
-- RLS Policies for job_steps (inherited via render_jobs)
-- ============================================
CREATE POLICY "Users can view own job_steps"
ON job_steps FOR SELECT
TO authenticated
USING (
  render_job_id IN (
    SELECT id FROM render_jobs WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
);

-- ============================================
-- RLS Policies for exports
-- ============================================
CREATE POLICY "Users can view own exports"
ON exports FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own exports"
ON exports FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

COMMIT;

-- ============================================
-- Rollback Instructions
-- ============================================
-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS update_render_jobs_updated_at ON render_jobs;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP POLICY IF EXISTS "Users can view own exports" ON exports;
-- DROP POLICY IF EXISTS "Users can insert own exports" ON exports;
-- DROP POLICY IF EXISTS "Users can view own job_steps" ON job_steps;
-- DROP POLICY IF EXISTS "Users can update own render_jobs" ON render_jobs;
-- DROP POLICY IF EXISTS "Users can insert own render_jobs" ON render_jobs;
-- DROP POLICY IF EXISTS "Users can view own render_jobs" ON render_jobs;
-- ALTER TABLE exports DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE job_steps DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE render_jobs DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_scenes_subtitle_timing;
-- ALTER TABLE scenes DROP COLUMN IF EXISTS subtitle_style_preset_id;
-- ALTER TABLE scenes DROP COLUMN IF EXISTS subtitle_timing;
-- DROP INDEX IF EXISTS idx_exports_created_at;
-- DROP INDEX IF EXISTS idx_exports_render_job_id;
-- DROP INDEX IF EXISTS idx_exports_project_id;
-- DROP INDEX IF EXISTS idx_job_steps_render_job_id_status;
-- DROP INDEX IF EXISTS idx_job_steps_render_job_id_step_name;
-- DROP INDEX IF EXISTS idx_render_jobs_updated_at;
-- DROP INDEX IF EXISTS idx_render_jobs_status_created_at;
-- DROP INDEX IF EXISTS idx_render_jobs_project_id;
-- DROP TABLE IF EXISTS exports;
-- DROP TABLE IF EXISTS job_steps;
-- DROP TABLE IF EXISTS render_jobs;
