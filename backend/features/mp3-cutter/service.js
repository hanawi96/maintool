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
  static async cutAudioByFileId(fileId, cutParams) {
    const { startTime, endTime, fadeIn, fadeOut } = cutParams;
    
    console.log('🔍 [cutAudioByFileId] Looking for file:', fileId);
    
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
    
    // 🆕 **GENERATE OUTPUT FILENAME**: Tạo filename cho file output
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    const originalName = path.parse(fileId).name; // Lấy tên gốc không có extension
    const outputFilename = `cut_${originalName}_${timestamp}_${random}.mp3`;
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    
    console.log('📁 [cutAudioByFileId] File paths:', {
      input: inputPath,
      output: outputPath,
      outputFilename
    });
    
    // 🔧 **ENSURE OUTPUT DIR**: Đảm bảo thư mục output tồn tại với absolute path
    const outputDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED);
    await fs.mkdir(outputDir, { recursive: true });
    console.log('📁 [cutAudioByFileId] Output directory ensured:', outputDir);
    
    console.log('✂️ [cutAudioByFileId] Starting cut operation:', {
      input: inputPath,
      output: outputPath,
      cutParams
    });
    
    // 🚀 **CUT AUDIO**: Thực hiện cut audio với FFmpeg
    const cutResult = await MP3Utils.cutAudio(inputPath, outputPath, {
      startTime, 
      endTime, 
      fadeIn, 
      fadeOut, 
      format: 'mp3', 
      quality: 'medium'
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
      duration: endTime - startTime
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
        actualDuration: cutResult.settings?.duration || (endTime - startTime)
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