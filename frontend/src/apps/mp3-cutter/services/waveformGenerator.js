import { WAVEFORM_CONFIG } from '../utils/constants';

export class WaveformGenerator {
  static async generateWaveform(file, options = {}) {
    const SAMPLE_COUNT = options.samples || WAVEFORM_CONFIG.SAMPLE_COUNT || 1000;
    let audioContext;
    try {
      const arrayBuffer = await file.arrayBuffer();
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);

      // Bảo đảm số sample không lớn hơn số frame
      const samples = Math.min(SAMPLE_COUNT, buffer.length);
      const blockSize = Math.floor(buffer.length / samples) || 1;
      const channelData = buffer.getChannelData(0); // chỉ dùng channel đầu tiên
      const waveData = new Array(samples);

      for (let i = 0; i < samples; i++) {
        let max = 0;
        const start = i * blockSize;
        const end = Math.min(start + blockSize, buffer.length);
        for (let j = start; j < end; j++) {
          const val = Math.abs(channelData[j]);
          if (val > max) max = val;
        }
        waveData[i] = max;
      }

      await audioContext.close();

      return {
        data: waveData,
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels
      };

    } catch (error) {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      // Nhẹ lỗi và chỉ throw thông báo thật ngắn gọn
      if (error?.name === 'EncodingError') {
        throw new Error('Audio file format is not supported or is corrupted');
      }
      if (error?.name === 'NotSupportedError') {
        throw new Error('Your browser does not support this audio format');
      }
      if (error?.message?.includes('decodeAudioData')) {
        throw new Error('Failed to decode audio data. Please check file format');
      }
      throw new Error(`Waveform generation failed: ${error?.message || error}`);
    }
  }
}
