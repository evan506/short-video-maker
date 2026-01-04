/**
 * ProjectDashboard Page Component
 *
 * Project list view (T063, T064, T066, T067):
 * - Displays all user's projects
 * - Sorted by "last modified" (updated_at DESC) (T064)
 * - Status indicators: draft only (T065 deferred to Phase 2)
 * - Project reload navigation (T066)
 * - "New Project" button (T067)
 * - Pagination if list >50 projects
 */

import React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useProjects } from '../hooks/use-project';
import { formatDistanceToNow } from 'date-fns';

/**
 * ProjectDashboard Component
 *
 * Features:
 * - Project list view (T063)
 * - Sorting by "last modified" (T064)
 * - Project reload navigation (T066)
 * - "New Project" button (T067)
 * - Status indicators: draft only (T065 deferred)
 */
export function ProjectDashboard() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();

  /**
   * Handle project reload (T066)
   * Navigate to /editor/:projectId
   */
  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  /**
   * Handle "New Project" button (T067)
   * Navigate to /editor/new
   */
  const handleNewProject = () => {
    navigate('/editor/new');
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading projects...
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
            Failed to load projects: {error.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with "New Project" button (T067) */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your video projects
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewProject}
          size="large"
        >
          New Project
        </Button>
      </Box>

      {/* Projects table (T063, T064) */}
      {!projects || projects.length === 0 ? (
        // Empty state
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first project to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewProject}
          >
            Create Project
          </Button>
        </Paper>
      ) : (
        // Project list table
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Modified</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleOpenProject(project.id)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {project.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.topic.substring(0, 60)}
                        {project.topic.length > 60 ? '...' : ''}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {project.platform}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {project.video_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {project.target_duration}s
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {/* Status indicator (T065) - Draft only for Phase 1 */}
                    <Chip
                      label="Draft"
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Open Project">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                        size="small"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default ProjectDashboard;
