# Implementation Plan: Script & Storyboard Editor

**Branch**: `001-script-storyboard-editor` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `kitty-specs/001-script-storyboard-editor/spec.md`

**Note**: This plan captures the implementation approach for Phase 1 of the Script & Storyboard Editor feature. All planning questions have been resolved and documented below.

## Summary

**Primary Requirement**: Build a web-based editor that enables creators to generate video scripts from topic descriptions using LLM, refine scripts with quick-edit tools, and create/edit storyboard scenes with granular control.

**Technical Approach**:
- **Frontend**: React-based UI with new `/editor/new` and `/editor/:projectId` routes (separate from existing VideoCreator)
- **Backend**: Extend existing Express REST API with `/api/v1/*` endpoints for projects, scripts, and scenes
- **Data**: Supabase (PostgreSQL) with new schema managed via SQL migrations
- **LLM**: OpenRouter integration via backend API endpoints (server-side API key only)
- **State Management**: TanStack Query for server state, local React state for transient UI
- **Phase 1 Scope**: Synchronous APIs (no job queue infrastructure yet)

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.8+ with React 19.1
- Backend: Node.js with TypeScript 5.8+, Express 4.18

**Primary Dependencies**:
- Frontend: React 19.1, Material-UI 5.15, TanStack Query 5.18, React Router 7.5, Zod 3.24
- Backend: Express 4.18, Zod 3.24, Supabase JS Client 2.x
- Database: Supabase (PostgreSQL + Auth + RLS)
- LLM: OpenRouter API (configurable model via env)

**Storage**:
- Supabase PostgreSQL with Row Level Security (RLS)
- Schema managed via SQL migrations (Supabase CLI)
- Tables: `projects`, `scripts`, `scenes`, `subtitle_presets` (Phase 1)
- Reserved for Phase 2: `render_jobs`, `job_steps` (spec only)

**Testing**:
- Unit: Vitest for business logic
- Integration: API integration tests with Supabase test database
- E2E: Playwright with dedicated test account (email/password)
- Contract: Mock OpenRouter API (no real LLM calls in CI)

**Target Platform**:
- Phase 1: Local development + single-server deployment
- Frontend: Vite dev server (localhost:5173)
- Backend: Express server (localhost:3000)

**Project Type**: Web application (monorepo with shared TypeScript)

**Performance Goals**:
- Script generation: Hard timeout 60s (FR-008). Record latency metrics (p50/p90) for script generation and quick-edits; UI must show immediate loading feedback
- Scene generation: < 5 seconds for typical 60-second video
- API response: < 500ms for CRUD operations
- Page load: < 2 seconds for editor pages

**Constraints**:
- Maximum video duration: 60 seconds (short-form content)
- Scene count target: 10-15 scenes (auto-merge if >20 scenes)
- Script generation timeout: 60 seconds
- LLM API cost: Configurable model selection, default via env var

**Scale/Scope**:
- Phase 1: Single-server deployment
- Concurrent users: Limited by server resources (no horizontal scaling)
- Data volume: User-owned projects with RLS isolation
- Script versions: Per-project history (unlimited versions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### I. User Experience First
**Status**: ✅ PASS

**Compliance**:
- All LLM operations show loading indicators (FR-007, FR-010-013)
- Failed operations display user-friendly error messages with Retry buttons (FR-008, FR-009)
- Scene editing provides immediate visual confirmation (FR-046)
- Script version mismatch warnings (FR-032) with clear recovery actions (FR-033, FR-034)

**Implementation Notes**:
- Phase 1: Synchronous API calls with loading spinners
- Phase 2: Progress tracking for async job queue (designed but not implemented)

### II. Snapshot-Based Consistency
**Status**: ✅ PASS

**Compliance**:
- Scripts versioned with incrementing integers (FR-016, FR-019)
- Scenes reference `storyboard_script_version` at generation time (FR-024)
- Version mismatch detection warns users (FR-032)
- Explicit "Regenerate scenes" action required (FR-033)

**Implementation Notes**:
- `projects.storyboard_script_version` tracks which script version generated current scenes
- `projects.current_script_version` tracks latest script version
- Mismatch triggers warning banner with "Regenerate" vs "Keep existing" options

### III. Test-Driven Quality
**Status**: ✅ PASS

**Compliance**:
- Contract tests for OpenRouter API (mocked in CI)
- Integration tests for critical journeys (topic → script → storyboard)
- Unit tests for business logic (scene splitting, duration calculations, keyword generation)
- Tests run in CI/CD pipeline

**Implementation Notes**:
- OpenRouter mocked using Nock for contract tests
- Supabase test database for integration tests
- Playwright E2E tests with dedicated test account

### IV. Async Job Resilience
**Status**: ⚠️ PHASE 2 ONLY (Spec Complete)

**Compliance**:
- Phase 1: Synchronous APIs only (no job queue)
- Phase 2: Job state models defined in spec (FR-056 to FR-063)
- Data models designed to support future async jobs

**Implementation Notes**:
- FR-056–FR-063 are documentation-only state models for Phase 2; Phase 1 implements no job queue/worker infrastructure.
- `render_jobs` and `job_steps` tables designed but NOT created in Phase 1
- State transition rules documented in spec (queued → running → succeeded/failed/canceled)
- Phase 1 implementation focuses on script/storyboard editing (no rendering yet)

### V. Media Source Flexibility
**Status**: ⚠️ OUT OF SCOPE (Phase 1)

**Compliance**:
- Phase 1: Keyword field only (no media fetching)
- Phase 2: Pexels/Pixabay integration planned
- Data model supports future `media_assets` table

**Implementation Notes**:
- `scenes.primary_keyword` stores search term for future media matching
- No media API integration in Phase 1
- User upload feature planned for Phase 2

### VI. Voice Selection & Preview
**Status**: ⚠️ OUT OF SCOPE (Phase 1)

**Compliance**:
- Phase 1: No voice selection or TTS
- Phase 2: Voice library with preview caching planned
- Data model supports `projects.voice_id` field

**Implementation Notes**:
- `projects.voice_id` column reserved but not used in Phase 1
- TTS API integration planned for Phase 2

### VII. Incremental Storyboard Editing
**Status**: ✅ PASS

**Compliance**:
- Scene cards display: thumbnail placeholder, narration, duration, keyword (FR-035)
- Click-to-edit with immediate save (FR-036, FR-044)
- Edit duration, keyword, subtitle preset independently (FR-037-040, FR-042)
- Scene reordering via drag-and-drop (FR-042, FR-043)

**Implementation Notes**:
- TanStack Query mutations with optimistic updates
- Visual confirmation (checkmark) after save (FR-046)
- Drag-and-drop via @dnd-kit or react-beautiful-dnd

### UTF-8 Encoding Standards
**Status**: ✅ PASS

**Compliance**:
- All YAML/JSON/CLI args use ASCII-safe characters only
- Markdown body may contain general unicode (Korean, Chinese, etc.)
- Validation before commit

**Implementation Notes**:
- Supabase migrations: UTF-8 safe
- API responses: JSON with UTF-8 encoding
- OpenRouter prompts: ASCII-safe structured data

### Performance Standards
**Status**: ✅ PASS

**Compliance**:
- Target duration: Max 60 seconds (FR-003)
- Scene count: 10-15 target, auto-merge if >20 (FR-027)
- Scene duration: 2-6 seconds per scene (FR-025)
- No concurrent renders in Phase 1 (single server)

**Implementation Notes**:
- Scene splitting algorithm targets 2-6 second scenes
- Auto-merge logic combines scenes <2 seconds until ≤20 total
- LLM timeout: 60 seconds (FR-008)

### Security & Compliance
**Status**: ✅ PASS

**Compliance**:
- Supabase RLS enforced on all user data (FR-055, Constitution)
- API keys in environment variables (OPENROUTER_API_KEY)
- User isolation: `user_id = auth.uid()` in RLS policies

**Implementation Notes**:
- OpenRouter API key server-side only (never exposed to frontend)
- Supabase Auth with email/password (no confirmation required in Phase 1)
- RLS policies on `projects`, `scripts`, `scenes`, `subtitle_presets`

### Development Workflow
**Status**: ✅ PASS

**Compliance**:
- Feature branch format: `001-script-storyboard-editor` ✅
- Git discipline: Descriptive commits, no history rewriting
- Code quality: TypeScript strict mode, ESLint, Prettier

**Implementation Notes**:
- Incremental changes to existing `src/server/routers/rest.ts`
- New frontend routes separate from existing VideoCreator
- Follow existing patterns (Material-UI, TanStack Query, Zod)

### Project Authority
**Status**: ✅ PASS

**Compliance**:
- PRD single source of truth: `docs/AutoShorts_PRD.md`
- All decisions align with PRD requirements
- Out-of-scope items explicitly documented

**Implementation Notes**:
- Phase 1: Script generation, quick editing, scene generation/editing
- Out of scope: Media fetching, TTS, rendering (Phase 2)
- Spec references PRD throughout

**Overall Constitution Status**: ✅ PASS

All Phase 1 requirements comply with constitution principles. Phase 2 features (async jobs, media fetching, voice selection) are designed for future implementation but not executed in Phase 1.

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-script-storyboard-editor/
├── spec.md              # Feature specification (user stories, FRs, SCs)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technical research findings
├── data-model.md        # Phase 1: Database schema and entity relationships
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: API contracts (OpenAPI/Postman)
│   ├── openapi.yaml     # OpenAPI 3.1 spec for all REST endpoints
│   └── postman-collection.json # Postman import for manual testing
└── tasks/               # Phase 2: Work packages (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
src/
├── server/
│   ├── routers/
│   │   ├── rest.ts              # Extended with new /api/v1/* endpoints
│   │   └── editor-router.ts     # NEW: Editor-specific routes
│   ├── services/
│   │   ├── llm-service.ts       # NEW: OpenRouter integration
│   │   ├── scene-service.ts     # NEW: Scene splitting/merging logic
│   │   └── script-service.ts    # NEW: Script versioning logic
│   ├── middleware/
│   │   └── supabase-auth.ts     # NEW: Supabase auth middleware
│   └── validators/
│       └── editor-validators.ts # NEW: Zod schemas for editor API
│
├── ui/
│   ├── pages/
│   │   ├── EditorNew.tsx        # NEW: /editor/new (create project)
│   │   └── EditorProject.tsx    # NEW: /editor/:projectId (edit project)
│   ├── components/
│   │   ├── editor/
│   │   │   ├── ScriptEditor.tsx       # NEW: Script generation + quick edit
│   │   │   ├── StoryboardView.tsx     # NEW: Scene cards grid/list
│   │   │   ├── SceneCard.tsx          # NEW: Individual scene card
│   │   │   ├── SceneEditDialog.tsx    # NEW: Scene edit modal
│   │   │   └── ProjectDashboard.tsx   # NEW: Project list/management
│   │   └── common/
│   │       └── LoadingButton.tsx      # NEW: Reusable loading button
│   ├── hooks/
│   │   ├── use-script.ts        # NEW: Script CRUD + versions
│   │   ├── use-scenes.ts        # NEW: Scene CRUD + reordering
│   │   └── use-project.ts       # NEW: Project CRUD
│   └── services/
│       └── editor-api.ts        # NEW: API client for editor endpoints
│
├── types/
│   └── editor.ts                # NEW: TypeScript types for editor domain
│
└── lib/
    └── scene-utils.ts           # NEW: Scene splitting/merging utilities

supabase/
├── migrations/
│   ├── 20250102_create_projects_table.sql         # NEW
│   ├── 20250102_create_scripts_table.sql          # NEW
│   ├── 20250102_create_scenes_table.sql           # NEW
│   ├── 20250102_create_subtitle_presets_table.sql # NEW
│   └── 20250102_enable_rls_policies.sql           # NEW
└── seeds/
    └── subtitle_presets_seed.sql                  # NEW

tests/
├── unit/
│   ├── scene-utils.test.ts      # Scene splitting/merging logic
│   └── script-service.test.ts   # Script versioning logic
├── integration/
│   └── editor-api.test.ts       # API integration tests
├── contract/
│   └── openrouter.test.ts       # OpenRouter API contract tests (mocked)
└── e2e/
    ├── editor-flow.spec.ts      # E2E: topic → script → storyboard
    └── scene-editing.spec.ts    # E2E: scene CRUD + reordering
```

**Structure Decision**: Web application pattern (existing stack)
- Backend: Extend existing `src/server/` with new routes and services
- Frontend: New editor pages under `src/ui/pages/`, shared components under `src/ui/components/editor/`
- Database: Supabase migrations in new `supabase/` directory
- Tests: Mirror source structure under `tests/`

**Service Responsibilities**
- `llm-service.ts`: OpenRouter API calls only (timeout/retry logic). No database operations or versioning logic.
- `script-service.ts`: Script CRUD operations + versioning logic. Calls `llm-service.ts` to generate new script versions.

**Integration Points**:
- Extend `src/server/routers/rest.ts` with new `/api/v1/*` endpoints (clean v1 namespace)
- New routes registered in `src/server/server.ts`
- Frontend routing via React Router (new routes independent of existing VideoCreator)
- TanStack Query for data fetching (follows existing pattern)

## Complexity Tracking

*No constitution violations requiring justification.*

**Notes**:
- All features align with existing architecture patterns
- No new frameworks or paradigms introduced
- Incremental additions to established codebase

## Parallel Work Analysis

### Dependency Graph

```
Phase 0: Research (Day 1)
├── LLM integration patterns
├── Supabase setup and migration workflow
└── Scene splitting algorithm research

Phase 1: Foundation (Days 2-3) [SEQUENTIAL]
├── Supabase migrations (projects, scripts, scenes tables)
├── Backend scaffold (router, validators, types)
└── Frontend scaffold (routes, layout components)

Phase 2: Core Features (Days 4-6) [PARALLEL STREAMS]
Stream A: Script Generation & Editing
├── LLM service (OpenRouter integration)
├── Script CRUD API endpoints
├── Script versioning logic
├── Script generation UI
└── Quick-edit tools (Shorten/Lengthen/Rephrase/Change Tone)

Stream B: Storyboard & Scene Management
├── Scene service (splitting/merging logic)
├── Scene CRUD API endpoints
├── Storyboard UI (scene cards grid/list)
├── Scene editing dialog
└── Drag-and-drop reordering

Stream C: Project Management & Persistence
├── Project CRUD API endpoints
├── Project dashboard UI
├── Data persistence layer (TanStack Query)
└── Auth integration (Supabase Auth)

Phase 3: Integration & Testing (Days 7-8) [SEQUENTIAL]
├── Integration of all streams
├── E2E testing (Playwright)
├── Contract testing (OpenRouter mocks)
└── Bug fixes and refinement

Phase 4: Documentation & Handoff (Day 9) [SEQUENTIAL]
├── quickstart.md completion
├── API contracts (OpenAPI/Postman)
└── Code review and merge
```

### Work Distribution

**Sequential Work** (Must be completed first):
1. Supabase migrations (database schema)
2. Backend router and validator setup
3. Frontend route registration and layout
4. TanStack Query setup and API client

**Parallel Streams** (Can be developed simultaneously):
- Stream A: Script generation/editing (independent of scene management)
- Stream B: Storyboard/scene management (independent of script logic)
- Stream C: Project management (depends on A/B for data models)

**Agent Assignments** (If multiple developers/agents):
- Agent 1: Stream A (Script focus) → `src/server/services/script-service.ts`, `src/ui/components/editor/ScriptEditor.tsx`
- Agent 2: Stream B (Storyboard focus) → `src/server/services/scene-service.ts`, `src/ui/components/editor/StoryboardView.tsx`
- Agent 3: Stream C (Project focus) → `src/ui/pages/EditorNew.tsx`, `src/ui/pages/EditorProject.tsx`, auth integration
- Agent 4: Testing → All test files, contract mocks

**File Ownership Rules**:
- Services: One agent per service file
- Components: One agent per component tree
- Tests: Agent who writes code also writes tests
- Integration points: Coordinated via merge/pull requests

### Coordination Points

**Sync Schedule**:
- Daily merges of parallel streams to main feature branch
- End of Phase 2: Full integration checkpoint
- Phase 3: Daily integration test runs

**Integration Tests**:
- Cross-stream integration: Script → Scene generation flow
- Data consistency: Project/Script/Scene version alignment
- E2E coverage: Topic → Script → Storyboard → Edit scenes

**Communication Channels**:
- Shared API contracts (contracts/openapi.yaml) as source of truth
- TypeScript types in `src/types/editor.ts` enforce interface contracts
- Zod validators ensure runtime schema compliance

---

**Next Steps**:
1. ✅ Planning complete (this document)
2. ⏭️ Run `/spec-kitty.plan` Phase 0: Generate research.md
3. ⏭️ Run `/spec-kitty.plan` Phase 1: Generate data-model.md and contracts/
4. ⏭️ Run `/spec-kitty.tasks` to create work packages (NOT included in this command)

**STOP HERE**: This command ends after generating planning artifacts. The user must explicitly run `/spec-kitty.tasks` to proceed to task generation.
