// ====== CONSTS ======
const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const readyStates = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
const networkStates = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];

export const SUPPORTED_FORMATS = {
  UNIVERSAL: {
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/mp4': ['.m4a', '.mp4'],
    'audio/x-m4a': ['.m4a']
  },
  MODERATE: {
    'audio/ogg': ['.ogg', '.oga'],
    'audio/webm': ['.webm'],
    'audio/x-wav': ['.wav']
  },  LIMITED: {
    'audio/flac': ['.flac'],
    'audio/aac': ['.aac'],
    'audio/x-aac': ['.aac'],
    'audio/3gpp': ['.3gp'],
    'audio/amr': ['.amr'],
    'audio/x-ms-wma': ['.wma']
  }
};

const allFormats = { ...SUPPORTED_FORMATS.UNIVERSAL, ...SUPPORTED_FORMATS.MODERATE, ...SUPPORTED_FORMATS.LIMITED };

const FORMAT_DISPLAY_NAMES = {
  'audio/mpeg': 'MP3',   'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',  'audio/mp4': 'MP4/M4A',
  'audio/x-m4a': 'M4A',  'audio/ogg': 'OGG',
  'audio/webm': 'WebM',  'audio/flac': 'FLAC',
  'audio/aac': 'AAC',    'audio/x-aac': 'AAC',
  'audio/3gpp': '3GP',   'audio/amr': 'AMR',
  'audio/x-ms-wma': 'WMA'
};

// ====== UTILS ======
export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export const isValidAudioFile = file =>
  !!file && !!file.type && file.type.startsWith('audio/');

export const createAudioURL = file =>
  file ? URL.createObjectURL(file) : null;

export const revokeAudioURL = url => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
};

export const isAudioSupported = () =>
  !!(window.AudioContext || window.webkitAudioContext);

export const getFileExtension = filename => {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
};

export const getMimeTypeFromExtension = ext => {
  for (const [mime, list] of Object.entries(allFormats))
    if (list.includes(ext)) return mime;
  return null;
};

export const getFormatDisplayName = mime =>
  FORMAT_DISPLAY_NAMES[mime] || mime || 'Unknown';

// ====== BROWSER FORMAT SUPPORT ======
export const checkBrowserSupport = mimeType => {
  const audio = document.createElement('audio');
  const support = audio.canPlayType(mimeType);
  return {
    canPlay: !!support,
    support,
    level: support === 'probably' ? 'high' : support === 'maybe' ? 'medium' : 'none'
  };
};

// ====== AUDIO FILE VALIDATION ======
export const validateAudioFile = file => {
  const errors = [], warnings = [], info = {};
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors, warnings, info };
  }
  if (file.size > MAX_SIZE)
    errors.push(`File too large: ${(file.size / 1048576).toFixed(1)}MB. Maximum: 100MB`);
  const ext = getFileExtension(file.name);
  const expectedMime = getMimeTypeFromExtension(ext);
  if (!expectedMime) errors.push(`Unsupported file extension: ${ext}`);
  const mime = file.type || expectedMime;
  info.detectedMimeType = mime;
  info.expectedMimeType = expectedMime;
  if (mime !== expectedMime && expectedMime)
    warnings.push(`MIME type mismatch: detected "${mime}", expected "${expectedMime}"`);
  if (mime) {
    const browserSupport = checkBrowserSupport(mime);
    info.browserSupport = browserSupport;
    if (browserSupport.level === 'none')
      errors.push(`Format not supported by your browser: ${mime}`);
    else if (browserSupport.level === 'medium')
      warnings.push(`Limited browser support for ${mime}. Playback may not work properly.`);
  }
  const isUniversal = Object.keys(SUPPORTED_FORMATS.UNIVERSAL).includes(mime);
  info.isUniversalFormat = isUniversal;
  if (!isUniversal && !errors.length)
    info.recommendation = 'For best compatibility, convert to MP3 or WAV.';
  return { valid: !errors.length, errors, warnings, info };
};

// ====== ERROR MESSAGES ======
const errorMsgs = {
  1: { title: 'Playback Aborted', message: 'Audio playback was cancelled.', suggestion: 'Try loading the file again.' },
  2: { title: 'Network Error', message: 'Failed to load audio due to network issues.', suggestion: 'Check your internet connection and try again.' },
  3: { title: 'Decode Error', message: 'The audio file appears to be corrupted or has an invalid format.', suggestion: 'Try a different audio file or re-export.' },
  4: { title: 'Format Not Supported', message: 'This audio format is not supported by your browser.', suggestion: 'Convert to MP3 or WAV for best compatibility.' }
};
export const getAudioErrorMessage = (error, filename = 'audio file') => {
  if (!error) return 'Unknown audio error';
  const code = error.code, info = errorMsgs[code] || {
    title: 'Audio Error',
    message: `Unknown audio error (code: ${code})`,
    suggestion: 'Try a different audio file.'
  };
  return {
    ...info, code, filename,
    supportedFormats: Object.keys(SUPPORTED_FORMATS.UNIVERSAL).map(getFormatDisplayName)
  };
};

// ====== COMPATIBILITY REPORT ======
export const generateCompatibilityReport = () => {
  const cat = (obj, key) =>
    Object.fromEntries(Object.entries(obj[key]).map(([mime, exts]) => [
      mime, {
        extensions: exts,
        support: checkBrowserSupport(mime),
        displayName: getFormatDisplayName(mime)
      }
    ]));
  return {
    universal: cat(SUPPORTED_FORMATS, 'UNIVERSAL'),
    moderate: cat(SUPPORTED_FORMATS, 'MODERATE'),
    limited: cat(SUPPORTED_FORMATS, 'LIMITED'),
    browser: navigator.userAgent
  };
};

// ====== URL VALIDATION & DEBUG ======
export const validateAudioURL = url => {
  if (!url) return { valid: false, reason: 'URL is empty or null' };
  if (typeof url !== 'string') return { valid: false, reason: 'URL is not a string' };
  if (url === window.location.href) return { valid: false, reason: 'URL is the page location (empty src)' };
  if (!/^blob:|^https?:\/\//.test(url)) return { valid: false, reason: 'URL must start with blob:, http://, or https://' };
  if (url.startsWith('blob:') && !url.includes(window.location.origin)) return { valid: false, reason: 'Blob URL does not match current origin' };
  return { valid: true, reason: 'URL is valid' };
};

export const debugAudioState = (audioElement, label = 'Audio') => {
  if (!audioElement) {
    console.warn(`[${label}] No audio element provided`);
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
  console.log(`[${label}]`, {
    ...state,
    readyStateText: readyStates[state.readyState] || `Unknown(${state.readyState})`,
    networkStateText: networkStates[state.networkState] || `Unknown(${state.networkState})`,
    srcValidation: validateAudioURL(state.src),
    currentSrcValidation: validateAudioURL(state.currentSrc)
  });
  return state;
};

// ====== SAFE AUDIO URL UTIL ======
export const createSafeAudioURL = file => {
  if (!isValidAudioFile(file)) return null;
  try { return URL.createObjectURL(file); }
  catch { return null; }
};

export const revokeSafeAudioURL = url => {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch {}
  }
};
