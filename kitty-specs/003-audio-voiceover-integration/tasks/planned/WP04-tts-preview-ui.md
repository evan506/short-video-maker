---
work_package_id: "WP04"
subtasks: ["T023", "T024", "T025", "T026", "T027", "T028", "T029"]
lane: "planned"
title: "TTS Preview Player UI"
---

# WP04: TTS Preview Player UI

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
