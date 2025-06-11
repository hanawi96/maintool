// 🚀 Smart preloader for critical pages
let preloadPromises = {};

export const preloadPage = (importFn, pageName) => {
  if (!preloadPromises[pageName]) {
    preloadPromises[pageName] = importFn();
  }
  return preloadPromises[pageName];
};

// 🎯 Preload most used pages on homepage
export const preloadCriticalPages = () => {
  // Preload CutMP3Page after 1 second (most used feature)
  setTimeout(() => {
    preloadPage(() => import('../pages/CutMP3Page'), 'CutMP3Page');
  }, 1000);
  
  // Preload AudioEditor after 3 seconds (heavy component)
  setTimeout(() => {
    preloadPage(() => import('../pages/AudioEditorPage'), 'AudioEditorPage');
  }, 3000);
};

// 🔥 Preload on user intent (hover over navigation)
export const preloadOnHover = (pageName) => {
  const importMap = {
    'cut-mp3': () => import('../pages/CutMP3Page'),
    'convert-mp3': () => import('../pages/ConvertMP3Page'),
    'extract-vocals': () => import('../pages/ExtractVocalsPage'),
    'merge-audio': () => import('../pages/MergeAudioPage'),
    'audio-editor': () => import('../pages/AudioEditorPage'),
    'settings': () => import('../pages/SettingsPage')
  };
  
  if (importMap[pageName]) {
    preloadPage(importMap[pageName], pageName);
  }
};
