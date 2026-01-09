# Research: Visuals and Video Rendering

**Feature**: 004 - Visuals and Video Rendering
**Date**: 2026-01-08
**Status**: Complete

## Overview

This document consolidates research findings for technical decisions required to implement the visuals and video rendering feature. All research questions from Phase 0 have been resolved through planning interrogation.

---

## Research Item 1: Video Rendering Engine Selection

### Decision
Use **Remotion** (React-based video framework) for video composition and rendering

### Rationale
- **Codebase Alignment**: The fork target (gyoridavid/short-video-maker) is already built on Remotion, ensuring compatibility
- **WYSIWYG Consistency**: Same Remotion components work in both Storyboard Preview (Next.js frontend) and Final Render (Worker), guaranteeing "what you see is what you get"
- **Declarative Video**: React components define video structure, making subtitle positioning, timing, and styling far more maintainable than imperative FFmpeg CLI commands
- **Type Safety**: TypeScript support ensures video composition logic is type-safe and refactorable
- **Future Proofing**: CSS-based transitions, dynamic layouts, and advanced editing (FR-5) are significantly easier with React/Remotion than raw FFmpeg filters
- **Proven Technology**: Remotion is battle-tested with 10k+ GitHub stars, used by companies like Netflix and Adobe

### Alternatives Considered
1. **Raw FFmpeg (via fluent-ffmpeg)**
   - Rejected due to complexity: Generating FFmpeg filter graphs from JSON state is error-prone and unmaintainable
   - Preview-render mismatch: Frontend preview would be React/CSS, final render would be FFmpeg filters, leading to visual inconsistencies
   - Difficult debugging: FFmpeg CLI errors are cryptic; React components have clear error boundaries

2. **Bun + FFmpeg native bindings**
   - Rejected due to immaturity: Bun's native FFmpeg integration is still experimental
   - Loses React component benefits: Would still require imperative video composition

3. **Cloud service (Cloudflare, AWS MediaConvert)**
   - Rejected due to cost and vendor lock-in: Per-request pricing accumulates at scale
   - Limited customization: Cloud services have preset templates, not flexible enough for dynamic subtitle overlays

### Implementation Details
- **Remotion Version**: Latest stable (4.x)
- **Output Format**: MP4 (H.264 codec, AAC audio, 1080x1920 resolution for 9:16 aspect ratio)
- **Frame Rate**: 30fps (standard for social media)
- **Components**: `<Composition>`, `<Sequence>`, `<Video>`, `<Audio>`, `<AbsoluteFill>`, `<Subtitle />`
- **Rendering**: Remotion CLI (`npx remotion render`) invoked from Docker worker
- **Performance Target**: 60-second video renders in ~120 seconds on AWS ECS Fargate (2 vCPU, 4GB RAM)

### Performance Benchmarks (estimated)
- Short video (15 seconds): 30-45 seconds render time
- Medium video (30 seconds): 60-90 seconds render time
- Long video (60 seconds): 90-120 seconds render time
- Rendering time scales linearly with video duration

---

## Research Item 2: Async Worker Infrastructure

### Decision
Use **database polling** (Postgres-based) with `FOR UPDATE SKIP LOCKED` pattern for MVP

### Rationale
- **PRD Alignment**: PRD Section 7.2 explicitly specifies "MVP: DB-based queue" with defer to BullMQ+Redis in Phase 2+
- **Simplicity**: No additional infrastructure (Redis) to deploy, monitor, and maintain
- **Sufficient for MVP**: PRD assumptions state "<10 concurrent users at MVP scale," which single worker handles easily
- **Proven Pattern**: `FOR UPDATE SKIP LOCKED` is a well-documented PostgreSQL pattern for queue dequeue with concurrency safety
- **Cost**: Zero additional infrastructure cost beyond existing Supabase Postgres
- **Fast Implementation**: PRD provides exact SQL pattern, minimizing design work

### Alternatives Considered
1. **BullMQ + Redis**
   - Rejected for MVP due to additional infrastructure (Redis instance) and operational complexity
   - Planned for Phase 2 when scaling needs exceed database polling capabilities
   - Advantages: Built-in retries, job priorities, delayed jobs, horizontal scaling

2. **AWS SQS + Lambda**
   - Rejected due to 15-minute Lambda timeout (may be insufficient for longer videos)
   - Higher cost and complexity compared to database polling
   - Vendor lock-in to AWS ecosystem

3. **Supabase Edge Functions**
   - Rejected due to execution time limits (Edge Functions timeout at ~2-3 minutes for heavy workloads)
   - Not suitable for CPU-intensive video rendering

### Implementation Details

#### Dequeue Pattern (from PRD Section 7.2)
```sql
UPDATE render_jobs
SET status = 'running', updated_at = NOW()
WHERE id = (
  SELECT id
  FROM render_jobs
  WHERE status = 'queued'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

#### Stalled Job Reaper
- Runs every 5 minutes via cron or worker loop
- Identifies jobs stuck in 'running' status with `updated_at` > 15 minutes ago
- Marks as 'failed' with error message "Render stalled. Please retry."
- Prevents zombie jobs from blocking queue

#### Scaling Path
- **Single worker**: Handles <10 concurrent users (MVP baseline)
- **2-3 workers**: Manual scaling by incrementing ECS task count (no code changes needed)
- **Auto-scaling**: CloudWatch-based auto-scaling in Phase 2 (triggers on queue depth)
- **BullMQ migration**: Phase 2+ when concurrent renders exceed 50-100 jobs

---

## Research Item 3: Google Cloud TTS Word-Level Timing

### Decision
Upgrade from **Edge TTS** to **Google Cloud TTS** to enable word-level timestamps for Karaoke subtitles

### Rationale
- **PRD Requirement**: PRD Section 7.1 specifies "MVP: Google Cloud TTS"
- **Karaoke Feature**: Word-level highlighting (FR-7) requires timestamp for each word, not just sentence-level timing
- **Official Support**: Google Cloud TTS provides standardized `timepoints` API with precise word timings
- **Reliability**: Official API with SLA, compared to Edge TTS (unofficial wrapper with potential stability risks)
- **Fallback Strategy**: If word-level timing unavailable (e.g., unsupported language), fallback to sentence-level highlighting

### Alternatives Considered
1. **Continue with Edge TTS**
   - Rejected because Edge TTS API does not provide word-level timestamps
   - Would limit Karaoke feature to sentence-level highlighting (poor UX)

2. **ElevenLabs API**
   - Rejected due to cost ($5-50/month) and overkill for MVP
   - Planned for Phase 4 when premium features justify cost

3. **Azure Cognitive Services**
   - Rejected due to complex billing setup and requirement for Azure subscription
   - Similar word-level timing support, but higher barrier to entry

### Implementation Details

#### Google Cloud TTS API Configuration
```javascript
const client = new textToSpeech.TextToSpeechClient();
const [response] = await client.synthesizeSpeech({
  input: {
    text: narrationText,
  },
  voice: {
    languageCode: 'en-US',
    name: voiceId, // e.g., 'en-US-Wavenet-D'
  },
  audioConfig: {
    audioEncoding: 'MP3',
    sampleRateHertz: 44100,
    effectsProfileId: ['headphone-class-device'],
  },
  // Enable timepoints for word-level timing
  enableTimepoints: ['SSML_MARKS', 'WORDS'],
});
```

#### Timepoints Response Format
```json
{
  "timepoints": [
    {"timeSeconds": 0.0, "markName": "word0"},
    {"timeSeconds": 0.2, "markName": "word1"},
    {"timeSeconds": 0.5, "markName": "word2"},
    ...
  ]
}
```

#### Storage Schema (scenes.subtitle_timing JSONB)
```json
[
  {"word": "The", "start_ms": 0, "end_ms": 200},
  {"word": "steak", "start_ms": 200, "end_ms": 500},
  {"word": "sizzles", "start_ms": 500, "end_ms": 800},
  ...
]
```

#### Fallback Logic
- If `timepoints` array is empty or missing: Use sentence-level highlighting
- Log warning: "Word-level timing unavailable for {scene_id}, using sentence-level fallback"
- Karaoke component detects fallback and highlights entire sentence instead of individual words

### Cost Analysis (Google Cloud TTS)
- **Standard Voices**: $4.00 / 1M characters (WaveNet)
- **Wavenet Voices** (higher quality): $16.00 / 1M characters
- **Typical 60-second video**: ~200 words ≈ 1,000 characters
- **Cost per render**: $0.004 - $0.016 (less than 2 cents)
- **100 renders/month**: ~$0.40 - $1.60/month (negligible for MVP)

---

## Research Item 4: Subtitle Rendering Strategies

### Decision
Use **pure Remotion components** for subtitle rendering with CSS positioning and timing synchronization

### Rationale
- **WYSIWYG Consistency**: Same `<Subtitle />` component works in Storyboard Preview and Final Render
- **Editability**: Users can switch presets (Minimal ↔ Karaoke) and see changes immediately in preview
- **Maintainability**: CSS-styled text is easier to modify than FFmpeg drawtext filters
- **Performance**: Remotion renders subtitles during video composition (no post-processing step)
- **Timing Sync**: Remotion's `useCurrentFrame()` and `interpolate()` hooks enable frame-accurate subtitle timing

### Alternatives Considered
1. **FFmpeg drawtext filter**
   - Rejected due to complexity: Generating drawtext filters from JSON state is error-prone
   - Preview-render mismatch: Frontend preview can't replicate FFmpeg filters exactly
   - Not editable: Subtitles are "burned in" during render, can't tweak post-render

2. **External subtitle tracks (.srt file)**
   - Rejected due to player-dependence: Not all video players support external .srt files
   - Not WYSIWYG: Preview would differ from final render
   - Download friction: Users must download both MP4 and SRT file

3. **Hybrid approach (Remotion for preview, FFmpeg for render)**
   - Rejected due to inconsistency: Preview and render would use different rendering engines
   - Maintenance burden: Changes require updating two separate code paths

### Implementation Details

#### Minimal Preset Component
```tsx
<AbsoluteFill style={{ bottom: 60, left: 20, right: 20 }}>
  <div style={{
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  }}>
    {narrationText}
  </div>
</AbsoluteFill>
```

#### Highlight Preset Component
```tsx
<AbsoluteFill style={{ bottom: 50, left: 20, right: 20 }}>
  <div style={{
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '10px 20px',
    borderRadius: 8,
  }}>
    <div style={{
      color: 'white',
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
    }}>
      {narrationText}
    </div>
  </div>
</AbsoluteFill>
```

#### Karaoke Preset Component
```tsx
const KaraokeSubtitle = ({ narrationText, subtitleTiming, frame, fps }) => {
  const words = narrationText.split(' ');

  return (
    <AbsoluteFill style={{ bottom: 60, left: 20, right: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
        {words.map((word, i) => {
          const timing = subtitleTiming[i];
          const isActive = frame >= timing.start_ms * fps / 1000 &&
                          frame <= timing.end_ms * fps / 1000;

          return (
            <span key={i} style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: isActive ? '#FFFF00' : 'white', // Yellow highlight when active
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              transition: 'color 0.1s ease-in-out',
            }}>
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

#### Timing Synchronization
- Remotion's `useCurrentFrame()` hook returns current frame number (0-based)
- Convert frame timestamp to milliseconds: `currentFrame * 1000 / fps`
- For Karaoke: Check if current time is within word's `[start_ms, end_ms]` range
- Use `interpolate()` for smooth color transitions (optional polish)

---

## Research Item 5: Storage and Export Strategy

### Decision
Use **Supabase Storage** for rendered MP4 files with signed URLs for secure downloads

### Rationale
- **Unified Stack**: PRD Section 7.1 specifies "Next.js + Supabase(Auth/DB/Storage/RLS)"
- **"결과물(Results)" Storage**: PRD Section 7.1 explicitly assigns Supabase Storage responsibility for upload/results
- **Security**: Leverages existing Row-Level Security (RLS) policies for access control
- **Simplicity**: Worker already connects to Supabase for job queue; reuse same client for storage uploads
- **Sufficient for MVP**: 5GB free tier handles ~250 renders (100 users × 5 renders × 20MB = 10GB, but with cleanup policy stays within limits)

### Alternatives Considered
1. **AWS S3**
   - Rejected due to additional AWS service integration and duplicate auth logic
   - Would require IAM policies separate from Supabase RLS, increasing complexity
   - Advantages: Better for video-focused apps, lifecycle policies, integrates with ECS worker (same VPC)

2. **Cloudflare R2 + CDN**
   - Rejected due to new service integration overhead
   - Zero egress fees is advantageous, but not critical at MVP scale
   - Planned for Phase 2 if download bandwidth costs become significant

3. **Temporary disk storage with worker HTTP server**
   - Rejected due to lack of persistence and no download retry capability
   - Worker would need HTTP endpoint management, adding complexity

### Implementation Details

#### Storage Bucket Structure
```
exports/
  {user_id}/
    {project_id}/
      {render_job_id}.mp4
```

#### Upload Logic (Worker)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for worker
);

const { data, error } = await supabase.storage
  .from('exports')
  .upload(`${userId}/${projectId}/${renderJobId}.mp4`, videoFile, {
    contentType: 'video/mp4',
    upsert: false,
  });

// Generate signed URL (7-day expiry)
const { data: { signedUrl } } = await supabase.storage
  .from('exports')
  .createSignedUrl(`${userId}/${projectId}/${renderJobId}.mp4`, 60 * 60 * 24 * 7);
```

#### RLS Policy (Security)
```sql
-- Only project owner can download their exported videos
CREATE POLICY "Users can download own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Storage Cleanup Policy (MVP)
- **Manual cleanup**: Delete exports older than 30 days via Supabase Dashboard or SQL query
- **Automated cleanup (Phase 2)**: Implement pg_cron job or scheduled worker function
- **User-initiated cleanup**: Add "Delete export" button in UI for manual cleanup

#### Cost Management
- **Free tier**: 5GB storage, 1GB bandwidth/month
- **Pro tier** ($25/month): 100GB storage, 50GB bandwidth/month (upgrade if exceeded)
- **Estimated usage**: 100 users × 5 renders × 20MB = 10GB/month (requires Pro tier at scale)

---

## Summary of Decisions

| Research Item | Decision | Key Trade-off |
|---------------|----------|---------------|
| **Rendering Engine** | Remotion (React-based) | WYSIWYG consistency vs. raw FFmpeg performance |
| **Worker Infrastructure** | Database polling (Postgres) | Simplicity vs. BullMQ scalability |
| **TTS Provider** | Google Cloud TTS | Word-level timing vs. Edge TTS cost savings |
| **Subtitle Rendering** | Pure Remotion components | Editability vs. burned-in subtitles |
| **Storage Strategy** | Supabase Storage | Unified stack vs. AWS S3 video optimization |

All decisions align with PRD requirements and MVP scope, prioritizing simplicity and consistency for the initial launch while preserving clear upgrade paths for Phase 2+.
