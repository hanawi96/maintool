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
  
  // Accept all common filename characters (letters, numbers, dots, dashes, underscores)
  // Allow extensions and typical upload filename patterns
  if (!/^[a-zA-Z0-9._-]+$/.test(fileId.trim())) {
    return errorRes(res, `Invalid fileId format: ${fileId}`);
  }
  
  req.fileId = fileId.trim();
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

// New validation for cut by file ID (no audioInfo required)
export const validateCutParamsById = (req, res, next) => {
  const { 
    startTime, endTime, fadeIn = 0, fadeOut = 0, playbackRate = 1, pitch = 0, volume = 1, equalizer,
    // 🆕 Region support
    regions = [],
    mainSelection = null
  } = req.body;
  
  // 🎯 Debug log for received parameters
  console.log('\n🔍 BACKEND VALIDATION DEBUG:');
  console.log('📥 Received req.body:', req.body);
  console.log('🔊 Volume from req.body:', {
    volume: volume,
    volumeType: typeof volume,
    volumeDefault: volume === 1 ? 'Using default' : 'Custom value'
  });
  
  // 🆕 Debug log for regions
  if (regions && regions.length > 0) {
    console.log('🎯 Regions from req.body:', {
      regionsCount: regions.length,
      regions: regions.map(r => ({
        id: r.id,
        start: r.start,
        end: r.end,
        duration: r.end - r.start,
        volume: r.volume,
        playbackRate: r.playbackRate,
        pitch: r.pitch,
        fadeIn: r.fadeIn,
        fadeOut: r.fadeOut
      }))
    });
  } else {
    console.log('🎯 No regions data received from frontend');
  }
  
  // 🆕 Debug log for main selection
  if (mainSelection) {
    console.log('🎯 Main Selection from req.body:', {
      start: mainSelection.start,
      end: mainSelection.end,
      duration: mainSelection.end - mainSelection.start,
      volume: mainSelection.volume,
      playbackRate: mainSelection.playbackRate,
      pitch: mainSelection.pitch,
      fadeIn: mainSelection.fadeIn,
      fadeOut: mainSelection.fadeOut
    });
  }
  
  // 🎚️ Debug log for equalizer parameters
  if (equalizer) {
    console.log('🎚️ Equalizer from req.body:', {
      equalizer: equalizer,
      isArray: Array.isArray(equalizer),
      length: equalizer?.length,
      values: equalizer,
      hasNonZeroValues: Array.isArray(equalizer) ? equalizer.some(v => v !== 0) : false
    });
  } else {
    console.log('🎚️ No equalizer data received from frontend');
  }
  
  // Parse parameters for backward compatibility (legacy main selection)
  const start = parseParam(startTime);
  const end = parseParam(endTime);
  const rate = parseParam(playbackRate, 1);
  const pitchSemitones = parseParam(pitch, 0);
  const volumeLevel = parseParam(volume, 1);
  
  // 🆕 Validate regions if provided
  let validatedRegions = [];
  if (regions && Array.isArray(regions)) {
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      
      // Validate region structure
      if (!region.id || typeof region.id !== 'string') {
        return errorRes(res, `Region ${i}: id is required and must be a string`);
      }
      
      const regionStart = parseParam(region.start);
      const regionEnd = parseParam(region.end);
      
      if (regionStart >= regionEnd) {
        return errorRes(res, `Region ${i} (${region.id}): startTime must be less than endTime`);
      }
      
      if (regionStart < 0) {
        return errorRes(res, `Region ${i} (${region.id}): startTime must be >= 0`);
      }
      
      // Validate region effects
      const regionRate = parseParam(region.playbackRate, 1);
      const regionPitch = parseParam(region.pitch, 0);
      const regionVolume = parseParam(region.volume, 1);
      
      if (!isValidRate(regionRate)) {
        return errorRes(res, `Region ${i} (${region.id}): invalid playback rate. Must be between 0.25x and 4x`);
      }
      
      if (regionVolume < 0 || regionVolume > 2.0) {
        return errorRes(res, `Region ${i} (${region.id}): invalid volume. Must be between 0% and 200%`);
      }
      
      if (regionPitch < -24 || regionPitch > 24) {
        return errorRes(res, `Region ${i} (${region.id}): invalid pitch. Must be between -24 and +24 semitones`);
      }
      
      validatedRegions.push({
        id: region.id,
        name: region.name || `Region ${i + 1}`,
        start: regionStart,
        end: regionEnd,
        volume: regionVolume,
        playbackRate: regionRate,
        pitch: regionPitch,
        fadeIn: parseParam(region.fadeIn, 0),
        fadeOut: parseParam(region.fadeOut, 0)
      });
    }
    
    console.log('🎯 Validated regions:', validatedRegions.length);
  }
  
  // 🆕 Validate main selection if provided
  let validatedMainSelection = null;
  if (mainSelection) {
    const mainStart = parseParam(mainSelection.start);
    const mainEnd = parseParam(mainSelection.end);
    
    if (mainStart >= mainEnd) {
      return errorRes(res, 'Main selection: startTime must be less than endTime');
    }
    
    if (mainStart < 0) {
      return errorRes(res, 'Main selection: startTime must be >= 0');
    }
    
    const mainRate = parseParam(mainSelection.playbackRate, 1);
    const mainPitch = parseParam(mainSelection.pitch, 0);
    const mainVolume = parseParam(mainSelection.volume, 1);
    
    if (!isValidRate(mainRate)) {
      return errorRes(res, 'Main selection: invalid playback rate. Must be between 0.25x and 4x');
    }
    
    if (mainVolume < 0 || mainVolume > 2.0) {
      return errorRes(res, 'Main selection: invalid volume. Must be between 0% and 200%');
    }
    
    if (mainPitch < -24 || mainPitch > 24) {
      return errorRes(res, 'Main selection: invalid pitch. Must be between -24 and +24 semitones');
    }
    
    validatedMainSelection = {
      start: mainStart,
      end: mainEnd,
      volume: mainVolume,
      playbackRate: mainRate,
      pitch: mainPitch,
      fadeIn: parseParam(mainSelection.fadeIn, 0),
      fadeOut: parseParam(mainSelection.fadeOut, 0)
    };
    
    console.log('🎯 Validated main selection:', validatedMainSelection);
  }
  
  // Legacy validation for backward compatibility
  if (!validatedMainSelection && (startTime !== undefined || endTime !== undefined)) {
    if (start >= end) {
      return errorRes(res, 'Invalid time range: startTime must be less than endTime');
    }
    if (start < 0) {
      return errorRes(res, 'Invalid startTime: must be >= 0');
    }
    if (!isValidRate(rate)) {
      return errorRes(res, 'Invalid playback rate. Must be between 0.25x and 4x');
    }
    
    // 🎯 Validate volume range (0-2.0 for 200% boost)
    if (volumeLevel < 0 || volumeLevel > 2.0) {
      return errorRes(res, 'Invalid volume: must be between 0% and 200%');
    }
    
    // Validate pitch range (typically -24 to +24 semitones)
    if (pitchSemitones < -24 || pitchSemitones > 24) {
      return errorRes(res, 'Invalid pitch: must be between -24 and +24 semitones');
    }
  }
  
  // 🎚️ Validate equalizer parameters
  let validatedEqualizer = null;
  if (equalizer) {
    if (!Array.isArray(equalizer) || equalizer.length !== 10) {
      return errorRes(res, 'Invalid equalizer: must be an array of 10 values');
    }
    
    // Validate each EQ band value (-20dB to +20dB)
    for (let i = 0; i < equalizer.length; i++) {
      const value = parseFloat(equalizer[i]);
      if (isNaN(value) || value < -20 || value > 20) {
        return errorRes(res, `Invalid equalizer band ${i}: must be between -20dB and +20dB`);
      }
    }
    
    validatedEqualizer = equalizer.map(v => parseFloat(v));
    console.log('🎚️ Validated equalizer:', validatedEqualizer);
  }
  
  req.cutParams = { 
    // Legacy parameters for backward compatibility
    startTime: start, 
    endTime: end, 
    fadeIn: parseParam(fadeIn), 
    fadeOut: parseParam(fadeOut), 
    playbackRate: rate,
    pitch: pitchSemitones,
    volume: volumeLevel,
    equalizer: validatedEqualizer,
    // 🆕 New region support
    regions: validatedRegions,
    mainSelection: validatedMainSelection,
    // Other parameters
    outputFormat: req.body.outputFormat || 'mp3',
    quality: req.body.quality || 'medium',
    isInverted: Boolean(req.body.isInverted),
    normalizeVolume: Boolean(req.body.normalizeVolume),
    sessionId: req.body.sessionId
  };
  
  next();
};

// ...Các validate khác giữ nguyên logic, gom helper dùng chung
