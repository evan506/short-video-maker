# Feature Specification: Audio Voiceover Integration with Edge TTS

**Feature Branch**: `003-audio-voiceover-integration`
**Created**: 2026-01-06
**Status**: Draft
**Input**: User description: "003-audio-voiceover-integration

I want to follow the AutoShorts_PRD.md as the main context for user flow and overall goals.
However, for the technical implementation of TTS, I want to deviate slightly to prioritize Cost Efficiency for MVP.

Specific Strategy:
1. TTS Provider: Use Edge TTS (as listed in docs/phase3-audio-integration.md as the Free Alternative).
   Reason: It requires no credit card/API key and provides high-quality neural voices for free, which is perfect for this experimental phase.
   Do NOT use Azure or Google Cloud for now.
2. Music & Mixing: Follow the PRD and Phase 3 doc (Youtube Audio Library + FFmpeg).
3. Database: Use the schema defined in docs/phase3-audio-integration.md.

Please draft the spec with Edge TTS as the core engine.

Key Implementation Decisions:
- Q1: Small curated starter set (~20-30 pre-selected tracks covering common moods)
- Q2: Supabase Storage (integrated with existing stack)
- Q3: Include Scene TTS Preview (no cost with free Edge TTS)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voice Selection and Voiceover Generation (Priority: P1)

As a creator, I want to select a voice from a library and hear how my scene narration sounds with that voice, so that I can choose the best narrator for my video before committing to the final render.

**Why this priority**: This is the core value of the feature - audio generation. Without voiceover generation, the product cannot function. This is P1 because it's essential for the MVP.

**Independent Test**: Can be fully tested by selecting a voice, generating a voiceover for a scene, and playing back the audio. Delivers the primary value: "I can hear my script spoken aloud before rendering."

**Acceptance Scenarios**:

1. **Given** a user has created scenes with narration text, **When** they navigate to the voice library, **Then** they see a list of available voices with sample audio playback
2. **Given** a user is viewing the voice library, **When** they click a "Play Sample" button on any voice card, **Then** they hear a pre-recorded sample of that voice without generating new audio
3. **Given** a user has selected a voice, **When** they click "Apply Voice" or similar action, **Then** the voice is saved to their project and UI shows the selected voice
4. **Given** a user has selected a voice and has scenes with narration, **When** they click "Preview Voiceover" on a scene, **Then** the system generates TTS audio for that scene's narration text and plays it back within 5 seconds
5. **Given** a user has generated a scene TTS preview, **When** they generate another preview for the same scene with the same voice and text, **Then** the cached audio is replayed without re-generation

---

### User Story 2 - Background Music Selection and Audio Mixing (Priority: P1)

As a creator, I want to add background music to my scenes and adjust volume levels, so that my videos have professional audio with voiceover clearly audible above the music.

**Why this priority**: Music is essential for video engagement. Without background music mixing, videos feel incomplete. This is P1 because it's required for the final video output.

**Independent Test**: Can be fully tested by selecting music from the library, adjusting volumes, and hearing the mixed audio. Delivers: "I can create professional-sounding audio for my videos."

**Acceptance Scenarios**:

1. **Given** a user is in the storyboard editor, **When** they open the music selection panel, **Then** they see ~20 curated tracks organized by mood (upbeat, calm, dramatic, inspirational)
2. **Given** a user is browsing the music library, **When** they click a track card, **Then** they hear a preview of that track
3. **Given** a user has selected a music track, **When** they click "Apply to Scene", **Then** the track is associated with that scene
4. **Given** a user has a scene with both voiceover and background music, **When** they adjust volume sliders (voiceover volume and music volume), **Then** they can hear the mixed audio with the new balance applied
5. **Given** a user has configured audio settings for a scene, **When** they save changes, **Then** the mixed audio is generated and stored for use in final video rendering

---

### User Story 3 - Batch Voiceover Generation for All Scenes (Priority: P2)

As a creator, I want to generate voiceovers for all my scenes at once, so that I can quickly progress to video rendering without manually generating each scene individually.

**Why this priority**: This is a convenience feature that improves efficiency. The product can function without it (users can generate scenes one-by-one), so it's P2.

**Independent Test**: Can be fully tested by clicking "Generate All Voiceovers" and verifying that all scenes receive generated audio. Delivers: "I can prepare all scene audio in one action."

**Acceptance Scenarios**:

1. **Given** a user has selected a voice and has multiple scenes, **When** they click "Generate All Voiceovers", **Then** the system queues TTS generation for all scenes
2. **Given** a batch voiceover generation is in progress, **When** the user views the progress, **Then** they see "X/Y scenes generated" status
3. **Given** batch generation encounters failures, **When** some scenes fail to generate, **Then** the system shows which scenes failed and provides retry options
4. **Given** all scenes have voiceovers generated, **When** generation completes, **Then** the user can proceed to video rendering

---

### User Story 4 - Audio Regeneration with Different Voices (Priority: P2)

As a creator, I want to regenerate voiceovers for specific scenes with different voices or settings, so that I can experiment and find the best audio presentation without regenerating everything.

**Why this priority**: This provides flexibility and experimentation capability. Users can work around failed scenes or try alternatives. P2 because the core feature works without it.

**Independent Test**: Can be fully tested by selecting a different voice, regenerating one scene's audio, and hearing the new version. Delivers: "I can iterate on individual scenes without affecting others."

**Acceptance Scenarios**:

1. **Given** a user has already generated voiceovers for scenes, **When** they select a different voice and click "Regenerate" on a specific scene, **Then** only that scene's audio is regenerated with the new voice
2. **Given** a user regenerates a scene's voiceover, **When** regeneration completes, **Then** the new audio replaces the old version and the scene shows updated duration
3. **Given** a user is unhappy with a regeneration, **When** they want to revert, **Then** they can undo back to the previous voiceover version (within a reasonable limit)

---

### Edge Cases

- What happens when TTS generation fails for a scene (network issues, Edge TTS service unavailable)?
  - System shows clear error message and provides retry button
  - Failed jobs are marked with error status in audio_generation_jobs table
  - Users can regenerate individual failed scenes

- What happens when the narration text is too long or contains unsupported characters?
  - Edge TTS handles text segmentation automatically
  - If generation fails due to text issues, error message guides user to simplify text
  - System logs the error with scene_id for debugging

- What happens when background music duration is shorter/longer than voiceover?
  - Shorter music: Music loops to match voiceover duration
  - Longer music: Music is trimmed or faded out at voiceover end
  - FFmpeg mixing handles duration mismatch automatically

- What happens when a user tries to generate voiceovers without selecting a voice?
  - System prevents generation and prompts user to select a voice first
  - Default voice may be pre-selected if available (e.g., "en-US-JennyNeural")

- What happens when audio file generation succeeds but storage upload fails?
  - System marks job as failed with storage error
  - Temporary local audio file is cleaned up
  - User can retry, which will regenerate and re-upload

- What happens when cached preview expires (TTL reached)?
  - System regenerates audio on next request
  - New cache entry is created with fresh TTL
  - User experience: brief loading but no errors

- What happens when multiple users generate audio simultaneously?
  - Each audio_generation_job is independent with unique scene_id
  - Edge TTS has no rate limits (free service)
  - Supabase Storage handles concurrent uploads
  - No user contention on resources

## Requirements *(mandatory)*

### Functional Requirements

**Voice Selection and Library**
- **FR-001**: System MUST provide a voice library with at least 10 distinct voice options covering different tones (warm, energetic, calm, professional)
- **FR-002**: Each voice card MUST display voice name, language, gender (if applicable), and a "Play Sample" button
- **FR-003**: Voice samples MUST be pre-recorded static audio files (not generated on-demand) to ensure instant playback
- **FR-004**: System MUST persist the user's selected voice in the projects.voice_id field
- **FR-005**: System MUST prevent TTS generation if no voice is selected, prompting user to choose first

**Scene TTS Preview**
- **FR-006**: System MUST allow users to generate TTS audio for individual scenes using the scene's narration_text
- **FR-007**: System MUST cache generated TTS previews in tts_previews table with text_hash to avoid regenerating identical requests
- **FR-008**: Cached TTS previews MUST have a TTL of 10 minutes (600 seconds) to balance storage and performance
- **FR-009**: System MUST provide visual feedback during TTS generation (loading state, progress indicator)
- **FR-010**: TTS preview generation MUST complete within 5 seconds for scenes under 50 words
- **FR-011**: System MUST provide play/pause/stop controls for generated audio previews

**Background Music Library**
- **FR-012**: System MUST provide a curated library of approximately 20 royalty-free music tracks
- **FR-013**: Music library MUST categorize tracks by mood: upbeat, calm, dramatic, inspirational (at minimum)
- **FR-014**: Each music track MUST display title, duration, mood tags, and a "Play Preview" button
- **FR-015**: All music tracks MUST be royalty-free and safe for use in short videos without attribution
- **FR-016**: Music track metadata MUST include energy_level (1-10), tempo (BPM), and tags for filtering

**Audio Mixing**
- **FR-017**: System MUST allow users to select a background music track for each scene
- **FR-018**: System MUST provide volume controls for both voiceover and background music (0-100% range)
- **FR-019**: System MUST mix voiceover and background music into a single audio track using FFmpeg
- **FR-020**: Mixed audio MUST normalize audio levels to prevent clipping or distortion
- **FR-021**: System MUST handle duration mismatch by looping short music or fading/trimming long music
- **FR-022**: System MUST support fade-in/fade-out transitions for background music (configurable duration, default 1-2 seconds)

**Batch Generation**
- **FR-023**: System MUST support batch TTS generation for all scenes in a project
- **FR-024**: Batch generation MUST show progress in "X/Y scenes generated" format
- **FR-025**: System MUST handle batch generation failures gracefully, continuing with remaining scenes
- **FR-026**: Batch generation MUST create one audio_generation_job record per scene for tracking

**Audio Storage and Persistence**
- **FR-027**: System MUST store all generated audio files (voiceover, music, mixed) in Supabase Storage
- **FR-028**: Audio files MUST be stored with appropriate access controls (RLS) so only the project owner can access them
- **FR-029**: System MUST store metadata for each audio file including duration, format, bitrate, and file size in scene_audio table
- **FR-030**: Audio storage URLs MUST be signed URLs with temporary access tokens for security

**Audio Regeneration**
- **FR-031**: System MUST allow users to regenerate voiceover for individual scenes with a different voice
- **FR-032**: Regenerated audio MUST replace the previous version in scene_audio table
- **FR-033**: System MUST support undo for the most recent regeneration (maintain one previous version)
- **FR-034**: Regeneration MUST be available regardless of render job status (unless final video is already exported)

**Error Handling and Resilience**
- **FR-035**: System MUST log all TTS generation attempts in audio_generation_jobs table with status (pending, processing, completed, failed)
- **FR-036**: When TTS generation fails, system MUST display user-friendly error message with retry option
- **FR-037**: System MUST automatically retry failed TTS generation up to 2 times before marking as failed
- **FR-038**: System MUST provide error codes and messages in audio_generation_jobs.error_message for debugging

**Integration with Existing Features**
- **FR-039**: Scene TTS generation MUST use the narration_text from the scenes table
- **FR-040**: Voiceover duration MUST update the scene's audio_duration_ms field
- **FR-041**: Final render jobs MUST use the mixed audio URL from scene_audio table for video rendering
- **FR-042**: Render job snapshot MUST include voice_id_snapshot to preserve voice selection at render time

### Key Entities

**scene_audio**
- Represents generated audio files for scenes (voiceover, background music, or mixed audio)
- Attributes: scene_id (foreign key), audio_type (voiceover/music/mixed), storage_url, duration_sec, file_format, bit_rate, sample_rate, file_size_bytes, metadata (JSONB)
- Relationships: Belongs to scenes, one scene can have multiple audio files (different types)

**audio_generation_jobs**
- Represents TTS generation job tracking for monitoring and debugging
- Attributes: scene_id (foreign key), job_type (voiceover/mixing), status (pending/processing/completed/failed), tts_provider (e.g., "edge-tts"), voice_name, options (JSONB), error_message, started_at, completed_at
- Relationships: Tracks generation attempts for scenes, enables retry logic

**background_music**
- Represents the curated library of royalty-free music tracks
- Attributes: title, artist, source_url, storage_url, duration_sec, mood (array), energy_level (1-10), tempo (BPM), genre, tags (array), is_royalty_free
- Relationships: Used by scenes for music selection, independent of projects

**tts_previews**
- Represents cached TTS preview audio for scene narration text
- Attributes: project_id, scene_id (foreign key), voice_id, text_hash, audio_url (storage path), created_at, expires_at
- Relationships: Links to scenes, enables caching by voice+text combination to avoid regenerating

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select a voice and generate TTS preview for a scene in under 10 seconds end-to-end (including UI response)
- **SC-002**: Batch voiceover generation for 10 scenes completes in under 60 seconds (average 6 seconds per scene including overhead)
- **SC-003**: Users can browse music library, select track, adjust volumes, and hear mixed audio within 30 seconds of opening the music panel
- **SC-004**: Audio mixing (voiceover + music) completes in under 3 seconds per scene
- **SC-005**: 95% of TTS generation attempts succeed on first try (excluding network/service outages)
- **SC-006**: All generated audio files are stored and retrievable with 100% reliability (no storage failures)
- **SC-007**: Mixed audio output has balanced levels where voiceover is clearly audible over background music at default settings (voiceover volume 80%, music volume 40%)
- **SC-008**: Cached TTS previews reduce repeat generation time by 90% (from ~5 seconds to <0.5 seconds)
- **SC-009**: Users can successfully complete end-to-end flow (select voice → generate previews → select music → mix audio) with zero errors in 90% of sessions
- **SC-010**: Feature adds zero incremental infrastructure cost at MVP scale (Edge TTS is free, Supabase Storage cost is ~$0.01/month for typical usage)

### User Experience Outcomes

- **SC-011**: Users can find and preview voices with 2 or fewer clicks from the storyboard editor
- **SC-012**: Voice sample playback starts within 1 second of clicking "Play Sample" button (pre-recorded files)
- **SC-013**: TTS preview generation progress is clearly visible with loading indicators and status messages
- **SC-014**: Music library loads within 2 seconds and categories are immediately visible
- **SC-015**: Volume adjustments provide real-time or near real-time feedback when mixed audio exists
- **SC-016**: Error messages are action-oriented (e.g., "Generation failed. Click to retry.") rather than technical

## Assumptions

1. **Edge TTS Service Availability**: Edge TTS is assumed to be reliably available as a free service. If the service becomes unavailable or rate-limited in the future, the system may need to migrate to a paid provider (Azure/Google).

2. **Audio Quality Standards**: Edge TTS neural voices are assumed to provide sufficient quality for MVP. User feedback may reveal need for premium voices (ElevenLabs) in post-MVP phases.

3. **Music Library Size**: 20 curated tracks are assumed sufficient for MVP testing. User feedback will guide expansion to full YouTube Audio Library (1,000+ tracks) in Phase 4.

4. **Storage Costs**: At MVP scale (100 projects × 30 scenes × 500KB audio files = ~1.5GB), Supabase Storage costs are negligible (~$0.03/month). This is acceptable for experimental phase.

5. **FFmpeg Availability**: FFmpeg is assumed to be available in the worker environment for audio mixing. If using serverless rendering, alternative mixing approaches may be needed.

6. **Concurrent User Load**: MVP is assumed to handle <10 concurrent users. Edge TTS has no rate limits, but Supabase Storage and worker capacity may need scaling at higher loads.

7. **Browser Audio Support**: Modern browsers (Chrome, Firefox, Safari, Edge) are assumed to support HTML5 audio playback for generated files. Legacy browsers are out of scope.

8. **Scene Narration Language**: MVP assumes English narration text. Edge TTS supports multiple languages, but language detection/selection is not explicitly required in this spec.

9. **Audio Format Standardization**: MP3 format at 128kbps, 44.1kHz is assumed sufficient for both voiceovers and mixed audio. Higher quality formats can be added later if needed.

10. **Undo Limitation**: Single-level undo (one previous version) is assumed sufficient for MVP. Advanced version history (unlimited undo) is deferred to Phase 4.

## Dependencies

**Prerequisites** (must exist before this feature):
- **Feature 001**: Script generation and editing (provides narration_text)
- **Feature 002**: Scene creation and storyboard editor (provides scenes to add audio to)
- **Feature 002**: Video media search and selection (provides visual content to pair with audio)

**Required Infrastructure**:
- Supabase Storage configured with appropriate buckets for audio files
- Edge TTS service accessible from worker environment (internet connectivity)
- FFmpeg installed and accessible in audio processing pipeline
- Background music files pre-loaded into Supabase Storage (curated ~20 tracks)

**Required Database Tables**:
- scenes (already exists from Feature 002)
- projects (already exists with voice_id field)
- scene_audio (new - defined in spec)
- audio_generation_jobs (new - defined in spec)
- background_music (new - defined in spec)
- tts_previews (new - defined in spec)

**Integration Points**:
- **Final Video Rendering** (Phase 4): Mixed audio output from this feature becomes audio input for video rendering
- **Voice Library UI**: New component in storyboard editor for voice selection
- **Music Library UI**: New panel in storyboard editor for music selection

## Out of Scope

The following are explicitly out of scope for this feature and deferred to future phases:

1. **Advanced Voice Customization**: Speed, pitch, and tone adjustments for TTS are not included (Edge TTS supports them, but UI is deferred)
2. **Multiple Voices in One Video**: All scenes must use the same voice. Per-scene voice selection is Phase 4
3. **Music Upload by Users**: Users cannot upload custom music tracks in MVP. Only the curated library is available
4. **Automatic Music Matching**: Music is manually selected by users. Automatic mood-based matching is Phase 4
5. **Advanced Audio Effects**: Effects like reverb, echo, EQ are not included
6. **Waveform Visualization**: Audio waveforms for editing are not displayed in MVP
7. **Real-time Audio Streaming**: All audio is generated and stored as files. No real-time streaming synthesis
8. **Multi-language Voice Selection**: Voice library assumes English. Other languages are not explicitly surfaced
9. **Audio Export as Standalone**: Users cannot download just the audio track (only final video export in Phase 4)
10. **Collaborative Voice Selection**: Teams cannot vote on or discuss voice choices (single-user workflow)
11. **Voice Cloning**: Custom voice cloning is not included (would require premium services like ElevenLabs)
12. **SSML Support**: Advanced SSML markup for TTS is not exposed in UI
13. **Background Music Fading Curves**: Only linear fade-in/out is supported. Custom fade curves are Phase 4
14. **Audio Compression Optimization**: Files are stored at standard quality. Advanced compression is not included

## Open Questions

*No open questions remain. All critical decisions have been clarified through discovery interview.*
