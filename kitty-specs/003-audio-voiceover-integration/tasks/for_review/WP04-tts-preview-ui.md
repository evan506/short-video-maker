---
work_package_id: "WP04"
subtasks: ["T023", "T024", "T025", "T026", "T027", "T028", "T029"]
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "55549"
review_status: "ready"
reviewed_by: "claude-reviewer"
title: "TTS Preview Player UI"
history:
  - date: 2026-01-06
    event: Created
  - date: 2026-01-07T02:10:00Z
    event: Moved to doing lane - Started implementation
  - date: 2026-01-07T02:30:00Z
    event: Implementation complete - All 7 subtasks (T023-T029) done
  - date: 2026-01-08
    event: Code review complete - Critical issues found, returned to planned lane
  - date: 2026-01-08T12:00:00Z
    event: Moved to doing lane - Fixing critical bugs per review feedback
  - date: 2026-01-08T12:15:00Z
    event: Fixed critical bugs - Added voice_id fetching, validation, and API body params
  - date: 2026-01-08T12:20:00Z
    event: Moved to for_review lane - All critical issues addressed, ready for re-review
---

## Review Feedback

**Status**: ✅ **All Issues Addressed**

**Key Issues** (all fixed):
1. ✅ **CRITICAL: Missing voiceId in API call** - **FIXED**
   - Added `fetchSceneProjectId()` to get project_id from scene
   - Added `fetchProjectVoiceId()` to get voice_id from project
   - Modified `fetchTTSPreview()` to accept and send voiceId in POST body
   - Request now includes: `{ text: string, voiceId: string }`

2. ✅ **CRITICAL: No voice selection validation** - **FIXED**
   - Added validation in `generatePreview()` to check voice_id exists
   - Shows user-friendly error: "Please select a voice first in the Voice Library"
   - Prevents API call when no voice is selected (FR-005 compliant)

3. ✅ **Minor: Unused parameter in hook** - **FIXED**
   - Removed unused `projectId` parameter from `useTTSPreview()` hook
   - Hook signature now: `useTTSPreview(): UseTTSPreviewReturn`
   - All necessary data fetched dynamically from scene/project

**What Was Done Well** (from previous review):
- ✅ **TTSPreviewPlayer.tsx** (315 lines) - Well-implemented UI component
- ✅ **SceneCard.tsx** - Clean integration with proper click handling
- ✅ **Error handling** - Graceful with user-friendly messages
- ✅ **Duplicate request prevention** - Works correctly
- ✅ **Audio element management** - Proper cleanup on unmount

**Action Items** (all complete):
- [x] Fix `fetchTTSPreview` to send `voiceId` and `text` in POST body
- [x] Add voice selection validation before calling API
- [x] Fetch project's selected `voice_id` from database
- [x] Test build: No TypeScript errors related to useTTSPreview
- [x] Remove unused `projectId` parameter from hook

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
