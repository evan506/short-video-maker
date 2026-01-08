# Quickstart: Audio Voiceover Integration Validation

**Feature**: 003 - Audio Voiceover Integration with Edge TTS
**Date**: 2026-01-06

## Prerequisites

- Database migration applied
- Supabase Storage buckets created (`audio-files`, `music-library`)
- Background music library seeded (~20 tracks)
- Edge TTS accessible
- FFmpeg installed in worker environment

## Validation Scenarios

### Scenario 1: Voice Selection (P1)

1. Navigate to storyboard editor
2. Click "Voice Library"
3. **Expected**: See 10+ voices with "Play Sample" buttons
4. Click "Play Sample" on any voice
5. **Expected**: Audio plays within 1 second
6. Click "Apply Voice"
7. **Expected**: Voice saved to project

### Scenario 2: TTS Preview (P1)

1. Ensure project has selected voice
2. Click "Preview Voiceover" on scene
3. **Expected**: Loading indicator, generation completes in <5 seconds
4. **Expected**: Audio player appears with duration
5. Click "Preview Voiceover" again
6. **Expected**: Audio appears instantly (cached)

### Scenario 3: Music Selection (P1)

1. Open music panel
2. **Expected**: See ~20 tracks organized by mood
3. Filter by "upbeat"
4. **Expected**: Only upbeat tracks shown
5. Click track card
6. **Expected**: Preview plays
7. Click "Apply to Scene"
8. **Expected**: Track assigned to scene

### Scenario 4: Audio Mixing (P1)

1. Ensure scene has voiceover + music
2. Click "Mix Audio"
3. **Expected**: Mixer UI appears with volume sliders
4. Adjust volumes (voiceover 90%, music 30%)
5. Click "Generate Mixed Audio"
6. **Expected**: Completes in <3 seconds
7. Play mixed audio
8. **Expected**: Voiceover clearly audible over music

### Scenario 5: Batch Generation (P2)

1. Open project with 10+ scenes
2. Click "Generate All Voiceovers"
3. **Expected**: Progress shows "X/Y scenes generated..."
4. **Expected**: All scenes complete in ~60 seconds

### Edge Cases

- Empty narration text → Error message
- TTS service down → Retry button, job marked failed
- Music shorter/longer than voiceover → Loops or trims correctly
- Cache expires → Regenerates on next request

## Performance Benchmarks

| Metric | Target |
|--------|--------|
| Voice library load | <2 seconds |
| TTS generation (short) | <3 seconds |
| TTS generation (medium) | <5 seconds |
| Audio mixing | <3 seconds |
| Batch (10 scenes) | <60 seconds |
| Cache hit retrieval | <0.5 seconds |

## Success Criteria

✅ All P1 scenarios (1-4) complete without critical errors
✅ 90% of P2 scenarios (5) complete successfully
✅ Performance benchmarks meet targets within 20% tolerance
