import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './shared/ThemeContext';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import CutMP3Page from './pages/CutMP3Page';
import ConvertMP3Page from './pages/ConvertMP3Page';
import ExtractVocalsPage from './pages/ExtractVocalsPage';
import MergeAudioPage from './pages/MergeAudioPage';
import AudioEditorPage from './pages/AudioEditorPage';
import SettingsPage from './pages/SettingsPage';
import { cleanupUndefinedValues } from './apps/mp3-cutter/utils/safeStorage';
import './index.css';

function App() {
  // 🧹 **STARTUP CLEANUP**: Clean localStorage on app startup
  useEffect(() => {
    console.log('🚀 [App] Starting localStorage cleanup...');
    const cleanedCount = cleanupUndefinedValues();
    if (cleanedCount > 0) {
      console.log(`✅ [App] Cleaned ${cleanedCount} problematic localStorage entries`);
    }
  }, []);

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;