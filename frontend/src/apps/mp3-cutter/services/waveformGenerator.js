import { WAVEFORM_CONFIG } from '../utils/constants';

export class WaveformGenerator {
  static async generateWaveform(file) {
    console.log('🎵 [WaveformGenerator] Starting audio processing...', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      fileType: file.type
    });

    try {
      // 🎯 Step 1: Convert file to ArrayBuffer
      console.log('📁 [WaveformGenerator] Converting file to ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ [WaveformGenerator] ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');

      // 🎯 Step 2: Create AudioContext
      console.log('🎧 [WaveformGenerator] Creating AudioContext...');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('✅ [WaveformGenerator] AudioContext created, sample rate:', audioContext.sampleRate);

      // 🎯 Step 3: Decode audio data
      console.log('🔊 [WaveformGenerator] Decoding audio data...');
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('✅ [WaveformGenerator] Audio decoded:', {
        duration: buffer.duration.toFixed(2) + 's',
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        length: buffer.length
      });

      // 🎯 Step 4: Extract waveform data
      const { SAMPLE_COUNT } = WAVEFORM_CONFIG;
      console.log('📊 [WaveformGenerator] Extracting waveform data...', {
        targetSamples: SAMPLE_COUNT,
        bufferLength: buffer.length
      });

      const blockSize = Math.floor(buffer.length / SAMPLE_COUNT);
      const channelData = buffer.getChannelData(0); // Use first channel
      const waveData = [];
      
      console.log('🎯 [WaveformGenerator] Processing blocks...', {
        blockSize,
        totalBlocks: SAMPLE_COUNT
      });

      // 🎯 Process audio blocks
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, buffer.length); // Prevent overflow
        let max = 0;
        
        // Find maximum amplitude in this block
        for (let j = start; j < end; j++) {
          const sample = Math.abs(channelData[j]);
          if (sample > max) max = sample;
        }
        
        waveData.push(max);
      }

      // 🎯 Step 5: Validate waveform data
      console.log('🔍 [WaveformGenerator] Validating waveform data...');
      const maxValue = Math.max(...waveData);
      const minValue = Math.min(...waveData);
      const avgValue = waveData.reduce((sum, val) => sum + val, 0) / waveData.length;
      
      console.log('📈 [WaveformGenerator] Waveform statistics:', {
        samples: waveData.length,
        maxAmplitude: maxValue.toFixed(4),
        minAmplitude: minValue.toFixed(4),
        avgAmplitude: avgValue.toFixed(4),
        nonZeroSamples: waveData.filter(val => val > 0).length
      });

      // 🎯 Step 6: Cleanup and return
      console.log('🧹 [WaveformGenerator] Cleaning up AudioContext...');
      audioContext.close();

      const result = {
        data: waveData,
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels
      };

      console.log('✅ [WaveformGenerator] Waveform generation complete:', {
        dataLength: result.data.length,
        duration: result.duration.toFixed(2) + 's',
        sampleRate: result.sampleRate,
        channels: result.numberOfChannels
      });

      return result;
      
    } catch (error) {
      console.error('❌ [WaveformGenerator] Generation failed:', error);
      console.error('🔍 [WaveformGenerator] Error details:', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      // 🎯 Provide specific error context
      if (error.name === 'EncodingError') {
        throw new Error('Audio file format is not supported or corrupted');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Your browser does not support this audio format');
      } else if (error.message.includes('decodeAudioData')) {
        throw new Error('Failed to decode audio data. Please check file format');
      } else {
        throw new Error(`Waveform generation failed: ${error.message}`);
      }
    }
  }
}