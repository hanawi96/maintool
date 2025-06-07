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
      console.log('✂️ [cutByFileId] Starting cut by fileId:', {
        fileId: req.fileId,
        cutParams: req.cutParams
      });

      const result = await MP3Service.cutAudioByFileId(req.fileId, req.cutParams);

      console.log('✅ [cutByFileId] Cut successful:', {
        outputFilename: result.output.filename,
        duration: result.output.duration
      });

      res.json({
        success: true,
        message: 'Audio cut successfully',
        data: result,
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
}