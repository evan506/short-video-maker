/**
 * EditorProject Page
 *
 * This page is the main editor interface where users can:
 * - Generate and edit scripts (Script tab)
 * - View and edit storyboard scenes (Storyboard tab)
 *
 * T062 partial implementation: Script editor integration (storyboard in WP2)
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
} from '@mui/material';
import { ScriptEditor } from '../components/editor/ScriptEditor';

const EditorProject: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'script';

  const [tabValue, setTabValue] = useState(currentTab);

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Video Editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Project ID: {projectId}
        </Typography>

        <Paper sx={{ mt: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Script" value="script" />
            <Tab label="Storyboard" value="storyboard" disabled />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabValue === 'script' && <ScriptEditor projectId={projectId} />}
            {tabValue === 'storyboard' && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  Storyboard view coming soon in WP2
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Generate a script first, then navigate here to create scenes
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default EditorProject;
