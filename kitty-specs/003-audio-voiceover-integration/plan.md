# Implementation Plan: Audio Voiceover Integration with Edge TTS

**Branch**: `003-audio-voiceover-integration` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/kitty-specs/003-audio-voiceover-integration/spec.md`

## Summary

Implement end-to-end audio generation system for AutoShorts MVP using free Edge TTS for voiceovers, curated background music library (~20 tracks), Supabase Storage for audio persistence, and FFmpeg-based audio mixing in a dedicated AWS worker. The system will generate voiceovers from scene narration text, provide scene-level TTS preview, mix voiceover with background music, and store results for final video rendering (Phase 4).

**Key Technical Decisions**:
- **TTS Engine**: Edge TTS via Node.js wrapper in Next.js API routes (low-latency previews)
- **Audio Processing**: FFmpeg in dedicated AWS worker (CPU-intensive mixing operations)
- **Music Library**: One-time admin script to seed ~20 curated tracks to Supabase
- **Caching**: Supabase Storage + tts_previews table with 10-minute TTL
- **Audio Quality**: MP3 128kbps, 44.1kHz (standard quality, mobile-optimized)

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x
**Primary Dependencies**:
- Edge TTS: `edge-tts` or similar Node.js wrapper for Microsoft Edge TTS API
- Audio Processing: FFmpeg (via `fluent-ffmpeg` Node.js wrapper)
- Storage: Supabase Storage SDK (`@supabase/supabase-js`)
- Database: Supabase Postgres with existing schema extensions
**Storage**: Supabase Postgres (scenes, audio metadata), Supabase Storage (audio files)
**Testing**: Manual testing via UI, automated integration tests for critical paths (optional in MVP)
**Target Platform**: Next.js App Router (Vercel) + AWS Worker (ECS/Docker)
**Project Type**: Web application (frontend + backend + worker)
**Performance Goals**:
- TTS preview generation: <5 seconds for scenes under 50 words
- Batch voiceover generation: ~6 seconds per scene average
- Audio mixing: <3 seconds per scene
- Audio playback start: <1 second for cached previews
**Constraints**:
- Edge TTS is free but requires internet connectivity
- FFmpeg operations can exceed Vercel's 10-second timeout, necessitating worker service
- Supabase Storage has 50MB file size limit (sufficient for short-form audio)
**Scale/Scope**:
- MVP: <100 projects, ~10 concurrent users
- Audio storage: ~1.5GB total (100 projects × 30 scenes × 500KB per file)
- Cost target: <$5/month infrastructure for MVP scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project constitution exists. All design decisions follow PRD architecture (Next.js + Supabase + AWS Worker) and MVP cost-efficiency goals.

## Project Structure

### Documentation (this feature)

```
kitty-specs/003-audio-voiceover-integration/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (Edge TTS evaluation, FFmpeg patterns)
├── data-model.md        # Phase 1 output (schema for scene_audio, audio_generation_jobs, background_music, tts_previews)
├── quickstart.md        # Phase 1 output (validation scenarios)
├── contracts/           # Phase 1 output (API endpoint specifications)
│   ├── voices.yaml      # Voice library API
│   ├── tts-preview.yaml # TTS generation API
│   ├── music.yaml       # Music library API
│   └── audio-mixing.yaml # Audio mixing API
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
src/
├── server/
│   ├── services/
│   │   ├── tts-service.ts          # Edge TTS integration (Node.js wrapper)
│   │   ├── audio-storage.ts        # Supabase Storage operations
│   │   ├── music-library.ts        # Background music management
│   │   └── audio-cache.ts          # TTS preview caching logic
│   ├── routers/
│   │   └── audio-router.ts         # API endpoints for voices, TTS, music
│   └── utils/
│       ├── audio-processor.ts      # Audio format utilities
│       └── text-hasher.ts          # Hash narration_text for cache keys
│
├── worker/
│   ├── services/
│   │   └── audio-mixing.ts         # FFmpeg audio mixing (runs in AWS worker)
│   └── utils/
│       └── ffmpeg-wrapper.ts       # FFmpeg command builder
│
└── ui/components/
    ├── audio/
    │   ├── VoiceLibrary.tsx        # Voice selection UI with sample playback
    │   ├── TTSPreviewPlayer.tsx    # Scene TTS preview component
    │   ├── MusicLibrary.tsx        # Background music selection
    │   ├── AudioMixer.tsx          # Volume controls and mixed audio preview
    │   └── BatchVoiceoverGenerator.tsx # Batch generation progress UI
    └── hooks/
        ├── useVoiceSelection.ts    # Voice selection state management
        ├── useTTSPreview.ts        # TTS preview generation and caching
        └── useAudioMixing.ts       # Audio mixing controls

scripts/
└── seed-music-library.ts           # One-time admin script to populate music library

supabase/migrations/
└── 20250106_audio_voiceover_integration.sql  # Database schema
```

**Structure Decision**: Web application with clear separation between Next.js API routes (low-latency TTS previews) and AWS worker (CPU-intensive audio mixing). Frontend components organized by feature (voice selection, TTS preview, music, mixing). Shared utilities for audio processing and text hashing.

## Parallel Work Analysis

### Dependency Graph

```
Foundation (Database Schema + Admin Script) → Wave 1 (TTS Service + Voice Library UI) [parallel with Music Library] → Wave 2 (Audio Mixing Worker + Mixer UI) → Integration (Batch Generation + End-to-End Testing)
```

### Work Distribution

- **Sequential work**: Database schema must be created first, then music library seeded, before any audio services can function
- **Parallel streams**:
  - Stream A: TTS service + Voice Library UI (independent of music)
  - Stream B: Music library service + Music Library UI (independent of TTS)
  - Stream C: Audio mixing worker + Audio Mixer UI (depends on both A and B)
- **Agent assignments**: To avoid conflicts, assign different files/modules to different agents (e.g., Agent 1: TTS service, Agent 2: Music library, Agent 3: Audio mixing worker)

### Coordination Points

- **Sync schedule**: After Wave 1 (TTS + Music) complete, before starting Wave 2 (Audio Mixing)
- **Integration tests**: After Wave 2 complete, verify end-to-end flow (select voice → generate TTS → select music → mix audio → use in render)

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **Edge TTS Node.js Wrapper Evaluation**
   - Evaluate available Node.js packages for Edge TTS integration
   - Test voice quality and generation speed
   - Confirm no API key or rate limits
   - Document supported voices, languages, and audio formats

2. **FFmpeg Audio Mixing Patterns**
   - Research FFmpeg command patterns for:
     - Mixing two audio tracks with volume control
     - Looping short music to match voiceover duration
     - Trimming/fading long music tracks
     - Normalizing audio levels
   - Test performance benchmarks (mixing time per scene)
   - Validate MP3 output quality at 128kbps, 44.1kHz

3. **Supabase Storage Best Practices for Audio**
   - Research signed URL generation and TTL policies
   - Test audio file upload/download performance
   - Confirm RLS policy integration for per-user access control
   - Document storage costs at MVP scale (~1.5GB)

4. **Background Music Sourcing**
   - Identify 20 royalty-free music tracks covering moods (upbeat, calm, dramatic, inspirational)
   - Confirm licensing for commercial use in short videos
   - Document metadata schema (title, artist, mood, energy_level, tempo, tags)
   - Source high-quality MP3 files (192kbps source, downmix to 128kbps if needed)

5. **Caching Strategy Validation**
   - Test Supabase query performance for tts_previews table lookups by text_hash
   - Benchmark cache hit vs. miss scenarios
   - Confirm 10-minute TTL is appropriate for MVP usage patterns
   - Document cache invalidation approach (expiration vs. manual)

## Phase 1: Design Artifacts

### Data Model Schema

Define entities:
- **scene_audio**: Stores generated audio file metadata (voiceover, music, mixed)
- **audio_generation_jobs**: Tracks TTS and mixing job status
- **background_music**: Curated library of ~20 royalty-free tracks
- **tts_previews**: Cached TTS preview audio with text_hash deduplication

(See `data-model.md` for detailed schema)

### API Contracts

Define REST endpoints:
- `GET /api/v1/voices` - List available voices with sample URLs
- `PATCH /api/v1/projects/:projectId/voice` - Set project voice selection
- `POST /api/v1/scenes/:sceneId/tts/preview` - Generate TTS preview for scene
- `GET /api/v1/music/library` - List background music tracks (filterable by mood)
- `POST /api/v1/scenes/:sceneId/music/select` - Assign music track to scene
- `POST /api/v1/scenes/:sceneId/audio/mix` - Mix voiceover + music (worker job)
- `GET /api/v1/scenes/:sceneId/audio/status` - Check audio generation job status

(See `contracts/` directory for OpenAPI specifications)

### Quickstart Scenarios

(See `quickstart.md` for validation scenarios):
1. User selects voice and generates TTS preview for scene
2. User selects background music and adjusts volumes
3. System mixes voiceover + music into final audio track
4. Batch voiceover generation for all project scenes

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Edge TTS service becomes unavailable or rate-limited | High (blocks TTS generation) | Low | Document migration path to Azure/Google TTS in Phase 4; build abstraction layer for easy TTS provider swap |
| FFmpeg worker exceeds memory/CPU limits under load | Medium (slow or failed mixing) | Medium | Implement job queue with concurrency limits; monitor worker metrics; provide retry logic |
| Supabase Storage egress costs spike at scale | Medium (cost overrun) | Low (MVP scale) | Monitor storage usage; set budget alerts; implement CDN caching if needed in Phase 4 |
| Background music licensing issues | High (legal/commercial risk) | Low | Verify royalty-free status for all 20 tracks; document licenses; prefer YouTube Audio Library sources |
| Audio quality insufficient for premium feel | Low (UX issue) | Medium | User testing validates 128kbps quality; plan higher quality tier for Phase 4 if needed |

## Post-Phase 1 Constitution Re-Check

*GATE: Must pass before proceeding to task generation*

✅ **No constitution exists** - All design decisions align with PRD architecture and MVP cost-efficiency goals.

## Next Steps

After Phase 1 artifacts are complete:
1. Review `data-model.md` for schema completeness
2. Validate `contracts/*.yaml` cover all user stories from spec
3. Test `quickstart.md` scenarios manually (optional, recommended)
4. Run `/spec-kitty.tasks` to generate work packages and subtasks

**DO NOT** proceed to `/spec-kitty.tasks` until all Phase 1 artifacts are validated and approved.
