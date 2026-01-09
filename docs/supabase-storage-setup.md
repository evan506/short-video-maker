# Supabase Storage Setup Guide

**Feature**: 004-visuals-video-rendering
**Bucket**: `exports`
**Purpose**: Store rendered MP4 video files for user download

## Manual Setup via Supabase Dashboard

### Step 1: Create the Bucket

1. Navigate to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Enter bucket name: `exports`
4. Configure settings:
   - **Public bucket**: OFF (private bucket, no public access)
   - **File size limit**: 100 MB (sufficient for 60-second videos)
   - **Allowed MIME types**: `video/mp4`
5. Click "Create bucket"

### Step 2: Configure RLS Policies for Storage

Run the following SQL in Supabase SQL Editor to enforce user isolation:

```sql
-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload own exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can download their own files
CREATE POLICY "Users can download own exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Folder Structure

The bucket follows this folder structure:

```
exports/
  {user_id}/
    {project_id}/
      {render_job_id}.mp4
```

**Example**:
```
exports/
  550e8400-e29b-41d4-a716-446655440000/
    a1b2c3d4-e5f6-7890-abcd-ef1234567890/
      f1234567-89ab-cdef-0123-456789abcdef.mp4
```

## Automated Setup via Terraform (Optional)

If you use Terraform for infrastructure as code:

```hcl
resource "supabase_storage_bucket" "exports" {
  name        = "exports"
  public      = false
  file_size_limit = 104857600 # 100 MB
  allowed_mime_types = ["video/mp4"]
}

# RLS policies are managed via Supabase SQL (see above)
```

## Signed URL Generation

Worker generates signed URLs for download (7-day expiry):

```typescript
const { data, error } = await supabase.storage
  .from('exports')
  .createSignedUrl(`${userId}/${projectId}/${renderJobId}.mp4`, 60 * 60 * 24 * 7);
```

## Validation Checklist

- [ ] Bucket `exports` created in Supabase Storage
- [ ] Bucket is private (public access disabled)
- [ ] RLS policies created for user isolation
- [ ] Test upload: Upload test file to `exports/{user_id}/test.txt`
- [ ] Test signed URL: Generate signed URL and verify download works
- [ ] Test user isolation: User B cannot access User A's files (403 Forbidden)

## Troubleshooting

### Issue: Upload fails with 403 Forbidden

**Cause**: RLS policy blocks upload
**Fix**: Verify user matches folder path: `(storage.foldername(name))[1] = auth.uid()::text`

### Issue: Signed URL returns 403 after generation

**Cause**: URL expired (7-day limit) or user lacks download permission
**Fix**: Regenerate signed URL or verify RLS policy includes `SELECT` permission

### Issue: Storage quota exceeded

**Cause**: 5GB free tier limit reached
**Fix**: Upgrade to Supabase Pro (100GB) or implement cleanup policy for old exports
