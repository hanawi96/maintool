// 📁 src/apps/mp3-cutter/utils/constants.js - File đã tối ưu (100% logic & UI giữ nguyên)

/**
 * Định nghĩa các format audio hỗ trợ
 */
export const AUDIO_FORMATS = {
  MP3:   { value: 'mp3',  label: 'MP3',  mime: 'audio/mpeg', description: 'High Quality' },
  M4A:   { value: 'm4a',  label: 'M4A',  mime: 'audio/mp4',  description: 'AAC Audio' },
  M4R:   { value: 'm4r',  label: 'M4R',  mime: 'audio/mp4',  description: 'iPhone Ringtone' },
  FLAC:  { value: 'flac', label: 'FLAC', mime: 'audio/flac', description: 'Lossless' },
  WAV:   { value: 'wav',  label: 'WAV',  mime: 'audio/wav',  description: 'Uncompressed' },
  AAC:   { value: 'aac',  label: 'AAC',  mime: 'audio/aac',  description: 'Advanced Audio' },
  OGG:   { value: 'ogg',  label: 'OGG',  mime: 'audio/ogg',  description: 'Open Source' }
};

/** Định nghĩa chất lượng */
export const QUALITY_SETTINGS = {
  HIGH:   'high',
  MEDIUM: 'medium',
  LOW:    'low'
};

/** Các mức tốc độ playback */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Cấu hình fade effects */
export const FADE_CONFIG = {
  MAX_DURATION: 15, // giây
  MIN_DURATION: 0,
  STEP: 0.1,
  DEFAULT_PRESETS: {
    GENTLE:    { fadeIn: 1.0,  fadeOut: 1.0  },
    STANDARD:  { fadeIn: 3.0,  fadeOut: 3.0  },
    DRAMATIC:  { fadeIn: 5.0,  fadeOut: 5.0  },
    EXTENDED:  { fadeIn: 8.0,  fadeOut: 8.0  },
    MAXIMUM:   { fadeIn: 15.0, fadeOut: 15.0 }
  }
};

/** Cấu hình waveform component */
export const WAVEFORM_CONFIG = {
  SAMPLE_COUNT: 2000,
  HEIGHT: 200,
  HANDLE_WIDTH: 10,
  HANDLE_HEIGHT: 20,
  MODERN_HANDLE_WIDTH: 8,
  RESPONSIVE: {
    MIN_WIDTH: 300,
    MOBILE_BREAKPOINT: 640,
    MAX_BAR_WIDTH: 1,
    MIN_BAR_WIDTH: 0.6,
    SAMPLING_RULES: {
      SMALL:  { maxWidth: 640,   samplesPerPx: 1.5, description: 'Mobile optimized' },
      MEDIUM: { maxWidth: 1024,  samplesPerPx: 2.0, description: 'Tablet optimized' },
      LARGE:  { maxWidth: Infinity, samplesPerPx: 2.5, description: 'Desktop optimized' }
    }
  },
  COLORS: {
    SELECTED: '#7c3aed',
    UNSELECTED: '#e2e8f0',
    CURSOR_PLAYING: '#3b82f6',
    CURSOR_PAUSED: '#2563eb',
    HOVER_LINE: 'rgba(59, 130, 246, 0.7)',
    HANDLE_START: '#0d9488',
    HANDLE_END: '#ea580c',
    SELECTION_OVERLAY: 'rgba(139, 92, 246, 0.15)',
    SELECTION_BORDER: 'rgba(139, 92, 246, 0.6)',
    BACKGROUND_GRADIENT_START: 'rgba(99, 102, 241, 0.04)',
    BACKGROUND_GRADIENT_END:   'rgba(168, 85, 247, 0.04)'
  },
  CURSOR: {
    TYPES: {
      POINTER: 'pointer',
      GRAB: 'grab',
      ALL_SCROLL: 'all-scroll',
      EW_RESIZE: 'ew-resize'
    },
    FALLBACKS: {
      'all-scroll': ['all-scroll', 'move', '-webkit-grab', 'grab', 'crosshair', 'pointer'],
      'ew-resize': ['ew-resize', 'col-resize', 'e-resize', 'w-resize', 'pointer'],
      'grab': ['grab', '-webkit-grab', 'move', 'pointer'],
      'pointer': ['pointer', 'default']
    },
    DATA_ATTRIBUTES: {
      REGION_POTENTIAL: 'region-potential',
      HANDLE_RESIZE: 'handle-resize',
      REGION_HOVER: 'region-hover',
      POINTER: 'pointer'
    }
  },
  PERFORMANCE: {
    THROTTLE_HOVER: 8,
    THROTTLE_CURSOR: 16,
    FAST_RENDER: 8,
    NORMAL_RENDER: 16,
    SLOW_RENDER: 16,
    FRAME_RATES: {
      DRAGGING: 8.33,
      PLAYING: 8,
      HOVERING: 8,
      STATIC: 16
    },
    LOG_SAMPLING: {
      CURSOR: 0.02,
      HOVER: 0.005,
      RENDER: 0.01,
      FADE: 0.005
    }
  },
  ANIMATION: {
    VOLUME: {
      SPEED: 0.5,
      THRESHOLD: 0.0001
    },
    TOOLTIP: {
      DELAY_HIDE: 50,
      UPDATE_INTERVAL: 16
    }
  },
  TOOLTIP: {
    OFFSET_ABOVE: -25,
    OFFSET_BELOW: 5,
    OFFSET_INSIDE: -30,
    MIN_SELECTION_DURATION: 0.1,
    STYLES: {
      HOVER: {
        fontSize: '11px',
        fontWeight: '700',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        padding: '2px 6px'
      },
      HANDLE: {
        fontSize: '12px',
        fontWeight: 'medium',
        borderRadius: '4px',
        padding: '2px 8px'
      },
      DURATION: {
        fontSize: '14px',
        fontWeight: '600',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        padding: '4px 8px'
      }
    }
  },
  VOLUME: {
    MAX_HEIGHT_PERCENT_TOTAL: 45, // 45% of canvas height total (both sides)
    MAX_HEIGHT_PERCENT_PER_SIDE: 22.5, // 22.5% per side
    MIN_HEIGHT: 1 // Minimum height in pixels
  }
};

/** Endpoint API backend */
export const API_ENDPOINTS = {
  UPLOAD: '/api/mp3-cutter/upload',
  CUT: '/api/mp3-cutter/cut',
  CUT_BY_FILEID: '/api/mp3-cutter/cut-by-fileid',
  CHANGE_SPEED: '/api/mp3-cutter/change-speed-by-fileid',
  WAVEFORM: '/api/mp3-cutter/waveform',
  DOWNLOAD: '/api/mp3-cutter/download',
  HEALTH: '/api/mp3-cutter/health',
  FORMATS: '/api/mp3-cutter/formats',
  STATS: '/api/mp3-cutter/stats',
  DEBUG: '/api/mp3-cutter/debug'
};
