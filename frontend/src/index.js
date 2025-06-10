import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 🛡️ **GLOBAL ERROR HANDLER** - Catch any remaining JSON.parse errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('is not valid JSON') || 
      event.error?.message?.includes('JSON.parse') ||
      event.error?.message?.includes('"undefined"')) {
    console.error('🚨 [GlobalErrorHandler] JSON.parse error caught:', event.error.message);
    console.warn('🔧 [GlobalErrorHandler] This error has been suppressed to prevent app crash');
    event.preventDefault(); // Prevent the error from crashing the app
    return false;
  }
});

// 🛡️ **GLOBAL PROMISE ERROR HANDLER** - Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('is not valid JSON') || 
      event.reason?.message?.includes('JSON.parse') ||
      event.reason?.message?.includes('"undefined"')) {
    console.error('🚨 [GlobalPromiseHandler] JSON.parse promise rejection caught:', event.reason.message);
    console.warn('🔧 [GlobalPromiseHandler] This error has been suppressed to prevent app crash');
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);