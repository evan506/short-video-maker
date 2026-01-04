---
work_package_id: "WP04"
subtasks: ["T056", "T057", "T058", "T059", "T060", "T061", "T062", "T063", "T064", "T065", "T066", "T067", "T068", "T069", "T070"]
lane: "doing"
title: "Project Management & Persistence"
agent: "claude"
shell_pid: "56374"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
  - timestamp: "2026-01-04T21:00:00Z"
    author: "claude"
    event: "Started implementation of Project Management & Persistence"
---

# Work Package: Project Management & Persistence

**ID**: WP04
**Title**: Project Management & Persistence (User Story 5)
**Priority**: P2 (Required for real-world usage)
**Estimated Subtasks**: 15

## Objective

Enable creators to create projects, save all work across sessions, and reload from dashboard with full data persistence (scripts, scenes, metadata).

## Context

This work package implements project CRUD operations and dashboard UI, enabling creators to manage multiple video projects and resume work across sessions. Without persistence, all work is lost on browser close.

**Key Requirements from Spec**:
- FR-047 to FR-055: Project persistence functional requirements
- User Story 5: Data persistence and project reload
- Success Criteria SC-007, SC-008, SC-010

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (User Story 5)
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md` (Project entity)

## Subtasks (Summarized)

**T056-T060**: Backend API
- T056: POST `/projects` (create new project)
- T057: GET `/projects` (list user's projects)
- T058: GET `/projects/:projectId` (load single project with scripts and scenes)
- T059: PATCH `/projects/:projectId` (update project metadata)
- T060: DELETE `/projects/:projectId` (delete project with cascading deletes)

**T061-T063**: Frontend Pages
- T061: `EditorNew.tsx` (create project page)
- T062: `EditorProject.tsx` (edit project page with tabbed interface)
- T063: `ProjectDashboard.tsx` (project list view)

**T064-T069**: Dashboard Features
- T064: Project list view with sorting by "last modified"
- T065: Project status indicators (draft/rendering/done/failed)
- T066: Project reload from dashboard (navigation to `/editor/:projectId`)
- T067: "New Project" button
- T068: Project title auto-generation from topic
- T069: Project deletion confirmation dialog

**T070**: React Hook
- T070: `use-project.ts` for project CRUD operations

## Implementation Notes

**Project Creation** (T056, T061, T068):
- Auto-generate title from topic (first 50 characters or user-defined)
- Set initial status="draft", current_script_version=null, storyboard_script_version=null
- Validate: topic min 10 chars, platform/type/duration required
- Redirect to `/editor/:projectId` after creation

**Project List** (T057, T064):
- Query returns all user's projects sorted by `updated_at` DESC
- Enforce RLS (user_id = auth.uid())
- Display: title, status badge, last modified date, "Open" button, "Delete" button
- Pagination if list >50 projects

**Project Load** (T058, T062):
- Load project with latest script version and all scenes
- Tabbed interface: "Script" tab, "Storyboard" tab
- Show project metadata (title, topic, platform, duration, type, status)

**Project Dashboard** (T063):
- Material-UI Table or Grid layout
- Status badges with colors: draft (blue), rendering (yellow), done (green), failed (red)
- Sorting by "last modified" (default)
- Filter by status (optional)

**Project Deletion** (T060, T069):
- Confirmation dialog: "Delete this project? This action cannot be undone."
- Cascading deletes: scripts and scenes deleted automatically
- RLS enforced: users can only delete own projects

## Test Strategy

**Manual Testing**:
1. Create project, generate script, create scenes, close browser, reopen, verify project reloads with all data
2. Create multiple projects, verify dashboard displays all sorted by last modified
3. Delete project, verify cascading deletes (scripts/scenes removed)
4. Test RLS: user A cannot see user B's projects

**Integration Tests**:
- Test project CRUD endpoints
- Test RLS policies with multiple users
- Test cascading deletes

**E2E Tests**:
- Create project → generate script → close browser → reopen → verify project reloads
- Delete project → verify removed from dashboard and database

## Definition of Done

- [ ] Projects can be created, updated, deleted
- [ ] Project dashboard displays all user's projects
- [ ] Projects sorted by "last modified"
- [ ] Status badges display correctly
- [ ] Project reload loads script and scenes
- [ ] Title auto-generated from topic
- [ ] "New Project" button works
- [ ] Deletion shows confirmation dialog
- [ ] Cascading deletes work (delete project removes scripts/scenes)
- [ ] Data persists across browser sessions
- [ ] RLS policies enforced (users can only access own projects)
- [ ] No TypeScript errors
- [ ] E2E test passes: full workflow with persistence

## Risks

1. **RLS policy issues**: Test thoroughly with multiple users.
2. **Cascading delete failures**: Verify foreign key constraints work correctly.
3. **Project reload performance**: Optimize queries, add indexes if needed.
4. **Concurrent edits**: Last-write-wins acceptable for Phase 1.
5. **Browser local storage**: Use server-side persistence, not localStorage.

## Reviewer Guidance

Verify:
1. Project CRUD operations work correctly
2. Dashboard displays all user's projects with correct sorting
3. Status badges display correct colors
4. Project reload loads all data (script, scenes, metadata)
5. Title auto-generated from topic (first 50 chars)
6. Deletion shows confirmation and cascades correctly
7. Data persists across browser close/reopen
8. RLS policies enforced (test with multiple users)
9. Navigation between dashboard and editor works
10. "New Project" button creates project and redirects to editor
