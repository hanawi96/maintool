// features/mp3-cutter/constants.js

export const MP3_CONFIG = {
    // File constraints
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_DURATION: 3600, // 1 hour in seconds
    MIN_DURATION: 1, // 1 second minimum
    
    // Supported formats
    SUPPORTED_INPUT_FORMATS: [
      'mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma'
    ],
    
    SUPPORTED_OUTPUT_FORMATS: [
      'mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'm4r'
    ],
    
    // Quality settings
    QUALITY_PRESETS: {
      low: {
        mp3: { bitrate: '128k', codec: 'libmp3lame' },
        wav: { bitrate: null, codec: 'pcm_s16le' },
        aac: { bitrate: '128k', codec: 'aac' },
        ogg: { bitrate: '128k', codec: 'libvorbis' },
        flac: { bitrate: null, codec: 'flac' },
        m4a: { bitrate: '128k', codec: 'aac' },
        m4r: { bitrate: '128k', codec: 'aac' }
      },
      medium: {
        mp3: { bitrate: '192k', codec: 'libmp3lame' },
        wav: { bitrate: null, codec: 'pcm_s24le' },
        aac: { bitrate: '192k', codec: 'aac' },
        ogg: { bitrate: '192k', codec: 'libvorbis' },
        flac: { bitrate: null, codec: 'flac' },
        m4a: { bitrate: '192k', codec: 'aac' },
        m4r: { bitrate: '192k', codec: 'aac' }
      },
      high: {
        mp3: { bitrate: '320k', codec: 'libmp3lame' },
        wav: { bitrate: null, codec: 'pcm_s32le' },
        aac: { bitrate: '256k', codec: 'aac' },
        ogg: { bitrate: '256k', codec: 'libvorbis' },
        flac: { bitrate: null, codec: 'flac' },
        m4a: { bitrate: '256k', codec: 'aac' },
        m4r: { bitrate: '256k', codec: 'aac' }
      }
    },
    
    // Processing limits
    MAX_FADE_DURATION: 30, // 30 seconds max fade
    MIN_SEGMENT_DURATION: 0.1, // 0.1 second minimum segment
    
    // Waveform settings
    WAVEFORM: {
      DEFAULT_SAMPLES: 1000,
      MAX_SAMPLES: 5000,
      SAMPLE_RATE: 8000
    },
    
    // File paths
    PATHS: {
      UPLOADS: 'storage/mp3-cutter/uploads',
      PROCESSED: 'storage/mp3-cutter/processed',
      TEMP: 'storage/mp3-cutter/temp',
      WAVEFORMS: 'storage/mp3-cutter/waveforms'
    },
    
    // Cleanup settings
    CLEANUP: {
      TEMP_FILE_TTL: 1 * 60 * 60 * 1000, // 1 hour
      PROCESSED_FILE_TTL: 24 * 60 * 60 * 1000, // 24 hours
      UPLOAD_FILE_TTL: 2 * 60 * 60 * 1000 // 2 hours
    },
    
    // Error messages
    ERRORS: {
      FILE_TOO_LARGE: 'File size exceeds maximum limit',
      FILE_TOO_LONG: 'Audio duration exceeds maximum limit',
      INVALID_FORMAT: 'Unsupported audio format',
      INVALID_TIME_RANGE: 'Invalid time range specified',
      FADE_TOO_LONG: 'Fade duration too long',
      SEGMENT_TOO_SHORT: 'Audio segment too short',
      PROCESSING_FAILED: 'Audio processing failed',
      FILE_NOT_FOUND: 'Audio file not found'
    }
  };
  
  export const MIME_TYPES = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    'm4r': 'audio/mp4',
    'wma': 'audio/x-ms-wma'
  };