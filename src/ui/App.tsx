import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VideoList from './pages/VideoList';
import VideoCreator from './pages/VideoCreator';
import VideoDetails from './pages/VideoDetails';
import EditorNew from './pages/EditorNew';
import EditorProject from './pages/EditorProject';
import ProjectDashboard from './pages/ProjectDashboard';
import { Login } from './pages/Login';
import Layout from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout><ProjectDashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout><ProjectDashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <Layout><VideoCreator /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/video/:videoId"
              element={
                <ProtectedRoute>
                  <Layout><VideoDetails /></Layout>
                </ProtectedRoute>
              }
            />
            {/* Editor routes */}
            <Route
              path="/editor/new"
              element={
                <ProtectedRoute>
                  <Layout><EditorNew /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:projectId"
              element={
                <ProtectedRoute>
                  <Layout><EditorProject /></Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App; 