// features/mp3-cutter/service.js (Self-contained)
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

export class MP3Service {
  
  static async processUpload(file, audioInfo) {
    // Auto cleanup after 2 hours
    setTimeout(() => fs.unlink(file.path).catch(() => {}), 2 * 60 * 60 * 1000);
    
    return {
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      },
      audio: {
        duration: audioInfo.duration,
        format: audioInfo.format,
        codec: audioInfo.codec,
        bitrate: audioInfo.bitrate,
        channels: audioInfo.channels
      },
      urls: {
        download: `/api/mp3-cutter/download/${file.filename}`,
        cut: `/api/mp3-cutter/cut`
      },
      uploadedAt: new Date().toISOString()
    };
  }

  static async cutAudio(file, audioInfo, cutParams) {
    const { startTime, endTime, fadeIn, fadeOut } = cutParams;
    
    // Generate output filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const outputFilename = `cut_${timestamp}_${random}.mp3`;
    const outputPath = path.join(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    // Ensure output directory exists
    await fs.mkdir(MP3_CONFIG.PATHS.PROCESSED, { recursive: true });
    
    // Cut the audio
    await MP3Utils.cutAudio(file.path, outputPath, {
      startTime, endTime, fadeIn, fadeOut, format: 'mp3', quality: 'medium'
    });
    
    // Get output file stats
    const outputStats = await fs.stat(outputPath);
    
    // Auto cleanup after 24 hours
    setTimeout(() => fs.unlink(outputPath).catch(() => {}), 24 * 60 * 60 * 1000);
    
    return {
      input: {
        filename: file.filename,
        originalName: file.originalname,
        duration: audioInfo.duration
      },
      output: {
        filename: outputFilename,
        duration: endTime - startTime,
        size: outputStats.size
      },
      processing: { startTime, endTime, fadeIn, fadeOut },
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };
  }

  static async generateWaveform(file, audioInfo, waveformParams) {
    const { samples } = waveformParams;
    const waveformResult = await MP3Utils.generateWaveform(file.path, samples);
    
    return {
      file: {
        filename: file.filename,
        originalName: file.originalname,
        duration: audioInfo.duration
      },
      waveform: {
        data: waveformResult.waveform,
        samples: waveformResult.samples,
        duration: audioInfo.duration
      },
      generatedAt: new Date().toISOString()
    };
  }

  static async getFileForDownload(filename) {
    // Try processed files first
    let filePath = path.join(MP3_CONFIG.PATHS.PROCESSED, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      // Try uploads folder
      filePath = path.join(MP3_CONFIG.PATHS.UPLOADS, filename);
      await fs.access(filePath);
    }
    
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg'
    };
    
    return {
      path: filePath,
      size: stats.size,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      filename: filename
    };
  }
}