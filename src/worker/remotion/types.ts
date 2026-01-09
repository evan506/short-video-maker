/**
 * Database types for video rendering
 */

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  narration_text: string;
  duration_sec_draft: number;
  duration_sec_final?: number;
  primary_keyword: string;
  subtitle_timing?: SubtitleTiming;
  subtitle_style_preset_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  scene_id: string;
  media_type: 'video' | 'image';
  url: string;
  thumbnail_url?: string;
  duration_sec?: number;
  provider: string;
  provider_media_id: string;
  width?: number;
  height?: number;
  created_at: string;
}

export interface SceneAudio {
  id: string;
  scene_id: string;
  audio_type: 'voiceover' | 'music';
  url: string;
  duration_sec: number;
  provider?: string;
  provider_audio_id?: string;
  voice_id?: string;
  created_at: string;
}

export interface SubtitleTiming {
  word: string;
  start_ms: number;
  end_ms: number;
}

export interface VideoCompositionProps {
  projectId: string;
  renderJobId: string;
}

export interface SceneCompositionProps {
  scene: Scene;
  media?: MediaAsset;
  audio?: SceneAudio;
  subtitlePreset?: string;
}
