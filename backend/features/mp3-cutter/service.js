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
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại với absolute path
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    
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

  /**
   * 🆕 **CUT AUDIO BY FILE ID**: Cut audio file bằng fileId đã upload trước đó
   */
  static async cutAudioByFileId(fileId, cutParams, sessionId = null) {
    const { 
      startTime, 
      endTime, 
      fadeIn, 
      fadeOut, 
      playbackRate = 1,
      outputFormat = 'mp3', // 🆕 **OUTPUT FORMAT**: Lấy format từ cutParams
      quality = 'high', // 🆕 **QUALITY**: Lấy quality từ cutParams
      isInverted = false // 🆕 **INVERT MODE**: Add invert mode parameter
    } = cutParams;
    
    // 🔍 **FIND INPUT FILE**: Tìm file đã upload theo fileId với absolute path
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Kiểm tra file có tồn tại
      await fs.access(inputPath);
    } catch (error) {
      console.error('❌ [cutAudioByFileId] Input file not found:', {
        fileId,
        inputPath,
        error: error.message
      });
      throw new Error(`File not found: ${fileId}. Please upload the file again.`);
    }
    
    // 🔍 **GET FILE STATS**: Lấy thông tin file để tính duration estimate
    const inputStats = await fs.stat(inputPath);
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Tạo filename cho file output với speed indicator VÀ FORMAT
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name; // Lấy tên gốc không có extension
    const speedSuffix = playbackRate !== 1 ? `_${playbackRate}x` : ''; // 🆕 **SPEED SUFFIX**
    const outputFilename = `cut_${originalName}${speedSuffix}_${timestamp}_${random}.${outputFormat}`; // 🚨 **KEY FIX**: Sử dụng outputFormat
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);

    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại với absolute path
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    
    // 🚀 **CUT AUDIO WITH SPEED, FORMAT & WEBSOCKET**: Thực hiện cut audio với FFmpeg, speed change, format conversion và WebSocket progress
    const cutResult = await MP3Utils.cutAudio(inputPath, outputPath, {
      startTime, 
      endTime, 
      fadeIn, 
      fadeOut, 
      playbackRate, // 🆕 **PASS SPEED**: Truyền playback rate to FFmpeg
      format: outputFormat, // 🚨 **KEY FIX**: Truyền format đúng thay vì cứng định 'mp3'
      quality, // 🚨 **KEY FIX**: Truyền quality đúng
      isInverted, // 🆕 **INVERT MODE**: Pass invert mode to FFmpeg
      sessionId // 🆕 **PASS SESSION ID**: Truyền sessionId cho WebSocket progress
    });

    
    // 🔍 **VERIFY OUTPUT FILE**: Kiểm tra file output đã được tạo
    try {
      await fs.access(outputPath);
    } catch (error) {
      console.error('❌ [cutAudioByFileId] Output file not created:', {
        outputPath,
        error: error.message
      });
      throw new Error(`Cut operation failed: Output file not created`);
    }
    
    // 🔍 **GET OUTPUT STATS**: Lấy thông tin file output
    const outputStats = await fs.stat(outputPath);
    
    // 🧹 **AUTO CLEANUP**: Tự động xóa file sau 24 giờ
    setTimeout(() => {
      fs.unlink(outputPath).catch(() => {
      });
    }, 24 * 60 * 60 * 1000);
    
    // 🎯 **RETURN STANDARDIZED RESULT**: Trả về kết quả với format chuẩn
    return {
      input: {
        filename: fileId,
        originalName: originalName,
        path: inputPath,
        size: inputStats.size
      },
      output: {
        filename: outputFilename, // 🎯 **KEY FIX**: Đảm bảo trả về đúng tên field với extension format đúng
        path: outputPath,
        duration: endTime - startTime,
        size: outputStats.size,
        format: outputFormat, // 🆕 **INCLUDE FORMAT**: Include format in response
        quality // 🆕 **INCLUDE QUALITY**: Include quality in response
      },
      processing: { 
        startTime, 
        endTime, 
        fadeIn, 
        fadeOut,
        playbackRate, // 🆕 **INCLUDE SPEED**: Include playback rate in response
        outputFormat, // 🆕 **INCLUDE FORMAT**: Include format in processing info
        quality, // 🆕 **INCLUDE QUALITY**: Include quality in processing info
        actualDuration: cutResult.settings?.duration || (endTime - startTime),
        speedApplied: playbackRate !== 1 ? `${playbackRate}x` : 'normal', // 🔧 **DEBUG**: Confirm speed applied
        formatApplied: `${outputFormat.toUpperCase()}` // 🆕 **FORMAT DEBUG**: Confirm format applied
      },
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 🆕 **CHANGE AUDIO SPEED BY FILE ID**: Chỉ thay đổi tốc độ audio, không cắt đoạn
   */
  static async changeAudioSpeedByFileId(fileId, speedParams) {
    const { playbackRate = 1, outputFormat = 'mp3', quality = 'medium' } = speedParams;
    
    
    // 🔍 **FIND INPUT FILE**: Tìm file đã upload theo fileId với absolute path
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Kiểm tra file có tồn tại
      await fs.access(inputPath);
    } catch (error) {
      console.error('❌ [changeAudioSpeedByFileId] Input file not found:', {
        fileId,
        inputPath,
        error: error.message
      });
      throw new Error(`File not found: ${fileId}. Please upload the file again.`);
    }
    
    // 🔍 **GET FILE STATS**: Lấy thông tin file
    const inputStats = await fs.stat(inputPath);
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Tạo filename cho file output với speed
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name;
    const speedSuffix = `_${playbackRate}x`;
    const outputFilename = `speed_${originalName}${speedSuffix}_${timestamp}_${random}.${outputFormat}`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);

    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    

    
    // 🚀 **CHANGE SPEED**: Thực hiện thay đổi tốc độ với FFmpeg
    const speedResult = await MP3Utils.changeAudioSpeed(inputPath, outputPath, {
      playbackRate,
      format: outputFormat,
      quality
    });
    
    // 🔍 **VERIFY OUTPUT FILE**: Kiểm tra file output đã được tạo
    try {
      await fs.access(outputPath);
    } catch (error) {
      console.error('❌ [changeAudioSpeedByFileId] Output file not created:', {
        outputPath,
        error: error.message
      });
      throw new Error(`Speed change failed: Output file not created`);
    }
    
    // 🔍 **GET OUTPUT STATS**: Lấy thông tin file output
    const outputStats = await fs.stat(outputPath);
    
    // 🧹 **AUTO CLEANUP**: Tự động xóa file sau 24 giờ
    setTimeout(() => {
      fs.unlink(outputPath).catch(() => {
      });
    }, 24 * 60 * 60 * 1000);
    
    // 🎯 **RETURN STANDARDIZED RESULT**: Trả về kết quả với format chuẩn
    return {
      input: {
        filename: fileId,
        originalName: originalName,
        path: inputPath,
        size: inputStats.size
      },
      output: {
        filename: outputFilename,
        path: outputPath,
        size: outputStats.size
      },
      processing: { 
        playbackRate,
        outputFormat,
        quality
      },
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

  /**
   * 🔍 **GET FILE FOR DOWNLOAD**: Get file for download by filename
   */
  static async getFileForDownload(filename) {
    // 🔍 **SEARCH IN PROCESSED FOLDER FIRST**: Most downloads are processed files
    const processedPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename);
    
    try {
      await fs.access(processedPath);
      const stats = await fs.stat(processedPath);
      
      return {
        filename,
        path: processedPath,
        size: stats.size,
        mimeType: MP3Utils.getMimeType(filename)
      };
    } catch (error) {
      // File not in processed folder, try uploads folder
    }
    
    // 🔍 **FALLBACK TO UPLOADS FOLDER**: Check uploads folder
    const uploadsPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename);
    
    try {
      await fs.access(uploadsPath);
      const stats = await fs.stat(uploadsPath);
      
      return {
        filename,
        path: uploadsPath,
        size: stats.size,
        mimeType: MP3Utils.getMimeType(filename)
      };
    } catch (error) {
      throw new Error(`File not found: ${filename}`);
    }
  }

  /**
   * 🔍 **DEBUG FILES**: Debug file system (development only)
   */
  static async debugFiles() {
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

    return result;
  }
}