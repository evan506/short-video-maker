# Work Package: WP03 - Subtitle Preview System

**Work Package ID**: WP03
**Feature**: 004-visuals-video-rendering
**Status**: planned
**Created**: 2026-01-08

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

- [ ] All 3 subtitle presets render correctly in preview
- [ ] Karaoke highlights sync with timing data within ±100ms
- [ ] Preset selector updates database immediately
- [ ] "Apply to all scenes" updates all scenes in <2 seconds
- [ ] Remotion components reusable in worker render pipeline
- [ ] Unit tests verify timing interpolation

---

## Risks

**Risk**: Preview mode may differ from final render → Use same components for both
**Risk**: Karaoke timing drifts over long scenes → Test with 60-second scenes
**Risk**: Performance degrades with many previews → Implement virtualization (Phase 2)
