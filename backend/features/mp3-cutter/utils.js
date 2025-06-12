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
   * 🔇 **DETECT AND REMOVE SILENCE**: Detect and remove silent parts from audio using FFmpeg
   */
  static async detectAndRemoveSilence(inputPath, outputPath, options = {}) {
    const {
      threshold = -40, // dB
      minDuration = 0.5, // seconds
      format = 'mp3',
      quality = 'medium'
    } = options;

    return new Promise((resolve, reject) => {
      try {
        // 🔇 **SILENCE DETECTION & REMOVAL**: Combined approach for better results
        // Use silencedetect to log segments AND silenceremove to process audio
        const silenceDetectFilter = `silencedetect=noise=${threshold}dB:d=${minDuration}`;
        const silenceRemoveFilter = `silenceremove=window=0:detection=peak:stop_mode=all:start_threshold=${threshold}dB:stop_threshold=${threshold}dB:start_silence=${minDuration}:stop_silence=${minDuration}`;
        
        let command = ffmpeg(inputPath);
        
        // Apply both filters: detect for logging, remove for processing
        command = command.audioFilters([silenceDetectFilter, silenceRemoveFilter]);
        
        // Set output quality
        command = this.setOutputQuality(command, format, quality);

        let silentSegments = [];
        let currentSilenceStart = null;

        command
          .output(outputPath)
          .on('start', (commandLine) => {
            // Processing started
          })
          .on('stderr', (stderrLine) => {
            // Parse silence detection output from silencedetect filter
            if (stderrLine.includes('silencedetect')) {
              // Extract silence start times
              const silenceStartMatch = stderrLine.match(/silence_start: ([\d.]+)/);
              if (silenceStartMatch) {
                currentSilenceStart = parseFloat(silenceStartMatch[1]);
              }
              
              // Extract silence end times and calculate duration
              const silenceEndMatch = stderrLine.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
              if (silenceEndMatch && currentSilenceStart !== null) {
                const end = parseFloat(silenceEndMatch[1]);
                const duration = parseFloat(silenceEndMatch[2]);
                
                silentSegments.push({ 
                  start: currentSilenceStart, 
                  end: end, 
                  duration: duration 
                });
                currentSilenceStart = null;
              }
            }
          })
          .on('progress', (progress) => {
            // Processing progress
          })
          .on('error', (error) => {
            reject(new Error(`Silence detection failed: ${error.message}`));
          })
          .on('end', () => {
            resolve({
              success: true,
              outputPath,
              inputPath,
              silentSegments,
              settings: {
                threshold,
                minDuration,
                format,
                quality,
                segmentsRemoved: silentSegments.length
              }
            });
          })
          .run();

      } catch (error) {
        reject(new Error(`Failed to setup silence detection: ${error.message}`));
      }
    });
  }
}