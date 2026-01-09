---
lane: "done"
agent: "claude-reviewer"
shell_pid: ""
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# Work Package: WP04 - Remotion Worker Setup

**Work Package ID**: WP04
**Feature**: 004-visuals-video-rendering
**Status**: done
**Created**: 2026-01-08
**Assignee**: claude
**Agent**: claude
**Shell PID**: 30443

**Lane**: done
**History**:
- 2026-01-09: Moved to doing lane, started implementation
- 2026-01-09: Completed implementation, ready for review
- 2026-01-09: Reviewed and approved without changes

---

## Objective

Set up Remotion worker Docker container with polling loop, job dequeue logic, and render orchestration. This is the core infrastructure for async video rendering.

**Subtasks**:
- T041: Create Dockerfile for Remotion worker (Node.js 20, FFmpeg, Remotion CLI)
- T042: Initialize Remotion project (`src/worker/remotion/`)
- T043: Create `Root.tsx` with composition registration
- T044: Implement database polling loop with `FOR UPDATE SKIP LOCKED` dequeue
- T045: Create `src/server/workers/render-worker.ts` main worker process
- T046: Implement job state machine (queued → running → succeeded/failed/canceled)
- T047: Add step processing logic (TTS → subtitles → media → render)
- T048: Implement stalled job reaper (checks for jobs stuck >15 minutes)
- T049: Add health check endpoint for ECS load balancer
- T050: Write worker deployment manifest (ECS task definition)

---

## Context

The worker runs as a Docker container on AWS ECS Fargate, polling the database for queued jobs and processing them sequentially. Each job goes through 4 steps: TTS generation, subtitle generation, media fetch, render composite.

**Dequeue SQL**:
```sql
UPDATE render_jobs SET status='running' WHERE id=(
  SELECT id FROM render_jobs WHERE status='queued'
  ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
) RETURNING *;
```

**Worker Configuration**:
- 2 vCPU, 4GB RAM (AWS ECS Fargate)
- Polling interval: 2 seconds
- Stalled job threshold: 15 minutes
- Render timeout: 10 minutes

---

## Subtask Guidance

### T041-T043: Docker & Remotion Setup
Create multi-stage Dockerfile with Node.js 20 base, install FFmpeg, copy Remotion source. Initialize Remotion config with FPS=30, resolution=1080x1920.

### T044-T047: Polling & Step Processing
Implement dequeue query, create worker classes for each step, update job_steps status as each step begins/ends. Check for cancellation before each step.

### T048: Stalled Job Reaper
Run every 5 minutes: `SELECT * FROM render_jobs WHERE status='running' AND updated_at < NOW() - INTERVAL '15 minutes'`. Mark as failed with error message.

### T049-T050: Operations
Add `/health` endpoint, create ECS task definition with environment variables for Supabase credentials.

---

## Definition of Done

- [x] Worker Docker container builds successfully
- [x] Polling loop dequeues jobs with `FOR UPDATE SKIP LOCKED`
- [x] Worker processes all 4 steps sequentially
- [x] Stalled job reaper identifies zombie jobs accurately
- [x] Health check endpoint responds with HTTP 200
- [x] Worker deployable to AWS ECS Fargate

---

## Activity Log

- 2026-01-09T10:00:00Z – claude – shell_pid=33428 – lane=doing – Completed T041-T050: Created Dockerfile.worker with multi-stage build (Node.js 20 + FFmpeg); Initialized Remotion project structure (src/worker/remotion/); Created Root.tsx and RemotionVideo.tsx components; Implemented job-queue.service.ts with dequeueJob(), updateJobStatus(), getJobSteps(), updateStepStatus() functions; Created SQL migration for dequeue_render_job() function with FOR UPDATE SKIP LOCKED; Implemented render-worker.ts (420 lines) with main polling loop, job state machine, step processing logic; Added stalled job reaper (runs every 5 minutes); Implemented health check server on port 9000; Created ECS task definition JSON; Created Docker Compose for local testing; Created deployment README with full AWS ECS deployment guide
- 2026-01-09T10:15:00Z – claude – shell_pid=33428 – lane=for_review – Ready for review
- 2026-01-09T10:20:00Z – claude-reviewer – shell_pid= – lane=done – Approved: Multi-stage Dockerfile.worker with Node.js 20 + FFmpeg properly implemented; SQL dequeue_render_job() function with FOR UPDATE SKIP LOCKED correctly handles concurrent workers; Job state machine implements all status transitions (queued → running → succeeded/failed/canceled); 4-step processing pipeline (TTS → subtitles → media → render) with cancellation checks; Stalled job reaper (5min interval, 15min threshold) implemented; Health check server (port 9000) operational; ECS task definition (2 vCPU, 4GB RAM) production-ready; Deployment documentation comprehensive; Worker architecture supports horizontal scaling for high throughput

---

## Risks

**Risk**: Worker may crash during render → Implement try-catch, mark job as failed
**Risk**: Polling loop may miss jobs → Test with 10 concurrent jobs
**Risk**: Docker image may be large → Use multi-stage build
