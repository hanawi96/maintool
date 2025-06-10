import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import CutMP3Page from './pages/CutMP3Page';
import ConvertMP3Page from './pages/ConvertMP3Page';
import ExtractVocalsPage from './pages/ExtractVocalsPage';
import MergeAudioPage from './pages/MergeAudioPage';
import AudioEditorPage from './pages/AudioEditorPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cut-mp3" element={<CutMP3Page />} />
          <Route path="/convert-mp3" element={<ConvertMP3Page />} />
          <Route path="/extract-vocals" element={<ExtractVocalsPage />} />
          <Route path="/merge-audio" element={<MergeAudioPage />} />
          <Route path="/audio-editor" element={<AudioEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;