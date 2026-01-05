# Data Model: Script & Storyboard Editor

**Feature**: 001-script-storyboard-editor
**Phase**: 1 (Design & Contracts)
**Date**: 2026-01-02
**Status**: Complete

## Overview

This document defines the data model for the Script & Storyboard Editor feature, including entity relationships, field specifications, validation rules, and state transitions.

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
│ user_id (FK) ──────────────────────────────────────────────┐         │
│ title                                                          │         │
│ topic                                                          │         │
│ platform (shorts|tiktok|reels)                                │         │
│ video_type (Explainer|Marketing|Tutorial|Recipe|Story)       │         │
│ target_duration (15|30|60)                                    │         │
│ status (draft|rendering|done|failed)                          │         │
│ current_script_version                                        │         │
│ storyboard_script_version                                     │         │
│ voice_id (TEXT, NULL for Phase 1)                             │         │
│ created_at                                                     │         │
│ updated_at                                                     │         │
└──────────────────────────┬─────────────────────────────────────┘         │
                           │ 1                                               │
                           │                                                 │
                           │ N                                               │
           ┌───────────────┴──────────────────┐              ┌──────────────┴───────────────┐
           │                                  │              │                              │
           │ N                                │ 1            │ 1                            │ N
┌──────────────────────┐          ┌───────────────────────┐     ┌──────────────────────────┐
│      scripts         │          │        scenes          │     │   subtitle_presets       │
├──────────────────────┤          ├───────────────────────┤     ├──────────────────────────┤
│ id (PK)              │          │ id (PK)               │     │ id (PK)                  │
│ project_id (FK)      │          │ project_id (FK)       │     │ name                      │
│ version (UNIQUE)     │          │ order_index (UNIQUE)  │     │ description               │
│ content              │          │ narration_text        │     │ config (JSONB)            │
│ source (llm|user)    │          │ duration_sec_draft    │     └──────────────────────────┘
│ created_at           │          │ duration_sec_final    │
└──────────────────────┘          │ primary_keyword       │
                                  │ subtitle_style_preset  │
                                  │ created_at            │
                                  │ updated_at            │
                                  └───────────────────────┘

Note: render_jobs and job_steps are defined in spec but NOT created in Phase 1
```

## Entity Definitions

### 1. Project

**Description**: Represents a video creation project with topic, configuration, and current status.

**Table Name**: `projects`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique project identifier |
| `user_id` | UUID | FOREIGN KEY → `auth.users(id)`, NOT NULL, ON DELETE CASCADE | - | Owner of the project (Supabase Auth user) |
| `title` | TEXT | NOT NULL | - | Project title (auto-generated from topic or user-defined) |
| `topic` | TEXT | NOT NULL, MIN 10 chars, MAX 500 chars | - | User's topic description for the video |
| `platform` | TEXT | NOT NULL, CHECK: `IN ('shorts', 'tiktok', 'reels')` | - | Target platform for video distribution |
| `video_type` | TEXT | NOT NULL, CHECK: `IN ('Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story')` | - | Video type preset |
| `target_duration` | INTEGER | NOT NULL, CHECK: `IN (15, 30, 60)` | - | Target video duration in seconds (max 60) |
| `status` | TEXT | NOT NULL, CHECK: `IN ('draft', 'rendering', 'done', 'failed')` | `'draft'` | Current project status |
| `current_script_version` | INTEGER | NULL | - | Latest script version number (NULL if no script generated) |
| `storyboard_script_version` | INTEGER | NULL | - | Script version used to generate current scenes (NULL if scenes not generated) |
| `voice_id` | TEXT | NULL | - | Selected voice identifier (reserved for Phase 2, unused in Phase 1) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Project creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last modification timestamp |

**Indexes**:
- `user_id` (for RLS policy performance)
- `created_at` DESC (for project dashboard sorting by "last modified")
- `status` (for filtering projects by state)

**Relationships**:
- One-to-many with `scripts` (project → script versions)
- One-to-many with `scenes` (project → storyboard scenes)
- Many-to-one with `auth.users` (project → user)

**Validation Rules**:
- `topic` length: 10 ≤ length ≤ 500 characters (FR-001)
- `target_duration`: Maximum 60 seconds (FR-003, Constitution)
- `current_script_version`: Must be ≤ max version in `scripts` table for project
- `storyboard_script_version`: Must be ≤ `current_script_version` if both non-NULL

**State Transitions**:
```
draft → rendering → done
  ↘──────────────→ failed (from rendering)
  ↘─────────────────────→ rendering (retry after failure)
```

**RLS Policies**:
```sql
-- Users can view own projects
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (user_id = auth.uid());

-- Users can insert own projects
CREATE POLICY "Users can insert own projects"
ON projects FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update own projects
CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete own projects
CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
USING (user_id = auth.uid());
```

---

### 2. Script

**Description**: Represents a versioned narration script for a project.

**Table Name**: `scripts`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique script identifier |
| `project_id` | UUID | FOREIGN KEY → `projects(id)`, NOT NULL, ON DELETE CASCADE | - | Owning project |
| `version` | INTEGER | NOT NULL, UNIQUE(project_id, version) | - | Incrementing version number starting at 1 |
| `content` | TEXT | NOT NULL, MIN 50 chars | - | Full narration script text |
| `source` | TEXT | NOT NULL, CHECK: `IN ('llm', 'user')` | - | Source of script: LLM-generated or user-edited |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Script creation timestamp |

**Indexes**:
- `project_id` (for querying all script versions for a project)
- `version` DESC (for retrieving latest version)

**Relationships**:
- Many-to-one with `projects` (script → project)
- One script per project per version number (unique constraint)

**Validation Rules**:
- `version` starts at 1 for first script, increments by 1 for each new version
- `version` must be ≤ `project.current_script_version` if script is latest
- `content` minimum length: 50 characters (FR-005, ensure meaningful content)

**Version Management**:
- Version numbers are **strictly incremental** (no gaps, no reuse)
- Only the latest version is "active" and editable
- Historical versions are read-only (for audit/restore)
- Version restoration creates a new version (does not overwrite)

**RLS Policies**:
```sql
-- Users can view own scripts (via projects)
CREATE POLICY "Users can view own scripts"
ON scripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can insert scripts for own projects
CREATE POLICY "Users can insert scripts for own projects"
ON scripts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can update own scripts (only if latest version)
CREATE POLICY "Users can update own latest scripts"
ON scripts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
    AND projects.current_script_version = scripts.version
  )
);

-- Users can delete own scripts
CREATE POLICY "Users can delete own scripts"
ON scripts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);
```

---

### 3. Scene

**Description**: Represents a single visual scene within a storyboard.

**Table Name**: `scenes`

**Primary Key**: `id` (UUID, auto-generated)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique scene identifier |
| `project_id` | UUID | FOREIGN KEY → `projects(id)`, NOT NULL, ON DELETE CASCADE | - | Owning project |
| `order_index` | INTEGER | NOT NULL, UNIQUE(project_id, order_index) | - | Position/order in storyboard (0-based) |
| `narration_text` | TEXT | NOT NULL | - | Narration script segment for this scene |
| `duration_sec_draft` | INTEGER | NOT NULL, CHECK: `≥ 1` | - | User-editable draft duration in seconds |
| `duration_sec_final` | INTEGER | NULL | - | Final duration after TTS (NULL in Phase 1, Phase 2) |
| `primary_keyword` | TEXT | NOT NULL | - | Search keyword for media matching |
| `subtitle_style_preset_id` | INTEGER | FOREIGN KEY → `subtitle_presets(id)`, NOT NULL | `1` | Subtitle style preset reference |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Scene creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last modification timestamp |

**Indexes**:
- `project_id` (for querying all scenes for a project)
- `order_index` ASC (for ordered scene display)

**Relationships**:
- Many-to-one with `projects` (scene → project)
- Many-to-one with `subtitle_presets` (scene → preset)

**Validation Rules**:
- `duration_sec_draft`: Must be ≥ 1 second (FR-037, FR-045)
- `order_index`: Must be sequential (0, 1, 2, ...) with no gaps
- `primary_keyword`: Cannot be empty string

**Scene Reordering**:
- Reordering updates `order_index` for all affected scenes
- No gaps allowed after reorder (reindex all scenes)
- Optimistic locking via `updated_at` to prevent conflicts

**RLS Policies**:
```sql
-- Users can view own scenes (via projects)
CREATE POLICY "Users can view own scenes"
ON scenes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can insert scenes for own projects
CREATE POLICY "Users can insert scenes for own projects"
ON scenes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can update own scenes
CREATE POLICY "Users can update own scenes"
ON scenes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Users can delete own scenes
CREATE POLICY "Users can delete own scenes"
ON scenes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);
```

---

### 4. Subtitle Preset

**Description**: Reference data for subtitle style presets (Minimal, Highlight, Karaoke).

**Table Name**: `subtitle_presets`

**Primary Key**: `id` (INTEGER, manual)

**Fields**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY, NOT NULL | - | Preset identifier (1, 2, 3, ...) |
| `name` | TEXT | NOT NULL, UNIQUE | - | Preset display name (e.g., "Minimal", "Highlight") |
| `description` | TEXT | NULL | - | Human-readable description of preset |
| `config` | JSONB | NOT NULL | - | Preset configuration (font, color, animation, etc.) |

**Indexes**:
- `name` (for preset lookup by name)

**Relationships**:
- One-to-many with `scenes` (preset → scenes)

**Validation Rules**:
- `name` must be unique (no duplicate preset names)
- `config` must be valid JSON

**Seed Data** (from spec FR-039):
```sql
INSERT INTO subtitle_presets (id, name, description, config) VALUES
(1, 'Minimal', 'Clean and simple subtitles with minimal styling', '{"fontSize": "16px", "color": "#FFFFFF", "position": "bottom"}'),
(2, 'Highlight', 'Bold subtitles with highlight effect for emphasis', '{"fontSize": "20px", "color": "#FFFF00", "backgroundColor": "#000000", "position": "bottom"}'),
(3, 'Karaoke', 'Karaoke-style subtitles with word-by-word animation', '{"fontSize": "18px", "color": "#00FFFF", "animation": "karaoke", "position": "center"}');
```

**RLS Policies**:
```sql
-- All users can view subtitle presets (read-only reference data)
CREATE POLICY "All users can view subtitle presets"
ON subtitle_presets FOR SELECT
USING (true);

-- No INSERT/UPDATE/DELETE policies (reference data is immutable)
```

---

### 5. Render Job (Phase 2 Spec Only)

**Description**: Represents an async rendering job with state tracking. **NOT CREATED IN PHASE 1**.

**Table Name**: `render_jobs` (reserved for Phase 2)

**Status**: SPEC ONLY - Do not create this table in Phase 1 migrations

**Fields** (from spec FR-056 to FR-063):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique job identifier |
| `project_id` | UUID | FOREIGN KEY → `projects(id)` | Owning project |
| `status` | TEXT | CHECK: `IN ('queued', 'running', 'succeeded', 'failed', 'canceled')` | Job status |
| `current_step` | TEXT | CHECK: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')` | Current processing step |
| `progress` | INTEGER | CHECK: `0 ≤ progress ≤ 100` | Progress percentage |
| `retry_count` | INTEGER | DEFAULT 0 | Number of retry attempts |
| `storyboard_script_version_snapshot` | INTEGER | NOT NULL | Fixed storyboard state at job start |
| `voice_id_snapshot` | TEXT | NOT NULL | Fixed voice selection at job start |
| `script_version_snapshot` | INTEGER | NOT NULL | Audit: script version used |
| `error_code` | TEXT | NULL | Error code for failures |
| `error_message` | TEXT | NULL | Human-readable error message |
| `created_at` | TIMESTAMPTZ | NOT NULL | Job creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp (for stalled job detection) |

**State Transitions** (from spec):
```
queued → running → succeeded
  ↘────────────────→ failed
  ↘────────────────→ canceled
```

**Stalled Job Detection** (from spec FR-062):
- Timeout threshold: 15 minutes without `updated_at` change
- Recovery action: Mark as `failed` or requeue

---

### 6. Job Step (Phase 2 Spec Only)

**Description**: Represents a single step within a render job. **NOT CREATED IN PHASE 1**.

**Table Name**: `job_steps` (reserved for Phase 2)

**Status**: SPEC ONLY - Do not create this table in Phase 1 migrations

**Fields** (from spec FR-057, FR-058):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique step identifier |
| `render_job_id` | UUID | FOREIGN KEY → `render_jobs(id)` | Parent render job |
| `step_name` | TEXT | CHECK: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')` | Step name |
| `status` | TEXT | CHECK: `IN ('pending', 'running', 'failed', 'done')` | Step status |
| `start_time` | TIMESTAMPTZ | NULL | Step start timestamp |
| `end_time` | TIMESTAMPTZ | NULL | Step end timestamp |
| `log` | TEXT | NULL | Error details or status notes |

---

## TypeScript Types

```typescript
// src/types/editor.ts

export interface Project {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  platform: 'shorts' | 'tiktok' | 'reels';
  video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
  target_duration: 15 | 30 | 60;
  status: 'draft' | 'rendering' | 'done' | 'failed';
  current_script_version: number | null;
  storyboard_script_version: number | null;
  voice_id: string | null; // Reserved for Phase 2
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  version: number;
  content: string;
  source: 'llm' | 'user';
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  duration_sec_draft: number;
  duration_sec_final: number | null; // NULL in Phase 1
  primary_keyword: string;
  subtitle_style_preset_id: number;
  created_at: string;
  updated_at: string;
}

export interface SubtitlePreset {
  id: number;
  name: string;
  description: string | null;
  config: Record<string, unknown>; // JSONB config
}

// Phase 2 types (spec only)
export interface RenderJob {
  id: string;
  project_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  current_step: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  progress: number; // 0-100
  retry_count: number;
  storyboard_script_version_snapshot: number;
  voice_id_snapshot: string;
  script_version_snapshot: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStep {
  id: string;
  render_job_id: string;
  step_name: 'tts_generation' | 'subtitle_generation' | 'media_fetch' | 'render_composite';
  status: 'pending' | 'running' | 'failed' | 'done';
  start_time: string | null;
  end_time: string | null;
  log: string | null;
}
```

## Zod Validation Schemas

```typescript
// src/server/validators/editor-validators.ts

import { z } from 'zod';

export const createProjectSchema = z.object({
  topic: z.string().min(10).max(500),
  platform: z.enum(['shorts', 'tiktok', 'reels']),
  video_type: z.enum(['Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story']),
  target_duration: z.enum([15, 30, 60]),
});

export const updateProjectSchema = z.object({
  title: z.string().optional(),
  topic: z.string().min(10).max(500).optional(),
  platform: z.enum(['shorts', 'tiktok', 'reels']).optional(),
  video_type: z.enum(['Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story']).optional(),
  target_duration: z.enum([15, 30, 60]).optional(),
});

export const generateScriptSchema = z.object({
  project_id: z.string().uuid(),
});

export const createScriptSchema = z.object({
  project_id: z.string().uuid(),
  content: z.string().min(50),
  source: z.enum(['llm', 'user']),
});

export const updateScriptSchema = z.object({
  content: z.string().min(50).optional(),
});

export const createScenesSchema = z.object({
  project_id: z.string().uuid(),
  script_version: z.number().int().positive(),
});

export const updateSceneSchema = z.object({
  narration_text: z.string().optional(),
  duration_sec_draft: z.number().int().positive().optional(),
  primary_keyword: z.string().min(1).optional(),
  subtitle_style_preset_id: z.number().int().positive().optional(),
  order_index: z.number().int().nonnegative().optional(),
});

export const reorderScenesSchema = z.object({
  scene_ids: z.array(z.string().uuid()), // New order of scene IDs
});
```

## Data Model Summary

**Tables Created in Phase 1**:
1. ✅ `projects` - Video creation projects
2. ✅ `scripts` - Versioned narration scripts
3. ✅ `scenes` - Storyboard scenes
4. ✅ `subtitle_presets` - Subtitle style presets (reference data)

**Tables Reserved for Phase 2** (spec only, NOT created):
5. ⏸️ `render_jobs` - Async rendering jobs
6. ⏸️ `job_steps` - Render job step tracking

**Key Relationships**:
- `auth.users` → `projects` (one-to-many)
- `projects` → `scripts` (one-to-many)
- `projects` → `scenes` (one-to-many)
- `subtitle_presets` → `scenes` (one-to-many)

**Constraints & Validation**:
- Foreign keys ensure referential integrity
- Unique constraints prevent duplicate versions/scenes
- CHECK constraints enforce business rules (platform, duration, status)
- RLS policies enforce user data isolation

**Next Step**: Generate API contracts (`contracts/openapi.yaml`, `contracts/postman-collection.json`)

---

**Data Model Completed By**: Claude (AI Planning Agent)
**Data Model Date**: 2026-01-02
**Next Action**: Generate API contracts
