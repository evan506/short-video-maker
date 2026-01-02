/**
 * EditorProject Page
 *
 * This page is the main editor interface where users can:
 * - Generate and edit scripts (Script tab)
 * - View and edit storyboard scenes (Storyboard tab)
 *
 * Full implementation will be added in WP4 (T062).
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Container, Box } from '@mui/material';

const EditorProject: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Editor Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Project ID: {projectId || 'Not provided'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Editor Project Page - Placeholder (Full implementation in WP4)
        </Typography>
      </Box>
    </Container>
  );
};

export default EditorProject;
