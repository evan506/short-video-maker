---
work_package_id: "WP00"
subtasks: ["T001", "T002", "T003", "T004", "T005", "T006", "T007", "T008", "T009", "T010"]
lane: "planned"
title: "Foundation Setup"
history:
  - timestamp: "2026-01-04T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
---

# Work Package: Foundation Setup

**ID**: WP00
**Title**: Foundation Setup (Database, Backend, Frontend Infrastructure)
**Priority**: P0 (Must complete first - all other work packages depend on this)
**Estimated Subtasks**: 10

## Objective

Establish the database schema (Supabase migrations with RLS), backend API scaffold (Express routes, validators, middleware), and frontend routing infrastructure (React Router, TanStack Query, API client). This foundation enables all subsequent feature work.

## Context

This work package creates the technical foundation for the entire Script & Storyboard Editor feature. Database tables store projects, scripts, scenes, and subtitle presets with proper security (RLS). Backend provides REST API endpoints with authentication and validation. Frontend establishes routing, state management, and API client integration.

**Key Requirements from Spec**:
- FR-047 to FR-055: Project persistence and data isolation
- Constitution Principle III (Test-Driven Quality): Database migrations must be version controlled
- Constitution Principle VIII (Security & Compliance): RLS policies enforce user data isolation

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (Key Entities section)
- Plan: `kitty-specs/001-script-storyboard-editor/plan.md` (Project Structure section)
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md` (database schema)

## Subtasks

### T001: Create Supabase migration for `projects` table with RLS policies

**File**: `supabase/migrations/20250102_create_projects_table.sql`

**Actions**:
1. Create new migration file: `supabase/migrations/20250102_create_projects_table.sql`
2. Define `projects` table schema:
   ```sql
   CREATE TABLE projects (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     topic TEXT NOT NULL,
     platform TEXT NOT NULL CHECK (platform IN ('shorts', 'tiktok', 'reels')),
     video_type TEXT NOT NULL CHECK (video_type IN ('Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story')),
     target_duration_seconds INTEGER NOT NULL CHECK (target_duration_seconds IN (15, 30, 60)),
     current_script_version INTEGER,
     storyboard_script_version INTEGER,
     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'done', 'failed')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
3. Create index on `user_id` for RLS performance: `CREATE INDEX idx_projects_user_id ON projects(user_id);`
4. Enable Row Level Security: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`
5. Create RLS policies:
   ```sql
   -- Users can only view their own projects
   CREATE POLICY "Users can view own projects"
     ON projects FOR SELECT
     USING (auth.uid() = user_id);

   -- Users can insert their own projects
   CREATE POLICY "Users can insert own projects"
     ON projects FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   -- Users can update their own projects
   CREATE POLICY "Users can update own projects"
     ON projects FOR UPDATE
     USING (auth.uid() = user_id);

   -- Users can delete their own projects
   CREATE POLICY "Users can delete own projects"
     ON projects FOR DELETE
     USING (auth.uid() = user_id);
   ```
6. Add trigger to auto-update `updated_at` timestamp

**Validation**:
- Migration applies successfully with `supabase db reset`
- Table created with all columns and constraints
- RLS policies enforced (test with multiple users)
- Index created on `user_id`

---

### T002: Create Supabase migration for `scripts` table with RLS policies

**File**: `supabase/migrations/20250102_create_scripts_table.sql`

**Actions**:
1. Create new migration file: `supabase/migrations/20250102_create_scripts_table.sql`
2. Define `scripts` table schema:
   ```sql
   CREATE TABLE scripts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     version INTEGER NOT NULL,
     content TEXT NOT NULL,
     source TEXT NOT NULL CHECK (source IN ('llm', 'user')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(project_id, version)
   );
   ```
3. Create indexes:
   - `CREATE INDEX idx_scripts_project_id ON scripts(project_id);`
   - `CREATE INDEX idx_scripts_project_version ON scripts(project_id, version DESC);`
4. Enable RLS and create policies (similar to projects table)
5. Add check constraint: `version >= 1`

**Validation**:
- Migration applies successfully
- Foreign key to projects enforced
- Unique constraint on (project_id, version) prevents duplicate versions
- RLS policies work correctly

---

### T003: Create Supabase migration for `scenes` table with RLS policies

**File**: `supabase/migrations/20250102_create_scenes_table.sql`

**Actions**:
1. Create new migration file: `supabase/migrations/20250102_create_scenes_table.sql`
2. Define `scenes` table schema:
   ```sql
   CREATE TABLE scenes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     order_index INTEGER NOT NULL,
     narration_text TEXT NOT NULL,
     duration_sec_draft INTEGER NOT NULL,
     duration_sec_final INTEGER,
     primary_keyword TEXT NOT NULL,
     subtitle_style_preset_id TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
3. Create indexes:
   - `CREATE INDEX idx_scenes_project_id ON scenes(project_id);`
   - `CREATE INDEX idx_scenes_project_order ON scenes(project_id, order_index ASC);`
4. Enable RLS and create policies
5. Add check constraint: `duration_sec_draft >= 1`

**Validation**:
- Migration applies successfully
- Foreign key to projects enforced
- Order index is unique per project (add unique constraint if needed)
- RLS policies work correctly

---

### T004: Create Supabase migration for `subtitle_presets` table with seed data

**Files**:
- `supabase/migrations/20250102_create_subtitle_presets_table.sql`
- `supabase/seeds/subtitle_presets_seed.sql`

**Actions**:
1. Create migration for `subtitle_presets` table:
   ```sql
   CREATE TABLE subtitle_presets (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```
2. Create seed file with initial presets:
   ```sql
   -- supabase/seeds/subtitle_presets_seed.sql
   INSERT INTO subtitle_presets (id, name, description) VALUES
     ('minimal', 'Minimal', 'Simple static text at bottom with no background'),
     ('highlight', 'Highlight', 'Static text with semi-transparent background box'),
     ('karaoke', 'Karaoke', 'Visual-only word-by-word highlighting');
   ```
3. No RLS needed (subtitle_presets is shared global data)
4. Apply seed data after migration

**Validation**:
- Migration applies successfully
- Seed data inserts 3 presets
- Presets queryable from API

---

### T005: Create TypeScript types in `src/types/editor.ts`

**File**: `src/types/editor.ts`

**Actions**:
1. Create new file `src/types/editor.ts`
2. Define TypeScript interfaces matching database schema:
   ```typescript
   export interface Project {
     id: string;
     user_id: string;
     title: string;
     topic: string;
     platform: 'shorts' | 'tiktok' | 'reels';
     video_type: 'Explainer' | 'Marketing' | 'Tutorial' | 'Recipe' | 'Story';
     target_duration_seconds: 15 | 30 | 60;
     current_script_version: number | null;
     storyboard_script_version: number | null;
     status: 'draft' | 'rendering' | 'done' | 'failed';
     created_at: string;
     updated_at: string;
   }

   export interface Script {
     id: string;
     project_id: string;
     version: number;
     content: string;
     source: 'llm' | 'user';
     created_at: string;
   }

   export interface Scene {
     id: string;
     project_id: string;
     order_index: number;
     narration_text: string;
     duration_sec_draft: number;
     duration_sec_final: number | null;
     primary_keyword: string;
     subtitle_style_preset_id: string | null;
     created_at: string;
     updated_at: string;
   }

   export interface SubtitlePreset {
     id: string;
     name: string;
     description: string;
     created_at: string;
   }
   ```
3. Export types for use in components and services

**Validation**:
- No TypeScript errors
- Types match database schema exactly
- Enums match database CHECK constraints

---

### T006: Create Zod validators in `src/server/validators/editor-validators.ts`

**File**: `src/server/validators/editor-validators.ts`

**Actions**:
1. Create new file `src/server/validators/editor-validators.ts`
2. Define Zod schemas for all API inputs:
   ```typescript
   import { z } from 'zod';

   export const createProjectSchema = z.object({
     title: z.string().min(1).max(200),
     topic: z.string().min(10).max(500),
     platform: z.enum(['shorts', 'tiktok', 'reels']),
     video_type: z.enum(['Explainer', 'Marketing', 'Tutorial', 'Recipe', 'Story']),
     target_duration_seconds: z.enum([15, 30, 60]),
   });

   export const updateProjectSchema = z.object({
     title: z.string().min(1).max(200).optional(),
     // ... other optional fields
   });

   export const createScriptSchema = z.object({
     project_id: z.string().uuid(),
     content: z.string().min(50),
     source: z.enum(['llm', 'user']),
   });

   export const updateSceneSchema = z.object({
     duration_sec_draft: z.number().int().min(1),
     primary_keyword: z.string().min(1),
     subtitle_style_preset_id: z.string().nullable(),
   });
   ```
3. Export all schemas for use in route handlers

**Validation**:
- Zod schemas validate correctly
- Invalid inputs rejected with clear error messages
- Valid inputs pass validation

---

### T007: Extend Express router with `/api/v1/editor/*` endpoints scaffold

**File**: `src/server/routers/rest.ts` or `src/server/routers/editor-router.ts`

**Actions**:
1. Create new router file `src/server/routers/editor-router.ts` (if separate)
2. Define router base path: `/api/v1/editor`
3. Create scaffold routes (return 501 Not Implemented for now):
   - `GET /api/v1/editor/projects` (list projects)
   - `POST /api/v1/editor/projects` (create project)
   - `GET /api/v1/editor/projects/:projectId` (get project)
   - `PATCH /api/v1/editor/projects/:projectId` (update project)
   - `DELETE /api/v1/editor/projects/:projectId` (delete project - Phase 2)
   - `GET /api/v1/editor/projects/:projectId/scripts` (list scripts)
   - `POST /api/v1/editor/projects/:projectId/scripts/generate` (generate script)
   - `POST /api/v1/editor/scripts` (create script version)
   - `GET /api/v1/editor/projects/:projectId/scenes` (list scenes)
   - `POST /api/v1/editor/projects/:projectId/scenes/generate` (generate scenes)
4. Register router in `src/server/server.ts`:
   ```typescript
   import editorRouter from './routers/editor-router';
   app.use('/api/v1/editor', editorRouter);
   ```

**Validation**:
- All scaffold routes return 501 with message "Not implemented yet"
- Router registered successfully in Express app
- Routes accessible with correct paths

---

### T008: Add frontend routes `/editor/new` and `/editor/:projectId` to React Router

**File**: `src/ui/router.tsx` or `src/ui/App.tsx`

**Actions**:
1. Locate React Router configuration (likely in `src/ui/router.tsx` or `src/ui/App.tsx`)
2. Add new routes:
   ```typescript
   import { EditorNew } from './pages/EditorNew';
   import { EditorProject } from './pages/EditorProject';

   // In routes configuration:
   <Route path="/editor/new" element={<EditorNew />} />
   <Route path="/editor/:projectId" element={<EditorProject />} />
   ```
3. Create placeholder components (T061, T062 will implement fully):
   ```typescript
   // src/ui/pages/EditorNew.tsx
   export function EditorNew() {
     return <div>Editor New - Create Project (TODO)</div>;
   }

   // src/ui/pages/EditorProject.tsx
   export function EditorProject() {
     return <div>Editor Project - Edit Project (TODO)</div>;
   }
   ```
4. Test navigation to `/editor/new` and `/editor/123`

**Validation**:
- Routes navigate correctly in browser
- URL params (projectId) accessible via useParams()
- Placeholder components render without errors

---

### T009: Create TanStack Query setup and API client in `src/ui/services/editor-api.ts`

**File**: `src/ui/services/editor-api.ts`

**Actions**:
1. Create new file `src/ui/services/editor-api.ts`
2. Set up axios or fetch instance with base URL and auth:
   ```typescript
   import axios from 'axios';

   const apiClient = axios.create({
     baseURL: process.env.VITE_API_URL || 'http://localhost:3000',
     timeout: 120000, // 2 minutes for LLM operations
   });

   // Add auth header (Supabase token)
   apiClient.interceptors.request.use(async (config) => {
     const session = await supabase.auth.getSession();
     if (session.data.session) {
       config.headers.Authorization = `Bearer ${session.data.session.access_token}`;
     }
     return config;
   });

   // API client functions
   export const editorApi = {
     // Projects
     getProjects: () => apiClient.get('/api/v1/editor/projects'),
     createProject: (data) => apiClient.post('/api/v1/editor/projects', data),
     getProject: (projectId) => apiClient.get(`/api/v1/editor/projects/${projectId}`),
     updateProject: (projectId, data) => apiClient.patch(`/api/v1/editor/projects/${projectId}`, data),

     // Scripts
     getScripts: (projectId) => apiClient.get(`/api/v1/editor/projects/${projectId}/scripts`),
     generateScript: (projectId, data) => apiClient.post(`/api/v1/editor/projects/${projectId}/scripts/generate`, data),

     // Scenes
     getScenes: (projectId) => apiClient.get(`/api/v1/editor/projects/${projectId}/scenes`),
     generateScenes: (projectId) => apiClient.post(`/api/v1/editor/projects/${projectId}/scenes/generate`),
   };
   ```
3. Set up TanStack Query client provider in app root (if not already set up)

**Validation**:
- API client configured with correct base URL
- Auth header added to requests
- All API functions defined
- TanStack Query provider wraps app

---

### T010: Create Supabase auth middleware for backend routes

**File**: `src/server/middleware/supabase-auth.ts`

**Actions**:
1. Create new file `src/server/middleware/supabase-auth.ts`
2. Implement auth middleware:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { Request, Response, NextFunction } from 'express';

   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_ANON_KEY!
   );

   export interface AuthRequest extends Request {
     user?: { id: string };
   }

   export async function supabaseAuth(
     req: AuthRequest,
     res: Response,
     next: NextFunction
   ) {
     const authHeader = req.headers.authorization;
     if (!authHeader) {
       return res.status(401).json({ error: 'Missing authorization header' });
     }

     const token = authHeader.replace('Bearer ', '');
     const { data, error } = await supabase.auth.getUser(token);

     if (error || !data.user) {
       return res.status(401).json({ error: 'Invalid token' });
     }

     req.user = { id: data.user.id };
     next();
   }
   ```
3. Apply middleware to all editor routes:
   ```typescript
   import { supabaseAuth } from '../middleware/supabase-auth';
   router.use(supabaseAuth); // Protect all routes
   ```

**Validation**:
- Unauthenticated requests return 401
- Authenticated requests pass through with `req.user.id` set
- Invalid tokens rejected

## Test Strategy

**Manual Testing**:
1. Run `supabase db reset` to apply all migrations
2. Verify tables created in Supabase dashboard
3. Test RLS policies with two Supabase users
4. Navigate to `/editor/new` and `/editor/123` in browser
5. Test auth middleware with valid/invalid tokens

**Integration Testing**:
1. Test migration rollback and re-apply
2. Test foreign key cascades (delete project → scripts/scenes deleted)
3. Test auth middleware with expired tokens

## Definition of Done

- [ ] All 10 subtasks completed
- [ ] All 4 database migrations applied successfully (projects, scripts, scenes, subtitle_presets)
- [ ] RLS policies enforce user data isolation (verified with multiple test users)
- [ ] TypeScript types defined and match database schema
- [ ] Zod validators validate API inputs correctly
- [ ] Express router scaffolded with all `/api/v1/editor/*` routes
- [ ] Frontend routes navigate to `/editor/new` and `/editor/:projectId`
- [ ] TanStack Query client configured with auth
- [ ] API client defined for all editor endpoints
- [ ] Supabase auth middleware protects backend routes
- [ ] No TypeScript errors
- [ ] No migration failures

## Risks

1. **Migration ordering**: `subtitle_presets` must be created before `scenes` (foreign key dependency). Ensure migrations run in correct order.
2. **RLS policy conflicts**: Overly restrictive policies may block legitimate access. Test thoroughly with multiple users.
3. **Supabase Auth integration**: Middleware must correctly extract user ID from JWT. Test with real Supabase tokens.
4. **Type drift**: TypeScript types must stay in sync with database schema. Regenerate types after schema changes.

## Reviewer Guidance

When reviewing this work package, verify:

1. **Database schema**: Check all tables have correct columns, constraints, and foreign keys. Verify in Supabase dashboard.
2. **RLS policies**: Test with two users, verify user A cannot access user B's data. Use `supabase db test` if available.
3. **Migration ordering**: Verify migrations apply in order without conflicts. Test `supabase db reset`.
4. **TypeScript types**: Ensure interfaces match database schema exactly (column names, types, nullable fields).
5. **Zod validators**: Test with valid and invalid inputs. Verify error messages are clear.
6. **Router scaffold**: Verify all routes return 501 with "Not implemented yet" message.
7. **Frontend routes**: Navigate in browser, verify routes work and URL params are accessible.
8. **API client**: Check base URL is correct, auth header added to requests.
9. **Auth middleware**: Test with valid/missing/invalid tokens. Verify `req.user.id` set correctly.
10. **Foreign key cascades**: Delete a project, verify scripts and scenes are cascade deleted.

**Integration Check**: After WP00 is complete, the technical foundation should be ready for feature implementation. All routes protected by auth, database enforces user isolation, and frontend can communicate with backend.

**Next Steps**: WP00 unblocks all other work packages. After WP00 completes, WP1 (Script Generation) and WP2 (Scene Generation) can proceed in parallel.
