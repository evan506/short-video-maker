-- Create subtitle_presets table
-- This table stores subtitle style presets (reference data)

CREATE TABLE IF NOT EXISTS subtitle_presets (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  config JSONB NOT NULL
);

-- Create index for name lookups
CREATE INDEX IF NOT EXISTS idx_subtitle_presets_name ON subtitle_presets(name);

-- Enable Row Level Security
ALTER TABLE subtitle_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All users can view subtitle presets (read-only reference data)
CREATE POLICY "All users can view subtitle presets"
ON subtitle_presets FOR SELECT
USING (true);

-- No INSERT/UPDATE/DELETE policies (reference data is immutable)
