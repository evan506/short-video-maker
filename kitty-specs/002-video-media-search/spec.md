# Feature Specification: Video Media Search & Rendering

**Feature Branch**: `[002-video-media-search]`
**Created**: 2026-01-06
**Status**: Draft
**Input**: Phase 2: Media Integration & Rendering - Implement media search service using Pexels API to automatically fetch relevant videos based on scene keywords. The service should present 3-5 video options to users for manual selection when scenes are created.

## Overview

This feature enables creators to bring their storyboards to life by automatically searching for and selecting relevant video content from Pexels' extensive library. When scenes are created in the storyboard, the system automatically fetches relevant video options based on scene keywords, allowing creators to visually preview and select the best match for each scene.

**User Value**: Transforms static text-based storyboards into visual previews with real video content, enabling creators to see their vision come to life before investing in full rendering.

**Scope**: Media search and selection only. Video rendering, audio integration, and final export are out of scope for this feature.

## User Scenarios & Testing

### User Story 1 - Automatic Media Search on Scene Creation (Priority: P1)

When a creator's storyboard is generated or scenes are added, the system automatically searches Pexels for relevant videos based on each scene's keywords. The search happens transparently in the background without requiring manual intervention.

**Why this priority**: This is the core automation that eliminates the tedious manual search process. Creators get immediate visual context for each scene without leaving the editor.

**Independent Test**: Can be tested by creating a scene with keywords and verifying that video options are automatically fetched and displayed. Delivers value by transforming abstract scene cards into visual previews.

**Acceptance Scenarios**:

1. **Given** a scene is created with primary_keyword="grilling steak", **When** the scene is saved to the database, **Then** the system automatically triggers a Pexels API search and retrieves 3-5 relevant video options within 10 seconds
2. **Given** a scene has no keywords set, **When** the scene is created, **Then** the system extracts keywords from the narration text using LLM-based analysis before triggering the media search
3. **Given** a Pexels search returns zero results, **When** no videos are found, **Then** the system marks the scene as "no media found" and displays a helpful message "Try adjusting the scene keywords"
4. **Given** the Pexels API rate limit is exceeded, **When** a 429 error occurs, **Then** the system retries with exponential backoff (up to 3 attempts) and shows a "Media search temporarily unavailable, retrying..." message
5. **Given** a scene already has media options from a previous search, **When** the scene keywords are updated, **Then** the system triggers a new search and replaces the old options with fresh results

---

### User Story 2 - Video Option Preview and Selection (Priority: P1)

A creator sees 3-5 video thumbnail options for each scene card. They can preview each video by hovering/clicking to watch a short preview, then select the best match for their vision. The selected video is clearly indicated on the scene card.

**Why this priority**: This gives creators creative control and ensures the final video matches their artistic vision. Manual selection prevents AI from making poor aesthetic choices.

**Independent Test**: Can be tested by viewing scene cards with loaded media options, previewing videos, and selecting one. Delivers value by enabling informed creative decisions.

**Acceptance Scenarios**:

1. **Given** a scene has 5 video options loaded, **When** the creator views the scene card, **Then** they see 5 video thumbnails arranged horizontally with preview play buttons overlaid
2. **Given** a creator hovers over a video thumbnail, **When** the mouse hovers for 0.5 seconds, **Then** the thumbnail plays a 3-second auto-preview loop (muted) to show video content
3. **Given** a creator clicks on a video thumbnail, **When** clicked, **Then** a modal opens showing the full video with sound, video duration, resolution, and a "Select this video" button
4. **Given** a creator clicks "Select this video" for an option, **When** selected, **Then** the scene card updates to show that video as the primary media with a visual indicator (green border or checkmark), and the selection is saved to the database
5. **Given** a creator has selected a video but changes their mind, **When** they click a different video option, **Then** the selection updates to the new video and the database is updated
6. **Given** no video has been selected yet, **When** the scene card displays, **Then** it shows all options equally without a selection indicator and prompts "Select a video for this scene"

---

### User Story 3 - Media Option Refresh and Re-search (Priority: P2)

A creator isn't satisfied with the initial video options returned for a scene. They can manually trigger a new search with adjusted keywords or fetch more options from Pexels to expand their choices.

**Why this priority**: Creative exploration often requires iteration. The first search might not capture the right mood or visual style, so re-search capability prevents frustration.

**Independent Test**: Can be tested by clicking "Refresh options" on a scene, modifying keywords, and verifying new video options are fetched. Delivers value by enabling creative exploration.

**Acceptance Scenarios**:

1. **Given** a scene has 5 video options loaded, **When** the creator clicks "Refresh options" button, **Then** the system triggers a new Pexels search and replaces the current options with fresh results
2. **Given** a creator wants to try different keywords, **When** they click "Edit keywords", enter new keywords, and submit, **Then** the system updates the scene keywords and immediately triggers a new media search
3. **Given** the system is rate-limited by Pexels, **When** a creator clicks "Refresh" within the rate-limit window, **Then** the system shows a countdown timer "Available again in X seconds" and disables the refresh button
4. **Given** a creator has already selected a video, **When** they refresh options, **Then** the system preserves their current selection even if it's no longer in the new results (show it as "Previously selected" with a distinct visual style)

---

### User Story 4 - Batch Media Search for All Scenes (Priority: P3)

A creator has created multiple scenes and wants to see video options for all of them at once. They can trigger a batch search that fetches media for all scenes in parallel, showing progress as each scene's options load.

**Why this priority**: Convenience feature for power users working on longer storyboards. Not critical since automatic search happens per-scene, but useful for overview.

**Independent Test**: Can be tested by creating 10 scenes, clicking "Search all scenes", and verifying all scenes receive media options. Delivers value by providing at-a-glance media availability.

**Acceptance Scenarios**:

1. **Given** a storyboard has 15 scenes, **When** the creator clicks "Search all scenes" button, **Then** the system initiates parallel searches for all scenes (with rate limiting) and updates each scene card as results arrive
2. **Given** batch search is in progress, **When** 5 of 15 scenes have completed, **Then** the system shows a progress indicator "5/15 scenes searched" and displays a loading spinner on remaining scene cards
3. **Given** batch search encounters errors for some scenes, **When** 3 scenes fail to load, **Then** the system completes successfully for the other 12 scenes and shows individual error messages on the 3 failed cards with "Retry" buttons
4. **Given** a batch search is running, **When** the creator navigates away from the page, **Then** the search continues in the background and results are saved; when the creator returns, all loaded options are displayed

---

## Functional Requirements

### FR1 - Media Search Service

The system SHALL provide a backend service that searches the Pexels API for videos based on scene keywords.

**Requirements**:
- Search Pexels videos API using scene primary_keyword and secondary keywords
- Retrieve 3-5 video results per search (configurable via environment variable)
- Filter results by minimum quality standards (duration > 2 seconds, resolution >= 720p)
- Handle API errors gracefully with retry logic (exponential backoff, max 3 attempts)
- Respect Pexels rate limits (200 requests/hour for free tier)
- Cache search results for 24 hours to reduce redundant API calls
- Return video metadata: URL, thumbnail, duration, resolution, aspect ratio

**Acceptance Criteria**:
- Given valid keywords, service returns 3-5 video options within 10 seconds
- Given API rate limit error, service retries with backoff and succeeds or fails gracefully after 3 attempts
- Given no results found, service returns empty array with appropriate status
- Given cached results exist within 24 hours, service returns cached data without API call

### FR2 - Automatic Search Trigger

The system SHALL automatically trigger media search when scenes are created or keywords are updated.

**Requirements**:
- Trigger search immediately after scene creation completes
- Trigger search when scene keywords are modified
- Queue searches to avoid overwhelming Pexels API (max 1 request per second)
- Store search status (searching, completed, failed, no_results) on each scene
- Update scene cards in real-time as results arrive

**Acceptance Criteria**:
- Given scene is created, search is triggered automatically within 1 second
- Given keywords are updated, new search is triggered and old options are replaced
- Given 10 scenes are created in batch, searches are rate-limited to 1 request/second
- Given search completes, scene status updates from "searching" to "completed"

### FR3 - Video Option Storage

The system SHALL store fetched video options in the database for each scene.

**Requirements**:
- Create `scene_media_options` table to store video metadata
- Link options to scenes via foreign key
- Store: Pexels video ID, URL, thumbnail URL, duration, resolution, aspect ratio
- Mark one option as "selected" per scene
- Allow storing multiple unselected options
- Cascade delete options when scene is deleted

**Acceptance Criteria**:
- Given search returns 5 videos, all 5 are stored in database with scene_id
- Given user selects video option #2, it is marked as selected=true
- Given scene is deleted, all associated media options are cascade deleted
- Given search is refreshed, old options are deleted and replaced with new ones

### FR4 - Frontend Media Preview UI

The system SHALL display video options on scene cards with preview capabilities.

**Requirements**:
- Display 3-5 video thumbnails per scene card in horizontal scroll
- Show hover-to-preview functionality (3-second muted loop)
- Show click-to-preview modal with full video playback and metadata
- Display selection indicator (green border/checkmark) on selected video
- Show "Refresh options" button on each scene card
- Display loading state while search is in progress
- Show error messages when search fails

**Acceptance Criteria**:
- Given scene has 5 options, all 5 thumbnails are visible and accessible via scroll
- Given user hovers thumbnail, video auto-plays for 3 seconds (muted)
- Given user clicks thumbnail, modal opens with full video and details
- Given video is selected, thumbnail shows green border and checkmark overlay
- Given search is in progress, loading spinner is displayed on scene card

### FR5 - Keyword Extraction Fallback

The system SHALL automatically extract keywords from scene narration if no keywords are set.

**Requirements**:
- Use LLM to analyze narration text and extract 2-3 meaningful keywords
- Fall back to rule-based extraction (first noun phrase, capitalized words)
- Store extracted keywords as primary_keyword on the scene
- Trigger media search after keyword extraction completes

**Acceptance Criteria**:
- Given scene has narration="A perfectly cooked steak sizzles on the grill" and no keywords, LLM extracts ["grilling", "steak", "cooking"]
- Given LLM extraction fails, rule-based extraction extracts "grilling" and "steak"
- Given extraction completes, keywords are saved and media search is triggered

## Success Criteria

### Quantitative Metrics

- **Media search latency**: 95% of searches complete within 10 seconds
- **API rate limit compliance**: Zero Pexels API 429 errors from exceeding 200 requests/hour
- **Search success rate**: 95% of scenes successfully retrieve at least 3 video options
- **Cache hit rate**: 70% of duplicate searches served from cache (reducing API calls)
- **User selection time**: Users select a video for a scene within 30 seconds on average

### Qualitative Outcomes

- **Creative empowerment**: Creators report feeling "in control" of their video's visual direction (measured via post-release survey)
- **Search relevance**: 80% of users rate the returned video options as "relevant" or "very relevant" to their scene content
- **Workflow efficiency**: Creators complete the media selection phase for a 15-scene storyboard in under 5 minutes
- **Error recovery**: 90% of users successfully recover from search failures using retry/refresh options without support assistance

## Key Entities

### Scene Media Option

**Attributes**:
- `id` (UUID): Primary key
- `scene_id` (UUID FK): Link to scenes table
- `pexels_video_id` (string): Pexels video identifier
- `video_url` (string): Direct URL to video file
- `thumbnail_url` (string): Thumbnail image URL
- `duration_sec` (integer): Video duration in seconds
- `width` (integer): Video resolution width
- `height` (integer): Video resolution height
- `aspect_ratio` (string): "16:9", "9:16", "1:1"
- `is_selected` (boolean): Whether user selected this option (default: false)
- `created_at` (timestamp): When option was fetched
- `expires_at` (timestamp): Cache expiration (24 hours)

**Relationships**:
- Belongs to Scene (many-to-one)
- Cascade deleted when Scene is deleted

### Scene (Extended)

**New Attributes**:
- `media_search_status` (enum): "not_searched", "searching", "completed", "failed", "no_results"
- `media_searched_at` (timestamp): Last search timestamp
- `media_search_error` (text): Error message if search failed

## Out of Scope

- **Video rendering and composition**: Not part of this feature (deferred to Phase 3)
- **Audio integration and TTS**: Not addressed in this feature
- **Video editing capabilities**: Trimming, filters, transitions are out of scope
- **Multiple video providers**: Only Pexels is supported (adding YouTube/Pixabay later)
- **User-uploaded media**: Users cannot upload their own videos in this feature
- **Video download and storage**: Videos are streamed directly from Pexels URLs
- **Final video export**: Export functionality is separate feature

## Assumptions

1. **Pexels API key**: User has a valid Pexels API key configured in environment variables
2. **API rate limits**: Free tier Pexels plan (200 requests/hour) is sufficient for development; may need upgrade for production
3. **Video availability**: All videos returned by Pexels API are accessible and playable
4. **Network reliability**: Users have stable internet connection for video streaming and API calls
5. **Browser support**: Modern browsers (Chrome, Firefox, Safari, Edge) with HTML5 video support
6. **Keyword extraction**: LLM-based extraction is reasonably accurate for scene context; rule-based fallback catches obvious failures
7. **Caching strategy**: 24-hour cache balances freshness with API quota efficiency
8. **Copyright compliance**: Pexels videos are royalty-free for commercial use (per Pexels terms)

## Dependencies

- **Pexels Videos API**: External service for video search and metadata retrieval
- **Phase 1 (Script & Storyboard Editor)**: Requires scenes table and keyword fields from Phase 1
- **OpenRouter API**: Used for keyword extraction fallback (LLM-based)
- **Supabase Database**: Storage for scene_media_options table and scene extensions

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pexels API rate limits exceeded | High (blocking searches) | Medium | Implement aggressive caching, rate limiting, and queue system |
| Poor search relevance | Medium (user frustration) | Medium | Allow manual keyword editing and re-search; provide "Refresh" button |
| Video links become invalid | Medium (broken previews) | Low | 24-hour cache reduces staleness; implement link validation on selection |
| Slow API response times | Low (poor UX) | Medium | Show loading states; implement timeout and retry with fallback |
| Copyright/licensing issues | High (legal risk) | Low | Pexels is royalty-free; document usage terms in UI |

## Open Questions

None at this time. Specification is ready for planning phase.
