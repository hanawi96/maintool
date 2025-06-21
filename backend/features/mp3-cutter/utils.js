// features/mp3-cutter/utils.js

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG, MIME_TYPES } from './constants.js';
import { EQParameterConverter, EQCalibrationData } from './eq-converter.js';
import { VolumeParameterConverter } from './volume-converter.js';
import { VolumeCorrection, VolumeCorrectionUtils } from './volume-correction.js';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath.path);
const ffprobe = promisify(ffmpeg.ffprobe);

// 🎚️ Initialize EQ converter with exact Web Audio API mapping
const eqConverter = new EQParameterConverter();
// 🔊 Initialize Volume converter with exact Web Audio API mapping
const volumeConverter = new VolumeParameterConverter();
// 🔧 Initialize Volume correction system
const volumeCorrection = new VolumeCorrection();

function emitProgress(sessionId, data) {
  if (sessionId && global.io) {
    global.io.to(`progress-${sessionId}`).emit('cut-progress', {
      sessionId, ...data, timestamp: new Date().toISOString()
    });
  }
}
function buildAtempoFilters(rate) {
  // Chaining atempo cho speed <0.5 hoặc >2.0
  const filters = [];
  let r = rate;
  while (r > 2.0) { filters.push('atempo=2'); r /= 2; }
  while (r < 0.5) { filters.push('atempo=0.5'); r *= 2; }
  if (Math.abs(r - 1) > 0.01) filters.push(`atempo=${r.toFixed(3)}`);
  return filters;
}

// 🎚️ NEW: Precise 10-band EQ filter builder with 1:1 Web Audio API mapping
function buildEqualizerFilter(equalizerValues) {
  console.log('🎚️ Backend buildEqualizerFilter called with:', {
    equalizerValues,
    isArray: Array.isArray(equalizerValues),
    length: equalizerValues?.length,
    hasNonZeroValues: Array.isArray(equalizerValues) ? equalizerValues.some(v => v !== 0) : false
  });
  
  if (!equalizerValues || !Array.isArray(equalizerValues) || equalizerValues.length !== 10) {
    console.log('🎚️ Backend EQ Filter: Invalid or missing equalizer values - returning null');
    return null;
  }
  
  try {
    // 🎯 Use precise EQ converter for exact Web Audio API mapping
    const conversionResult = eqConverter.convertToFFmpeg(equalizerValues, {
      skipZeroGains: true,
      gainThreshold: 0.01,
      useAccurateMapping: true
    });
    
    if (!conversionResult.hasEQ) {
      console.log('🎚️ Backend EQ Filter: All bands are near 0dB - returning null');
      return null;
    }
    
    console.log('🎚️ Backend EQ Filter Built (precise 10-band):', {
      inputBands: equalizerValues,
      activeFilters: conversionResult.totalFilters,
      skippedFilters: conversionResult.skippedFilters,
      filterString: conversionResult.filterString,
      method: 'Exact 1:1 Web Audio API mapping',
      frequencies: eqConverter.frequencies,
      mappingDetails: conversionResult.activeFilters
    });
    
    return conversionResult.filterString;
    
  } catch (error) {
    console.error('❌ EQ conversion failed:', error.message);
    
    // 🔄 Fallback to legacy method if conversion fails
    console.log('🔄 Falling back to legacy EQ method...');
    return buildLegacyEqualizerFilter(equalizerValues);
  }
}

// 🎚️ Legacy fallback EQ method (kept for emergency fallback)
function buildLegacyEqualizerFilter(equalizerValues) {
  console.log('🎚️ Using legacy EQ fallback method');
  
  // Check if all values are zero
  const hasNonZeroValues = equalizerValues.some(v => Math.abs(v) > 0.1);
  if (!hasNonZeroValues) {
    console.log('🎚️ Legacy EQ Filter: All bands are 0dB - returning null');
    return null;
  }
  
  // Simple bass/treble approach as fallback
  const bassGains = equalizerValues.slice(0, 4); // 60, 170, 310, 600 Hz
  const trebleGains = equalizerValues.slice(5); // 3000, 6000, 12000, 14000, 16000 Hz
  
  const avgBass = bassGains.reduce((sum, gain) => sum + gain, 0) / bassGains.length;
  const avgTreble = trebleGains.reduce((sum, gain) => sum + gain, 0) / trebleGains.length;
  
  const filters = [];
  
  if (Math.abs(avgBass) >= 0.1) {
    filters.push(`bass=g=${avgBass.toFixed(1)}`);
  }
  
  if (Math.abs(avgTreble) >= 0.1) {
    filters.push(`treble=g=${avgTreble.toFixed(1)}`);
  }
  
  if (filters.length > 0) {
    const eqFilter = filters.join(',');
    console.log('🎚️ Legacy EQ Filter Built:', eqFilter);
    return eqFilter;
  }
  
  return null;
}

function getFormatSettings(format, quality) {
  const preset = MP3_CONFIG.QUALITY_PRESETS[quality]?.[format];
  if (!preset) throw new Error(`Unsupported format/quality: ${format}/${quality}`);
  return preset;
}
export class MP3Utils {
  static async getAudioInfo(filePath) {
    try {
      const meta = await ffprobe(filePath);
      const audio = meta.streams.find(s => s.codec_type === 'audio');
      if (!audio) throw new Error('No audio stream');
      return {
        duration: +meta.format.duration || 0,
        size: +meta.format.size || 0,
        bitrate: +meta.format.bit_rate || 0,
        format: meta.format.format_name || 'unknown',
        codec: audio.codec_name || 'unknown',
        sampleRate: +audio.sample_rate || 0,
        channels: audio.channels || 0,
        channelLayout: audio.channel_layout || 'unknown'
      };
    } catch (e) { throw new Error(`Failed to get audio info: ${e.message}`); }
  }  static async cutAudio(inputPath, outputPath, opts = {}) {
    const {
      startTime = 0, endTime, fadeIn = 0, fadeOut = 0,
      format = 'mp3', quality = 'medium', playbackRate = 1, pitch = 0,
      volume = 1, // Thêm volume parameter
      equalizer = null, // 🎚️ Add equalizer parameter
      isInverted = false, normalizeVolume = false, sessionId = null
    } = opts;

    // 🎯 Log chi tiết FFmpeg parameters
    console.log('\n🔧 FFmpeg Processingg Details:');
    console.log('📍 Paths:', {
      input: inputPath,
      output: outputPath
    });
    console.log('⚙️ FFmpeg Options:', {
      startTime: `${startTime}s`,
      endTime: endTime ? `${endTime}s` : 'Not set',
      duration: endTime ? `${endTime - startTime}s` : 'Full duration',
      volume: `${volume * 100}% (${volume}x)`,
      speed: `${playbackRate * 100}% (${playbackRate}x)`,
      pitch: `${pitch} semitones`,
      fadeIn: `${fadeIn}s`,
      fadeOut: `${fadeOut}s`,
      equalizer: equalizer ? `10-band EQ applied` : 'No EQ',
      equalizerValues: equalizer || 'None',
      format: format,
      quality: quality,
      normalizeVolume: normalizeVolume,
      isInverted: isInverted
    });

    // 🔍 DETAILED FFMPEG PROCESSING LOG
    console.log('\n🎬 FFMPEG PROCESSING ANALYSIS:');
    console.log('📊 Input Analysis:', {
      inputPath: inputPath,
      startTime: startTime,
      endTime: endTime,
      originalDuration: endTime ? endTime - startTime : 'Full file',
      processingMode: isInverted ? 'Inverted (Remove selection)' : 'Normal (Keep selection)'
    });

    console.log('🎛️ Effects Analysis:', {
      pitch: {
        value: pitch,
        semitones: `${pitch} semitones`,
        pitchRatio: Math.pow(2, pitch/12),
        durationImpact: pitch !== 0 ? 'Will affect duration due to pitch processing' : 'No duration impact',
        ffmpegFilter: pitch !== 0 ? `asetrate=44100*${Math.pow(2, pitch/12)}, aresample=44100, atempo=${1/Math.pow(2, pitch/12)}` : 'None'
      },
      speed: {
        value: playbackRate,
        percentage: `${playbackRate * 100}%`,
        durationImpact: playbackRate !== 1 ? `Duration will be ${(1/playbackRate).toFixed(3)}x original` : 'No duration impact',
        ffmpegFilter: playbackRate !== 1 ? buildAtempoFilters(playbackRate).join(', ') : 'None'
      },
      volume: {
        value: volume,
        percentage: `${volume * 100}%`,
        durationImpact: 'No duration impact',
        ffmpegFilter: volume !== 1 ? `volume=${volume}` : 'None'
      },
      combinedDurationEffect: {
        originalDuration: endTime ? endTime - startTime : 'Unknown',
        speedAdjustedDuration: endTime ? (endTime - startTime) / playbackRate : 'Unknown',
        pitchNote: pitch !== 0 ? 'Pitch processing may cause additional duration changes' : 'No pitch effect',
        finalExpectedDuration: endTime ? (endTime - startTime) / playbackRate : 'Unknown'
      }
    });

    if (isInverted && endTime) return this.cutAudioInvertMode(inputPath, outputPath, opts);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      if (startTime > 0) command = command.seekInput(startTime);
      if (endTime && endTime > startTime) command = command.duration(endTime - startTime);

      // 🎯 Build filters with proper pitch handling
      const pitchRatio = Math.pow(2, pitch/12);
      const eqFilter = buildEqualizerFilter(equalizer);
      
      // 🔊 Convert volume using precise Web Audio API mapping with format correction
      let volumeFilter = null;
      
      // 🔧 Check if format needs encoding compensation (lossy formats)
      const needsEncodingCompensation = ['mp3', 'aac', 'ogg'].includes(format.toLowerCase());
      
      if (volume !== 1 || needsEncodingCompensation) {
        try {
          // 🔧 Apply smart volume correction for format-specific encoding loss
          const correctedVolumeConversion = volumeCorrection.smartVolumeCorrection(volume, format, quality);
          
          if (correctedVolumeConversion.hasVolumeEffect) {
            volumeFilter = correctedVolumeConversion.filterString;
            console.log('🔊 Backend Volume Filter Built (with format correction):', {
              webAudioGain: volume,
              format: format,
              quality: quality,
              needsEncodingCompensation: needsEncodingCompensation,
              uncorrectedGain: volume,
              correctedGain: correctedVolumeConversion.correction?.correctedGain,
              correctionFactor: correctedVolumeConversion.correction?.correctionFactor,
              ffmpegFilter: volumeFilter,
              percentage: `${correctedVolumeConversion.percentageValue}%`,
              method: 'Smart Volume Correction with Format Compensation'
            });
          }
        } catch (error) {
          console.error('❌ Volume correction failed:', error.message);
          
          // 🔄 Fallback to basic volume conversion
          if (volume !== 1) {
            try {
              const volumeConversion = volumeConverter.convertToFFmpeg(volume, {
                precision: 3,
                skipUnityGain: true
              });
              
              if (volumeConversion.hasVolumeEffect) {
                volumeFilter = volumeConversion.filterString;
                console.log('🔄 Using fallback volume filter (no correction):', volumeFilter);
              }
            } catch (fallbackError) {
              console.error('❌ Fallback volume conversion also failed:', fallbackError.message);
              volumeFilter = `volume=${volume}`;
              console.log('🔄 Using simple volume filter:', volumeFilter);
            }
          }
        }
      }
      
      const filters = [
        ...(volumeFilter ? [volumeFilter] : []), // 🔊 Precise Volume filter
        ...(eqFilter ? [eqFilter] : []), // 🎚️ Equalizer filter
        ...(playbackRate !== 1 ? buildAtempoFilters(playbackRate) : []), // Speed filter
        ...(pitch !== 0 ? [
          `asetrate=44100*${pitchRatio}`, // Change pitch (this also changes tempo)
          `aresample=44100`, // Resample back to 44100Hz
          ...buildAtempoFilters(1/pitchRatio) // Compensate tempo change to maintain duration
        ] : []),
        ...(normalizeVolume ? ['loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none'] : []),
        ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn}`] : []),
        ...(fadeOut > 0 && endTime > startTime
          ? [`afade=t=out:st=${Math.max(0, endTime - startTime - fadeOut)}:d=${fadeOut}`]
          : [])
      ].filter(Boolean);

      // 🎯 Log applied filters
      console.log('🎛️ Applied Audio Filters:', filters.length > 0 ? filters : ['None']);

      // 🔍 DETAILED FILTER ANALYSIS
      console.log('🔍 Filter Chain Analysis:', {
        totalFilters: filters.length,
        filterBreakdown: {
          volumeFilters: filters.filter(f => f.includes('volume')),
          equalizerFilters: filters.filter(f => f.includes('equalizer') || f.includes('bass') || f.includes('treble')),
          speedFilters: filters.filter(f => f.includes('atempo')),
          pitchFilters: filters.filter(f => f.includes('asetrate') || f.includes('aresample')),
          fadeFilters: filters.filter(f => f.includes('afade')),
          normalizeFilters: filters.filter(f => f.includes('loudnorm'))
        },
        durationAffectingFilters: {
          speedFilters: filters.filter(f => f.includes('atempo')),
          pitchFilters: filters.filter(f => f.includes('asetrate') || f.includes('aresample')),
          note: 'These filters may affect final duration'
        }
      });

      if (filters.length) command = command.audioFilters(filters);

      const { codec, bitrate } = getFormatSettings(format, quality);
      command = command.audioCodec(codec);
      if (bitrate) command = command.audioBitrate(bitrate);
      if (['m4r', 'm4a'].includes(format)) {
        command = command.format('mp4').outputOptions(['-f', 'mp4', '-movflags', '+faststart']);
      } else if (format === 'flac') command = command.format('flac');
      else if (format === 'ogg') command = command.format('ogg');

      console.log('🎬 Starting FFmpeg processing...\n');

      // 🔍 FFMPEG EXECUTION LOG
      let ffmpegCommand = '';
      let ffmpegStartTime = Date.now();

      emitProgress(sessionId, { stage: 'initializing', percent: 0, message: 'Initializing FFmpeg...' });
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          ffmpegCommand = commandLine;
          console.log('🚀 FFmpeg Command:', commandLine);
          
          // 🔍 COMMAND ANALYSIS
          console.log('\n🔍 FFMPEG COMMAND ANALYSIS:');
          console.log('📋 Command Breakdown:', {
            inputSeek: commandLine.includes('-ss') ? commandLine.match(/-ss\s+[\d.]+/)?.[0] : 'No seek',
            inputFile: commandLine.match(/-i\s+[^\s]+/)?.[0] || 'No input',
            duration: commandLine.includes('-t') ? commandLine.match(/-t\s+[\d.]+/)?.[0] : 'Full duration',
            audioCodec: commandLine.match(/-acodec\s+\w+/)?.[0] || 'Default codec',
            bitrate: commandLine.match(/-b:a\s+\w+/)?.[0] || 'Default bitrate',
            filters: commandLine.includes('-filter:a') ? commandLine.match(/-filter:a\s+[^-]+/)?.[0] : 'No filters',
            outputFile: commandLine.match(/[^\s]+\.mp3$/)?.[0] || 'Unknown output'
          });
          
          emitProgress(sessionId, { stage: 'processing', percent: 5, message: 'Started...' });
        })
        .on('progress', (progress) => {
          // 🔍 PROGRESS ANALYSIS
          if (Math.random() < 0.1) { // Log 10% of progress updates to avoid spam
            console.log('📊 FFmpeg Progress:', {
              percent: progress.percent?.toFixed(1) + '%',
              currentTime: progress.timemark,
              targetFps: progress.targetFps,
              currentFps: progress.currentFps,
              currentKbps: progress.currentKbps,
              elapsedTime: ((Date.now() - ffmpegStartTime) / 1000).toFixed(1) + 's'
            });
          }
          
          emitProgress(sessionId, {
            stage: 'processing',
            percent: Math.min(95, Math.max(5, Math.round(progress.percent || 0))),
            currentTime: progress.timemark,
            message: `Processing...`
          });
        })
        .on('end', () => {
          const processingTime = ((Date.now() - ffmpegStartTime) / 1000).toFixed(2);
          
          console.log('✅ FFmpeg processing completed successfully!\n');
          
          // 🔍 POST-PROCESSING ANALYSIS
          console.log('🎯 FFMPEG COMPLETION ANALYSIS:', {
            processingTime: processingTime + 's',
            command: ffmpegCommand,
            outputPath: outputPath,
            inputParams: {
              startTime: startTime,
              endTime: endTime,
              originalDuration: endTime ? endTime - startTime : 'Full file'
            },
            effects: {
              pitch: pitch,
              speed: playbackRate,
              volume: volume,
              hasEqualizer: !!eqFilter,
              hasFades: fadeIn > 0 || fadeOut > 0
            },
            expectedResults: {
              durationWithoutEffects: endTime ? endTime - startTime : 'Unknown',
              durationWithSpeed: endTime ? (endTime - startTime) / playbackRate : 'Unknown',
              pitchNote: pitch !== 0 ? 'Pitch may have affected final duration' : 'No pitch effect'
            }
          });
          
          emitProgress(sessionId, { stage: 'completed', percent: 100, message: 'Completed' });
          resolve({ success: true, outputPath, inputPath });
        })
        .on('error', (err) => {
          const processingTime = ((Date.now() - ffmpegStartTime) / 1000).toFixed(2);
          
          console.log('❌ FFmpeg processing failed:', err.message);
          console.log('🔍 FFmpeg Error Details:', {
            error: err.message,
            command: 'Cut with filters',
            processingTime: processingTime + 's',
            hasEqualizerFilter: !!eqFilter,
            equalizerFilter: eqFilter || 'None',
            allFilters: filters,
            inputParams: {
              startTime: startTime,
              endTime: endTime,
              pitch: pitch,
              speed: playbackRate,
              volume: volume
            }
          });
          
          // 🎚️ Check if this is an equalizer filter error and retry with fallback
          const isFilterError = err.message.includes('filter') || err.message.includes('Invalid argument') || err.message.includes('reinitializing');
          if (isFilterError && eqFilter && equalizer) {
            console.log('🔄 Retrying with fallback equalizer method...');
            
            // Build simplified bass/treble filter as fallback
            const bassGains = equalizer.slice(0, 4); // 60, 170, 310, 600 Hz
            const trebleGains = equalizer.slice(5); // 3000, 6000, 12000, 14000, 16000 Hz
            const avgBass = bassGains.reduce((sum, gain) => sum + gain, 0) / bassGains.length;
            const avgTreble = trebleGains.reduce((sum, gain) => sum + gain, 0) / trebleGains.length;
            
            const fallbackFilters = [];
            if (Math.abs(avgBass) >= 0.1) {
              fallbackFilters.push(`bass=g=${avgBass.toFixed(1)}`);
            }
            if (Math.abs(avgTreble) >= 0.1) {
              fallbackFilters.push(`treble=g=${avgTreble.toFixed(1)}`);
            }
            
            if (fallbackFilters.length > 0) {
              console.log('🎚️ Using fallback EQ:', fallbackFilters.join(','));
              
              // Rebuild filters without the problematic equalizer, use fallback instead
              const retryFilters = [
                ...(volumeFilter ? [volumeFilter] : []),
                ...fallbackFilters, // 🎚️ Use simple bass/treble fallback
                ...(playbackRate !== 1 ? buildAtempoFilters(playbackRate) : []),
                ...(pitch !== 0 ? [
                  `asetrate=44100*${pitchRatio}`,
                  `aresample=44100`,
                  ...buildAtempoFilters(1/pitchRatio)
                ] : []),
                ...(normalizeVolume ? ['loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none'] : []),
                ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn}`] : []),
                ...(fadeOut > 0 && endTime > startTime
                  ? [`afade=t=out:st=${Math.max(0, endTime - startTime - fadeOut)}:d=${fadeOut}`]
                  : [])
              ].filter(Boolean);
              
              // Retry with fallback filters
              let retryCommand = ffmpeg(inputPath);
              if (startTime > 0) retryCommand = retryCommand.seekInput(startTime);
              if (endTime && endTime > startTime) retryCommand = retryCommand.duration(endTime - startTime);
              
              if (retryFilters.length) retryCommand = retryCommand.audioFilters(retryFilters);
              
              retryCommand = retryCommand.audioCodec(codec);
              if (bitrate) retryCommand = retryCommand.audioBitrate(bitrate);
              if (['m4r', 'm4a'].includes(format)) {
                retryCommand = retryCommand.format('mp4').outputOptions(['-f', 'mp4', '-movflags', '+faststart']);
              } else if (format === 'flac') retryCommand = retryCommand.format('flac');
              else if (format === 'ogg') retryCommand = retryCommand.format('ogg');
              
              console.log('🔄 Retrying FFmpeg with fallback EQ filters:', retryFilters);
              
              retryCommand
                .output(outputPath)
                .on('start', (commandLine) => {
                  console.log('🚀 Retry FFmpeg Command:', commandLine);
                  emitProgress(sessionId, { stage: 'processing', percent: 10, message: 'Retrying with fallback EQ...' });
                })
                .on('progress', (progress) => emitProgress(sessionId, {
                  stage: 'processing',
                  percent: Math.min(95, Math.max(10, Math.round(progress.percent || 0))),
                  currentTime: progress.timemark,
                  message: `Processing with fallback EQ...`
                }))
                .on('end', () => {
                  console.log('✅ FFmpeg retry with fallback EQ completed successfully!\n');
                  emitProgress(sessionId, { stage: 'completed', percent: 100, message: 'Completed with fallback EQ' });
                  resolve({ success: true, outputPath, inputPath });
                })
                .on('error', (retryErr) => {
                  console.log('❌ FFmpeg retry also failed:', retryErr.message);
                  emitProgress(sessionId, { stage: 'error', percent: 0, message: retryErr.message });
                  reject(new Error(`Audio cutting failed (retry also failed): ${retryErr.message}`));
                }).run();
              return; // Exit without rejecting, let retry handle it
            }
          }
          
          emitProgress(sessionId, { stage: 'error', percent: 0, message: err.message });
          reject(new Error(`Audio cutting failed: ${err.message}`));
        }).run();
    });
  }  static async cutAudioInvertMode(inputPath, outputPath, opts = {}) {
    const {
      startTime = 0, endTime, fadeIn = 0, fadeOut = 0,
      format = 'mp3', quality = 'medium', playbackRate = 1, pitch = 0,
      volume = 1, // 🎯 Add missing volume parameter
      equalizer = null, // 🎚️ Add equalizer parameter
      normalizeVolume = false, sessionId = null
    } = opts;

    return new Promise((resolve, reject) => {
      const audioInfo = ffprobe(inputPath);
      
      audioInfo.then(meta => {
        const duration = +meta.format.duration || 0;
        let command = ffmpeg(inputPath);
        
        // Build complex filter for inverted cut
        const filterParts = [];
        
        // Split audio into segments: [0 to startTime] and [endTime to duration]
        if (startTime > 0) {
          filterParts.push(`[0:a]atrim=0:${startTime}[seg1]`);
        }
        if (endTime < duration) {
          filterParts.push(`[0:a]atrim=${endTime}:${duration}[seg2]`);
        }
        
        // Concatenate segments
        const segmentCount = filterParts.length;
        if (segmentCount === 0) {
          return reject(new Error('No audio segments to process in invert mode'));
        }
        
        let concatInput = '';
        if (segmentCount === 1) {
          concatInput = startTime > 0 ? '[seg1]' : '[seg2]';
        } else {
          filterParts.push(`[seg1][seg2]concat=n=2:v=0:a=1[concat]`);
          concatInput = '[concat]';
        }        // Apply audio effects
        const eqFilter = buildEqualizerFilter(equalizer);
        console.log('🎚️ Backend Invert Mode EQ Processing:', {
          equalizerInput: equalizer,
          eqFilterGenerated: eqFilter,
          willApplyEQ: !!eqFilter
        });
        
        // 🔊 Convert volume using precise Web Audio API mapping with format correction (Invert Mode)
        let volumeFilter = null;
        if (volume !== 1) {
          try {
            // 🔧 Apply smart volume correction for format-specific encoding loss (Invert Mode)
            const correctedVolumeConversion = volumeCorrection.smartVolumeCorrection(volume, format, quality);
            
            if (correctedVolumeConversion.hasVolumeEffect) {
              volumeFilter = correctedVolumeConversion.filterString;
              console.log('🔊 Backend Invert Mode Volume Filter Built (with correction):', {
                webAudioGain: volume,
                format: format,
                quality: quality,
                correctedGain: correctedVolumeConversion.correction?.correctedGain,
                correctionFactor: correctedVolumeConversion.correction?.correctionFactor,
                ffmpegFilter: volumeFilter,
                percentage: `${correctedVolumeConversion.percentageValue}%`,
                method: 'Smart Volume Correction (Invert Mode)'
              });
            }
          } catch (error) {
            console.error('❌ Invert Mode volume correction failed:', error.message);
            
            // 🔄 Fallback to basic volume conversion
            try {
              const volumeConversion = volumeConverter.convertToFFmpeg(volume, {
                precision: 3,
                skipUnityGain: true
              });
              
              if (volumeConversion.hasVolumeEffect) {
                volumeFilter = volumeConversion.filterString;
                console.log('🔄 Invert Mode fallback volume filter (no correction):', volumeFilter);
              }
            } catch (fallbackError) {
              console.error('❌ Invert Mode fallback volume conversion failed:', fallbackError.message);
              volumeFilter = `volume=${volume}`;
              console.log('🔄 Using simple volume filter in Invert Mode:', volumeFilter);
            }
          }
        }
        
        const effects = [];
        if (volumeFilter) {
          effects.push(volumeFilter); // 🔊 Precise volume effect for invert mode
        }
        if (eqFilter) {
          effects.push(eqFilter); // 🎚️ Add equalizer effect for invert mode
        }
        if (playbackRate !== 1) {
          effects.push(...buildAtempoFilters(playbackRate).map(f => f));
        }
        if (pitch !== 0) {
          const pitchRatio = Math.pow(2, pitch/12);
          effects.push(`asetrate=44100*${pitchRatio}`);
          effects.push(`aresample=44100`);
          effects.push(...buildAtempoFilters(1/pitchRatio)); // Compensate tempo change
        }
        if (normalizeVolume) {
          effects.push('loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none');
        }
        if (fadeIn > 0) {
          effects.push(`afade=t=in:st=0:d=${fadeIn}`);
        }
        if (fadeOut > 0) {
          effects.push(`afade=t=out:st=${Math.max(0, (duration - (endTime - startTime)) - fadeOut)}:d=${fadeOut}`);
        }
        
        if (effects.length > 0) {
          const effectsChain = effects.join(',');
          filterParts.push(`${concatInput}${effectsChain}[out]`);
          command = command.complexFilter(filterParts.join(';'), ['out']);
        } else {
          command = command.complexFilter(filterParts.join(';'), [concatInput.replace(/[\[\]]/g, '')]);
        }
        
        const { codec, bitrate } = getFormatSettings(format, quality);
        command = command.audioCodec(codec);
        if (bitrate) command = command.audioBitrate(bitrate);
        if (['m4r', 'm4a'].includes(format)) {
          command = command.format('mp4').outputOptions(['-f', 'mp4', '-movflags', '+faststart']);
        } else if (format === 'flac') command = command.format('flac');
        else if (format === 'ogg') command = command.format('ogg');

        emitProgress(sessionId, { stage: 'initializing', percent: 0, message: 'Initializing FFmpeg (Invert Mode)...' });
        command
          .output(outputPath)
          .on('start', () => emitProgress(sessionId, { stage: 'processing', percent: 5, message: 'Processing inverted cut...' }))
          .on('progress', (progress) => emitProgress(sessionId, {
            stage: 'processing',
            percent: Math.min(95, Math.max(5, Math.round(progress.percent || 0))),
            currentTime: progress.timemark,
            message: `Processing inverted cut...`
          }))
          .on('end', () => {
            emitProgress(sessionId, { stage: 'completed', percent: 100, message: 'Completed' });
            resolve({ success: true, outputPath, inputPath });
          })
          .on('error', (err) => {
            emitProgress(sessionId, { stage: 'error', percent: 0, message: err.message });
            reject(new Error(`Inverted audio cutting failed: ${err.message}`));
          }).run();
      }).catch(err => {
        reject(new Error(`Failed to analyze audio: ${err.message}`));
      });
    });
  }  static async changeAudioSpeed(inputPath, outputPath, opts = {}) {
    const { 
      playbackRate = 1, 
      volume = 1, 
      pitch = 0, 
      fadeIn = 0, 
      fadeOut = 0, 
      equalizer = null, // 🎚️ Add equalizer parameter
      normalizeVolume = false,
      format = 'mp3', 
      quality = 'medium' 
    } = opts;

    // 🎯 Log chi tiết change speed parameters
    console.log('\n🔧 Change Speed FFmpeg Details:');
    console.log('📍 Paths:', {
      input: inputPath,
      output: outputPath
    });    console.log('⚡ Speed Change Options:', {
      playbackRate: `${playbackRate}x (${playbackRate * 100}%)`,
      volume: `${volume * 100}% (${volume}x)`,
      pitch: `${pitch} semitones`,
      fadeIn: `${fadeIn}s`,
      fadeOut: `${fadeOut}s`,
      equalizer: equalizer ? `10-band EQ applied` : 'No EQ',
      normalizeVolume: normalizeVolume,
      format: format,
      quality: quality
    });    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      const eqFilter = buildEqualizerFilter(equalizer);
      
      // 🔊 Convert volume using precise Web Audio API mapping with format correction (Speed Change)
      let volumeFilter = null;
      if (volume !== 1) {
        try {
          // 🔧 Apply smart volume correction for format-specific encoding loss (Speed Change)
          const correctedVolumeConversion = volumeCorrection.smartVolumeCorrection(volume, format, quality);
          
          if (correctedVolumeConversion.hasVolumeEffect) {
            volumeFilter = correctedVolumeConversion.filterString;
            console.log('🔊 Backend Speed Change Volume Filter Built (with correction):', {
              webAudioGain: volume,
              format: format,
              quality: quality,
              correctedGain: correctedVolumeConversion.correction?.correctedGain,
              correctionFactor: correctedVolumeConversion.correction?.correctionFactor,
              ffmpegFilter: volumeFilter,
              percentage: `${correctedVolumeConversion.percentageValue}%`,
              method: 'Smart Volume Correction (Speed Change)'
            });
          }
        } catch (error) {
          console.error('❌ Speed Change volume correction failed:', error.message);
          
          // 🔄 Fallback to basic volume conversion
          try {
            const volumeConversion = volumeConverter.convertToFFmpeg(volume, {
              precision: 3,
              skipUnityGain: true
            });
            
            if (volumeConversion.hasVolumeEffect) {
              volumeFilter = volumeConversion.filterString;
              console.log('🔄 Speed Change fallback volume filter (no correction):', volumeFilter);
            }
          } catch (fallbackError) {
            console.error('❌ Speed Change fallback volume conversion failed:', fallbackError.message);
            volumeFilter = `volume=${volume}`;
            console.log('🔄 Using simple volume filter in Speed Change:', volumeFilter);
          }
        }
      }
      
      const filters = [
        ...(volumeFilter ? [volumeFilter] : []), // 🔊 Precise Volume filter
        ...(eqFilter ? [eqFilter] : []), // 🎚️ Equalizer filter
        ...buildAtempoFilters(playbackRate),
        ...(pitch !== 0 ? [
          `asetrate=44100*${Math.pow(2, pitch/12)}`,
          `aresample=44100`,
          ...buildAtempoFilters(1/Math.pow(2, pitch/12)) // Compensate tempo change
        ] : []),
        ...(normalizeVolume ? ['loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none'] : []),
        ...(fadeIn > 0 ? [`afade=t=in:st=0:d=${fadeIn}`] : []),
        ...(fadeOut > 0 ? [`afade=t=out:st=0:d=${fadeOut}`] : [])
      ].filter(Boolean);

      // 🎯 Log applied filters for speed change
      console.log('🎛️ Applied Speed Change Filters:', filters.length > 0 ? filters : ['None']);

      if (filters.length) command = command.audioFilters(filters);
      const { codec, bitrate } = getFormatSettings(format, quality);
      command = command.audioCodec(codec);
      if (bitrate) command = command.audioBitrate(bitrate);
      
      console.log('🎬 Starting Speed Change FFmpeg processing...\n');

      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🚀 Speed Change FFmpeg Command:', commandLine);
        })
        .on('end', () => {
          console.log('✅ Speed change processing completed successfully!\n');
          resolve({ success: true, outputPath, inputPath });
        })
        .on('error', (e) => {
          console.log('❌ Speed change processing failed:', e.message);
          reject(new Error(`Speed change failed: ${e.message}`));
        })
        .run();
    });
  }

  // Alias for service compatibility
  static async changeSpeed(inputPath, outputPath, opts = {}) {
    return this.changeAudioSpeed(inputPath, outputPath, opts);
  }

  // 🆕 Process regions sequentially and concatenate
  static async processRegionsSequentially(inputPath, outputPath, timeline, globalParams = {}) {
    console.log('\n🔧 SEQUENTIAL REGIONS PROCESSING');
    console.log('📋 Timeline:', timeline.length, 'segments');
    
    const tempDir = path.resolve(MP3_CONFIG.PATHS.PROCESSED, 'temp');
    await this.ensureDirectory(tempDir);
    
    const segmentFiles = [];
    let totalDuration = 0;
    
    try {
      // Process each segment
      for (let i = 0; i < timeline.length; i++) {
        const segment = timeline[i];
        const segmentFilename = `segment_${i}_${Date.now()}.wav`;
        const segmentPath = path.resolve(tempDir, segmentFilename);
        
        console.log(`🔧 Processing segment ${i + 1}/${timeline.length}:`, {
          start: segment.start,
          end: segment.end,
          duration: segment.end - segment.start,
          type: segment.type,
          effects: segment.effects
        });
        
        // Extract and process segment
        await this.cutAudio(inputPath, segmentPath, {
          startTime: segment.start,
          endTime: segment.end,
          volume: segment.effects.volume,
          playbackRate: segment.effects.playbackRate,
          pitch: segment.effects.pitch,
          fadeIn: segment.effects.fadeIn,
          fadeOut: segment.effects.fadeOut,
          equalizer: globalParams.equalizer,
          format: 'wav', // Use WAV for intermediate files to avoid quality loss
          quality: 'high',
          normalizeVolume: false, // Apply normalization at the end
          sessionId: globalParams.sessionId
        });
        
        segmentFiles.push(segmentPath);
        
        // Calculate duration (may be affected by speed changes)
        const segmentDuration = (segment.end - segment.start) / (segment.effects.playbackRate || 1);
        totalDuration += segmentDuration;
        
        console.log(`✅ Segment ${i + 1} processed: ${segmentDuration.toFixed(2)}s`);
      }
      
      // Concatenate all segments
      console.log('🔗 Concatenating', segmentFiles.length, 'segments...');
      await this.concatenateAudioFiles(segmentFiles, outputPath, {
        format: globalParams.outputFormat || 'mp3',
        quality: globalParams.quality || 'medium',
        normalizeVolume: globalParams.normalizeVolume,
        sessionId: globalParams.sessionId
      });
      
      console.log('✅ Sequential processing completed');
      
      return {
        totalDuration,
        segmentsProcessed: timeline.length,
        outputPath
      };
      
    } finally {
      // Cleanup temp files
      for (const tempFile of segmentFiles) {
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          console.warn('⚠️ Failed to cleanup temp file:', tempFile);
        }
      }
    }
  }

  // 🆕 Concatenate multiple audio files
  static async concatenateAudioFiles(inputFiles, outputPath, opts = {}) {
    const { format = 'mp3', quality = 'medium', normalizeVolume = false, sessionId = null } = opts;
    
    return new Promise((resolve, reject) => {
      let command = ffmpeg();
      
      // Add all input files
      inputFiles.forEach(file => {
        command = command.input(file);
      });
      
      // Build filter for concatenation
      const inputsFilter = inputFiles.map((_, i) => `[${i}:0]`).join('');
      const concatFilter = `${inputsFilter}concat=n=${inputFiles.length}:v=0:a=1[out]`;
      
      // Apply filters
      const filters = [concatFilter];
      if (normalizeVolume) {
        filters.push('[out]loudnorm=I=-16:TP=-1.5:LRA=11:print_format=none[normalized]');
        command = command.complexFilter(filters.join(';')).map('[normalized]');
      } else {
        command = command.complexFilter(concatFilter).map('[out]');
      }
      
      // Set output format
      const { codec, bitrate } = getFormatSettings(format, quality);
      command = command.audioCodec(codec);
      if (bitrate) command = command.audioBitrate(bitrate);
      
      if (['m4r', 'm4a'].includes(format)) {
        command = command.format('mp4').outputOptions(['-f', 'mp4', '-movflags', '+faststart']);
      } else if (format === 'flac') {
        command = command.format('flac');
      } else if (format === 'ogg') {
        command = command.format('ogg');
      }
      
      console.log('🔗 Starting concatenation...');
      
      emitProgress(sessionId, { stage: 'concatenating', percent: 0, message: 'Concatenating segments...' });
      
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🚀 Concatenation Command:', commandLine);
          emitProgress(sessionId, { stage: 'concatenating', percent: 10, message: 'Started concatenation...' });
        })
        .on('progress', (progress) => {
          emitProgress(sessionId, {
            stage: 'concatenating',
            percent: Math.min(95, Math.max(10, Math.round(progress.percent || 0))),
            currentTime: progress.timemark,
            message: 'Concatenating segments...'
          });
        })
        .on('end', () => {
          console.log('✅ Concatenation completed successfully!');
          emitProgress(sessionId, { stage: 'completed', percent: 100, message: 'Concatenation completed' });
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.error('❌ Concatenation failed:', err.message);
          emitProgress(sessionId, { stage: 'error', percent: 0, message: err.message });
          reject(new Error(`Concatenation failed: ${err.message}`));
        })
        .run();
    });
  }

  static async generateWaveform(filePath, samples = 1000) {
    return new Promise((resolve, reject) => {
      const waveformData = [];
      
      ffmpeg(filePath)
        .audioFilters(`aresample=8000,volume=1.0`)
        .format('f32le')
        .output('-')
        .on('error', (err) => reject(new Error(`Waveform generation failed: ${err.message}`)))
        .on('end', () => {
          // Simple waveform generation - for production should use more sophisticated method
          const targetSamples = Math.min(samples, waveformData.length);
          const downsampledData = [];
          const step = Math.max(1, Math.floor(waveformData.length / targetSamples));
          
          for (let i = 0; i < waveformData.length; i += step) {
            const chunk = waveformData.slice(i, i + step);
            const avg = chunk.reduce((sum, val) => sum + Math.abs(val), 0) / chunk.length;
            downsampledData.push(avg || 0);
          }
          
          resolve({
            samples: downsampledData.slice(0, samples),
            sampleRate: 8000,
            duration: downsampledData.length / 8000,
            peaks: Math.max(...downsampledData)
          });
        })
        .pipe()
        .on('data', (chunk) => {
          // Convert buffer to float32 values
          for (let i = 0; i < chunk.length; i += 4) {
            const value = chunk.readFloatLE(i);
            if (!isNaN(value)) waveformData.push(value);
          }
        });
    });
  }

  static generateOutputFilename(originalFilename, operation, format) {
    const name = path.parse(originalFilename).name;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${name}_${operation}_${timestamp}_${random}.${format}`;
  }

  static async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // ...Các hàm còn lại giữ nguyên, format lại code style, dùng helper chung
  // (getMimeType, ensureDirectory, formatTime, ...)
}
