---
work_package_id: "WP04"
subtasks: ["T023", "T024", "T025", "T026", "T027", "T028", "T029"]
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "0"
title: "TTS Preview Player UI"
history:
  - date: 2026-01-06
    event: Created
  - date: 2026-01-07T02:10:00Z
    event: Moved to doing lane - Started implementation
  - date: 2026-01-07T02:30:00Z
    event: Implementation complete - All 7 subtasks (T023-T029) done
---

# WP04: TTS Preview Player UI

## Implementation Summary

**Completed**: 2026-01-07
**Files Created**: 2 new files
**Files Modified**: 1 existing file

### Created Files:
1. `src/ui/hooks/useTTSPreview.ts` (180 lines)
   - T028: Custom hook for TTS preview generation and caching logic
   - Handles API calls to `/api/v1/scenes/:sceneId/tts/preview`
   - Manages loading, error, and duplicate request prevention
   - Returns TTSPreviewResponse (audioUrl, duration, cached)

2. `src/ui/components/audio/TTSPreviewPlayer.tsx` (315 lines)
   - T023: Complete audio player with play/pause/stop controls
   - T025: Loading state with spinner during generation
   - T027: Displays "cached" badge when audio retrieved from cache
   - T029: Error messages with retry button on failure
   - Supports compact mode for inline display
   - Progress bar, duration display, playback controls

### Modified Files:
1. `src/ui/components/editor/SceneCard.tsx`
   - T024: Added "Preview Voiceover" button to scene card
   - Integrated TTSPreviewPlayer component in collapsible section
   - Added click handlers to prevent card click when previewing
   - Added projectId prop for context
   - Preview section with header, close button, and player

### All Subtasks Complete:
- ✅ T023: TTSPreviewPlayer.tsx created with full controls
- ✅ T024: Preview button added to scene card
- ✅ T025: Loading state with CircularProgress
- ✅ T026: API integration via useTTSPreview hook
- ✅ T027: Cached badge displayed when applicable
- ✅ T028: useTTSPreview hook with error handling
- ✅ T029: Error alerts with retry button

## Subtasks
- T023: Create TTSPreviewPlayer.tsx
- T024: Add "Preview Voiceover" button to scene card
- T025: Implement loading state
- T026: Call /api/scenes/:sceneId/tts/preview
- T027: Display "cached" badge
- T028: Create useTTSPreview.ts hook
- T029: Add error handling with retry

## Dependencies
- WP02, WP03

## Definition of Done
- Preview generates in <5s
- Cached previews instant
- Loading states work
