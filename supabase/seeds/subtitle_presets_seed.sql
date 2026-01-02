-- Seed subtitle presets
-- This file inserts initial subtitle style presets (Minimal, Highlight, Karaoke)

INSERT INTO subtitle_presets (id, name, description, config) VALUES
(1, 'Minimal', 'Clean and simple subtitles with minimal styling',
 '{"fontSize": "16px", "color": "#FFFFFF", "position": "bottom", "fontFamily": "sans-serif", "animation": "none"}'::jsonb),
(2, 'Highlight', 'Bold subtitles with highlight effect for emphasis',
 '{"fontSize": "20px", "color": "#FFFF00", "backgroundColor": "#000000", "position": "bottom", "fontFamily": "sans-serif", "animation": "fade"}'::jsonb),
(3, 'Karaoke', 'Karaoke-style subtitles with word-by-word animation',
 '{"fontSize": "18px", "color": "#00FFFF", "position": "center", "fontFamily": "sans-serif", "animation": "karaoke", "highlightColor": "#FF00FF"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
