---
work_package_id: "WP02"
subtasks: ["T028", "T029", "T030", "T031", "T032", "T033", "T034", "T035", "T036", "T037", "T038", "T039", "T040", "T041", "T042"]
lane: "planned"
title: "Scene Generation & Management"
history:
  - timestamp: "2026-01-02T00:00:00Z"
    author: "Claude (AI Task Generation Agent)"
    event: "created"
---

# Work Package: Scene Generation & Management

**ID**: WP02
**Title**: Scene Generation & Management (User Story 3)
**Priority**: P1 (Required for storyboard functionality)
**Estimated Subtasks**: 15

## Objective

Automatically split scripts into scenes with proper narration text, duration, and keywords. Implement one-time generation policy (regenerate only if explicitly requested) with version mismatch detection.

## Context

This work package bridges script and storyboard by transforming text scripts into visual scene cards. Scenes are generated once when user first navigates to storyboard, with auto-merge if scene count exceeds 20. Version mismatch detection warns users if script changes after scenes are generated.

**Key Requirements from Spec**:
- FR-022 to FR-034: Scene generation functional requirements
- User Story 3: Storyboard scene generation with one-time policy
- Success Criteria SC-004, SC-005, SC-009

**Key Documents**:
- Spec: `kitty-specs/001-script-storyboard-editor/spec.md` (User Story 3, FR-022 to FR-034)
- Research: `kitty-specs/001-script-storyboard-editor/research.md` (Scene splitting/merging algorithms)
- Data Model: `kitty-specs/001-script-storyboard-editor/data-model.md` (Scene entity)

## Subtasks (Summarized)

**T028-T031**: Scene Utilities
- T028: Sentence tokenization (regex or lightweight NLP)
- T029: Scene splitting algorithm (2-6 second target duration)
- T030: Keyword extraction (first noun phrase)
- T031: Scene merging algorithm (greedy merge if >20 scenes)

**T032-T036**: Backend API
- T032: Create `scene-service.ts` with generation logic
- T033: POST `/projects/:projectId/scenes/generate` endpoint
- T034: GET `/projects/:projectId/scenes` endpoint
- T035: DELETE `/projects/:projectId/scenes` endpoint (regenerate)
- T036: PATCH `/projects/:projectId` to set `storyboard_script_version`

**T037-T042**: Frontend UI
- T037: `StoryboardView.tsx` component
- T038: Scene grid layout with SceneCard components
- T039: Version mismatch detection and warning banner
- T040: "Regenerate scenes" confirmation dialog
- T041: One-time generation logic (check if scenes exist)
- T042: `use-scenes.ts` React hook

## Implementation Notes

**Scene Splitting Algorithm** (T029):
1. Tokenize script into sentences
2. Group sentences into scenes with target duration of 2-6 seconds (normal density preset)
3. Estimate duration: word_count / 2.5 words per second
4. Assign order_index (0-based sequential)
5. Extract primary keyword from narration

**Scene Merging Algorithm** (T031):
1. If scene_count > 20, enter merge loop
2. Find adjacent pair with minimum combined duration
3. Merge scenes (combine narration, sum durations, keep first keyword)
4. Repeat until scene_count ≤ 20

**One-Time Generation** (T041):
1. On first storyboard visit: check if scenes exist for project
2. If no scenes: generate from latest script, set `storyboard_script_version`
3. If scenes exist: load existing scenes (no regeneration)
4. If script version changed: show warning banner with "Regenerate" button

**Version Mismatch Detection** (T039):
1. Compare `project.current_script_version` vs `project.storyboard_script_version`
2. If mismatch: display banner "Script has been updated. Scenes may not match. Regenerate scenes?"
3. Provide "Regenerate" and "Keep existing" buttons

## Test Strategy

**Unit Tests**:
- Test scene splitting with various script lengths (15s, 30s, 60s)
- Test scene merging with edge cases (1 scene, 25 scenes, etc.)
- Test keyword extraction with different sentence structures

**Integration Tests**:
- Test scene generation endpoint with real script data
- Test one-time generation logic (scenes exist vs. don't exist)
- Test version mismatch detection

**E2E Tests**:
- Generate script, navigate to storyboard, verify scenes created
- Reload page, verify scenes persist (one-time generation)
- Edit script, return to storyboard, verify warning banner

## Definition of Done

- [ ] Scene splitting algorithm produces 2-6 second scenes
- [ ] Scene merging reduces count to ≤20 if needed
- [ ] One-time generation policy enforced
- [ ] Version mismatch warning displays correctly
- [ ] Keywords extracted from narration (fallback to topic if extraction fails)
- [ ] Scene grid displays all scenes in order
- [ ] "Regenerate scenes" button shows confirmation warning
- [ ] RLS policies enforced (users can only access own scenes)
- [ ] No TypeScript errors
- [ ] E2E test passes: topic → script → storyboard

## Risks

1. **Scene splitting quality**: May produce awkward boundaries. Test with various scripts.
2. **Keyword extraction failures**: Fallback to project topic if extraction fails.
3. **Auto-merge creates long scenes**: May create scenes >15 seconds. Acceptable per spec.
4. **Version mismatch confusion**: Add clear messaging and help text.
5. **Performance with large scripts**: Optimize algorithm, add pagination if needed.

## Reviewer Guidance

Verify:
1. Scene splitting produces reasonable scene boundaries (test with real scripts)
2. Auto-merge correctly reduces scene count to ≤20
3. One-time generation works (reload page, scenes persist)
4. Version mismatch warning displays when script edited
5. "Regenerate scenes" overwrites existing scenes with confirmation
6. Keyword extraction quality (check extracted keywords make sense)
7. Scene order is sequential (no gaps in order_index)
8. RLS policies enforced (test with multiple users)
