# Implementation Plan: Video Media Search & Rendering

**Feature Branch**: `002-video-media-search`
**Created**: 2026-01-06
**Status**: Ready for Implementation

## Technical Context

### Architecture Choices

**Real-time Updates**: Supabase Real-time Subscriptions (Choice A)
- Leverage existing Supabase real-time infrastructure from Phase 1
- Automatic push updates when media options are inserted/updated
- No polling overhead, instant UI updates
- Reuses existing authentication and RLS infrastructure

**Video Thumbnail Optimization**: React Virtual / Intersection Observer (Choice A)
- Viewport-based lazy loading for better performance
- Preload nearby thumbnails for smooth scrolling
- Reduce memory footprint with virtualization
- Better UX with progressive loading

### Technology Stack

**Backend**:
- Node.js with Hono server (existing from Phase 1)
- Supabase Client (existing)
- Pexels Videos API (new integration)
- Media Service: `src/server/services/media-service.ts` (already created)

**Frontend**:
- React with TypeScript (existing from Phase 1)
- Supabase Real-time subscriptions (existing)
- React Query / TanStack Query for data fetching (new)
- React Virtual / Intersection Observer (new)
- Tailwind CSS (existing)

**Database**:
- Supabase PostgreSQL (existing)
- Row Level Security (RLS) enabled (existing)
- Real-time publication enabled (new)

### External Dependencies

**Pexels API**:
- Base URL: `https://api.pexels.com/videos`
- Authentication: Bearer token in headers
- Rate limits: 200 requests/hour (free tier)
- Video streaming: Direct URLs from Pexels CDN

## Constitution Check

### Project Principles

From `constitution.md` (if exists):

1. **User-Controlled Creative Direction**: ✅ SATISFIED
   - Manual video selection preserves user creative control
   - 3-5 options provided for choice
   - No automatic AI selection

2. **Workflow Efficiency**: ✅ SATISFIED
   - Automatic search eliminates manual browsing
   - Real-time updates reduce waiting
   - Batch search for power users

3. **Transparent Operations**: ✅ SATISFIED
   - Clear search status indicators
   - Error messages explain what happened
   - Rate limit countdown shows when to retry

4. **Performance First**: ✅ SATISFIED
   - 24-hour caching reduces API calls
   - Lazy loading optimizes memory
   - Intersection Observer prevents unnecessary loads

5. **Progressive Enhancement**: ✅ SATISFIED
   - Feature works without API (shows "search pending" state)
   - Graceful degradation on errors
   - Retry mechanisms for transient failures

### No Conflicts Detected

All constitutional requirements are satisfied by the design.

## Phase 0: Research

### Research Tasks Completed

1. **Supabase Real-time for Media Options** ✅
   - Decision: Use Supabase real-time subscriptions
   - Rationale: Already integrated from Phase 1, automatic push updates, no polling overhead
   - Implementation: Subscribe to `scene_media_options` table changes filtered by `scene_id`

2. **Pexels API Best Practices** ✅
   - Decision: Use search endpoint with orientation=portrait filter
   - Rationale: Short-form content requires vertical video format
   - Rate limiting: Implement in-memory request queue with 1 req/sec limit
   - Caching: 24-hour cache to respect free tier quota

3. **React Virtual for Video Thumbnails** ✅
   - Decision: Use `@tanstack/react-virtual` or react-window
   - Rationale: Efficient rendering of horizontal thumbnail lists
   - Lazy loading: Intersection Observer for viewport-based loading
   - Preloading: Load next 2 thumbnails for smooth experience

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for detailed entity definitions.

**New Entities**:
- `scene_media_options`: Stores fetched video options from Pexels

**Modified Entities**:
- `scenes`: Added `media_search_status`, `media_searched_at`, `media_search_error`

**Relationships**:
- `scene_media_options.scene_id` → `scenes.id` (CASCADE DELETE)

### API Contracts

See `contracts/openapi.yaml` for detailed API specification.

**New Endpoints**:

1. `POST /api/v1/media/search` - Search Pexels for videos
2. `POST /api/v1/media/select` - Select a video for a scene
3. `POST /api/v1/media/refresh` - Refresh media options for a scene
4. `GET /api/v1/media/options/:sceneId` - Get media options for a scene

### Real-time Subscriptions

```typescript
supabase
  .channel(`scene_media_${sceneId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scene_media_options',
    filter: `scene_id=eq.${sceneId}`
  }, (payload) => {
    // Handle INSERT, UPDATE, DELETE
    // Update UI with new options
  })
  .subscribe();
```

## Implementation Phases

### Phase 1: Backend API & Integration (WP00)

**Goal**: Expose media search and management APIs

**Tasks**:
1. Create media router with search/select/refresh endpoints
2. Integrate media-service.ts with scene-service.ts
3. Implement automatic search trigger on scene creation
4. Add error handling and retry logic
5. Write unit tests for media service

**Deliverables**:
- `src/server/routes/media-router.ts`
- Updated `src/server/services/scene-service.ts` with search trigger
- Unit tests for media service
- API documentation

**Success Criteria**:
- All endpoints respond correctly
- Automatic search triggers on scene creation
- Rate limiting prevents API quota exhaustion
- Errors are handled gracefully with retries

### Phase 2: Frontend Components (WP01)

**Goal**: Build video thumbnail and preview components

**Tasks**:
1. Create VideoThumbnail component with hover preview
2. Create VideoPreviewModal component
3. Implement Intersection Observer for lazy loading
4. Add loading and error states
5. Write component tests

**Deliverables**:
- `src/ui/components/VideoThumbnail.tsx`
- `src/ui/components/VideoPreviewModal.tsx`
- Storybook stories for components
- Component tests

**Success Criteria**:
- Thumbnails display correctly
- Hover preview plays smoothly
- Modal shows full video with details
- Lazy loading prevents unnecessary loads
- Error states display helpful messages

### Phase 3: SceneCard Integration (WP02)

**Goal**: Integrate media options into existing SceneCard component

**Tasks**:
1. Update SceneCard to display media options section
2. Add horizontal scroll for thumbnails
3. Integrate Supabase real-time subscriptions
4. Implement selection indicator (green border)
5. Add "Refresh options" button
6. Update scene service to handle selection

**Deliverables**:
- Updated `src/ui/components/SceneCard.tsx`
- Real-time subscription hook
- Selection state management
- Integration tests

**Success Criteria**:
- Scene cards show media options when loaded
- Real-time updates work without page refresh
- Selection persists across sessions
- Refresh button triggers new search
- Loading states display correctly

### Phase 4: Batch Search & Polish (WP03)

**Goal**: Add batch search functionality and polish UX

**Tasks**:
1. Implement batch search for all scenes
2. Add progress indicator
3. Rate limit batch searches
4. Polish animations and transitions
5. Add keyboard navigation
6. Write E2E tests with Playwright

**Deliverables**:
- Batch search component
- Progress indicator
- Refined animations
- E2E test suite
- Accessibility improvements

**Success Criteria**:
- Batch search works for 15+ scenes
- Progress updates in real-time
- Rate limiting prevents API errors
- Smooth animations and transitions
- Keyboard navigation works
- All E2E tests pass

## Testing Strategy

### Unit Tests

- **Media Service**: Test search, caching, rate limiting, retry logic
- **Components**: Test VideoThumbnail, VideoPreviewModal in isolation
- **Hooks**: Test real-time subscription hook
- **Utilities**: Test keyword extraction, filtering logic

### Integration Tests

- **API Endpoints**: Test all media endpoints with valid/invalid inputs
- **Database**: Test RLS policies, cascade deletes
- **Real-time**: Test subscription behavior on INSERT/UPDATE/DELETE
- **Error Handling**: Test retry logic, rate limiting, error responses

### E2E Tests

- **Automatic Search**: Create scene, verify search triggers
- **Video Preview**: Hover thumbnail, verify preview plays
- **Selection**: Click video, verify selection saves
- **Refresh**: Click refresh, verify new options load
- **Batch Search**: Search all scenes, verify progress updates
- **Error Recovery**: Simulate API errors, verify retry works

## Performance Considerations

### API Rate Limiting

- **Pexels Free Tier**: 200 requests/hour
- **Strategy**: In-memory request queue with 1 req/sec
- **Caching**: 24-hour cache reduces duplicate searches
- **Batch Operations**: Rate limit across all scene searches

### Frontend Performance

- **Lazy Loading**: Only load thumbnails in/near viewport
- **Virtual Scrolling**: For large thumbnail lists
- **Image Optimization**: Use Pexels thumbnail URLs (smaller files)
- **Preloading**: Preload next 2 thumbnails for smooth experience
- **Debouncing**: Debounce refresh clicks (500ms)

### Database Performance

- **Indexes**: Created on `scene_id`, `is_selected`, `expires_at`
- **Query Optimization**: Use indexed columns for filtering
- **Cascade Cleanup**: Auto-delete expired options with scene
- **Connection Pooling**: Supabase managed pooling

## Security Considerations

### RLS Policies

All policies enforce user ownership:
```sql
-- Users can only access media options for their own projects
scene_id IN (
  SELECT s.id FROM scenes s
  JOIN projects p ON s.project_id = p.id
  WHERE p.user_id = auth.uid()
)
```

### API Key Security

- **Environment Variable**: PEXELS_API_KEY stored in `.env`
- **Server-Side Only**: Never exposed to client
- **Error Messages**: Don't leak API key in errors

### Input Validation

- **Keywords**: Sanitize before sending to Pexels
- **Scene ID**: Validate UUID format
- **Video ID**: Validate integer range
- **Duration**: Positive integer check

## Deployment Checklist

### Pre-Deployment

- [ ] PEXELS_API_KEY configured in production
- [ ] Database migration applied
- [ ] RLS policies tested
- [ ] Real-time publication enabled for `scene_media_options`
- [ ] All tests passing
- [ ] Performance benchmarks met

### Post-Deployment

- [ ] Monitor API quota usage
- [ ] Check search success rate
- [ ] Verify real-time subscriptions working
- [ ] Monitor error rates
- [ ] Check cache hit rate
- [ ] User feedback collection

## Rollback Plan

If critical issues arise:
1. **Feature Flag**: Disable automatic search trigger
2. **API Rate Limits**: Reduce to 50 req/hour
3. **Real-time**: Disable subscriptions, fallback to polling
4. **Complete Rollback**: Remove Phase 2 routes, keep Phase 1 working

## Monitoring & Observability

### Metrics to Track

- Search success rate
- API response time (p50, p95, p99)
- Cache hit rate
- Rate limit violations
- Real-time subscription failures
- User selection rate

### Alerts

- API error rate > 5%
- Cache hit rate < 50%
- Rate limit errors > 10/hour
- Real-time subscription failures > 5%

## Next Steps

1. ✅ Specification complete
2. ✅ Database schema created
3. ✅ Media service implemented
4. ⏳ **Execute implementation** via `/spec-kitty.tasks`
5. ⏳ Deploy to development
6. ⏳ User acceptance testing
7. ⏳ Production deployment

---

**Ready for task generation and implementation! 🚀**
