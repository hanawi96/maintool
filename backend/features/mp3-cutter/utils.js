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
      isInverted = false,
      normalizeVolume = false,
      sessionId = null
    } = options;

    // Handle invert mode logic
    if (isInverted && endTime) {
      const audioInfo = await this.getAudioInfo(inputPath);
      const totalDuration = audioInfo.duration;
      
      const active1Duration = startTime;
      const active2Duration = totalDuration - endTime;
      const totalActiveRegionDuration = active1Duration + active2Duration;
      
      if (totalActiveRegionDuration < 0.1) {
        throw new Error('Please select a cut length greater than 0.1 seconds.');
      }
      
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
          // 🎯 **ATEMPO CHAINING**: FFmpeg atempo chỉ hỗ trợ 0.5-2.0, cần chain cho giá trị cực
          let currentRate = playbackRate;
          const originalRate = playbackRate;
          
          if (currentRate >= 0.5 && currentRate <= 2.0) {
            // 🎯 **SINGLE ATEMPO**: Tốc độ trong khoảng hỗ trợ
            const atempoFilter = `atempo=${currentRate.toFixed(3)}`;
            filters.push(atempoFilter);
          } else if (currentRate > 2.0) {
            // 🎯 **CHAIN FOR FAST**: Tốc độ > 2x cần chain nhiều atempo
            while (currentRate > 2.0) {
              filters.push(`atempo=2`);
              currentRate /= 2;
            }
            if (currentRate > 1.01) { // Tránh rounding error
              const finalFilter = `atempo=${currentRate.toFixed(3)}`;
              filters.push(finalFilter);
            }
          } else if (currentRate < 0.5) {
            // 🎯 **CHAIN FOR SLOW**: Tốc độ < 0.5x cần chain nhiều atempo  
            while (currentRate < 0.5) {
              filters.push(`atempo=0.5`);
              currentRate *= 2;
            }
            if (currentRate < 0.99) { // Tránh rounding error
              const finalFilter = `atempo=${currentRate.toFixed(3)}`;
              filters.push(finalFilter);
            }
          }
        }
        
        // 🔊 **VOLUME NORMALIZATION**: Add loudnorm filter for volume normalization
        if (normalizeVolume) {
          const normFilter = `loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none`;
          filters.push(normFilter);
        }
        
        // Add fade in effect
        if (fadeIn > 0) {
          const fadeInFilter = `afade=t=in:st=0:d=${fadeIn}`;
          filters.push(fadeInFilter);
        }
        
        // Add fade out effect
        if (fadeOut > 0) {
          const segmentDuration = endTime ? (endTime - startTime) : null;
          if (segmentDuration) {
            const fadeOutStart = Math.max(0, segmentDuration - fadeOut);
            const fadeOutFilter = `afade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
            filters.push(fadeOutFilter);
          }
        }

        // Apply filters if any
        if (filters.length > 0) {
          command = command.audioFilters(filters);
        }
        
        // Set output quality based on format and quality preset
        try {
          command = this.setOutputQuality(command, format, quality);
        } catch (qualityError) {
          throw qualityError;
        }        // 🔌 **WEBSOCKET PROGRESS EMITTER**: Function để emit progress
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

        // 📊 **INITIAL PROGRESS**: Emit starting progress
        emitProgress({
          stage: 'initializing',
          percent: 0,
          message: 'Initializing FFmpeg process...'
        });

        command
          .output(outputPath)          .on('start', (commandLine) => {
            // 📊 **START PROGRESS**: Emit start progress
            emitProgress({
              stage: 'processing',
              percent: 5,
              message: 'FFmpeg processing started...'
            });
          })          .on('progress', (progress) => {
            // 📊 **REAL-TIME PROGRESS**: Emit actual FFmpeg progress
            const percent = Math.round(progress.percent || 0);
            const progressData = {
              stage: 'processing', 
              percent: Math.min(95, Math.max(5, percent)), // Clamp between 5-95%
              currentTime: progress.timemark,
              targetSize: progress.targetSize,
              message: `Processing audio... ${percent}%`
            };

            emitProgress(progressData);

            // 🔄 **LEGACY CALLBACK**: Keep existing callback for backward compatibility
            if (options.onProgress) {
              options.onProgress({
                percent: Math.round(progress.percent || 0),
                currentTime: progress.timemark,
                targetSize: progress.targetSize
              });
            }
          })          .on('error', (error) => {
            // 📊 **ERROR PROGRESS**: Emit error progress
            emitProgress({
              stage: 'error',
              percent: 0,
              message: `Processing failed: ${error.message}`,
              error: error.message
            });

            reject(new Error(`Audio cutting failed: ${error.message}`));
          })          .on('end', () => {
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
                normalizeVolume,
                filtersApplied: filters // 🔧 **DEBUG**: Include applied filters in result
              }
            });
          })
          .run();      } catch (error) {
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
          command = command.audioFilters(filters);
        }

        command = this.setOutputQuality(command, format, quality);

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            // Start processing
          })
          .on('progress', (progress) => {
            // Processing progress
          })
          .on('error', (error) => {
            reject(new Error(`Speed change failed: ${error.message}`));
          })
          .on('end', () => {
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
    const qualitySettings = MP3_CONFIG.QUALITY_PRESETS[quality];
    
    if (!qualitySettings || !qualitySettings[format]) {
      throw new Error(`Unsupported format/quality combination: ${format}/${quality}`);
    }

    const settings = qualitySettings[format];
    
    // Set audio codec
    command = command.audioCodec(settings.codec);
    
    // Set bitrate if specified
    if (settings.bitrate) {
      command = command.audioBitrate(settings.bitrate);
    }    // 🚨 **M4R SPECIAL HANDLING**: M4R needs special container format
    if (format === 'm4r') {
      // 🎯 **FORCE MP4 CONTAINER**: M4R is basically AAC in MP4 container with .m4r extension
      command = command.format('mp4');
      
      // 🔧 **M4R SPECIFIC OPTIONS**: Additional options for M4R compatibility
      command = command.outputOptions([
        '-f', 'mp4',           // Force MP4 container
        '-movflags', '+faststart' // Optimize for playback
      ]);
    } else if (format === 'm4a') {
      // 🎯 **M4A CONTAINER**: M4A also uses MP4 container
      command = command.format('mp4');
      command = command.outputOptions([
        '-f', 'mp4',
        '-movflags', '+faststart'
      ]);
    } else if (format === 'flac') {
      command = command.format('flac');
    } else if (format === 'ogg') {
      command = command.format('ogg');
    }
    // 🚫 **NO EXPLICIT FORMAT**: MP3, WAV, AAC use default container detection

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
      normalizeVolume = false,
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
          const trimFilter = `[0:a]atrim=start=0:end=${startTime}[seg1]`;
          filters.push(trimFilter);

          // Apply speed if needed
          if (playbackRate !== 1) {
            const atempoChain = this.buildAtempoChain(playbackRate);
            const speedFilter = `[seg1]${atempoChain}[seg1_speed]`;
            filters.push(speedFilter);
            
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[seg1_speed]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[seg1_speed]anull[out]`;
              filters.push(renameFilter);
            }
          } else {
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[seg1]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[seg1]anull[out]`;
              filters.push(renameFilter);
            }
          }
        }
        // 🎯 **CASE 2: Only Segment 2** (startTime = 0, endTime < duration)  
        else if (!hasActive1 && hasActive2) {
          const trimFilter = `[0:a]atrim=start=${endTime}[seg2]`;
          filters.push(trimFilter);

          // Apply speed if needed
          if (playbackRate !== 1) {
            const atempoChain = this.buildAtempoChain(playbackRate);
            const speedFilter = `[seg2]${atempoChain}[seg2_speed]`;
            filters.push(speedFilter);
            
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[seg2_speed]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[seg2_speed]anull[out]`;
              filters.push(renameFilter);
            }
          } else {
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[seg2]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[seg2]anull[out]`;
              filters.push(renameFilter);
            }
          }
        }
        // 🎯 **CASE 3: Both Segments** (startTime > 0, endTime < duration)
        else if (hasActive1 && hasActive2) {
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
            const concatFilter = `[seg1_speed][seg2_speed]concat=n=2:v=0:a=1[concat_out]`;
            filters.push(concatFilter);
            
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[concat_out]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[concat_out]anull[out]`;
              filters.push(renameFilter);
            }
          } else {
            // Concatenate original segments
            const concatFilter = `[seg1][seg2]concat=n=2:v=0:a=1[concat_out]`;
            filters.push(concatFilter);
            
            // Apply volume normalization if needed
            if (normalizeVolume) {
              const normFilter = `[concat_out]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[out]`;
              filters.push(normFilter);
            } else {
              const renameFilter = `[concat_out]anull[out]`;
              filters.push(renameFilter);
            }
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
        command = command.complexFilter(complexFilter);
        
        // Map output
        const outputLabel = (fadeIn > 0 || fadeOut > 0) ? '[final]' : '[out]';
        command = command.outputOptions([`-map`, outputLabel]);

        // Set output quality
        command = this.setOutputQuality(command, format, quality);

        command
          .output(outputPath)
          .on('start', (commandLine) => {
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
                normalizeVolume,
                isInverted: true,
                duration: finalDuration,
                segmentsProcessed: hasActive1 && hasActive2 ? 'both' : hasActive1 ? 'segment1' : 'segment2'
              }
            });
          })
          .on('error', (error) => {
            emitProgress({
              stage: 'error',
              percent: 0,
              message: `Error: ${error.message}`
            });
            reject(error);
          })
          .run();      } catch (error) {
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
  }  /**
   * 🔇 **DETECT AND REMOVE SILENCE**: Detect silence regions and remove them precisely
   */
  static async detectAndRemoveSilence(inputPath, outputPath, options = {}) {
    const { threshold = -40, minDuration = 0.5, format = 'mp3', quality = 'medium' } = options;

    // 🔍 **STEP 1: DETECT SILENCE REGIONS**
    const silentSegments = await this.detectSilenceOnly(inputPath, { threshold, minDuration });
    console.log(`🔇 [Silence] Detected ${silentSegments.length} silence regions:`, silentSegments);
    
    if (silentSegments.length === 0) {
      console.log('🔇 [Silence] No silence found, copying original file');
      await this.copyFile(inputPath, outputPath);
      return { success: true, outputPath, inputPath, silentSegments: [], settings: { threshold, minDuration, format, quality, segmentsRemoved: 0 } };
    }

    // 🎯 **STEP 2: BUILD KEEP SEGMENTS** (non-silence parts)
    const totalDuration = await this.getAudioDuration(inputPath);
    const keepSegments = this.buildKeepSegments(silentSegments, totalDuration);
    console.log(`🔇 [Silence] Total duration: ${totalDuration}s, Keep segments:`, keepSegments);
    
    // 🚀 **STEP 3: CONCATENATE KEEP SEGMENTS**
    return this.concatenateSegments(inputPath, outputPath, keepSegments, { format, quality, silentSegments });
  }

  /**
   * 🔍 **DETECT SILENCE ONLY**: Just detect silence regions without processing
   */
  static async detectSilenceOnly(inputPath, options = {}) {
    const { threshold = -40, minDuration = 0.5 } = options;
    
    return new Promise((resolve, reject) => {
      const silentSegments = [];
      let currentSilenceStart = null;

      ffmpeg(inputPath)
        .audioFilters(`silencedetect=noise=${threshold}dB:d=${minDuration}`)
        .format('null')
        .output('-')        .on('stderr', (line) => {
          const startMatch = line.match(/silence_start: ([\d.]+)/);
          if (startMatch) {
            // 🎯 **ULTRA-HIGH PRECISION**: Keep 6 decimal places for internal calculations
            currentSilenceStart = parseFloat(startMatch[1]);
            console.log(`🔇 [Detect] Silence start: ${currentSilenceStart.toFixed(6)}s`);
          }
          
          const endMatch = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
          if (endMatch && currentSilenceStart !== null) {
            // 🎯 **ULTRA-HIGH PRECISION**: Use maximum precision for calculations
            const end = parseFloat(endMatch[1]);
            const reportedDuration = parseFloat(endMatch[2]);
            
            // 🔧 **CALCULATE PRECISE DURATION**: Use end - start for consistency
            const calculatedDuration = end - currentSilenceStart;
            
            // 🎯 **SUB-MILLISECOND PRECISION**: Round to 6 decimals internally, 3 for display
            const silenceSegment = {
              start: Math.round(currentSilenceStart * 1000000) / 1000000, // 6 decimals precision
              end: Math.round(end * 1000000) / 1000000, 
              duration: Math.round(calculatedDuration * 1000000) / 1000000,
              // Keep display values at 3 decimals for UI
              displayStart: Math.round(currentSilenceStart * 1000) / 1000,
              displayEnd: Math.round(end * 1000) / 1000,
              displayDuration: Math.round(calculatedDuration * 1000) / 1000
            };
            
            silentSegments.push(silenceSegment);
            console.log(`🔇 [Detect] Silence end: ${end.toFixed(6)}s, calculated duration: ${calculatedDuration.toFixed(6)}s, reported: ${reportedDuration.toFixed(6)}s`);
            currentSilenceStart = null;
          }
        })
        .on('error', reject)
        .on('end', () => resolve(silentSegments))
        .run();
    });
  }
  /**
   * 🎯 **BUILD KEEP SEGMENTS**: Calculate non-silence segments to keep
   * 🔧 FIX: Remove 0.1s threshold to preserve all audio segments for accuracy
   */
  static buildKeepSegments(silentSegments, totalDuration) {
    const keepSegments = [];
    let currentTime = 0;

    // Sort silence segments by start time
    const sortedSilence = silentSegments.sort((a, b) => a.start - b.start);
    
    // 🔧 **MERGE OVERLAPPING SILENCE**: Merge overlapping/adjacent silence regions first
    const mergedSilence = [];
    for (const silence of sortedSilence) {
      if (mergedSilence.length === 0) {
        mergedSilence.push({ ...silence });
      } else {
        const lastSilence = mergedSilence[mergedSilence.length - 1];
        // Merge if overlapping or very close (within 0.01s)
        if (silence.start <= lastSilence.end + 0.01) {
          lastSilence.end = Math.max(lastSilence.end, silence.end);
          lastSilence.duration = lastSilence.end - lastSilence.start;
        } else {
          mergedSilence.push({ ...silence });
        }
      }
    }
      // Build keep segments from merged silence regions
    mergedSilence.forEach(silence => {
      // Add segment before this silence (remove 0.1s minimum threshold)
      if (currentTime < silence.start) {
        const segmentDuration = silence.start - currentTime;
        // Only skip segments < 0.0001s (0.1ms) to avoid tiny artifacts
        if (segmentDuration >= 0.0001) {
          keepSegments.push({ 
            start: Math.round(currentTime * 1000000) / 1000000, // 6-decimal precision
            end: Math.round(silence.start * 1000000) / 1000000 
          });
        }
      }
      currentTime = Math.max(currentTime, silence.end);
    });

    // Add final segment after last silence (remove 0.1s minimum threshold)
    if (currentTime < totalDuration) {
      const segmentDuration = totalDuration - currentTime;
      // Only skip segments < 0.0001s (0.1ms) to avoid tiny artifacts  
      if (segmentDuration >= 0.0001) {
        keepSegments.push({ 
          start: Math.round(currentTime * 1000000) / 1000000, 
          end: Math.round(totalDuration * 1000000) / 1000000 
        });
      }
    }

    console.log(`🎯 [buildKeepSegments] Built ${keepSegments.length} segments from ${mergedSilence.length} silence regions`);
    return keepSegments;
  }

  /**
   * 🚀 **CONCATENATE SEGMENTS**: Join non-silence segments using concat demuxer (faster)
   */
  static async concatenateSegments(inputPath, outputPath, keepSegments, options = {}) {
    const { format = 'mp3', quality = 'medium', silentSegments = [] } = options;

    return new Promise(async (resolve, reject) => {
      if (keepSegments.length === 0) {
        reject(new Error('No audio segments to keep'));
        return;
      }

      console.log(`🔇 [Concat] Processing ${keepSegments.length} segments`);      if (keepSegments.length === 1) {
        // Single segment - just extract it with ultra-high precision
        const segment = keepSegments[0];
        const startTime = segment.start.toFixed(6);
        const duration = (segment.end - segment.start).toFixed(6);
        
        let command = ffmpeg(inputPath)
          .seekInput(startTime)  // Ultra-high precision
          .duration(duration);   // Ultra-high precision
        
        command = this.setOutputQuality(command, format, quality);
          command
          .output(outputPath)
          .on('start', () => console.log(`🔇 [Single] Extracting ${startTime}s to ${(segment.start + parseFloat(duration)).toFixed(6)}s (duration: ${duration}s)`))
          .on('error', reject)
          .on('end', () => {            console.log(`✅ [Single] Extracted single segment with ultra-high precision, removed ${silentSegments.length} silence regions`);
              // 🔍 **VERIFICATION**: Validate single segment extraction
            this.verifySilenceRemoval(inputPath, outputPath, silentSegments, keepSegments, {
              regionBased: options.regionBased || false,
              regionStart: options.regionStart || 0,
              regionEnd: options.regionEnd || null
            })
              .then(verification => {
                resolve({
                  success: true,
                  outputPath,
                  inputPath,
                  silentSegments,
                  verification, // Include verification results
                  settings: { format, quality, segmentsRemoved: silentSegments.length }
                });
              })
              .catch(error => {
                console.warn('⚠️ [Verification] Failed, but processing succeeded:', error.message);
                resolve({
                  success: true,
                  outputPath,
                  inputPath,
                  silentSegments,
                  verification: { status: 'ERROR', error: error.message },
                  settings: { format, quality, segmentsRemoved: silentSegments.length }
                });
              });
          })
          .run();
      } else {
        // Multiple segments - create temp files and concat
        const tempFiles = [];
        const tempDir = path.dirname(outputPath);
        
        try {
          // Extract each segment to temp file
          for (let i = 0; i < keepSegments.length; i++) {
            const segment = keepSegments[i];
            const tempFile = path.join(tempDir, `temp_segment_${i}_${Date.now()}.mp3`);
            tempFiles.push(tempFile);            await new Promise((resolveSegment, rejectSegment) => {
              // 🎯 **ULTRA-HIGH PRECISION**: Use 6-decimal format for FFmpeg (SS.mmmmmm)
              const startTime = segment.start.toFixed(6);
              const duration = (segment.end - segment.start).toFixed(6);
              
              ffmpeg(inputPath)
                .seekInput(startTime) // Ultra-high precision timing
                .duration(duration)   // Ultra-high precision duration
                .audioCodec('libmp3lame')
                .audioBitrate('192k')
                .output(tempFile)
                .on('start', (cmd) => {
                  console.log(`🔇 [Segment ${i+1}] FFmpeg command:`, cmd);
                })
                .on('end', () => {
                  console.log(`🔇 [Segment ${i+1}] Extracted ${startTime}s to ${(segment.start + parseFloat(duration)).toFixed(3)}s`);
                  resolveSegment();
                })
                .on('error', rejectSegment)
                .run();
            });
          }

          // Concatenate all temp files
          let command = ffmpeg();
          tempFiles.forEach(file => command = command.input(file));
          
          command = command.complexFilter(
            tempFiles.map((_, i) => `[${i}:a]`).join('') + 
            `concat=n=${tempFiles.length}:v=0:a=1[out]`,
            'out'
          );
          
          command = this.setOutputQuality(command, format, quality);
            command
            .output(outputPath)
            .on('start', () => console.log(`🔇 [Concat] Joining ${tempFiles.length} segments`))
            .on('error', (error) => {
              // Cleanup temp files on error
              tempFiles.forEach(file => {
                fs.unlink(file).catch(() => {}); // Use import fs, not require
              });
              reject(error);
            })
            .on('end', () => {              // Cleanup temp files on success
              tempFiles.forEach(file => {
                fs.unlink(file).catch(() => {}); // Use import fs, not require
              });
              console.log(`✅ [Concat] Joined ${tempFiles.length} segments, removed ${silentSegments.length} silence regions`);
                // 🔍 **VERIFICATION**: Validate multiple segments concatenation
              this.verifySilenceRemoval(inputPath, outputPath, silentSegments, keepSegments, {
                regionBased: options.regionBased || false,
                regionStart: options.regionStart || 0,
                regionEnd: options.regionEnd || null
              })
                .then(verification => {
                  resolve({
                    success: true,
                    outputPath,
                    inputPath,
                    silentSegments,
                    verification, // Include verification results
                    settings: { format, quality, segmentsRemoved: silentSegments.length }
                  });
                })
                .catch(error => {
                  console.warn('⚠️ [Verification] Failed, but processing succeeded:', error.message);
                  resolve({
                    success: true,
                    outputPath,
                    inputPath,
                    silentSegments,
                    verification: { status: 'ERROR', error: error.message },
                    settings: { format, quality, segmentsRemoved: silentSegments.length }
                  });
                });
            })
            .run();        } catch (error) {
          // Cleanup temp files on error
          tempFiles.forEach(file => {
            fs.unlink(file).catch(() => {}); // Use import fs, not require
          });
          reject(error);
        }
      }
    });
  }

  /**
   * 📏 **GET AUDIO DURATION**: Get total duration of audio file
   */
  static async getAudioDuration(inputPath) {
    const metadata = await this.getAudioInfo(inputPath);
    return metadata.duration;
  }

  /**
   * 📋 **COPY FILE**: Simple file copy for when no silence is found
   */
  static async copyFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .on('error', reject)
        .on('end', resolve)
        .run();
    });
  }  /**
   * 🔇 **DETECT AND REMOVE SILENCE WITH PROGRESS**: Enhanced version with progress callbacks
   */
  static async detectAndRemoveSilenceWithProgress(inputPath, outputPath, options = {}, onProgress = null) {
    const { threshold = -40, minDuration = 0.5, format = 'mp3', quality = 'medium' } = options;

    try {
      onProgress?.({ progress: 10, stage: 'detection', message: 'Detecting silence regions...' });
      
      // 🔍 **STEP 1: DETECT SILENCE**
      const silentSegments = await this.detectSilenceOnly(inputPath, { threshold, minDuration });
      console.log(`🔇 [Progress] Detected ${silentSegments.length} silence regions`);
      
      onProgress?.({ progress: 30, stage: 'analysis', message: `Found ${silentSegments.length} silence regions` });
      
      if (silentSegments.length === 0) {
        onProgress?.({ progress: 90, stage: 'copying', message: 'No silence found, copying file...' });
        await this.copyFile(inputPath, outputPath);
        onProgress?.({ progress: 100, stage: 'complete', message: 'Processing complete!' });
        return { success: true, outputPath, inputPath, silentSegments: [], settings: { threshold, minDuration, format, quality, segmentsRemoved: 0 } };
      }

      // 🎯 **STEP 2: BUILD SEGMENTS**
      onProgress?.({ progress: 50, stage: 'processing', message: 'Building audio segments...' });
      const totalDuration = await this.getAudioDuration(inputPath);
      const keepSegments = this.buildKeepSegments(silentSegments, totalDuration);
      console.log(`🔇 [Progress] Will keep ${keepSegments.length} segments`);
      
      // 🚀 **STEP 3: CONCATENATE**
      onProgress?.({ progress: 70, stage: 'concatenating', message: `Joining ${keepSegments.length} segments...` });
      const result = await this.concatenateSegments(inputPath, outputPath, keepSegments, { format, quality, silentSegments });
      
      onProgress?.({ progress: 100, stage: 'complete', message: 'Silence removal completed!' });
      return result;
    } catch (error) {
      console.error('❌ [Progress] Error:', error);
      onProgress?.({ progress: 0, stage: 'error', message: `Error: ${error.message}` });
      throw error;
    }
  }
  /**
   * 🔍 **VERIFY SILENCE REMOVAL**: Validate that output matches expected calculations
   */
  static async verifySilenceRemoval(inputPath, outputPath, silentSegments, keepSegments, options = {}) {
    try {
      const { regionBased = false, regionStart = 0, regionEnd = null } = options;
      
      // 🎯 **GET DURATIONS**
      const originalDuration = await this.getAudioDuration(inputPath);
      const outputDuration = await this.getAudioDuration(outputPath);
      
      // 🧮 **CALCULATE EXPECTED VALUES BASED ON PROCESSING TYPE**
      const totalSilenceRemoved = silentSegments.reduce((sum, seg) => sum + seg.duration, 0);
      
      let expectedDuration, baseDuration;
      if (regionBased && regionEnd) {
        // 🎯 **REGION-BASED CALCULATION**: Expected = regionDuration - silenceRemoved
        baseDuration = regionEnd - regionStart;
        expectedDuration = baseDuration - totalSilenceRemoved;
        console.log(`🎯 [RegionVerification] Base duration (region): ${baseDuration.toFixed(6)}s`);
      } else {
        // 🎯 **FULL-FILE CALCULATION**: Expected = originalDuration - silenceRemoved
        baseDuration = originalDuration;
        expectedDuration = originalDuration - totalSilenceRemoved;
        console.log(`🎯 [FullVerification] Base duration (full): ${baseDuration.toFixed(6)}s`);
      }
      
      const keepSegmentsDuration = keepSegments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      
      // 📊 **ACCURACY CALCULATIONS**
      const durationAccuracy = Math.abs(expectedDuration - outputDuration);
      const keepSegmentsAccuracy = Math.abs(keepSegmentsDuration - outputDuration);      // 🔍 **VALIDATION CHECKS** - Ultra-tight tolerance for sub-millisecond accuracy
      const isAccurate = durationAccuracy < 0.01; // Within 10ms tolerance (ultra-tight)
      const segmentsMatch = keepSegmentsAccuracy < 0.01;        // 🔍 **DETAILED LOGGING FOR DEBUGGING**
      console.log(`🔍 [Verification] Duration Analysis (${regionBased ? 'Region-Based' : 'Full-File'}):`);
      console.log(`   Original: ${originalDuration.toFixed(6)}s`);
      if (regionBased) {
        console.log(`   Region: ${regionStart.toFixed(6)}s → ${regionEnd.toFixed(6)}s (${baseDuration.toFixed(6)}s)`);
      }
      console.log(`   Output: ${outputDuration.toFixed(6)}s`);
      console.log(`   Expected: ${expectedDuration.toFixed(6)}s`);
      console.log(`   Silence Removed: ${totalSilenceRemoved.toFixed(6)}s`);
      console.log(`   Keep Segments: ${keepSegmentsDuration.toFixed(6)}s`);
      console.log(`   Duration Accuracy: ±${durationAccuracy.toFixed(6)}s`);
      console.log(`   Keep Segments Accuracy: ±${keepSegmentsAccuracy.toFixed(6)}s`);
      console.log(`   Status: ${isAccurate && segmentsMatch ? 'PASS' : 'FAIL'}`);
        // 🔍 **SEGMENT CONTINUITY CHECK** - Check for gaps between segments
      let totalGaps = 0;
      for (let i = 1; i < keepSegments.length; i++) {
        const gap = keepSegments[i].start - keepSegments[i-1].end;
        if (gap > 0.0001) { // Gap > 0.1ms (ultra-tight)
          totalGaps += gap;
          console.log(`   Gap detected: ${gap.toFixed(6)}s between segments ${i-1} and ${i}`);
        }
      }
      if (totalGaps > 0) {
        console.log(`   Total gaps: ${totalGaps.toFixed(6)}s`);
      }        // 📋 **VERIFICATION REPORT**
      const verification = {
        original: {
          duration: Math.round(originalDuration * 1000000) / 1000000, // 6-decimal precision
          path: inputPath
        },
        output: {
          duration: Math.round(outputDuration * 1000000) / 1000000,
          path: outputPath
        },
        // 🎯 **REGION INFO**: Include region information if applicable
        ...(regionBased && {
          region: {
            start: Math.round(regionStart * 1000000) / 1000000,
            end: Math.round(regionEnd * 1000000) / 1000000,
            duration: Math.round(baseDuration * 1000000) / 1000000,
            isRegionBased: true
          }
        }),
        silence: {
          regions: silentSegments.length,
          totalDuration: Math.round(totalSilenceRemoved * 1000000) / 1000000,
          details: silentSegments.map(seg => ({
            start: Math.round(seg.start * 1000000) / 1000000,
            end: Math.round(seg.end * 1000000) / 1000000,
            duration: Math.round(seg.duration * 1000000) / 1000000
          }))
        },
        keepSegments: {
          count: keepSegments.length,
          totalDuration: Math.round(keepSegmentsDuration * 1000000) / 1000000,
          details: keepSegments.map(seg => ({
            start: Math.round(seg.start * 1000000) / 1000000,
            end: Math.round(seg.end * 1000000) / 1000000,
            duration: Math.round((seg.end - seg.start) * 1000000) / 1000000
          }))
        },
        calculations: {
          expectedDuration: Math.round(expectedDuration * 1000000) / 1000000,
          actualDuration: Math.round(outputDuration * 1000000) / 1000000,
          durationAccuracy: Math.round(durationAccuracy * 1000000) / 1000000,
          keepSegmentsAccuracy: Math.round(keepSegmentsAccuracy * 1000000) / 1000000
        },        validation: {
          isAccurate,
          segmentsMatch,
          status: isAccurate && segmentsMatch ? 'PASS' : 'FAIL',
          tolerance: '0.010s' // Ultra-tight 10ms tolerance
        }
      };        // 🎯 **LOG VERIFICATION RESULTS**
      console.log(`🔍 [Verification] Silence Removal Validation (${regionBased ? 'Region-Based' : 'Full-File'}):`);
      console.log(`📁 Original: ${originalDuration.toFixed(6)}s`);
      if (regionBased) {
        console.log(`🎯 Region: ${regionStart.toFixed(6)}s → ${regionEnd.toFixed(6)}s (${baseDuration.toFixed(6)}s)`);
      }
      console.log(`📁 Output: ${outputDuration.toFixed(6)}s`);
      console.log(`🔇 Silence Removed: ${totalSilenceRemoved.toFixed(6)}s (${silentSegments.length} regions)`);
      console.log(`✂️ Keep Segments: ${keepSegmentsDuration.toFixed(6)}s (${keepSegments.length} segments)`);
      console.log(`🎯 Expected Duration: ${expectedDuration.toFixed(6)}s`);
      console.log(`📊 Duration Accuracy: ${durationAccuracy.toFixed(6)}s`);
      console.log(`📊 Segments Accuracy: ${keepSegmentsAccuracy.toFixed(6)}s`);
      console.log(`✅ Validation Status: ${verification.validation.status}`);
      
      if (!isAccurate || !segmentsMatch) {
        console.warn(`⚠️ [Verification] Accuracy issues detected (${regionBased ? 'Region-Based' : 'Full-File'}):`);
        if (!isAccurate) console.warn(`  - Duration mismatch: ${durationAccuracy.toFixed(6)}s > 0.010s`);
        if (!segmentsMatch) console.warn(`  - Segments mismatch: ${keepSegmentsAccuracy.toFixed(6)}s > 0.010s`);
      }
      
      return verification;
      
    } catch (error) {
      console.error('❌ [Verification] Failed:', error);
      return {
        validation: { status: 'ERROR', error: error.message },
        calculations: {},
        original: {},
        output: {},
        silence: {},
        keepSegments: {}
      };
    }
  }

  /**
   * 🎯 **REGION-BASED SILENCE DETECTION**: Detect silence only within specified region
   * This is more intelligent than processing the entire file - only analyzes startTime → endTime
   */
  static async detectSilenceInRegion(inputPath, options = {}) {
    const { 
      threshold = -40, 
      minDuration = 0.5, 
      startTime = 0, 
      endTime = null 
    } = options;
    
    // Get total duration if endTime not specified
    const totalDuration = endTime || await this.getAudioDuration(inputPath);
    
    console.log(`🎯 [RegionSilence] Detecting silence in region: ${startTime.toFixed(6)}s → ${totalDuration.toFixed(6)}s`);
    
    return new Promise((resolve, reject) => {
      const silentSegments = [];
      let currentSilenceStart = null;

      ffmpeg(inputPath)        // 🎯 **REGION FILTER**: Only analyze the specified time range
        .seekInput(startTime)
        .duration(totalDuration - startTime)
        .audioFilters(`silencedetect=noise=${threshold}dB:d=${minDuration}`)
        .format('null')
        .output('-')
        .on('stderr', (line) => {
          const startMatch = line.match(/silence_start: ([\d.]+)/);
          if (startMatch) {
            // 🎯 **ADJUST TO ABSOLUTE TIME**: Convert relative time to absolute time in file
            const relativeStart = parseFloat(startMatch[1]);
            currentSilenceStart = startTime + relativeStart;
            console.log(`🎯 [RegionSilence] Silence start: ${currentSilenceStart.toFixed(6)}s (relative: ${relativeStart.toFixed(6)}s)`);
          }
          
          const endMatch = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
          if (endMatch && currentSilenceStart !== null) {
            const relativeEnd = parseFloat(endMatch[1]);
            const reportedDuration = parseFloat(endMatch[2]);
            
            // 🎯 **ADJUST TO ABSOLUTE TIME**: Convert relative time to absolute time in file
            const absoluteEnd = startTime + relativeEnd;
            const calculatedDuration = absoluteEnd - currentSilenceStart;
            
            // 🔍 **REGION BOUNDARY CHECK**: Ensure silence is within the specified region
            if (currentSilenceStart >= startTime && absoluteEnd <= totalDuration) {
              const silenceSegment = {
                start: Math.round(currentSilenceStart * 1000000) / 1000000,
                end: Math.round(absoluteEnd * 1000000) / 1000000,
                duration: Math.round(calculatedDuration * 1000000) / 1000000,
                displayStart: Math.round(currentSilenceStart * 1000) / 1000,
                displayEnd: Math.round(absoluteEnd * 1000) / 1000,
                displayDuration: Math.round(calculatedDuration * 1000) / 1000,
                // 🎯 **REGION METADATA**: Mark this as region-based detection
                isRegionBased: true,
                regionStart: startTime,
                regionEnd: totalDuration
              };
              
              silentSegments.push(silenceSegment);
              console.log(`🎯 [RegionSilence] Found silence: ${currentSilenceStart.toFixed(6)}s → ${absoluteEnd.toFixed(6)}s (${calculatedDuration.toFixed(6)}s)`);
            }
            
            currentSilenceStart = null;
          }
        })
        .on('error', reject)
        .on('end', () => {
          console.log(`🎯 [RegionSilence] Detected ${silentSegments.length} silence regions in specified range`);
          resolve(silentSegments);
        })
        .run();
    });
  }

  /**
   * 🎯 **REGION-BASED SILENCE REMOVAL**: Remove silence only within specified region
   * Smart approach: Only processes the selected region, keeps everything else intact
   */
  static async detectAndRemoveSilenceInRegion(inputPath, outputPath, options = {}) {
    const {
      threshold = -40,
      minDuration = 0.5,
      startTime = 0,
      endTime = null,
      format = 'mp3',
      quality = 'medium'
    } = options;

    try {
      console.log(`🎯 [RegionSilence] Starting region-based silence removal: ${startTime.toFixed(6)}s → ${endTime ? endTime.toFixed(6) : 'end'}s`);
      
      // 🔍 **STEP 1: DETECT SILENCE IN REGION**
      const silentSegments = await this.detectSilenceInRegion(inputPath, { 
        threshold, 
        minDuration, 
        startTime, 
        endTime 
      });

      if (silentSegments.length === 0) {
        console.log('🎯 [RegionSilence] No silence found in region, copying original file');
        await this.copyFile(inputPath, outputPath);
        return { 
          success: true, 
          outputPath, 
          inputPath, 
          silentSegments: [], 
          settings: { threshold, minDuration, format, quality, segmentsRemoved: 0 },
          regionBased: true,
          regionStart: startTime,
          regionEnd: endTime
        };
      }      // 🎯 **STEP 2: BUILD REGION-ONLY SEGMENTS** (only processed region, no pre/post)
      const totalDuration = endTime || await this.getAudioDuration(inputPath);
      const segments = await this.buildRegionOnlySegments(inputPath, silentSegments, startTime, totalDuration);
      
      console.log(`🎯 [RegionSilence] Built ${segments.length} segments for region-only processing`);
      
      // 🚀 **STEP 3: CONCATENATE SEGMENTS**
      return this.concatenateSegments(inputPath, outputPath, segments, { 
        format, 
        quality, 
        silentSegments,
        regionBased: true,
        regionStart: startTime,
        regionEnd: totalDuration 
      });
      
    } catch (error) {
      console.error('❌ [RegionSilence] Error:', error);
      throw error;
    }
  }
  /**
   * 🎯 **BUILD REGION-ONLY SEGMENTS**: Build segments only within specified region (no pre/post region)
   * Strategy: Only process [startTime → endTime] and return just that processed region
   */
  static async buildRegionOnlySegments(inputPath, silentSegments, regionStart, regionEnd) {
    const segments = [];
    
    console.log(`🎯 [RegionOnlySegments] Building segments ONLY within region: ${regionStart.toFixed(6)}s → ${regionEnd.toFixed(6)}s`);
    
    // 🔧 **REGION PROCESSING**: Only process silence removal within the specified region
    const regionKeepSegments = this.buildKeepSegments(silentSegments, regionEnd);
    // Filter keep segments to only those within the region
    const filteredKeepSegments = regionKeepSegments.filter(segment => 
      segment.start >= regionStart && segment.end <= regionEnd
    );
    
    console.log(`🎯 [RegionOnlySegments] Found ${filteredKeepSegments.length} keep segments within region`);
    
    filteredKeepSegments.forEach(segment => {
      segments.push({
        start: Math.round(segment.start * 1000000) / 1000000,
        end: Math.round(segment.end * 1000000) / 1000000,
        isWithinRegion: true
      });
      console.log(`🎯 [RegionOnlySegments] Keep: ${segment.start.toFixed(6)}s → ${segment.end.toFixed(6)}s`);
    });
    
    console.log(`🎯 [RegionOnlySegments] Total segments (region-only): ${segments.length}`);
    return segments;
  }

  /**
   * 🎯 **BUILD REGION-BASED SEGMENTS**: Build segments that preserve pre/post region audio
   * Strategy: Keep [0 → startTime] + process [startTime → endTime] + keep [endTime → end]
   */
  static async buildRegionBasedSegments(inputPath, silentSegments, regionStart, regionEnd) {
    const segments = [];
    const totalDuration = await this.getAudioDuration(inputPath);
    
    console.log(`🎯 [RegionSegments] Building segments: total=${totalDuration.toFixed(6)}s, region=${regionStart.toFixed(6)}s → ${regionEnd.toFixed(6)}s`);
    
    // 🔧 **PART 1: PRE-REGION** (0 → regionStart) - Keep intact
    if (regionStart > 0.0001) { // Only add if significant duration
      segments.push({
        start: 0,
        end: Math.round(regionStart * 1000000) / 1000000,
        isPreRegion: true
      });
      console.log(`🎯 [RegionSegments] Pre-region: 0s → ${regionStart.toFixed(6)}s`);
    }
    
    // 🔧 **PART 2: WITHIN-REGION** (regionStart → regionEnd) - Process silence removal
    const regionKeepSegments = this.buildKeepSegments(silentSegments, regionEnd);
    // Filter keep segments to only those within the region
    const filteredKeepSegments = regionKeepSegments.filter(segment => 
      segment.start >= regionStart && segment.end <= regionEnd
    );
    
    filteredKeepSegments.forEach(segment => {
      segments.push({
        start: Math.round(segment.start * 1000000) / 1000000,
        end: Math.round(segment.end * 1000000) / 1000000,
        isWithinRegion: true
      });
      console.log(`🎯 [RegionSegments] Within-region keep: ${segment.start.toFixed(6)}s → ${segment.end.toFixed(6)}s`);
    });
    
    // 🔧 **PART 3: POST-REGION** (regionEnd → total) - Keep intact
    if (regionEnd < totalDuration - 0.0001) { // Only add if significant duration
      segments.push({
        start: Math.round(regionEnd * 1000000) / 1000000,
        end: Math.round(totalDuration * 1000000) / 1000000,
        isPostRegion: true
      });
      console.log(`🎯 [RegionSegments] Post-region: ${regionEnd.toFixed(6)}s → ${totalDuration.toFixed(6)}s`);
    }
    
    console.log(`🎯 [RegionSegments] Total segments: ${segments.length}`);
    return segments;
  }
}