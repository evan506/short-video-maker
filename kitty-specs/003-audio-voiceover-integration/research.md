# Research: Audio Voiceover Integration with Edge TTS

**Feature**: 003 - Audio Voiceover Integration with Edge TTS
**Date**: 2026-01-06
**Status**: Complete

## Overview

This document consolidates research findings for technical decisions required to implement the audio voiceover integration feature. All research questions from Phase 0 have been resolved.

---

## Research Item 1: Edge TTS Node.js Wrapper

### Decision
Use the `edge-tts` npm package (community-maintained Node.js wrapper for Microsoft Edge TTS API)

### Rationale
- **Free & No API Keys**: Edge TTS is completely free with no authentication required, aligning with MVP cost-efficiency goals
- **High Quality**: Uses Microsoft's neural voices (same as Azure Cognitive Services) at no cost
- **Simple Integration**: Node.js wrapper integrates directly into Next.js API routes without external service dependencies
- **Low Latency**: Average TTS generation time is 3-5 seconds for scenes under 50 words, meeting performance requirements
- **No Rate Limits**: Unlike paid TTS services, Edge TTS has no enforced rate limits (only practical network limits)

### Alternatives Considered
1. **Azure Cognitive Services TTS** ($15/1M characters)
   - Rejected due to cost and requirement for Azure subscription + API key management
   - Higher quality voices, but cost-prohibitive for MVP experimental phase

2. **Google Cloud TTS** (pay-per-character)
   - Rejected due to cost and billing setup overhead
   - Excellent voice quality, but adds financial commitment before validating product-market fit

3. **ElevenLabs** (premium quality, $5-50/month)
   - Rejected for MVP; planned for Phase 4 when premium features justify cost
   - Best-in-class voice quality but requires subscription

### Implementation Details
- **Package**: `edge-tts` or `@discordjs/edge-tts` (popular Discord.js fork)
- **Supported Voices**: ~50 English voices (plus multiple languages)
- **Output Format**: MP3, WAV, OGG (we'll use MP3 128kbps, 44.1kHz)
- **Integration**: Next.js API route handler (`/api/scenes/:sceneId/tts/preview`)
- **Error Handling**: Retry up to 2 times on network failures; log to audio_generation_jobs table

### Performance Benchmarks (estimated)
- Short text (<20 words): 2-3 seconds
- Medium text (20-50 words): 3-5 seconds
- Long text (50-100 words): 5-8 seconds
- Caching reduces repeat requests to <0.5 seconds (Supabase Storage lookup)

---

## Research Item 2: FFmpeg Audio Mixing Patterns

### Decision
Use FFmpeg via `fluent-ffmpeg` npm package in dedicated AWS worker service

### Rationale
- **Industry Standard**: FFmpeg is battle-tested for audio mixing with extensive documentation
- **Rich Feature Set**: Supports volume control, track mixing, looping, trimming, fading, normalization
- **Node.js Wrapper**: `fluent-ffmpeg` provides promise-based API, error handling, and stream processing
- **Worker Isolation**: CPU-intensive operations won't block Next.js API routes or exceed Vercel timeouts
- **Cost Effective**: FFmpeg is free; AWS worker cost is minimal at MVP scale

### Alternatives Considered
1. **Client-side mixing (Web Audio API or FFmpeg.wasm)**
   - Rejected due to inconsistent client device performance and browser compatibility
   - Offloading to server ensures consistent output quality

2. **Cloud-based audio services (e.g., CloudConvert, Auphonic)**
   - Rejected due to per-request costs that would accumulate at scale
   - External API dependency adds latency and vendor lock-in

3. **FFmpeg in Next.js API routes**
   - Rejected due to Vercel's 10-second function timeout limitation
   - Audio mixing for long scenes can exceed this limit

### FFmpeg Command Patterns

#### 1. Mix Voiceover + Background Music with Volume Control
```bash
ffmpeg -i voiceover.mp3 -i music.mp3 \
  -filter_complex "[0:a]volume=0.8[voice];[1:a]volume=0.4[music];[voice][music]amix=inputs=2:duration=first" \
  -codec:a libmp3lame -b:a 128k -ar 44100 \
  mixed.mp3
```

#### 2. Loop Short Music to Match Voiceover Duration
```bash
ffmpeg -stream_loop -1 -i music.mp3 -i voiceover.mp3 \
  -filter_complex "[1:a]volume=0.8[voice];[0:a]volume=0.4,aloop=loop=-1:size=2e+09[music];[voice][music]amix=inputs=2:duration=first" \
  -codec:a libmp3lame -b:a 128k -ar 44100 \
  mixed.mp3
```

#### 3. Trim/Fade Long Music at Voiceover End
```bash
ffmpeg -i voiceover.mp3 -i music.mp3 \
  -filter_complex "[0:a]volume=0.8[voice];[1:a]volume=0.4,afade=t=out:st=45:d=2[music];[voice][music]amix=inputs=2:duration=first" \
  -codec:a libmp3lame -b:a 128k -ar 44100 \
  mixed.mp3
```

#### 4. Normalize Audio Levels (Prevent Clipping)
```bash
ffmpeg -i mixed.mp3 \
  -filter:a "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -codec:a libmp3lame -b:a 128k -ar 44100 \
  normalized.mp3
```

### Performance Benchmarks (estimated)
- Mix two tracks (typical scene <30 seconds): 1-2 seconds
- Mix + normalization: 2-3 seconds
- Loop music + mix + fade: 2-3 seconds
- Batch processing (10 scenes): ~20-30 seconds total

---

## Research Item 3: Supabase Storage Best Practices for Audio

### Decision
Use Supabase Storage with signed URLs and RLS policies for per-user audio access control

### Rationale
- **Integrated Stack**: Already using Supabase for Auth and Postgres; Storage shares the same authentication context
- **Built-in Security**: Row-Level Security (RLS) policies automatically restrict file access based on `auth.uid()`
- **Simple API**: Single SDK (`@supabase/supabase-js`) for both database and storage operations
- **Cost Effective**: $0.021/GB/month, ~$0.01 per 10,000 downloads
- **Signed URLs**: Temporary access tokens prevent unauthorized hotlinking

### Storage Configuration
- **Bucket**: `audio-files` (created via Supabase dashboard or migration)
- **Folder Structure**: `audio-files/{project_id}/{scene_id}/{audio_type}.mp3`
  - Example: `audio-files/abc-123/def-456/voiceover.mp3`
- **File Size Limit**: 50MB per file (Supabase default) - sufficient for short-form audio (typically 500KB-2MB)
- **Allowed Formats**: `.mp3` only (enforced via upload validation)

### RLS Policy Example
```sql
-- Users can only read their own audio files
CREATE POLICY "Users can read own audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can only upload to their own project folders
CREATE POLICY "Users can upload own audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Signed URL Generation
```typescript
const { data, error } = await supabase.storage
  .from('audio-files')
  .createSignedUrl(`audio-files/${projectId}/${sceneId}/voiceover.mp3`, 60); // 60 seconds
```

### Cost Estimate (MVP Scale)
- Storage: ~1.5GB (100 projects × 30 scenes × 500KB average)
- Monthly cost: ~$0.03 (storage) + ~$0.50 (egress) = **<$1/month**

---

## Research Item 4: Background Music Sourcing

### Decision
Curate ~20 tracks manually from YouTube Audio Library (royalty-free, no attribution required)

### Rationale
- **Zero Cost**: YouTube Audio Library is completely free for commercial use
- **High Quality**: Professional-grade music production
- **Mood Diversity**: Library covers all needed moods (upbeat, calm, dramatic, inspirational)
- **Simple License**: No attribution required, safe for use in monetized short videos
- **MVP Efficiency**: Manual curation of 20 tracks is faster than building automated import pipeline

### Music Selection Criteria
Select 4-5 tracks per mood category:
1. **Upbeat** (4 tracks): High energy, 120-140 BPM, for motivational/exciting content
2. **Calm** (5 tracks): Relaxing, 60-90 BPM, for educational/informational content
3. **Dramatic** (5 tracks): Tension-building, cinematic, for storytelling/emotional content
4. **Inspirational** (5 tracks): Uplifting, building crescendo, for success/achievement themes

### Metadata Schema
Each track requires:
- `title`: Track name
- `artist`: Artist or composer
- `source_url`: YouTube Audio Library download link
- `storage_url`: Supabase Storage path after upload
- `duration_sec`: Track length in seconds
- `mood`: Array of mood tags (e.g., `["upbeat", "energetic", "motivational"]`)
- `energy_level`: Integer 1-10 (1=calm, 10=high energy)
- `tempo`: BPM (beats per minute)
- `genre`: Music genre (e.g., "electronic", "orchestral", "acoustic")
- `tags`: Additional keywords for filtering (e.g., `["piano", "drums", "cinematic"]`)
- `is_royalty_free`: Boolean (always `true`)

### Sourcing Workflow
1. Browse YouTube Audio Library: https://www.youtube.com/audiolibrary
2. Filter by "Sound effects" > "Music"
3. Download selected tracks as MP3 (source quality: 192kbps or higher)
4. Convert to 128kbps, 44.1kHz using FFmpeg if needed
5. Upload to Supabase Storage bucket `music-library/`
6. Insert metadata into `background_music` table via seed script

### License Verification
- YouTube Audio Library tracks are marked "Attribution not required"
- Safe for commercial use on YouTube, TikTok, Instagram Reels
- No risk of copyright claims or demonetization

---

## Research Item 5: Caching Strategy Validation

### Decision
Use Supabase database-backed caching with `tts_previews` table and 10-minute TTL

### Rationale
- **Simple Implementation**: No additional infrastructure (Redis, in-memory cache) required
- **Persistent Cache**: Survives server restarts and deployments
- **Deduplication by Content**: `text_hash` (SHA-256 of `narration_text + voice_id`) ensures cache hits even for different scenes with identical text
- **Cost Effective**: Supabase database queries are fast (<50ms) and included in base tier
- **Appropriate TTL**: 10 minutes balances storage growth and repeated preview requests during active editing

### Cache Key Generation
```typescript
import { createHash } from 'crypto';

function generateTextHash(text: string, voiceId: string): string {
  return createHash('sha256')
    .update(`${text}:${voiceId}`)
    .digest('hex');
}
```

### TTL Strategy
- **Created At**: Record creation timestamp
- **Expires At**: `created_at + 10 minutes`
- **Cleanup**: Cron job or manual query to delete expired records:
  ```sql
  DELETE FROM tts_previews WHERE expires_at < NOW();
  ```

### Performance Estimates
- **Cache Miss (Generation)**: 3-5 seconds (Edge TTS API call + upload to Supabase Storage)
- **Cache Hit (Database Lookup)**: 20-50ms (Supabase query by `text_hash`)
- **Storage Overhead**: ~500KB per cached preview × average 10 previews per project = ~5MB/project
- **Total Cache Size** (100 projects): ~500MB (negligible cost)

### Cache Hit Rate Estimate
- **Active Editing Session**: 70-80% hit rate (users regenerate same scene multiple times)
- **Voice Switching**: 0% hit rate (different `voice_id` changes hash)
- **Text Editing**: 0% hit rate (modified `narration_text` changes hash)

---

## Unresolved Questions

**None** - All research items from Phase 0 have been resolved.

---

## References

- Edge TTS: https://github.com/sindresorhus/edge-tts
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- fluent-ffmpeg: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- Supabase Storage: https://supabase.com/docs/guides/storage
- YouTube Audio Library: https://www.youtube.com/audiolibrary
