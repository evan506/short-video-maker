---
work_package_id: "WP06"
subtasks: ["T037", "T038", "T039", "T040", "T041", "T042", "T043", "T044", "T045", "T046", "T047", "T048"]
lane: "planned"
title: "Audio Mixing Worker & UI"
---

# WP06: Audio Mixing Worker & UI

## Subtasks
- T037: Install fluent-ffmpeg
- T038: Create audio-mixing.ts in worker
- T039: Implement mix with volume controls (0.8/0.4)
- T040: Add fade-in/fade-out support
- T041: Handle duration mismatch (loop/trim)
- T042: Create POST /api/scenes/:sceneId/audio/mix
- T043: Worker polls pending jobs
- T044: Upload mixed audio to Storage
- T045: Create AudioMixer.tsx UI
- T046: Add "Mix Audio" button
- T047: Poll job status
- T048: Display mixed audio player

## Dependencies
- WP02, WP05

## Definition of Done
- Mixing in <3s
- Balanced audio
- Job tracking works
