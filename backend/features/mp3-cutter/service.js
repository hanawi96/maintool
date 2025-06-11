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
    
    console.log('🔍 [cutAudioByFileId] Looking for file:', fileId);
    console.log('🎛️ [cutAudioByFileId] Cut params received:', {
      startTime,
      endTime,
      fadeIn,
      fadeOut,
      playbackRate, // 🔧 **DEBUG**: Log playback rate
      outputFormat, // 🆕 **LOG FORMAT**: Log selected format
      quality, // 🆕 **LOG QUALITY**: Log selected quality
      isInverted, // 🆕 **INVERT MODE**: Log invert mode status
      sessionId, // 🆕 **LOG SESSION ID**
      speedChange: playbackRate !== 1 ? `${playbackRate}x speed` : 'normal speed',
      cutMode: isInverted ? 'INVERT (cut outside + concatenate)' : 'NORMAL (cut inside)' // 🆕 **CUT MODE**
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
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Tạo filename cho file output với speed indicator VÀ FORMAT
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name; // Lấy tên gốc không có extension
    const speedSuffix = playbackRate !== 1 ? `_${playbackRate}x` : ''; // 🆕 **SPEED SUFFIX**
    const outputFilename = `cut_${originalName}${speedSuffix}_${timestamp}_${random}.${outputFormat}`; // 🚨 **KEY FIX**: Sử dụng outputFormat
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    console.log('📁 [cutAudioByFileId] File paths:', {
      input: inputPath,
      output: outputPath,
      outputFilename,
      playbackRate,
      outputFormat, // 🆕 **LOG OUTPUT FORMAT**
      quality, // 🆕 **LOG QUALITY**
      sessionId, // 🆕 **LOG SESSION ID**
      speedSuffix: speedSuffix || 'none'
    });
    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại với absolute path
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 [cutAudioByFileId] Output directory ensured:', outputDir);
    
    console.log('✂️ [cutAudioByFileId] Starting cut operation with speed, format and WebSocket:', {
      input: inputPath,
      output: outputPath,
      cutParams: { ...cutParams, playbackRate, outputFormat, quality },
      sessionId,
      ffmpegWillReceive: { 
        startTime, 
        endTime, 
        fadeIn, 
        fadeOut, 
        playbackRate, 
        format: outputFormat, // 🚨 **KEY FIX**: Truyền format đúng
        quality, // 🚨 **KEY FIX**: Truyền quality đúng
        sessionId 
      }
    });
    
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
    
    console.log('🎬 [cutAudioByFileId] FFmpeg processing completed:', {
      success: cutResult.success,
      playbackRateApplied: cutResult.settings?.playbackRate,
      formatApplied: cutResult.settings?.format, // 🆕 **LOG FORMAT APPLIED**
      qualityApplied: cutResult.settings?.quality, // 🆕 **LOG QUALITY APPLIED**
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
      outputFormat, // 🆕 **LOG OUTPUT FORMAT**
      quality, // 🆕 **LOG QUALITY**
      sessionId,
      speedProcessed: playbackRate !== 1 ? `${playbackRate}x speed applied` : 'normal speed',
      formatProcessed: `Converted to ${outputFormat.toUpperCase()}` // 🆕 **LOG FORMAT PROCESSED**
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

  /**
   * 🔇 **DETECT SILENCE BY FILE ID**: Detect silent parts in audio file
   */
  static async detectSilenceByFileId(fileId, silenceParams) {
    const { threshold = -40, minDuration = 0.5, duration } = silenceParams;
    
    console.log('🔇 [detectSilenceByFileId] Looking for file:', fileId);
    
    // 🔍 **FIND INPUT FILE**: Find uploaded file by fileId
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    console.log('🔇 [detectSilenceByFileId] Input path (absolute):', inputPath);
    
    try {
      // 🔍 **CHECK FILE EXISTS**: Verify file exists
      await fs.access(inputPath);
      console.log('✅ [detectSilenceByFileId] Input file found:', inputPath);
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
    
    console.log('📁 [detectSilenceByFileId] File paths:', {
      input: inputPath,
      output: outputPath,
      outputFilename,
      threshold,
      minDuration
    });
    
    // 🔧 **ENSURE OUTPUT DIR**: Ensure output directory exists
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 [detectSilenceByFileId] Output directory ensured:', outputDir);
    
    console.log('🔇 [detectSilenceByFileId] Starting silence detection:', {
      input: inputPath,
      output: outputPath,
      silenceParams: { threshold, minDuration, duration }
    });
    
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
      console.log('✅ [detectSilenceByFileId] Output file created successfully:', outputPath);
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
        console.log('📁 [detectSilenceByFileId] Auto cleanup completed for:', outputFilename);
      });
    }, 24 * 60 * 60 * 1000);
    
    console.log('✅ [detectSilenceByFileId] Silence detection completed successfully:', {
      outputFilename,
      outputPath,
      outputSize: outputStats.size,
      threshold,
      minDuration
    });
      // 🎯 **RETURN STANDARDIZED RESULT**: Return result with standard format
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
        threshold,
        minDuration,
        duration,
        silentSegments: silenceResult.silentSegments || []
      },
      urls: {
        download: `/api/mp3-cutter/download/${outputFilename}`
      },
      processedAt: new Date().toISOString()
    };
  }
}