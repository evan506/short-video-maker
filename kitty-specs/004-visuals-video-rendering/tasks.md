# Tasks: Visuals and Video Rendering

**Feature**: 004-visuals-video-rendering
**Branch**: `004-visuals-video-rendering`
**Generated**: 2026-01-08
**Status**: Ready for Implementation

## Overview

This document breaks down the Visuals and Video Rendering feature into 8 work packages (WP00-WP07), each independently implementable and testable. Work packages are sequenced by dependency: infrastructure setup → core services → UI components → end-to-end testing.

**Implementation Order**: WP00 → WP01 → WP02 → WP03 → WP04 → WP05 → WP06 → WP07
**MVP Scope**: WP00-WP05 (database, APIs, worker, rendering) delivers a functional "Script to Video" pipeline
**Polish Scope**: WP06-WP07 adds progress tracking UI and comprehensive testing

---

## WP00: Database & Storage Setup

**Goal**: Create database schema, indexes, RLS policies, and Supabase Storage bucket for render jobs, job steps, and exports.

**Priority**: P0 (blocks all other work packages)

**Independent Test**: Verify migration runs successfully, tables are created with indexes, and RLS policies enforce user isolation.

**Included Subtasks**:
- [x] T001: Create database migration file (`20250108_visuals_video_rendering.sql`) ✅
- [x] T002: Add `render_jobs` table with indexes and check constraints ✅
- [x] T003: Add `job_steps` table with composite indexes ✅
- [x] T004: Add `exports` table with foreign key to `render_jobs` ✅
- [x] T005: Extend `scenes` table with `subtitle_timing` (JSONB) and `subtitle_style_preset_id` columns ✅
- [x] T006: Create `updated_at` trigger function and attach to `render_jobs` ✅
- [x] T007: Enable Row Level Security (RLS) on all new tables ✅
- [x] T008: Create RLS policies for user isolation (render_jobs, job_steps, exports) ✅
- [x] T009: Create Supabase Storage bucket `exports` with folder structure ✅
- [x] T010: Write migration rollback script (drop tables, policies, triggers) ✅

**Task Prompt**: `tasks/done/WP00-database-storage-setup.md`

**Implementation Sketch**:
1. Create migration file in `migrations/` directory following naming convention
2. Define `render_jobs` table with status check constraint (queued/running/succeeded/failed/canceled)
3. Define `job_steps` table with unique constraint on `(render_job_id, step_name)`
4. Define `exports` table with unique constraint on `render_job_id`
5. Add GIN index on `scenes.subtitle_timing` for JSONB queries
6. Create trigger function for `updated_at` auto-update
7. Enable RLS and create policies using `auth.uid()` for user isolation
8. Test migration locally with `supabase db reset` and verify table schemas
9. Create storage bucket via Supabase Dashboard or Terraform script
10. Document RLS policy test cases (user A cannot access user B's exports)

**Parallel Opportunities**: None (database schema changes must be sequential)

**Dependencies**: None (prerequisite for all other work packages)

**Risks**:
- RLS policies may block worker service role key access → Test with both user and service role contexts
- Migration may conflict with existing `scenes` table alterations → Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Storage bucket creation may require manual dashboard steps → Document setup steps for operations

**Definition of Done**:
- Migration runs without errors on local and staging databases
- All tables exist with correct indexes and constraints
- RLS policies prevent cross-user data access (verified with test queries)
- Storage bucket `exports` exists with appropriate folder structure
- Rollback script successfully drops all new objects

---

## WP01: Render API Endpoints

**Goal**: Implement Next.js API routes for render job creation, status polling, cancellation, and retry.

**Priority**: P1 (core user-facing functionality)

**Independent Test**: Create render job via API, poll status endpoint, cancel job, and retry failed job.

**Included Subtasks**:
- [x] T011: Create `src/server/routes/render-router.ts` with route handlers
- [x] T012: Implement `POST /api/render/jobs` (create render job with snapshots)
- [x] T013: Implement `GET /api/render/jobs/:jobId` (status polling endpoint)
- [x] T014: Implement `POST /api/render/jobs/:jobId/cancel` (cancellation endpoint)
- [x] T015: Implement `POST /api/render/jobs/:jobId/retry` (retry from failed step)
- [x] T016: Create `src/server/services/render-service.ts` for job creation logic
- [x] T017: Implement snapshot capture logic (storyboard_script_version, voice_id, script_version)
- [x] T018: Add request validation middleware (project ownership checks)
- [x] T019: Implement error responses with actionable messages (e.g., "Pexels download failed")
- [x] T020: Write API contract tests using OpenAPI spec

**Implementation Sketch**:
1. Set up Next.js App Router API routes in `src/app/api/render/`
2. Implement job creation endpoint that reads scenes from `projects` table and captures snapshots
3. Initialize `render_job` record with status='queued' and create 4 `job_steps` records (pending)
4. Implement status endpoint that returns job, job_steps, and progress % (calculated from completed steps)
5. Implement cancellation endpoint that updates status='canceled' if job is running/queued
6. Implement retry endpoint that resumes from failed step (doesn't re-complete steps with status='done')
7. Add middleware to verify `auth.uid()` owns the project before allowing job operations
8. Return HTTP 400 for invalid requests, 403 for permission errors, 404 for not found
9. Test with Postman/curl: create job → poll status → cancel → retry
10. Document API endpoints in OpenAPI spec (contracts/openapi.yaml)

**Parallel Opportunities**: T011-T015 can be developed in parallel (separate route files)

**Dependencies**: WP00 (database schema must exist)

**Risks**:
- Snapshot capture may race with concurrent storyboard edits → Use database transaction with `SELECT FOR UPDATE`
- Retry logic may skip steps incorrectly → Add unit tests for step state machine
- Rate limiting may be needed for job creation → Add Supabase rate limit plugin (deferred to Phase 2)

**Definition of Done**:
- All 4 API endpoints respond correctly to valid requests
- Status polling returns accurate progress % and current step
- Cancellation stops job within 5 seconds
- Retry resumes from failed step without re-completing done steps
- OpenAPI spec matches actual API behavior
- Contract tests pass (request/response validation)

---

## WP02: Google Cloud TTS Upgrade

**Goal**: Upgrade from Edge TTS to Google Cloud TTS with word-level timing support for Karaoke subtitles.

**Priority**: P1 (enables FR-12 Karaoke feature)

**Independent Test**: Generate TTS audio for a scene and verify word-level timemarks are stored in `scenes.subtitle_timing`.

**Included Subtasks**:
- [x] T021: Install `@google-cloud/text-to-speech` dependency
- [x] T022: Create `src/server/services/google-tts-service.ts` wrapper
- [x] T023: Configure Google Cloud TTS client with API credentials
- [x] T024: Implement TTS synthesis with `enableTimepoints: ['WORDS']` parameter
- [x] T025: Parse `timepoints` array from API response into word timings
- [x] T026: Store word timings in `scenes.subtitle_timing` JSONB column
- [x] T027: Implement fallback to sentence-level timing if word timings unavailable
- [x] T028: Add retry logic with exponential backoff (max 3 attempts)
- [x] T029: Handle API quota errors (HTTP 429) with graceful degradation
- [x] T030: Write unit tests for timing parser and fallback logic

**Implementation Sketch**:
1. Add Google Cloud TTS SDK to package.json and set up service account credentials
2. Create service wrapper that accepts narration text, voice ID, and language code
3. Call `synthesizeSpeech` with `enableTimepoints: ['SSML_MARKS', 'WORDS']`
4. Parse response.audioContent (base64) and response.timepoints (array of {timeSeconds, markName})
5. Convert timepoints to JSONB format: `[{word: "The", start_ms: 0, end_ms: 200}, ...]`
6. Update `scenes.subtitle_timing` with parsed timings
7. If timepoints array is empty, fallback to sentence-level highlighting (single entry for full text)
8. Retry on transient errors (network timeouts, 429 quota errors) with 1s, 2s, 4s backoff
9. Log warnings for fallback cases: "Word-level timing unavailable for scene {id}, using sentence-level"
10. Test with sample narration (100 words) and verify timing accuracy ±100ms

**Parallel Opportunities**: T021-T023 (setup), T024-T027 (TTS logic), T028-T030 (error handling) can be parallelized

**Dependencies**: WP00 (scenes.subtitle_timing column must exist), WP01 (TTS step in job pipeline)

**Risks**:
- Google Cloud TTS API key may exceed quota → Monitor usage and implement caching (deferred to Phase 2)
- Word-level timing may not be available for all languages → Fallback to sentence-level is documented
- API response format may differ for Standard vs Wavenet voices → Test both voice types

**Definition of Done**:
- Google Cloud TTS generates audio files successfully
- Word-level timings are stored in `scenes.subtitle_timing` for supported languages
- Fallback to sentence-level timing works when word timings unavailable
- Retry logic handles transient errors without failing the job
- Unit tests cover timing parser, fallback, and error cases
- Cost per render is <2 cents (verified with 100-word test)

---

## WP03: Subtitle Preview System

**Goal**: Implement real-time subtitle preview in storyboard editor with WYSIWYG consistency for all 3 presets.

**Priority**: P1 (core UX for subtitle selection)

**Independent Test**: Select a scene, cycle through subtitle presets, and verify visual preview updates immediately.

**Included Subtasks**:
- [x] T031: Create `src/ui/components/subtitles/SubtitlePreview.tsx` component ✅
- [x] T032: Implement `MinimalSubtitle.tsx` Remotion component (white text, bottom positioning) ✅
- [x] T033: Implement `HighlightSubtitle.tsx` Remotion component (background box, rounded corners) ✅
- [x] T034: Implement `KaraokeSubtitle.tsx` Remotion component (word-by-word highlighting) ✅
- [x] T035: Create `src/ui/hooks/useSubtitlePreview.ts` for timing simulation ✅
- [x] T036: Implement timing interpolation logic (frame → milliseconds → active word index) ✅
- [x] T037: Add `SubtitlePresetSelector.tsx` dropdown component ✅
- [x] T038: Update scene cards to show subtitle preview overlay ✅
- [x] T039: Implement "Apply to all scenes" button for bulk preset changes ✅
- [x] T040: Write unit tests for Remotion subtitle components ✅

**Implementation Sketch**:
1. Create Remotion components for each preset using `<AbsoluteFill>` for positioning
2. Use `useCurrentFrame()` hook to sync subtitle highlights with simulated timeline
3. Implement timing parser that converts `subtitle_timing` JSONB to frame ranges
4. For Karaoke: Iterate through words, check if current frame is within word's `[start_ms, end_ms]` range
5. Use `interpolate()` for smooth color transitions (white → yellow → white)
6. Create preview component that renders Remotion component in Next.js (using `<Composition>` preview mode)
7. Add preset selector that updates `subtitle_style_preset_id` in database
8. Implement "Apply to all scenes" that updates all scenes in project with selected preset
9. Show visual confirmation (toast notification) when preset is applied
10. Test with sample timings: verify word highlights sync accurately

**Parallel Opportunities**: T032-T034 (Remotion components), T035-T036 (hooks), T037-T039 (UI) can be parallelized

**Dependencies**: WP00 (subtitle_style_preset_id column), WP02 (subtitle_timing data)

**Risks**:
- Remotion preview mode may differ from final render → Use same components for preview and render to ensure WYSIWYG
- Karaoke timing may drift over long scenes → Test with 60-second scenes and verify sync accuracy
- Performance may degrade with many subtitle previews → Implement virtualization for storyboard cards (deferred to Phase 2)

**Definition of Done**:
- All 3 subtitle presets render correctly in preview
- Karaoke highlights sync with timing data within ±100ms
- Preset selector updates database immediately
- "Apply to all scenes" updates all scenes in <2 seconds
- Remotion components are reusable in worker render pipeline
- Unit tests verify timing interpolation logic

---

## WP04: Remotion Worker Setup

**Goal**: Set up Remotion worker Docker container with polling loop, job dequeue logic, and render orchestration.

**Priority**: P1 (core infrastructure for async rendering)

**Independent Test**: Deploy worker to ECS, submit render job, and verify worker picks up job and processes steps.

**Included Subtasks**:
- [x] T041: Create Dockerfile for Remotion worker (Node.js 20, FFmpeg, Remotion CLI) ✅
- [x] T042: Initialize Remotion project (`src/worker/remotion/`) ✅
- [x] T043: Create `Root.tsx` with composition registration ✅
- [x] T044: Implement database polling loop with `FOR UPDATE SKIP LOCKED` dequeue ✅
- [x] T045: Create `src/server/workers/render-worker.ts` main worker process ✅
- [x] T046: Implement job state machine (queued → running → succeeded/failed/canceled) ✅
- [x] T047: Add step processing logic (TTS → subtitles → media → render) ✅
- [x] T048: Implement stalled job reaper (checks for jobs stuck >15 minutes) ✅
- [x] T049: Add health check endpoint for ECS load balancer ✅
- [x] T050: Write worker deployment manifest (ECS task definition) ✅

**Implementation Sketch**:
1. Create Dockerfile with Node.js base image, install FFmpeg, copy Remotion source
2. Initialize Remotion config (`remotion.config.ts`) with FPS=30, resolution=1080x1920
3. Register `VideoComposition` composition in `Root.tsx`
4. Implement polling loop that runs every 2 seconds:
   ```sql
   UPDATE render_jobs SET status='running' WHERE id=(
     SELECT id FROM render_jobs WHERE status='queued'
     ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
   ) RETURNING *;
   ```
5. Create worker classes for each step: `TTSWorker`, `SubtitleWorker`, `MediaFetchWorker`, `CompositeWorker`
6. Update `job_steps` status as each step begins/ends
7. Implement cancellation check: Before each step, verify job status != 'canceled'
8. Run stalled job reaper every 5 minutes: `SELECT * FROM render_jobs WHERE status='running' AND updated_at < NOW() - INTERVAL '15 minutes'`
9. Add `/health` endpoint that returns worker status and current job ID
10. Create ECS task definition with 2 vCPU, 4GB RAM, environment variables for Supabase credentials

**Parallel Opportunities**: T041-T043 (Remotion setup), T044-T047 (worker logic), T048-T050 (operations) can be parallelized

**Dependencies**: WP00 (database schema), WP01 (job creation API), WP02 (TTS service)

**Risks**:
- Worker may crash during render → Implement try-catch blocks and mark job as failed with error details
- Polling loop may miss jobs under high concurrency → Test with 10 concurrent jobs, verify no starvation
- Docker image may be large (>1GB) → Use multi-stage build to minimize size

**Definition of Done**:
- Worker Docker container builds successfully
- Polling loop dequeues jobs with `FOR UPDATE SKIP LOCKED`
- Worker processes all 4 steps sequentially
- Stalled job reaper identifies zombie jobs accurately
- Health check endpoint responds with HTTP 200
- Worker can be deployed to AWS ECS Fargate

---

## WP05: Video Composition Pipeline

**Goal**: Implement Remotion composition that combines media, audio, and subtitles into final MP4 video.

**Priority**: P1 (core rendering functionality)

**Independent Test**: Render a 3-scene project and verify MP4 plays correctly with subtitles and audio.

**Included Subtasks**:
- [x] T051: Create `VideoComposition.tsx` main composition component
- [x] T052: Create `Scene.tsx` component for individual scenes
- [x] T053: Implement `<Video>` component for media playback with loop/trim logic
- [x] T054: Implement `<Audio>` component for mixed audio playback
- [x] T055: Integrate subtitle components (Minimal, Highlight, Karaoke) as overlays
- [x] T056: Implement scene sequencing with `<Sequence>` component
- [x] T057: Handle missing media (colored fallback with narration text)
- [x] T058: Handle missing audio (silent video)
- [x] T059: Configure Remotion render settings (codec H.264, AAC audio, 30fps)
- [x] T060: Write `src/server/workers/composite-worker.ts` to orchestrate rendering

**Implementation Sketch**:
1. Create `VideoComposition` that accepts `projectId` and `renderJobId` as props
2. Query scenes, media_assets, and scene_audio from database
3. For each scene, create `<Sequence>` with duration calculated from TTS audio length
4. Within each scene, layer components: `<Video>` → `<Audio>` → `<Subtitle>`
5. Use `<AbsoluteFill>` for subtitle positioning (bottom 60px, centered)
6. Implement media fallback: If video URL fails, show colored background with narration text
7. Implement audio fallback: If audio URL missing, render silent video
8. Handle duration mismatch: Loop media if shorter than audio, trim with 1s fade-out if longer
9. Configure output format: MP4, H.264 codec, AAC audio, 1080x1920 resolution
10. Test rendering with 3 scenes (60 seconds total) and verify output plays in VLC

**Parallel Opportunities**: T053-T055 (component implementations) can be parallelized

**Dependencies**: WP02 (TTS audio), WP03 (subtitle components), WP04 (worker infrastructure)

**Risks**:
- Remotion render may timeout for long videos → Set 10-minute timeout, fail job if exceeded
- Media URLs may expire during render → Download media to worker disk before rendering (T053)
- Video codec incompatibility → Test output with multiple players (VLC, QuickTime, mobile)

**Definition of Done**:
- Remotion composition renders successfully to MP4
- Subtitles overlay correctly on video
- Audio syncs with video (no lip-sync issues)
- Media fallback renders colored background when video missing
- Output video plays in VLC, QuickTime, and mobile players
- Render time for 60-second video is <120 seconds

---

## WP06: Progress Tracking & UI

**Goal**: Implement frontend UI components for render job progress tracking, job status cards, and video download.

**Priority**: P2 (polish feature for better UX)

**Independent Test**: Initiate render job and verify progress bar updates, completion notification, and download button.

**Included Subtasks**:
- [ ] T061: Create `src/ui/components/render/RenderProgress.tsx` component
- [ ] T062: Implement progress bar with step indicator (e.g., "Step 2/4: Generating subtitles")
- [ ] T063: Add "Last updated: X seconds ago" relative time display
- [ ] T064: Create `JobStatusCard.tsx` with retry/cancel buttons
- [ ] T065: Implement `useRenderJob.ts` hook for polling status every 2 seconds
- [ ] T066: Add render completion notification (toast or banner)
- [ ] T067: Create `ExportDownload.tsx` component with download button
- [ ] T068: Implement video player modal for preview
- [ ] T069: Add error message display with actionable text
- [ ] T070: Write Playwright tests for render job flow

**Implementation Sketch**:
1. Create progress bar component that calculates % from completed job_steps
2. Display current step name in user-friendly language ("Generating voiceovers" not "tts_generation")
3. Use `useRenderJob` hook to poll `GET /api/render/jobs/:jobId` every 2 seconds
4. Show relative time: "Last updated: 5 seconds ago" using `updated_at` timestamp
5. Create job status card with action buttons:
   - "Cancel Render" (only when status='running')
   - "Retry from failed step" (only when status='failed')
6. On completion, show toast notification: "Render complete! Download your video."
7. Create download button that triggers browser download from `exports.video_url`
8. Add video player modal with HTML5 `<video>` element for preview
9. Display error messages with actionable text: "Pexels download failed. Click to retry with Pixabay."
10. Write E2E test: Click render → poll status → wait for completion → download video

**Parallel Opportunities**: T061-T064 (components), T065-T069 (logic), T070 (tests) can be parallelized

**Dependencies**: WP01 (status API), WP05 (render completion)

**Risks**:
- Polling may cause unnecessary load → Use exponential backoff if job is long-running
- Progress updates may lag behind actual progress → Max 3 seconds delay acceptable per SC-003
- Download link may expire → Regenerate signed URL if expired

**Definition of Done**:
- Progress bar updates within 3 seconds of step completion
- "Last updated" shows accurate relative time
- Cancel button stops job within 5 seconds
- Completion notification appears within 10 seconds of success
- Download button triggers MP4 download successfully
- Video player modal shows preview with playback controls
- Error messages are actionable and user-friendly

---

## WP07: Testing & Validation

**Goal**: Write comprehensive tests (unit, integration, E2E) and validate performance benchmarks.

**Priority**: P2 (ensures quality and performance)

**Independent Test**: Run full test suite and verify all tests pass, then validate against quickstart.md scenarios.

**Included Subtasks**:
- [ ] T071: Write unit tests for render service (job creation, snapshot capture)
- [ ] T072: Write unit tests for Google Cloud TTS service (timing parser, fallback)
- [ ] T073: Write unit tests for Remotion subtitle components
- [ ] T074: Write integration tests for render job flow (create → poll → complete)
- [ ] T075: Write Playwright E2E test for render workflow
- [ ] T076: Validate performance benchmarks (SC-001 to SC-010)
- [ ] T077: Test quickstart.md scenarios (8 validation scenarios)
- [ ] T078: Load test worker with 5 concurrent renders
- [ ] T079: Test retry from failed step logic
- [ ] T080: Document test results and performance metrics

**Implementation Sketch**:
1. Write unit tests for render service using Vitest:
   - Test job creation with snapshots
   - Test state transitions (queued → running → succeeded)
   - Test retry logic (resumes from failed step)
2. Write unit tests for Google Cloud TTS:
   - Mock API responses with timepoints
   - Test timing parser with various formats
   - Test fallback to sentence-level timing
3. Write unit tests for Remotion components:
   - Test subtitle components with mock timing data
   - Verify frame-to-word mapping logic
4. Write integration tests:
   - Create render job via API
   - Poll status until completion
   - Verify exports record created
5. Write Playwright E2E test:
   - Navigate to project page
   - Click "Render Video" button
   - Wait for progress bar to complete
   - Click download button
   - Verify MP4 file downloaded
6. Validate performance benchmarks:
   - SC-001: Job creation <2 seconds (measure with console.time)
   - SC-002: Worker pickup <10 seconds (measure timestamp diff)
   - SC-004: Render 60s video <120 seconds (measure render time)
7. Test quickstart scenarios:
   - Scenario 1: Successful render with 3 scenes
   - Scenario 2: Render failure and retry
   - Scenario 3: Karaoke subtitle sync accuracy
   - ... (all 8 scenarios from quickstart.md)
8. Load test worker:
   - Submit 5 render jobs simultaneously
   - Verify all complete within 10 minutes
   - Check no job starvation (all processed)
9. Test retry logic:
   - Fail job at step 3 (media_fetch)
   - Click retry
   - Verify steps 1-2 not re-executed
10. Document results in `kitty-specs/004-visuals-video-rendering/checklists/testing-results.md`

**Parallel Opportunities**: T071-T073 (unit tests), T074-T075 (integration/E2E), T076-T077 (validation) can be parallelized

**Dependencies**: WP01-WP06 (all features must be implemented)

**Risks**:
- Performance benchmarks may not meet targets → Optimize Remotion components or increase worker resources
- Tests may be flaky due to timing → Add explicit waits and retries in E2E tests
- Google Cloud TTS quota may be exceeded during testing → Use mock responses for unit tests

**Definition of Done**:
- All unit tests pass (>80% code coverage)
- Integration tests cover full render job flow
- E2E test passes consistently (no flakiness)
- All 10 performance benchmarks meet targets (SC-001 to SC-010)
- All 8 quickstart scenarios pass validation
- Load test verifies worker handles 5 concurrent renders
- Test results documented with performance metrics

---

## Work Package Summary

| Work Package | Goal | Priority | Subtasks | Dependencies | Parallelizable |
|--------------|------|----------|----------|--------------|----------------|
| **WP00** | Database & Storage Setup | P0 | 10 | None | No (sequential) |
| **WP01** | Render API Endpoints | P1 | 10 | WP00 | Partial (routes) |
| **WP02** | Google Cloud TTS Upgrade | P1 | 10 | WP00, WP01 | Yes (layers) |
| **WP03** | Subtitle Preview System | P1 | 10 | WP00, WP02 | Yes (components) |
| **WP04** | Remotion Worker Setup | P1 | 10 | WP00-WP02 | Partial (sections) |
| **WP05** | Video Composition Pipeline | P1 | 10 | WP02-WP04 | Yes (components) |
| **WP06** | Progress Tracking & UI | P2 | 10 | WP01, WP05 | Yes (components) |
| **WP07** | Testing & Validation | P2 | 10 | All | Yes (test suites) |

**Total Subtasks**: 80
**Estimated Implementation Time**: 8-12 days (assuming 1 day per work package)

---

## MVP Scope Recommendation

**MVP Work Packages** (deliver functional "Script to Video" pipeline):
- **WP00**: Database & Storage Setup
- **WP01**: Render API Endpoints
- **WP02**: Google Cloud TTS Upgrade
- **WP04**: Remotion Worker Setup
- **WP05**: Video Composition Pipeline

**Polish Work Packages** (enhance UX and ensure quality):
- **WP03**: Subtitle Preview System (can be deferred if storyboard preview not critical)
- **WP06**: Progress Tracking & UI (can use simple status page initially)
- **WP07**: Testing & Validation (can run minimal smoke tests initially)

**Minimum Viable Product**: WP00 + WP01 + WP02 + WP04 + WP05 = 50 subtasks
**Full Feature Release**: All 8 work packages = 80 subtasks

---

## Next Steps

1. **Generate Prompt Files**: Run `/spec-kitty.tasks` to create detailed prompt files for each work package (e.g., `WP01-render-api-endpoints.md`)
2. **Implement Work Packages**: Execute WPs in dependency order (WP00 → WP01 → ... → WP07)
3. **Validate Implementation**: Follow `quickstart.md` scenarios to verify implementation
4. **Deploy to Production**: Deploy worker to AWS ECS, configure monitoring
5. **Plan Phase 2**: Design BullMQ+Redis migration, auto-scaling workers, advanced subtitle customization

**Documentation References**:
- `spec.md`: User stories, requirements, success criteria
- `plan.md`: Technical approach, architecture, implementation phases
- `data-model.md`: Database schema, entities, migration SQL
- `research.md`: Technical decisions, trade-offs, benchmarks
- `quickstart.md`: Validation scenarios, troubleshooting guide
- `contracts/openapi.yaml`: API endpoint specifications
