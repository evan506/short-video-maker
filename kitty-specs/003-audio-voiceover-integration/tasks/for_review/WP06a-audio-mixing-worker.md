---
work_package_id: "WP06a"
subtasks: ["T037", "T038", "T039", "T040", "T041", "T042", "T043", "T044"]
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "1069"
title: "Audio Mixing Worker (Backend)"
history:
  - date: 2026-01-08
    event: Created from WP06 split
  - date: 2026-01-08T13:00:00Z
    event: Moved to doing lane - Started implementation
  - date: 2026-01-08T14:30:00Z
    event: Implementation complete - All 8 subtasks implemented, ready for review
---

# WP06a: Audio Mixing Worker (Backend)

## Overview
Backend-only implementation of FFmpeg-based audio mixing service in worker process.
Split from original WP06 to separate worker and UI concerns.

## Subtasks
- T037: Install fluent-ffmpeg package
- T038: Create audio-mixing.ts in worker
- T039: Implement mix with volume controls (0.8/0.4)
- T040: Add fade-in/fade-out support
- T041: Handle duration mismatch (loop/trim)
- T042: Create POST /api/scenes/:sceneId/audio/mix
- T043: Worker polls pending jobs
- T044: Upload mixed audio to Storage

## Dependencies
- WP02 (TTS service for voiceover audio)
- WP05 (music library for background music)
- WP01 (scene_audio table for storage)

## Definition of Done
- Mixing in <3s
- Balanced audio
- Job tracking works
