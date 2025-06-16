// features/mp3-cutter/service.js

import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

function scheduleCleanup(filePath, ttl) {
  setTimeout(() => fs.unlink(filePath).catch(() => {}), ttl);
}
function buildDownloadUrl(filename) {
  return `/api/mp3-cutter/download/${filename}`;
}

export class MP3Service {
  static async processUpload(file, audioInfo) {
    scheduleCleanup(file.path, MP3_CONFIG.CLEANUP.UPLOAD_FILE_TTL);
    return {
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      },
      audio: { ...audioInfo },
      urls: {
        download: buildDownloadUrl(file.filename),
        cut: '/api/mp3-cutter/cut'
      },
      uploadedAt: new Date().toISOString()
    };
  }
  
  static async cutAudio(file, audioInfo, cutParams) {
    const outputFilename = MP3Utils.generateOutputFilename(file.filename, 'cut', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);
    await MP3Utils.cutAudio(file.path, outputPath, { ...cutParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);
    return {
      input: { filename: file.filename, originalName: file.originalname, duration: audioInfo.duration },
      output: { filename: outputFilename, duration: cutParams.endTime - cutParams.startTime, size: outputStats.size },
      processing: cutParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }
  
  static async cutAudioByFileId(fileId, cutParams) {
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    const audioInfo = await MP3Utils.getAudioInfo(inputPath);
    const outputFilename = MP3Utils.generateOutputFilename(fileId, 'cut', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);
    await MP3Utils.cutAudio(inputPath, outputPath, { ...cutParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);
    return {
      input: { fileId, duration: audioInfo.duration },
      output: { filename: outputFilename, duration: cutParams.endTime - cutParams.startTime, size: outputStats.size },
      processing: cutParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }
  
  static async changeSpeedByFileId(fileId, speedParams) {
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    const audioInfo = await MP3Utils.getAudioInfo(inputPath);
    const outputFilename = MP3Utils.generateOutputFilename(fileId, 'speed', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);
    await MP3Utils.changeSpeed(inputPath, outputPath, { ...speedParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);
    return {
      input: { fileId, duration: audioInfo.duration },
      output: { filename: outputFilename, duration: audioInfo.duration / speedParams.playbackRate, size: outputStats.size },
      processing: speedParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }
  
  static async generateWaveform(file, audioInfo, waveformParams) {
    const waveformData = await MP3Utils.generateWaveform(file.path, waveformParams.samples);
    return {
      file: { filename: file.filename, originalName: file.originalname },
      audio: { ...audioInfo },
      waveform: waveformData,
      parameters: waveformParams,
      generatedAt: new Date().toISOString()
    };
  }
  
  static async downloadFile(filename, res) {
    const filePath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename);
    const uploadPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename);
    
    let targetPath;
    try {
      await fs.access(filePath);
      targetPath = filePath;
    } catch {
      try {
        await fs.access(uploadPath);
        targetPath = uploadPath;
      } catch {
        throw new Error('File not found');
      }
    }
    
    res.download(targetPath, filename);
  }
  
  static async getHealthStatus() {
    return {
      status: 'healthy',
      service: 'MP3 Cutter',
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  static async getSupportedFormats() {
    return {
      input: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
      output: ['mp3', 'wav'],
      maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
      maxDuration: MP3_CONFIG.MAX_DURATION,
      supportedOperations: ['cut', 'fade', 'speed', 'waveform']
    };
  }
  
  static async getStats() {
    return {
      service: 'MP3 Cutter',
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
        maxDuration: MP3_CONFIG.MAX_DURATION
      },
      timestamp: new Date().toISOString()
    };
  }
  
  static async debugFiles() {
    const uploadFiles = await fs.readdir(MP3_CONFIG.PATHS.UPLOADS).catch(() => []);
    const processedFiles = await fs.readdir(MP3_CONFIG.PATHS.PROCESSED).catch(() => []);
    
    return {
      uploads: uploadFiles,
      processed: processedFiles,
      paths: MP3_CONFIG.PATHS,
      timestamp: new Date().toISOString()
    };
  }
}
