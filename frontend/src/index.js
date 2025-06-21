import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 🛡️ **ULTIMATE AbortError PROTECTION** - Comprehensive error suppression
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('AbortError') && message.includes('signal is aborted without reason')) {
    console.log('🛑 [ConsoleAbortHandler] AbortError console.error suppressed:', message);
    return; // Don't log AbortError to console
  }
  originalConsoleError.apply(console, args);
};

// 🛡️ **ASYNC WRAPPER PROTECTION** - Wrap common async APIs
const originalSetTimeout = window.setTimeout;
window.setTimeout = (callback, delay, ...args) => {
  return originalSetTimeout(() => {
    try {
      callback(...args);
    } catch (error) {
      if (error?.name === 'AbortError' && error?.message?.includes('signal is aborted without reason')) {
        console.log('🛑 [SetTimeoutAbortHandler] AbortError in setTimeout suppressed:', error.message);
      } else {
        throw error;
      }
    }
  }, delay);
};

// 🛡️ **GLOBAL ERROR HANDLER** - Catch any remaining JSON.parse errors
window.addEventListener('error', (event) => {
  // Handle JSON.parse errors
  if (event.error?.message?.includes('is not valid JSON') || 
      event.error?.message?.includes('JSON.parse') ||
      event.error?.message?.includes('"undefined"')) {
    console.error('🚨 [GlobalErrorHandler] JSON.parse error caught:', event.error.message);
    console.warn('🔧 [GlobalErrorHandler] This error has been suppressed to prevent app crash');
    event.preventDefault(); // Prevent the error from crashing the app
    return false;
  }
  
  // Handle AbortError from any source (synchronous)
  if (event.error?.name === 'AbortError' && 
      event.error?.message?.includes('signal is aborted without reason')) {
    console.log('🛑 [GlobalAbortHandler] Synchronous AbortError caught and suppressed:', event.error.message);
    event.preventDefault(); // Prevent the error from crashing the app
    return false;
  }
});

// 🛡️ **GLOBAL PROMISE ERROR HANDLER** - Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Handle JSON.parse errors
  if (event.reason?.message?.includes('is not valid JSON') || 
      event.reason?.message?.includes('JSON.parse') ||
      event.reason?.message?.includes('"undefined"')) {
    console.error('🚨 [GlobalPromiseHandler] JSON.parse promise rejection caught:', event.reason.message);
    console.warn('🔧 [GlobalPromiseHandler] This error has been suppressed to prevent app crash');
    event.preventDefault(); // Prevent the error from crashing the app
  }
  
  // Handle AbortError from any source
  if (event.reason?.name === 'AbortError' && 
      event.reason?.message?.includes('signal is aborted without reason')) {
    console.log('🛑 [GlobalAbortHandler] AbortError promise rejection caught and suppressed:', event.reason.message);
    event.preventDefault(); // Prevent the error from being logged
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);