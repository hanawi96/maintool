// Validate audio file
export const isValidAudioFile = (file) => {
    return file && file.type.startsWith('audio/');
  };
  
  // Create audio URL
  export const createAudioURL = (file) => {
    return URL.createObjectURL(file);
  };
  
  // Clean up audio URL
  export const revokeAudioURL = (url) => {
    URL.revokeObjectURL(url);
  };
  
  // Clamp value between min and max
  export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };
  
  // Check if browser supports audio
  export const isAudioSupported = () => {
    return !!(window.AudioContext || window.webkitAudioContext);
  };

// 🎯 Audio format validation and error handling utilities

// 🎯 SUPPORTED AUDIO FORMATS by browsers
export const SUPPORTED_FORMATS = {
  // 🟢 WIDELY SUPPORTED (All modern browsers)
  UNIVERSAL: {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/mp4': ['.m4a', '.mp4'],
    'audio/x-m4a': ['.m4a']
  },
  
  // 🟡 MODERATELY SUPPORTED 
  MODERATE: {
    'audio/ogg': ['.ogg', '.oga'],
    'audio/webm': ['.webm'],
    'audio/x-wav': ['.wav']
  },
  
  // 🔴 LIMITED SUPPORT
  LIMITED: {
    'audio/flac': ['.flac'],
    'audio/aac': ['.aac'],
    'audio/x-aac': ['.aac'],
    'audio/3gpp': ['.3gp'],
    'audio/amr': ['.amr']
  }
};

// 🎯 Get file extension from filename
export const getFileExtension = (filename) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

// 🎯 Get MIME type from file extension
export const getMimeTypeFromExtension = (extension) => {
  const allFormats = { ...SUPPORTED_FORMATS.UNIVERSAL, ...SUPPORTED_FORMATS.MODERATE, ...SUPPORTED_FORMATS.LIMITED };
  
  for (const [mimeType, extensions] of Object.entries(allFormats)) {
    if (extensions.includes(extension)) {
      return mimeType;
    }
  }
  return null;
};

// 🎯 Check if format is supported by current browser
export const checkBrowserSupport = (mimeType) => {
  const audio = document.createElement('audio');
  const support = audio.canPlayType(mimeType);
  
  return {
    canPlay: support !== '',
    support: support, // '', 'maybe', 'probably'
    level: support === 'probably' ? 'high' : support === 'maybe' ? 'medium' : 'none'
  };
};

// 🎯 Validate audio file before processing
export const validateAudioFile = (file) => {
  const errors = [];
  const warnings = [];
  const info = {};
  
  // 1. 🎯 File size check (max 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: 100MB`);
  }
  
  // 2. 🎯 File extension check
  const extension = getFileExtension(file.name);
  const expectedMimeType = getMimeTypeFromExtension(extension);
  
  if (!expectedMimeType) {
    errors.push(`Unsupported file extension: ${extension}`);
  }
  
  // 3. 🎯 MIME type validation
  const fileMimeType = file.type || expectedMimeType;
  info.detectedMimeType = fileMimeType;
  info.expectedMimeType = expectedMimeType;
  
  if (fileMimeType !== expectedMimeType && expectedMimeType) {
    warnings.push(`MIME type mismatch: detected "${fileMimeType}", expected "${expectedMimeType}"`);
  }
  
  // 4. 🎯 Browser support check
  if (fileMimeType) {
    const browserSupport = checkBrowserSupport(fileMimeType);
    info.browserSupport = browserSupport;
    
    if (browserSupport.level === 'none') {
      errors.push(`Format not supported by your browser: ${fileMimeType}`);
    } else if (browserSupport.level === 'medium') {
      warnings.push(`Limited browser support for ${fileMimeType}. Playback may not work properly.`);
    }
  }
  
  // 5. 🎯 Format recommendations
  const isUniversal = Object.keys(SUPPORTED_FORMATS.UNIVERSAL).includes(fileMimeType);
  info.isUniversalFormat = isUniversal;
  
  if (!isUniversal && errors.length === 0) {
    info.recommendation = `For best compatibility, consider converting to MP3 or WAV format.`;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  };
};

// 🎯 Get human-readable format name
export const getFormatDisplayName = (mimeType) => {
  const formatNames = {
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'audio/x-wav': 'WAV',
    'audio/mp4': 'MP4/M4A',
    'audio/x-m4a': 'M4A',
    'audio/ogg': 'OGG',
    'audio/webm': 'WebM',
    'audio/flac': 'FLAC',
    'audio/aac': 'AAC',
    'audio/x-aac': 'AAC',
    'audio/3gpp': '3GP',
    'audio/amr': 'AMR'
  };
  
  return formatNames[mimeType] || mimeType || 'Unknown';
};

// 🎯 Generate helpful error messages for audio loading errors
export const getAudioErrorMessage = (error, filename = 'audio file') => {
  if (!error) return 'Unknown audio error';
  
  const errorCode = error.code;
  const errorMessages = {
    1: { // MEDIA_ERR_ABORTED
      title: 'Playback Aborted',
      message: 'Audio playback was cancelled. This usually happens when switching files quickly.',
      suggestion: 'Try loading the file again.'
    },
    2: { // MEDIA_ERR_NETWORK
      title: 'Network Error',
      message: 'Failed to load audio due to network issues.',
      suggestion: 'Check your internet connection and try again.'
    },
    3: { // MEDIA_ERR_DECODE
      title: 'Decode Error', 
      message: 'The audio file appears to be corrupted or has an invalid format.',
      suggestion: 'Try a different audio file or re-export the current file.'
    },
    4: { // MEDIA_ERR_SRC_NOT_SUPPORTED
      title: 'Format Not Supported',
      message: 'This audio format is not supported by your browser.',
      suggestion: 'Please convert to MP3 or WAV format for best compatibility.'
    }
  };
  
  const errorInfo = errorMessages[errorCode] || {
    title: 'Audio Error',
    message: `Unknown audio error (code: ${errorCode})`,
    suggestion: 'Try a different audio file.'
  };
  
  return {
    ...errorInfo,
    code: errorCode,
    filename: filename,
    supportedFormats: Object.keys(SUPPORTED_FORMATS.UNIVERSAL).map(getFormatDisplayName)
  };
};

// 🎯 Create audio compatibility report
export const generateCompatibilityReport = () => {
  const report = {
    universal: {},
    moderate: {},
    limited: {},
    browser: navigator.userAgent
  };
  
  // Test all format categories
  Object.entries(SUPPORTED_FORMATS.UNIVERSAL).forEach(([mimeType, extensions]) => {
    report.universal[mimeType] = {
      extensions,
      support: checkBrowserSupport(mimeType),
      displayName: getFormatDisplayName(mimeType)
    };
  });
  
  Object.entries(SUPPORTED_FORMATS.MODERATE).forEach(([mimeType, extensions]) => {
    report.moderate[mimeType] = {
      extensions,
      support: checkBrowserSupport(mimeType),
      displayName: getFormatDisplayName(mimeType)
    };
  });
  
  Object.entries(SUPPORTED_FORMATS.LIMITED).forEach(([mimeType, extensions]) => {
    report.limited[mimeType] = {
      extensions,
      support: checkBrowserSupport(mimeType),
      displayName: getFormatDisplayName(mimeType)
    };
  });
  
  return report;
};

// 🔥 **NEW**: Audio URL utilities for better debugging
export const validateAudioURL = (url) => {
  if (!url) return { valid: false, reason: 'URL is empty or null' };
  
  if (typeof url !== 'string') return { valid: false, reason: 'URL is not a string' };
  
  if (url === window.location.href) return { valid: false, reason: 'URL is the page location (empty src)' };
  
  if (!url.startsWith('blob:') && !url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, reason: 'URL does not start with blob:, http:// or https://' };
  }
  
  if (url.startsWith('blob:') && !url.includes(window.location.origin)) {
    return { valid: false, reason: 'Blob URL does not match current origin' };
  }
  
  return { valid: true, reason: 'URL is valid' };
};

// 🔥 **NEW**: Debug audio element state
export const debugAudioState = (audioElement, label = 'Audio') => {
  if (!audioElement) {
    console.warn(`🔍 [${label}] No audio element provided for debugging`);
    return null;
  }
  
  const state = {
    src: audioElement.src,
    currentSrc: audioElement.currentSrc,
    readyState: audioElement.readyState,
    networkState: audioElement.networkState,
    paused: audioElement.paused,
    ended: audioElement.ended,
    currentTime: audioElement.currentTime,
    duration: audioElement.duration,
    error: audioElement.error ? {
      code: audioElement.error.code,
      message: audioElement.error.message
    } : null
  };
  
  const readyStates = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
  const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
  
  console.log(`🔍 [${label}] Debug State:`, {
    ...state,
    readyStateText: readyStates[state.readyState] || `Unknown(${state.readyState})`,
    networkStateText: networkStates[state.networkState] || `Unknown(${state.networkState})`,
    srcValidation: validateAudioURL(state.src),
    currentSrcValidation: validateAudioURL(state.currentSrc)
  });
  
  return state;
};

// 🔥 **NEW**: Create safe audio URL with validation
export const createSafeAudioURL = (file) => {
  if (!file) {
    console.error('❌ [createSafeAudioURL] No file provided');
    return null;
  }
  
  if (!isValidAudioFile(file)) {
    console.error('❌ [createSafeAudioURL] Invalid audio file:', file.name);
    return null;
  }
  
  try {
    const url = URL.createObjectURL(file);
    console.log('✅ [createSafeAudioURL] Created URL:', url, 'for file:', file.name);
    return url;
  } catch (error) {
    console.error('❌ [createSafeAudioURL] Failed to create URL:', error);
    return null;
  }
};

// 🔥 **NEW**: Safe URL cleanup with validation
export const revokeSafeAudioURL = (url) => {
  if (!url) {
    console.log('🔍 [revokeSafeAudioURL] No URL to revoke');
    return;
  }
  
  const validation = validateAudioURL(url);
  if (!validation.valid) {
    console.warn('⚠️ [revokeSafeAudioURL] Invalid URL, skipping revoke:', validation.reason);
    return;
  }
  
  if (!url.startsWith('blob:')) {
    console.log('🔍 [revokeSafeAudioURL] URL is not a blob, skipping revoke:', url);
    return;
  }
  
  try {
    URL.revokeObjectURL(url);
    console.log('✅ [revokeSafeAudioURL] Revoked URL:', url);
  } catch (error) {
    console.error('❌ [revokeSafeAudioURL] Failed to revoke URL:', error);
  }
};