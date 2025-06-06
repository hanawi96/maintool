// features/mp3-cutter/controller.js (Simplified)

import { MP3Service } from './service.js';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

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

      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Filename is required'
        });
      }

      const fileData = await MP3Service.getFileForDownload(filename);

      // Set download headers
      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Length', fileData.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);

      // Send file
      res.sendFile(fileData.path);

    } catch (error) {
      console.error('Download error:', error);
      res.status(404).json({
        success: false,
        error: 'File not found',
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
}