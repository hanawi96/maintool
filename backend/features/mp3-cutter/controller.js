// features/mp3-cutter/controller.js (Simplified)

import { MP3Service } from './service.js';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';
import path from 'path';
import fs from 'fs/promises';

export class MP3Controller {
  
  /**
   * Upload audio file and get file information
   */
  static async upload(req, res) {
    try {
      const result = await MP3Service.processUpload(req.file, req.audioInfo);

      res.json({
        success: true,
        message: 'Audio file uploaded successfully',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cut audio file with specified parameters
   */
  static async cut(req, res) {
    try {
      const result = await MP3Service.cutAudio(req.file, req.audioInfo, req.cutParams);

      res.json({
        success: true,
        message: 'Audio cut successfully',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cut error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🆕 **CUT BY FILE ID**: Cut audio file bằng fileId (không cần upload lại)
   */
  static async cutByFileId(req, res) {
    try {
      // 🆕 **EXTRACT SESSION ID**: Get sessionId from request for WebSocket progress
      const sessionId = req.body?.sessionId || req.query?.sessionId || null;
      
      console.log('✂️ [cutByFileId] Starting cut by fileId:', {
        fileId: req.fileId,
        cutParams: req.cutParams,
        sessionId // 🆕 **LOG SESSION ID**
      });

      const result = await MP3Service.cutAudioByFileId(req.fileId, req.cutParams, sessionId);

      console.log('✅ [cutByFileId] Cut successful:', {
        outputFilename: result.output.filename,
        duration: result.output.duration,
        sessionId
      });

      res.json({
        success: true,
        message: 'Audio cut successfully',
        data: result,
        sessionId, // 🆕 **RETURN SESSION ID**: Include sessionId in response
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [cutByFileId] Cut failed:', error);
      
      // 🎯 **DETAILED ERROR RESPONSE**: Provide more specific error info
      let statusCode = 500;
      let errorMessage = error.message;
      
      if (error.message.includes('File not found') || error.message.includes('ENOENT')) {
        statusCode = 404;
        errorMessage = 'Original audio file not found. Please upload the file again.';
      } else if (error.message.includes('Invalid time range')) {
        statusCode = 400;
        errorMessage = 'Invalid time range for cutting audio.';
      } else if (error.message.includes('FFmpeg')) {
        statusCode = 500;
        errorMessage = 'Audio processing failed. Please try again with a different file.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🆕 **CHANGE SPEED BY FILE ID**: Thay đổi tốc độ audio file bằng fileId
   */
  static async changeSpeedByFileId(req, res) {
    try {
      console.log('⚡ [changeSpeedByFileId] Starting speed change by fileId:', {
        fileId: req.fileId,
        speedParams: req.speedParams
      });

      const result = await MP3Service.changeAudioSpeedByFileId(req.fileId, req.speedParams);

      console.log('✅ [changeSpeedByFileId] Speed change successful:', {
        outputFilename: result.output.filename,
        playbackRate: result.processing.playbackRate
      });

      res.json({
        success: true,
        message: 'Audio speed changed successfully',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [changeSpeedByFileId] Speed change failed:', error);
      
      // 🎯 **DETAILED ERROR RESPONSE**: Provide more specific error info
      let statusCode = 500;
      let errorMessage = error.message;
      
      if (error.message.includes('File not found') || error.message.includes('ENOENT')) {
        statusCode = 404;
        errorMessage = 'Original audio file not found. Please upload the file again.';
      } else if (error.message.includes('Invalid playback rate')) {
        statusCode = 400;
        errorMessage = 'Invalid playback rate. Please use values between 0.25x and 4x.';
      } else if (error.message.includes('FFmpeg') || error.message.includes('Speed change failed')) {
        statusCode = 500;
        errorMessage = 'Audio speed change failed. Please try again with a different file.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate waveform data for audio file
   */
  static async waveform(req, res) {
    try {
      const result = await MP3Service.generateWaveform(req.file, req.audioInfo, req.waveformParams);

      res.json({
        success: true,
        message: 'Waveform generated successfully',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Waveform error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Download processed or uploaded file
   */
  static async download(req, res) {
    try {
      const { filename } = req.params;

      console.log('📥 [download] Download request for:', filename);

      if (!filename) {
        console.error('❌ [download] No filename provided');
        return res.status(400).json({
          success: false,
          error: 'Filename is required'
        });
      }

      // 🔍 **VALIDATE FILENAME**: Basic security check
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        console.error('❌ [download] Invalid filename (security):', filename);
        return res.status(400).json({
          success: false,
          error: 'Invalid filename'
        });
      }

      const fileData = await MP3Service.getFileForDownload(filename);

      console.log('📁 [download] File found, preparing download:', {
        filename: fileData.filename,
        size: fileData.size,
        mimeType: fileData.mimeType,
        path: fileData.path
      });

      // 🎯 **SET DOWNLOAD HEADERS**: Enhanced headers cho better download experience
      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Length', fileData.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');

      // 🚀 **SEND FILE**: Use absolute path với error handling
      res.sendFile(fileData.path, (err) => {
        if (err) {
          console.error('❌ [download] SendFile error:', {
            filename: fileData.filename,
            path: fileData.path,
            error: err.message
          });
          
          // 🔧 **ONLY SEND RESPONSE IF NOT ALREADY SENT**: Prevent "Cannot set headers" error
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Failed to send file',
              details: err.message,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log('✅ [download] File sent successfully:', fileData.filename);
        }
      });

    } catch (error) {
      console.error('❌ [download] Download failed:', {
        filename: req.params.filename,
        error: error.message,
        stack: error.stack
      });
      
      // 🎯 **ENHANCED ERROR RESPONSE**: More specific error messages
      let statusCode = 500;
      let errorMessage = 'Download failed';
      
      if (error.message.includes('File not found')) {
        statusCode = 404;
        errorMessage = 'File not found or expired';
      } else if (error.message.includes('ENOENT')) {
        statusCode = 404;
        errorMessage = 'File no longer exists';
      } else if (error.message.includes('EACCES')) {
        statusCode = 403;
        errorMessage = 'File access denied';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        filename: req.params.filename,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check for MP3 cutter service
   */
  static async healthCheck(req, res) {
    try {
      // Test FFmpeg availability
      await MP3Utils.testFFmpeg();

      res.json({
        success: true,
        status: 'healthy',
        service: 'mp3-cutter',
        version: '2.0.0',
        ffmpeg: {
          available: true
        },
        storage: {
          uploadsPath: MP3_CONFIG.PATHS.UPLOADS,
          processedPath: MP3_CONFIG.PATHS.PROCESSED
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'mp3-cutter',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get supported formats and quality settings
   */
  static async getSupportedFormats(req, res) {
    try {
      const result = {
        inputFormats: MP3_CONFIG.SUPPORTED_INPUT_FORMATS,
        outputFormats: MP3_CONFIG.SUPPORTED_OUTPUT_FORMATS,
        qualityPresets: Object.keys(MP3_CONFIG.QUALITY_PRESETS),
        limits: {
          maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
          maxDuration: MP3_CONFIG.MAX_DURATION,
          maxFadeDuration: MP3_CONFIG.MAX_FADE_DURATION,
          minSegmentDuration: MP3_CONFIG.MIN_SEGMENT_DURATION
        },
        waveform: {
          defaultSamples: MP3_CONFIG.WAVEFORM.DEFAULT_SAMPLES,
          maxSamples: MP3_CONFIG.WAVEFORM.MAX_SAMPLES
        }
      };

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Formats error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get service statistics
   */
  static async getStats(req, res) {
    try {
      // Simple stats without complex file scanning
      const stats = {
        service: 'mp3-cutter',
        version: '2.0.0',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().used / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().total / 1024 / 1024) + 'MB'
        },
        limits: {
          maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
          maxDuration: MP3_CONFIG.MAX_DURATION
        },
        paths: {
          uploads: MP3_CONFIG.PATHS.UPLOADS,
          processed: MP3_CONFIG.PATHS.PROCESSED,
          temp: MP3_CONFIG.PATHS.TEMP
        }
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🆕 **DEBUG ENDPOINT**: Debug file system cho development
   */
  static async debugFiles(req, res) {
    try {
      console.log('🔍 [debugFiles] Debug request received');
      
      const result = {
        paths: {
          uploads: {
            relative: MP3_CONFIG.PATHS.UPLOADS,
            absolute: path.resolve(MP3_CONFIG.PATHS.UPLOADS)
          },
          processed: {
            relative: MP3_CONFIG.PATHS.PROCESSED,
            absolute: path.resolve(MP3_CONFIG.PATHS.PROCESSED)
          }
        },
        files: {}
      };

      // 🔍 **CHECK UPLOADS FOLDER**
      try {
        const uploadsPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS);
        const uploadFiles = await fs.readdir(uploadsPath);
        result.files.uploads = uploadFiles.map(file => ({
          name: file,
          fullPath: path.join(uploadsPath, file)
        }));
      } catch (error) {
        result.files.uploads = { error: error.message };
      }

      // 🔍 **CHECK PROCESSED FOLDER**
      try {
        const processedPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
        const processedFiles = await fs.readdir(processedPath);
        result.files.processed = processedFiles.map(file => ({
          name: file,
          fullPath: path.join(processedPath, file)
        }));
      } catch (error) {
        result.files.processed = { error: error.message };
      }

      console.log('✅ [debugFiles] Debug info collected:', result);

      res.json({
        success: true,
        debug: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [debugFiles] Debug failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔇 **DETECT SILENCE**: Detect and remove silent parts from audio file
   */
  static async detectSilence(req, res) {    try {
      console.log('🔇 [detectSilence] Starting silence detection:', {
        fileId: req.fileId,
        silenceParams: req.silenceParams
      });

      const result = await MP3Service.detectSilenceByFileId(req.fileId, req.silenceParams);

      console.log('✅ [detectSilence] Silence detection successful:', {
        silentSegments: result.data?.silentSegments?.length || 0
      });

      res.json({
        success: true,
        message: 'Silence detection completed',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [detectSilence] Silence detection failed:', error);
      
      // 🎯 **DETAILED ERROR RESPONSE**: Provide specific error info
      let statusCode = 500;
      let errorMessage = error.message;
      
      if (error.message.includes('File not found') || error.message.includes('ENOENT')) {
        statusCode = 404;
        errorMessage = 'Audio file not found. Please upload the file again.';
      } else if (error.message.includes('Invalid threshold') || error.message.includes('Invalid minDuration')) {
        statusCode = 400;
        errorMessage = 'Invalid silence detection parameters.';
      } else if (error.message.includes('FFmpeg') || error.message.includes('Silence detection failed')) {
        statusCode = 500;
        errorMessage = 'Silence detection failed. Please try again with different parameters.';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🎯 **REGION-BASED SILENCE DETECTION**: Detect and remove silence only within selected region
   * POST /api/mp3-cutter/detect-silence-region/:fileId
   */
  static async detectSilenceInRegion(req, res) {
    try {
      console.log('🎯 [RegionSilence] Starting region-based silence detection:', {
        fileId: req.params.fileId,
        body: req.body
      });

      // 🔍 **EXTRACT PARAMETERS**: Get region-based silence parameters
      const {
        threshold = -40,
        minDuration = 0.5,
        startTime = 0,
        endTime = null,
        duration
      } = req.body;

      // 🔍 **VALIDATE PARAMETERS**: Validate region-based parameters
      if (typeof threshold !== 'number' || threshold < -60 || threshold > -10) {
        return res.status(400).json({
          success: false,
          error: 'Threshold must be a number between -60 and -10 dB',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof minDuration !== 'number' || minDuration < 0.1 || minDuration > 10) {
        return res.status(400).json({
          success: false,
          error: 'Minimum duration must be a number between 0.1 and 10 seconds',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof startTime !== 'number' || startTime < 0) {
        return res.status(400).json({
          success: false,
          error: 'Start time must be a non-negative number',
          timestamp: new Date().toISOString()
        });
      }

      if (endTime !== null && (typeof endTime !== 'number' || endTime <= startTime)) {
        return res.status(400).json({
          success: false,
          error: 'End time must be greater than start time',
          timestamp: new Date().toISOString()
        });
      }      // 🔍 **VALIDATE REGION**: Ensure region is within file duration
      console.log('🎯 [RegionSilence] Validation check:', { 
        startTime, 
        endTime, 
        duration,
        startTimeType: typeof startTime,
        endTimeType: typeof endTime,
        durationType: typeof duration,
        endTimeValid: endTime !== null ? (endTime <= duration) : 'null',
        startTimeValid: startTime < duration
      });
      
      if (duration && startTime >= duration) {
        console.log('❌ [RegionSilence] Start time validation failed:', { startTime, duration, comparison: startTime >= duration });
        return res.status(400).json({
          success: false,
          error: 'Start time cannot be greater than or equal to file duration',
          timestamp: new Date().toISOString()
        });
      }

      if (duration && endTime && endTime > duration) {
        console.log('❌ [RegionSilence] End time validation failed:', { 
          endTime, 
          duration, 
          comparison: endTime > duration,
          difference: endTime - duration 
        });
        return res.status(400).json({
          success: false,
          error: 'End time cannot be greater than file duration',
          timestamp: new Date().toISOString()
        });
      }

      // 🎯 **PROCESS REGION-BASED SILENCE**: Use new region-based service method
      const result = await MP3Service.detectSilenceInRegionByFileId(req.params.fileId, {
        threshold,
        minDuration,
        startTime,
        endTime,
        duration
      });

      console.log('✅ [RegionSilence] Region-based detection successful:', {
        outputFilename: result.output.filename,
        regionsFound: result.count,
        totalSilence: result.totalSilence,
        regionStart: result.regionStart,
        regionEnd: result.regionEnd
      });

      res.json({
        success: true,
        message: `Region-based silence detection completed! Found ${result.count} silence regions (${result.totalSilence.toFixed(3)}s total) in specified region`,
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [RegionSilence] Region-based detection failed:', error);
      
      // 🎯 **DETAILED ERROR RESPONSE**: Provide more specific error info
      let statusCode = 500;
      let errorMessage = error.message;
      
      if (error.message.includes('File not found') || error.message.includes('ENOENT')) {
        statusCode = 404;
        errorMessage = 'Original audio file not found. Please upload the file again.';
      } else if (error.message.includes('Invalid threshold') || error.message.includes('Invalid duration')) {
        statusCode = 400;
        errorMessage = 'Invalid region-based silence detection parameters.';
      } else if (error.message.includes('FFmpeg')) {
        statusCode = 500;
        errorMessage = 'Region-based audio processing failed. Please try again.';
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        originalError: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}