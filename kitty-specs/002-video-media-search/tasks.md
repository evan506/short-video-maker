# Implementation Tasks: Video Media Search & Rendering

**Feature**: 002 - Video Media Search & Rendering
**Branch**: `002-video-media-search`
**Created**: 2026-01-06
**Status**: Ready for Implementation

## Work Package Breakdown

This feature is organized into 4 work packages (WP00-WP03), each containing grouped subtasks.

### WP00: Backend API & Media Service Integration ✅
**Priority**: P0 (Critical Foundation)
**Estimated Effort**: 4-6 hours
**Dependencies**: None (can start immediately)
**Status**: ✅ **COMPLETED** (Approved 2026-01-06)
**Task Prompt**: [tasks/done/WP00-backend-api-media-service.md](tasks/done/WP00-backend-api-media-service.md)

**Goal**: Expose backend API endpoints for media search and integrate with existing scene service.

**Tasks**:
- T001-T005: Media router and endpoints
- T006-T008: Scene service integration
- T009-T010: Database functions and testing

**Deliverables**:
- Media router with 4 endpoints (search, select, refresh, get)
- Scene service triggers automatic search on creation
- Database RPC function for atomic video selection
- Unit tests for media service

**Acceptance Criteria**:
- ✅ All API endpoints respond correctly to valid/invalid inputs
- ✅ Automatic search triggers when scene is created
- ✅ Rate limiting prevents Pexels quota exhaustion
- ✅ Selection update is atomic (no race conditions)
- ✅ All unit tests pass (>80% coverage)

---

### WP01: Frontend Video Components
**Priority**: P1 (Core User Experience)
**Estimated Effort**: 6-8 hours
**Dependencies**: WP00 (needs API endpoints)
**Task Prompt**: [tasks/planned/WP01-frontend-video-components.md](tasks/planned/WP01-frontend-video-components.md)

**Goal**: Build reusable video thumbnail and preview components with lazy loading.

**Tasks**:
- T011-T014: VideoThumbnail component
- T015-T018: VideoPreviewModal component
- T019-T020: Lazy loading with Intersection Observer
- T021-T022: Component testing

**Deliverables**:
- `VideoThumbnail.tsx` component with hover preview
- `VideoPreviewModal.tsx` component with full playback
- Intersection Observer hook for lazy loading
- Storybook stories for both components
- Component tests (Jest + React Testing Library)

**Acceptance Criteria**:
- ✅ Thumbnails display correctly with loading states
- ✅ Hover triggers 3-second muted preview loop
- ✅ Click opens modal with full video and metadata
- ✅ Lazy loading only loads thumbnails in/near viewport
- ✅ Error states show helpful messages
- ✅ All component tests pass

---

### WP02: SceneCard Integration & Real-time Updates
**Priority**: P1 (Core User Experience)
**Estimated Effort**: 8-10 hours
**Dependencies**: WP00, WP01 (needs API and components)
**Task Prompt**: [tasks/planned/WP02-scenecard-integration-realtime.md](tasks/planned/WP02-scenecard-integration-realtime.md)

**Goal**: Integrate media options into SceneCard with real-time updates.

**Tasks**:
- T023-T026: SceneCard media options section
- T027-T029: Supabase real-time subscriptions
- T030-T032: Selection state management
- T033-T034: Refresh functionality
- T035-T036: Integration testing

**Deliverables**:
- Updated `SceneCard.tsx` with media options display
- Real-time subscription hook for media changes
- Selection state persisted to database
- Refresh button with rate limit protection
- Integration tests for SceneCard + media

**Acceptance Criteria**:
- ✅ Scene cards display media options when available
- ✅ Real-time updates work without page refresh
- ✅ Selected video shows green border + checkmark
- ✅ Refresh button triggers new search
- ✅ Loading states display during search
- ✅ Error messages are user-friendly
- ✅ Integration tests pass

---

### WP03: Batch Search & Polish
**Priority**: P2 (Enhancement)
**Estimated Effort**: 6-8 hours
**Dependencies**: WP02 (needs SceneCard integration)
**Task Prompt**: [tasks/planned/WP03-batch-search-polish.md](tasks/planned/WP03-batch-search-polish.md)

**Goal**: Add batch search functionality and polish the overall UX.

**Tasks**:
- T037-T040: Batch search implementation
- T041-T042: Progress indicator
- T043-T044: Animations and transitions
- T045-T046: Accessibility improvements
- T047-T048: E2E testing

**Deliverables**:
- Batch search component with rate limiting
- Progress indicator showing X/Y scenes searched
- Smooth animations for all interactions
- Keyboard navigation support
- E2E test suite (Playwright)

**Acceptance Criteria**:
- ✅ Batch search works for 15+ scenes
- ✅ Progress updates in real-time
- ✅ Rate limiting prevents API errors
- ✅ Animations are smooth (60fps)
- ✅ Keyboard navigation works (Tab, Enter, Esc)
- ✅ All E2E tests pass

---

## Task List

### WP00: Backend API & Media Service Integration

#### T001: Create media router stub
- [ ] Create `src/server/routes/media-router.ts`
- [ ] Add router to main server routes
- [ ] Set up authentication middleware
- [ ] Add request validation schemas

#### T002: Implement POST /api/v1/media/search
- [ ] Import `mediaService.searchVideosWithRetry()`
- [ ] Validate request body (sceneId, keywords, maxResults)
- [ ] Call Pexels API via media service
- [ ] Save results to `scene_media_options` table
- [ ] Update scene `media_search_status`
- [ ] Return media options to client

#### T003: Implement POST /api/v1/media/select
- [ ] Validate request body (sceneId, mediaOptionId)
- [ ] Use RPC function `select_scene_media()` for atomicity
- [ ] Verify user owns the scene
- [ ] Return selected media option
- [ ] Handle errors (not found, already selected)

#### T004: Implement POST /api/v1/media/refresh
- [ ] Validate request body (sceneId)
- [ ] Delete existing media options for scene
- [ ] Trigger new search via media service
- [ ] Save fresh results
- [ ] Implement rate limiting (1 refresh per minute per scene)

#### T005: Implement GET /api/v1/media/options/:sceneId
- [ ] Validate sceneId parameter
- [ ] Fetch all media options for scene
- [ ] Include selected option separately
- [ ] Filter out expired options
- [ ] Return results to client

#### T006: Create database RPC function for selection
- [ ] Write `select_scene_media(scene_id, media_option_id)` function
- [ ] Implement transaction: deselect all, select one
- [ ] Update scene `media_search_status` to 'completed'
- [ ] Add SECURITY DEFINER for RLS bypass
- [ ] Test atomicity and rollback

#### T007: Integrate automatic search in scene service
- [ ] Modify `createScene()` in `scene-service.ts`
- [ ] After scene created, extract keywords if needed
- [ ] Call `mediaService.searchVideosWithRetry()` in background
- [ ] Handle failures gracefully (update status to 'failed')
- [ ] Don't block scene creation on search

#### T008: Add keyword extraction fallback
- [ ] Implement `extractKeywordsFromNarration()` in media service
- [ ] Use LLM service (OpenRouter) for extraction
- [ ] Fall back to rule-based extraction (capitalized words)
- [ ] Extract 2-3 meaningful keywords
- [ ] Save to scene `primary_keyword` field

#### T009: Write unit tests for media service
- [ ] Test `searchVideos()` with valid keywords
- [ ] Test rate limiting logic
- [ ] Test caching (in-memory Map)
- [ ] Test retry logic with exponential backoff
- [ ] Test error handling (429, 404, 500)
- [ ] Mock Pexels API responses

#### T010: Write integration tests for media endpoints
- [ ] Test POST /media/search with valid scene
- [ ] Test POST /media/select with atomicity
- [ ] Test POST /media/refresh with rate limiting
- [ ] Test GET /media/options with expired filtering
- [ ] Test authentication requirements
- [ ] Test RLS policies (user isolation)

---

### WP01: Frontend Video Components

#### T011: Create VideoThumbnail component structure
- [ ] Create `src/ui/components/VideoThumbnail.tsx`
- [ ] Define props interface (MediaOption, onSelect, onPreview)
- [ ] Set up component state (isHovering, isLoading)
- [ ] Add TypeScript types

#### T012: Implement thumbnail display with loading state
- [ ] Display thumbnail image with `loading="lazy"`
- [ ] Show skeleton loader while image loads
- [ ] Handle image load error
- [ ] Add play button overlay
- [ ] Show video metadata (duration, resolution) on hover

#### T013: Implement hover-to-preview functionality
- [ ] Add `onMouseEnter` and `onMouseLeave` handlers
- [ ] Implement 0.5s delay before preview starts
- [ ] Load and play muted 3-second video loop
- [ ] Stop preview when mouse leaves
- [ ] Clean up video element on unmount

#### T014: Add selection state indicator
- [ ] Display green border when `isSelected` is true
- [ ] Show checkmark overlay in top-right corner
- [ ] Add "Selected" badge below thumbnail
- [ ] Animate selection transition

#### T015: Create VideoPreviewModal component structure
- [ ] Create `src/ui/components/VideoPreviewModal.tsx`
- [ ] Define props interface (video, isOpen, onClose, onSelect)
- [ ] Set up modal with backdrop blur

#### T016: Implement full video playback
- [ ] Display full video with sound enabled
- [ ] Add video controls (play, pause, volume, fullscreen)
- [ ] Show video metadata (duration, resolution, aspect ratio)
- [ ] Handle video load errors

#### T017: Add "Select this video" button
- [ ] Display button prominently in modal
- [ ] Update selection when clicked
- [ ] Close modal after selection
- [ ] Show success confirmation

#### T018: Implement modal close behavior
- [ ] Close on backdrop click
- [ ] Close on Esc key press
- [ ] Close on "X" button click
- [ ] Stop video playback on close
- [ ] Trap focus within modal (accessibility)

#### T019: Implement Intersection Observer for lazy loading
- [ ] Create `useIntersectionObserver.ts` hook
- [ ] Accept ref and callback props
- [ ] Configure threshold (0.1 = 10% visible)
- [ ] Disconnect on unmount
- [ ] Return `isIntersecting` state

#### T020: Apply lazy loading to VideoThumbnail
- [ ] Wrap thumbnail image in Intersection Observer
- [ ] Only load image when intersecting viewport
- [ ] Preload next 2 thumbnails for smooth experience
- [ ] Handle rapid scrolling

#### T021: Write component tests for VideoThumbnail
- [ ] Test thumbnail renders with props
- [ ] Test hover triggers preview
- [ ] Test click calls onPreview
- [ ] Test selection indicator displays
- [ ] Test loading state
- [ ] Test error state

#### T022: Write component tests for VideoPreviewModal
- [ ] Test modal opens/closes
- [ ] Test video plays
- [ ] Test select button calls onSelect
- [ ] Test backdrop click closes modal
- [ ] Test Esc key closes modal
- [ ] Test focus trapping

---

### WP02: SceneCard Integration & Real-time Updates

#### T023: Add media options section to SceneCard
- [ ] Update `src/ui/components/SceneCard.tsx`
- [ ] Add new section below scene content
- [ ] Accept `mediaOptions` prop
- [ ] Display horizontal scroll for thumbnails
- [ ] Show "No media found" state

#### T024: Integrate VideoThumbnail components
- [ ] Map media options to VideoThumbnail components
- [ ] Pass `onPreview` and `onSelect` handlers
- [ ] Display loading spinner while searching
- [ ] Show error message if search failed

#### T025: Add "Refresh options" button
- [ ] Display button in media options section
- [ ] Call POST /media/refresh on click
- [ ] Show loading state during refresh
- [ ] Disable button during rate limit
- [ ] Display countdown timer when rate limited

#### T026: Update SceneCard types and interfaces
- [ ] Extend SceneCard props with media-related props
- [ ] Add `mediaOptions?: MediaOption[]`
- [ ] Add `onVideoSelect: (optionId: string) => void`
- [ ] Add `onRefreshMedia: () => void`
- [ ] Add `searchStatus?: SearchStatus`

#### T027: Create useMediaSubscription hook
- [ ] Create `src/ui/hooks/useMediaSubscription.ts`
- [ ] Accept `sceneId` parameter
- [ ] Subscribe to `scene_media_options` changes
- [ ] Handle INSERT, UPDATE, DELETE events
- [ ] Update state with new options
- [ ] Unsubscribe on unmount

#### T028: Integrate real-time subscription in SceneCard
- [ ] Call `useMediaSubscription(sceneId)` hook
- [ ] Update media options state on changes
- [ ] Remove deleted options from state
- [ ] Update selection indicator on changes
- [ ] Handle subscription errors

#### T029: Add loading and error states
- [ ] Display spinner when `searchStatus === 'searching'`
- [ ] Show error message when `searchStatus === 'failed'`
- [ ] Show "No results" when `searchStatus === 'no_results'`
- [ ] Display helpful retry buttons

#### T030: Implement selection state management
- [ ] Call POST /media/select on thumbnail click
- [ ] Update local state with selection
- [ ] Real-time subscription updates other clients
- [ ] Persist selection to database
- [ ] Handle selection errors gracefully

#### T031: Update scene service with selection methods
- [ ] Add `selectVideoForScene(sceneId, mediaOptionId)` method
- [ ] Call POST /media/select endpoint
- [ ] Handle authentication
- [ ] Return selected media option
- [ ] Throw errors with user-friendly messages

#### T032: Test selection persistence
- [ ] Select video for scene
- [ ] Refresh page
- [ ] Verify selection persists
- [ ] Check database `is_selected` field
- [ ] Test selection changes

#### T033: Implement rate limit protection for refresh
- [ ] Track last refresh timestamp per scene
- [ ] Disable refresh button for 60 seconds after click
- [ ] Show countdown timer
- [ ] Re-enable button after timeout
- [ ] Store rate limit state in context

#### T034: Add keyboard navigation
- [ ] Tab to thumbnails
- [ ] Enter opens preview modal
- [ ] Esc closes modal
- [ ] Arrow keys navigate thumbnails
- [ ] Focus visible indicators

#### T035: Write integration tests for SceneCard + media
- [ ] Test scene card displays media options
- [ ] Test real-time subscription updates
- [ ] Test selection flow
- [ ] Test refresh button
- [ ] Test error states
- [ ] Mock API responses

#### T036: Test real-time subscription behavior
- [ ] Test INSERT event adds thumbnail
- [ ] Test UPDATE event updates selection
- [ ] Test DELETE event removes thumbnail
- [ ] Test subscription reconnects after disconnect
- [ ] Test multiple scene subscriptions

---

### WP03: Batch Search & Polish

#### T037: Create batch search component
- [ ] Create `src/ui/components/BatchMediaSearch.tsx`
- [ ] Accept `projectScenes` prop
- [ ] Display "Search all scenes" button
- [ ] Show progress indicator during search
- [ ] Queue searches with rate limiting

#### T038: Implement batch search logic
- [ ] Call POST /media/search for each scene
- [ ] Rate limit to 1 request per second
- [ ] Update progress as searches complete
- [ ] Handle partial failures gracefully
- [ ] Show individual errors per scene

#### T039: Add progress indicator
- [ ] Display "X/Y scenes searched" text
- [ ] Show progress bar
- [ ] Update in real-time as searches complete
- [ ] Show completion summary
- [ ] Highlight failed searches

#### T040: Handle batch search errors
- [ ] Continue on individual scene failures
- [ ] Log errors for failed scenes
- [ ] Show "Retry" button on failed scenes
- [ ] Don't block successful searches
- [ ] Display final error count

#### T041: Add smooth animations
- [ ] Animate thumbnail entrance (fade in)
- [ ] Animate selection transition (scale up)
- [ ] Animate loading spinner
- [ ] Animate modal open/close
- [ ] Use CSS transitions (60fps target)

#### T042: Polish UI transitions
- [ ] Add hover effects to buttons
- [ ] Smooth scroll for thumbnail list
- [ ] Loading skeletons
- [ ] Error shake animation
- [ ] Success checkmark animation

#### T043: Add ARIA labels
- [ ] Label all video thumbnails
- [ ] Label modal and its controls
- [ ] Label buttons with clear actions
- [ ] Label progress indicator
- [ ] Describe loading states

#### T044: Test keyboard navigation
- [ ] Test Tab order through SceneCard
- [ ] Test Enter to open preview
- [ ] Test Esc to close modal
- [ ] Test arrow keys for thumbnails
- [ ] Test screen reader announcements

#### T045: Write E2E test for automatic search
- [ ] Create test project
- [ ] Generate scenes
- [ ] Verify search triggers automatically
- [ ] Wait for thumbnails to appear
- [ ] Assert search status is 'completed'

#### T046: Write E2E test for selection flow
- [ ] Navigate to scene card
- [ ] Hover over thumbnail
- [ ] Click thumbnail to open modal
- [ ] Click "Select this video"
- [ ] Verify green border appears
- [ ] Refresh and verify persistence

#### T047: Write E2E test for refresh functionality
- [ ] Click "Refresh options" button
- [ ] Wait for new results
- [ ] Verify thumbnails change
- [ ] Test rate limit countdown
- [ ] Verify old options removed

#### T048: Write E2E test for batch search
- [ ] Create project with 10 scenes
- [ ] Click "Search all scenes"
- [ ] Verify progress updates
- [ ] Wait for completion
- [ ] Verify all scenes have thumbnails
- [ ] Handle errors gracefully

---

## Execution Order

**Recommended Sequence**:
1. **WP00** (Backend API) - Foundation for everything
2. **WP01** (Components) - Can be developed in parallel with WP02
3. **WP02** (Integration) - Requires WP00 and WP01
4. **WP03** (Polish) - Requires WP02

**Parallel Work Opportunities**:
- WP01 tasks can start as soon as WP00 T001-T003 are done (endpoints defined)
- Component tests (T021, T022) can run in parallel with integration work
- E2E tests (T045-T048) can be written while features are being implemented

## Dependencies

```
WP00 (Backend API)
    ↓
WP01 (Components) ───┐
    ↓                 │
WP02 (Integration) ←─┘
    ↓
WP03 (Polish)
```

## Success Metrics

- ✅ All 48 tasks completed
- ✅ Unit test coverage > 80%
- ✅ All integration tests pass
- ✅ All E2E tests pass
- ✅ No console errors in browser
- ✅ Lighthouse accessibility score > 90
- ✅ API response time < 500ms (p95)
- ✅ Search success rate > 95%

---

**Ready to start implementation! Begin with WP00 T001. 🚀**
