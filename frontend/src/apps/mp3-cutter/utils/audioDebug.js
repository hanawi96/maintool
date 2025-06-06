// 🎯 Audio Debug Utilities for testing and troubleshooting

import { 
  generateCompatibilityReport, 
  validateAudioFile, 
  getAudioErrorMessage,
  checkBrowserSupport,
  SUPPORTED_FORMATS 
} from './audioUtils';

// 🎯 Test audio format compatibility in current browser
export const testAudioFormats = () => {
  console.log('🧪 [Audio Debug] Testing browser audio format support...');
  
  const report = generateCompatibilityReport();
  
  console.log('📊 [Compatibility Report]', {
    browser: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Test each category
  ['universal', 'moderate', 'limited'].forEach(category => {
    console.log(`\n🔍 [${category.toUpperCase()} FORMATS]`);
    Object.entries(report[category]).forEach(([mimeType, info]) => {
      const supportLevel = info.support.level === 'high' ? '✅' : 
                          info.support.level === 'medium' ? '⚠️' : '❌';
      
      console.log(`${supportLevel} ${info.displayName}: ${info.support.support} (${info.extensions.join(', ')})`);
    });
  });
  
  return report;
};

// 🎯 Simulate audio errors for testing error handling
export const simulateAudioError = (errorCode) => {
  const mockError = {
    code: errorCode,
    message: `Simulated error code ${errorCode}`
  };
  
  const errorMessage = getAudioErrorMessage(mockError, 'test-file.mp3');
  console.log('🧪 [Simulated Error]', errorMessage);
  
  return errorMessage;
};

// 🎯 Validate test files
export const validateTestFile = (file) => {
  console.log('🔍 [File Validation] Testing file:', file.name);
  
  const validation = validateAudioFile(file);
  
  console.log('📋 [Validation Result]', validation);
  
  if (validation.valid) {
    console.log('✅ File validation passed');
  } else {
    console.log('❌ File validation failed:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️ Warnings:', validation.warnings);
  }
  
  return validation;
};

// 🎯 Debug audio element issues
export const debugAudioElement = (audioElement) => {
  if (!audioElement) {
    console.log('❌ [Audio Debug] No audio element provided');
    return;
  }
  
  console.log('🔍 [Audio Element Debug]', {
    src: audioElement.src,
    currentSrc: audioElement.currentSrc,
    duration: audioElement.duration,
    readyState: audioElement.readyState,
    networkState: audioElement.networkState,
    error: audioElement.error,
    paused: audioElement.paused,
    ended: audioElement.ended,
    buffered: audioElement.buffered.length > 0 ? {
      start: audioElement.buffered.start(0),
      end: audioElement.buffered.end(0)
    } : 'No buffered data'
  });
  
  // Ready state meanings
  const readyStates = {
    0: 'HAVE_NOTHING',
    1: 'HAVE_METADATA', 
    2: 'HAVE_CURRENT_DATA',
    3: 'HAVE_FUTURE_DATA',
    4: 'HAVE_ENOUGH_DATA'
  };
  
  // Network state meanings
  const networkStates = {
    0: 'NETWORK_EMPTY',
    1: 'NETWORK_IDLE',
    2: 'NETWORK_LOADING',
    3: 'NETWORK_NO_SOURCE'
  };
  
  console.log(`📊 Ready State: ${readyStates[audioElement.readyState]} (${audioElement.readyState})`);
  console.log(`🌐 Network State: ${networkStates[audioElement.networkState]} (${audioElement.networkState})`);
  
  if (audioElement.error) {
    console.log('❌ Audio Error:', {
      code: audioElement.error.code,
      message: audioElement.error.message
    });
    
    const errorDetails = getAudioErrorMessage(audioElement.error);
    console.log('🔧 Error Details:', errorDetails);
  }
};

// 🎯 Performance monitoring for audio operations
export class AudioPerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      renderTimes: [],
      errors: []
    };
  }
  
  startTimer(operation) {
    this.startTime = performance.now();
    this.currentOperation = operation;
    console.log(`⏱️ [Performance] Starting ${operation}...`);
  }
  
  endTimer() {
    if (!this.startTime || !this.currentOperation) return;
    
    const duration = performance.now() - this.startTime;
    
    if (this.currentOperation.includes('load')) {
      this.metrics.loadTimes.push(duration);
    } else if (this.currentOperation.includes('render')) {
      this.metrics.renderTimes.push(duration);
    }
    
    console.log(`✅ [Performance] ${this.currentOperation} completed in ${duration.toFixed(2)}ms`);
    
    this.startTime = null;
    this.currentOperation = null;
  }
  
  logError(error, operation) {
    this.metrics.errors.push({
      error,
      operation,
      timestamp: Date.now()
    });
    
    console.log(`❌ [Performance] Error in ${operation}:`, error);
  }
  
  getReport() {
    const avgLoadTime = this.metrics.loadTimes.length > 0 ?
      this.metrics.loadTimes.reduce((a, b) => a + b) / this.metrics.loadTimes.length : 0;
    
    const avgRenderTime = this.metrics.renderTimes.length > 0 ?
      this.metrics.renderTimes.reduce((a, b) => a + b) / this.metrics.renderTimes.length : 0;
    
    const report = {
      loadTimes: {
        count: this.metrics.loadTimes.length,
        average: avgLoadTime.toFixed(2) + 'ms',
        min: Math.min(...this.metrics.loadTimes).toFixed(2) + 'ms',
        max: Math.max(...this.metrics.loadTimes).toFixed(2) + 'ms'
      },
      renderTimes: {
        count: this.metrics.renderTimes.length,
        average: avgRenderTime.toFixed(2) + 'ms',
        min: this.metrics.renderTimes.length > 0 ? Math.min(...this.metrics.renderTimes).toFixed(2) + 'ms' : 'N/A',
        max: this.metrics.renderTimes.length > 0 ? Math.max(...this.metrics.renderTimes).toFixed(2) + 'ms' : 'N/A'
      },
      errors: {
        count: this.metrics.errors.length,
        recent: this.metrics.errors.slice(-5) // Last 5 errors
      }
    };
    
    console.log('📊 [Performance Report]', report);
    return report;
  }
}

// 🎯 Global debug instance
export const audioPerformanceMonitor = new AudioPerformanceMonitor();

// 🎯 Add debugging to window for console access
if (typeof window !== 'undefined') {
  window.audioDebug = {
    testFormats: testAudioFormats,
    simulateError: simulateAudioError,
    validateFile: validateTestFile,
    debugElement: debugAudioElement,
    performanceMonitor: audioPerformanceMonitor,
    
    // Quick access functions
    checkMP3: () => checkBrowserSupport('audio/mpeg'),
    checkWAV: () => checkBrowserSupport('audio/wav'),
    checkM4A: () => checkBrowserSupport('audio/mp4'),
    
    // Test specific error codes
    testUnsupported: () => simulateAudioError(4),
    testDecode: () => simulateAudioError(3),
    testNetwork: () => simulateAudioError(2),
    testAborted: () => simulateAudioError(1)
  };
  
  console.log('🧪 [Audio Debug] Debug utilities available at window.audioDebug');
  console.log('📋 Available commands:');
  console.log('  - audioDebug.testFormats() - Test browser format support');
  console.log('  - audioDebug.simulateError(code) - Simulate audio errors');
  console.log('  - audioDebug.validateFile(file) - Validate audio file');
  console.log('  - audioDebug.debugElement(audio) - Debug audio element');
  console.log('  - audioDebug.performanceMonitor.getReport() - Get performance metrics');
} 