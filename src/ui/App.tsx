import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VideoList from './pages/VideoList';
import VideoCreator from './pages/VideoCreator';
import VideoDetails from './pages/VideoDetails';
import EditorNew from './pages/EditorNew';
import EditorProject from './pages/EditorProject';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<VideoList />} />
          <Route path="/create" element={<VideoCreator />} />
          <Route path="/video/:videoId" element={<VideoDetails />} />
          {/* Editor routes */}
          <Route path="/editor/new" element={<EditorNew />} />
          <Route path="/editor/:projectId" element={<EditorProject />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App; 