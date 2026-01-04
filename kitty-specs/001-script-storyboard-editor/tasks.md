# Implementation Tasks: Script & Storyboard Editor

**Feature**: 001-script-storyboard-editor
**Phase**: 1 (Script & Storyboard Editor)
**Date**: 2026-01-02
**Status**: Ready for Implementation

This document decomposes the Script & Storyboard Editor feature into concrete work packages with actionable subtasks. Each work package is independently implementable and testable.

---

## Work Package 0: Foundation Setup

**Goal**: Establish database schema, backend scaffold, and frontend routing infrastructure

**Priority**: P0 (Must complete first - all other packages depend on this)

**Independent Test**: Verify database tables exist with RLS policies, backend routes return 401 without auth, frontend routes navigate correctly

**Included Subtasks**:
- [ ] T001: Create Supabase migration for `projects` table with RLS policies
- [ ] T002: Create Supabase migration for `scripts` table with RLS policies
- [ ] T003: Create Supabase migration for `scenes` table with RLS policies
- [ ] T004: Create Supabase migration for `subtitle_presets` table with seed data
- [ ] T005: Create TypeScript types in `src/types/editor.ts`
- [ ] T006: Create Zod validators in `src/server/validators/editor-validators.ts`
- [ ] T007: Extend Express router with `/api/v1/editor/*` endpoints scaffold
- [ ] T008: Add frontend routes `/editor/new` and `/editor/:projectId` to React Router
- [ ] T009: Create TanStack Query setup and API client in `src/ui/services/editor-api.ts`
- [ ] T010: Create Supabase auth middleware for backend routes

**Implementation Sketch**:
1. Run `supabase migration new` for each table, write SQL schema per data-model.md
2. Apply migrations locally with `supabase db reset`, verify tables with `supabase db inspect`
3. Generate TypeScript types from schema (or write manually matching data-model.md)
4. Create Zod schemas matching validation rules in spec (FR-001 to FR-063)
5. Extend `src/server/routers/rest.ts` with new router, add auth middleware
6. Update React Router config in `src/ui/router.tsx` (or equivalent)
7. Create API client with axios/fetch, add base URL and auth header handling
8. Test RLS policies by attempting cross-user data access (should fail)

**Parallel Opportunities**: None (must complete sequentially)

**Dependencies**:
- Requires: Supabase CLI installed, local Supabase running
- Blocks: All subsequent work packages

**Risks**:
- RLS policies may have syntax errors - test with `supabase db test`
- Foreign key cascades may not work as expected - verify with manual delete operations
- Supabase Auth integration may require additional configuration beyond RLS

---

## Work Package 1: Script Generation & Editing (User Story 1 & 2)

**Goal**: Enable creators to generate scripts from topics and refine them with quick-edit tools

**Priority**: P1 (Core value proposition #1)

**Phase 1 Scope Note**: This work package implements synchronous LLM APIs. Per FR-007, UI shows loading spinners (not progress bars) during generation. Real-time progress tracking is deferred to Phase 2 with async job queues.

**Independent Test**: User enters topic, generates script in <60s, applies quick-edit (Shorten), and verifies new version created

**Included Subtasks**:
- [ ] T011: Create `src/server/services/llm-service.ts` with OpenRouter API integration
- [ ] T012: Implement script generation prompt template (topic → narration script)
- [ ] T013: Implement prompt templates for quick-edit operations (Shorten, Lengthen, Rephrase, Change Tone)
- [ ] T014: Create `POST /api/v1/editor/projects/:projectId/scripts/generate` endpoint
- [ ] T015: Create `POST /api/v1/editor/scripts/:scriptId/edit/{operation}` endpoints
- [ ] T016: Create `POST /api/v1/editor/scripts` endpoint (manual save/new version)
- [ ] T017: Create `GET /api/v1/editor/projects/:projectId/scripts` endpoint (version history)
- [ ] T018: Create `POST /api/v1/editor/scripts/:scriptId/restore` endpoint
- [ ] T019: Create `src/ui/components/editor/ScriptEditor.tsx` component
- [ ] T020: Implement topic input form with platform/duration/type selectors
- [ ] T021: Implement script display area with version history sidebar
- [ ] T022: Implement quick-edit buttons (Shorten, Lengthen, Rephrase, Change Tone) with preview modal
- [ ] T023: Implement manual script editing textarea with version comparison
- [ ] T024: Implement loading states for LLM operations (spinners, progress indicators)
- [ ] T025: Implement error handling with retry buttons and user-friendly messages
- [ ] T026: Create `src/ui/hooks/use-script.ts` for script CRUD operations
- [ ] T027: Add "Go to Storyboard" CTA button after script applied

**Implementation Sketch**:
1. Implement OpenRouter API client in llm-service.ts with timeout (60s) and retry logic (3 attempts)
2. Design prompt templates with clear instructions for LLM (include platform, duration, video type context)
3. Create REST endpoints following OpenAPI contract (contracts/openapi.yaml)
4. Implement script versioning logic in script-service.ts: increment version number, track source (llm/user), store all versions
5. Build ScriptEditor component with Material-UI (TextField, Select, Button, Dialog, LoadingButton)
6. Implement quick-edit flow: click button → generate preview → show modal → user confirms → save new version
7. Add optimistic updates with TanStack Query for immediate UI feedback
8. Test with real OpenRouter API (configure OPENROUTER_API_KEY in .env)

**Parallel Opportunities**:
- [P] T011-T013 (LLM service and prompts) can be developed in parallel with T019-T022 (UI components)
- [P] T014-T018 (API endpoints) can be developed in parallel with T026 (React hooks)

**Dependencies**:
- Requires: WP0 (database schema, backend scaffold, frontend routes)
- Blocks: WP2 (scene generation depends on script existence)

**Risks**:
- OpenRouter API may be slow or rate-limited - implement timeout and graceful degradation
- LLM output quality may vary - provide user feedback mechanism (regenerate option)
- Script version conflicts if multiple edits happen quickly - use database transactions or version locking

---

## Work Package 2: Scene Generation & Management (User Story 3)

**Goal**: Automatically split scripts into scenes and enable one-time generation with version tracking

**Priority**: P1 (Required for storyboard functionality)

**Phase 1 Scope Note**: This work package implements synchronous scene generation APIs. No async job queues, render_jobs tables, or background workers are created in Phase 1 (those are Phase 2 only per FR-056-FR-063).

**Independent Test**: User generates script, clicks "Go to Storyboard", verifies 10-15 scenes created with proper narration/duration/keywords, reloads page and confirms scenes persist (one-time generation)

**Included Subtasks**:
- [ ] T028: Create `src/lib/scene-utils.ts` with sentence tokenization utility
- [ ] T029: Implement scene splitting algorithm (group sentences into 2-6 second scenes)
- [ ] T030: Implement keyword extraction from scene narration (simple NLP)
- [ ] T031: Implement scene merging algorithm (greedy merge if >20 scenes)
- [ ] T032: Create `src/server/services/scene-service.ts` with scene generation logic
- [ ] T033: Create `POST /api/v1/editor/projects/:projectId/scenes/generate` endpoint
- [ ] T034: Create `GET /api/v1/editor/projects/:projectId/scenes` endpoint
- [ ] T035: Create `DELETE /api/v1/editor/projects/:projectId/scenes` endpoint (regenerate)
- [ ] T036: Update `PATCH /api/v1/editor/projects/:projectId` to set `storyboard_script_version`
- [ ] T037: Create `src/ui/components/editor/StoryboardView.tsx` component
- [ ] T038: Implement scene grid layout with SceneCard components
- [ ] T039: Implement version mismatch detection and warning banner
- [ ] T040: Implement "Regenerate scenes" confirmation dialog with warning
- [ ] T041: Implement one-time generation logic (check if scenes exist before generating)
- [ ] T042: Create `src/ui/hooks/use-scenes.ts` for scene CRUD operations

**Implementation Sketch**:
1. Implement sentence tokenizer (regex-based or lightweight NLP library)
2. Calculate word count per scene, estimate duration (2.5 words/second), target 2-6 seconds
3. Extract primary keyword from narration (first noun phrase or most frequent noun)
4. Implement greedy merge: find adjacent scenes with minimum combined duration, merge until ≤20 scenes
5. Create scene generation endpoint that reads latest script version, calls scene-service.ts, saves scenes to DB
6. Set `project.storyboard_script_version = project.current_script_version` when scenes generated
7. Implement one-time check: if scenes exist for project, return existing scenes instead of regenerating
8. Build StoryboardView component with Material-UI Grid for scene cards
9. Detect version mismatch: if `project.current_script_version !== project.storyboard_script_version`, show warning banner
10. Add "Regenerate scenes" button with confirmation warning (warns about overwriting manual edits)

**Parallel Opportunities**:
- [P] T028-T031 (scene algorithms) can be developed in parallel with T037-T038 (UI components)
- [P] T032 (scene service) can be developed in parallel with T042 (React hooks)

**Dependencies**:
- Requires: WP0 (database schema), WP1 (script generation)
- Blocks: WP3 (scene editing depends on scene generation)

**Risks**:
- Scene splitting may produce awkward boundaries - test with various script lengths
- Auto-merge may create scenes >15 seconds - acceptable per spec but may need UX guidance
- Version mismatch detection may be confusing - add clear messaging and help text
- Keyword extraction quality may vary - provide fallback to project topic if extraction fails

---

## Work Package 3: Scene Editing UI (User Story 4)

**Goal**: Enable creators to edit individual scene cards (duration, keywords, subtitle presets) and reorder scenes

**Priority**: P2 (Core value proposition #2)

**Independent Test**: User clicks scene card, changes duration from 5s to 7s, verifies save confirmation, refreshes page and confirms change persists, drags scene to new position and verifies reorder

**Included Subtasks**:
- [ ] T043: Create `src/ui/components/editor/SceneCard.tsx` component
- [ ] T044: Implement `src/ui/components/editor/SceneEditDialog.tsx` modal
- [ ] T045: Create `PATCH /api/v1/editor/scenes/:sceneId` endpoint (single scene update)
- [ ] T046: Create `PATCH /api/v1/editor/scenes/batch` endpoint (bulk update, "Apply to all")
- [ ] T047: Create `POST /api/v1/editor/projects/:projectId/scenes/reorder` endpoint
- [ ] T048: Implement duration editing with validation (min 1 second)
- [ ] T049: Implement keyword editing with visual confirmation (checkmark)
- [ ] T050: Implement subtitle preset selector (Minimal, Highlight, Karaoke). **Note**: Per FR-039, presets are: Minimal (static text at bottom), Highlight (static text with background box), Karaoke (visual-only word-by-word highlighting, functional TTS-sync deferred to Phase 2)
- [ ] T051: Implement "Apply to all scenes" button for subtitle presets
- [ ] T052: Implement scene drag-and-drop reordering (@dnd-kit or react-beautiful-dnd)
- [ ] T053: Add optimistic updates for scene edits (immediate UI feedback)
- [ ] T054: Implement visual save confirmation (checkmark icon, toast notification)
- [ ] T055: Add scene thumbnail placeholder (colored box or generic icon)

**Implementation Sketch**:
1. Build SceneCard component with Material-UI Card: thumbnail placeholder, narration text, duration badge, keyword tag, subtitle preset icon
2. Click card → open SceneEditDialog (Dialog component with form fields)
3. Implement form with: duration TextField (number input), keyword TextField, subtitle preset Select, "Apply" button
4. Add validation: duration must be ≥1 second, keyword cannot be empty
5. Call PATCH endpoint on form submit, show loading state during API call
6. On success, show checkmark icon or toast notification, update TanStack Query cache
7. For "Apply to all", call batch update endpoint with scene preset ID, update all scenes in cache
8. Implement drag-and-drop: use @dnd-kit, on drag end call reorder endpoint with new scene ID order
9. Backend reorder endpoint updates `order_index` for all scenes (0-based sequential)

**Parallel Opportunities**:
- [P] T043-T044 (UI components) can be developed in parallel with T045-T047 (API endpoints)
- [P] T048-T051 (form fields) can be developed in parallel with T052 (drag-and-drop)

**Dependencies**:
- Requires: WP0 (database schema), WP2 (scene generation)
- Blocks: None (independent feature)

**Risks**:
- Drag-and-drop library compatibility with React 19 - test @dnd-kit or react-beautiful-dnd
- Optimistic updates may conflict with server state - implement proper cache invalidation
- Concurrent edits by multiple users (unlikely but possible) - consider conflict detection or last-write-wins
- Scene reordering may create gaps in order_index - backend must reindex all scenes

---

## Work Package 4: Project Management & Persistence (User Story 5)

**Goal**: Enable creators to create projects, save all work across sessions, and reload from dashboard

**Priority**: P2 (Required for real-world usage)

**Phase 1 MVP Note**: Phase 1 MVP excludes deletion (T060), non-draft status indicators (T065), and deletion confirmation (T069). These are deferred to Phase 2/1.1. Optional deferral: T068 (title auto-generation) if it slows down implementation.

**Independent Test**: User creates project, generates script, creates scenes, closes browser, reopens, navigates to dashboard, clicks project, verifies all data loads correctly

**Included Subtasks**:
- [ ] T056: Create `POST /api/v1/editor/projects` endpoint (create new project)
- [ ] T057: Create `GET /api/v1/editor/projects` endpoint (list user's projects)
- [ ] T058: Create `GET /api/v1/editor/projects/:projectId` endpoint (load single project)
- [ ] T059: Create `PATCH /api/v1/editor/projects/:projectId` endpoint (update project metadata)
- [ ] T060: Create `DELETE /api/v1/editor/projects/:projectId` endpoint (delete project) **(Deferred to Phase 2/1.1)**
- [ ] T061: Create `src/ui/pages/EditorNew.tsx` component (create project page)
- [ ] T062: Create `src/ui/pages/EditorProject.tsx` component (edit project page)
- [ ] T063: Create `src/ui/components/editor/ProjectDashboard.tsx` component
- [ ] T064: Implement project list view with sorting by "last modified"
- [ ] T065: Implement project status indicators (draft/rendering/done/failed) **(Deferred to Phase 2/1.1)**
- [ ] T066: Implement project reload from dashboard (navigation to `/editor/:projectId`)
- [ ] T067: Add "New Project" button in dashboard
- [ ] T068: Implement project title auto-generation from topic **(Optional - defer to Phase 2/1.1 if it slows down)**
- [ ] T069: Add project deletion confirmation dialog **(Deferred to Phase 2/1.1)**
- [ ] T070: Create `src/ui/hooks/use-project.ts` for project CRUD operations

**Implementation Sketch**:
1. Create project CRUD endpoints following OpenAPI contract
2. Implement project creation with validation (topic min 10 chars, platform/type/duration required)
3. Auto-generate title from topic (first 50 chars or user-defined)
4. Set initial status="draft", `current_script_version=null`, `storyboard_script_version=null`
5. List endpoint returns all user's projects sorted by `updated_at` DESC, enforces RLS (user_id = auth.uid())
6. Load endpoint returns project with latest script version and all scenes
7. Build EditorNew page: topic input form, platform/duration/type selectors, "Create" button, redirects to EditorProject on success
8. Build EditorProject page: tabbed interface (Script tab, Storyboard tab), loads project data on mount
9. Build ProjectDashboard component: Material-UI Table or Grid with project cards, status badges, "Open" buttons
10. Add navigation between dashboard and editor pages using React Router
11. Test data persistence: create project, make changes, close browser, reopen, verify all data present

**Parallel Opportunities**:
- [P] T056-T060 (API endpoints) can be developed in parallel with T061-T069 (UI components)
- [P] T063-T064 (dashboard UI) can be developed in parallel with T061-T062 (editor pages)

**Dependencies**:
- Requires: WP0 (database schema, auth), WP1 (script functionality), WP2 (scene functionality), WP3 (scene editing)
- Blocks: None (completes core feature set)

**Risks**:
- RLS policies may not enforce user isolation properly - test with multiple test accounts
- Project reload may be slow with large scripts/scenes - optimize query performance, add pagination if needed
- Deleted projects may leave orphaned scripts/scenes - verify cascading deletes work correctly
- Concurrent edits may cause conflicts - consider optimistic locking or last-write-wins

---

## Work Package 5: Integration, Testing & Polish

**Goal**: Integrate all components, write comprehensive tests, fix bugs, and prepare for production

**Priority**: P1 (Required for feature completion)

**Independent Test**: All E2E tests pass, contract tests verify OpenRouter integration, RLS policies enforced, no console errors, UI responsive and accessible

**Included Subtasks**:
- [ ] T071: Write unit tests for scene-utils.ts (scene splitting, merging, keyword extraction)
- [ ] T072: Write unit tests for script-service.ts (versioning logic)
- [ ] T073: Write integration tests for script generation API (with mocked OpenRouter)
- [ ] T074: Write integration tests for scene generation API (with real script data)
- [ ] T075: Write contract tests for OpenRouter API (mock with Nock)
- [ ] T076: Write E2E test for happy path: topic → script → storyboard → edit scenes (Playwright)
- [ ] T077: Write E2E test for script quick-edit flow (Playwright)
- [ ] T078: Write E2E test for scene reordering (Playwright)
- [ ] T079: Write E2E test for project reload and persistence (Playwright)
- [ ] T080: Test RLS policies with multiple user accounts (integration test)
- [ ] T081: Fix critical bugs found during testing
- [ ] T082: Add loading states for all async operations
- [ ] T083: Add error boundaries and graceful error handling
- [ ] T084: Improve accessibility (ARIA labels, keyboard navigation, screen reader support)
- [ ] T085: Add responsive design tweaks (mobile layout adjustments)
- [ ] T086: Performance optimization (lazy loading, code splitting, query optimization)
- [ ] T087: Update quickstart.md with developer onboarding instructions
- [ ] T088: Verify API contracts match implementation (OpenAPI spec validation)
- [ ] T089: Clean up console logs and debug statements
- [ ] T090: Final code review and refactoring

**Implementation Sketch**:
1. Set up Vitest for unit tests, use describe/it/assert pattern
2. Test scene splitting with various script lengths (15s, 30s, 60s)
3. Test scene merging with edge cases (1 scene, 25 scenes, etc.)
4. Mock OpenRouter API with Nock for contract tests, verify request format and response parsing
5. Write Playwright E2E tests: create test account, login, perform full workflow, verify results
6. Test RLS by creating two test users, verify user A cannot access user B's projects
7. Add Material-UI CircularProgress or LoadingButton for all async operations
8. Add React Error Boundary component to catch and display errors gracefully
9. Add ARIA labels to all interactive elements, test keyboard navigation (Tab, Enter, Escape)
10. Test on mobile viewport (375px width), adjust layouts if needed
11. Use React.lazy() for code splitting editor pages
12. Optimize database queries (add indexes, avoid N+1 queries)
13. Update quickstart.md with: local setup steps, environment variables, how to run migrations, how to run tests
14. Validate OpenAPI spec against implementation using validator tool
15. Remove console.log, add proper logging if needed (winston or pino)
16. Perform final code review: check TypeScript strict mode compliance, ESLint rules, Prettier formatting

**Parallel Opportunities**:
- [P] T071-T075 (unit/integration/contract tests) can be developed in parallel with T076-T079 (E2E tests)
- [P] T082-T086 (polish tasks) can be done in parallel by different developers
- [P] T087-T088 (documentation) can be done in parallel with T089-T090 (cleanup)

**Dependencies**:
- Requires: WP1, WP2, WP3, WP4 (all features complete)
- Blocks: None (final work package)

**Risks**:
- E2E tests may be flaky due to timing issues - add proper waits and assertions
- OpenRouter contract tests may fail if API changes - update mocks accordingly
- RLS policy testing may reveal security issues - fix before production
- Performance issues may require architecture changes - unlikely for Phase 1 scope
- Browser compatibility issues - test on Chrome, Firefox, Safari

---

## Summary Statistics

**Total Work Packages**: 6
**Total Subtasks**: 90

**Subtasks per Work Package**:
- WP0 (Foundation): 10 subtasks
- WP1 (Script Gen): 17 subtasks
- WP2 (Scene Gen): 15 subtasks
- WP3 (Scene Edit): 13 subtasks
- WP4 (Project Mgmt): 15 subtasks
- WP5 (Integration): 20 subtasks

**Parallelization Highlights**:
- WP1 and WP2 can be developed **in parallel** after WP0 completes (script and scene logic are independent)
- WP3 can start **immediately after** WP2 completes (scene editing depends on scene generation)
- WP4 requires WP1, WP2, WP3 to complete (depends on all features)
- Maximum parallelism: 3 developers can work on WP1, WP2, WP4 simultaneously after WP0

**MVP Scope Recommendation**: WP0 + WP1 + WP2 (enables full happy path: topic → script → storyboard)

**Next Suggested Commands**:
1. `/spec-kitty.analyze` - Review tasks.md for cross-artifact consistency
2. `/spec-kitty.implement` - Execute implementation plan by processing work packages in order

---

**Tasks Generated By**: Claude (AI Task Generation Agent)
**Tasks Date**: 2026-01-02
**Next Action**: Review tasks, then run `/spec-kitty.implement` to begin execution
