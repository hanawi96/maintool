// features/mp3-cutter/validation.js (Simplified)
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

// Simple multer setup
const storage = multer.diskStorage({
  destination: MP3_CONFIG.PATHS.UPLOADS,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${random}${ext}`);
  }
});

export const uploadMP3 = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: MP3_CONFIG.MAX_FILE_SIZE }
}).single('audio');

// Validation middleware
export const validateUpload = (req, res, next) => {
  uploadMP3(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    next();
  });
};

export const validateAudioFile = async (req, res, next) => {
  try {
    const audioInfo = await MP3Utils.getAudioInfo(req.file.path);
    
    if (audioInfo.duration > MP3_CONFIG.MAX_DURATION) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Audio too long' });
    }
    
    req.audioInfo = audioInfo;
    next();
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    res.status(400).json({ error: 'Invalid audio file' });
  }
};

export const validateCutParams = (req, res, next) => {
  const { startTime, endTime, fadeIn = 0, fadeOut = 0, playbackRate = 1 } = req.body;
  const duration = req.audioInfo?.duration || 0;
  
  const start = parseFloat(startTime);
  const end = parseFloat(endTime);
  
  if (isNaN(start) || isNaN(end) || start >= end || end > duration) {
    return res.status(400).json({ error: 'Invalid time range' });
  }
  
  const rate = parseFloat(playbackRate);
  if (isNaN(rate) || rate < 0.25 || rate > 4) {
    return res.status(400).json({ 
      error: 'Invalid playback rate. Must be between 0.25x and 4x' 
    });
  }
  
  req.cutParams = {
    startTime: start,
    endTime: end,
    fadeIn: parseFloat(fadeIn),
    fadeOut: parseFloat(fadeOut),
    playbackRate: rate
  };
  
  next();
};

export const validateWaveformParams = (req, res, next) => {
  const samples = parseInt(req.body.samples) || MP3_CONFIG.WAVEFORM.DEFAULT_SAMPLES;
  req.waveformParams = { samples };
  next();
};

// 🆕 **VALIDATE FILE ID**: Validate fileId cho cut-by-fileid endpoint
export const validateFileId = (req, res, next) => {
  // 🔍 **GET FILE ID**: Get fileId from URL params or body
  let fileId = req.params?.fileId || req.body?.fileId;
  
  // 🔍 **VALIDATE FILE ID**: Kiểm tra fileId có tồn tại
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'fileId is required and must be a string' 
    });
  }

  // For cut operations, validate all parameters
  const { 
    startTime, 
    endTime, 
    fadeIn = 0, 
    fadeOut = 0, 
    playbackRate = 1,
    outputFormat = 'mp3',
    quality = 'high',
    isInverted = false
  } = req.body;
  
  // 🔍 **VALIDATE CUT PARAMS**: Validate các parameters như validateCutParams
  const start = parseFloat(startTime);
  const end = parseFloat(endTime);
  
  if (isNaN(start) || isNaN(end) || start >= end) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid time range: startTime must be less than endTime' 
    });
  }
  
  // 🔍 **VALIDATE FADE PARAMS**: Validate fade parameters
  const fadeInValue = parseFloat(fadeIn);
  const fadeOutValue = parseFloat(fadeOut);
  
  if (isNaN(fadeInValue) || isNaN(fadeOutValue) || fadeInValue < 0 || fadeOutValue < 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Fade values must be non-negative numbers' 
    });
  }
  
  // 🔧 **FIX: VALIDATE PLAYBACK RATE**: Validate tốc độ phát như trong validateCutParams
  const rate = parseFloat(playbackRate);
  if (isNaN(rate) || rate < 0.25 || rate > 4) {

    return res.status(400).json({ 
      success: false,
      error: 'Invalid playback rate. Must be between 0.25x and 4x' 
    });
  }
  
  // 🆕 **VALIDATE OUTPUT FORMAT**: Validate format có được hỗ trợ không
  const supportedFormats = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'm4r'];
  if (!supportedFormats.includes(outputFormat.toLowerCase())) {

    return res.status(400).json({ 
      success: false,
      error: `Invalid output format. Supported formats: ${supportedFormats.join(', ')}` 
    });
  }
  
  // 🆕 **VALIDATE QUALITY**: Validate quality setting
  const supportedQualities = ['low', 'medium', 'high'];
  if (!supportedQualities.includes(quality.toLowerCase())) {

    return res.status(400).json({ 
      success: false,
      error: `Invalid quality. Supported qualities: ${supportedQualities.join(', ')}` 
    });
  }
    // 🆕 **SET REQUEST DATA**: Set validated data to request với đầy đủ params bao gồm format và invert mode
  req.fileId = fileId;
  req.cutParams = {
    startTime: start,
    endTime: end,
    fadeIn: fadeInValue,
    fadeOut: fadeOutValue,
    playbackRate: rate,
    outputFormat: outputFormat.toLowerCase(),
    quality: quality.toLowerCase(),
    isInverted: Boolean(isInverted), // 🆕 **INVERT MODE**: Include invert mode in cut params
    normalizeVolume: Boolean(req.body.normalizeVolume) // 🔊 **VOLUME NORMALIZATION**: Include volume normalization setting
  };
  
  next();
};

/**
 * 🆕 **VALIDATE SPEED PARAMS**: Validation cho speed change requests
 */
export const validateSpeedParams = (req, res, next) => {
  const { playbackRate = 1, outputFormat = 'mp3', quality = 'medium' } = req.body;
  
  const rate = parseFloat(playbackRate);
  if (isNaN(rate) || rate < 0.25 || rate > 4) {
    return res.status(400).json({ 
      error: 'Invalid playback rate. Must be between 0.25x and 4x' 
    });
  }
  
  const validFormats = ['mp3', 'wav', 'aac', 'ogg'];
  if (!validFormats.includes(outputFormat.toLowerCase())) {
    return res.status(400).json({ 
      error: `Invalid output format. Must be one of: ${validFormats.join(', ')}` 
    });
  }
  
  const validQualities = ['low', 'medium', 'high'];
  if (!validQualities.includes(quality.toLowerCase())) {
    return res.status(400).json({ 
      error: `Invalid quality. Must be one of: ${validQualities.join(', ')}` 
    });
  }
  
  req.speedParams = {
    playbackRate: rate,
    outputFormat: outputFormat.toLowerCase(),
    quality: quality.toLowerCase()
  };
  
  next();
};