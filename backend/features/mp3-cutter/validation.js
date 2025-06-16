// features/mp3-cutter/validation.js

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

function errorRes(res, msg, code = 400) { return res.status(code).json({ error: msg }); }
function parseParam(val, def = 0) { const f = parseFloat(val); return isNaN(f) ? def : f; }
function isValidRate(rate) { return rate >= 0.25 && rate <= 4; }

const storage = multer.diskStorage({
  destination: MP3_CONFIG.PATHS.UPLOADS,
  filename: (req, file, cb) => {
    const ts = Date.now(), rand = Math.random().toString(36).substr(2, 6), ext = path.extname(file.originalname);
    cb(null, `${ts}_${rand}${ext}`);
  }
});
export const uploadMP3 = multer({
  storage,
  fileFilter: (req, file, cb) => file.mimetype.startsWith('audio/') ? cb(null, true) : cb(new Error('Only audio files allowed'), false),
  limits: { fileSize: MP3_CONFIG.MAX_FILE_SIZE }
}).single('audio');

export const validateUpload = (req, res, next) => {
  uploadMP3(req, res, (err) => err ? errorRes(res, err.message) : req.file ? next() : errorRes(res, 'No audio file provided'));
};

export const validateAudioFile = async (req, res, next) => {
  try {
    const info = await MP3Utils.getAudioInfo(req.file.path);
    if (info.duration > MP3_CONFIG.MAX_DURATION) { await fs.unlink(req.file.path).catch(() => {}); return errorRes(res, 'Audio too long'); }
    req.audioInfo = info; next();
  } catch (e) { if (req.file?.path) await fs.unlink(req.file.path).catch(() => {}); errorRes(res, 'Invalid audio file'); }
};

export const validateCutParams = (req, res, next) => {
  const { startTime, endTime, fadeIn = 0, fadeOut = 0, playbackRate = 1 } = req.body;
  const duration = req.audioInfo?.duration || 0;
  const start = parseParam(startTime), end = parseParam(endTime);
  if (start >= end || end > duration) return errorRes(res, 'Invalid time range');
  const rate = parseParam(playbackRate, 1);
  if (!isValidRate(rate)) return errorRes(res, 'Invalid playback rate. Must be between 0.25x and 4x');
  req.cutParams = { startTime: start, endTime: end, fadeIn: parseParam(fadeIn), fadeOut: parseParam(fadeOut), playbackRate: rate };
  next();
};

export const validateFileId = (req, res, next) => {
  const { fileId } = req.body;
  if (!fileId || typeof fileId !== 'string') {
    return errorRes(res, 'FileId is required and must be a string');
  }
  // Basic validation for file ID format (alphanumeric with underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(fileId)) {
    return errorRes(res, 'Invalid fileId format');
  }
  req.fileId = fileId;
  next();
};

export const validateSpeedParams = (req, res, next) => {
  const { playbackRate = 1 } = req.body;
  const rate = parseParam(playbackRate, 1);
  if (!isValidRate(rate)) {
    return errorRes(res, 'Invalid playback rate. Must be between 0.25x and 4x');
  }
  req.speedParams = { playbackRate: rate };
  next();
};

export const validateWaveformParams = (req, res, next) => {
  const { samples = 1000 } = req.body;
  const sampleCount = parseInt(samples);
  if (isNaN(sampleCount) || sampleCount < 100 || sampleCount > 10000) {
    return errorRes(res, 'Invalid samples count. Must be between 100 and 10000');
  }
  req.waveformParams = { samples: sampleCount };
  next();
};

// ...Các validate khác giữ nguyên logic, gom helper dùng chung
