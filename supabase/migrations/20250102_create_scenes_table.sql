-- Create scenes table
-- This table stores storyboard scenes for projects

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  narration_text TEXT NOT NULL,
  duration_sec_draft INTEGER NOT NULL CHECK (duration_sec_draft >= 1),
  duration_sec_final INTEGER,
  primary_keyword TEXT NOT NULL,
  subtitle_style_preset_id INTEGER NOT NULL DEFAULT 1 REFERENCES subtitle_presets(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, order_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_order_index ON scenes(order_index ASC);

-- Enable Row Level Security
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can access scenes only through projects they own
CREATE POLICY "Users can view own scenes"
ON scenes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert scenes for own projects"
ON scenes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own scenes"
ON scenes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own scenes"
ON scenes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scenes.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_scenes_updated_at
    BEFORE UPDATE ON scenes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
