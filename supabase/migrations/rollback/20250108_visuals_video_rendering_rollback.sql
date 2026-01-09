-- Rollback: Visuals and Video Rendering
-- Description: Drop all objects created in 20250108_visuals_video_rendering.sql migration
-- Date: 2025-01-08
-- Feature: 004-visuals-video-rendering

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS update_render_jobs_updated_at ON render_jobs;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop RLS policies for exports
DROP POLICY IF EXISTS "Users can insert own exports" ON exports;
DROP POLICY IF EXISTS "Users can view own exports" ON exports;

-- Drop RLS policies for job_steps
DROP POLICY IF EXISTS "Users can view own job_steps" ON job_steps;

-- Drop RLS policies for render_jobs
DROP POLICY IF EXISTS "Users can update own render_jobs" ON render_jobs;
DROP POLICY IF EXISTS "Users can insert own render_jobs" ON render_jobs;
DROP POLICY IF EXISTS "Users can view own render_jobs" ON render_jobs;

-- Disable Row Level Security
ALTER TABLE exports DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs DISABLE ROW LEVEL SECURITY;

-- Drop scenes table extensions
DROP INDEX IF EXISTS idx_scenes_subtitle_timing;
ALTER TABLE scenes DROP COLUMN IF EXISTS subtitle_style_preset_id;
ALTER TABLE scenes DROP COLUMN IF EXISTS subtitle_timing;

-- Drop exports table indexes
DROP INDEX IF EXISTS idx_exports_created_at;
DROP INDEX IF EXISTS idx_exports_render_job_id;
DROP INDEX IF EXISTS idx_exports_project_id;

-- Drop job_steps table indexes
DROP INDEX IF EXISTS idx_job_steps_render_job_id_status;
DROP INDEX IF EXISTS idx_job_steps_render_job_id_step_name;

-- Drop render_jobs table indexes
DROP INDEX IF EXISTS idx_render_jobs_updated_at;
DROP INDEX IF EXISTS idx_render_jobs_status_created_at;
DROP INDEX IF EXISTS idx_render_jobs_project_id;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS exports;
DROP TABLE IF EXISTS job_steps;
DROP TABLE IF EXISTS render_jobs;

COMMIT;

-- Note: After rollback, verify all objects are dropped:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('render_jobs', 'job_steps', 'exports');
-- Should return 0 rows.
