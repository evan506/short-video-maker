---
work_package_id: "WP07"
subtasks: ["T049", "T050", "T051", "T052", "T053", "T054", "T055", "T056", "T057"]
lane: "doing"
assignee: "claude"
agent: "claude"
shell_pid: "1069"
title: "Batch Voiceover Generation"
history:
  - date: 2026-01-08
    event: Moved to doing lane - Started implementation
---

# WP07: Batch Voiceover Generation

## Subtasks
- T049: Add "Generate All" button
- T050: Create POST /api/scenes/tts/batch
- T051: Generate jobs for all scenes
- T052: Worker processes in parallel
- T053: Create BatchVoiceoverGenerator.tsx
- T054: Show "X/Y generated" progress
- T055: Show per-scene status
- T056: Handle failures gracefully
- T057: Add "Retry Failed" button

## Dependencies
- WP02, WP04

## Definition of Done
- Batch processes all scenes
- Progress accurate
- Failures don't block
- Retry works
