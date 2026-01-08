---
lane: "for_review"
agent: "claude"
shell_pid: "67763"
---
# Work Package: WP00 - Database & Storage Setup

**Work Package ID**: WP00
**Feature**: 004-visuals-video-rendering
**Status**: planned
**Created**: 2026-01-08

**Lane**: planned
**History**:
- 2026-01-08: Created work package (planned)

---

## Objective

Create database schema, indexes, RLS policies, and Supabase Storage bucket for render jobs, job steps, and exports. This is the foundational work package that enables all other rendering functionality.

**Subtasks**:
- T001: Create database migration file (`20250108_visuals_video_rendering.sql`)
- T002: Add `render_jobs` table with indexes and check constraints
- T003: Add `job_steps` table with composite indexes
- T004: Add `exports` table with foreign key to `render_jobs`
- T005: Extend `scenes` table with `subtitle_timing` (JSONB) and `subtitle_style_preset_id` columns
- T006: Create `updated_at` trigger function and attach to `render_jobs`
- T007: Enable Row Level Security (RLS) on all new tables
- T008: Create RLS policies for user isolation (render_jobs, job_steps, exports)
- T009: Create Supabase Storage bucket `exports` with folder structure
- T010: Write migration rollback script (drop tables, policies, triggers)

---

## Context

You are implementing the data model defined in `data-model.md` for the Visuals and Video Rendering feature. The database must support async video rendering with Remotion, progress tracking, retry logic, and MP4 export to Supabase Storage.

**Key Requirements**:
- Support render job state machine: queued → running → succeeded/failed/canceled
- Track granular progress with 4 steps: tts_generation, subtitle_generation, media_fetch, render_composite
- Enforce user isolation via RLS policies (users can only access their own render jobs)
- Store word-level subtitle timing data for Karaoke effect
- Capture snapshots at render start to prevent mid-render changes

**Schema Reference**:
- `render_jobs` table with status check constraint and updated_at trigger
- `job_steps` table with unique constraint on (render_job_id, step_name)
- `exports` table with unique constraint on render_job_id
- `scenes` table extended with subtitle_timing (JSONB) and subtitle_style_preset_id

---

## Subtask Guidance

### T001: Create database migration file

**Action**: Create `migrations/20250108_visuals_video_rendering.sql` with header comments and transaction wrapper.

**Implementation Steps**:
1. Create migration file following project naming convention
2. Add header comments: Migration name, date, description
3. Wrap migration in `BEGIN; ... COMMIT;` transaction
4. Include rollback comments at the end (e.g., `-- Rollback: DROP TABLE ...`)

**Validation**:
- File exists in `migrations/` directory
- SQL syntax is valid (test with `psql -f migration.sql`)

### T002: Add render_jobs table

**Action**: Create `render_jobs` table with all required columns, indexes, and check constraints.

**Implementation Steps**:
1. Define columns: id (UUID), project_id (FK), status (TEXT, check constraint), current_step (TEXT), progress (INTEGER), snapshots (3 columns), retry_count, error_code, error_message, started_at, completed_at, created_at, updated_at
2. Add CHECK constraint on status: `IN ('queued', 'running', 'succeeded', 'failed', 'canceled')`
3. Add CHECK constraint on current_step: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')`
4. Add CHECK constraint on progress: `BETWEEN 0 AND 100`
5. Create indexes: project_id, (status, created_at), updated_at
6. Set defaults: status='queued', progress=0, retry_count=0, created_at=NOW(), updated_at=NOW()

**Validation**:
- `SELECT * FROM render_jobs;` returns empty table
- Insert violates status check constraint should fail
- Indexes exist: `\d render_jobs` shows indexes

### T003: Add job_steps table

**Action**: Create `job_steps` table with foreign key to render_jobs and unique constraint.

**Implementation Steps**:
1. Define columns: id (UUID), render_job_id (FK), step_name (TEXT, check constraint), status (TEXT, check constraint), started_at, ended_at, log, created_at
2. Add CHECK constraint on step_name: `IN ('tts_generation', 'subtitle_generation', 'media_fetch', 'render_composite')`
3. Add CHECK constraint on status: `IN ('pending', 'running', 'failed', 'done')`
4. Add UNIQUE constraint: (render_job_id, step_name)
5. Create indexes: (render_job_id, step_name), (render_job_id, status)
6. Set defaults: status='pending', created_at=NOW()

**Validation**:
- Insert duplicate (render_job_id, step_name) should fail (UNIQUE constraint)
- Foreign key to render_jobs should cascade on delete

### T004: Add exports table

**Action**: Create `exports` table with foreign key to render_jobs and unique constraint.

**Implementation Steps**:
1. Define columns: id (UUID), project_id (FK), render_job_id (FK, unique), video_url, duration_sec, file_size_bytes, resolution, format, created_at
2. Add UNIQUE constraint on render_job_id (one export per render job)
3. Add CHECK constraint on format: `'mp4'` (MVP only supports MP4)
4. Set defaults: resolution='1080x1920', format='mp4', created_at=NOW()
5. Create indexes: project_id, render_job_id, created_at DESC

**Validation**:
- Insert duplicate render_job_id should fail (UNIQUE constraint)
- Foreign key to render_jobs should cascade on delete

### T005: Extend scenes table

**Action**: Add new columns to existing `scenes` table for subtitle timing and preset selection.

**Implementation Steps**:
1. Use `ALTER TABLE scenes ADD COLUMN IF NOT EXISTS` to avoid conflicts
2. Add `subtitle_timing` column (JSONB, nullable)
3. Add `subtitle_style_preset_id` column (TEXT, nullable, FK to subtitle_presets)
4. Create GIN index on subtitle_timing for JSONB queries
5. Add comment: `subtitle_timing` stores word/sentence-level timing data for Karaoke subtitles

**Validation**:
- `SELECT * FROM scenes;` shows new columns
- Insert sample JSONB data: `[{"word": "test", "start_ms": 0, "end_ms": 200}]`
- GIN index exists: `\d scenes` shows indexes

### T006: Create updated_at trigger

**Action**: Create trigger function and attach to render_jobs table for auto-updating updated_at.

**Implementation Steps**:
1. Create function `update_updated_at_column()` if not exists
2. Function body: `NEW.updated_at = NOW(); RETURN NEW;`
3. Create trigger `update_render_jobs_updated_at` on render_jobs
4. Trigger timing: BEFORE UPDATE, FOR EACH ROW
5. Attach trigger function to trigger

**Validation**:
- Update a render_job row and verify `updated_at` changes to current timestamp
- Wait 1 second, update again, verify `updated_at` is newer

### T007: Enable Row Level Security

**Action**: Enable RLS on all new tables (render_jobs, job_steps, exports).

**Implementation Steps**:
1. Run `ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;`
2. Run `ALTER TABLE job_steps ENABLE ROW LEVEL SECURITY;`
3. Run `ALTER TABLE exports ENABLE ROW LEVEL SECURITY;`
4. Verify RLS is enabled: `\d table_name` shows "Row Level Security" enabled

**Validation**:
- Query as one user cannot see another user's data
- RLS policies are enforced (next subtask)

### T008: Create RLS policies

**Action**: Create RLS policies for user isolation on all tables.

**Implementation Steps**:
1. Create policy "Users can view own render_jobs" for SELECT
2. Create policy "Users can insert own render_jobs" for INSERT
3. Create policy "Users can update own render_jobs" for UPDATE
4. Create policy "Users can view own job_steps" for SELECT (inherited via render_jobs)
5. Create policy "Users can view own exports" for SELECT
6. Create policy "Users can insert own exports" for INSERT
7. All policies use `auth.uid()` for user identification
8. Policies check `project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())`

**Validation**:
- Create test users A and B
- User A creates render_job for project X
- User B cannot query User A's render_job (returns empty)
- User A can query own render_job (returns data)

### T009: Create Supabase Storage bucket

**Action**: Create `exports` bucket in Supabase Storage with folder structure.

**Implementation Steps**:
1. Navigate to Supabase Dashboard → Storage
2. Create new bucket `exports`
3. Configure bucket settings: Public bucket=false (private)
4. Create RLS policy for storage objects (user can only access own folder)
5. Document folder structure: `exports/{user_id}/{project_id}/{render_job_id}.mp4`
6. Alternatively, use Terraform/script for automated bucket creation

**Validation**:
- Upload test file to `exports/user123/project456/job789.mp4`
- Generate signed URL and verify download works
- User B cannot access user A's files (403 Forbidden)

### T010: Write migration rollback

**Action**: Create rollback script to drop all new objects if migration fails.

**Implementation Steps**:
1. Create file `migrations/rollback/20250108_visuals_video_rendering_rollback.sql`
2. Drop triggers: `DROP TRIGGER IF EXISTS update_render_jobs_updated_at ON render_jobs;`
3. Drop function: `DROP FUNCTION IF EXISTS update_updated_at_column();`
4. Drop tables in reverse order: exports, job_steps, render_jobs
5. Drop indexes: `DROP INDEX IF EXISTS idx_render_jobs_project_id;` etc.
6. Drop RLS policies: `DROP POLICY IF EXISTS "Users can view own render_jobs" ON render_jobs;`
7. Drop columns: `ALTER TABLE scenes DROP COLUMN IF EXISTS subtitle_timing;`

**Validation**:
- Run rollback script after running migration
- Verify all tables, indexes, policies are dropped
- Run migration again to verify clean re-install

---

## Test Strategy

### Unit Testing
Not applicable (database migration tested via integration tests)

### Integration Testing
- Test migration runs successfully on local database
- Test RLS policies enforce user isolation
- Test trigger updates `updated_at` column
- Test foreign key constraints prevent orphaned records

### Manual Testing
1. Run migration: `supabase db reset`
2. Verify tables exist: `SELECT * FROM information_schema.tables WHERE table_name IN ('render_jobs', 'job_steps', 'exports');`
3. Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename IN ('render_jobs', 'job_steps', 'exports');`
4. Test RLS: Create test users A and B, verify A cannot access B's data
5. Test rollback: Run rollback script, verify objects dropped

---

## Definition of Done

- [ ] Migration file `20250108_visuals_video_rendering.sql` exists
- [ ] All 3 tables created (render_jobs, job_steps, exports)
- [ ] scenes table extended with 2 new columns
- [ ] All indexes created (9 total)
- [ ] updated_at trigger function and trigger created
- [ ] RLS enabled on all new tables
- [ ] RLS policies created and tested (7 policies)
- [ ] Supabase Storage bucket `exports` created
- [ ] Rollback script exists and tested
- [ ] Migration runs without errors on local and staging databases
- [ ] Quickstart scenario "Database Setup" passes

---

## Risks

**Risk**: RLS policies may block worker service role key access
- **Mitigation**: Test RLS policies with both user context (anon key) and service role context (service_role key). Worker should bypass RLS using service role key.

**Risk**: Migration may conflict with existing scenes table alterations
- **Mitigation**: Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to avoid conflicts

**Risk**: Storage bucket creation may require manual dashboard steps
- **Mitigation**: Document setup steps for operations team, or use Terraform for IaC

---

## Reviewer Guidance

**Key Files to Review**:
- `migrations/20250108_visuals_video_rendering.sql` (main migration)
- `migrations/rollback/20250108_visuals_video_rendering_rollback.sql` (rollback)

**Validation Checklist**:
- [ ] All CHECK constraints use correct values (e.g., status enum values match spec)
- [ ] Foreign keys have ON DELETE CASCADE where appropriate
- [ ] Indexes cover common query patterns (project lookups, status filtering, stalled job detection)
- [ ] RLS policies use `auth.uid()` correctly
- [ ] Trigger function is idempotent (CREATE OR REPLACE)
- [ ] Migration is wrapped in transaction
- [ ] Rollback script drops all objects in correct order

**Testing Commands**:
```bash
# Run migration
supabase db reset

# Verify tables
psql -c "\d render_jobs"

# Test RLS
psql -c "SELECT * FROM render_jobs;" (as user A)
psql -c "SELECT * FROM render_jobs;" (as user B) -- should see different results

# Test rollback
psql -f migrations/rollback/20250108_visuals_video_rendering_rollback.sql
```

**Common Pitfalls**:
- Missing CHECK constraint on status/step_name columns
- Forgetting to enable RLS (security vulnerability)
- Incorrect foreign key reference (e.g., referencing non-existent table)
- Missing NOT NULL constraints on required fields
- Trigger not firing (forgot to attach trigger to table)

## Activity Log

- 2026-01-08T11:17:18Z – claude – shell_pid=67763 – lane=doing – Started implementation
- 2026-01-08T12:00:00Z – claude – shell_pid=67763 – lane=doing – Completed T001-T010: Migration file created (206 lines), rollback script created (59 lines), storage setup guide created
- 2026-01-08T12:16:36Z – claude – shell_pid=67763 – lane=for_review – Ready for review
