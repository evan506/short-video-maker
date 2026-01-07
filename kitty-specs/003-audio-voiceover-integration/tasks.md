# Tasks: Audio Voiceover Integration with Edge TTS

**Feature**: 003 - Audio Voiceover Integration with Edge TTS
**Branch**: `003-audio-voiceover-integration`
**Generated**: 2026-01-06

## Overview

Implement end-to-end audio generation using Edge TTS (free), curated background music library, and FFmpeg-based audio mixing. Total: **7 work packages** with **32 subtasks**.

---

## WP01 - Database Schema & Music Library Seeding (Priority: P0) ✅ DONE

**Goal**: Create database tables and seed curated music library
**User Story**: Foundation for all audio features
**Estimated Effort**: 4-6 hours
**Status**: Complete - See `tasks/done/WP01-database-music-seeding.md`

### Subtasks

- [x] **T001**: Create migration file `20250106_audio_voiceover_integration.sql` with 4 tables (scene_audio, audio_generation_jobs, background_music, tts_previews)
- [x] **T002**: Add RLS policies for per-user access control on scene_audio, audio_generation_jobs, tts_previews
- [x] **T003**: Create indexes for performance (scene_id, audio_type, status, mood, text_hash)
- [x] **T004**: Source 20 royalty-free tracks from YouTube Audio Library (4-5 per mood: upbeat, calm, dramatic, inspirational)
- [x] **T005**: Create admin script `scripts/seed-music-library.ts` to upload tracks to Supabase Storage and insert metadata
- [ ] **T006**: Run seed script and verify background_music table has 20 records with storage_url populated ⏸️ **DEFERRED** - Manual seeding by user

### Dependencies
- None (foundation work)

### Definition of Done
- ✅ Migration created with correct structure (pending application)
- ✅ All 4 tables exist in migration file
- ✅ RLS policies prevent cross-user access
- ⏸️ background_music table seeding deferred (user to complete manually)
- ⏸️ Music files upload deferred (user to complete manually)

---

## WP02 - Edge TTS Service Integration (Priority: P1) ✅ DONE

**Goal**: Integrate Edge TTS for voiceover generation
**User Story**: User Story 1 - Voice Selection and Voiceover Generation
**Estimated Effort**: 6-8 hours
**Status**: Complete - See `tasks/done/WP02-edge-tts-service.md`

### Subtasks

- [x] **T007**: Install Edge TTS package (`edge-tts` or `@discordjs/edge-tts`)
- [x] **T008**: Create `src/server/services/tts-service.ts` with Edge TTS wrapper functions
- [x] **T009**: Implement `generateVoiceover(text, voiceName)` function with error handling and retry logic (up to 2 retries)
- [x] **T010**: Create `src/server/utils/text-hasher.ts` for SHA-256 hash generation (text + voice_id)
- [x] **T011**: Create `src/server/services/audio-storage.ts` with Supabase Storage upload/download functions
- [x] **T012**: Implement signed URL generation with 60-second TTL
- [x] **T013**: Create API route `POST /api/scenes/:sceneId/tts/preview` with cache check logic
- [x] **T014**: Insert cache record to tts_previews table with text_hash and 10-minute expires_at
- [x] **T015**: Create `src/server/services/audio-cache.ts` with cache lookup and cleanup functions

### Dependencies
- Depends on: WP01 (scene_audio, tts_previews tables must exist)

### Parallel Opportunities
- T007-T010 can be done in parallel with T011-T012 (different files)

### Definition of Done
- Edge TTS generates voiceovers successfully (<5 seconds for <50 words)
- Cache lookup prevents regeneration (same text + voice)
- Signed URLs work for audio playback
- tts_previews table populated with cache entries
- Error handling includes retry logic

---

## WP03 - Voice Library UI (Priority: P1) ✅ DONE

**Goal**: Build voice selection UI with sample playback
**User Story**: User Story 1 - Voice Selection and Voiceover Generation
**Estimated Effort**: 4-6 hours
**Status**: Complete - See `tasks/done/WP03-voice-library-ui.md`

### Subtasks

- [x] **T016**: Create `src/ui/components/audio/VoiceLibrary.tsx` component with voice list display
- [x] **T017**: Add voice cards with name, language, gender, and "Play Sample" button
- [x] **T018**: Implement sample audio playback (pre-recorded static files, not generated) ⚠️ **Sample files missing** - Code references `/static/voice-samples/` but files not created yet
- [x] **T019**: Create `src/ui/hooks/useVoiceSelection.ts` hook for voice state management
- [x] **T020**: Add "Apply Voice" button that calls `PATCH /api/projects/:projectId/voice`
- [x] **T021**: Update projects.voice_id and show selected voice indicator in UI
- [x] **T022**: Persist voice selection across page refreshes

### Dependencies
- Depends on: WP02 (TTS API endpoint must exist)

### Parallel Opportunities
- T016-T018 (UI components) can be done in parallel with T019-T020 (hook + API integration)

### Definition of Done
- ✅ Voice library displays 10+ voices
- ⚠️ Sample audio plays within 1 second (needs audio files)
- ✅ Selected voice persists and shows in UI
- ✅ API call successfully updates projects.voice_id

---

## WP04 - TTS Preview Player UI (Priority: P1)

**Goal**: Build scene-level TTS preview generation and playback
**User Story**: User Story 1 - Voice Selection and Voiceover Generation
**Estimated Effort**: 4-6 hours
**Status**: ✅ **Complete** (2026-01-08: Approved with fixes - see `tasks/done/WP04-tts-preview-ui.md`)

### Subtasks

- [x] **T023**: Create `src/ui/components/audio/TTSPreviewPlayer.tsx` with play/pause/stop controls
- [x] **T024**: Add "Preview Voiceover" button to scene card in storyboard editor
- [x] **T025**: Implement loading state during generation (spinner or progress indicator)
- [x] **T026**: Call `/api/scenes/:sceneId/tts/preview` and handle response (audioUrl, duration, cached)
- [x] **T027**: Display "cached" badge when audio retrieved from cache
- [x] **T028**: Create `src/ui/hooks/useTTSPreview.ts` hook for preview generation and caching logic
- [x] **T029**: Display error messages with retry button on failure

### Dependencies
- Depends on: WP02 (TTS API), WP03 (voice must be selected)

### Parallel Opportunities
- T023-T025 (UI components) can be done in parallel with T028-T029 (hook + logic)

### Definition of Done
- TTS preview generates in <5 seconds
- Cached previews replay instantly (<0.5 seconds)
- Loading state shows during generation
- Error handling with retry works

---

## WP05 - Music Library UI (Priority: P1)

**Goal**: Build background music selection UI
**User Story**: User Story 2 - Background Music Selection and Audio Mixing
**Estimated Effort**: 4-6 hours
**Status**: ✅ **Complete** (2026-01-08: Approved without changes - see `tasks/done/WP05-music-library-ui.md`)

### Subtasks

- [x] **T030**: Create `src/ui/components/audio/MusicLibrary.tsx` with track list display
- [x] **T031**: Add mood filter buttons (upbeat, calm, dramatic, inspirational)
- [x] **T032**: Implement track cards with title, artist, duration, mood tags, energy level
- [x] **T033**: Add "Play Preview" button for each track
- [x] **T034**: Call `GET /api/music/library` with mood filter query params
- [x] **T035**: Add "Apply to Scene" button that assigns music track to scene (application state or DB)
- [x] **T036**: Add volume slider (0-100%) with real-time preview

### Dependencies
- Depends on: WP01 (background_music table must be seeded)

### Parallel Opportunities
- T030-T033 (UI components) can be done in parallel with T034-T036 (API integration)

### Definition of Done
- Music library loads ~20 tracks within 2 seconds
- Mood filtering works correctly
- Music previews play without delay
- Selected track persists in scene state
- Volume control updates real-time

---

## WP06 - Audio Mixing Worker & UI (Priority: P1)

**Goal**: Implement FFmpeg audio mixing in worker and mixer UI
**User Story**: User Story 2 - Background Music Selection and Audio Mixing
**Estimated Effort**: 6-8 hours

### Subtasks

- [ ] **T037**: Install `fluent-ffmpeg` package
- [ ] **T038**: Create `src/worker/services/audio-mixing.ts` with FFmpeg mixing logic
- [ ] **T039**: Implement mix function with voiceover/music volume controls (default 0.8/0.4)
- [ ] **T040**: Add fade-in/fade-out support (configurable duration, default 1-2 seconds)
- [ ] **T041**: Handle duration mismatch (loop short music, trim/fade long music)
- [ ] **T042**: Create API route `POST /api/scenes/:sceneId/audio/mix` that creates audio_generation_jobs record
- [ ] **T043**: Worker polls for jobs with status='pending', processes, updates to 'completed'
- [ ] **T044**: Upload mixed audio to Supabase Storage as `audio_type='mixed'`
- [ ] **T045**: Create `src/ui/components/audio/AudioMixer.tsx` with volume sliders
- [ ] **T046**: Add "Mix Audio" button that calls mixing API and shows progress
- [ ] **T047**: Implement polling or SSE for job status updates
- [ ] **T048**: Display mixed audio player when job completes

### Dependencies
- Depends on: WP02 (voiceover exists), WP05 (music selected), WP01 (scene_audio table exists)

### Parallel Opportunities
- T037-T041 (worker service) can be done in parallel with T045-T048 (UI components)

### Definition of Done
- Audio mixing completes in <3 seconds per scene
- Mixed audio has balanced levels (voiceover clearly audible)
- Volume controls accurately reflected in output
- Fade transitions are smooth
- Job status tracking works end-to-end

---

## WP07 - Batch Voiceover Generation (Priority: P2)

**Goal**: Enable batch TTS generation for all project scenes
**User Story**: User Story 3 - Batch Voiceover Generation for All Scenes
**Estimated Effort**: 4-6 hours

### Subtasks

- [ ] **T049**: Add "Generate All Voiceovers" button to storyboard header
- [ ] **T050**: Create API route `POST /api/scenes/tts/batch` that iterates all project scenes
- [ ] **T051**: Generate one audio_generation_jobs record per scene (status='pending')
- [ ] **T052**: Worker processes jobs in parallel (respecting concurrency limits)
- [ ] **T053**: Create `src/ui/components/audio/BatchVoiceoverGenerator.tsx` with progress overlay
- [ ] **T054**: Display "X/Y scenes generated" progress counter
- [ ] **T055**: Show per-scene status (pending/processing/completed/failed)
- [ ] **T056**: Handle failures gracefully - continue with remaining scenes
- [ ] **T057**: Provide "Retry Failed Scenes" button after batch completes

### Dependencies
- Depends on: WP02 (TTS service), WP04 (preview player UI)

### Parallel Opportunities
- T049-T052 (backend batch logic) can be done in parallel with T053-T057 (UI components)

### Definition of Done
- Batch processes all project scenes (~6 seconds per scene average)
- Progress updates accurately show completion
- Individual scene failures don't block entire batch
- Retry functionality works
- User can proceed to video rendering after batch completes

---

## Summary Statistics

**Total Work Packages**: 7
**Total Subtasks**: 32

**By Priority**:
- P0 (Foundation): 1 work package (6 subtasks)
- P1 (Core User Stories): 5 work packages (23 subtasks)
- P2 (Enhancement): 1 work package (9 subtasks)

**Parallelization Opportunities**:
- WP02 + WP03 + WP04 can start after WP01 (some parallel work possible)
- WP05 independent of WP02-WP04 (can run in parallel)
- WP06 requires WP02 + WP05 to complete
- WP07 requires WP02 + WP04

**Estimated Timeline** (assuming 1 developer, sequential execution):
- Foundation: 0.5 days
- Core Features: 2-3 days
- Polish: 0.5 days
- **Total**: 3-4 days for MVP

**MVP Scope**: WP01 through WP06 (P0 + P1 work packages)
**Phase 4+**: Enhancements, optimizations, advanced features

---

## Execution Order

```
WP01 (Database & Music) [Day 1]
  ↓
WP02 (TTS Service) + WP03 (Voice UI) + WP05 (Music UI) [Day 2-3, parallel]
  ↓
WP04 (TTS Preview UI) [Day 3]
  ↓
WP06 (Audio Mixing) [Day 4]
  ↓
WP07 (Batch Generation) [Day 4-5, optional for MVP]
```
