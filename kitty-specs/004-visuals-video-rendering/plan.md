# Implementation Plan: Visuals and Video Rendering

**Branch**: `004-visuals-video-rendering` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/kitty-specs/004-visuals-video-rendering/spec.md`

## Summary

Transform storyboarded scenes into polished MP4 videos by combining selected media (videos/images), generated audio (voiceover + background music), and styled subtitles using Remotion's React-based video framework. The rendering process runs asynchronously in a Docker worker with database polling, providing real-time progress tracking via API endpoints. Users can download final videos from Supabase Storage with signed URLs.

**Primary Requirements**:
- FR-7: Subtitle Styles (Minimal, Highlight, Karaoke) with WYSIWYG preview
- FR-8: Async Video Rendering with Remotion (media + audio + subtitles → MP4)
- Final Export: Downloadable MP4 files from Supabase Storage

**Technical Approach** (from research):
- **Rendering Engine**: Remotion (React components for WYSIWYG consistency)
- **Worker Infrastructure**: Database polling with `FOR UPDATE SKIP LOCKED` (Postgres)
- **TTS Provider**: Google Cloud TTS (upgrade from Edge TTS for word-level timing)
- **Subtitle Rendering**: Pure Remotion components with CSS positioning
- **Storage**: Supabase Storage with RLS policies for security

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14+ App Router, Node.js 20+)
**Primary Dependencies**:
- `@remotion/cli` ^4.0 (video rendering framework)
- `@google-cloud/text-to-speech` ^5.0 (TTS with word-level timing)
- `@supabase/supabase-js` ^2.39 (database, storage, auth)
- `fluent-ffmpeg` ^2.1 (audio mixing, Remotion dependency)
- `express` ^4.18 (worker HTTP server)

**Storage**:
- **PostgreSQL** (Supabase) - `render_jobs`, `job_steps`, `exports`, `scenes` tables
- **Supabase Storage** - MP4 exports in `exports/` bucket with signed URLs

**Testing**:
- `vitest` (unit tests for Remotion components, API endpoints)
- `playwright` (E2E tests for render job flow, progress tracking, download)
- `@remotion/eslint-config` (Remotion-specific linting)

**Target Platform**:
- **Worker**: AWS ECS Fargate (Docker Linux, 2 vCPU, 4GB RAM minimum)
- **Frontend**: Vercel (Next.js App Router)
- **Browser**: Chrome, Safari, Firefox (MP4 playback support)

**Project Type**: Web application (Next.js frontend + Remotion worker backend)

**Performance Goals**:
- Render job creation: <2 seconds
- Worker pickup (queued → running): <10 seconds
- Render 60-second video: <120 seconds (2× real-time)
- Progress UI update latency: <3 seconds (polling delay)
- Karaoke subtitle sync: ±100ms accuracy

**Constraints**:
- **Remotion rendering**: CPU-intensive, requires dedicated worker (not Vercel serverless)
- **Google Cloud TTS quota**: $4/1M characters (Standard), $16/1M characters (Wavenet)
- **Supabase Storage**: 5GB free tier, upgrade to Pro (100GB) at scale
- **Database polling**: Single worker handles <10 concurrent users (MVP)
- **Video format**: Only 9:16 vertical (1080x1920) for MVP, 16:9 horizontal deferred to Phase 4

**Scale/Scope**:
- **MVP**: <10 concurrent users, 100 renders/day, ~2GB storage/month
- **Phase 2**: 50-100 concurrent users, auto-scaling workers, BullMQ+Redis
- **Target**: 60-second video renders in <120 seconds (2× real-time factor)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Compliance Status**: ✅ **ALL PRINCIPLES VALIDATED**

Constitution compliance verified during planning phase against all 6 core principles from `../../../.kittify/missions/software-dev/constitution/principles.md`:

1. **User Experience First** ✅ - Progress tracking, actionable error messages, recovery paths
2. **Snapshot-Based Consistency** ✅ - Render jobs capture storyboard state, voice_id, script version
3. **Test-Driven Quality** ✅ - Contract tests for external APIs, integration tests, unit tests
4. **Async Job Resilience** ✅ - Job queue with step-level progress, retry logic, stalled job reaper
5. **Media Source Flexibility** ✅ - Provider-agnostic abstraction, automatic fallback
6. **Voice Selection & Preview** ✅ - Voice library, project-level selection, render-time snapshot

**Post-Design Re-evaluation**: After Phase 1 design (data-model.md, contracts/), all principles remain valid. No conflicts found.

For full principle definitions, see: `../../../.kittify/missions/software-dev/constitution/principles.md`

## Project Structure

### Documentation (this feature)

```
kitty-specs/004-visuals-video-rendering/
├── spec.md              # Feature specification (user stories, requirements, entities)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research (Remotion, DB polling, Google Cloud TTS, etc.)
├── data-model.md        # Phase 1 data model (render_jobs, job_steps, exports, scenes extension)
├── quickstart.md        # Phase 1 validation guide (test scenarios, benchmarks)
├── contracts/           # Phase 1 API contracts
│   └── openapi.yaml     # OpenAPI 3.0 spec for render API endpoints
└── tasks.md             # Phase 2 output (NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
src/
├── server/
│   ├── routes/
│   │   └── render-router.ts          # POST /render/jobs, GET /render/jobs/:id, etc.
│   ├── services/
│   │   ├── render-service.ts         # Job creation, validation, snapshot capture
│   │   ├── google-tts-service.ts     # UPGRADE from Edge TTS (word-level timing)
│   │   └── export-service.ts         # Signed URL generation, storage upload
│   └── workers/
│       ├── render-worker.ts          # Main worker process (polling loop)
│       ├── tts-worker.ts             # TTS generation step (Google Cloud TTS)
│       ├── subtitle-worker.ts        # Subtitle timing extraction step
│       ├── media-fetch-worker.ts     # Media download step (Pexels/Pixabay)
│       └── composite-worker.ts       # Remotion render composition step
├── worker/
│   ├── remotion/
│   │   ├── Root.tsx                  # Remotion root component
│   │   ├── VideoComposition.tsx      # Main composition (sequence of scenes)
│   │   ├── Scene.tsx                 # Individual scene (media + audio + subtitles)
│   │   └── subtitles/
│   │       ├── MinimalSubtitle.tsx   # Minimal preset component
│   │       ├── HighlightSubtitle.tsx # Highlight preset component
│   │       └── KaraokeSubtitle.tsx   # Karaoke preset component (word-level timing)
│   ├── config/
│   │   └── remotion.config.ts        # Remotion configuration (FPS, codec, resolution)
│   └── utils/
│       ├── timing-utils.ts           # Frame ↔ millisecond conversion utilities
│       └── subtitle-timing-parser.ts # Parse Google Cloud TTS timemarks
├── ui/
│   ├── components/
│   │   ├── render/
│   │   │   ├── RenderButton.tsx      # "Render Video" button
│   │   │   ├── RenderProgress.tsx    # Progress bar + step indicator
│   │   │   ├── JobStatusCard.tsx     # Job status + retry/cancel buttons
│   │   │   └── ExportDownload.tsx    # "Download Video" button + video player
│   │   └── subtitles/
│   │       ├── SubtitlePreview.tsx   # Real-time subtitle preview component
│   │       ├── SubtitlePresetSelector.tsx # Preset dropdown (Minimal/Highlight/Karaoke)
│   │       └── KaraokePreview.tsx    # Simulated Karaoke preview (word highlights)
│   ├── hooks/
│   │   ├── useRenderJob.ts           # Poll render job status every 2 seconds
│   │   └── useSubtitlePreview.ts     # Generate subtitle preview (timing + styles)
│   └── pages/
│       └── [projectId]/render.tsx    # Render job details page
└── types/
    ├── render.ts                     # Render job, job step, export types
    └── subtitles.ts                  # Subtitle timing, preset types

tests/
├── unit/
│   ├── services/
│   │   ├── render-service.test.ts
│   │   ├── google-tts-service.test.ts
│   │   └── export-service.test.ts
│   ├── workers/
│   │   ├── render-worker.test.ts
│   │   └── composite-worker.test.ts
│   └── remotion/
│       ├── MinimalSubtitle.test.tsx
│       ├── HighlightSubtitle.test.tsx
│       └── KaraokeSubtitle.test.tsx
├── integration/
│   ├── render-flow.test.ts           # Full render job flow test
│   └── subtitle-preview.test.ts      # Subtitle preview API test
└── e2e/
    └── render.spec.ts                # Playwright E2E test (create job → poll → download)
```

**Structure Decision**: Web application (Option 2) with:
- **Next.js Frontend** (`src/ui/`) - Storyboard editor, subtitle preview UI, render progress tracking
- **Express Backend** (`src/server/`) - Render API endpoints, job creation, status polling
- **Remotion Worker** (`src/worker/`) - Docker-containerized video rendering service
- **Separation of Concerns**: Frontend (preview) and Worker (render) both use Remotion components for WYSIWYG consistency

## Implementation Phases

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md` (5 research items resolved)
- Remotion vs FFmpeg → Remotion chosen
- Worker infrastructure → Database polling (Postgres)
- Google Cloud TTS word-level timing → Upgrade from Edge TTS
- Subtitle rendering strategies → Pure Remotion components
- Storage and export → Supabase Storage with signed URLs

### Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- `data-model.md` - 3 new tables (`render_jobs`, `job_steps`, `exports`) + `scenes` extension
- `contracts/openapi.yaml` - 6 API endpoints (create, get status, cancel, retry, export, subtitle preview)
- `quickstart.md` - 8 validation scenarios + performance benchmarks + troubleshooting

**Migrations**: `20250108_visuals_video_rendering.sql` (~150 lines)
- Create tables, indexes, RLS policies, triggers

### Phase 2: Work Package Generation (NOT EXECUTED YET)

**Next Command**: `/spec-kitty.tasks` (user must invoke this explicitly)

**Expected Output**: `tasks.md` with work packages (WP00-WP07)
- WP00: Database & Storage Setup
- WP01: Render API Endpoints
- WP02: Google Cloud TTS Upgrade
- WP03: Subtitle Preview System
- WP04: Remotion Worker Setup
- WP05: Video Composition Pipeline
- WP06: Progress Tracking & UI
- WP07: Testing & Validation

## Dependencies

**Prerequisites** (must exist before implementation):
- **Feature 001**: Script & Storyboard Editor (provides scenes, narration_text, subtitle_presets)
- **Feature 002**: Video Media Search (provides media_assets, selected media)
- **Feature 003**: Audio Voiceover Integration (provides scene_audio, mixed audio) - **Requires upgrading Edge TTS → Google Cloud TTS**

**Required Infrastructure**:
- AWS ECS Fargate cluster (Docker worker deployment)
- Google Cloud TTS API key with timemarks enabled
- Supabase Storage bucket `exports` with RLS policies

**Integration Points**:
- **Remotion Worker** reads: `scenes`, `media_assets`, `scene_audio` tables
- **Remotion Worker** writes: `render_jobs`, `job_steps`, `exports` tables, Supabase Storage
- **Frontend** polls: `GET /api/render/jobs/:jobId` every 2 seconds
- **Frontend** downloads: Signed URL from `exports.video_url`

## Success Criteria

From `spec.md` success criteria:

**Measurable Outcomes**:
- SC-001: Render job creation <2 seconds
- SC-002: Worker pickup <10 seconds
- SC-003: Progress UI updates <3 seconds
- SC-004: Render 60s video <120 seconds
- SC-005: MP4 upload success >99%
- SC-006: Download link generation <500ms
- SC-007: Karaoke sync ±100ms accuracy
- SC-008: Retry from failed step works (skips completed steps)
- SC-009: Stalled job reaper accurate (>15 min detection)
- SC-010: Single worker handles 5 concurrent renders (<60s wait)

**User Experience Outcomes**:
- SC-011: Cancel render <5 seconds
- SC-012: Progress UI shows clear step names (not technical jargon)
- SC-013: Error messages actionable (not cryptic codes)
- SC-014: MP4 plays correctly in VLC, QuickTime, mobile
- SC-015: Video quality matches preview (no surprises)
- SC-016: Completion notification <10 seconds after success

## Open Questions

**None** - All critical decisions resolved through planning interrogation.

## Next Steps

1. **User runs**: `/spec-kitty.tasks` to generate work packages
2. **Implementation**: Execute WPs in dependency order (WP00 → WP01 → ... → WP07)
3. **Validation**: Follow `quickstart.md` scenarios to verify implementation
4. **Deployment**: Deploy worker to AWS ECS, configure monitoring
5. **Phase 2 Planning**: Plan BullMQ+Redis migration, auto-scaling workers
