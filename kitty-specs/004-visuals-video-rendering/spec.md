# Feature Specification: Visuals and Video Rendering

**Feature Branch**: `[004-visuals-video-rendering]`
**Created**: 2026-01-08
**Status**: Draft
**Input**: Context: Although the progress report says 100%, the 'Video Rendering' (FR-8) from 'docs/AutoShorts_PRD.md' is missing. We have Scripts (F001), Media Selection (F002), and Audio (F003). Now we need to combine them into a final MP4 video. Please plan for: 1. FR-7: Subtitle Styles (Overlay text on video), 2. FR-8: Async Video Rendering (Combine Images + Audio + Subtitles) using FFmpeg or Remotion, 3. Final Export: Downloadable MP4 file.

## Overview

This feature enables creators to transform their storyboarded scenes into a polished MP4 video by combining selected media (videos/images), generated audio (voiceover + background music), and styled subtitles into a single downloadable file. The rendering process runs asynchronously in a worker to handle the computational intensity of video composition while providing real-time progress updates to users.

**User Value**: Completes the "Script to Video" pipeline, delivering the final output that creators can share on social platforms. The async rendering with progress tracking ensures users remain informed even during longer renders, and retry/recovery mechanisms prevent failed renders from blocking progress.

**Scope**: Video composition (media + audio + subtitles), async job queue, progress tracking, and MP4 export. Advanced features (custom transitions, multiple video formats, real-time streaming) are out of scope for MVP.

## User Scenarios & Testing

### User Story 1 - Subtitle Preview and Selection (Priority: P1)

A creator wants to see how subtitles will look on their video before committing to the final render. They switch between subtitle presets (Minimal, Highlight, Karaoke) in the storyboard editor and see a real-time preview of how text appears over their selected media.

**Why this priority**: Core visual feedback for the "Script to Video" experience. Without subtitle preview, users can't make informed decisions about preset selection.

**Independent Test**: Can be tested by selecting a scene, cycling through subtitle presets, and verifying visual preview updates. Delivers value by enabling WYSIWYG subtitle editing.

**Acceptance Scenarios**:

1. **Given** a creator has a scene with narration text "The steak sizzles perfectly", **When** they select the "Minimal" preset, **Then** the preview shows white text at the bottom of the media thumbnail with no background
2. **Given** a creator selects the "Highlight" preset, **When** the preset is applied, **Then** the preview shows text with a semi-transparent black background box at the bottom
3. **Given** a creator selects the "Karaoke" preset and TTS with word timing exists, **When** the preview plays, **Then** words highlight one-by-one in sync with simulated timing (or sentence-level if word timing unavailable)
4. **Given** a creator changes subtitle preset, **When** the change occurs, **Then** the scene card shows a "Re-render required" indicator and the subtitle_style_preset_id updates immediately in the database
5. **Given** a creator clicks "Apply to all scenes" for a preset, **When** clicked, **Then** all scenes in the project update to the selected preset and show visual confirmation

---

### User Story 2 - Render Job Initiation and Progress Tracking (Priority: P1)

A creator finishes their storyboard, selects a voice, adds background music, and clicks "Render Video". The system initiates an async render job that progresses through TTS generation → subtitle timing → media fetch → video composition, showing real-time updates at each step.

**Why this priority**: Core "Script to Video" completion. Without async rendering, users would block on long-running renders with no feedback.

**Independent Test**: Can be tested by initiating a render and verifying job status updates from queued → running → succeeded with step-level progress. Delivers value by providing visibility into render progress.

**Acceptance Scenarios**:

1. **Given** a creator has completed scenes with media, voice, and music, **When** they click "Render Video", **Then** the system creates a render_job record with status='queued' and current_step='tts_generation'
2. **Given** a render job is created, **When** the worker picks up the job, **Then** status updates to 'running' and job_steps show 'tts_generation' with status='running'
3. **Given** TTS generation completes successfully, **When** the worker moves to the next step, **Then** job_steps updates 'tts_generation' to status='done' and 'subtitle_generation' to status='running'
4. **Given** a render job is in progress, **When** the creator views the progress UI, **Then** they see a progress bar with "Step 2/4: Generating subtitles" and "Last updated: 5 seconds ago"
5. **Given** a render job fails at media_fetch step, **When** failure occurs, **Then** status becomes 'failed', error_message shows "Failed to download video from Pexels", and a "Retry from failed step" button appears
6. **Given** a creator clicks "Retry from failed step", **When** clicked, **Then** retry_count increments and the worker resumes from media_fetch step (not from the beginning)

---

### User Story 3 - Final Video Export and Download (Priority: P1)

A creator's render job completes successfully. They receive a notification with a download link to the final MP4 file, which they can save to their device or share directly to social platforms.

**Why this priority**: The final deliverable of the entire "Script to Video" pipeline. Without export, the feature is incomplete.

**Independent Test**: Can be tested by waiting for a render job to complete and clicking the download link. Delivers value by providing the shareable output.

**Acceptance Scenarios**:

1. **Given** a render job completes all steps successfully, **When** the final step finishes, **Then** status becomes 'succeeded', exports record is created with video_url pointing to Supabase Storage
2. **Given** a render job succeeds, **When** the creator views the project page, **Then** they see a "Download Video" button and a "Watch Preview" video player
3. **Given** a creator clicks "Download Video", **When** clicked, **Then** the browser downloads the MP4 file with filename "{project_title}.mp4"
4. **Given** a creator clicks "Watch Preview", **When** clicked, **Then** a video player modal opens showing the rendered MP4 with full playback controls
5. **Given** a download link is generated, **When** the link is accessed, **Then** Supabase Storage signed URL is validated and the file downloads (403 if URL expired or user doesn't own the project)
6. **Given** a video is stored in Supabase Storage, **When** storage is queried, **Then** the file exists in the 'exports' bucket with path pattern "{user_id}/{project_id}/{render_job_id}.mp4"

---

### User Story 4 - Render Job Cancellation and Recovery (Priority: P2)

A creator initiates a render job but realizes they made a mistake (e.g., wrong scene order). They want to cancel the render, fix the issue, and start over. Alternatively, a render fails partway through and they want to retry without starting from scratch.

**Why this priority**: Provides user control and recovery from errors. Without cancellation, users waste resources on unwanted renders.

**Independent Test**: Can be tested by cancelling a running job and verifying it stops cleanly, and retrying a failed job from the failed step.

**Acceptance Scenarios**:

1. **Given** a render job is running (status='running', current_step='subtitle_generation'), **When** the creator clicks "Cancel Render", **Then** status updates to 'canceled', current_step stops, and the worker receives a stop signal
2. **Given** a job is canceled, **When** the worker processes the cancellation, **Then** the worker stops processing after completing the current step (or immediately if between steps) and doesn't proceed to the next step
3. **Given** a render job is canceled, **When** the creator makes changes and clicks "Render Video" again, **Then** a new render_job is created with retry_count=0 (fresh job, not a retry)
4. **Given** a render job fails at step 3 (media_fetch), **When** the creator clicks "Retry from failed step", **Then** the worker resumes from step 3, skipping completed steps 1-2 (TTS and subtitles)
5. **Given** a render job is stuck in 'running' state for >15 minutes without updated_at changing, **When** the stalled job reaper runs, **Then** status is set to 'failed' with error_message="Render stalled. Please retry."

---

### User Story 5 - Karaoke Subtitle Synchronization (Priority: P2)

A creator selects the "Karaoke" subtitle preset which highlights each word as it's spoken in the voiceover. The system uses word-level timing data from Google Cloud TTS to synchronize highlights precisely with the audio.

**Why this priority**: Advanced subtitle feature that differentiates the product from basic captioning tools. Provides professional polish.

**Independent Test**: Can be tested by rendering a scene with Karaoke preset and verifying word highlights match audio timing in the final video.

**Acceptance Scenarios**:

1. **Given** a creator selects Karaoke preset and clicks "Render Video", **When** TTS generation runs, **Then** Google Cloud TTS API returns timemarks array with word-level timestamps
2. **Given** TTS returns timemarks, **When** the data is stored, **Then** scenes.subtitle_timing JSONB contains word timings: `[{word: "The", start_ms: 0, end_ms: 200}, {word: "steak", start_ms: 200, end_ms: 500}, ...]`
3. **Given** word timing data exists, **When** Remotion renders the scene, **Then** the `<KaraokeSubtitle>` component highlights each word during its time range using `interpolate()` for smooth transitions
4. **Given** Google Cloud TTS fails to return word timings (e.g., unsupported language), **When** this occurs, **Then** the system falls back to sentence-level highlighting and logs a warning "Word-level timing unavailable, using sentence-level"
5. **Given** Karaoke video renders, **When** the creator watches the final MP4, **Then** each word highlights in yellow exactly when spoken in the voiceover

---

### Edge Cases

- What happens when media URL (Pexels/Pixabay) returns 404 during render?
  - Worker retries the specific scene with alternate provider (Pexels ↔ Pixabay) if available
  - If both fail, marks job as 'failed' with error message and provides "Upload custom media" option for that scene
  - Other scenes continue processing (partial retry)

- What happens when TTS generation fails for a scene?
  - Worker retries the specific scene TTS up to 2 times with exponential backoff
  - If all retries fail, marks job as 'failed' at tts_generation step
  - User can retry the job or regenerate TTS for that specific scene from storyboard

- What happens when video duration (TTS-based) doesn't match media duration?
  - If media is shorter: Loop the media to match audio duration
  - If media is longer: Trim/fade out media at audio end (1-second fade-out)
  - Remotion's `<Sequence>` component handles duration mismatch automatically

- What happens when Supabase Storage upload fails after render completes?
  - Worker marks job as 'failed' with error "Storage upload failed"
  - Temporary video file on worker disk is preserved for 24 hours for manual recovery
  - User can retry the render (will regenerate video and retry upload)

- What happens when render timeout exceeds 10 minutes?
  - Worker terminates the render process and marks job as 'failed' with error "Render timeout (>10min)"
  - User can retry or simplify the project (fewer scenes, shorter duration)

- What happens when user modifies scenes after render starts?
  - Render job continues with snapshot of scenes at render start time (storyboard_script_version_snapshot)
  - UI shows warning "Current storyboard differs from render in progress"
  - User must cancel current render and start new one to get latest changes

- What happens when multiple render jobs are queued for the same project?
  - Worker processes jobs sequentially (one at a time per project, enforced via database lock)
  - Second job waits in 'queued' status until first completes or is canceled
  - UI shows "Previous render in progress" message

- What happens when Remotion component crashes during render?
  - Worker catches error and marks job as 'failed' with stack trace in error_message
  - Error includes scene_id and component name for debugging
  - User can fix the issue (e.g., media URL, subtitle text) and retry from failed step

## Requirements

### Functional Requirements

**FR-001: Subtitle Preset Rendering**
- System MUST render 3 subtitle presets: Minimal (static text bottom), Highlight (text with background box), Karaoke (word-by-word highlighting)
- System MUST use Remotion `<Subtitle />` components for WYSIWYG consistency between preview and final render
- System MUST position subtitles absolutely over media using Remotion's `<AbsoluteFill>` and CSS positioning
- System MUST support custom font size, color, and background opacity per preset

**FR-002: Subtitle Timing Synchronization**
- System MUST extract word-level timestamps from Google Cloud TTS API responses (timemarks array)
- System MUST store timing data in `scenes.subtitle_timing` JSONB column with format: `[{word, start_ms, end_ms}, ...]`
- System MUST fall back to sentence-level highlighting if word-level timestamps unavailable
- System MUST sync subtitle highlights with audio timeline using Remotion's `useCurrentFrame()` and `fps` constants

**FR-003: Render Job Creation**
- System MUST create `render_job` record when user clicks "Render Video"
- System MUST capture snapshots at render start: `storyboard_script_version_snapshot`, `voice_id_snapshot`, `script_version_snapshot`
- System MUST set initial status='queued' and current_step='tts_generation'
- System MUST create `job_steps` records for each step: tts_generation, subtitle_generation, media_fetch, render_composite

**FR-004: Worker Job Processing**
- System MUST poll `render_jobs` table for 'queued' jobs using `FOR UPDATE SKIP LOCKED` pattern
- System MUST update status to 'running' when job starts and set `started_at` timestamp
- System MUST process steps sequentially, updating `job_steps` status (pending → running → done/failed)
- System MUST set status='succeeded' when all steps complete and upload MP4 to Supabase Storage
- System MUST set status='failed' if any step fails after retries, with error details

**FR-005: Progress Tracking and UI Updates**
- System MUST provide API endpoint `GET /api/render/jobs/:jobId` returning job status, current_step, progress %
- System MUST update `updated_at` timestamp on every status change
- System MUST support SSE or polling for real-time progress updates (MVP: polling every 2 seconds)
- System MUST display "Last updated: X seconds ago" relative time in UI

**FR-006: Step-level Retry Logic**
- System MUST provide "Retry from failed step" button when status='failed'
- System MUST resume job from the failed step, skipping completed steps
- System MUST increment `retry_count` on each retry
- System MUST preserve snapshot data across retries (don't recapture scenes)

**FR-007: Video Composition with Remotion**
- System MUST use Remotion `<Composition>` to define video structure (sequence of scenes)
- System MUST use `<Video>` component for media playback (loops if shorter than audio, trims if longer)
- System MUST use `<Audio>` component for mixed audio (voiceover + background music)
- System MUST use `<Subtitle />` component overlay for subtitles
- System MUST set output format to MP4, codec H.264, audio AAC, 1080x1920 resolution (9:16 aspect ratio for Shorts)

**FR-008: Media and Audio Integration**
- System MUST fetch media URLs from `media_assets` table (selected video for each scene)
- System MUST fetch mixed audio URLs from `scene_audio` table (audio_type='mixed')
- System MUST handle missing media gracefully (show colored fallback with scene narration)
- System MUST handle missing audio gracefully (render silent video)

**FR-009: Export and Storage**
- System MUST render final MP4 to worker disk (temporary location)
- System MUST upload MP4 to Supabase Storage bucket 'exports' with path `{user_id}/{project_id}/{render_job_id}.mp4`
- System MUST create `exports` record with video_url, duration_sec, and file_size_bytes
- System MUST generate signed URL with 7-day expiry for download
- System MUST enforce RLS policy: only project owner can download (user_id check)

**FR-010: Render Job Cancellation**
- System MUST provide API endpoint `POST /api/render/jobs/:jobId/cancel`
- System MUST update status to 'canceled' when cancellation requested
- System MUST send stop signal to worker (worker checks job status before each step)
- System MUST clean up temporary files on cancellation (delete partial MP4 from worker disk)

**FR-011: Stalled Job Recovery**
- System MUST run "stalled job reaper" every 5 minutes checking for jobs stuck in 'running' status
- System MUST mark as 'failed' if `updated_at` hasn't changed in >15 minutes
- System MUST log reaper activity with job_id and reason for failure

**FR-012: TTS Provider Integration**
- System MUST upgrade from Edge TTS to Google Cloud TTS for word-level timestamps
- System MUST configure Google Cloud TTS API to return timemarks (timepoints=[] parameter)
- System MUST parse timemarks array and store in scenes.subtitle_timing JSONB
- System MUST handle API quota limits (retry with exponential backoff, max 3 attempts)

### Key Entities

**render_job** (extends PRD data model)
- Represents an async video rendering job with state tracking
- Attributes:
  - `id` (UUID, PK)
  - `project_id` (UUID, FK)
  - `status` (enum: queued/running/succeeded/failed/canceled)
  - `current_step` (enum: tts_generation/subtitle_generation/media_fetch/render_composite)
  - `progress` (integer 0-100)
  - `storyboard_script_version_snapshot` (integer) - Scenes version at render start
  - `voice_id_snapshot` (text) - Voice selection at render start
  - `script_version_snapshot` (integer) - Script version for audit
  - `retry_count` (integer, default 0)
  - `error_code` (text, nullable)
  - `error_message` (text, nullable)
  - `started_at` (timestamp, nullable)
  - `completed_at` (timestamp, nullable)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- Relationships: Has many job_steps, belongs to project, has one export

**job_step**
- Represents a single step within a render job (granular progress tracking)
- Attributes:
  - `id` (UUID, PK)
  - `render_job_id` (UUID, FK)
  - `step_name` (enum: tts_generation/subtitle_generation/media_fetch/render_composite)
  - `status` (enum: pending/running/failed/done)
  - `started_at` (timestamp, nullable)
  - `ended_at` (timestamp, nullable)
  - `log` (text, nullable) - Error details or progress notes
  - `created_at` (timestamp)
- Relationships: Belongs to render_job

**export** (extends PRD data model)
- Represents a successfully rendered video file available for download
- Attributes:
  - `id` (UUID, PK)
  - `project_id` (UUID, FK)
  - `render_job_id` (UUID, FK, unique)
  - `video_url` (text) - Supabase Storage URL (signed or public)
  - `duration_sec` (integer) - Final video duration
  - `file_size_bytes` (bigint) - File size for display
  - `resolution` (text, default "1080x1920") - Video dimensions
  - `format` (text, default "mp4") - File format
  - `created_at` (timestamp)
- Relationships: Belongs to project, belongs to render_job

**scene** (extended for Feature 004)
- Extended with subtitle timing data
- New attributes:
  - `subtitle_timing` (JSONB, nullable) - Word/sentence timing: `[{word, start_ms, end_ms}, ...]`
  - `subtitle_style_preset_id` (text, nullable) - FK to subtitle_presets table (from Feature 001)
- Note: subtitle_style_preset_id was defined in Feature 001, now utilized for rendering

## Success Criteria

### Measurable Outcomes

- **SC-001**: Render job creation succeeds within 2 seconds of clicking "Render Video" button
- **SC-002**: Render worker picks up 'queued' job within 10 seconds (polling interval)
- **SC-003**: Progress updates reflect in UI within 3 seconds of step completion (polling delay)
- **SC-004**: Video rendering completes within 120 seconds for 60-second video (30s scenes × 2 render time factor)
- **SC-005**: MP4 file uploads to Supabase Storage successfully in >99% of renders
- **SC-006**: Download link works immediately after render completes (signed URL generation <500ms)
- **SC-007**: Karaoke subtitle highlights sync with audio within ±100ms accuracy
- **SC-008**: Retry from failed step resumes correctly without re-completing successful steps
- **SC-009**: Stalled job reaper correctly identifies jobs stuck >15 minutes without false positives
- **SC-010**: Single worker handles 5 concurrent render jobs without queue buildup (average wait time <60s)

### User Experience Outcomes

- **SC-011**: Users can cancel a render within 5 seconds of clicking cancel button
- **SC-012**: Progress UI shows clear step names (e.g., "Generating voiceovers") not technical jargon
- **SC-013**: Error messages are actionable (e.g., "Pexels download failed. Click to retry with Pixabay.") not cryptic codes
- **SC-014**: Downloaded MP4 plays correctly in VLC, QuickTime, and mobile video players
- **SC-015**: Video quality matches preview (no surprise differences in subtitles, timing, or layout)
- **SC-016**: Render completion notification appears within 10 seconds of job success

## Assumptions

1. **Google Cloud TTS API Availability**: Word-level timestamps (timemarks) are available in Google Cloud TTS API response. If not, we fallback to sentence-level timing.

2. **Remotion Rendering Performance**: Remotion can render 60-second video in ~120 seconds on AWS ECS Fargate (2 vCPU, 4GB RAM). Performance based on typical Remotion benchmarks.

3. **Supabase Storage Limits**: 5GB free tier is sufficient for MVP (100 users × 5 renders × 20MB = 10GB). We'll implement cleanup policy or upgrade plan if exceeded.

4. **Worker Isolation**: Single worker process is sufficient for MVP (<10 concurrent users). Worker can be horizontally scaled to 2-3 containers if needed.

5. **Media URL Stability**: Pexels/Pixabay URLs remain valid for 24 hours (cached). If URLs expire, worker falls back to alternative provider or user upload.

6. **FFmpeg Availability**: Remotion internally uses FFmpeg for rendering. We assume FFmpeg is available in the Docker container and properly licensed (LGPL).

7. **Subtitle Timing Precision**: Google Cloud TTS provides word-level timestamps with ±50ms accuracy, sufficient for Karaoke effect.

8. **Browser MP4 Support**: Modern browsers (Chrome, Safari, Firefox) can play H.264/AAC MP4 files generated by Remotion.

9. **Database Polling Efficiency**: `FOR UPDATE SKIP LOCKED` query performs adequately with <100 concurrent render jobs. We'll migrate to BullMQ in Phase 2 if contention becomes an issue.

10. **Network Reliability**: Worker has stable internet connection to download media from Pexels/Pixabay and upload to Supabase Storage.

## Dependencies

**Prerequisites** (must exist before this feature):
- **Feature 001**: Script & Storyboard Editor (provides scenes, narration_text, subtitle_style_preset_id)
- **Feature 002**: Video Media Search (provides selected media options, media_assets table)
- **Feature 003**: Audio Voiceover Integration (provides mixed audio, scene_audio table) - Note: Requires upgrading Edge TTS → Google Cloud TTS

**Required Infrastructure**:
- **AWS ECS/Fargate**: Single Docker container for Remotion worker
- **Google Cloud TTS API**: API key with Text-to-Speech enabled and timemarks support
- **Supabase Storage**: 'exports' bucket created with RLS policies
- **Supabase Database**: Postgres with render_jobs, job_steps, exports tables

**Required Database Tables**:
- `render_jobs` (new - defined in spec)
- `job_steps` (new - defined in spec)
- `exports` (new - defined in spec)
- `scenes` (extend with subtitle_timing JSONB column)
- `subtitle_presets` (exists from Feature 001)

**Integration Points**:
- **Remotion Worker**: Reads scenes + media_assets + scene_audio, composes video, renders to MP4
- **Google Cloud TTS**: Upgrade Feature 003's TTS service to use Google Cloud TTS API with timemarks
- **Supabase Storage**: Upload final MP4, generate signed URLs
- **Frontend Polling**: Next.js UI polls render job status every 2 seconds for progress updates

## Out of Scope

The following are explicitly out of scope for this feature and deferred to future phases:

1. **Multiple Video Formats**: Only 9:16 vertical format (1080x1920) for Shorts/TikTok/Reels. 16:9 horizontal format is Phase 4.
2. **Custom Transitions**: Simple cuts between scenes. Fade/wipe/dissolve transitions are Phase 4.
3. **Real-time Streaming Preview**: No live render preview. Users see static storyboard cards, not animating video preview during render.
4. **Advanced Subtitle Customization**: Only 3 presets (Minimal, Highlight, Karaoke). Custom font selection, color pickers, positioning controls are Phase 4.
5. **Video Editing in Final Output**: No trimming, filters, or effects on rendered video. Downloaded MP4 is final output.
6. **Batch Rendering**: Users can only render one project at a time. Queue multiple renders is Phase 4.
7. **Rendering History**: No "Previous renders" list. Only the most recent render is available via download link.
8. **Render Comparison**: No side-by-side comparison of different subtitle presets or voice selections.
9. **Auto-Scaling Workers**: Single worker with manual scaling. CloudWatch-based auto-scaling is Phase 2.
10. **BullMQ + Redis**: DB-based queue only. Migration to BullMQ for scaling is Phase 2.
11. **User Upload Fallback**: Basic upload UI exists but not fully integrated with render workflow.
12. **Advanced Karaoke Effects**: Basic word highlighting. No waveforms, animations, or custom colors.

## Open Questions

None at this time. All critical decisions have been clarified through planning interrogation.
