---
work_package_id: "WP03"
subtasks: ["T043", "T044", "T045", "T046", "T047", "T048", "T049", "T050", "T051", "T052", "T053", "T054", "T055"]
lane: "doing"
title: "Scene Editing UI"
agent: "claude"
shell_pid: "31339"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
  - timestamp: "2026-01-04T20:20:00Z"
    author: "claude"
    event: "Started implementation of Scene Editing UI"
---

# Work Package: Scene Editing UI

**ID**: WP03
**Title**: Scene Editing UI (User Story 4)
**Priority**: P2 (Core value proposition #2)
**Estimated Subtasks**: 13

**Subtitle Preset Clarification**: Per FR-039, the three presets are: Minimal (static text at bottom, no background), Highlight (static text with semi-transparent background box), Karaoke (visual-only word-by-word highlighting; functional TTS-synchronized karaoke animation is deferred to Phase 2).

## Objective

Enable creators to edit individual scene cards (duration, keywords, subtitle presets) and reorder scenes via drag-and-drop with immediate visual feedback and data persistence.

## Context

This work package implements granular scene editing, allowing creators to fine-tune scenes without regenerating entire storyboard. Each scene card is clickable, opening an edit modal where users can modify duration, keywords, and subtitle presets. Scene reordering enables adjusting visual flow.

**Key Requirements from Spec**:
- FR-035 to FR-046: Scene editing functional requirements
- User Story 4: Scene card editing with persistence
- Success Criteria SC-006

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (User Story 4)
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md` (Scene entity)

## Subtasks (Summarized)

**T043-T044**: UI Components
- T043: `SceneCard.tsx` component (thumbnail, narration, duration, keyword, preset)
- T044: `SceneEditDialog.tsx` modal (duration field, keyword field, preset selector)

**T045-T047**: Backend API
- T045: PATCH `/scenes/:sceneId` (single scene update)
- T046: PATCH `/scenes/batch` (bulk update, "Apply to all")
- T047: POST `/projects/:projectId/scenes/reorder` (update order_index)

**T048-T051**: Form Fields
- T048: Duration editing with validation (≥1 second)
- T049: Keyword editing with visual confirmation (checkmark)
- T050: Subtitle preset selector (Minimal, Highlight, Karaoke)
- T051: "Apply to all scenes" button for subtitle presets

**T052-T055**: Interactions
- T052: Scene drag-and-drop reordering (@dnd-kit)
- T053: Optimistic updates (immediate UI feedback)
- T054: Visual save confirmation (checkmark icon, toast)
- T055: Scene thumbnail placeholder (colored box or icon)

## Implementation Notes

**SceneCard Component** (T043):
- Material-UI Card with: thumbnail placeholder (colored div), narration text (truncated to 100 chars), duration badge, keyword tag, subtitle preset icon
- Click to open edit dialog
- Show drag handle for reordering
- Display order index or hide (visual order is sufficient)

**SceneEditDialog Component** (T044):
- Material-UI Dialog with form:
  - TextField: Duration (number input, min 1, validation error if <1)
  - TextField: Keyword (text input, cannot be empty)
  - Select: Subtitle preset (dropdown with Minimal/Highlight/Karaoke options)
  - Buttons: "Apply", "Cancel"
- On apply: call PATCH endpoint, show loading, close on success

**Drag-and-Drop** (T052):
- Use @dnd-kit library (React 19 compatible)
- Wrap scene grid in DndContext
- Add draggable handles to SceneCard
- On drag end: call reorder endpoint with new scene ID array
- Backend updates order_index for all scenes (0-based sequential)

**Optimistic Updates** (T053):
- Use TanStack Query's `optimisticUpdate` feature
- Update UI immediately, rollback on error
- Provides instant feedback without waiting for API

## Test Strategy

**Manual Testing**:
1. Click scene card, change duration from 5s to 7s, verify save confirmation
2. Refresh page, verify change persists
3. Change keyword, verify checkmark icon appears
4. Select subtitle preset, click "Apply to all", verify all scenes updated
5. Drag scene 3 to position 1, verify reorder persists

**Integration Tests**:
- Test scene update endpoint with valid/invalid data
- Test batch update endpoint
- Test reorder endpoint with scene ID arrays

**E2E Tests**:
- Edit scene duration, refresh page, verify change persists
- Reorder scenes, verify order updates correctly

## Definition of Done

- [ ] SceneCard component displays all scene data
- [ ] SceneEditDialog opens on card click
- [ ] Duration editing validates ≥1 second
- [ ] Keyword editing updates immediately
- [ ] Subtitle preset selector works
- [ ] "Apply to all" updates all scenes
- [ ] Drag-and-drop reordering works
- [ ] Optimistic updates provide instant feedback
- [ ] Visual confirmation (checkmark) displays on save
- [ ] Changes persist across page reload
- [ ] RLS policies enforced (users can only edit own scenes)
- [ ] No TypeScript errors

## Risks

1. **Drag-and-drop library compatibility**: Test @dnd-kit with React 19. Alternative: react-beautiful-dnd.
2. **Optimistic update conflicts**: May conflict with server state. Implement proper cache invalidation.
3. **Concurrent edits**: Two users editing same scene (unlikely). Use last-write-wins.
4. **Scene reorder gaps**: Backend must reindex all scenes to prevent gaps in order_index.

## Reviewer Guidance

Verify:
1. SceneCard displays all fields correctly
2. Edit dialog validation works (duration min 1s, keyword required)
3. Save updates database and persists across reload
4. "Apply to all" updates all scenes with same preset
5. Drag-and-drop works smoothly, no visual glitches
6. Reorder updates order_index for all scenes
7. Optimistic updates improve perceived performance
8. Visual confirmation (checkmark/toast) provides feedback
9. RLS policies enforced (test with multiple users)
