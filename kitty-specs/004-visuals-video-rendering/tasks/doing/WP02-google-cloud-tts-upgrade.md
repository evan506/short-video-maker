---
lane: "doing"
agent: "claude"
shell_pid: "39332"
---
# Work Package: WP02 - Google Cloud TTS Upgrade

**Work Package ID**: WP02
**Feature**: 004-visuals-video-rendering
**Status**: doing
**Created**: 2026-01-08

---

## Objective

Upgrade from Edge TTS to Google Cloud TTS with word-level timing support for Karaoke subtitles. This enables the FR-12 Karaoke feature where words highlight individually as they're spoken.

**Subtasks**:
- T021: Install `@google-cloud/text-to-speech` dependency
- T022: Create `src/server/services/google-tts-service.ts` wrapper
- T023: Configure Google Cloud TTS client with API credentials
- T024: Implement TTS synthesis with `enableTimepoints: ['WORDS']` parameter
- T025: Parse `timepoints` array from API response into word timings
- T026: Store word timings in `scenes.subtitle_timing` JSONB column
- T027: Implement fallback to sentence-level timing if word timings unavailable
- T028: Add retry logic with exponential backoff (max 3 attempts)
- T029: Handle API quota errors (HTTP 429) with graceful degradation
- T030: Write unit tests for timing parser and fallback logic

---

## Context

Google Cloud TTS provides `timepoints` API with word-level timestamps, which Edge TTS lacks. This is critical for the Karaoke subtitle preset where words highlight individually in sync with audio.

**API Response Format**:
```json
{
  "timepoints": [
    {"timeSeconds": 0.0, "markName": "word0"},
    {"timeSeconds": 0.2, "markName": "word1"}
  ]
}
```

**Storage Format** (scenes.subtitle_timing):
```json
[
  {"word": "The", "start_ms": 0, "end_ms": 200},
  {"word": "steak", "start_ms": 200, "end_ms": 500}
]
```

---

## Subtask Guidance

### T021-T023: Setup Google Cloud TTS Client
Install SDK, create service wrapper, configure with credentials from environment variables.

### T024-T026: Implement TTS with Timepoints
Call `synthesizeSpeech` with `enableTimepoints: ['WORDS']`, parse response into JSONB format, store in database.

### T027: Implement Fallback Logic
If timepoints array is empty, fall back to sentence-level highlighting: `[{sentence: "Full text", start_ms: 0, end_ms: 1200}]`

### T028-T029: Error Handling
Retry transient errors with 1s, 2s, 4s backoff. Handle 429 quota errors gracefully.

### T030: Write Unit Tests
Test timing parser, fallback logic, error cases with mocked API responses.

---

## Definition of Done

- [ ] Google Cloud TTS generates audio files successfully
- [ ] Word-level timings stored in `scenes.subtitle_timing`
- [ ] Fallback to sentence-level timing works
- [ ] Retry logic handles transient errors
- [ ] Unit tests cover timing parser, fallback, errors
- [ ] Cost per render <2 cents

---

## Risks

**Risk**: API key may exceed quota → Monitor usage, implement caching (Phase 2)
**Risk**: Word-level timing unavailable for some languages → Fallback documented
**Risk**: API response format differs for Standard vs Wavenet → Test both voice types

---

## Activity Log

- 2026-01-09T07:33:00Z – claude – shell_pid=39332 – lane=doing – Started implementation
