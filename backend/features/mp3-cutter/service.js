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
    
    console.log('✂️ [cutAudio] Starting cut operation:', {
      inputPath: file.path,
      outputPath,
      cutParams
    });
    
    // Cut the audio
    await MP3Utils.cutAudio(file.path, outputPath, {
      startTime, endTime, fadeIn, fadeOut, format: 'mp3', quality: 'medium'
    });
    
    // Get output file stats
    const outputStats = await fs.stat(outputPath);
    
    // Auto cleanup after 24 hours
    setTimeout(() => fs.unlink(outputPath).catch(() => {}), 24 * 60 * 60 * 1000);
    
    console.log('✅ [cutAudio] Cut completed successfully:', {
      outputFilename,
      outputPath,
      outputSize: outputStats.size
    });
    
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
    const { startTime, endTime, fadeIn, fadeOut, playbackRate = 1 } = cutParams; // 🆕 **SPEED SUPPORT**
    
    console.log('🔍 [cutAudioByFileId] Looking for file:', fileId);
    console.log('🎛️ [cutAudioByFileId] Cut params received:', {
      startTime,
      endTime,
      fadeIn,
      fadeOut,
      playbackRate, // 🔧 **DEBUG**: Log playback rate
      sessionId, // 🆕 **LOG SESSION ID**
      speedChange: playbackRate !== 1 ? `${playbackRate}x speed` : 'normal speed'
    });
    
    // 🔍 **FIND INPUT FILE**: Tìm file đã upload theo fileId với absolute path
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    console.log('🔍 [cutAudioByFileId] Input path (absolute):', inputPath);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Kiểm tra file có tồn tại
      await fs.access(inputPath);
      console.log('✅ [cutAudioByFileId] Input file found:', inputPath);
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
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Tạo filename cho file output với speed indicator
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name; // Lấy tên gốc không có extension
    const speedSuffix = playbackRate !== 1 ? `_${playbackRate}x` : ''; // 🆕 **SPEED SUFFIX**
    const outputFilename = `cut_${originalName}${speedSuffix}_${timestamp}_${random}.mp3`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    console.log('📁 [cutAudioByFileId] File paths:', {
      input: inputPath,
      output: outputPath,
      outputFilename,
      playbackRate,
      sessionId, // 🆕 **LOG SESSION ID**
      speedSuffix: speedSuffix || 'none'
    });
    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại với absolute path
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 [cutAudioByFileId] Output directory ensured:', outputDir);
    
    console.log('✂️ [cutAudioByFileId] Starting cut operation with speed and WebSocket:', {
      input: inputPath,
      output: outputPath,
      cutParams: { ...cutParams, playbackRate },
      sessionId,
      ffmpegWillReceive: { startTime, endTime, fadeIn, fadeOut, playbackRate, format: 'mp3', quality: 'medium', sessionId }
    });
    
    // 🚀 **CUT AUDIO WITH SPEED & WEBSOCKET**: Thực hiện cut audio với FFmpeg, speed change và WebSocket progress
    const cutResult = await MP3Utils.cutAudio(inputPath, outputPath, {
      startTime, 
      endTime, 
      fadeIn, 
      fadeOut, 
      playbackRate, // 🆕 **PASS SPEED**: Truyền playback rate to FFmpeg
      format: 'mp3', 
      quality: 'medium',
      sessionId // 🆕 **PASS SESSION ID**: Truyền sessionId cho WebSocket progress
    });
    
    console.log('🎬 [cutAudioByFileId] FFmpeg processing completed:', {
      success: cutResult.success,
      playbackRateApplied: cutResult.settings?.playbackRate,
      sessionId,
      ffmpegCommand: 'check FFmpeg logs above'
    });
    
    // 🔍 **VERIFY OUTPUT FILE**: Kiểm tra file output đã được tạo
    try {
      await fs.access(outputPath);
      console.log('✅ [cutAudioByFileId] Output file created successfully:', outputPath);
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
        console.log('📁 [cutAudioByFileId] Auto cleanup completed for:', outputFilename);
      });
    }, 24 * 60 * 60 * 1000);
    
    console.log('✅ [cutAudioByFileId] Cut completed successfully:', {
      outputFilename,
      outputPath,
      outputSize: outputStats.size,
      duration: endTime - startTime,
      playbackRate,
      sessionId,
      speedProcessed: playbackRate !== 1 ? `${playbackRate}x speed applied` : 'normal speed'
    });
    
    // 🎯 **RETURN STANDARDIZED RESULT**: Trả về kết quả với format chuẩn
    return {
      input: {
        filename: fileId,
        originalName: originalName,
        path: inputPath,
        size: inputStats.size
      },
      output: {
        filename: outputFilename, // 🎯 **KEY FIX**: Đảm bảo trả về đúng tên field
        path: outputPath,
        duration: endTime - startTime,
        size: outputStats.size
      },
      processing: { 
        startTime, 
        endTime, 
        fadeIn, 
        fadeOut,
        playbackRate, // 🆕 **INCLUDE SPEED**: Include playback rate in response
        actualDuration: cutResult.settings?.duration || (endTime - startTime),
        speedApplied: playbackRate !== 1 ? `${playbackRate}x` : 'normal' // 🔧 **DEBUG**: Confirm speed applied
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
    
    console.log('⚡ [changeAudioSpeedByFileId] Looking for file:', fileId);
    
    // 🔍 **FIND INPUT FILE**: Tìm file đã upload theo fileId với absolute path
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    console.log('⚡ [changeAudioSpeedByFileId] Input path (absolute):', inputPath);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Kiểm tra file có tồn tại
      await fs.access(inputPath);
      console.log('✅ [changeAudioSpeedByFileId] Input file found:', inputPath);
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
    
    console.log('📁 [changeAudioSpeedByFileId] File paths:', {
      input: inputPath,
      output: outputPath,
      outputFilename,
      playbackRate
    });
    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 [changeAudioSpeedByFileId] Output directory ensured:', outputDir);
    
    console.log('⚡ [changeAudioSpeedByFileId] Starting speed change:', {
      input: inputPath,
      output: outputPath,
      speedParams: { playbackRate, outputFormat, quality }
    });
    
    // 🚀 **CHANGE SPEED**: Thực hiện thay đổi tốc độ với FFmpeg
    const speedResult = await MP3Utils.changeAudioSpeed(inputPath, outputPath, {
      playbackRate,
      format: outputFormat,
      quality
    });
    
    // 🔍 **VERIFY OUTPUT FILE**: Kiểm tra file output đã được tạo
    try {
      await fs.access(outputPath);
      console.log('✅ [changeAudioSpeedByFileId] Output file created successfully:', outputPath);
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
        console.log('📁 [changeAudioSpeedByFileId] Auto cleanup completed for:', outputFilename);
      });
    }, 24 * 60 * 60 * 1000);
    
    console.log('✅ [changeAudioSpeedByFileId] Speed change completed successfully:', {
      outputFilename,
      outputPath,
      outputSize: outputStats.size,
      playbackRate
    });
    
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
    console.log('📥 [getFileForDownload] Looking for file:', filename);
    
    // 🔍 **TRY PROCESSED FILES FIRST**: Check processed folder với absolute path
    let filePath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename);
    console.log('🔍 [getFileForDownload] Checking processed path:', filePath);
    
    try {
      await fs.access(filePath);
      console.log('✅ [getFileForDownload] Found in processed folder:', filePath);
    } catch {
      // 🔍 **TRY UPLOADS FOLDER**: Check uploads folder với absolute path
      filePath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename);
      console.log('🔍 [getFileForDownload] Checking uploads path:', filePath);
      
      try {
        await fs.access(filePath);
        console.log('✅ [getFileForDownload] Found in uploads folder:', filePath);
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
    
    console.log('✅ [getFileForDownload] File info prepared:', {
      filename: result.filename,
      path: result.path,
      size: result.size,
      mimeType: result.mimeType
    });
    
    return result;
  }
}