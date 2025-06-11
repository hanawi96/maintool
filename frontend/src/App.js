import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './shared/ThemeContext';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import { cleanupUndefinedValues } from './apps/mp3-cutter/utils/safeStorage';
import './index.css';

// 🚀 Lazy load heavy pages for instant initial load
const CutMP3Page = lazy(() => import('./pages/CutMP3Page'));
const ConvertMP3Page = lazy(() => import('./pages/ConvertMP3Page'));
const ExtractVocalsPage = lazy(() => import('./pages/ExtractVocalsPage'));
const MergeAudioPage = lazy(() => import('./pages/MergeAudioPage'));
const AudioEditorPage = lazy(() => import('./pages/AudioEditorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// 🎯 Simple loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

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
          <LazyErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cut-mp3" element={<CutMP3Page />} />
                <Route path="/convert-mp3" element={<ConvertMP3Page />} />
                <Route path="/extract-vocals" element={<ExtractVocalsPage />} />
                <Route path="/merge-audio" element={<MergeAudioPage />} />
                <Route path="/audio-editor" element={<AudioEditorPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </LazyErrorBoundary>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;