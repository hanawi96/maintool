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
  const { startTime, endTime, fadeIn = 0, fadeOut = 0 } = req.body;
  const duration = req.audioInfo?.duration || 0;
  
  const start = parseFloat(startTime);
  const end = parseFloat(endTime);
  
  if (isNaN(start) || isNaN(end) || start >= end || end > duration) {
    return res.status(400).json({ error: 'Invalid time range' });
  }
  
  req.cutParams = {
    startTime: start,
    endTime: end,
    fadeIn: parseFloat(fadeIn),
    fadeOut: parseFloat(fadeOut)
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
  const { fileId, startTime, endTime, fadeIn = 0, fadeOut = 0 } = req.body;
  
  // 🔍 **VALIDATE FILE ID**: Kiểm tra fileId có tồn tại
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'fileId is required and must be a string' 
    });
  }
  
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
  
  // 🆕 **SET REQUEST DATA**: Set validated data to request
  req.fileId = fileId;
  req.cutParams = {
    startTime: start,
    endTime: end,
    fadeIn: fadeInValue,
    fadeOut: fadeOutValue
  };
  
  console.log('✅ [validateFileId] Validation passed:', {
    fileId,
    cutParams: req.cutParams
  });
  
  next();
};