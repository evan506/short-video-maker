---
work_package_id: "WP03"
title: "Batch Search & Polish"
slug: "batch-search-polish"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
created_at: "2026-01-06T00:00:00Z"
subtasks:
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
  - "T047"
  - "T048"
dependencies:
  - "WP02"
risks:
  - "Batch search overwhelms Pexels API rate limits"
  - "Progress updates cause UI lag with many scenes"
  - "Animations drop frames on low-end devices"
history:
  - timestamp: "2026-01-06T00:00:00Z"
    agent: "system"
    event: "Work package created"
---

# WP03: Batch Search & Polish

**Work Package**: WP03
**Feature**: 002 - Video Media Search & Rendering
**Status**: Planned
**Priority**: P2 (Enhancement)
**Dependencies**: WP02 (requires SceneCard integration)

## Objective

Add batch search functionality for searching all scenes at once, implement smooth animations and transitions, enhance accessibility, and write comprehensive E2E tests to validate the entire feature.

---

## Subtasks

### T037-T040: Batch Search Implementation
**File**: `src/ui/components/BatchMediaSearch.tsx`

**T037: Create batch search component**
- Create component accepting `projectScenes` prop (array of scenes)
- Display "Search all scenes" button prominently
- Show progress indicator during search
- Queue searches with rate limiting (1 request/second)

**T038: Implement batch search logic**
- Call POST /media/search for each scene
- Rate limit to 1 request per second (respects Pexels API)
- Update progress as searches complete ("5/15 scenes searched")
- Handle partial failures gracefully (continue on individual errors)
- Show individual errors per failed scene
- Use Promise.all with concurrency limit or p-queue library

**Implementation guidance**:
```typescript
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 1, interval: 1000 });

async function batchSearch(scenes: Scene[]) {
  const results = await Promise.allSettled(
    scenes.map(scene =>
      queue.add(() => mediaService.search(scene.id))
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - succeeded;

  // Update progress UI
  setProgress({ completed: succeeded, failed, total: scenes.length });
}
```

**T039: Add progress indicator**
- Display "X/Y scenes searched" text above button
- Show linear progress bar (MUI or Tailwind)
- Update in real-time as searches complete
- Show completion summary: "✅ 14 scenes searched successfully, 1 failed"
- Highlight failed scenes with retry buttons

**T040: Handle batch search errors**
- Continue on individual scene failures (don't stop batch)
- Log errors for failed scenes (console + UI)
- Show "Retry" button on failed scene cards
- Don't block successful searches with individual errors
- Display final error count in summary

---

### T041-T042: Animations and Transitions

**T041: Add smooth animations**
- Animate thumbnail entrance (fade in + slide up from 20px)
- Animate selection transition (scale up 1.05 → back to 1.0)
- Animate loading spinner (360deg rotation)
- Animate modal open/close (fade in/out + scale)
- Use CSS transitions or Framer Motion
- Target 60fps (use `transform` and `opacity` only)

**Implementation guidance** (using Tailwind):
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thumbnail-enter {
  animation: fadeInUp 0.3s ease-out;
}
```

**T042: Polish UI transitions**
- Add hover effects to buttons (scale 1.02, shadow increase)
- Smooth scroll for thumbnail list (`scroll-behavior: smooth`)
- Loading skeletons (shimmer effect)
- Error shake animation (translateX 5px → -5px → 5px → 0)
- Success checkmark animation (draw SVG path)

---

### T043-T044: Accessibility Improvements

**T043: Add ARIA labels**
- Label all video thumbnails: `aria-label="Preview video: grilling steak, 15 seconds"`
- Label modal and its controls: `role="dialog"`, `aria-modal="true"`
- Label buttons with clear actions: `aria-label="Select this video for scene"`
- Label progress indicator: `aria-label="Batch search progress: 5 of 15 scenes searched"`
- Describe loading states: `aria-live="polite"`, `aria-busy="true"`

**T044: Test keyboard navigation**
- Test Tab order through SceneCard (thumbnails → refresh → next card)
- Test Enter to open preview modal
- Test Esc to close modal
- Test arrow keys for thumbnails (← → navigate)
- Test screen reader announcements (NVDA or VoiceOver)

---

### T045-T048: E2E Testing
**Files**: `tests/e2e/feature-002-media-search.spec.ts`

**T045: Write E2E test for automatic search**
- Create test project via UI or API
- Generate scenes (5 scenes)
- Verify search triggers automatically (wait for status 'completed')
- Wait for thumbnails to appear
- Assert search status is 'completed' for all scenes

**Implementation guidance** (using Playwright):
```typescript
test('automatic search triggers on scene creation', async ({ page }) => {
  // Create project and scenes
  await page.goto('/projects/new');
  await page.fill('[data-testid="project-title"]', 'Test Project');
  await page.click('[data-testid="generate-scenes"]');
  await page.waitForSelector('[data-testid="scene-card"]', { timeout: 10000 });

  // Verify search status
  const sceneCards = await page.locator('[data-testid="scene-card"]').count();
  expect(sceneCards).toBe(5);

  // Wait for thumbnails to load
  await page.waitForSelector('[data-testid="video-thumbnail"]', { timeout: 15000 });

  // Verify search completed
  const status = await page.locator('[data-testid="search-status"]').first().textContent();
  expect(status).toContain('completed');
});
```

**T046: Write E2E test for selection flow**
- Navigate to scene card
- Hover over thumbnail (wait for preview)
- Click thumbnail to open modal
- Click "Select this video"
- Verify green border appears on thumbnail
- Refresh page (verify selection persists)

**T047: Write E2E test for refresh functionality**
- Click "Refresh options" button
- Wait for new results (loading spinner → thumbnails)
- Verify thumbnails changed (count or IDs different)
- Test rate limit countdown (click refresh twice, verify 429 or countdown shown)
- Verify old options removed (database check)

**T048: Write E2E test for batch search**
- Create project with 10 scenes
- Click "Search all scenes" button
- Verify progress updates (1/10 → 2/10 → ... → 10/10)
- Wait for completion
- Verify all scenes have thumbnails
- Handle errors gracefully (mock API failure for 2 scenes, verify 8 succeed)

---

## Implementation Sketch

**High-level sequence**:

1. **Batch search** (T037-T040):
   - Create BatchMediaSearch component
   - Implement rate-limited queue
   - Add progress indicator
   - Handle errors gracefully

2. **Animations** (T041-T042):
   - Add entrance animations for thumbnails
   - Add selection transition
   - Polish all UI transitions

3. **Accessibility** (T043-T044):
   - Add ARIA labels
   - Test keyboard navigation
   - Test with screen reader

4. **E2E tests** (T045-T048):
   - Test automatic search
   - Test selection flow
   - Test refresh functionality
   - Test batch search

---

## Parallel Opportunities

- **[P] T037-T040** (batch search) and **T041-T042** (animations) can be done in parallel
- **[P] T043-T044** (accessibility) can be done alongside implementation
- **[P] T045-T048** (E2E tests) can be written while features are implemented

---

## Definition of Done

**Code completeness**:
- [ ] Batch search works for 15+ scenes
- [ ] Progress updates in real-time
- [ ] Rate limiting prevents API errors (1 req/sec)
- [ ] Smooth animations (60fps on Chrome DevTools)
- [ ] Keyboard navigation works (Tab, Enter, Esc, arrows)
- [ ] ARIA labels on all interactive elements

**Testing**:
- [ ] All 4 E2E tests pass
- [ ] E2E tests run in CI/CD pipeline
- [ ] Accessibility audit passes (Lighthouse score > 90)

**Performance**:
- [ ] Batch search completes 15 scenes in < 20 seconds
- [ ] Animations maintain 60fps
- [ ] No memory leaks (test with 100 thumbnails)

**User experience**:
- [ ] Batch search provides clear feedback
- [ ] Errors are handled gracefully with retry options
- [ ] Animations enhance UX without being distracting

---

## Reviewer Guidance

**Key areas to validate**:

1. **Batch search performance**: Test with 20 scenes, verify completes in < 30 seconds
2. **Rate limiting**: Check Pexels API logs, verify max 1 request/second
3. **Animation performance**: Open Chrome DevTools Performance monitor, verify 60fps
4. **Accessibility**: Test with NVDA/VoiceOver, verify all actions announced
5. **E2E tests**: Run all 4 tests locally, verify they pass consistently

---

## Next Steps

After completing this work package:
1. Run full E2E test suite
2. Test accessibility with screen reader
3. Verify animations are smooth on low-end devices
4. Move to `for_review` lane
5. Feature 002 is complete! Proceed to `/spec-kitty.accept`
