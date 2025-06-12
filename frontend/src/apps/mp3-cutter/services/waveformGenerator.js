import { WAVEFORM_CONFIG } from '../utils/constants';

export class WaveformGenerator {
  static async generateWaveform(file) {
    console.log('🎵 [WaveformGenerator] Starting audio processing...', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      fileType: file.type
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      const { SAMPLE_COUNT } = WAVEFORM_CONFIG;
      console.log('📊 [WaveformGenerator] Extracting waveform data...', {
        targetSamples: SAMPLE_COUNT,
        bufferLength: buffer.length
      });

      const blockSize = Math.floor(buffer.length / SAMPLE_COUNT);
      const channelData = buffer.getChannelData(0); // Use first channel
      const waveData = [];
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, buffer.length); // Prevent overflow
        let max = 0;
        for (let j = start; j < end; j++) {
          const sample = Math.abs(channelData[j]);
          if (sample > max) max = sample;
        }
        
        waveData.push(max);
      }

      // 🎯 Step 5: Validate waveform data
      const maxValue = Math.max(...waveData);
      const minValue = Math.min(...waveData);
      const avgValue = waveData.reduce((sum, val) => sum + val, 0) / waveData.length;
      
      // 🎯 Step 6: Cleanup and return
      audioContext.close();

      const result = {
        data: waveData,
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels
      };
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