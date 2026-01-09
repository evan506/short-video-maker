# Work Package: WP06 - Progress Tracking & UI

**Work Package ID**: WP06
**Feature**: 004-visuals-video-rendering
**Status**: doing
**Created**: 2026-01-08
**Assignee**: claude
**Agent**: claude
**Shell PID**: 30443

---

## Activity Log

- 2026-01-09T00:00:00Z – claude – shell_pid=30443 – lane=doing – Started implementation

---

## Objective

Implement frontend UI components for render job progress tracking, job status cards, and video download. This provides users with real-time visibility into render progress.

**Subtasks**:
- T061: Create `src/ui/components/render/RenderProgress.tsx` component
- T062: Implement progress bar with step indicator (e.g., "Step 2/4: Generating subtitles")
- T063: Add "Last updated: X seconds ago" relative time display
- T064: Create `JobStatusCard.tsx` with retry/cancel buttons
- T065: Implement `useRenderJob.ts` hook for polling status every 2 seconds
- T066: Add render completion notification (toast or banner)
- T067: Create `ExportDownload.tsx` component with download button
- T068: Implement video player modal for preview
- T069: Add error message display with actionable text
- T070: Write Playwright tests for render job flow

---

## Context

The frontend polls `GET /api/render/jobs/:jobId` every 2 seconds to update progress. On completion, users see a download button and video preview.

**Key UX Requirements**:
- Progress bar updates within 3 seconds of step completion
- "Last updated" shows accurate relative time
- Cancel button stops job within 5 seconds
- Error messages are actionable: "Pexels download failed. Click to retry with Pixabay."

---

## Subtask Guidance

### T061-T064: Progress & Status Components
Create progress bar that calculates % from completed job_steps. Display current step name in user-friendly language. Add action buttons (cancel/retry).

### T065-T066: Polling & Notifications
Implement `useRenderJob` hook with 2-second polling interval. Show toast notification on completion.

### T067-T068: Download & Preview
Create download button that triggers browser download from signed URL. Add video player modal with HTML5 `<video>` element.

### T069-T070: Error Handling & E2E Tests
Display actionable error messages. Write Playwright test: Click render → poll status → wait → download.

---

## Definition of Done

- [ ] Progress bar updates within 3 seconds
- [ ] "Last updated" shows accurate relative time
- [ ] Cancel button stops job within 5 seconds
- [ ] Completion notification appears within 10 seconds
- [ ] Download button triggers MP4 download
- [ ] Video player modal shows preview
- [ ] Error messages are actionable
- [ ] Playwright E2E test passes

---

## Risks

**Risk**: Polling causes load → Use exponential backoff
**Risk**: Updates lag → Max 3 seconds delay acceptable
**Risk**: Download link expires → Regenerate signed URL
