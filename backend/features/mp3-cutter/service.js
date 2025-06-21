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
    // 🎯 Log thông số cut audio từ frontend
    console.log('\n=== CUT AUDIO PARAMETERS ===');
    console.log('📁 File:', {
      originalName: file.originalname,
      filename: file.filename,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      mimetype: file.mimetype
    });
    console.log('🎵 Audio Info:', {
      duration: `${audioInfo.duration}s (${Math.floor(audioInfo.duration / 60)}:${Math.floor(audioInfo.duration % 60).toString().padStart(2, '0')})`,
      format: audioInfo.format,
      bitrate: audioInfo.bitrate,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels
    });
    console.log('✂️ Cut Parameters:', {
      startTime: `${cutParams.startTime}s`,
      endTime: `${cutParams.endTime}s`,
      duration: `${cutParams.endTime - cutParams.startTime}s`,
      volume: `${(cutParams.volume || 1) * 100}%`,
      speed: `${(cutParams.playbackRate || 1) * 100}%`,
      pitch: `${cutParams.pitch || 0} semitones`,
      fadeIn: `${cutParams.fadeIn || 0}s`,
      fadeOut: `${cutParams.fadeOut || 0}s`,
      normalizeVolume: cutParams.normalizeVolume || false,
      isInverted: cutParams.isInverted || false
    });
    console.log('==============================\n');

    const outputFilename = MP3Utils.generateOutputFilename(file.filename, 'cut', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);
    await MP3Utils.cutAudio(file.path, outputPath, { ...cutParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);

    // 🎯 Log kết quả sau khi cut
    console.log('✅ CUT AUDIO RESULT:');
    console.log('📤 Output:', {
      filename: outputFilename,
      size: `${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
      expectedDuration: `${cutParams.endTime - cutParams.startTime}s`
    });
    console.log('===========================\n');

    return {
      input: { filename: file.filename, originalName: file.originalname, duration: audioInfo.duration },
      output: { filename: outputFilename, duration: cutParams.endTime - cutParams.startTime, size: outputStats.size },
      processing: cutParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }
    static async cutAudioByFileId(fileId, cutParams) {
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    const audioInfo = await MP3Utils.getAudioInfo(inputPath);

    // 🔍 DETAILED BACKEND LOG - Parameters received from frontend
    console.log('\n📥 BACKEND RECEIVED FROM FRONTEND:');
    console.log('📤 Parameters Analysis:', {
      timestamp: new Date().toISOString(),
      fileId: fileId,
      audioInfo: {
        duration: audioInfo.duration,
        format: audioInfo.format,
        bitrate: audioInfo.bitrate,
        sampleRate: audioInfo.sampleRate,
        channels: audioInfo.channels
      },
      receivedParams: {
        startTime: cutParams.startTime,
        endTime: cutParams.endTime,
        selectedDuration: cutParams.endTime - cutParams.startTime,
        volume: cutParams.volume,
        playbackRate: cutParams.playbackRate,
        pitch: cutParams.pitch,
        fadeIn: cutParams.fadeIn,
        fadeOut: cutParams.fadeOut,
        equalizer: cutParams.equalizer,
        isInverted: cutParams.isInverted,
        normalizeVolume: cutParams.normalizeVolume,
        outputFormat: cutParams.outputFormat,
        quality: cutParams.quality,
        sessionId: cutParams.sessionId
      },
      regions: cutParams.regions,
      mainSelection: cutParams.mainSelection,
      calculations: {
        originalDuration: audioInfo.duration,
        selectedDuration: cutParams.endTime - cutParams.startTime,
        expectedOutputDuration: (cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1),
        pitchEffect: cutParams.pitch !== 0 ? `${cutParams.pitch} semitones (will affect duration)` : 'No pitch change',
        speedEffect: cutParams.playbackRate !== 1 ? `${cutParams.playbackRate}x speed` : 'Normal speed',
        volumeEffect: cutParams.volume !== 1 ? `${Math.round(cutParams.volume * 100)}% volume` : 'Original volume',
        pitchDurationImpact: cutParams.pitch !== 0 ? 'Pitch changes may affect final duration due to FFmpeg processing' : 'No pitch impact'
      }
    });

    // 🆕 Check if this is a regions-based cut
    if (cutParams.regions && cutParams.regions.length > 0) {
      return this.cutAudioWithRegions(inputPath, audioInfo, cutParams);
    }

    // 🆕 Check if this is a mainSelection-based cut
    if (cutParams.mainSelection) {
      return this.cutAudioWithMainSelection(inputPath, audioInfo, cutParams);
    }

    // Legacy single cut processing
    // 🎯 Log thông số cut audio by file ID
    console.log('\n=== CUT AUDIO BY FILE ID ===');
    console.log('📁 File ID:', fileId);
    console.log('🎵 Audio Info:', {
      duration: `${audioInfo.duration}s (${Math.floor(audioInfo.duration / 60)}:${Math.floor(audioInfo.duration % 60).toString().padStart(2, '0')})`,
      format: audioInfo.format,
      bitrate: audioInfo.bitrate,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels
    });
    console.log('✂️ Cut Parameters:', {
      startTime: `${cutParams.startTime}s`,
      endTime: `${cutParams.endTime}s`,
      duration: `${cutParams.endTime - cutParams.startTime}s`,
      volume: `${(cutParams.volume || 1) * 100}%`,
      speed: `${(cutParams.playbackRate || 1) * 100}%`,
      pitch: `${cutParams.pitch || 0} semitones`,
      fadeIn: `${cutParams.fadeIn || 0}s`,
      fadeOut: `${cutParams.fadeOut || 0}s`,
      normalizeVolume: cutParams.normalizeVolume || false,
      isInverted: cutParams.isInverted || false
    });
    console.log('============================\n');

    const outputFilename = MP3Utils.generateOutputFilename(fileId, 'cut', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);

    // 🔍 BEFORE PROCESSING LOG
    console.log('\n🔧 BACKEND BEFORE PROCESSING:');
    console.log('📋 Processing Plan:', {
      inputPath: inputPath,
      outputPath: outputPath,
      outputFilename: outputFilename,
      processingParams: {
        startTime: cutParams.startTime,
        endTime: cutParams.endTime,
        selectedDuration: cutParams.endTime - cutParams.startTime,
        volume: cutParams.volume,
        playbackRate: cutParams.playbackRate,
        pitch: cutParams.pitch,
        format: 'mp3',
        quality: 'medium'
      },
      expectedResults: {
        durationWithoutEffects: cutParams.endTime - cutParams.startTime,
        durationWithSpeed: (cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1),
        pitchNote: cutParams.pitch !== 0 ? 'Pitch processing may affect final duration' : 'No pitch processing',
        finalExpectedDuration: (cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1)
      }
    });

    await MP3Utils.cutAudio(inputPath, outputPath, { ...cutParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);

    // 🔍 AFTER PROCESSING LOG - Get actual duration from processed file
    let actualProcessedDuration = cutParams.endTime - cutParams.startTime; // fallback
    try {
      const processedAudioInfo = await MP3Utils.getAudioInfo(outputPath);
      actualProcessedDuration = processedAudioInfo.duration;
      
      console.log('\n🔍 BACKEND PROCESSED FILE ANALYSIS:');
      console.log('📊 Actual Processed File Info:', {
        filename: outputFilename,
        actualDuration: actualProcessedDuration,
        fileSize: outputStats.size,
        fileSizeMB: (outputStats.size / 1024 / 1024).toFixed(2) + ' MB',
        processedAudioInfo: {
          duration: processedAudioInfo.duration,
          format: processedAudioInfo.format,
          bitrate: processedAudioInfo.bitrate,
          sampleRate: processedAudioInfo.sampleRate,
          channels: processedAudioInfo.channels
        }
      });
      
      console.log('📊 Duration Analysis:', {
        original: {
          selectedDuration: cutParams.endTime - cutParams.startTime,
          playbackRate: cutParams.playbackRate,
          pitch: cutParams.pitch
        },
        expected: {
          withSpeed: (cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1),
          withPitch: cutParams.pitch !== 0 ? 'Duration may be affected by pitch processing' : 'No pitch effect'
        },
        actual: {
          processedDuration: actualProcessedDuration,
          difference: actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1)),
          percentageDifference: (((actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1))) / actualProcessedDuration) * 100).toFixed(2) + '%'
        },
        analysis: {
          durationCorrect: Math.abs(actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1))) < 0.1,
          possibleCauses: cutParams.pitch !== 0 ? ['Pitch processing', 'Speed adjustment', 'FFmpeg processing'] : ['Speed adjustment', 'FFmpeg processing']
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not analyze processed file duration:', error.message);
    }

    // 🎯 Log kết quả sau khi cut by file ID
    console.log('✅ CUT BY FILE ID RESULT:');
    console.log('📤 Output:', {
      filename: outputFilename,
      size: `${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
      expectedDuration: `${cutParams.endTime - cutParams.startTime}s`,
      actualDuration: `${actualProcessedDuration}s`
    });
    console.log('==============================\n');

    const responseData = {
      input: { fileId, duration: audioInfo.duration },
      output: { 
        filename: outputFilename, 
        duration: actualProcessedDuration, // Use actual duration from processed file
        size: outputStats.size 
      },
      processing: cutParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };

    // 🔍 FINAL BACKEND LOG - Response being sent to frontend
    console.log('\n🚀 BACKEND TO FRONTEND - DETAILED RESPONSE:');
    console.log('📤 Sending to Frontend:', {
      timestamp: new Date().toISOString(),
      sessionId: cutParams.sessionId,
      responseData: responseData,
      durationComparison: {
        frontend: {
          expectedDuration: cutParams.endTime - cutParams.startTime,
          expectedWithSpeed: (cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1),
          playbackRate: cutParams.playbackRate,
          pitch: cutParams.pitch
        },
        backend: {
          actualDuration: actualProcessedDuration,
          reportedDuration: responseData.output.duration,
          difference: actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1)),
          percentageDifference: (((actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1))) / actualProcessedDuration) * 100).toFixed(2) + '%'
        },
        analysis: {
          durationAccurate: Math.abs(actualProcessedDuration - ((cutParams.endTime - cutParams.startTime) / (cutParams.playbackRate || 1))) < 0.1,
          pitchAffected: cutParams.pitch !== 0,
          speedAffected: cutParams.playbackRate !== 1
        }
      }
    });

    return responseData;
  }

  // 🆕 Cut audio with regions support
  static async cutAudioWithRegions(inputPath, audioInfo, cutParams) {
    console.log('\n=== CUT AUDIO WITH REGIONS ===');
    console.log('🎯 Processing Mode: Sequential Regions');
    console.log('📁 Input:', inputPath);
    console.log('🎵 Audio Info:', {
      duration: `${audioInfo.duration}s`,
      format: audioInfo.format,
      bitrate: audioInfo.bitrate,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels
    });
    console.log('🎯 Regions:', cutParams.regions.length);
    console.log('🎯 Main Selection:', cutParams.mainSelection ? 'Yes' : 'No');

    // Build timeline from regions and main selection
    const timeline = this.buildProcessingTimeline(cutParams.regions, cutParams.mainSelection, audioInfo.duration);
    
    console.log('📋 Processing Timeline:', {
      totalSegments: timeline.length,
      segments: timeline.map(seg => ({
        start: seg.start,
        end: seg.end,
        duration: seg.end - seg.start,
        type: seg.type,
        source: seg.source
      }))
    });
    
    const outputFilename = MP3Utils.generateOutputFilename(
      path.basename(inputPath), 
      `regions-${timeline.length}`, 
      cutParams.outputFormat || 'mp3'
    );
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);

    // Process segments and concatenate
    const result = await MP3Utils.processRegionsSequentially(inputPath, outputPath, timeline, cutParams);
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);

    console.log('✅ REGIONS PROCESSING RESULT:');
    console.log('📤 Output:', {
      filename: outputFilename,
      size: `${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
      totalSegments: timeline.length,
      totalDuration: `${result.totalDuration}s`
    });
    console.log('===============================\n');

    return {
      input: { 
        filename: path.basename(inputPath), 
        duration: audioInfo.duration 
      },
      output: { 
        filename: outputFilename, 
        duration: result.totalDuration, 
        size: outputStats.size,
        segments: timeline.length
      },
      processing: {
        mode: 'regions',
        regionsCount: cutParams.regions.length,
        hasMainSelection: !!cutParams.mainSelection,
        timeline: timeline
      },
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }

  // 🆕 Cut audio with main selection only
  static async cutAudioWithMainSelection(inputPath, audioInfo, cutParams) {
    console.log('\n=== CUT AUDIO WITH MAIN SELECTION ===');
    console.log('🎯 Processing Mode: Main Selection Only');
    
    const mainSelection = cutParams.mainSelection;
    const outputFilename = MP3Utils.generateOutputFilename(
      path.basename(inputPath), 
      'main', 
      cutParams.outputFormat || 'mp3'
    );
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);

    // Process main selection with its effects
    await MP3Utils.cutAudio(inputPath, outputPath, {
      startTime: mainSelection.start,
      endTime: mainSelection.end,
      volume: mainSelection.volume,
      playbackRate: mainSelection.playbackRate,
      pitch: mainSelection.pitch,
      fadeIn: mainSelection.fadeIn,
      fadeOut: mainSelection.fadeOut,
      equalizer: cutParams.equalizer,
      format: cutParams.outputFormat || 'mp3',
      quality: cutParams.quality || 'medium',
      normalizeVolume: cutParams.normalizeVolume,
      sessionId: cutParams.sessionId
    });

    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);

    console.log('✅ MAIN SELECTION RESULT:');
    console.log('📤 Output:', {
      filename: outputFilename,
      size: `${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
      duration: `${mainSelection.end - mainSelection.start}s`
    });
    console.log('=====================================\n');

    return {
      input: { 
        filename: path.basename(inputPath), 
        duration: audioInfo.duration 
      },
      output: { 
        filename: outputFilename, 
        duration: mainSelection.end - mainSelection.start, 
        size: outputStats.size 
      },
      processing: {
        mode: 'mainSelection',
        mainSelection: mainSelection
      },
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }

  // 🆕 Build processing timeline from regions and main selection
  static buildProcessingTimeline(regions, mainSelection, totalDuration) {
    const timeline = [];
    
    // Add regions to timeline
    regions.forEach(region => {
      timeline.push({
        start: region.start,
        end: region.end,
        type: 'region',
        source: region,
        effects: {
          volume: region.volume,
          playbackRate: region.playbackRate,
          pitch: region.pitch,
          fadeIn: region.fadeIn,
          fadeOut: region.fadeOut
        }
      });
    });
    
    // Add main selection to timeline if provided
    if (mainSelection) {
      timeline.push({
        start: mainSelection.start,
        end: mainSelection.end,
        type: 'main',
        source: mainSelection,
        effects: {
          volume: mainSelection.volume,
          playbackRate: mainSelection.playbackRate,
          pitch: mainSelection.pitch,
          fadeIn: mainSelection.fadeIn,
          fadeOut: mainSelection.fadeOut
        }
      });
    }
    
    // Sort timeline by start time
    timeline.sort((a, b) => a.start - b.start);
    
    // Handle overlaps by merging effects
    const processedTimeline = [];
    let currentSegment = null;
    
    timeline.forEach(segment => {
      if (!currentSegment) {
        currentSegment = { ...segment };
      } else if (segment.start < currentSegment.end) {
        // Overlap detected - merge effects
        console.log(`🔀 Overlap detected: ${currentSegment.type} (${currentSegment.start}-${currentSegment.end}) with ${segment.type} (${segment.start}-${segment.end})`);
        
        // Split current segment at overlap point
        if (segment.start > currentSegment.start) {
          // Add non-overlapping part of current segment
          processedTimeline.push({
            ...currentSegment,
            end: segment.start
          });
        }
        
        // Create merged segment for overlap
        const overlapStart = Math.max(currentSegment.start, segment.start);
        const overlapEnd = Math.min(currentSegment.end, segment.end);
        
        if (overlapStart < overlapEnd) {
          processedTimeline.push({
            start: overlapStart,
            end: overlapEnd,
            type: 'merged',
            source: `${currentSegment.type}+${segment.type}`,
            effects: this.mergeEffects(currentSegment.effects, segment.effects)
          });
        }
        
        // Handle remaining parts
        if (currentSegment.end > segment.end) {
          currentSegment = {
            ...currentSegment,
            start: segment.end
          };
        } else if (segment.end > currentSegment.end) {
          currentSegment = {
            ...segment,
            start: Math.max(segment.start, currentSegment.end)
          };
        } else {
          currentSegment = null;
        }
      } else {
        // No overlap - add current segment and start new one
        processedTimeline.push(currentSegment);
        currentSegment = { ...segment };
      }
    });
    
    // Add final segment if exists
    if (currentSegment) {
      processedTimeline.push(currentSegment);
    }
    
    return processedTimeline;
  }

  // 🆕 Merge effects for overlapping segments
  static mergeEffects(effects1, effects2) {
    return {
      volume: effects1.volume * effects2.volume, // Multiplicative
      playbackRate: effects1.playbackRate * effects2.playbackRate, // Multiplicative
      pitch: effects1.pitch + effects2.pitch, // Additive
      fadeIn: Math.max(effects1.fadeIn, effects2.fadeIn), // Take maximum
      fadeOut: Math.max(effects1.fadeOut, effects2.fadeOut) // Take maximum
    };
  }
    static async changeSpeedByFileId(fileId, speedParams) {
    const inputPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, fileId);
    const audioInfo = await MP3Utils.getAudioInfo(inputPath);

    // 🎯 Log thông số change speed
    console.log('\n=== CHANGE SPEED BY FILE ID ===');
    console.log('📁 File ID:', fileId);
    console.log('🎵 Audio Info:', {
      duration: `${audioInfo.duration}s (${Math.floor(audioInfo.duration / 60)}:${Math.floor(audioInfo.duration % 60).toString().padStart(2, '0')})`,
      format: audioInfo.format,
      bitrate: audioInfo.bitrate,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels
    });
    console.log('⚡ Speed Parameters:', {
      originalSpeed: '100%',
      newSpeed: `${(speedParams.playbackRate || 1) * 100}%`,
      volume: `${(speedParams.volume || 1) * 100}%`,
      pitch: `${speedParams.pitch || 0} semitones`,
      fadeIn: `${speedParams.fadeIn || 0}s`,
      fadeOut: `${speedParams.fadeOut || 0}s`,
      normalizeVolume: speedParams.normalizeVolume || false,
      expectedNewDuration: `${(audioInfo.duration / (speedParams.playbackRate || 1)).toFixed(2)}s`
    });
    console.log('===============================\n');

    const outputFilename = MP3Utils.generateOutputFilename(fileId, 'speed', 'mp3');
    const outputPath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, outputFilename);
    await MP3Utils.ensureDirectory(MP3_CONFIG.PATHS.PROCESSED);
    await MP3Utils.changeSpeed(inputPath, outputPath, { ...speedParams, format: 'mp3', quality: 'medium' });
    const outputStats = await fs.stat(outputPath);
    scheduleCleanup(outputPath, MP3_CONFIG.CLEANUP.PROCESSED_FILE_TTL);

    // 🎯 Log kết quả sau khi change speed
    console.log('✅ CHANGE SPEED RESULT:');
    console.log('📤 Output:', {
      filename: outputFilename,
      size: `${(outputStats.size / 1024 / 1024).toFixed(2)} MB`,
      expectedDuration: `${(audioInfo.duration / (speedParams.playbackRate || 1)).toFixed(2)}s`
    });
    console.log('============================\n');

    return {
      input: { fileId, duration: audioInfo.duration },
      output: { filename: outputFilename, duration: audioInfo.duration / speedParams.playbackRate, size: outputStats.size },
      processing: speedParams,
      urls: { download: buildDownloadUrl(outputFilename) },
      processedAt: new Date().toISOString()
    };
  }
  
  static async generateWaveform(file, audioInfo, waveformParams) {
    const waveformData = await MP3Utils.generateWaveform(file.path, waveformParams.samples);
    return {
      file: { filename: file.filename, originalName: file.originalname },
      audio: { ...audioInfo },
      waveform: waveformData,
      parameters: waveformParams,
      generatedAt: new Date().toISOString()
    };
  }
  
  static async downloadFile(filename, res) {
    const filePath = path.resolve(MP3_CONFIG.PATHS.PROCESSED, filename);
    const uploadPath = path.resolve(MP3_CONFIG.PATHS.UPLOADS, filename);
    
    let targetPath;
    try {
      await fs.access(filePath);
      targetPath = filePath;
    } catch {
      try {
        await fs.access(uploadPath);
        targetPath = uploadPath;
      } catch {
        throw new Error('File not found');
      }
    }
    
    res.download(targetPath, filename);
  }
  
  static async getHealthStatus() {
    return {
      status: 'healthy',
      service: 'MP3 Cutter',
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  static async getSupportedFormats() {
    return {
      input: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
      output: ['mp3', 'wav'],
      maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
      maxDuration: MP3_CONFIG.MAX_DURATION,
      supportedOperations: ['cut', 'fade', 'speed', 'waveform']
    };
  }
  
  static async getStats() {
    return {
      service: 'MP3 Cutter',
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        maxFileSize: MP3_CONFIG.MAX_FILE_SIZE,
        maxDuration: MP3_CONFIG.MAX_DURATION
      },
      timestamp: new Date().toISOString()
    };
  }
  
  static async debugFiles() {
    const uploadFiles = await fs.readdir(MP3_CONFIG.PATHS.UPLOADS).catch(() => []);
    const processedFiles = await fs.readdir(MP3_CONFIG.PATHS.PROCESSED).catch(() => []);
    
    return {
      uploads: uploadFiles,
      processed: processedFiles,
      paths: MP3_CONFIG.PATHS,
      timestamp: new Date().toISOString()
    };
  }
}
