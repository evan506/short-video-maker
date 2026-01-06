# Phase 3: Audio & Voiceover Integration

**Feature**: 003 - Audio & Voiceover Integration
**Status**: Planning
**Priority**: P0 (Critical for final video output)
**Dependencies**: Feature 002 (Video Media Search) - COMPLETE

## 🎯 Overview

Phase 3 focuses on generating high-quality voiceovers from scene scripts and integrating background music with professional audio mixing. This phase brings together the visual content from Phase 2 with audio to create the complete short video experience.

## 📋 Key Objectives

1. **Text-to-Speech (TTS) Integration**
   - Integrate Azure Cognitive Services or Edge TTS
   - Generate natural-sounding voiceovers from narration text
   - Support multiple voices and languages
   - Adjust speed, pitch, and tone

2. **Audio Management**
   - Store generated audio files efficiently
   - Handle audio metadata (duration, format, quality)
   - Version control for regenerated audio

3. **Background Music Integration**
   - Integrate royalty-free music sources (e.g., YouTube Audio Library)
   - Match music mood to scene content
   - Adjust volume levels for voiceover clarity

4. **Audio Mixing & Final Output**
   - Combine voiceover + background music
   - Ensure audio levels are balanced
   - Export final audio track for video rendering

## 🏗️ Architecture

### Backend Components

```
src/server/
├── services/
│   ├── tts-service.ts          # Azure/Edge TTS integration
│   ├── audio-storage.ts        # Cloud storage for audio files
│   └── audio-mixing.ts         # FFmpeg-based audio mixing
├── routers/
│   └── audio-router.ts         # Audio API endpoints
└── utils/
    └── audio-processor.ts      # Audio format conversion
```

### Frontend Components

```
src/ui/components/
├── audio/
│   ├── VoiceoverGenerator.tsx  # TTS generation UI
│   ├── AudioPlayer.tsx         # Audio playback
│   ├── MusicSelector.tsx       # Background music picker
│   └── AudioMixer.tsx          # Volume controls, preview
└── hooks/
    ├── useAudioGeneration.ts   # TTS generation hook
    └── useAudioPlayback.ts     # Audio playback controls
```

### Database Schema

```sql
-- Scene audio files
CREATE TABLE scene_audio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  audio_type TEXT CHECK (audio_type IN ('voiceover', 'music', 'mixed')),
  storage_url TEXT NOT NULL,
  duration_sec DECIMAL(10, 2),
  file_format TEXT DEFAULT 'mp3',
  bit_rate INTEGER DEFAULT 128,
  sample_rate INTEGER DEFAULT 44100,
  file_size_bytes BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio generation jobs
CREATE TABLE audio_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id UUID REFERENCES scenes(id),
  job_type TEXT CHECK (job_type IN ('voiceover', 'mixing')),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tts_provider TEXT,
  voice_name TEXT,
  options JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Background music library
CREATE TABLE background_music (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT,
  source_url TEXT NOT NULL,
  storage_url TEXT,
  duration_sec DECIMAL(10, 2),
  mood TEXT[],
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  tempo INTEGER,
  genre TEXT,
  tags TEXT[],
  is_royalty_free BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔑 Key Features

### 1. TTS Voiceover Generation

**User Flow**:
1. User navigates to storyboard editor
2. Clicks "Generate Voiceovers" button
3. System generates voiceover for each scene (batch processing)
4. Shows progress: "3/15 scenes generated"
5. User can play back voiceovers
6. User can regenerate individual scenes with different voice

**API Endpoints**:
```typescript
POST /api/v1/audio/voiceover/generate
{
  sceneId: string,
  voiceName: string,          // e.g., "en-US-JennyNeural"
  rate: number,                // 0.5 to 2.0 (1.0 = normal)
  pitch: number,               // -10 to +10
  volume: number               // 0 to 1
}

Response:
{
  audioUrl: string,
  duration: number,
  jobId: string
}
```

### 2. Background Music Selection

**Features**:
- Search music library by mood, genre, tempo
- Preview music tracks
- Auto-select music based on scene keywords
- Volume control (duck voiceover when music plays)

**API Endpoints**:
```typescript
GET /api/v1/music/library?mood=upbeat&genre=pop
Response: { tracks: BackgroundMusic[] }

POST /api/v1/music/select
{
  sceneId: string,
  musicId: string,
  volume: number              // 0 to 1
}
```

### 3. Audio Mixing

**Features**:
- Combine voiceover + background music
- Adjust individual track volumes
- Fade in/out transitions
- Normalize audio levels

**API Endpoints**:
```typescript
POST /api/v1/audio/mix
{
  sceneId: string,
  voiceoverVolume: number,    // 0 to 1
  musicVolume: number,         // 0 to 1
  fadeInDuration: number,      // seconds
  fadeOutDuration: number      // seconds
}

Response:
{
  mixedAudioUrl: string,
  duration: number
}
```

## 🎛️ TTS Provider Options

### Azure Cognitive Services (Recommended)

**Pros**:
- High-quality neural voices
- SSML support for advanced control
- Reliable API
- Multiple languages and voices

**Cons**:
- Cost: ~$15 per 1M characters
- Requires Azure subscription

**Implementation**:
```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;
```

### Edge TTS (Free Alternative)

**Pros**:
- Free and open-source
- No API keys required
- Self-hosted

**Cons**:
- Lower voice quality
- Limited language support
- Requires self-hosting

## 🎵 Background Music Sources

### Option 1: YouTube Audio Library (Recommended)

- 1,000+ royalty-free tracks
- Search by mood, genre, duration
- Free for use in short videos

### Option 2: Freesound.org

- Community-uploaded sounds
- Attribution required for some tracks
- API for programmatic access

### Option 3: Premium Libraries

- Epidemic Sound
- Artlist
- Musicbed (paid subscriptions)

## 🔊 Audio Processing Pipeline

```
1. Generate Voiceover (TTS)
   ├─ Input: Scene narration_text
   ├─ Process: Azure TTS API
   └─ Output: MP3 file (16kHz, 128kbps)

2. Select Background Music
   ├─ Input: Scene mood/keywords
   ├─ Process: Match music library
   └─ Output: MP3 file (44.1kHz, 192kbps)

3. Mix Audio Tracks
   ├─ Input: Voiceover + Music
   ├─ Process: FFmpeg normalization + mixing
   └─ Output: Mixed MP3 file

4. Synchronize with Video
   ├─ Input: Mixed audio + Selected video
   ├─ Process: FFmpeg video encoding
   └─ Output: Final MP4 video
```

## 📊 Success Metrics

- ✅ Voiceover generation < 5 seconds per scene
- ✅ Audio quality: 44.1kHz, 128kbps minimum
- ✅ Mixed audio output is balanced (voiceover clearly audible)
- ✅ Support for 10+ voices and 5+ languages
- ✅ Background music database with 100+ tracks
- ✅ Audio regeneration works for individual scenes

## 🚀 Implementation Phases

### Phase 3.1: TTS Integration (Week 1)
- Set up Azure Cognitive Services account
- Implement basic TTS generation
- Create voiceover player component
- Store audio files in cloud storage

### Phase 3.2: Background Music (Week 2)
- Import YouTube Audio Library
- Create music selection UI
- Implement mood-based matching
- Add preview functionality

### Phase 3.3: Audio Mixing (Week 3)
- Implement FFmpeg audio mixing
- Create volume control UI
- Add fade in/out transitions
- Normalize audio levels

### Phase 3.4: Integration & Testing (Week 4)
- Integrate with Phase 2 video selection
- End-to-end testing
- Performance optimization
- Deploy to production

## 🔐 Security & Cost Considerations

**Security**:
- Azure Speech API key in environment variables
- Storage URLs signed with temporary access tokens
- Rate limiting on TTS generation (prevent abuse)

**Cost Estimates**:
- Azure Speech: ~$15 per 1M characters
- Storage: ~$0.02 per GB/month (S3/R2)
- Bandwidth: ~$0.01 per GB transfer

**Example**: 100 videos × 30 scenes × 50 words = 150K words ≈ 750K characters
- Cost: ~$11.25 for TTS generation
- Storage: ~500MB audio files = ~$0.01/month

## 📝 Open Questions

1. **TTS Provider**: Azure Cognitive Services or Edge TTS?
2. **Music Source**: YouTube Audio Library or premium service?
3. **Audio Storage**: Cloud (S3/R2) or local filesystem?
4. **Batch Processing**: Queue system (BullMQ) or fire-and-forget?
5. **Audio Formats**: MP3 (128kbps) or higher quality?

## 🎬 Next Steps

Once Phase 3 is complete, we'll have:
- ✅ Visual content (Phase 2: Pexels videos)
- ✅ Audio content (Phase 3: TTS voiceovers + music)
- ✅ Ready for Phase 4: Final Video Rendering

---

**Status**: Ready for implementation planning
**Estimated Timeline**: 4 weeks
**Team Size**: 1-2 developers
**Priority**: High (blocks final video output)
