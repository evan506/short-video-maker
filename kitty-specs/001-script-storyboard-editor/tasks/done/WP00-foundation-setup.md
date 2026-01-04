---
work_package_id: "WP00"
subtasks: ["T001", "T002", "T003", "T004", "T005", "T006", "T007", "T008", "T009", "T010"]
lane: "done"
title: "Foundation Setup"
agent: "claude"
shell_pid: "95292"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
  - timestamp: "2026-01-02T14:20:26Z"
    author: "claude"
    event: "Started implementation of Foundation Setup"
  - timestamp: "2026-01-02T14:25:00Z"
    author: "claude"
    event: "Completed implementation - All 10 subtasks finished"
  - timestamp: "2026-01-04T19:46:00Z"
    author: "claude"
    event: "✅ VERIFIED & COMPLETED - Database schema verified via MCP (4 tables with RLS policies enabled), migrations applied successfully"
---

# Work Package: Foundation Setup

**ID**: WP00
**Title**: Foundation Setup - Database Schema, Backend Scaffold, Frontend Routing
**Priority**: P0 (Must complete first - all other packages depend on this)
**Estimated Subtasks**: 10

## Objective

Establish the foundational infrastructure for the Script & Storyboard Editor feature by creating the database schema with Row Level Security (RLS), backend API endpoints with authentication middleware, TypeScript types, Zod validators, and frontend routing structure.

## Context

This work package creates the essential building blocks that all subsequent work packages depend on. Without a properly configured database, backend API structure, and frontend routing, no other features can be implemented. The database must enforce user data isolation through RLS policies, the backend must have secure authentication middleware, and the frontend must have proper route structure for the editor pages.

**Key Documents**:
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md`
- API Contracts: `kitty-specs/001-script-storyboard-editor/contracts/openapi.yaml`
- Implementation Plan: `kitty-specs/001-script-storyboard-editor/plan.md`

## Subtasks

### T001: Create Supabase migration for `projects` table with RLS policies

**File**: `supabase/migrations/20250102_create_projects_table.sql`

**Actions**:
1. Run `supabase migration new create_projects_table` to generate migration file
2. Write SQL schema following data-model.md:
   - Create `projects` table with columns: `id` (UUID PK), `user_id` (UUID FK), `title`, `topic`, `platform`, `video_type`, `target_duration`, `status`, `current_script_version`, `storyboard_script_version`, `voice_id`, `created_at`, `updated_at`
   - Add CHECK constraints: `platform IN ('shorts', 'tiktok', 'reels')`, `video_type IN ('Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story')`, `target_duration IN (15, 30, 60)`, `status IN ('draft', 'rendering', 'done', 'failed')`
   - Add indexes: `user_id`, `created_at DESC`, `status`
   - Enable RLS: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY`
   - Create RLS policies: SELECT/INSERT/UPDATE/DELETE with `user_id = auth.uid()`
3. Run `supabase db reset` to apply migration locally
4. Verify table exists: `supabase db inspect` or connect with `psql` and run `\d projects`

**Validation**:
- Table created with all columns and constraints
- RLS policies exist and are enabled
- Test with two users: user A cannot access user B's projects

---

### T002: Create Supabase migration for `scripts` table with RLS policies

**File**: `supabase/migrations/20250102_create_scripts_table.sql`

**Actions**:
1. Run `supabase migration new create_scripts_table`
2. Write SQL schema:
   - Create `scripts` table with columns: `id` (UUID PK), `project_id` (UUID FK to projects), `version` (INTEGER), `content`, `source`, `created_at`
   - Add CHECK constraints: `source IN ('llm', 'user')`
   - Add unique constraint: `UNIQUE(project_id, version)` (one version per project per version number)
   - Add indexes: `project_id`, `version DESC`
   - Add foreign key: `project_id REFERENCES projects(id) ON DELETE CASCADE`
   - Enable RLS and create policies (join with projects to check user_id)
3. Apply migration with `supabase db reset`

**Validation**:
- Cascading delete works: deleting project deletes all scripts
- Version uniqueness enforced: cannot create duplicate (project_id, version) pairs
- RLS policies allow script access only via project ownership

---

### T003: Create Supabase migration for `scenes` table with RLS policies

**File**: `supabase/migrations/20250102_create_scenes_table.sql`

**Actions**:
1. Run `supabase migration new create_scenes_table`
2. Write SQL schema:
   - Create `scenes` table with columns: `id`, `project_id`, `order_index`, `narration_text`, `duration_sec_draft`, `duration_sec_final`, `primary_keyword`, `subtitle_style_preset_id`, `created_at`, `updated_at`
   - Add CHECK constraint: `duration_sec_draft >= 1`
   - Add unique constraint: `UNIQUE(project_id, order_index)`
   - Add indexes: `project_id`, `order_index ASC`
   - Add foreign keys: `project_id REFERENCES projects(id) ON DELETE CASCADE`, `subtitle_style_preset_id REFERENCES subtitle_presets(id)`
   - Enable RLS and create policies
3. Apply migration with `supabase db reset`

**Validation**:
- Cascading delete works: deleting project deletes all scenes
- Order uniqueness enforced: cannot have duplicate (project_id, order_index) pairs
- RLS policies allow scene access only via project ownership

---

### T004: Create Supabase migration for `subtitle_presets` table with seed data

**Files**: `supabase/migrations/20250102_create_subtitle_presets_table.sql`, `supabase/seeds/subtitle_presets_seed.sql`

**Actions**:
1. Run `supabase migration new create_subtitle_presets_table`
2. Write migration SQL:
   - Create `subtitle_presets` table with columns: `id` (INTEGER PK), `name`, `description`, `config` (JSONB)
   - Add unique constraint: `UNIQUE(name)`
   - Enable RLS: allow all users to SELECT (read-only reference data)
3. Create seed file: `supabase/seeds/subtitle_presets_seed.sql`
   - Insert 3 presets: Minimal, Highlight, Karaoke (from data-model.md)
   - Each preset has `config` JSONB with font size, color, position, animation settings
4. Run `supabase db reset` to apply migration and seed data

**Validation**:
- 3 subtitle presets exist in database
- Config JSONB is valid JSON
- All users can query presets (RLS policy allows SELECT)

---

### T005: Create TypeScript types in `src/types/editor.ts`

**File**: `src/types/editor.ts`

**Actions**:
1. Create new file `src/types/editor.ts`
2. Export interfaces matching data model:
   - `Project`: id, user_id, title, topic, platform, video_type, target_duration, status, current_script_version, storyboard_script_version, voice_id, created_at, updated_at
   - `Script`: id, project_id, version, content, source, created_at
   - `Scene`: id, project_id, order_index, narration_text, duration_sec_draft, duration_sec_final, primary_keyword, subtitle_style_preset_id, created_at, updated_at
   - `SubtitlePreset`: id, name, description, config
3. Use exact type names from data-model.md (e.g., platform is union type `'shorts' | 'tiktok' | 'reels'`)
4. Add JSDoc comments for documentation
5. Export types: `export type { Project, Script, Scene, SubtitlePreset }`

**Validation**:
- TypeScript compiles without errors
- Types match database schema exactly (column names, types, constraints)
- Import types in test file and verify no errors

---

### T006: Create Zod validators in `src/server/validators/editor-validators.ts`

**File**: `src/server/validators/editor-validators.ts`

**Actions**:
1. Create new file `src/server/validators/editor-validators.ts`
2. Import Zod: `import { z } from 'zod'`
3. Create schemas following data-model.md validation rules:
   - `createProjectSchema`: topic (min 10, max 500), platform (enum), video_type (enum), target_duration (enum [15, 30, 60])
   - `updateProjectSchema`: all fields optional
   - `generateScriptSchema`: project_id (UUID)
   - `createScriptSchema`: project_id (UUID), content (min 50), source (enum)
   - `updateScriptSchema`: content (min 50, optional)
   - `createScenesSchema`: project_id (UUID), script_version (positive integer)
   - `updateSceneSchema`: narration_text (optional), duration_sec_draft (positive integer, optional), primary_keyword (non-empty string, optional), subtitle_style_preset_id (positive integer, optional), order_index (non-negative integer, optional)
   - `reorderScenesSchema`: scene_ids (array of UUIDs)
4. Export schemas
5. Test validation: create valid and invalid objects, parse with schemas, verify errors

**Validation**:
- All FR constraints from spec are enforced (min lengths, enum values, UUIDs)
- Zod schemas compile and export correctly
- Test invalid input (e.g., topic with 5 chars) fails validation

---

### T007: Extend Express router with `/api/v1/editor/*` endpoints scaffold

**File**: `src/server/routers/rest.ts` (extend existing file)

**Actions**:
1. Open existing `src/server/routers/rest.ts` (or create new `src/server/routers/editor-router.ts`)
2. Import auth middleware (create in T010 if not exists)
3. Create router: `const editorRouter = express.Router()`
4. Add route placeholders (implement full endpoints in later work packages):
   - `POST /api/v1/editor/projects` (create project)
   - `GET /api/v1/editor/projects` (list projects)
   - `GET /api/v1/editor/projects/:projectId` (get project)
   - `PATCH /api/v1/editor/projects/:projectId` (update project)
   - `DELETE /api/v1/editor/projects/:projectId` (delete project)
   - `POST /api/v1/editor/projects/:projectId/scripts/generate` (generate script)
   - `GET /api/v1/editor/projects/:projectId/scripts` (list scripts)
   - `POST /api/v1/editor/scripts` (create script)
   - `POST /api/v1/editor/scripts/:scriptId/edit/:operation` (quick edit)
   - `POST /api/v1/editor/scripts/:scriptId/restore` (restore version)
   - `POST /api/v1/editor/projects/:projectId/scenes/generate` (generate scenes)
   - `GET /api/v1/editor/projects/:projectId/scenes` (list scenes)
   - `DELETE /api/v1/editor/projects/:projectId/scenes` (delete scenes)
   - `PATCH /api/v1/editor/scenes/:sceneId` (update scene)
   - `POST /api/v1/editor/projects/:projectId/scenes/reorder` (reorder scenes)
5. Apply auth middleware to all routes: `editorRouter.use(authMiddleware)`
6. Mount router in main app: `app.use('/api/v1/editor', editorRouter)`
7. For now, return 501 Not Implemented from all routes (implement fully in WP1-WP4)

**Validation**:
- All routes are registered (use Postman or curl to test)
- Auth middleware blocks unauthenticated requests (returns 401)
- Routes return 501 with body `{ message: 'Not implemented yet' }`

---

### T008: Add frontend routes `/editor/new` and `/editor/:projectId` to React Router

**File**: `src/ui/router.tsx` (or equivalent routing config)

**Actions**:
1. Open existing React Router config (may be in `src/ui/App.tsx`, `src/ui/router.tsx`, or similar)
2. Import editor pages (create placeholder components if not exists):
   - `import EditorNew from './pages/EditorNew'`
   - `import EditorProject from './pages/EditorProject'`
3. Add routes:
   - `<Route path="/editor/new" element={<EditorNew />} />`
   - `<Route path="/editor/:projectId" element={<EditorProject />} />`
4. Ensure routes are nested under auth guard if app requires login
5. Test navigation: navigate to `/editor/new` and `/editor/123` (use uuid), verify pages render

**Validation**:
- Routes navigate without errors
- URL parameters accessible via `useParams()` hook
- Pages render placeholder content (e.g., "EditorNew Page" heading)

---

### T009: Create TanStack Query setup and API client in `src/ui/services/editor-api.ts`

**File**: `src/ui/services/editor-api.ts`

**Actions**:
1. Create new file `src/ui/services/editor-api.ts`
2. Set up axios or fetch API client:
   - Base URL: `import.meta.env.VITE_API_URL || 'http://localhost:3000'`
   - Auth header: get token from Supabase Auth, add `Authorization: Bearer ${token}`
3. Create API functions for each endpoint (return promises):
   - `createProject(data: CreateProjectDto): Promise<Project>`
   - `getProjects(): Promise<Project[]>`
   - `getProject(projectId: string): Promise<Project>`
   - `updateProject(projectId: string, data: UpdateProjectDto): Promise<Project>`
   - `deleteProject(projectId: string): Promise<void>`
   - `generateScript(projectId: string): Promise<Script>`
   - `getScripts(projectId: string): Promise<Script[]>`
   - `createScript(data: CreateScriptDto): Promise<Script>`
   - `updateScript(scriptId: string, data: UpdateScriptDto): Promise<Script>`
   - `restoreScript(scriptId: string): Promise<Script>`
   - `generateScenes(projectId: string): Promise<Scene[]>`
   - `getScenes(projectId: string): Promise<Scene[]>`
   - `deleteScenes(projectId: string): Promise<void>`
   - `updateScene(sceneId: string, data: UpdateSceneDto): Promise<Scene>`
   - `reorderScenes(projectId: string, sceneIds: string[]): Promise<void>`
4. Set up TanStack Query provider in App if not already configured
5. Export API client functions

**Validation**:
- API client functions are properly typed (match TypeScript types from T005)
- Auth header includes valid token (test with authenticated user)
- Base URL is correct (check env var or default)

---

### T010: Create Supabase auth middleware for backend routes

**File**: `src/server/middleware/supabase-auth.ts`

**Actions**:
1. Create new directory `src/server/middleware/` if not exists
2. Create file `src/server/middleware/supabase-auth.ts`
3. Implement auth middleware:
   - Extract `Authorization` header from request
   - Verify JWT token with Supabase: `const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
   - Call `supabaseClient.auth.getUser(token)` to validate token and get user
   - If invalid: return 401 Unauthorized
   - If valid: attach `user` object to `req.user` and call `next()`
4. Use environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
5. Export middleware function
6. Apply to editor router in T007: `editorRouter.use(supabaseAuthMiddleware)`

**Validation**:
- Unauthenticated request (no token) returns 401
- Invalid token returns 401
- Valid token sets `req.user` and allows request to proceed
- `req.user` contains user id and other auth claims

## Test Strategy

**Note**: Testing is not explicitly requested for Phase 1, but basic validation is recommended:

1. **Database validation**: After applying migrations, connect to local Supabase with `psql` and verify tables exist with `\d projects`, `\d scripts`, `\d scenes`
2. **RLS policy testing**: Create two test users, insert project as user A, attempt to select as user B (should fail)
3. **Route registration**: Use Postman or curl to test each endpoint (should return 501 for now)
4. **Frontend routing**: Open browser dev tools, navigate to `/editor/new` and `/editor/:projectId`, verify pages render without console errors
5. **Auth middleware**: Test endpoint with valid JWT (should pass) and without token (should return 401)

## Definition of Done

- [ ] All 4 Supabase migrations created and applied successfully (`projects`, `scripts`, `scenes`, `subtitle_presets`)
- [ ] RLS policies enabled and tested with multiple users
- [ ] Subtitle preset seed data inserted (3 presets)
- [ ] TypeScript types created and exported (`src/types/editor.ts`)
- [ ] Zod validators created and test with valid/invalid input
- [ ] Backend routes scaffolded with auth middleware (return 501)
- [ ] Frontend routes configured and navigate correctly
- [ ] TanStack Query provider set up (if not already)
- [ ] API client created with auth header handling
- [ ] No TypeScript compilation errors
- [ ] No console errors on frontend navigation
- [ ] Unauthenticated API requests return 401

## Risks

1. **RLS policy syntax errors**: Supabase RLS policies have specific syntax requirements. Test with `supabase db test` before applying.
2. **Foreign key cascades not working**: Verify with manual delete operations. If cascade fails, check foreign key constraints.
3. **Supabase Auth integration complexity**: JWT verification may require additional configuration. Refer to Supabase Auth docs.
4. **Type mismatches between database and TypeScript**: Ensure column names and types match exactly. Use `supabase db inspect` to verify schema.
5. **Environment variable configuration**: Ensure `SUPABASE_URL`, `SUPABASE_ANON_KEY` are set in `.env` for local development.

## Reviewer Guidance

When reviewing this work package, verify:

1. **Database schema**: Compare migration files with `data-model.md`. All tables, columns, constraints, indexes, and RLS policies must match exactly.
2. **TypeScript types**: Import types in a test file and verify no compilation errors. Check that union types match database CHECK constraints (e.g., `platform: 'shorts' | 'tiktok' | 'reels'`).
3. **Zod validators**: Test with invalid input (e.g., `topic: 'abc'` with 3 chars) and verify validation fails with appropriate error message.
4. **Auth middleware**: Test endpoint with valid and invalid JWT tokens. Verify 401 response for unauthenticated requests.
5. **Frontend routing**: Navigate to `/editor/new` and `/editor/:projectId` in browser. Check for console errors and verify pages render.
6. **API client**: Check that auth header is included in requests. Test with authenticated user and verify token is passed.

**Integration Check**: After WP0 is complete, subsequent work packages (WP1-WP5) should be able to:
- Query database tables via Supabase client
- Call backend API endpoints (scaffolded, full implementation in later WPs)
- Navigate to editor pages in frontend
- Use TypeScript types and Zod validators for type safety

## Activity Log

- 2026-01-02T14:20:26Z – claude – shell_pid=93384 – lane=doing – Started implementation of Foundation Setup
- 2026-01-02T15:16:28Z – claude – shell_pid=95292 – lane=for_review – Ready for review - Foundation Setup complete
