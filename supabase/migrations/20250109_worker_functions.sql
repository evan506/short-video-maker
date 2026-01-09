-- Migration: Worker Dequeue Function
-- Description: Create SQL function for job dequeuing with FOR UPDATE SKIP LOCKED
-- Date: 2025-01-09
-- Feature: 004-visuals-video-rendering (WP04)

BEGIN;

-- ============================================
-- Create dequeue_render_job function
-- ============================================
CREATE OR REPLACE FUNCTION dequeue_render_job()
RETURNS TABLE (
  id UUID,
  project_id UUID,
  status TEXT,
  current_step TEXT,
  progress INTEGER,
  storyboard_script_version_snapshot INTEGER,
  voice_id_snapshot TEXT,
  script_version_snapshot INTEGER,
  retry_count INTEGER,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  job_record render_jobs%ROWTYPE;
BEGIN
  -- Atomically dequeue a job using FOR UPDATE SKIP LOCKED
  -- This allows multiple workers to run without race conditions
  UPDATE render_jobs
  SET
    status = 'running',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id
    FROM render_jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO job_record;

  -- Return the job (or NULL if no jobs available)
  IF FOUND THEN
    RETURN QUERY SELECT job_record.*;
  ELSE
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Create helper function to update job progress
-- ============================================
CREATE OR REPLACE FUNCTION update_job_progress(
  p_job_id UUID,
  p_progress INTEGER,
  p_current_step TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE render_jobs
  SET
    progress = p_progress,
    current_step = COALESCE(p_current_step, current_step),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Create helper function to mark job step status
-- ============================================
CREATE OR REPLACE FUNCTION update_job_step_status(
  p_render_job_id UUID,
  p_step_name TEXT,
  p_status TEXT,
  p_log TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE job_steps
  SET
    status = p_status,
    log = COALESCE(p_log, log),
    started_at = CASE
      WHEN p_status = 'running' AND started_at IS NULL THEN NOW()
      ELSE started_at
    END,
    ended_at = CASE
      WHEN p_status IN ('done', 'failed') THEN NOW()
      ELSE ended_at
    END
  WHERE render_job_id = p_render_job_id AND step_name = p_step_name;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- Rollback Instructions
-- ============================================
-- To rollback this migration, run:
-- DROP FUNCTION IF EXISTS dequeue_render_job();
-- DROP FUNCTION IF EXISTS update_job_progress(UUID, INTEGER, TEXT);
-- DROP FUNCTION IF EXISTS update_job_step_status(UUID, TEXT, TEXT, TEXT);
