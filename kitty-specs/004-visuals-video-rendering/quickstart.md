# Quickstart: Visuals and Video Rendering Validation

**Feature**: 004 - Visuals and Video Rendering
**Date**: 2026-01-08

## Prerequisites

- Database migrations applied (`render_jobs`, `job_steps`, `exports`, `scenes` extended)
- Supabase Storage bucket `exports` created with RLS policies
- Google Cloud TTS API key configured with timemarks support enabled
- Remotion worker deployed to AWS ECS Fargate (Docker container)
- Worker has FFmpeg installed (Remotion dependency)
- Project has completed scenes with:
  - Selected media (from Feature 002)
  - Generated voiceovers (from Feature 003, upgraded to Google Cloud TTS)
  - Mixed audio (voiceover + background music)

## Validation Scenarios

### Scenario 1: Subtitle Preview (P1)

1. Open a project in storyboard editor
2. Click on any scene card
3. Select "Minimal" subtitle preset
4. **Expected**: Scene preview shows white text at bottom with no background
5. Change to "Highlight" preset
6. **Expected**: Scene preview shows text with semi-transparent black background box
7. Change to "Karaoke" preset
8. **Expected**: Scene preview shows words highlighted one-by-one (word-level) OR sentence-level if timing unavailable
9. Click "Apply to all scenes"
10. **Expected**: All scenes update to selected preset with visual confirmation

### Scenario 2: Render Job Initiation (P1)

1. Ensure all scenes have:
   - Selected media (video/image)
   - Generated voiceover
   - Mixed audio
   - Selected subtitle preset
2. Click "Render Video" button
3. **Expected**: Render job created within 2 seconds
4. **Expected**: Status shows "Queued" with current_step="tts_generation"
5. Wait 10 seconds
6. **Expected**: Worker picks up job, status changes to "Running"
7. **Expected**: Progress UI shows "Step 1/4: Generating voiceovers"
8. **Expected**: "Last updated" timestamp shows recent update (within 3 seconds)

### Scenario 3: Render Progress Tracking (P1)

1. Monitor render job progress for 60-second video
2. **Expected**: Steps progress sequentially:
   - TTS generation: 0-25% progress
   - Subtitle generation: 25-50% progress
   - Media fetch: 50-75% progress
   - Render composite: 75-100% progress
3. **Expected**: Each step completes within expected time:
   - TTS: ~30 seconds (15 scenes × 2s each)
   - Subtitles: ~10 seconds (parsing timing data)
   - Media fetch: ~20 seconds (15 downloads × 1-2s each)
   - Render: ~90 seconds (Remotion composition + encoding)
4. **Expected**: Total render time ~150 seconds (2.5 minutes)
5. **Expected**: Progress bar updates smoothly, not stuck at same percentage

### Scenario 4: Successful Render and Export (P1)

1. Wait for render job to complete (status='succeeded')
2. **Expected**: UI shows "Download Video" button
3. **Expected**: "Watch Preview" video player appears
4. Click "Download Video"
5. **Expected**: Browser downloads MP4 file with filename "{project_title}.mp4"
6. Open downloaded file in video player (VLC, QuickTime)
7. **Expected**: Video plays correctly with:
   - Proper resolution (1080x1920)
   - Clear audio (voiceover + background music mixed)
   - Subtitles synced with audio
   - Smooth transitions between scenes
8. Check video metadata
9. **Expected**: Duration matches TTS duration (~60 seconds)
10. **Expected**: File size ~15-25MB (reasonable for quality/bitrate)

### Scenario 5: Karaoke Subtitle Sync (P2)

1. Create scene with Karaoke preset
2. Ensure Google Cloud TTS returned word-level timemarks
3. Render video
4. Watch final MP4 with focus on subtitles
5. **Expected**: Each word highlights in yellow exactly when spoken in voiceover
6. **Expected**: Highlight timing accuracy within ±100ms (imperceptible delay)
7. **Expected**: Smooth color transitions (not flickering or jumpy)
8. If word timing unavailable
9. **Expected**: Entire sentence highlights (fallback behavior)

### Scenario 6: Render Job Failure and Retry (P2)

1. Simulate failure: Disconnect worker internet during media fetch step
2. **Expected**: Job status changes to 'failed'
3. **Expected**: Error message shows "Media download failed. Check internet connection."
4. **Expected**: "Retry from failed step" button appears
5. Reconnect worker internet
6. Click "Retry from failed step"
7. **Expected**: Job resumes from media_fetch step (doesn't re-run TTS or subtitles)
8. **Expected**: retry_count increments to 1
9. **Expected**: Job completes successfully on retry

### Scenario 7: Render Job Cancellation (P2)

1. Start a new render job
2. Wait for job to reach "subtitle_generation" step
3. Click "Cancel Render" button
4. **Expected**: Confirmation dialog "Are you sure you want to cancel?"
5. Confirm cancellation
6. **Expected**: Job status changes to 'canceled' within 5 seconds
7. **Expected**: Current step stops (doesn't proceed to media_fetch)
8. **Expected**: Temporary files cleaned up (no orphaned MP4 on worker disk)
9. Make scene changes and click "Render Video" again
10. **Expected**: New render job created (retry_count=0, fresh job)

### Scenario 8: Stalled Job Recovery (P2)

1. Start a render job
2. Simulate stall: Kill worker process mid-render (during 'render_composite' step)
3. Wait 16 minutes (stalled timeout + 1 minute buffer)
4. **Expected**: Stalled job reaper runs (checks every 5 minutes)
5. **Expected**: Job status changes from 'running' to 'failed'
6. **Expected**: error_message shows "Render stalled. Please retry."
7. **Expected**: User can click "Retry from failed step"
8. Restart worker
9. Click retry
10. **Expected**: Job resumes and completes successfully

## Edge Cases

- **Scene missing media**: Render continues with colored fallback + narration text overlay
- **Scene missing audio**: Render continues with silent video (no audio track)
- **Media URL expired (404)**: Worker retries with alternate provider (Pexels ↔ Pixabay) or prompts user upload
- **TTS fails for one scene**: Job marks as 'failed' at tts_generation step, user can regenerate that scene's TTS from storyboard
- **Video duration ≠ media duration**: Media loops (if shorter) or trims/fades (if longer) to match audio
- **Supabase Storage upload fails**: Job marks as 'failed' with storage error, temporary file preserved for 24h
- **Render timeout (>10 min)**: Job terminates and marks as 'failed', user can retry or simplify project
- **User modifies scenes during render**: Render continues with original snapshot, UI shows warning "Current storyboard differs from render in progress"
- **Multiple render jobs queued**: Second job waits until first completes, UI shows "Previous render in progress" message
- **Remotion component crashes**: Job catches error, marks as 'failed' with stack trace, user can fix issue and retry

## Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| Render job creation | <2 seconds | <3 seconds |
| Worker pickup (queued → running) | <10 seconds | <15 seconds |
| Progress UI update latency | <3 seconds | <5 seconds |
| TTS generation (15 scenes) | <30 seconds | <45 seconds |
| Subtitle timing extraction | <10 seconds | <15 seconds |
| Media fetch (15 scenes) | <20 seconds | <30 seconds |
| Render composite (60s video) | <120 seconds | <180 seconds |
| Total render time (60s video) | <150 seconds | <225 seconds |
| MP4 upload to Supabase | <10 seconds | <20 seconds |
| Download link generation | <500ms | <1 second |
| Cancel render latency | <5 seconds | <10 seconds |
| Stalled job reaper accuracy | 0 false positives | <5% false positive rate |

## Success Criteria

✅ **All P1 scenarios (1-4) complete** without critical errors
✅ **90% of P2 scenarios (5-8) complete** successfully
✅ **Performance benchmarks meet targets** within 20% tolerance
✅ **Karaoke timing accuracy**: ±100ms sync with audio
✅ **Retry from failed step works**: Skips completed steps
✅ **Downloaded MP4 plays correctly** in VLC, QuickTime, mobile players
✅ **Video quality matches preview**: No surprise differences in subtitles, timing, layout
✅ **Zero data leaks**: RLS policies enforce user isolation (verify with test accounts)

## Troubleshooting

### Worker not picking up jobs
- Check worker is running: `docker ps` (ECS) or `ps aux | grep remotion`
- Check database connection: Verify `DATABASE_URL` environment variable
- Check polling logs: Worker should log "Checking for queued jobs..." every 5 seconds
- Verify dequeue query: Test `FOR UPDATE SKIP LOCKED` pattern manually in Supabase SQL Editor

### Render stuck at 0% progress
- Check if worker crashed: Review worker logs for errors
- Check `updated_at` timestamp: If stale (>15 min), stalled reaper should mark as failed
- Verify scene data: Ensure all scenes have required fields (media_id, audio_id, narration_text)
- Check Google Cloud TTS quota: Verify API key has sufficient quota

### Video quality issues (pixelated, artifacts)
- Check Remotion codec settings: Should be H.264, CRF 23 (high quality)
- Check media source quality: Pexels videos should be 1080p or higher
- Verify FFmpeg installation: `ffmpeg -version` should show proper codecs
- Check worker resources: Ensure sufficient CPU/memory (2 vCPU, 4GB RAM minimum)

### Subtitles out of sync
- Verify `subtitle_timing` JSONB format: Should be `[{word, start_ms, end_ms}, ...]`
- Check Remotion frame timing: Ensure `fps` constant matches output (30fps)
- Verify TTS timemarks: Google Cloud TTS should return accurate timepoints
- Check for fallback: If word timing unavailable, sentence-level highlighting is expected

### Download link not working
- Check signed URL expiration: Should be 7 days from creation
- Verify RLS policy: User must own project to download
- Check Supabase Storage: Verify file exists in `exports/{user_id}/{project_id}/{job_id}.mp4`
- Test URL manually: Paste signed URL in browser incognito mode

### Storage upload fails
- Check Supabase Storage quota: Free tier is 5GB
- Verify bucket exists: `exports` bucket should be created
- Check worker permissions: Service role key should have storage write access
- Test upload manually: Use Supabase Dashboard → Storage → Upload file

## Next Steps

After validation succeeds:
1. Deploy worker to production (AWS ECS Fargate)
2. Configure CloudWatch alarms for:
   - Worker CPU/memory usage
   - Render job queue depth
   - Failed job rate (>5% indicates problem)
3. Set up monitoring dashboard:
   - Active renders
   - Average render time
   - Success rate
   - Storage usage
4. Document runbook for common failures
5. Prepare Phase 2 planning:
   - BullMQ + Redis migration
   - Auto-scaling workers
   - Advanced subtitle customization
