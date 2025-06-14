// features/mp3-cutter/routes.js (Fixed - Ultra Light)

import express from 'express';
import { MP3Controller } from './controller.js';
import {
  validateUpload,
  validateAudioFile,
  validateCutParams,
  validateWaveformParams,
  validateFileId,
  validateSpeedParams
} from './validation.js';

const router = express.Router();

// Simple logging middleware
router.use((req, res, next) => {
  console.log(`[MP3-Cutter] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

/**
 * @route POST /api/mp3-cutter/upload
 * @desc Upload audio file and get file information
 */
router.post('/upload',
  validateUpload,
  validateAudioFile,
  MP3Controller.upload
);

/**
 * @route POST /api/mp3-cutter/cut
 * @desc Cut audio file with specified time range and fade effects
 */
router.post('/cut',
  validateUpload,
  validateAudioFile,
  validateCutParams,
  MP3Controller.cut
);

/**
 * @route POST /api/mp3-cutter/cut-by-fileid
 * @desc Cut audio file by fileId (từ file đã upload trước đó)
 */
router.post('/cut-by-fileid',
  validateFileId,
  MP3Controller.cutByFileId
);

/**
 * @route POST /api/mp3-cutter/change-speed-by-fileid
 * @desc Change audio playback speed by fileId (thay đổi tốc độ từ file đã upload)
 */
router.post('/change-speed-by-fileid',
  validateFileId,
  validateSpeedParams,
  MP3Controller.changeSpeedByFileId
);

/**
 * @route POST /api/mp3-cutter/waveform
 * @desc Generate waveform data for audio file
 */
router.post('/waveform',
  validateUpload,
  validateAudioFile,
  validateWaveformParams,
  MP3Controller.waveform
);

/**
 * @route GET /api/mp3-cutter/download/:filename
 * @desc Download processed or uploaded audio file
 */
router.get('/download/:filename', MP3Controller.download);

/**
 * @route GET /api/mp3-cutter/health
 * @desc Health check for MP3 cutter service
 */
router.get('/health', MP3Controller.healthCheck);

/**
 * @route GET /api/mp3-cutter/formats
 * @desc Get supported formats and settings
 */
router.get('/formats', MP3Controller.getSupportedFormats);

/**
 * @route GET /api/mp3-cutter/stats
 * @desc Get service statistics
 */
router.get('/stats', MP3Controller.getStats);

/**
 * @route GET /api/mp3-cutter/debug
 * @desc Debug file system (development only)
 */
router.get('/debug', MP3Controller.debugFiles);

/**
 * @route GET /api/mp3-cutter
 * @desc Get service information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'MP3 Cutter',
    version: '2.0.0',
    description: 'Ultra-light audio cutting and processing service',
    endpoints: {
      upload: {
        method: 'POST',
        path: '/upload',
        description: 'Upload audio file and get file information',
        accepts: 'multipart/form-data (audio field)'
      },
      cut: {
        method: 'POST',
        path: '/cut',
        description: 'Cut audio with time range and fade effects',
        accepts: 'multipart/form-data + form fields',
        parameters: ['startTime', 'endTime', 'fadeIn?', 'fadeOut?']
      },
      waveform: {
        method: 'POST',
        path: '/waveform',
        description: 'Generate waveform data',
        accepts: 'multipart/form-data + form fields',
        parameters: ['samples?']
      },
      download: {
        method: 'GET',
        path: '/download/:filename',
        description: 'Download processed file'
      },
      health: {
        method: 'GET',
        path: '/health',
        description: 'Service health check'
      },
      formats: {
        method: 'GET',
        path: '/formats',
        description: 'Get supported formats and limits'
      },
      stats: {
        method: 'GET',
        path: '/stats',
        description: 'Get service statistics'
      }
    },
    examples: {
      upload: `curl -X POST -F "audio=@song.mp3" ${req.protocol}://${req.get('host')}/api/mp3-cutter/upload`,
      cut: `curl -X POST -F "audio=@song.mp3" -F "startTime=10" -F "endTime=60" -F "fadeIn=2" -F "fadeOut=3" ${req.protocol}://${req.get('host')}/api/mp3-cutter/cut`,
      waveform: `curl -X POST -F "audio=@song.mp3" -F "samples=1000" ${req.protocol}://${req.get('host')}/api/mp3-cutter/waveform`
    },
    timestamp: new Date().toISOString()
  });
});

// Simple error handling middleware
router.use((error, req, res, next) => {
  console.error(`[MP3-Cutter] Error:`, error.message);
  
  // Handle Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      maxSize: '100MB'
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    service: 'mp3-cutter',
    timestamp: new Date().toISOString()
  });
});

export default router;