---
work_package_id: "WP01"
subtasks: ["T001", "T002", "T003", "T004", "T005", "T006"]
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "1271"
title: "Database Schema & Music Library Seeding"
history:
  - date: 2026-01-06
    event: Created
  - date: 2026-01-06T00:45:00Z
    event: Moved to doing lane - Started implementation
  - date: 2026-01-06T00:48:00Z
    event: Implementation complete - Ready for review
---

# WP01: Database Schema & Music Library Seeding

## Objective
Create the database schema for the audio voiceover integration feature and seed the curated background music library with ~20 royalty-free tracks from YouTube Audio Library.

## Context
This is the foundational work package. All subsequent work packages depend on the database tables being created and the music library being populated.

## Subtasks

### T001: Create migration file
Create `supabase/migrations/20250106_audio_voiceover_integration.sql` with:
- `scene_audio` table (scene_id, audio_type, storage_url, duration_sec, etc.)
- `audio_generation_jobs` table (scene_id, job_type, status, tts_provider, error_message)
- `background_music` table (title, artist, mood, energy_level, tempo, tags)
- `tts_previews` table (project_id, scene_id, voice_id, text_hash, audio_url, expires_at)

### T002: Add RLS policies
Enable Row-Level Security on scene_audio, audio_generation_jobs, tts_previews and create policies to restrict access based on auth.uid().

### T003: Create indexes
Add indexes for:
- scene_audio: (scene_id), (scene_id, audio_type)
- audio_generation_jobs: (status, created_at), (scene_id)
- background_music: (mood) using GIN, (title) using GIN, (energy_level)
- tts_previews: (text_hash, voice_id) unique, (expires_at)

### T004: Source music tracks
Download 20 royalty-free tracks from YouTube Audio Library:
- 4 upbeat tracks
- 5 calm tracks
- 5 dramatic tracks
- 5 inspirational tracks

### T005: Create seed script
Create `scripts/seed-music-library.ts` that:
1. Reads music metadata from JSON or hardcoded array
2. Uploads each track to Supabase Storage bucket `music-library/`
3. Inserts records into background_music table with storage_url and metadata

### T006: Run seed script
Execute the seed script and verify:
- All 20 records exist in background_music table
- All files uploaded to Supabase Storage
- storage_url populated correctly

## Definition of Done
- [ ] Migration applies successfully
- [ ] All 4 tables created with correct structure
- [ ] RLS policies prevent cross-user access
- [ ] Indexes created for performance
- [ ] background_music has 20 records
- [ ] All music files accessible in Storage

## Risks
- YouTube Audio Library may change - download tracks ASAP
- Supabase Storage bucket creation may require manual setup in dashboard
