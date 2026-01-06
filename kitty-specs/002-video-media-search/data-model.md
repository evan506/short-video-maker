# Data Model: Video Media Search & Rendering

**Feature**: 002 - Video Media Search & Rendering
**Version**: 1.0
**Last Updated**: 2026-01-06

## Entities

### scene_media_options

Stores video options fetched from Pexels API for each scene.

#### Attributes

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `scene_id` | UUID | NOT NULL, FOREIGN KEY → scenes.id ON DELETE CASCADE | Parent scene |
| `pexels_video_id` | INTEGER | NOT NULL | Pexels video identifier |
| `video_url` | TEXT | NOT NULL | Direct URL to video file (Pexels CDN) |
| `thumbnail_url` | TEXT | NOT NULL | Thumbnail image URL |
| `duration_sec` | INTEGER | NOT NULL | Video duration in seconds |
| `width` | INTEGER | NOT NULL | Video resolution width (pixels) |
| `height` | INTEGER | NOT NULL | Video resolution height (pixels) |
| `aspect_ratio` | TEXT | NOT NULL | Aspect ratio (e.g., "9:16", "16:9", "1:1") |
| `is_selected` | BOOLEAN | DEFAULT FALSE | Whether user selected this video |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When option was fetched |
| `expires_at` | TIMESTAMPTZ | DEFAULT NOW() + 24 hours | Cache expiration timestamp |

#### Relationships

- **Belongs to**: `scenes` (many-to-one)
  - `scene_id` → `scenes.id`
  - Cascade delete: When scene is deleted, all media options are deleted

#### Indexes

1. `idx_scene_media_options_scene_id` - Fast lookups by scene
2. `idx_scene_media_options_is_selected` - Find selected videos (partial index)
3. `idx_scene_media_options_expires_at` - Cache cleanup queries
4. `idx_scene_media_options_scene_pexels` - Unique constraint (scene_id, pexels_video_id)
5. `idx_scene_media_options_selected_per_scene` - Only one selected per scene (partial unique index)

#### Validation Rules

- `is_selected` can only be TRUE for one video per scene (enforced by unique index)
- Same Pexels video cannot appear twice for same scene (enforced by unique index)
- Videos expire after 24 hours (managed by `expires_at`)

#### State Transitions

```
[Created] → [Selected] (if user clicks)
[Selected] → [Unselected] (if user selects different video)
[Created] → [Expired] (after 24 hours)
```

### scenes (Extended)

Extended from Phase 1 with media search tracking.

#### New Attributes

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| `media_search_status` | TEXT | DEFAULT 'not_searched', CHECK IN (enum) | Current search status |
| `media_searched_at` | TIMESTAMPTZ | NULLABLE | Timestamp of last search attempt |
| `media_search_error` | TEXT | NULLABLE | Error message if search failed |

#### Enum: media_search_status

- `not_searched` - Initial state, no search attempted
- `searching` - Search in progress
- `completed` - Search completed successfully
- `failed` - Search failed (see `media_search_error`)
- `no_results` - Search completed but no videos found

#### State Transitions

```
[not_searched] → [searching] → [completed]
                              → [no_results]
                              → [failed]

[completed] → [searching] (user refreshes)
[no_results] → [searching] (user retries)
[failed] → [searching] (user retries)
```

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  projects   │1       *│     scenes       │1       *│scene_media_ │
│             │─────────│                  │─────────│  options     │
│ - id        │         │ - id             │         │              │
│ - user_id   │         │ - project_id     │         │ - id         │
│ - title     │         │ - media_search_* │         │ - scene_id   │
│ - status    │         │ - primary_keyword│         │ - pexels_... │
└─────────────┘         │ - narration_text  │         │ - is_selected│
                        └──────────────────┘         └──────────────┘
                               │
                               │ has many
                               ↓
                        ┌──────────────┐
                        │   scripts    │
                        │              │
                        │ - id         │
                        │ - project_id │
                        │ - content    │
                        └──────────────┘
```

## Data Access Patterns

### Reading Media Options

**Query**: Get all options for a scene
```typescript
const { data } = await supabase
  .from('scene_media_options')
  .select('*')
  .eq('scene_id', sceneId)
  .order('created_at', { ascending: true });
```

**Query**: Get selected video for a scene
```typescript
const { data } = await supabase
  .from('scene_media_options')
  .select('*')
  .eq('scene_id', sceneId)
  .eq('is_selected', true)
  .single();
```

### Creating Media Options

**Insert**: Batch insert from Pexels search
```typescript
const { data } = await supabase
  .from('scene_media_options')
  .insert(options.map(opt => ({
    scene_id: sceneId,
    pexels_video_id: opt.pexelsVideoId,
    video_url: opt.videoUrl,
    thumbnail_url: opt.thumbnailUrl,
    duration_sec: opt.durationSec,
    width: opt.width,
    height: opt.height,
    aspect_ratio: opt.aspectRatio,
    is_selected: false
  })));
```

### Updating Media Options

**Update**: Select a video
```typescript
// Transaction: Deselect all, select one
await supabase.rpc('select_scene_media', {
  p_scene_id: sceneId,
  p_media_option_id: mediaOptionId
});
```

**Note**: Use RPC function to ensure atomicity:
```sql
CREATE OR REPLACE FUNCTION select_scene_media(
  p_scene_id UUID,
  p_media_option_id UUID
) AS $$
BEGIN
  -- Deselect all for this scene
  UPDATE scene_media_options
  SET is_selected = false
  WHERE scene_id = p_scene_id;

  -- Select the chosen one
  UPDATE scene_media_options
  SET is_selected = true
  WHERE id = p_media_option_id;

  -- Update scene search status
  UPDATE scenes
  SET media_search_status = 'completed'
  WHERE id = p_scene_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Deleting Media Options

**Delete**: Remove old options before refresh
```typescript
await supabase
  .from('scene_media_options')
  .delete()
  .eq('scene_id', sceneId);
```

**Cascade**: Scene deleted → options auto-deleted
```typescript
await supabase
  .from('scenes')
  .delete()
  .eq('id', sceneId);
// scene_media_options cascade deleted automatically
```

### Real-time Subscriptions

**Subscribe**: Listen for changes to scene's media options
```typescript
const subscription = supabase
  .channel(`scene_media_${sceneId}`)
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'scene_media_options',
    filter: `scene_id=eq.${sceneId}`
  }, (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        // Add new option to UI
        break;
      case 'UPDATE':
        // Update option (e.g., selection changed)
        break;
      case 'DELETE':
        // Remove option from UI
        break;
    }
  })
  .subscribe();
```

## Cache Management

### Cleanup Strategy

**Background Job**: Delete expired options
```sql
-- Run daily via cron or pg_cron
DELETE FROM scene_media_options
WHERE expires_at < NOW();
```

**Application-Level**: Check cache before searching
```typescript
const cached = await supabase
  .from('scene_media_options')
  .select('*')
  .eq('scene_id', sceneId)
  .gt('expires_at', new Date().toISOString());

if (cached.data && cached.data.length > 0) {
  // Use cached results
  return cached.data;
}
```

## Security Considerations

### Row Level Security (RLS)

All policies ensure users can only access media options for their own projects:

```sql
-- Users can view media options for their own projects
CREATE POLICY "Users can view media options for their own projects"
  ON scene_media_options
  FOR SELECT
  USING (
    scene_id IN (
      SELECT s.id FROM scenes s
      JOIN projects p ON s.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
```

**Validation**:
- ✅ Users cannot access other users' media options
- ✅ Users cannot insert options for other users' scenes
- ✅ Users cannot modify other users' selections
- ✅ Cascade deletes work correctly

### Input Validation

**Application Layer**:
- `scene_id`: UUID format validation
- `pexels_video_id`: Positive integer check
- `video_url`, `thumbnail_url`: URL format validation
- `duration_sec`: Positive integer (> 0)
- `width`, `height`: Positive integer (> 0)
- `aspect_ratio`: Enum validation ("9:16", "16:9", "1:1")

**Database Layer**:
- NOT NULL constraints on required fields
- CHECK constraints on enums
- FOREIGN KEY constraints for referential integrity
- UNIQUE constraints prevent duplicates

## Performance Optimization

### Query Optimization

**Index Usage**:
- Filter by `scene_id` → Uses `idx_scene_media_options_scene_id`
- Find selected video → Uses `idx_scene_media_options_is_selected`
- Cleanup expired → Uses `idx_scene_media_options_expires_at`

**Covering Indexes**:
```sql
-- Index for common query pattern
CREATE INDEX idx_scene_media_options_scene_selected
  ON scene_media_options(scene_id, is_selected, created_at)
  WHERE is_selected = TRUE;
```

### Caching Strategy

**Application Cache** (in-memory):
- Search results cached in Node.js Map
- 24-hour TTL matches database cache
- Reduces Pexels API calls

**Database Cache** (persistent):
- Options stored in database for 24 hours
- Indexed for fast retrieval
- Auto-expired via `expires_at` timestamp

**CDN Cache** (Pexels):
- Video thumbnails served from Pexels CDN
- No bandwidth cost to our servers
- Fast global distribution

## Migration Strategy

### Phase 2 Rollout

**Step 1**: Apply migration (✅ Done)
```bash
# Migration creates:
# - scene_media_options table
# - New columns on scenes
# - RLS policies
```

**Step 2**: Deploy backend API
```bash
# New endpoints:
# - POST /api/v1/media/search
# - POST /api/v1/media/select
# - POST /api/v1/media/refresh
```

**Step 3**: Deploy frontend components
```bash
# New components:
# - VideoThumbnail
# - VideoPreviewModal
# - Updated SceneCard
```

**Step 4**: Enable real-time
```bash
# Supabase dashboard:
# - Enable real-time for scene_media_options
```

### Rollback Plan

If critical issues arise:
1. Disable automatic search trigger (feature flag)
2. Remove Phase 2 routes (keep Phase 1 working)
3. Scene cards revert to Phase 1 state
4. No data loss (media options can be deleted later)

## Data Retention

### Retention Policy

- **Active Projects**: Keep options until 24-hour expiration
- **Deleted Scenes**: Cascade delete immediately
- **Expired Options**: Delete via background job
- **User Data**: Deleted when user account deleted

### Cleanup Jobs

**Daily Cleanup**:
```sql
DELETE FROM scene_media_options
WHERE expires_at < NOW();
```

**Orphan Cleanup** (if scene deleted without cascade):
```sql
DELETE FROM scene_media_options
WHERE scene_id NOT IN (SELECT id FROM scenes);
```

---

**End of Data Model Documentation**
