-- Create scripts table
-- This table stores versioned narration scripts for projects

CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scripts_project_id ON scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_scripts_version ON scripts(version DESC);

-- Enable Row Level Security
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can access scripts only through projects they own
CREATE POLICY "Users can view own scripts"
ON scripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert scripts for own projects"
ON scripts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own latest scripts"
ON scripts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
    AND projects.current_script_version = scripts.version
  )
);

CREATE POLICY "Users can delete own scripts"
ON scripts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scripts.project_id
    AND projects.user_id = auth.uid()
  )
);
