---
work_package_id: "WP03"
subtasks: ["T016", "T017", "T018", "T019", "T020", "T021", "T022"]
lane: "planned"
title: "Voice Library UI"
history:
  - date: 2026-01-06
    event: Created
---

# WP03: Voice Library UI

## Objective
Build voice selection UI with sample playback.

## Subtasks
- T016: Create VoiceLibrary.tsx component
- T017: Add voice cards with details
- T018: Implement sample playback (static files)
- T019: Create useVoiceSelection.ts hook
- T020: Add "Apply Voice" button
- T021: Update projects.voice_id
- T022: Persist selection across refreshes

## Dependencies
- WP02 (API endpoint)

## Definition of Done
- 10+ voices displayed
- Sample audio plays in <1 second
- Selection persists
