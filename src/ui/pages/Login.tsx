/**
 * Login Page
 *
 * Simple email/password login and signup form using Supabase Auth.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const { auth } = await import('../services/supabase');
      await auth.signIn(loginEmail, loginPassword);
      navigate('/');
    } catch (err: any) {
      setLoginError(err.message || 'Failed to sign in');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }

    setSignupLoading(true);

    try {
      const { auth } = await import('../services/supabase');
      await auth.signUp(signupEmail, signupPassword);
      setSignupSuccess(true);
      // Switch to login tab after successful signup
      setTimeout(() => {
        setTabValue(0);
        setLoginEmail(signupEmail);
        setSignupSuccess(false);
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setSignupError(err.message || 'Failed to sign up');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 450,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Short Video Maker
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create engaging short videos with AI
          </Typography>

          <Tabs
            value={tabValue}
            onChange={(_, newValue) => {
              setTabValue(newValue);
              setLoginError(null);
              setSignupError(null);
            }}
            centered
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Sign In" />
            <Tab label="Sign Up" />
          </Tabs>

          {/* Sign In Tab */}
          <TabPanel value={tabValue} index={0}>
            {loginError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loginError}
              </Alert>
            )}

            <form onSubmit={handleLoginSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                autoFocus
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loginLoading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loginLoading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </form>
          </TabPanel>

          {/* Sign Up Tab */}
          <TabPanel value={tabValue} index={1}>
            {signupSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Account created successfully! Please sign in.
              </Alert>
            )}

            {signupError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {signupError}
              </Alert>
            )}

            <form onSubmit={handleSignupSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                autoFocus={tabValue === 1}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
                helperText="Minimum 6 characters"
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="new-password"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={signupLoading}
                sx={{ mt: 3, mb: 2 }}
              >
                {signupLoading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
            </form>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};
