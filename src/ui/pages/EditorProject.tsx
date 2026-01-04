/**
 * EditorProject Page Component
 *
 * Edit project page with tabbed interface (T062):
 * - Script tab: Generate and edit scripts
 * - Storyboard tab: View and edit scenes
 * - Displays project metadata (title, topic, platform, duration, type, status)
 * - Loads FULL project state (script + scenes) (T058, T066)
 */

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ScriptEditor } from '../components/editor/ScriptEditor';
import { StoryboardView } from '../components/editor/StoryboardView';
import { useProject } from '../hooks/use-project';

/**
 * EditorProject Component
 *
 * Features:
 * - Tabbed interface: Script, Storyboard (T062)
 * - Project reload with FULL state (T058, T066)
 * - Displays project metadata
 * - Data consistency checks
 */
export function EditorProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'script';

  const [tabValue, setTabValue] = useState(currentTab);

  // Load project with FULL state (T058, T066)
  const { data: projectData, isLoading, error } = useProject(projectId || '');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  if (!projectId) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" color="error">
            Error: Project ID not provided
          </Typography>
        </Box>
      </Container>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading project...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            Failed to load project: {error.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (!projectData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            Project not found
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Project header with metadata */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {projectData.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projectData.platform} • {projectData.video_type} • {projectData.target_duration}s
          </Typography>
        </Box>

        {/* Tabbed interface (T062) */}
        <Paper>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Script" value="script" />
            <Tab label="Storyboard" value="storyboard" />
          </Tabs>

          <Box>
            {tabValue === 'script' && (
              <ScriptEditor
                projectId={projectId}
                scriptContent={projectData.script?.content || null}
                scriptVersion={projectData.current_script_version}
              />
            )}
            {tabValue === 'storyboard' && (
              <StoryboardView
                projectId={projectId}
                projectTargetDuration={projectData.target_duration}
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default EditorProject;
