# Music Library Seeding Instructions

## Overview

This document provides step-by-step instructions for seeding the background music library for Feature 003 - Audio Voiceover Integration.

## Prerequisites

1. **Supabase Storage Bucket**: Ensure `music-library` bucket exists in Supabase Storage
2. **Environment Variables**: Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
3. **Node.js Dependencies**: Install with `npm install`

## Step 1: Download Music Tracks

Go to [YouTube Audio Library](https://www.youtube.com/audiolibrary) and download 20 royalty-free tracks.

### Track Selection (4 categories)

**Upbeat (4 tracks)**
- Search filter: "Sound effects" > "Music"
- Mood: Upbeat, energetic, motivational
- Tempo: 120-140 BPM
- Save as: `upbeat-01.mp3`, `upbeat-02.mp3`, etc.

**Calm (5 tracks)**
- Mood: Calm, relaxing, peaceful
- Tempo: 60-90 BPM
- Save as: `calm-01.mp3`, `calm-02.mp3`, etc.

**Dramatic (5 tracks)**
- Mood: Dramatic, cinematic, intense
- Tempo: 80-110 BPM
- Save as: `dramatic-01.mp3`, `dramatic-02.mp3`, etc.

**Inspirational (5 tracks)**
- Mood: Inspirational, uplifting, emotional
- Tempo: 100-130 BPM
- Save as: `inspirational-01.mp3`, `inspirational-02.mp3`, etc.

### Important Notes
- ✅ Only download tracks marked "Attribution not required"
- ✅ Preferred format: MP3, 192kbps or higher
- ✅ Verify license allows commercial use in short videos

## Step 2: Organize Files

Create directory structure:
```bash
mkdir -p public/music-seeds
```

Move downloaded files to `public/music-seeds/` directory.

## Step 3: Update Metadata Array

Edit `scripts/seed-music-library.ts` and populate the `MUSIC_METADATA` array with track information:

```typescript
const MUSIC_METADATA: any[] = [
  {
    title: 'Upbeat Energy 1',
    artist: 'YouTube Audio Library',
    mood: ['upbeat', 'energetic', 'motivational'],
    energy_level: 8,
    tempo: 128,
    genre: 'electronic',
    tags: ['drums', 'synth', 'catchy'],
    file_path: 'public/music-seeds/upbeat-01.mp3',
    duration_sec: 145.5
  },
  // ... add 19 more tracks
];
```

For each track, include:
- `title`: Track name
- `artist`: "YouTube Audio Library" or actual artist
- `mood`: Array of mood tags
- `energy_level`: 1-10 (1=calm, 10=high energy)
- `tempo`: BPM
- `genre`: Music genre
- `tags`: Additional keywords
- `file_path`: Path to downloaded file
- `duration_sec`: Track length in seconds

## Step 4: Run Seed Script

```bash
npm run seed:music-library
# or
npx tsx scripts/seed-music-library.ts
```

## Step 5: Verify

Check Supabase database:
```sql
SELECT COUNT(*) FROM background_music;
-- Should return: 20
```

Check Supabase Storage dashboard:
- Bucket `music-library` should have 20 MP3 files

## Troubleshooting

**Upload Failed**
- Check Supabase Storage bucket exists
- Verify `SUPABASE_SERVICE_ROLE_KEY` has storage permissions

**Database Insert Failed**
- Check RLS policies on `background_music` table
- Verify table schema matches migration

**File Not Found**
- Ensure file paths are correct relative to project root
- Check files are in `public/music-seeds/`

## Completed Example

After successful seeding, you should see:
```
🎵 Starting music library seed...
Processing: Upbeat Energy 1
  ✅ Success: Upbeat Energy 1
Processing: Calm Atmosphere 1
  ✅ Success: Calm Atmosphere 1
...

📊 Summary:
  ✅ Success: 20
  ❌ Errors: 0
  📈 Total: 20

🎉 Music library seeded successfully!
```

## Next Steps

After seeding complete:
1. Run validation queries to verify data
2. Test music library API endpoints
3. Verify music files are accessible via signed URLs
4. Proceed to WP02 (Edge TTS Service Integration)
