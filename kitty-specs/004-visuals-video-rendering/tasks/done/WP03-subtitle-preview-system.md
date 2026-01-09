---
lane: "done"
agent: "claude-reviewer"
assignee: "claude"
shell_pid: "30443"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# Work Package: WP03 - Subtitle Preview System

**Work Package ID**: WP03
**Feature**: 004-visuals-video-rendering
**Status**: done
**Created**: 2026-01-08
**Assignee**: claude
**Agent**: claude
**Shell PID**: 30443

**Lane**: done
**History**:
- 2026-01-09: Moved to doing lane, started implementation
- 2026-01-09: Completed implementation, ready for review
- 2026-01-09: Reviewed and approved without changes

---

## Objective

Implement real-time subtitle preview in storyboard editor with WYSIWYG consistency for all 3 presets (Minimal, Highlight, Karaoke).

**Subtasks**:
- T031: Create `src/ui/components/subtitles/SubtitlePreview.tsx` component
- T032: Implement `MinimalSubtitle.tsx` Remotion component (white text, bottom positioning)
- T033: Implement `HighlightSubtitle.tsx` Remotion component (background box, rounded corners)
- T034: Implement `KaraokeSubtitle.tsx` Remotion component (word-by-word highlighting)
- T035: Create `src/ui/hooks/useSubtitlePreview.ts` for timing simulation
- T036: Implement timing interpolation logic (frame → milliseconds → active word index)
- T037: Add `SubtitlePresetSelector.tsx` dropdown component
- T038: Update scene cards to show subtitle preview overlay
- T039: Implement "Apply to all scenes" button for bulk preset changes
- T040: Write unit tests for Remotion subtitle components

---

## Context

The subtitle preview system uses the same Remotion components for both storyboard preview and final render, ensuring WYSIWYG consistency. Users can cycle through presets and see immediate visual feedback.

**Key Requirements**:
- Use `<AbsoluteFill>` for positioning
- Use `useCurrentFrame()` for timing sync
- Karaoke highlights sync within ±100ms accuracy
- "Apply to all scenes" updates database immediately

---

## Subtask Guidance

### T032-T034: Remotion Subtitle Components
Create 3 components using Remotion primitives. For Karaoke, iterate through words and check if current frame is within word's time range using `interpolate()`.

### T035-T036: Timing Simulation
Parse `subtitle_timing` JSONB, convert frame number to milliseconds, determine active word index for Karaoke highlighting.

### T037-T039: UI Components
Add preset selector dropdown, update scene cards with overlay, implement bulk apply with toast notification.

### T040: Unit Tests
Test timing interpolation, frame-to-word mapping, preset switching logic.

---

## Definition of Done

- [x] All 3 subtitle presets render correctly in preview
- [x] Karaoke highlights sync with timing data within ±100ms
- [x] Preset selector updates database immediately
- [x] "Apply to all scenes" updates all scenes in <2 seconds
- [x] Remotion components reusable in worker render pipeline
- [x] Unit tests verify timing interpolation

---

## Activity Log

- 2026-01-09T09:45:00Z – claude – shell_pid= – lane=doing – Completed T031-T040: Created SubtitlePreview.tsx wrapper component; Implemented MinimalSubtitle.tsx, HighlightSubtitle.tsx, KaraokeSubtitle.tsx Remotion components (250 lines total); Created useSubtitlePreview hook with timing interpolation (100 lines); Implemented SubtitlePresetSelector UI component with "Apply to all" button (120 lines); Wrote 19 comprehensive unit tests for timing interpolation, frame-to-word mapping, and edge cases; All tests passing ✓
- 2026-01-09T09:52:00Z – claude – shell_pid= – lane=for_review – Ready for review
- 2026-01-09T09:55:00Z – claude-reviewer – shell_pid= – lane=done – Approved: All 3 subtitle presets (Minimal, Highlight, Karaoke) implemented correctly with proper Remotion primitives (AbsoluteFill, useCurrentFrame). Timing interpolation logic verified (frame → ms → active word). Karaoke word-level sync within ±100ms accuracy. SubtitlePresetSelector with "Apply to all" button implemented. All 19 unit tests passing. WYSIWYG consistency ensured by using same components for preview and render.

---

## Risks

**Risk**: Preview mode may differ from final render → Use same components for both
**Risk**: Karaoke timing drifts over long scenes → Test with 60-second scenes
**Risk**: Performance degrades with many previews → Implement virtualization (Phase 2)
