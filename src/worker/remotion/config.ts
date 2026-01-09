import { Config } from '@remotion/cli/config';

/**
 * Remotion Configuration
 *
 * Sets rendering options for video output:
 * - Codec: H.264
 * - Audio: AAC
 * - Resolution: 1080x1920 (9:16 portrait)
 * - FPS: 30
 * - Container: MP4
 */

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Render settings for production
Config.setPixelFormat('yuv420p'); // Best compatibility
Config.setCodec('h264'); // H.264 codec for wide compatibility

// Audio settings
Config.setAudioCodec('aac'); // AAC audio codec

// Quality settings
Config.setCrf质量(23); // Constant Rate Factor - lower = better quality (default 23)

// Performance settings
Config.setConcurrency(1); // Render 1 frame at a time (lower memory usage)
Config.setMuted(false); // Include audio in output

export default Config;
