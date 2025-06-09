// 📁 src/apps/mp3-cutter/utils/constants.js - FILE HOÀN CHỈNH

export const AUDIO_FORMATS = {
  MP3: { value: 'mp3', label: 'MP3', mime: 'audio/mpeg', description: 'High Quality' },
  M4A: { value: 'm4a', label: 'M4A', mime: 'audio/mp4', description: 'AAC Audio' },
  M4R: { value: 'm4r', label: 'M4R', mime: 'audio/mp4', description: 'iPhone Ringtone' },
  FLAC: { value: 'flac', label: 'FLAC', mime: 'audio/flac', description: 'Lossless' },
  WAV: { value: 'wav', label: 'WAV', mime: 'audio/wav', description: 'Uncompressed' },
  AAC: { value: 'aac', label: 'AAC', mime: 'audio/aac', description: 'Advanced Audio' },
  OGG: { value: 'ogg', label: 'OGG', mime: 'audio/ogg', description: 'Open Source' }
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

// 🎯 **WAVEFORM CONFIG**: Cấu hình hoàn chỉnh cho waveform component
export const WAVEFORM_CONFIG = {
  SAMPLE_COUNT: 2000,
  HEIGHT: 200,
  HANDLE_WIDTH: 10,        // 🎯 **LEGACY HANDLE WIDTH**: Kept for compatibility
  HANDLE_HEIGHT: 20,       // 🎯 **LEGACY HANDLE HEIGHT**: Kept for compatibility
  MODERN_HANDLE_WIDTH: 8,  // Mảnh hơn nữa (giảm từ 4px xuống 3px) + ENHANCED TOLERANCE (15px+) cho hover nhạy bén
  
  // 🎯 RESPONSIVE: Adaptive configuration for different screen sizes
  RESPONSIVE: {
    MIN_WIDTH: 250,           // Minimum canvas width (px)
    MIN_BAR_WIDTH: 0.6,       // 🔥 **ULTRA THIN**: Bars siêu mỏng cho responsive tốt hơn
    MOBILE_BREAKPOINT: 600,   // Mobile breakpoint (px)
    TOUCH_TOLERANCE: 15,      // Touch area tolerance on mobile (px)
    
    // 🚀 **ENHANCED SAMPLING**: Optimized density cho responsive bars
    SAMPLING_RULES: {
      SMALL: { maxWidth: 400, samplesPerPx: 1/2 },      // 🔥 Tăng density cho mobile
      MEDIUM: { maxWidth: 800, samplesPerPx: 1/1.5 },   // 🔥 Smooth density cho tablet  
      LARGE: { maxWidth: Infinity, samplesPerPx: 1/1 }  // 🔥 Maximum detail cho desktop
    },
    
    // 🆕 **BAR MODES**: Different rendering modes for various screen sizes
    BAR_MODES: {
      WIDE: { minBarWidth: 1.2, spacing: 0.7, quality: 'high' },      // Bars to với spacing
      STANDARD: { minBarWidth: 0.8, spacing: 0.8, quality: 'medium' }, // Bars tiêu chuẩn
      COMPACT: { minBarWidth: 0.4, spacing: 1.0, quality: 'optimized' } // Bars siêu mỏng
    }
  },

  // 🆕 **COLORS**: Màu sắc cho waveform components
  COLORS: {
    SELECTED: '#7c3aed',              // Màu purple đậm cho bars được chọn
    UNSELECTED: '#cbd5e1',            // Màu xám nhạt cho bars chưa chọn
    CURSOR_PLAYING: '#3b82f6',        // Màu xanh dương cho cursor khi đang play
    CURSOR_PAUSED: '#2563eb',         // Màu xanh dương đậm cho cursor khi pause
    HOVER_LINE: 'rgba(59, 130, 246, 0.7)',  // Màu hover line với opacity
    HANDLE_START: '#14b8a6',          // Màu teal cho start handle
    HANDLE_END: '#f97316',            // Màu cam cho end handle
    SELECTION_OVERLAY: 'rgba(139, 92, 246, 0.15)',  // Màu nền selection area
    SELECTION_BORDER: 'rgba(139, 92, 246, 0.6)',    // Màu viền selection
    BACKGROUND_GRADIENT_START: 'rgba(99, 102, 241, 0.04)',   // Gradient background start
    BACKGROUND_GRADIENT_END: 'rgba(168, 85, 247, 0.04)'      // Gradient background end
  },

  // 🆕 **CURSOR**: Cursor management configuration
  CURSOR: {
    TYPES: {
      POINTER: 'pointer',             // Default cursor
      GRAB: 'grab',                   // Grab cursor for region hover
      ALL_SCROLL: 'all-scroll',       // 4-way arrow for region drag
      EW_RESIZE: 'ew-resize'          // Horizontal resize for handles
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

  // 🆕 **PERFORMANCE**: Performance optimization thresholds
  PERFORMANCE: {
    THROTTLE_HOVER: 8,        // Throttle interval for hover updates (ms) - 125fps
    THROTTLE_CURSOR: 16,      // Throttle interval for cursor updates (ms) - 60fps
    FAST_RENDER: 8,           // Fast render threshold (ms) - under 8ms is excellent
    NORMAL_RENDER: 16,        // Normal render threshold (ms) - under 16ms is good
    SLOW_RENDER: 16,          // Slow render warning threshold (ms)
    
    // Animation frame rates for different states
    FRAME_RATES: {
      DRAGGING: 2,            // 500fps for ultra-smooth dragging
      PLAYING: 8,             // 125fps for smooth cursor movement  
      HOVERING: 8,            // 125fps for smooth hover line
      STATIC: 16              // 60fps for static UI updates
    },
    
    // Sampling rates for performance logging
    LOG_SAMPLING: {
      CURSOR: 0.02,           // 2% sampling for cursor logs
      HOVER: 0.005,           // 0.5% sampling for hover logs
      RENDER: 0.01,           // 1% sampling for render logs
      FADE: 0.005             // 0.5% sampling for fade logs
    }
  },

  // 🆕 **ANIMATION**: Animation configuration
  ANIMATION: {
    VOLUME: {
      SPEED: 0.5,             // Volume animation speed (0-1)
      THRESHOLD: 0.0001       // Minimum difference to trigger animation
    },
    TOOLTIP: {
      DELAY_HIDE: 50,         // Delay before hiding tooltip (ms)
      UPDATE_INTERVAL: 16     // Tooltip update interval (ms) - 60fps
    }
  },

  // 🆕 **TOOLTIP**: Tooltip configuration
  TOOLTIP: {
    OFFSET_ABOVE: -25,        // Offset above canvas for hover tooltip (px)
    OFFSET_BELOW: 5,          // Offset below canvas for handle tooltips (px)
    OFFSET_INSIDE: -30,       // Offset inside canvas for duration tooltip (px)
    MIN_SELECTION_DURATION: 0.1,  // Minimum selection duration to show tooltip (seconds)
    
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

  // 🆕 **VOLUME**: Perfect linear volume system
  VOLUME: {
    FLAT_BAR_HEIGHT: 1,       // Base height at 0% volume (px)
    MAX_SCALING: 65,          // Max additional scaling (px) - total 66px at 100%
    STEPS: 50,                // Number of volume steps (0%, 2%, 4%, ..., 100%)
    STEP_SIZE: 2,             // Percentage per step (2%)
    PX_PER_STEP: 1.3,         // Pixels per step (65px / 50 steps = 1.3px)
    
    // Waveform variation mapping
    VARIATION: {
      FLAT_THRESHOLD: 0,      // 0% volume = 100% flat bars
      DYNAMIC_THRESHOLD: 1    // 100% volume = 100% dynamic bars
    }
  }
};

export const API_ENDPOINTS = {
  UPLOAD: '/api/mp3-cutter/upload',
  CUT: '/api/mp3-cutter/cut',
  CUT_BY_FILE_ID: '/api/mp3-cutter/cut-by-fileid',
  CHANGE_SPEED_BY_FILEID: '/api/mp3-cutter/change-speed-by-fileid',
  DOWNLOAD: '/api/mp3-cutter/download'
};