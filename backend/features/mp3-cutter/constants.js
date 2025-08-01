// features/mp3-cutter/constants.js

export const MP3_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DURATION: 3600, // 1 hour (seconds)
  MIN_DURATION: 1,
  SUPPORTED_INPUT_FORMATS: [
    'mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma'
  ],  SUPPORTED_OUTPUT_FORMATS: [
    'mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'm4r', 'wma'
  ],
  QUALITY_PRESETS: {    low: {
      mp3: { bitrate: '128k', codec: 'libmp3lame' },
      wav: { bitrate: null, codec: 'pcm_s16le' },
      aac: { bitrate: '128k', codec: 'aac' },
      ogg: { bitrate: '128k', codec: 'libvorbis' },
      flac: { bitrate: null, codec: 'flac' },
      m4a: { bitrate: '128k', codec: 'aac' },
      m4r: { bitrate: '128k', codec: 'aac' },
      wma: { bitrate: '128k', codec: 'wmav2' }
    },
    medium: {
      mp3: { bitrate: '192k', codec: 'libmp3lame' },
      wav: { bitrate: null, codec: 'pcm_s24le' },
      aac: { bitrate: '192k', codec: 'aac' },
      ogg: { bitrate: '192k', codec: 'libvorbis' },
      flac: { bitrate: null, codec: 'flac' },
      m4a: { bitrate: '192k', codec: 'aac' },
      m4r: { bitrate: '192k', codec: 'aac' },
      wma: { bitrate: '192k', codec: 'wmav2' }
    },
    high: {
      mp3: { bitrate: '320k', codec: 'libmp3lame' },
      wav: { bitrate: null, codec: 'pcm_s32le' },
      aac: { bitrate: '256k', codec: 'aac' },
      ogg: { bitrate: '256k', codec: 'libvorbis' },
      flac: { bitrate: null, codec: 'flac' },
      m4a: { bitrate: '256k', codec: 'aac' },
      m4r: { bitrate: '256k', codec: 'aac' },
      wma: { bitrate: '256k', codec: 'wmav2' }
    }
  },
  MAX_FADE_DURATION: 30,
  MIN_SEGMENT_DURATION: 0.1,
  WAVEFORM: {
    DEFAULT_SAMPLES: 1000,
    MAX_SAMPLES: 5000,
    SAMPLE_RATE: 8000
  },
  PATHS: {
    UPLOADS: 'storage/mp3-cutter/uploads',
    PROCESSED: 'storage/mp3-cutter/processed',
    TEMP: 'storage/mp3-cutter/temp',
    WAVEFORMS: 'storage/mp3-cutter/waveforms'
  },
  CLEANUP: {
    TEMP_FILE_TTL: 1 * 60 * 60 * 1000,
    PROCESSED_FILE_TTL: 24 * 60 * 60 * 1000,
    UPLOAD_FILE_TTL: 2 * 60 * 60 * 1000
  },
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
