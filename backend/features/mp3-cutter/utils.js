// features/mp3-cutter/utils.js

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG, MIME_TYPES } from './constants.js';

// Configure FFmpeg paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath.path);

const ffprobe = promisify(ffmpeg.ffprobe);

export class MP3Utils {
  
  /**
   * Get audio file information using FFprobe
   */
  static async getAudioInfo(filePath) {
    try {
      const metadata = await ffprobe(filePath);
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      
      if (!audioStream) {
        throw new Error('No audio stream found in file');
      }

      return {
        duration: parseFloat(metadata.format.duration) || 0,
        size: parseInt(metadata.format.size) || 0,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        format: metadata.format.format_name || 'unknown',
        codec: audioStream.codec_name || 'unknown',
        sampleRate: parseInt(audioStream.sample_rate) || 0,
        channels: audioStream.channels || 0,
        channelLayout: audioStream.channel_layout || 'unknown'
      };
    } catch (error) {
      throw new Error(`Failed to get audio info: ${error.message}`);
    }
  }

  /**
   * Cut audio file with optional fade effects
   */
  static async cutAudio(inputPath, outputPath, options = {}) {
    const {
      startTime = 0,
      endTime,
      fadeIn = 0,
      fadeOut = 0,
      format = 'mp3',
      quality = 'medium',
      playbackRate = 1,
      isInverted = false, // 🆕 **INVERT MODE**: Add invert mode parameter
      sessionId = null // 🆕 **SESSION ID**: Để identify WebSocket room
    } = options;

    console.log('🎬 [cutAudio] Starting cut operation with options:', {
      startTime,
      endTime,
      fadeIn,
      fadeOut,
      format,
      quality,
      playbackRate,
      isInverted, // 🆕 **INVERT MODE**: Log invert mode
      sessionId, // 🆕 **LOG SESSION ID**
      speedChangeRequested: playbackRate !== 1,
      cutMode: isInverted ? 'INVERT (cut outside + concatenate)' : 'NORMAL (cut inside)' // 🆕 **CUT MODE**
    });

    // 🆕 **INVERT MODE LOGIC**: Handle concatenation for invert mode
    if (isInverted && endTime) {
      // 🧠 **GET AUDIO DURATION**: Get total duration to calculate active regions
      const audioInfo = await this.getAudioInfo(inputPath);
      const totalDuration = audioInfo.duration;
      
      // 🎯 **SMART SEGMENT CALCULATION**: Calculate which segments would be active
      const active1Duration = startTime; // 0 → startTime
      const active2Duration = totalDuration - endTime; // endTime → duration
      
      // 🎯 **TOTAL DURATION CHECK**: Check total duration of active regions
      const totalActiveRegionDuration = active1Duration + active2Duration;
      
      // 🚫 **NO ACTIVE REGIONS CHECK**: If total duration < 0.1s, throw error
      if (totalActiveRegionDuration < 0.1) {
        console.log('🚫 [cutAudio] INVERT MODE ERROR: Total active regions duration < 0.1s');
        throw new Error('Please select a cut length greater than 0.1 seconds.');
      }
      
      // 🎯 **INDIVIDUAL SEGMENT CHECK**: For processing logic
      const hasActive1 = active1Duration > 0;
      const hasActive2 = active2Duration > 0;
      
      console.log('🔄 [cutAudio] INVERT MODE: Processing concatenation logic with active regions:', {
        hasActive1,
        hasActive2,
        active1Duration: active1Duration.toFixed(2) + 's',
        active2Duration: active2Duration.toFixed(2) + 's'
      });
      return this.cutAudioInvertMode(inputPath, outputPath, options);
    }

    return new Promise((resolve, reject) => {
      try {
        let command = ffmpeg(inputPath);

        // Set input seek (start time)
        if (startTime > 0) {
          command = command.seekInput(startTime);
        }

        // Set duration (if end time specified)
        if (endTime && endTime > startTime) {
          const duration = endTime - startTime;
          command = command.duration(duration);
        }

        // Build audio filters
        const filters = [];
        
        // 🆕 **SPEED/TEMPO FILTER**: Thay đổi tốc độ phát với atempo
        if (playbackRate && playbackRate !== 1) {
          console.log(`⚡ [cutAudio] Applying speed change: ${playbackRate}x`);
          console.log(`🔧 [cutAudio] Speed filter logic: playbackRate=${playbackRate}, type=${typeof playbackRate}`);
          
          // 🎯 **ATEMPO CHAINING**: FFmpeg atempo chỉ hỗ trợ 0.5-2.0, cần chain cho giá trị cực
          let currentRate = playbackRate;
          const originalRate = playbackRate;
          
          if (currentRate >= 0.5 && currentRate <= 2.0) {
            // 🎯 **SINGLE ATEMPO**: Tốc độ trong khoảng hỗ trợ
            const atempoFilter = `atempo=${currentRate.toFixed(3)}`;
            filters.push(atempoFilter);
            console.log(`🎯 [cutAudio] SINGLE atempo filter: ${atempoFilter}`);
          } else if (currentRate > 2.0) {
            // 🎯 **CHAIN FOR FAST**: Tốc độ > 2x cần chain nhiều atempo
            console.log(`🔗 [cutAudio] CHAINING for fast speed > 2x:`, { originalRate: currentRate });
            while (currentRate > 2.0) {
              filters.push(`atempo=2`);
              currentRate /= 2;
              console.log(`🔗 [cutAudio] Added atempo=2, remaining rate: ${currentRate}`);
            }
            if (currentRate > 1.01) { // Tránh rounding error
              const finalFilter = `atempo=${currentRate.toFixed(3)}`;
              filters.push(finalFilter);
              console.log(`🔗 [cutAudio] Final atempo filter: ${finalFilter}`);
            }
          } else if (currentRate < 0.5) {
            // 🎯 **CHAIN FOR SLOW**: Tốc độ < 0.5x cần chain nhiều atempo  
            console.log(`🔗 [cutAudio] CHAINING for slow speed < 0.5x:`, { originalRate: currentRate });
            while (currentRate < 0.5) {
              filters.push(`atempo=0.5`);
              currentRate *= 2;
              console.log(`🔗 [cutAudio] Added atempo=0.5, remaining rate: ${currentRate}`);
            }
            if (currentRate < 0.99) { // Tránh rounding error
              const finalFilter = `atempo=${currentRate.toFixed(3)}`;
              filters.push(finalFilter);
              console.log(`🔗 [cutAudio] Final atempo filter: ${finalFilter}`);
            }
          }
          
          console.log(`✅ [cutAudio] Speed filters completed for ${originalRate}x:`, filters.filter(f => f.startsWith('atempo')));
        } else {
          console.log(`🚫 [cutAudio] No speed change applied (playbackRate=${playbackRate})`);
        }
        
        // Add fade in effect
        if (fadeIn > 0) {
          const fadeInFilter = `afade=t=in:st=0:d=${fadeIn}`;
          filters.push(fadeInFilter);
          console.log(`🎵 [cutAudio] Added fade in filter: ${fadeInFilter}`);
        }
        
        // Add fade out effect
        if (fadeOut > 0) {
          const segmentDuration = endTime ? (endTime - startTime) : null;
          if (segmentDuration) {
            const fadeOutStart = Math.max(0, segmentDuration - fadeOut);
            const fadeOutFilter = `afade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
            filters.push(fadeOutFilter);
            console.log(`🎵 [cutAudio] Added fade out filter: ${fadeOutFilter}`);
          }
        }

        // Apply filters if any
        if (filters.length > 0) {
          console.log(`🎛️ [cutAudio] Applying ${filters.length} filters:`, filters.join(', '));
          command = command.audioFilters(filters);
        } else {
          console.log(`🚫 [cutAudio] No filters to apply`);
        }

        // 🔧 **FORMAT PROCESSING DEBUG**: Log format processing details
        console.log('🎵 [cutAudio] FORMAT PROCESSING START:', {
          format,
          quality,
          outputPath,
          outputExtension: path.extname(outputPath),
          isM4R: format === 'm4r',
          isM4A: format === 'm4a'
        });

        // Set output quality based on format and quality preset
        try {
          console.log(`🔧 [cutAudio] Calling setOutputQuality with format: ${format}, quality: ${quality}`);
          command = this.setOutputQuality(command, format, quality);
          console.log(`✅ [cutAudio] setOutputQuality completed successfully for ${format}`);
        } catch (qualityError) {
          console.error('❌ [cutAudio] setOutputQuality failed:', {
            format,
            quality,
            error: qualityError.message,
            stack: qualityError.stack
          });
          throw qualityError;
        }

        // 🔌 **WEBSOCKET PROGRESS EMITTER**: Function để emit progress
        const emitProgress = (progressData) => {
          if (sessionId && global.io) {
            const roomName = `progress-${sessionId}`;
            console.log(`📊 [cutAudio] Emitting progress to room ${roomName}:`, progressData);
            global.io.to(roomName).emit('cut-progress', {
              sessionId,
              ...progressData,
              timestamp: new Date().toISOString()
            });
          }
        };

        // 📊 **INITIAL PROGRESS**: Emit starting progress
        emitProgress({
          stage: 'initializing',
          percent: 0,
          message: 'Initializing FFmpeg process...'
        });

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('🚀 [cutAudio] FFmpeg command starting:', commandLine);
            console.log('🔍 [cutAudio] Command analysis:', {
              hasAtempo: commandLine.includes('atempo'),
              atempoCount: (commandLine.match(/atempo/g) || []).length,
              fullCommand: commandLine
            });

            // 📊 **START PROGRESS**: Emit start progress
            emitProgress({
              stage: 'processing',
              percent: 5,
              message: 'FFmpeg processing started...'
            });
          })
          .on('progress', (progress) => {
            // 📊 **REAL-TIME PROGRESS**: Emit actual FFmpeg progress
            const percent = Math.round(progress.percent || 0);
            const progressData = {
              stage: 'processing', 
              percent: Math.min(95, Math.max(5, percent)), // Clamp between 5-95%
              currentTime: progress.timemark,
              targetSize: progress.targetSize,
              message: `Processing audio... ${percent}%`
            };

            console.log(`📊 [cutAudio] FFmpeg progress: ${percent}% - ${progress.timemark}`);
            emitProgress(progressData);

            // 🔄 **LEGACY CALLBACK**: Keep existing callback for backward compatibility
            if (options.onProgress) {
              options.onProgress({
                percent: Math.round(progress.percent || 0),
                currentTime: progress.timemark,
                targetSize: progress.targetSize
              });
            }
          })
          .on('error', (error) => {
            console.error('❌ [cutAudio] FFmpeg error:', error);
            console.error('❌ [cutAudio] FFmpeg error context:', {
              inputPath,
              outputPath,
              playbackRate,
              filters,
              errorMessage: error.message
            });

            // 📊 **ERROR PROGRESS**: Emit error progress
            emitProgress({
              stage: 'error',
              percent: 0,
              message: `Processing failed: ${error.message}`,
              error: error.message
            });

            reject(new Error(`Audio cutting failed: ${error.message}`));
          })
          .on('end', () => {
            console.log('✅ [cutAudio] FFmpeg processing completed successfully');
            console.log('🎉 [cutAudio] Final result summary:', {
              inputPath,
              outputPath,
              playbackRateApplied: playbackRate,
              filtersApplied: filters,
              speedSuccess: playbackRate !== 1 ? `${playbackRate}x speed applied` : 'normal speed'
            });

            // 📊 **COMPLETION PROGRESS**: Emit completion progress
            emitProgress({
              stage: 'completed',
              percent: 100,
              message: 'Audio processing completed successfully!',
              success: true
            });
            
            resolve({
              success: true,
              outputPath,
              inputPath,
              settings: {
                startTime,
                endTime,
                duration: endTime - startTime,
                fadeIn,
                fadeOut,
                playbackRate,
                format,
                quality,
                filtersApplied: filters // 🔧 **DEBUG**: Include applied filters in result
              }
            });
          })
          .run();

      } catch (error) {
        console.error('❌ [cutAudio] Setup failed:', error);
        
        // 📊 **SETUP ERROR PROGRESS**: Emit setup error
        if (sessionId && global.io) {
          const roomName = `progress-${sessionId}`;
          global.io.to(roomName).emit('cut-progress', {
            sessionId,
            stage: 'error',
            percent: 0,
            message: `Setup failed: ${error.message}`,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }

        reject(new Error(`Failed to setup audio cutting: ${error.message}`));
      }
    });
  }

  /**
   * 🆕 **CHANGE AUDIO SPEED**: Chỉ thay đổi tốc độ không cắt đoạn
   */
  static async changeAudioSpeed(inputPath, outputPath, options = {}) {
    const {
      playbackRate = 1,
      format = 'mp3',
      quality = 'medium'
    } = options;

    console.log(`⚡ [changeAudioSpeed] Changing speed to ${playbackRate}x:`, {
      input: inputPath,
      output: outputPath,
      playbackRate
    });

    return new Promise((resolve, reject) => {
      try {
        let command = ffmpeg(inputPath);
        const filters = [];
        
        // 🎯 **SPEED ONLY**: Chỉ xử lý tốc độ
        if (playbackRate && playbackRate !== 1) {
          let currentRate = playbackRate;
          
          if (currentRate >= 0.5 && currentRate <= 2.0) {
            filters.push(`atempo=${currentRate.toFixed(3)}`);
          } else if (currentRate > 2.0) {
            while (currentRate > 2.0) {
              filters.push(`atempo=2`);
              currentRate /= 2;
            }
            if (currentRate > 1.01) {
              filters.push(`atempo=${currentRate.toFixed(3)}`);
            }
          } else if (currentRate < 0.5) {
            while (currentRate < 0.5) {
              filters.push(`atempo=0.5`);
              currentRate *= 2;
            }
            if (currentRate < 0.99) {
              filters.push(`atempo=${currentRate.toFixed(3)}`);
            }
          }
        }

        if (filters.length > 0) {
          console.log(`🎛️ [changeAudioSpeed] Applying tempo filters:`, filters.join(', '));
          command = command.audioFilters(filters);
        }

        command = this.setOutputQuality(command, format, quality);

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('⚡ [changeAudioSpeed] FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            console.log(`⚡ [changeAudioSpeed] Progress: ${Math.round(progress.percent || 0)}%`);
          })
          .on('error', (error) => {
            console.error('❌ [changeAudioSpeed] FFmpeg error:', error);
            reject(new Error(`Speed change failed: ${error.message}`));
          })
          .on('end', () => {
            console.log('✅ [changeAudioSpeed] Speed change completed successfully');
            resolve({
              success: true,
              outputPath,
              inputPath,
              settings: {
                playbackRate,
                format,
                quality
              }
            });
          })
          .run();

      } catch (error) {
        console.error('❌ [changeAudioSpeed] Setup failed:', error);
        reject(new Error(`Failed to setup speed change: ${error.message}`));
      }
    });
  }

  /**
   * Generate waveform data from audio file
   */
  static async generateWaveform(inputPath, samples = MP3_CONFIG.WAVEFORM.DEFAULT_SAMPLES) {
    return new Promise((resolve, reject) => {
      const waveformData = [];
      let dataCount = 0;
      
      ffmpeg(inputPath)
        .audioFilters([
          `aresample=${MP3_CONFIG.WAVEFORM.SAMPLE_RATE}`,
          'aformat=sample_fmts=s16:channel_layouts=mono'
        ])
        .format('wav')
        .on('error', (error) => {
          reject(new Error(`Waveform generation failed: ${error.message}`));
        })
        .on('end', () => {
          // Normalize waveform to requested sample count
          const step = Math.floor(waveformData.length / samples);
          const normalizedData = [];
          
          for (let i = 0; i < samples && i * step < waveformData.length; i++) {
            normalizedData.push(waveformData[i * step] || 0);
          }
          
          resolve({
            waveform: normalizedData,
            samples: normalizedData.length,
            originalSamples: waveformData.length
          });
        })
        .pipe()
        .on('data', (chunk) => {
          // Process audio data chunks
          for (let i = 0; i < chunk.length && dataCount < samples * 10; i += 2) {
            const sample = chunk.readInt16LE(i);
            const normalizedSample = Math.abs(sample) / 32768; // Normalize to 0-1
            waveformData.push(normalizedSample);
            dataCount++;
          }
        });
    });
  }

  /**
   * Convert audio format
   */
  static async convertFormat(inputPath, outputPath, targetFormat, quality = 'medium') {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      
      // Set output quality
      command = this.setOutputQuality(command, targetFormat, quality);

      command
        .output(outputPath)
        .on('error', (error) => {
          reject(new Error(`Format conversion failed: ${error.message}`));
        })
        .on('end', () => {
          resolve({
            success: true,
            inputPath,
            outputPath,
            format: targetFormat,
            quality
          });
        })
        .run();
    });
  }

  /**
   * Set output quality based on format and quality preset
   */
  static setOutputQuality(command, format, quality) {
    console.log(`🎛️ [setOutputQuality] Setting quality for format: ${format}, quality: ${quality}`);
    
    const qualitySettings = MP3_CONFIG.QUALITY_PRESETS[quality];
    
    if (!qualitySettings || !qualitySettings[format]) {
      console.error(`❌ [setOutputQuality] Unsupported format/quality combination:`, {
        format,
        quality,
        availableQualities: Object.keys(MP3_CONFIG.QUALITY_PRESETS),
        availableFormats: qualitySettings ? Object.keys(qualitySettings) : 'N/A'
      });
      throw new Error(`Unsupported format/quality combination: ${format}/${quality}`);
    }

    const settings = qualitySettings[format];
    console.log(`🔧 [setOutputQuality] Using settings for ${format}:`, settings);
    
    // Set audio codec
    command = command.audioCodec(settings.codec);
    
    // Set bitrate if specified
    if (settings.bitrate) {
      command = command.audioBitrate(settings.bitrate);
    }

    // 🚨 **M4R SPECIAL HANDLING**: M4R needs special container format
    if (format === 'm4r') {
      console.log('🎵 [setOutputQuality] M4R SPECIAL HANDLING: Setting MP4 container format');
      // 🎯 **FORCE MP4 CONTAINER**: M4R is basically AAC in MP4 container with .m4r extension
      command = command.format('mp4');
      
      // 🔧 **M4R SPECIFIC OPTIONS**: Additional options for M4R compatibility
      command = command.outputOptions([
        '-f', 'mp4',           // Force MP4 container
        '-movflags', '+faststart' // Optimize for playback
      ]);
      
      console.log('✅ [setOutputQuality] M4R format configured with MP4 container');
    } else if (format === 'm4a') {
      console.log('🎵 [setOutputQuality] M4A: Setting MP4 container format');
      // 🎯 **M4A CONTAINER**: M4A also uses MP4 container
      command = command.format('mp4');
      command = command.outputOptions([
        '-f', 'mp4',
        '-movflags', '+faststart'
      ]);
      console.log('✅ [setOutputQuality] M4A format configured with MP4 container');
    } else if (format === 'flac') {
      console.log('🎵 [setOutputQuality] FLAC: Setting FLAC container format');
      command = command.format('flac');
    } else if (format === 'ogg') {
      console.log('🎵 [setOutputQuality] OGG: Setting OGG container format');
      command = command.format('ogg');
    }
    // 🚫 **NO EXPLICIT FORMAT**: MP3, WAV, AAC use default container detection

    console.log(`✅ [setOutputQuality] Quality configuration completed for ${format}`);
    return command;
  }

  /**
   * Generate unique output filename
   */
  static generateOutputFilename(originalFilename, suffix = '', format = 'mp3') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseName = path.parse(originalFilename).name;
    
    return `${baseName}_${suffix}_${timestamp}_${random}.${format}`;
  }

  /**
   * Ensure directory exists
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Get file extension from path
   */
  static getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase().slice(1);
  }

  /**
   * Get MIME type for audio format
   */
  static getMimeType(format) {
    return MIME_TYPES[format] || 'application/octet-stream';
  }

  /**
   * Validate audio file format
   */
  static isValidAudioFormat(filename) {
    const ext = this.getFileExtension(filename);
    return MP3_CONFIG.SUPPORTED_INPUT_FORMATS.includes(ext);
  }

  /**
   * Validate output format
   */
  static isValidOutputFormat(format) {
    return MP3_CONFIG.SUPPORTED_OUTPUT_FORMATS.includes(format);
  }

  /**
   * Calculate file duration from start/end times
   */
  static calculateDuration(startTime, endTime) {
    return endTime > startTime ? endTime - startTime : 0;
  }

  /**
   * Format time in seconds to MM:SS format
   */
  static formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Test FFmpeg availability
   */
  static async testFFmpeg() {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .version((err, version) => {
          if (err) {
            reject(new Error(`FFmpeg not available: ${err.message}`));
          } else {
            resolve(version);
          }
        });
    });
  }

  /**
   * 🆕 **CUT AUDIO INVERT MODE**: Cut and concatenate segments outside selected region with smart edge case handling
   */
  static async cutAudioInvertMode(inputPath, outputPath, options = {}) {
    const {
      startTime = 0,
      endTime,
      fadeIn = 0,
      fadeOut = 0,
      format = 'mp3',
      quality = 'medium',
      playbackRate = 1,
      sessionId = null
    } = options;

    // 🧠 **GET AUDIO DURATION**: First get audio duration to calculate segments properly
    const audioInfo = await this.getAudioInfo(inputPath);
    const totalDuration = audioInfo.duration;

    // 🎯 **SMART SEGMENT CALCULATION**: Calculate which segments to include
    const active1Duration = startTime; // 0 → startTime
    const active2Duration = totalDuration - endTime; // endTime → duration
    
    // 🎯 **TOTAL DURATION CHECK**: Check total duration of active regions
    const totalActiveRegionDuration = active1Duration + active2Duration;
    
    // 🚫 **ERROR CHECK**: Total duration too short
    if (totalActiveRegionDuration < 0.1) {
      throw new Error('Please select a cut length greater than 0.1 seconds.');
    }
    
    // 🎯 **INDIVIDUAL SEGMENT CHECK**: For processing logic
    const hasActive1 = active1Duration > 0;
    const hasActive2 = active2Duration > 0;

    console.log('🔄 [cutAudioInvertMode] Smart invert mode analysis:', {
      totalDuration: totalDuration.toFixed(2) + 's',
      startTime: startTime.toFixed(2) + 's',
      endTime: endTime.toFixed(2) + 's',
      active1Duration: active1Duration.toFixed(2) + 's',
      active2Duration: active2Duration.toFixed(2) + 's',
      hasActive1,
      hasActive2,
      mode: hasActive1 && hasActive2 ? 'BOTH_SEGMENTS' : hasActive1 ? 'ONLY_SEGMENT_1' : hasActive2 ? 'ONLY_SEGMENT_2' : 'NO_SEGMENTS'
    });

    // 🚫 **ERROR CHECK**: No valid segments
    if (!hasActive1 && !hasActive2) {
      throw new Error('No active segments to export in invert mode');
    }

    // 🔌 **WEBSOCKET PROGRESS EMITTER**: Function để emit progress
    const emitProgress = (progressData) => {
      if (sessionId && global.io) {
        const roomName = `progress-${sessionId}`;
        global.io.to(roomName).emit('cut-progress', {
          sessionId,
          ...progressData,
          timestamp: new Date().toISOString()
        });
      }
    };

    return new Promise((resolve, reject) => {
      try {
        // 📊 **INITIAL PROGRESS**: Emit starting progress
        emitProgress({
          stage: 'initializing',
          percent: 0,
          message: 'Initializing smart invert mode...'
        });

        let command = ffmpeg(inputPath);
        const filters = [];

        // 🎯 **CASE 1: Only Segment 1** (startTime > 0, endTime = duration)
        if (hasActive1 && !hasActive2) {
          console.log('🎯 [cutAudioInvertMode] CASE 1: Only active segment 1 (0 → startTime)');
          
          const trimFilter = `[0:a]atrim=start=0:end=${startTime}[seg1]`;
          filters.push(trimFilter);

          // Apply speed if needed
          if (playbackRate !== 1) {
            const atempoChain = this.buildAtempoChain(playbackRate);
            const speedFilter = `[seg1]${atempoChain}[out]`;
            filters.push(speedFilter);
          } else {
            // Just rename the output
            const renameFilter = `[seg1]anull[out]`;
            filters.push(renameFilter);
          }
        }
        // 🎯 **CASE 2: Only Segment 2** (startTime = 0, endTime < duration)  
        else if (!hasActive1 && hasActive2) {
          console.log('🎯 [cutAudioInvertMode] CASE 2: Only active segment 2 (endTime → duration)');
          
          const trimFilter = `[0:a]atrim=start=${endTime}[seg2]`;
          filters.push(trimFilter);

          // Apply speed if needed
          if (playbackRate !== 1) {
            const atempoChain = this.buildAtempoChain(playbackRate);
            const speedFilter = `[seg2]${atempoChain}[out]`;
            filters.push(speedFilter);
          } else {
            // Just rename the output
            const renameFilter = `[seg2]anull[out]`;
            filters.push(renameFilter);
          }
        }
        // 🎯 **CASE 3: Both Segments** (startTime > 0, endTime < duration)
        else if (hasActive1 && hasActive2) {
          console.log('🎯 [cutAudioInvertMode] CASE 3: Both active segments - concatenation mode');
          
          // Extract both segments
          const segment1Filter = `[0:a]atrim=start=0:end=${startTime}[seg1]`;
          const segment2Filter = `[0:a]atrim=start=${endTime}[seg2]`;
          filters.push(segment1Filter);
          filters.push(segment2Filter);

          // Apply speed if needed
          if (playbackRate !== 1) {
            const atempoChain = this.buildAtempoChain(playbackRate);
            const seg1SpeedFilter = `[seg1]${atempoChain}[seg1_speed]`;
            const seg2SpeedFilter = `[seg2]${atempoChain}[seg2_speed]`;
            filters.push(seg1SpeedFilter);
            filters.push(seg2SpeedFilter);
            
            // Concatenate speed-adjusted segments
            const concatFilter = `[seg1_speed][seg2_speed]concat=n=2:v=0:a=1[out]`;
            filters.push(concatFilter);
          } else {
            // Concatenate original segments
            const concatFilter = `[seg1][seg2]concat=n=2:v=0:a=1[out]`;
            filters.push(concatFilter);
          }
        }

        // 🆕 **FADE EFFECTS**: Apply fade to final output if needed
        if (fadeIn > 0 || fadeOut > 0) {
          const fadeFilters = [];
          if (fadeIn > 0) {
            fadeFilters.push(`afade=t=in:st=0:d=${fadeIn}`);
          }
          if (fadeOut > 0) {
            fadeFilters.push(`afade=t=out:st=0:d=${fadeOut}`);
          }
          
          if (fadeFilters.length > 0) {
            const fadeFilter = `[out]${fadeFilters.join(',')}[final]`;
            filters.push(fadeFilter);
          }
        }

        // Apply complex filter
        const complexFilter = filters.join(';');
        console.log('🔗 [cutAudioInvertMode] Smart complex filter:', complexFilter);
        
        command = command.complexFilter(complexFilter);
        
        // Map output
        const outputLabel = (fadeIn > 0 || fadeOut > 0) ? '[final]' : '[out]';
        command = command.outputOptions([`-map`, outputLabel]);

        // Set output quality
        command = this.setOutputQuality(command, format, quality);

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log('🚀 [cutAudioInvertMode] Smart FFmpeg command starting:', commandLine);
            emitProgress({
              stage: 'processing',
              percent: 10,
              message: 'Processing smart invert mode...'
            });
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0);
            emitProgress({
              stage: 'processing',
              percent: Math.min(90, Math.max(10, percent)),
              message: `Processing segments... ${percent}%`
            });
          })
          .on('end', () => {
            console.log('✅ [cutAudioInvertMode] Smart invert mode completed successfully');
            emitProgress({
              stage: 'completed',
              percent: 100,
              message: 'Smart invert mode completed!'
            });
            
            const finalDuration = hasActive1 && hasActive2 ? 
              active1Duration + active2Duration : 
              hasActive1 ? active1Duration : active2Duration;
            
            resolve({
              success: true,
              settings: {
                startTime,
                endTime,
                fadeIn,
                fadeOut,
                playbackRate,
                format,
                quality,
                isInverted: true,
                duration: finalDuration,
                segmentsProcessed: hasActive1 && hasActive2 ? 'both' : hasActive1 ? 'segment1' : 'segment2'
              }
            });
          })
          .on('error', (error) => {
            console.error('❌ [cutAudioInvertMode] FFmpeg error:', error);
            emitProgress({
              stage: 'error',
              percent: 0,
              message: `Error: ${error.message}`
            });
            reject(error);
          })
          .run();

      } catch (error) {
        console.error('❌ [cutAudioInvertMode] Setup error:', error);
        emitProgress({
          stage: 'error',
          percent: 0,
          message: `Setup error: ${error.message}`
        });
        reject(error);
      }
    });
  }

  /**
   * 🆕 **BUILD ATEMPO CHAIN**: Build atempo filter chain for speed changes
   */
  static buildAtempoChain(playbackRate) {
    const atempoFilters = [];
    let currentRate = playbackRate;
    
    if (currentRate >= 0.5 && currentRate <= 2.0) {
      atempoFilters.push(`atempo=${currentRate.toFixed(3)}`);
    } else if (currentRate > 2.0) {
      while (currentRate > 2.0) {
        atempoFilters.push(`atempo=2`);
        currentRate /= 2;
      }
      if (currentRate > 1.01) {
        atempoFilters.push(`atempo=${currentRate.toFixed(3)}`);
      }
    } else if (currentRate < 0.5) {
      while (currentRate < 0.5) {
        atempoFilters.push(`atempo=0.5`);
        currentRate *= 2;
      }
      if (currentRate < 0.99) {
        atempoFilters.push(`atempo=${currentRate.toFixed(3)}`);
      }
    }
    
    return atempoFilters.join(',');
  }
}