// features/mp3-cutter/utils.js

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { MP3_CONFIG, MIME_TYPES } from './constants.js';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath.path);
const ffprobe = promisify(ffmpeg.ffprobe);

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
  }
  static async cutAudio(inputPath, outputPath, opts = {}) {
    const {
      startTime = 0, endTime, fadeIn = 0, fadeOut = 0,
      format = 'mp3', quality = 'medium', playbackRate = 1, pitch = 0,
      volume = 1, // Thêm volume parameter
      isInverted = false, normalizeVolume = false, sessionId = null
    } = opts;

    // 🎯 Log chi tiết FFmpeg parameters
    console.log('\n🔧 FFmpeg Processing Details:');
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
      format: format,
      quality: quality,
      normalizeVolume: normalizeVolume,
      isInverted: isInverted
    });

    if (isInverted && endTime) return this.cutAudioInvertMode(inputPath, outputPath, opts);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      if (startTime > 0) command = command.seekInput(startTime);
      if (endTime && endTime > startTime) command = command.duration(endTime - startTime);      // 🎯 Build filters with proper pitch handling
      const pitchRatio = Math.pow(2, pitch/12);
      const filters = [
        ...(volume !== 1 ? [`volume=${volume}`] : []), // Volume filter
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

      if (filters.length) command = command.audioFilters(filters);

      const { codec, bitrate } = getFormatSettings(format, quality);
      command = command.audioCodec(codec);
      if (bitrate) command = command.audioBitrate(bitrate);
      if (['m4r', 'm4a'].includes(format)) {
        command = command.format('mp4').outputOptions(['-f', 'mp4', '-movflags', '+faststart']);
      } else if (format === 'flac') command = command.format('flac');
      else if (format === 'ogg') command = command.format('ogg');

      console.log('🎬 Starting FFmpeg processing...\n');

      emitProgress(sessionId, { stage: 'initializing', percent: 0, message: 'Initializing FFmpeg...' });
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🚀 FFmpeg Command:', commandLine);
          emitProgress(sessionId, { stage: 'processing', percent: 5, message: 'Started...' });
        })
        .on('progress', (progress) => emitProgress(sessionId, {
          stage: 'processing',
          percent: Math.min(95, Math.max(5, Math.round(progress.percent || 0))),
          currentTime: progress.timemark,
          message: `Processing...`
        }))
        .on('end', () => {
          console.log('✅ FFmpeg processing completed successfully!\n');
          emitProgress(sessionId, { stage: 'completed', percent: 100, message: 'Completed' });
          resolve({ success: true, outputPath, inputPath });
        })        .on('error', (err) => {
          console.log('❌ FFmpeg processing failed:', err.message);
          emitProgress(sessionId, { stage: 'error', percent: 0, message: err.message });
          reject(new Error(`Audio cutting failed: ${err.message}`));
        }).run();
    });
  }
  static async cutAudioInvertMode(inputPath, outputPath, opts = {}) {
    const {
      startTime = 0, endTime, fadeIn = 0, fadeOut = 0,
      format = 'mp3', quality = 'medium', playbackRate = 1, pitch = 0,
      volume = 1, // 🎯 Add missing volume parameter
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
        const effects = [];
        if (volume !== 1) {
          effects.push(`volume=${volume}`); // 🎯 Add volume effect for invert mode
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
  }
  static async changeAudioSpeed(inputPath, outputPath, opts = {}) {
    const { 
      playbackRate = 1, 
      volume = 1, 
      pitch = 0, 
      fadeIn = 0, 
      fadeOut = 0, 
      normalizeVolume = false,
      format = 'mp3', 
      quality = 'medium' 
    } = opts;

    // 🎯 Log chi tiết change speed parameters
    console.log('\n🔧 Change Speed FFmpeg Details:');
    console.log('📍 Paths:', {
      input: inputPath,
      output: outputPath
    });
    console.log('⚡ Speed Change Options:', {
      playbackRate: `${playbackRate}x (${playbackRate * 100}%)`,
      volume: `${volume * 100}% (${volume}x)`,
      pitch: `${pitch} semitones`,
      fadeIn: `${fadeIn}s`,
      fadeOut: `${fadeOut}s`,
      normalizeVolume: normalizeVolume,
      format: format,
      quality: quality
    });

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
        const filters = [
        ...(volume !== 1 ? [`volume=${volume}`] : []), // Thêm volume filter
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
