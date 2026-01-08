# Work Package: WP04 - Remotion Worker Setup

**Work Package ID**: WP04
**Feature**: 004-visuals-video-rendering
**Status**: planned
**Created**: 2026-01-08

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

- [ ] Worker Docker container builds successfully
- [ ] Polling loop dequeues jobs with `FOR UPDATE SKIP LOCKED`
- [ ] Worker processes all 4 steps sequentially
- [ ] Stalled job reaper identifies zombie jobs accurately
- [ ] Health check endpoint responds with HTTP 200
- [ ] Worker deployable to AWS ECS Fargate

---

## Risks

**Risk**: Worker may crash during render → Implement try-catch, mark job as failed
**Risk**: Polling loop may miss jobs → Test with 10 concurrent jobs
**Risk**: Docker image may be large → Use multi-stage build
