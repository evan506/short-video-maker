// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";

// Video format settings
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicDir("static/music");
Config.setEntryPoint("src/worker/remotion/index.ts");

// Codec settings for production compatibility (WP059)
Config.setPixelFormat("yuv420p"); // Best compatibility across players
Config.setCodec("h264"); // H.264 codec for wide compatibility

// Audio settings (WP059)
Config.setAudioCodec("aac"); // AAC audio codec for wide compatibility

// Quality settings (CRF: Constant Rate Factor)
// Range: 0-51, lower = better quality, higher = smaller file size
// Default: 23 (visually lossless)
Config.setCrf(23);

// Performance settings for worker environment (WP059)
Config.setConcurrency(1); // Render 1 frame at a time (lower memory usage)
Config.setMuted(false); // Include audio in output

// Enforce MP4 output (WP059)
Config.setOutputFormat("mp4");
