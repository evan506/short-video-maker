---
work_package_id: "WP06b"
subtasks: ["T045", "T046", "T047", "T048"]
lane: "planned"
title: "Audio Mixer UI (Frontend)"
---

# WP06b: Audio Mixer UI (Frontend)

## Overview
Frontend-only implementation of audio mixer UI components with volume controls and job status polling.
Split from original WP06 to separate worker and UI concerns.

## Subtasks
- T045: Create AudioMixer.tsx UI
- T046: Add "Mix Audio" button
- T047: Poll job status
- T048: Display mixed audio player

## Dependencies
- WP02 (Voiceover must be generated)
- WP05 (Music must be selected)
- WP06a (Audio mixing worker must be running)

## Definition of Done
- UI displays volume controls
- Mixing progress shown
- Mixed audio plays when complete
