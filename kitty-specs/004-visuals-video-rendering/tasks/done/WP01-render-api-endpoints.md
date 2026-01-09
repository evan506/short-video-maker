---
lane: "done"
agent: "claude-reviewer"
assignee: "claude"
shell_pid: "10184"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# Work Package: WP01 - Render API Endpoints

**Work Package ID**: WP01
**Feature**: 004-visuals-video-rendering
**Status**: done
**Created**: 2026-01-08
**Assignee**: claude
**Agent**: claude
**Shell PID**: 30443

**Lane**: done
**History**:
- 2026-01-08: Created work package (planned)

---

## Objective

Implement Next.js API routes for render job creation, status polling, cancellation, and retry. This enables the frontend to initiate and monitor async video rendering jobs.

**Subtasks**:
- T011: Create `src/server/routes/render-router.ts` with route handlers
- T012: Implement `POST /api/render/jobs` (create render job with snapshots)
- T013: Implement `GET /api/render/jobs/:jobId` (status polling endpoint)
- T014: Implement `POST /api/render/jobs/:jobId/cancel` (cancellation endpoint)
- T015: Implement `POST /api/render/jobs/:jobId/retry` (retry from failed step)
- T016: Create `src/server/services/render-service.ts` for job creation logic
- T017: Implement snapshot capture logic (storyboard_script_version, voice_id, script_version)
- T018: Add request validation middleware (project ownership checks)
- T019: Implement error responses with actionable messages (e.g., "Pexels download failed")
- T020: Write API contract tests using OpenAPI spec

---

## Context

You are building the REST API layer defined in `contracts/openapi.yaml` for the Visuals and Video Rendering feature. The API must support the full render job lifecycle: create → poll → cancel/retry → complete.

**API Endpoints**:
- `POST /api/render/jobs` - Create new render job
- `GET /api/render/jobs/:jobId` - Get job status and progress
- `POST /api/render/jobs/:jobId/cancel` - Cancel running job
- `POST /api/render/jobs/:jobId/retry` - Retry failed job from failed step

**Key Requirements**:
- Capture snapshots at render start (storyboard_script_version, voice_id, script_version)
- Enforce project ownership (only project owner can create/manage render jobs)
- Return actionable error messages (not cryptic error codes)
- Support retry from failed step (skip completed steps)
- Update `updated_at` timestamp on every status change

---

## Subtask Guidance

### T011: Create render-router.ts

**Action**: Create Next.js API route handler file for render endpoints.

**Implementation Steps**:
1. Create `src/app/api/render/jobs/route.ts` for POST endpoint
2. Create `src/app/api/render/jobs/[jobId]/route.ts` for GET endpoint
3. Create `src/app/api/render/jobs/[jobId]/cancel/route.ts` for POST cancel
4. Create `src/app/api/render/jobs/[jobId]/retry/route.ts` for POST retry
5. Export handler functions for each endpoint

**Validation**:
- Next.js route handlers are valid TypeScript
- All endpoints import and use render-service

### T012: Implement POST /api/render/jobs

**Action**: Create render job endpoint with snapshot capture.

**Implementation Steps**:
1. Accept request body: `{ projectId: string }`
2. Verify user authentication (auth.uid())
3. Verify project ownership: `SELECT user_id FROM projects WHERE id = projectId`
4. Capture snapshots: `storyboard_script_version`, `voice_id`, `script_version` from current project state
5. Create render_job record with status='queued', current_step='tts_generation', progress=0
6. Create 4 job_steps records (tts_generation, subtitle_generation, media_fetch, render_composite) with status='pending'
7. Return HTTP 201 with job object: `{ jobId, status, currentStep, progress, createdAt }`
8. Return HTTP 400 if request body invalid
9. Return HTTP 403 if user doesn't own project
10. Return HTTP 404 if project not found

**Validation**:
- POST returns 201 with job object
- render_job record exists in database
- 4 job_steps records exist for the job
- Snapshots captured correctly

### T013: Implement GET /api/render/jobs/:jobId

**Action**: Create status polling endpoint.

**Implementation Steps**:
1. Extract jobId from URL params
2. Verify user authentication
3. Query render_job by id with RLS policy check
4. Query all job_steps for the job
5. Calculate progress %: `(number of steps with status='done' / 4) * 100`
6. Return HTTP 200 with: `{ jobId, status, currentStep, progress, jobSteps: [...], updatedAt }`
7. Return HTTP 403 if user doesn't own job
8. Return HTTP 404 if job not found

**Validation**:
- GET returns 200 with job status
- Progress % calculated correctly (e.g., 2 done steps = 50%)
- updatedAt timestamp is included

### T014: Implement POST /api/render/jobs/:jobId/cancel

**Action**: Create cancellation endpoint.

**Implementation Steps**:
1. Extract jobId from URL params
2. Verify user authentication and ownership
3. Check current status: Only allow cancel if status='queued' or status='running'
4. Update render_job status='canceled'
5. Return HTTP 200 with: `{ jobId, status: 'canceled' }`
6. Return HTTP 400 if job already completed (status='succeeded' or 'failed')
7. Return HTTP 404 if job not found

**Validation**:
- POST returns 200 with status='canceled'
- Job status in database is 'canceled'
- Cannot cancel already succeeded job (returns 400)

### T015: Implement POST /api/render/jobs/:jobId/retry

**Action**: Create retry endpoint that resumes from failed step.

**Implementation Steps**:
1. Extract jobId from URL params
2. Verify user authentication and ownership
3. Check current status: Only allow retry if status='failed'
4. Query job_steps to find first step with status='failed'
5. Reset failed step status to 'pending', clear started_at/ended_at
6. Reset all subsequent steps to 'pending' (e.g., if step 3 failed, reset steps 3-4)
7. Increment retry_count in render_job
8. Update render_job status='queued', current_step=<failed step>
9. Return HTTP 200 with: `{ jobId, status: 'queued', retryCount, currentStep }`
10. Return HTTP 400 if job not failed (already succeeded or still running)

**Validation**:
- Retry resumes from failed step (doesn't re-complete steps with status='done')
- retry_count increments
- Job status becomes 'queued' for worker pickup

### T016: Create render-service.ts

**Action**: Create service layer for render job business logic.

**Implementation Steps**:
1. Create `src/server/services/render-service.ts`
2. Implement `createRenderJob()` function
3. Implement `getRenderJob()` function
4. Implement `cancelRenderJob()` function
5. Implement `retryRenderJob()` function
6. Use Supabase client for database queries
7. Wrap queries in transactions where needed
8. Handle errors and return actionable error messages

**Validation**:
- Service functions are pure and testable
- Error messages are actionable (e.g., "Project not found" not "NullReferenceException")

### T017: Implement snapshot capture logic

**Action**: Capture project state snapshots at render start.

**Implementation Steps**:
1. Query project to get `storyboard_script_version`, `voice_id`, `script_version`
2. Store these values in render_job: `storyboard_script_version_snapshot`, `voice_id_snapshot`, `script_version_snapshot`
3. Use transaction to ensure snapshots are consistent
4. Log snapshot values for debugging: `Creating render job with snapshots: {versions}`

**Validation**:
- Snapshots captured at job creation time
- Snapshots don't change if project is modified during render

### T018: Add request validation middleware

**Action**: Validate requests and enforce project ownership.

**Implementation Steps**:
1. Create middleware function `validateProjectOwnership(req, res, next)`
2. Extract projectId from request body or params
3. Query `SELECT user_id FROM projects WHERE id = projectId`
4. Compare with `auth.uid()` from request context
5. Return HTTP 403 if user doesn't own project
6. Call next() if ownership validated

**Validation**:
- User A cannot access User B's project (returns 403)
- User A can access own project (passes validation)

### T019: Implement error responses

**Action**: Return actionable error messages for common failure scenarios.

**Implementation Steps**:
1. Create error mapping object: `TTS_FAILED → "Voiceover generation failed. Click to regenerate."`
2. Map error codes to user-friendly messages
3. Include action suggestions in messages: "Click to retry with Pixabay."
4. Return error response: `{ error: { code, message, action } }`
5. Log technical errors for debugging: `console.error('TTS failed:', err)`

**Validation**:
- Error messages are user-friendly (not technical jargon)
- Error messages include action suggestions
- Error codes are machine-readable (for frontend handling)

### T020: Write API contract tests

**Action**: Write tests to verify API matches OpenAPI spec.

**Implementation Steps**:
1. Install testing dependencies: `@playwright/test`, `supabase-js`
2. Create test file `tests/integration/render-api.test.ts`
3. Test POST /api/render/jobs returns 201
4. Test GET /api/render/jobs/:jobId returns 200
5. Test POST /api/render/jobs/:jobId/cancel returns 200
6. Test POST /api/render/jobs/:jobId/retry returns 200
7. Test error cases: 400, 403, 404 responses
8. Verify response structure matches OpenAPI spec

**Validation**:
- All tests pass
- Response objects match OpenAPI schema
- Error handling works correctly

---

## Test Strategy

### Unit Testing
- Test render-service functions with mock database
- Test snapshot capture logic
- Test progress calculation logic

### Integration Testing
- Test API endpoints with real database
- Test RLS policies enforced
- Test error responses

### Manual Testing
1. Create render job via Postman: `POST http://localhost:3000/api/render/jobs`
2. Poll status: `GET http://localhost:3000/api/render/jobs/{jobId}`
3. Cancel job: `POST http://localhost:3000/api/render/jobs/{jobId}/cancel`
4. Retry job: `POST http://localhost:3000/api/render/jobs/{jobId}/retry`

---

## Definition of Done

- [x] All 4 API endpoints implemented
- [x] POST /api/render/jobs creates job with snapshots
- [x] GET /api/render/jobs/:jobId returns status and progress
- [x] POST /api/render/jobs/:jobId/cancel cancels job
- [x] POST /api/render/jobs/:jobId/retry retries from failed step
- [x] Project ownership enforced (403 for unauthorized)
- [x] Error messages are actionable
- [x] API contract tests pass
- [x] OpenAPI spec matches implementation
- [x] Quickstart scenario "Render Job Creation" passes

---

## Risks

**Risk**: Snapshot capture may race with concurrent storyboard edits
- **Mitigation**: Use database transaction with `SELECT FOR UPDATE` on projects table

**Risk**: Retry logic may skip steps incorrectly
- **Mitigation**: Add unit tests for step state machine (pending → running → failed/done)

**Risk**: Rate limiting may be needed for job creation
- **Mitigation**: Add Supabase rate limit plugin (deferred to Phase 2)

---

## Reviewer Guidance

**Key Files to Review**:
- `src/app/api/render/jobs/route.ts`
- `src/app/api/render/jobs/[jobId]/route.ts`
- `src/server/services/render-service.ts`

**Validation Checklist**:
- [ ] All endpoints use HTTP verbs correctly (POST for creation, GET for retrieval)
- [ ] Status codes are correct (201 for creation, 200 for success, 400/403/404 for errors)
- [ ] Project ownership verified for all operations
- [ ] Snapshots captured atomically (in transaction)
- [ ] Error messages are user-friendly
- [ ] Progress calculation is accurate
- [ ] Retry logic skips completed steps correctly

**Testing Commands**:
```bash
# Test create job
curl -X POST http://localhost:3000/api/render/jobs \
  -H "Authorization: Bearer $JWT" \
  -d '{"projectId": "uuid"}'

# Test status polling
curl http://localhost:3000/api/render/jobs/{jobId} \
  -H "Authorization: Bearer $JWT"

# Test cancel
curl -X POST http://localhost:3000/api/render/jobs/{jobId}/cancel \
  -H "Authorization: Bearer $JWT"

# Test retry
curl -X POST http://localhost:3000/api/render/jobs/{jobId}/retry \
  -H "Authorization: Bearer $JWT"
```

**Common Pitfalls**:
- Forgetting to verify project ownership (security vulnerability)
- Not capturing snapshots in transaction (race condition)
- Returning technical error messages instead of user-friendly ones
- Incorrect progress calculation (should be based on completed steps)
- Allowing retry on succeeded job (should only retry failed jobs)

## Activity Log

- 2026-01-08T14:05:14Z – claude – shell_pid=87856 – lane=doing – Started implementation of render API endpoints
- 2026-01-08T14:30:00Z – claude – shell_pid=87856 – lane=doing – Completed T011-T020: Implemented render-service.ts (540 lines) with job creation, status, cancel, retry; Implemented render-router.ts (380 lines) with 4 API endpoints; Added router to server.ts; Created API integration tests (240 lines)
- 2026-01-08T22:33:18Z – claude – shell_pid=87856 – lane=for_review – Ready for review
- 2026-01-09T09:35:00Z – claude-reviewer – shell_pid=10184 – lane=done – Approved: All 4 API endpoints implemented correctly with proper authentication, ownership validation, snapshots, progress calculation, and retry logic. E2E tests written (281 lines). OpenAPI spec matches implementation.
