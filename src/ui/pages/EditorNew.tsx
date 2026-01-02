/**
 * EditorNew Page
 *
 * This page allows users to create a new project by entering a topic
 * and selecting platform, video type, and target duration.
 *
 * Full implementation will be added in WP4 (T061).
 */

import React from 'react';
import { Typography, Container, Box } from '@mui/material';

const EditorNew: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Editor New Page - Placeholder (Full implementation in WP4)
        </Typography>
      </Box>
    </Container>
  );
};

export default EditorNew;
