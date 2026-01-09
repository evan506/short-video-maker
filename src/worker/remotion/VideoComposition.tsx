import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { createClient } from '@supabase/supabase-js';
import { Scene } from './types';
import { SceneComposition } from './SceneComposition';

/**
 * VideoComposition - Main Remotion composition
 *
 * Queries database for scenes, media assets, and audio,
 * then renders each scene sequentially using <Sequence>.
 *
 * Props:
 * - projectId: UUID of the project to render
 * - renderJobId: UUID of the render job (for logging/tracking)
 */
export interface VideoCompositionProps {
  projectId: string;
  renderJobId: string;
}

interface FetchedScene extends Scene {
  media?: {
    url: string;
    type: 'video' | 'image';
  } | null;
  audio?: {
    url: string;
    duration_sec: number;
  } | null;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  projectId,
  renderJobId,
}) => {
  const { fps } = useVideoConfig();
  const [scenes, setScenes] = useState<FetchedScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch scenes, media, and audio on mount
  useEffect(() => {
    async function fetchCompositionData() {
      try {
        // Initialize Supabase client with service role key
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase credentials');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch scenes ordered by index
        const { data: scenesData, error: scenesError } = await supabase
          .from('scenes')
          .select('*')
          .eq('project_id', projectId)
          .order('order_index', { ascending: true });

        if (scenesError) {
          throw new Error(`Failed to fetch scenes: ${scenesError.message}`);
        }

        if (!scenesData || scenesData.length === 0) {
          throw new Error('No scenes found for project');
        }

        // Fetch media assets for each scene
        const sceneIds = scenesData.map((s) => s.id);
        const { data: mediaData } = await supabase
          .from('media_assets')
          .select('scene_id, url, media_type')
          .in('scene_id', sceneIds);

        // Fetch audio for each scene
        const { data: audioData } = await supabase
          .from('scene_audio')
          .select('scene_id, url, duration_sec')
          .eq('audio_type', 'voiceover')
          .in('scene_id', sceneIds);

        // Combine data
        const enrichedScenes: FetchedScene[] = scenesData.map((scene) => ({
          ...scene,
          media: mediaData?.find((m) => m.scene_id === scene.id)
            ? {
                url: mediaData.find((m) => m.scene_id === scene.id)!.url,
                type: mediaData.find((m) => m.scene_id === scene.id)!.media_type as 'video' | 'image',
              }
            : null,
          audio: audioData?.find((a) => a.scene_id === scene.id)
            ? {
                url: audioData.find((a) => a.scene_id === scene.id)!.url,
                duration_sec: audioData.find((a) => a.scene_id === scene.id)!.duration_sec,
              }
            : null,
        }));

        setScenes(enrichedScenes);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setLoading(false);
        console.error('Error fetching composition data:', err);
      }
    }

    fetchCompositionData();
  }, [projectId, renderJobId]);

  if (loading) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#fff', fontSize: 24 }}>Loading...</p>
      </AbsoluteFill>
    );
  }

  if (error) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: '#f00', fontSize: 24 }}>Error: {error}</p>
      </AbsoluteFill>
    );
  }

  // Calculate scene durations and accumulate frame offsets
  let currentFrame = 0;
  const sceneSequences = scenes.map((scene) => {
    // Use final duration if available, otherwise draft duration
    const durationSec = scene.duration_sec_final || scene.duration_sec_draft;
    const durationInFrames = Math.floor(durationSec * fps);

    const sequence = {
      scene,
      from: currentFrame,
      durationInFrames,
    };

    currentFrame += durationInFrames;
    return sequence;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {sceneSequences.map(({ scene, from, durationInFrames }) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
          <SceneComposition
            scene={scene}
            mediaUrl={scene.media?.url}
            mediaType={scene.media?.type}
            audioUrl={scene.audio?.url}
            subtitlePreset={scene.subtitle_style_preset_id}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
