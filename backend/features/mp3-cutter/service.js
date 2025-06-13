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

  static async getFileForDownload(filename) {
    
    // 🔍 **TRY PROCESSED FILES FIRST**: Check processed folder với absolute path
    let filePath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename);
    
    try {
      await fs.access(filePath);
    } catch {
      // 🔍 **TRY UPLOADS FOLDER**: Check uploads folder với absolute path
      filePath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        console.error('❌ [getFileForDownload] File not found in both locations:', {
          processedPath: path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename),
          uploadsPath: path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename),
          filename,
          error: error.message
        });
        throw new Error(`File not found: ${filename}`);
      }
    }
    
    // 🔍 **GET FILE STATS**: Lấy thông tin file
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4'
    };
    
    const result = {
      path: filePath, // 🎯 **ABSOLUTE PATH**: Đảm bảo absolute path cho sendFile
      size: stats.size,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      filename: filename
    };
    
    return result;
  }

  /**
   * 🔇 **DETECT SILENCE BY FILE ID**: Detect silent parts in audio file
   */
  static async detectSilenceByFileId(fileId, silenceParams) {
    const { threshold = -40, minDuration = 0.5, duration } = silenceParams;
    
    
    // 🔍 **FIND INPUT FILE**: Find uploaded file by fileId
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Verify file exists
      await fs.access(inputPath);
    } catch (error) {
      console.error('❌ [detectSilenceByFileId] Input file not found:', {
        fileId,
        inputPath,
        error: error.message
      });
      throw new Error(`File not found: ${fileId}. Please upload the file again.`);
    }
    
    // 🔍 **GET FILE STATS**: Get file information
    const inputStats = await fs.stat(inputPath);
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Create filename for processed file
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name;
    const outputFilename = `silence_removed_${originalName}_${timestamp}_${random}.mp3`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    // 🔧 **ENSURE OUTPUT DIR**: Ensure output directory exists
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
 
    
    // 🚀 **DETECT AND REMOVE SILENCE**: Use FFmpeg to detect and remove silent parts
    const silenceResult = await MP3Utils.detectAndRemoveSilence(inputPath, outputPath, {
      threshold,
      minDuration,
      format: 'mp3',
      quality: 'high'
    });
    
    // 🔍 **VERIFY OUTPUT FILE**: Check if output file was created
    try {
      await fs.access(outputPath);
    } catch (error) {
      console.error('❌ [detectSilenceByFileId] Output file not created:', {
        outputPath,
        error: error.message
      });
      throw new Error(`Silence detection failed: Output file not created`);
    }
    
    // 🔍 **GET OUTPUT STATS**: Get output file information
    const outputStats = await fs.stat(outputPath);
    
    // 🧹 **AUTO CLEANUP**: Auto cleanup after 24 hours
    setTimeout(() => {
      fs.unlink(outputPath).catch(() => {
      });
    }, 24 * 60 * 60 * 1000);
    
    // 🧮 **CALCULATE SILENCE STATS**: Calculate total silence duration and count
    const silentSegments = silenceResult.silentSegments || [];
    const totalSilence = silentSegments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
    const count = silentSegments.length;

    // 🎯 **RETURN STANDARDIZED RESULT**: Return result with standard format matching frontend expectations
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
      },      processing: { 
        threshold,
        minDuration,
        duration
      },
      // 🎯 **FRONTEND COMPATIBLE FORMAT**: Add fields expected by frontend
      silenceRegions: silentSegments,
      count: count,
      totalSilence: totalSilence,
      verification: silenceResult.verification || null, // Include verification results
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 🔇 **DETECT SILENCE WITH PROGRESS**: Enhanced silence detection with WebSocket progress updates
   */
  static async detectSilenceWithProgress(fileId, silenceParams, silenceSocket = null, jobId = null) {
    const { threshold = -40, minDuration = 0.5, duration } = silenceParams;
    
    // Emit initial progress
    if (silenceSocket && jobId) {
      silenceSocket.emitProgress(jobId, {
        progress: 5,
        stage: 'validation',
        message: 'Validating input file...'
      });
    }
    
    // 🔍 **FIND INPUT FILE**: Find uploaded file by fileId
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Verify file exists
      await fs.access(inputPath);
      
      if (silenceSocket && jobId) {
        silenceSocket.emitProgress(jobId, {
          progress: 10,
          stage: 'preparation',
          message: 'Preparing output file...'
        });
      }
    } catch (error) {
      if (silenceSocket && jobId) {
        silenceSocket.emitError(jobId, error, 'validation');
      }
      console.error('❌ [detectSilenceWithProgress] Input file not found:', {
        fileId,
        inputPath,
        error: error.message
      });
      throw new Error(`File not found: ${fileId}. Please upload the file again.`);
    }
    
    // 🔍 **GET FILE STATS**: Get file information
    const inputStats = await fs.stat(inputPath);
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Create filename for processed file
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name;
    const outputFilename = `silence_removed_${originalName}_${timestamp}_${random}.mp3`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    // 🔧 **ENSURE OUTPUT DIR**: Ensure output directory exists
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    
    if (silenceSocket && jobId) {
      silenceSocket.emitProgress(jobId, {
        progress: 20,
        stage: 'processing',
        message: 'Starting silence detection and removal...'
      });
    }
    
    // 🚀 **DETECT AND REMOVE SILENCE**: Use enhanced FFmpeg processing with progress
    const silenceResult = await MP3Utils.detectAndRemoveSilenceWithProgress(inputPath, outputPath, {
      threshold,
      minDuration,
      format: 'mp3',
      quality: 'high'
    }, (progressData) => {
      // Forward FFmpeg progress to WebSocket
      if (silenceSocket && jobId) {
        const scaledProgress = 20 + (progressData.progress * 0.7); // Scale to 20-90%
        silenceSocket.emitProgress(jobId, {
          progress: Math.min(90, scaledProgress),
          stage: 'processing',
          message: progressData.message || `Processing audio... ${Math.round(scaledProgress)}%`,
          timeRemaining: progressData.timeRemaining
        });
      }
    });
    
    // Check for cancellation
    if (silenceSocket && jobId && silenceSocket.isJobCancelled(jobId)) {
      // Clean up output file if it exists
      try {
        await fs.unlink(outputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw new Error('Processing cancelled by user');
    }
    
    // 🔍 **VERIFY OUTPUT FILE**: Kiểm tra file output đã được tạo
    try {
      await fs.access(outputPath);
      
      if (silenceSocket && jobId) {
        silenceSocket.emitProgress(jobId, {
          progress: 95,
          stage: 'finalizing',
          message: 'Finalizing results...'
        });
      }
    } catch (error) {
      if (silenceSocket && jobId) {
        silenceSocket.emitError(jobId, error, 'output_verification');
      }
      console.error('❌ [detectSilenceWithProgress] Output file not created:', {
        outputPath,
        error: error.message
      });
      throw new Error(`Silence detection failed: Output file not created`);
    }
    
    // 🔍 **GET OUTPUT STATS**: Lấy thông tin file output
    const outputStats = await fs.stat(outputPath);
    
    // 🧹 **AUTO CLEANUP**: Auto cleanup after 24 hours
    setTimeout(() => {
      fs.unlink(outputPath).catch(() => {
        // Ignore cleanup errors
      });
    }, 24 * 60 * 60 * 1000);

    // 🧮 **CALCULATE SILENCE STATS**: Calculate total silence duration and count
    const silentSegments = silenceResult.silentSegments || [];
    const totalSilence = silentSegments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
    const count = silentSegments.length;

    const result = {
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
      },      processing: { 
        threshold,
        minDuration,
        duration
      },
      // 🎯 **FRONTEND COMPATIBLE FORMAT**: Add fields expected by frontend
      silenceRegions: silentSegments,
      count: count,
      totalSilence: totalSilence,
      verification: silenceResult.verification || null, // Include verification results
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };

    // 🎯 **EMIT COMPLETION**: Send final result via WebSocket
    if (silenceSocket && jobId) {
      silenceSocket.emitComplete(jobId, result);
    }

    return result;
  }

  /**
   * 🎯 **REGION-BASED SILENCE DETECTION**: Detect and remove silence only within selected region
   * Smart implementation: startTime → endTime processing, more efficient than full file processing
   */
  static async detectSilenceInRegionByFileId(fileId, silenceParams) {
    const { 
      threshold = -40, 
      minDuration = 0.5, 
      startTime = 0, 
      endTime = null,
      duration 
    } = silenceParams;
    
    console.log('🎯 [RegionSilence] Starting region-based detection:', {
      fileId,
      threshold,
      minDuration,
      startTime,
      endTime,
      duration
    });
    
    // 🔍 **FIND INPUT FILE**: Find uploaded file by fileId
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Verify file exists
      await fs.access(inputPath);
    } catch (error) {
      console.error('❌ [RegionSilence] Input file not found:', {
        fileId,
        inputPath,
        error: error.message
      });
      throw new Error(`File not found: ${fileId}. Please upload the file again.`);
    }
    
    // 🔍 **GET FILE STATS**: Get file information
    const inputStats = await fs.stat(inputPath);
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Create filename for processed file
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name;
    const outputFilename = `region_silence_removed_${originalName}_${startTime.toFixed(3)}-${endTime ? endTime.toFixed(3) : 'end'}_${timestamp}_${random}.mp3`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    // 🎯 **PROCESS REGION-BASED SILENCE REMOVAL**: Use new region-based method
    const silenceResult = await MP3Utils.detectAndRemoveSilenceInRegion(inputPath, outputPath, {
      threshold,
      minDuration,
      startTime,
      endTime,
      format: 'mp3',
      quality: 'high'
    });
    
    // 🔍 **GET OUTPUT STATS**: Get output file information
    const outputStats = await fs.stat(outputPath);
    
    // 🧹 **AUTO CLEANUP**: Auto cleanup after 24 hours
    setTimeout(() => {
      fs.unlink(outputPath).catch(() => {
        // Silent cleanup
      });
    }, 24 * 60 * 60 * 1000);

    // 🧮 **CALCULATE SILENCE STATS**: Calculate total silence duration and count
    const silentSegments = silenceResult.silentSegments || [];
    const totalSilence = silentSegments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
    const count = silentSegments.length;
    
    // 🎯 **RETURN REGION-BASED RESULT**: Return result with region-specific information
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
      },      processing: { 
        threshold,
        minDuration,
        // 🎯 **REGION-BASED DURATION**: Use region duration for calculations
        duration: (endTime || duration) - startTime,
        // 🎯 **REGION INFO**: Include region-based processing details
        regionBased: true,
        regionStart: startTime,
        regionEnd: endTime || duration,
        regionDuration: (endTime || duration) - startTime
      },
      // 🎯 **FRONTEND COMPATIBLE FORMAT**: Add fields expected by frontend
      silenceRegions: silentSegments,
      count: count,
      totalSilence: totalSilence,
      verification: silenceResult.verification || null,
      // 🎯 **REGION METADATA**: Additional region-based information
      regionBased: true,
      regionStart: startTime,
      regionEnd: endTime || duration,
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };
  }
}