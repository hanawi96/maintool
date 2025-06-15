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
  // ...Các method khác cũng dùng helper chung như trên, không lặp code
}
