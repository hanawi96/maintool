export const AUDIO_FORMATS = {
  MP3: { value: 'mp3', label: 'MP3 (High Quality)', mime: 'audio/mpeg' },
  WAV: { value: 'wav', label: 'WAV (Lossless)', mime: 'audio/wav' },
  M4A: { value: 'm4a', label: 'M4A (AAC)', mime: 'audio/mp4' },
  OGG: { value: 'ogg', label: 'OGG (Vorbis)', mime: 'audio/ogg' }
};

export const QUALITY_SETTINGS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// 🆕 **FADE EFFECTS CONFIG**: Cấu hình cho fade in/out effects
export const FADE_CONFIG = {
  MAX_DURATION: 15,      // Thời gian fade tối đa (giây) - tăng từ 5s lên 15s
  MIN_DURATION: 0,       // Thời gian fade tối thiểu (giây)
  STEP: 0.1,             // Bước nhảy cho slider (giây)
  DEFAULT_PRESETS: {     // Preset mặc định cho fade effects
    GENTLE: { fadeIn: 1.0, fadeOut: 1.0 },
    STANDARD: { fadeIn: 3.0, fadeOut: 3.0 },
    DRAMATIC: { fadeIn: 5.0, fadeOut: 5.0 },
    EXTENDED: { fadeIn: 8.0, fadeOut: 8.0 },   // 🆕 **PRESET MỚI**: Cho range 15s
    MAXIMUM: { fadeIn: 15.0, fadeOut: 15.0 }   // 🆕 **PRESET TỐI ĐA**: Full 15s
  }
};

export const WAVEFORM_CONFIG = {
  SAMPLE_COUNT: 2000,
  HEIGHT: 200,
  HANDLE_WIDTH: 10,        // 🎯 **LEGACY HANDLE WIDTH**: Kept for compatibility
  HANDLE_HEIGHT: 20,       // 🎯 **LEGACY HANDLE HEIGHT**: Kept for compatibility
  MODERN_HANDLE_WIDTH: 3,  // Mảnh hơn nữa (giảm từ 4px xuống 3px)
  
  // 🎯 RESPONSIVE: Adaptive configuration for different screen sizes
  RESPONSIVE: {
    MIN_WIDTH: 250,           // Minimum canvas width (px)
    MIN_BAR_WIDTH: 1,         // Giảm xuống 1px cho thanh nhỏ hơn
    MOBILE_BREAKPOINT: 600,   // Mobile breakpoint (px)
    TOUCH_TOLERANCE: 15,      // Touch area tolerance on mobile (px)
    
    // Adaptive sampling rules (samples per pixel)
    SAMPLING_RULES: {
      SMALL: { maxWidth: 400, samplesPerPx: 1/3 },    // 1 sample per 3px
      MEDIUM: { maxWidth: 800, samplesPerPx: 1/2.5 }, // 1 sample per 2.5px  
      LARGE: { maxWidth: Infinity, samplesPerPx: 1/2 } // 1 sample per 2px
    }
  }
};

export const API_ENDPOINTS = {
  UPLOAD: '/api/mp3-cutter/upload',
  CUT: '/api/mp3-cutter/cut',
  DOWNLOAD: '/api/mp3-cutter/download'
};