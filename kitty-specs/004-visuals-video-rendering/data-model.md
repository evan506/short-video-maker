# Data Model: Visuals and Video Rendering

**Feature**: 004-visuals-video-rendering
**Phase**: 1 (Design & Contracts)
**Date**: 2026-01-08
**Status**: Complete

## Overview

This document defines the data model for the Visuals and Video Rendering feature, including new tables (`render_jobs`, `job_steps`, `exports`) and extensions to existing tables (`scenes`). This model supports async video rendering with Remotion, progress tracking, retry logic, and MP4 export to Supabase Storage.

## Entity Relationship Diagram

```
┌─────────────────────┐
│   auth.users        │
│   (Supabase Auth)   │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────────────────────────────────────────────────────────────────┐
│                              projects                                 │
├──────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ user_id (FK) ──────────────────────────────────────┐                 │
│ title                                               │                 │
│ ... (other fields from Feature 001)                 │                 │
└─────────────────────┬────────────────────────────────┘                 │
                      │ 1                                              │
                      │                                                │
                      │ N                                              │
        ┌─────────────┴───────────────┐                  ┌──────────────┴───────────────┐
        │                             │                  │                              │
        │ N                           │ 1                │ 1                            │ N
┌──────────────────────┐     ┌──────────────────┐     ┌─────────────────────────────┐
│     render_jobs      │     │      scenes       │     │      exports                 │
├──────────────────────┤     ├──────────────────┤     ├─────────────────────────────┤
│ id (PK)              │     │ id (PK)           │     │ id (PK)                      │
│ project_id (FK)      │◄────│ project_id (FK)  │     │ project_id (FK)             │
│ status               │     │ narration_text    │     │ render_job_id (FK, UNIQUE)  │◄────┐
│ current_step         │     │ ... (other fields)│     │ video_url                    │     │
│ storyboard_script_   │     │ subtitle_timing   │     │ duration_sec                 │     │
│   _version_snapshot  │     │   (NEW JSONB)     │     │ file_size_bytes              │     │
│ voice_id_snapshot    │     │ subtitle_style_   │     │ resolution                   │     │
│ script_version_      │     │   preset_id (FK)   │     │ format                       │     │
│   _snapshot          │     └──────────────────┘     │ created_at                   │     │
│ retry_count          │                               └─────────────────────────────┘     │
│ error_code           │                                                                      │
│ error_message        │                                                                      │
│ started_at           │                                                                      │
│ completed_at         │                                                                      │
│ created_at           │                                                                      │
│ updated_at           │                                                                      │
└──────────┬───────────┘                                                                      │
           │                                                                                  │
           │ 1                                                                                │
           │                                                                                  │
           │ N                                                                                │
    ┌──────────────┴─────────────┐                                                          │
    │                            │                                                          │
    │ N                          │ 1                                                        │
│ job_steps                   │                                                          │
├─────────────────────────────┤                                                          │
│ id (PK)                     │                                                          │
│ render_job_id (FK)          │                                                          │
│ step_name                   │                                                          │
│ status                      │                                                          │
│ started_at                  │                                                          │
│ ended_at                    │                                                          │
│ log                         │                                                          │
│ created_at                  │                                                          │
└─────────────────────────────┘                                                          │
                                                                                             │
Note: media_assets, scene_audio tables exist from Features 002 and 003                       │
```

## Entity Definitions

### 1. Render Job

**Description**: Represents an async video rendering job with state tracking, progress monitoring, and retry capability.

**Table Name**: `render_jobs`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique render job identifier |
| `project_id` | UUID | FOREIGN KEY → `projects(id)`, NOT NULL, ON DELETE CASCADE | - | Project being rendered |
| `status` | TEXT | NOT NULL, CHECK: `IN ('queued', 'running', 'succeeded', 'failed', 'canceled')` | `'queued'` | Current job status |
| `current_step` | TEXT | NULL, CHECK: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')` | `'tts_generation'` | Current processing step (NULL if queued/completed) |
| `progress` | INTEGER | NOT NULL, CHECK: `BETWEEN 0 AND 100` | `0` | Progress percentage (0-100) |
| `storyboard_script_version_snapshot` | INTEGER | NOT NULL | - | Scenes version at render start (prevents changes during render) |
| `voice_id_snapshot` | TEXT | NOT NULL | - | Voice selection at render start (prevents voice changes during render) |
| `script_version_snapshot` | INTEGER | NOT NULL | - | Script version for audit trail |
| `retry_count` | INTEGER | NOT NULL | `0` | Number of retry attempts |
| `error_code` | TEXT | NULL | - | Machine-readable error code (e.g., `TTS_FAILED`, `MEDIA_TIMEOUT`) |
| `error_message` | TEXT | NULL | - | Human-readable error message |
| `started_at` | TIMESTAMPTZ | NULL | - | Job start timestamp (NULL until picked up by worker) |
| `completed_at` | TIMESTAMPTZ | NULL | - | Job completion timestamp (NULL until succeeded/failed/canceled) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Job creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last update timestamp (used by stalled job reaper) |

**Indexes**:
- `project_id` (for querying project's render history)
- `status, created_at` composite index (for worker dequeue query: `WHERE status = 'queued' ORDER BY created_at ASC`)
- `updated_at` (for stalled job reaper: `WHERE status = 'running' AND updated_at < NOW() - INTERVAL '15 minutes'`)

**Relationships**:
- Many-to-one with `projects` (render_job → project)
- One-to-many with `job_steps` (render_job → steps)
- One-to-one with `exports` (render_job → export, unique constraint)

**State Transitions**:
```
queued → running → succeeded
                ↘ failed (can retry from failed step)
                ↘ canceled

running → failed (stalled reaper marks as failed after 15min)
```

**Triggers**:
- `updated_at` auto-update trigger on every row modification

---

### 2. Job Step

**Description**: Represents a single step within a render job (TTS generation, subtitle generation, media fetch, render composite) for granular progress tracking.

**Table Name**: `job_steps`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique step identifier |
| `render_job_id` | UUID | FOREIGN KEY → `render_jobs(id)`, NOT NULL, ON DELETE CASCADE | - | Parent render job |
| `step_name` | TEXT | NOT NULL, CHECK: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')` | - | Step identifier |
| `status` | TEXT | NOT NULL, CHECK: `IN ('pending', 'running', 'failed', 'done')` | `'pending'` | Current step status |
| `started_at` | TIMESTAMPTZ | NULL | - | Step start timestamp (NULL until step begins) |
| `ended_at` | TIMESTAMPTZ | NULL | - | Step end timestamp (NULL until step completes/fails) |
| `log` | TEXT | NULL | - | Step details, error messages, or progress notes (JSON-formatted for structured data) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Step record creation timestamp |

**Indexes**:
- `render_job_id, step_name` composite unique index (one record per step per job)
- `render_job_id, status` (for querying pending/running steps)

**Relationships**:
- Many-to-one with `render_jobs` (job_step → render_job)

**Step Execution Order** (enforced by worker logic):
1. `tts_generation` - Generate voiceovers for all scenes
2. `subtitle_generation` - Extract subtitle timing data
3. `media_fetch` - Download media assets (videos/images) from URLs
4. `render_composite` - Compose final video with Remotion

**Sample Log Data (JSONB in `log` field)**:
```json
{
  "tts_generation": {
    "scenesProcessed": 15,
    "totalDuration": 45.2,
    "voicesUsed": ["en-US-Wavenet-D"],
    "errors": []
  },
  "subtitle_generation": {
    "wordLevelTimings": true,
    "fallbackToSentence": false,
    "scenesWithTiming": 15
  },
  "media_fetch": {
    "totalMedia": 15,
    "successfulDownloads": 14,
    "failedDownloads": 1,
    "fallbackToUpload": true
  },
  "render_composite": {
    "renderTimeSeconds": 95,
    "outputSizeBytes": 18765432,
    "resolution": "1080x1920",
    "codec": "H.264"
  }
}
```

---

### 3. Export

**Description**: Represents a successfully rendered video file stored in Supabase Storage, available for download.

**Table Name**: `exports`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique export identifier |
| `project_id` | UUID | FOREIGN KEY → `projects(id)`, NOT NULL, ON DELETE CASCADE | - | Project this export belongs to |
| `render_job_id` | UUID | FOREIGN KEY → `render_jobs(id)`, NOT NULL, UNIQUE, ON DELETE CASCADE | - | Render job that produced this export |
| `video_url` | TEXT | NOT NULL | - | Supabase Storage signed URL (7-day expiry) or public URL |
| `duration_sec` | INTEGER | NOT NULL | - | Final video duration in seconds |
| `file_size_bytes` | BIGINT | NOT NULL | - | File size in bytes (for display) |
| `resolution` | TEXT | NOT NULL | `'1080x1920'` | Video dimensions (width × height) |
| `format` | TEXT | NOT NULL | `'mp4'` | File format (always MP4 for MVP) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Export creation timestamp |

**Indexes**:
- `project_id` (for querying project's exports)
- `render_job_id` (unique, one export per render job)
- `created_at` DESC (for sorting exports by recency)

**Relationships**:
- Many-to-one with `projects` (export → project)
- One-to-one with `render_jobs` (export → render_job)

**Storage Path Pattern** (Supabase Storage):
```
exports/
  {user_id}/
    {project_id}/
      {render_job_id}.mp4
```

**RLS Policy** (Security):
```sql
-- Only project owner can view exports
CREATE POLICY "Users can view own exports"
ON exports FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Only project owner can insert exports (enforced at application level via worker)
CREATE POLICY "Users can insert own exports"
ON exports FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);
```

---

### 4. Scene (Extended)

**Description**: Extended scene entity with subtitle timing data for Karaoke effect.

**Table Name**: `scenes` (existing table from Feature 001)

**New Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `subtitle_timing` | JSONB | NULL | - | Word/sentence-level timing data for Karaoke subtitle synchronization. Format: `[{word: "The", start_ms: 0, end_ms: 200}, ...]` |
| `subtitle_style_preset_id` | TEXT | FOREIGN KEY → `subtitle_presets(id)`, NULL | - | Selected subtitle preset (Minimal/Highlight/Karaoke) |

**subtitle_timing JSONB Schema**:
```json
[
  {
    "word": "The",
    "start_ms": 0,
    "end_ms": 200
  },
  {
    "word": "steak",
    "start_ms": 200,
    "end_ms": 500
  },
  {
    "word": "sizzles",
    "start_ms": 500,
    "end_ms": 800
  }
]
```

**Fallback Schema** (sentence-level highlighting if word-level timing unavailable):
```json
[
  {
    "sentence": "The steak sizzles perfectly",
    "start_ms": 0,
    "end_ms": 1200
  }
]
```

**Indexes**:
- Add GIN index on `subtitle_timing` for JSONB queries (if needed for filtering): `CREATE INDEX idx_scenes_subtitle_timing ON scenes USING GIN (subtitle_timing);`

---

## Migration SQL

```sql
-- Migration: 20250108_visuals_video_rendering.sql

-- Create render_jobs table
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

-- Create job_steps table
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

-- Create exports table
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

-- Add new columns to scenes table
ALTER TABLE scenes
  ADD COLUMN IF NOT EXISTS subtitle_timing JSONB,
  ADD COLUMN IF NOT EXISTS subtitle_style_preset_id TEXT REFERENCES subtitle_presets(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON render_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_status_created_at ON render_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_render_jobs_updated_at ON render_jobs(updated_at);
CREATE INDEX IF NOT EXISTS idx_job_steps_render_job_id_step_name ON job_steps(render_job_id, step_name);
CREATE INDEX IF NOT EXISTS idx_job_steps_render_job_id_status ON job_steps(render_job_id, status);
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_render_job_id ON exports(render_job_id);
CREATE INDEX IF NOT EXISTS idx_scenes_subtitle_timing ON scenes USING GIN (subtitle_timing);

-- Enable Row Level Security
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for render_jobs
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

-- RLS Policies for job_steps (inherited from render_jobs via project_id)
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

-- RLS Policies for exports
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

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_render_jobs_updated_at
  BEFORE UPDATE ON render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Validation Rules

### Render Job Validation
- **Before insert**: Check that `project.status` is not already 'rendering' (prevent concurrent renders)
- **Before update to 'running'**: Verify `storyboard_script_version_snapshot` matches `project.storyboard_script_version`
- **Before update to 'succeeded'**: Verify all `job_steps` have status='done'
- **Before update to 'failed'**: Require `error_code` and `error_message` to be set

### Job Step Validation
- **Before insert**: Verify `step_name` follows correct order (tts_generation → subtitle_generation → media_fetch → render_composite)
- **Before update to 'running'**: Set `started_at = NOW()`
- **Before update to 'done' or 'failed'**: Set `ended_at = NOW()` and require `log` field

### Export Validation
- **Before insert**: Verify `render_job.status = 'succeeded'` (only successful renders produce exports)
- **Before insert**: Verify `video_url` is a valid URL format
- **Before insert**: Verify `file_size_bytes > 0` (non-zero file size)

## Summary Statistics

- **New Tables**: 3 (`render_jobs`, `job_steps`, `exports`)
- **Extended Tables**: 1 (`scenes` with 2 new columns)
- **New Indexes**: 9
- **RLS Policies**: 7 (enforce user isolation)
- **Foreign Keys**: 4 (maintain referential integrity)
- **Check Constraints**: 7 (ensure data validity)

**Total Lines of Migration SQL**: ~150 lines
