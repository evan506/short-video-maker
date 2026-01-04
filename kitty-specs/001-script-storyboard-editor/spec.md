# Feature Specification: Script & Storyboard Editor

**Feature Branch**: `[001-script-storyboard-editor]`
**Created**: 2026-01-02
**Status**: Draft
**Input**: Phase 1: Topic -> script auto-generation (<=60s goal) -> storyboard scene cards (create/edit). The feature will: 1) Accept topic input with options (platform, target duration, video type), 2) Auto-generate script using LLM with quick edit capabilities (Shorten/Lengthen/Rephrase/Change Tone), 3) Generate storyboard scenes (one-time split with auto-merge if >20 scenes for 60s), 4) Allow scene card editing (duration, keywords, subtitle presets), 5) Data persistence and reload. Out of scope: Media fetching/providers, TTS/voice synthesis, rendering/job queue implementation. PRD source: docs/AutoShorts_PRD.md

## User Scenarios & Testing

### User Story 1 - Topic to Script Generation (Priority: P1)

A creator wants to quickly generate a video script from a simple topic idea. They provide a topic description, select their target platform (Shorts/TikTok/Reels), specify desired duration (15/30/60 seconds), and choose a video type preset (Explainer/Marketing/Tutorial/Recipe/Story). The system generates a complete narration script optimized for their chosen format.

**Why this priority**: This is the foundational entry point for all video creation workflows. Without script generation, no other features can function.

**Independent Test**: Can be fully tested by entering a topic, configuring options, and receiving a generated script. Delivers immediate value by transforming a rough idea into structured content.

**Acceptance Scenarios**:

1. **Given** a creator is on the project creation page, **When** they enter a topic text (minimum 10 characters), select platform="shorts", duration=30, type="Explainer", and click "Generate Script", **Then** the system displays a generated script within 60 seconds and saves it as version 1
2. **Given** a script generation fails, **When** the error occurs, **Then** the system displays a user-friendly error message and shows a "Retry" button
3. **Given** a creator enters an invalid duration (>60 seconds), **When** they attempt to submit, **Then** the system shows a validation error "Maximum duration is 60 seconds for short-form content"

---

### User Story 2 - Script Quick-Edit Tools (Priority: P1)

A creator has a generated script but wants to refine it to match their preferred tone and length. They use one-click editing buttons to quickly rewrite the script: "Shorten" reduces word count while preserving key points, "Lengthen" adds more detail, "Rephrase" makes language more natural, and "Change Tone" adjusts style (Casual/Professional/Funny/Inspirational). Each edit creates a new script version the user can accept or discard.

**Why this priority**: Core value proposition #1 from PRD. Creators rarely accept first drafts - quick editing reduces friction and increases satisfaction.

**Independent Test**: Can be tested by generating a script, applying quick-edit transformations, and verifying new versions are created. Delivers value by enabling rapid iteration without manual rewriting.

**Acceptance Scenarios**:

1. **Given** a generated script exists, **When** creator clicks "Shorten", **Then** the system generates a condensed version (target 70% of original length) and prompts "Apply this version?" with preview
2. **Given** a shortened version is previewed, **When** creator clicks "Apply", **Then** the system saves it as a new script version (incremented from v1 to v2) and makes it the active version
3. **Given** a script exists, **When** creator clicks "Change Tone" and selects "Casual", **Then** the system rewrites the script in casual style and shows preview with "Apply" option
4. **Given** creator edits script manually in textarea, **When** they click "Apply", **Then** the system saves it as a new version with source="user" instead of source="llm"
5. **Given** a script has multiple versions, **When** creator views version history, **Then** they see all versions with timestamps, source type (llm/user), and can restore any previous version

---

### User Story 3 - Storyboard Scene Generation (Priority: P1)

A creator is satisfied with their script and wants to see it broken down into visual scenes. When they navigate to the storyboard for the first time, the system automatically splits the script into scenes with narration text, draft duration, and search keywords. If the split creates too many scenes (>20 for a 60-second video), the system automatically merges short scenes to maintain readability.

**Why this priority**: This is the bridge between script and visual storyboard. Without scene generation, creators can't visualize or edit their video structure.

**Independent Test**: Can be tested by generating a script, clicking "Go to Storyboard", and verifying scene cards are created with proper text/duration/keywords. Delivers value by transforming abstract text into concrete visual plan.

**Acceptance Scenarios**:

1. **Given** a script exists with version=3, **When** creator clicks "Go to Storyboard" and no scenes exist, **Then** the system generates scenes from the latest script, saves `storyboard_script_version=3`, and displays scene cards in grid view
2. **Given** scene generation creates 25 scenes for a 60-second script, **When** the generation detects >20 scenes, **Then** the system automatically merges short scenes (<2 seconds) with adjacent scenes until total is <=20 scenes
3. **Given** scenes are merged, **When** merging occurs, **Then** the system combines narration text with spaces, sums durations, and keeps the first scene's primary keyword
4. **Given** scenes already exist for a project, **When** creator navigates to storyboard again, **Then** the system loads existing scenes WITHOUT regenerating (one-time generation policy)
5. **Given** a script is edited after scenes exist, **When** creator returns to storyboard, **Then** the system shows a banner "Script has been updated. Scenes may not match. Regenerate scenes?" with buttons "Regenerate" and "Keep existing"

---

### User Story 4 - Scene Card Editing (Priority: P2)

A creator wants to fine-tune individual scenes without regenerating the entire storyboard. They click on any scene card to edit its duration, adjust keywords, or change subtitle presets. Changes are saved immediately and persist across sessions. The creator can also reorder scenes by dragging to adjust the visual flow.

**Why this priority**: Core value proposition #2 from PRD. Enables targeted fixes instead of full regeneration, saving time and preserving good scenes.

**Independent Test**: Can be tested by generating scenes, clicking a scene card, modifying duration/keywords/preset, and verifying changes persist. Delivers value by enabling granular control.

**Acceptance Scenarios**:

1. **Given** a scene card exists with duration=5 seconds, **When** creator clicks the card and changes duration to 7 seconds, **Then** the system updates `duration_sec_draft=7` and saves immediately
2. **Given** a scene has primary_keyword="beach", **When** creator edits keyword to "ocean sunset", **Then** the system updates the keyword and shows visual confirmation (checkmark)
3. **Given** subtitle presets are available (Minimal, Highlight, Karaoke), **When** creator selects "Highlight" for a scene, **Then** the system saves `subtitle_style_preset_id="highlight"` to that scene
4. **Given** multiple scenes exist, **When** creator drags Scene 3 to position 1, **Then** the system reorders scenes and updates all `order_index` values (Scene 3 becomes index 0, others shift)
5. **Given** a creator makes multiple edits to different scenes, **When** they refresh the page or return later, **Then** all changes are preserved and loaded correctly

---

### User Story 5 - Data Persistence and Project Reload (Priority: P2)

A creator works on their video across multiple sessions. They create a project, generate a script, edit scenes, and close the browser. When they return later, they can reload their project from a dashboard and continue exactly where they left off with all data intact.

**Why this priority**: Essential for real-world usage where creators don't complete videos in one sitting. Without persistence, all work is lost on browser close.

**Independent Test**: Can be tested by creating a project, making changes, closing browser, reopening, and verifying project reloads with all data. Delivers value by enabling multi-session workflows.

**Acceptance Scenarios**:

1. **Given** a creator creates a project with topic="AI productivity tips", **When** the project is created, **Then** the system saves it with status="draft", user_id matching the authenticated user, and timestamp
2. **Given** a project exists with script version 2 and 15 scenes, **When** creator logs out and logs back in, **Then** the project appears in their project list with title, status, and "last modified" timestamp
3. **Given** creator clicks a project from the list, **When** the project loads, **Then** the system displays the current script (latest version) and all scenes with their current state
4. **Given** creator has multiple projects in different states, **When** they view the project dashboard, **Then** they see all projects sorted by "last modified" with status indicators (draft/rendering/done/failed)
5. **Given** a project has been idle for 30 days, **When** creator opens it, **Then** all data is preserved and the system offers a "Continue editing" button

---

### User Story 6 - Progress/Recovery UX State Model (Priority: P3)

**Phase 1 Implementation Note**: This section is for Phase 2 async infrastructure only. Phase 1 MUST use synchronous APIs. Do NOT implement job queues, workers, or the `render_jobs` table in Phase 1. This is documentation-only to prepare for Phase 2 architecture.

The system defines state models for tracking async operations and recovery workflows. Render jobs progress through states: queued -> running -> succeeded/failed/canceled. Each job has step-level progress tracking (TTS generation, subtitle generation, media fetch, render composite). Failed jobs provide retry entry points and clear error messages.

**Why this priority**: Lays foundation for Phase 2 rendering infrastructure. Defining states now prevents rework later.

**Independent Test**: Can be tested by documenting state transitions and validating they cover all failure/recovery scenarios in PRD.

**Acceptance Scenarios**:

1. **Given** the state model specification, **When** reviewed, **Then** it defines all job statuses: queued, running, succeeded, failed, canceled with clear transition rules
2. **Given** the step progress model, **When** reviewed, **Then** it defines steps: tts_generation, subtitle_generation, media_fetch, render_composite with status tracking per step
3. **Given** a job fails at media_fetch step, **When** the recovery flow is documented, **Then** it specifies retry from failed step, fallback to alternate provider, and user upload options
4. **Given** the state model, **When** reviewed, **Then** it includes retry_count, error_code, error_message, and last_updated timestamp fields for all job states
5. **Given** a job is stuck in "running" state, **When** the stalled job reaper specification is reviewed, **Then** it defines timeout thresholds (e.g., 15 minutes no update) and recovery actions (mark as failed or requeue)

---

### Edge Cases

- What happens when script generation times out after 60 seconds?
  - System displays error message "Generation timed out. Please retry or try a shorter topic." and shows Retry button with option to switch LLM model

- What happens when LLM API returns malformed or incomplete content?
  - System validates response has minimum length and structure. If invalid, shows error "Generated content was incomplete. Please try again." with Retry button

- What happens when creator tries to regenerate scenes after already manually editing them?
  - System shows warning "Regenerating will overwrite your manual scene edits. Continue?" with buttons "Cancel" and "Regenerate anyway"

- What happens when scene splitting creates only 1-2 very long scenes (>15 seconds each)?
  - System accepts these scenes (no minimum scene count) but displays suggestion "Consider breaking this into shorter scenes for better engagement" with option to ignore

- What happens when a creator edits script to be longer (e.g., from 30 to 60 seconds) but scenes already exist?
  - System displays banner "Script length changed. Current scene count may be insufficient for new duration. Recommend regenerating scenes." with "Regenerate" and "Keep current" options

- What happens when keyword generation fails for a scene?
  - System falls back to using the project topic as keyword, or extracts the first noun phrase from the scene's narration text using simple NLP rules

- What happens when multiple script versions exist and creator clicks "Regenerate scenes"?
  - System generates from the LATEST script version, updates `storyboard_script_version` to match, and discards previous scenes

- What happens when a project is created but script generation is never started?
  - Project remains in status="draft" with script_version=null, appears in project list as "Incomplete - no script generated"

- What happens when scene duration is manually set to 0, negative, or exceeds the maximum?
  - System validates input and shows error "Duration must be between 1 second and [max_duration] seconds" and prevents save, where [max_duration] = min(60 seconds, project.target_duration_seconds)
- What happens when the sum of all scene durations exceeds project.target_duration_seconds?
  - System blocks save and displays validation error "Total scene duration (X seconds) exceeds target duration (Y seconds). Adjust individual scene durations to fit within target."

- What happens when all scenes are deleted manually (if that action exists)?
  - System prevents deletion of last scene, showing error "At least one scene is required" or offers "Regenerate all scenes" button

## Requirements

### Functional Requirements

**Script Generation**
- **FR-001**: System MUST accept topic text input (minimum 10 characters, maximum 500 characters)
- **FR-002**: System MUST provide platform selection options: shorts, tiktok, reels
- **FR-003**: System MUST provide target duration options: 15, 30, 60 seconds (maximum 60, no higher values allowed)
- **FR-004**: System MUST provide video type preset options: Explainer, Marketing, Tutorial, Recipe, Story
- **FR-005**: System MUST generate a narration script from topic using LLM service
- **FR-006**: System MUST save generated script as version 1 with source="llm"
- **FR-007**: System MUST display a loading indicator (spinner) during script generation. **Phase 1 Note**: Real-time progress tracking is deferred to Phase 2 when async job queue infrastructure is available. Phase 1 uses synchronous APIs with loading spinners only. Script generation MUST enforce a 60-second server-side timeout (FR-008). On timeout, return a clear error and provide a retry action.
- **FR-008**: System MUST handle generation timeout at 60 seconds with user-friendly error message
- **FR-009**: System MUST provide "Retry" button on generation failure

**Script Editing**
- **FR-010**: System MUST provide "Shorten" button that generates condensed script version (target 70% of original length)
- **FR-011**: System MUST provide "Lengthen" button that generates expanded script version (target 130% of original length)
- **FR-012**: System MUST provide "Rephrase" button that generates more natural language variation
- **FR-013**: System MUST provide "Change Tone" button with preset options: Casual, Professional, Funny, Inspirational
- **FR-014**: System MUST generate preview version for each quick-edit action before applying
- **FR-015**: System MUST require user confirmation ("Apply") to save edited version
- **FR-016**: System MUST increment script version number for each applied edit (v1 -> v2 -> v3)
- **FR-017**: System MUST provide textarea for manual script editing
- **FR-018**: System MUST save manual edits with source="user" (distinct from source="llm")
- **FR-019**: System MUST maintain version history showing all script versions with timestamps and source types
- **FR-020**: System MUST allow restoring any previous script version from history
- **FR-021**: System MUST display "Go to Storyboard" CTA after script is applied

**Scene Generation**
- **FR-022**: System MUST generate scenes from latest script version when user navigates to storyboard for the first time
- **FR-023**: System MUST generate scenes only once (one-time generation policy) and reload existing scenes on subsequent visits
- **FR-024**: System MUST save storyboard script version reference equal to current script version when scenes are generated
- **FR-025**: System MUST split script into scenes with target duration of 2-6 seconds per scene (normal density preset)
- **FR-026**: System MUST assign each scene: narration text, draft duration, primary keyword, order position
- **FR-027**: System MUST auto-merge scenes if total exceeds 20 scenes for a 60-second video
- **FR-028**: System MUST merge scenes with duration < 2 seconds by combining with adjacent scene
- **FR-029**: System MUST combine narration text with spaces when merging scenes
- **FR-030**: System MUST sum draft durations when merging scenes
- **FR-031**: System MUST keep first scene's primary keyword when merging
- **FR-032**: System MUST detect when current script version differs from storyboard script version and display banner warning
- **FR-033**: System MUST provide "Regenerate scenes" button that overwrites existing scenes with new split from latest script
- **FR-034**: System MUST show confirmation warning before regenerating scenes if manual edits exist

**Scene Editing**
- **FR-035**: System MUST display scene cards in grid or list view showing: thumbnail placeholder, narration text, draft duration, primary keyword, subtitle preset
- **FR-036**: System MUST allow clicking scene card to open edit panel
- **FR-037**: System MUST allow editing draft duration for each scene within the range of 1 second to min(60 seconds, project.target_duration_seconds), and MUST block save if the sum of all scene durations exceeds project.target_duration_seconds
- **FR-038**: System MUST allow editing primary keyword for each scene
- **FR-039**: System MUST provide subtitle preset options: Minimal, Highlight, Karaoke (at least 3 presets). **Preset Definitions**:
  - **Minimal**: Simple static text displayed at the bottom of the scene with no background or special effects
  - **Highlight**: Static text with a semi-transparent background box for better readability
  - **Karaoke**: Visual-only word-by-word highlighting (text appears word-by-word in sync with narration timing). **Phase 1 Note**: Karaoke preset in Phase 1 is visual-only styling. Functional TTS-synchronized karaoke animation is deferred to Phase 2.
- **FR-040**: System MUST allow changing subtitle preset per scene
- **FR-041**: System MUST allow applying subtitle preset to all scenes with one click ("Apply to all" button)
- **FR-042**: System MUST allow reordering scenes via drag-and-drop
- **FR-043**: System MUST update order positions for all affected scenes when reordering
- **FR-044**: System MUST save scene changes immediately without requiring explicit save button
- **FR-045**: System MUST validate duration is >= 1 second before saving
- **FR-046**: System MUST display visual confirmation after saving scene changes

**Project Persistence**
- **FR-047**: System MUST create project record with: unique identifier, owner reference, title, topic, platform, video type, target duration, status="draft", creation timestamp, last modified timestamp
- **FR-048**: System MUST save project with reference to latest script version
- **FR-049**: System MUST initialize storyboard script version as null until scenes are generated
- **FR-050**: System MUST display project dashboard showing all user's projects sorted by last modified descending
- **FR-051**: System MUST allow reopening any project from dashboard
- **FR-052**: System MUST load current script (latest version) when project is opened
- **FR-053**: System MUST load all scenes with current state when project is opened
- **FR-054**: System MUST preserve all changes across browser sessions
- **FR-055**: System MUST enforce user data isolation ensuring users can only access their own projects

**Progress/Recovery State Model (Spec Only - Phase 2)**

**Phase 1 Implementation Note**: This section is for Phase 2 async infrastructure only. Phase 1 MUST use synchronous APIs. Do NOT implement job queues, worker processes, database tables (`render_jobs`, `job_steps`), or any async job state tracking in Phase 1. These requirements are documentation-only to define the data model for future Phase 2 implementation.

- **FR-056**: System MUST define render job status values: queued, running, succeeded, failed, canceled
- **FR-057**: System MUST define render job step names: tts_generation, subtitle_generation, media_fetch, render_composite
- **FR-058**: System MUST define job step status values: pending, running, failed, done
- **FR-059**: System MUST define job snapshot fields: storyboard script version snapshot, voice identifier snapshot, script version snapshot
- **FR-060**: System MUST define retry count tracking number of retry attempts
- **FR-061**: System MUST define error code and error message fields for failure states
- **FR-062**: System MUST define stalled job timeout threshold (e.g., 15 minutes without last updated timestamp change)
- **FR-063**: System MUST define recovery actions: retry from failed step, switch provider, user upload, cancel

### Key Entities

**Project**
- Represents a video creation project with topic, configuration, and current status
- Attributes: unique identifier, owner reference, title (derived from topic or user-defined), topic (input text), platform selection (shorts/tiktok/reels), video type (Explainer/Marketing/Tutorial/Recipe/Story), target duration in seconds (15/30/60, max 60), reference to latest script version, reference to storyboard script version (used to generate scenes, null until scenes created), current status (draft/rendering/done/failed), creation timestamp, last modified timestamp

**Script**
- Represents a versioned narration script for a project
- Attributes: unique identifier, reference to owning project, version number (incrementing integer starting at 1), content (full narration text), source (llm/user indicating generation method), creation timestamp

**Scene**
- Represents a single visual scene within a storyboard
- Attributes: unique identifier, reference to owning project, position/order in storyboard, narration text (script segment for this scene), draft duration in seconds (user-editable), final duration in seconds (determined after TTS, null in Phase 1), primary keyword (search term for media matching), subtitle style preset reference, creation timestamp, last modified timestamp

**RenderJob** (Spec Only - Phase 2)
- Represents an async rendering job with state tracking
- Attributes: unique identifier, reference to owning project, status (queued/running/succeeded/failed/canceled), current processing step (tts/subtitle/media/render), progress percentage (0-100), retry count, storyboard script version snapshot (fixed at job start), voice identifier snapshot (fixed at job start), script version snapshot (for audit), error code, error message, creation timestamp, last updated timestamp

**JobStep** (Spec Only - Phase 2)
- Represents a single step within a render job
- Attributes: unique identifier, reference to parent render job, step name (tts_generation/subtitle_generation/media_fetch/render_composite), status (pending/running/failed/done), start timestamp, end timestamp, log (error details or status notes)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create a project and generate a script in under 90 seconds (topic entry to generated script display)
- **SC-002**: Script generation success rate >= 95% (excluding network/timeout failures)
- **SC-003**: Script quick-edit actions (Shorten/Lengthen/Rephrase/Change Tone) complete in under 45 seconds per action
- **SC-004**: Scene generation from script completes in under 5 seconds for typical 60-second video
- **SC-005**: Scene auto-merge correctly reduces scene count to <=20 in 100% of cases where initial split exceeds 20 scenes
- **SC-006**: Scene card edits save and persist correctly in 100% of cases (verified by page refresh and project reload)
- **SC-007**: Project reload from dashboard displays all data correctly (script, scenes, metadata) in under 3 seconds
- **SC-008**: Users can complete the full workflow (Topic -> Script -> Generate Scenes -> Edit Scenes) in under 5 minutes on first attempt
- **SC-009**: Script-to-storyboard version mismatch detection accuracy = 100% (warning displays every time versions differ)
- **SC-010**: Zero data loss incidents across browser sessions (all edits preserved on reload)
