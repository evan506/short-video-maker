/**
 * Audio Mixing Service
 *
 * FFmpeg-based audio mixing for combining voiceover and background music.
 * Handles volume control, fade transitions, and duration mismatch.
 */

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Mix options
 */
export interface MixOptions {
  voiceoverPath: string;
  musicPath: string;
  outputPath: string;
  voiceoverVolume?: number; // Default 0.8 (80%)
  musicVolume?: number; // Default 0.4 (40%)
  fadeInDuration?: number; // Seconds, default 1
  fadeOutDuration?: number; // Seconds, default 1
}

/**
 * Mix result
 */
export interface MixResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

/**
 * Get audio duration using FFmpeg
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get duration: ${err.message}`));
        return;
      }
      const duration = metadata.format?.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * Mix audio files with volume controls and fades
 *
 * T038, T039, T040, T041: Core mixing implementation
 */
export async function mixAudio(options: MixOptions): Promise<MixResult> {
  const {
    voiceoverPath,
    musicPath,
    outputPath,
    voiceoverVolume = 0.8,
    musicVolume = 0.4,
    fadeInDuration = 1,
    fadeOutDuration = 1,
  } = options;

  try {
    // Verify input files exist
    await fs.access(voiceoverPath);
    await fs.access(musicPath);

    // Get durations
    const [voiceoverDuration, musicDuration] = await Promise.all([
      getAudioDuration(voiceoverPath),
      getAudioDuration(musicPath),
    ]);

    console.log(`[AudioMixing] Voiceover: ${voiceoverDuration}s, Music: ${musicDuration}s`);

    // Build FFmpeg command
    let command = ffmpeg();

    // Determine music duration strategy (T041)
    if (musicDuration < voiceoverDuration) {
      // Music is shorter - loop it to match voiceover duration
      console.log('[AudioMixing] Music is shorter, will loop to match voiceover');

      // Calculate how many times to loop
      const loopCount = Math.ceil(voiceoverDuration / musicDuration);

      // Stream 1: Voiceover (full duration)
      command = command.input(voiceoverPath);

      // Stream 2: Loop music file
      for (let i = 0; i < loopCount; i++) {
        command = command.input(musicPath);
      }

      // Complex filter for mixing with volume and fades
      const filterComplex = [];

      // Add voiceover stream
      filterComplex.push('[0:a]volume=' + voiceoverVolume + '[v]');

      // Add and mix all music streams
      for (let i = 0; i < loopCount; i++) {
        const streamIndex = i + 1;
        if (i === 0) {
          // Use size=2e+09 for infinite loop (sample rate independent)
          filterComplex.push(`[${streamIndex}:a]aloop=loop=-1:size=2e+09[m0]`);
        } else {
          filterComplex.push(`[${streamIndex}:a][m0]concat=n=2:v=0:a=1[mixed${i}]`);
        }
      }

      // Apply volume to mixed music
      const lastMixedIndex = loopCount; // Last mixed stream index
      filterComplex.push(`[${lastMixedIndex}:a]volume=${musicVolume}[m_final]`);

      // Mix voiceover and music with fades
      filterComplex.push('[v][m_final]amix=inputs=2:duration=shortest,volume=2[mixed]');
      filterComplex.push(`[mixed]afade=t=in:st=0:d=${fadeInDuration}[fade_in]`);
      filterComplex.push(`[fade_in]afade=t=out:st=${voiceoverDuration - fadeOutDuration}:d=${fadeOutDuration}`);

      command = command.complexFilter(filterComplex);
    } else {
      // Music is longer or equal - trim/fade to match voiceover
      console.log('[AudioMixing] Music is longer or equal, will trim/fade to match voiceover');

      command = command
        .input(voiceoverPath)
        .input(musicPath);

      // Filter: volume, mix, and fades
      const filterComplex = [
        '[0:a]volume=' + voiceoverVolume + '[v]',
        '[1:a]volume=' + musicVolume + '[m]',
        '[v][m]amix=inputs=2:duration=shortest,volume=2[mixed]',
        `[mixed]afade=t=in:st=0:d=${fadeInDuration}[fade_in]`,
        `[fade_in]afade=t=out:st=${voiceoverDuration - fadeOutDuration}:d=${fadeOutDuration}`,
      ];

      command = command.complexFilter(filterComplex);
    }

    // Output format: MP3 128kbps, 44.1kHz
    command = command
      .outputFormat('mp3')
      .audioBitrate('128k')
      .audioFrequency(44100)
      .on('start', (commandLine) => {
        console.log('[AudioMixing] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('[AudioMixing] Processing:', progress.percent + '% done');
      })
      .on('end', () => {
        console.log('[AudioMixing] Processing complete');
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[AudioMixing] Error:', err.message);
        console.error('[AudioMixing] FFmpeg stderr:', stderr);
      });

    // Execute
    await command.save(outputPath);

    // Verify output
    const stats = await fs.stat(outputPath);
    const outputDuration = await getAudioDuration(outputPath);

    console.log(`[AudioMixing] Success: ${outputPath} (${stats.size} bytes, ${outputDuration.toFixed(2)}s)`);

    return {
      success: true,
      outputPath,
      duration: outputDuration,
      fileSize: stats.size,
    };
  } catch (error: any) {
    console.error('[AudioMixing] Failed to mix audio:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Normalize audio level
 * Prevents clipping and ensures consistent volume
 */
export async function normalizeAudio(inputPath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11')
      .on('end', () => {
        console.log('[AudioMixing] Normalization complete');
        resolve(true);
      })
      .on('error', (err) => {
        console.error('[AudioMixing] Normalization failed:', err);
        reject(err);
      })
      .save(outputPath);
  });
}
