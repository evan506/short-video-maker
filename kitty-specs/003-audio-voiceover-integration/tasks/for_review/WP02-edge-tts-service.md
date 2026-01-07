---
work_package_id: "WP02"
subtasks: ["T007", "T008", "T009", "T010", "T011", "T012", "T013", "T014", "T015"]
lane: "for_review"
title: "Edge TTS Service Integration"
agent: "claude"
shell_pid: "8683"
history:
  - date: 2026-01-06
    event: Created
---

# WP02: Edge TTS Service Integration

## Objective
Integrate Edge TTS (free) for voiceover generation with caching, storage, and API endpoints.

## Subtasks
- T007: Install edge-tts package
- T008: Create tts-service.ts
- T009: Implement generateVoiceover() with retry logic
- T010: Create text-hasher.ts for SHA-256
- T011: Create audio-storage.ts for Supabase Storage operations
- T012: Implement signed URL generation (60s TTL)
- T013: Create POST /api/scenes/:sceneId/tts/preview endpoint
- T014: Insert cache records to tts_previews with 10-min TTL
- T015: Create audio-cache.ts with cache cleanup

## Dependencies
- WP01 must be complete

## Definition of Done
- TTS generation works in <5 seconds
- Cache prevents regeneration
- Signed URLs work for playback

## Activity Log

- 2026-01-07T01:08:08Z – claude – shell_pid=8683 – lane=doing – Started implementation
- 2026-01-07T01:25:00Z – claude – shell_pid=8683 – lane=doing – Completed implementation of all 9 subtasks (T007-T015)
- 2026-01-07T01:19:30Z – claude – shell_pid=8683 – lane=for_review – Ready for review
