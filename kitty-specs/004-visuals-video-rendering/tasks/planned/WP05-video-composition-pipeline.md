# Work Package: WP05 - Video Composition Pipeline

**Work Package ID**: WP05
**Feature**: 004-visuals-video-rendering
**Status**: planned
**Created**: 2026-01-08

---

## Objective

Implement Remotion composition that combines media, audio, and subtitles into final MP4 video. This is the core rendering functionality.

**Subtasks**:
- T051: Create `VideoComposition.tsx` main composition component
- T052: Create `Scene.tsx` component for individual scenes
- T053: Implement `<Video>` component for media playback with loop/trim logic
- T054: Implement `<Audio>` component for mixed audio playback
- T055: Integrate subtitle components (Minimal, Highlight, Karaoke) as overlays
- T056: Implement scene sequencing with `<Sequence>` component
- T057: Handle missing media (colored fallback with narration text)
- T058: Handle missing audio (silent video)
- T059: Configure Remotion render settings (codec H.264, AAC audio, 30fps)
- T060: Write `src/server/workers/composite-worker.ts` to orchestrate rendering

---

## Context

The Remotion composition queries scenes, media_assets, and scene_audio from the database, then layers components: `<Video>` → `<Audio>` → `<Subtitle>` for each scene using `<Sequence>`.

**Output Format**:
- Codec: H.264
- Audio: AAC
- Resolution: 1080x1920 (9:16 aspect ratio)
- FPS: 30
- Container: MP4

**Performance Target**: 60-second video renders in <120 seconds on 2 vCPU, 4GB RAM.

---

## Subtask Guidance

### T051-T052: Composition Structure
Create VideoComposition that accepts projectId and renderJobId. Query database for scenes, media, audio. Create Scene component for each scene.

### T053-T055: Media, Audio, Subtitle Components
Layer components using `<AbsoluteFill>`. Handle media loops (if shorter than audio) and trims (if longer with 1s fade-out). Reuse subtitle components from WP03.

### T056: Scene Sequencing
Use `<Sequence>` for each scene with duration calculated from TTS audio length.

### T057-T058: Fallback Handling
Show colored background with narration text if media missing. Render silent video if audio missing.

### T059-T060: Render Configuration
Configure codec, FPS, resolution. Create composite-worker to orchestrate rendering via Remotion CLI.

---

## Definition of Done

- [ ] Remotion composition renders successfully to MP4
- [ ] Subtitles overlay correctly on video
- [ ] Audio syncs with video
- [ ] Media fallback renders colored background
- [ ] Output plays in VLC, QuickTime, mobile players
- [ ] 60-second video renders in <120 seconds

---

## Risks

**Risk**: Render timeout for long videos → Set 10-minute timeout
**Risk**: Media URLs expire → Download to worker disk before rendering
**Risk**: Codec incompatibility → Test with multiple players
