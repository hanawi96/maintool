// 🚀 **WAVEFORM PROCESSING WEB WORKER** - Heavy computation off main thread
// filepath: d:\mp3-cutter-pro\frontend\public\workers\waveform-processor.js

class WaveformWorker {
  constructor() {
    this.processingQueue = [];
    this.cache = new Map();
    console.log('🔧 [WaveformWorker] Worker initialized');
  }
  // 🎯 **MAIN PROCESSING**: Enhanced with cache check
  async processAudioBuffer(audioBuffer, options = {}) {
    const startTime = performance.now();
    
    // 🔍 **CACHE CHECK**: Check cache first
    const cacheKey = this.generateCacheKey(audioBuffer, options);
    const cachedResult = this.getCacheData(cacheKey);
    
    if (cachedResult) {
      console.log('⚡ [WaveformWorker] Cache hit:', cacheKey);
      return {
        ...cachedResult,
        fromCache: true,
        processingTime: performance.now() - startTime
      };
    }

    console.log('🎵 [WaveformWorker] Processing audio buffer:', {
      duration: audioBuffer.duration.toFixed(2) + 's',
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      cacheKey
    });

    try {
      const adaptiveOptions = this.calculateAdaptiveOptions(audioBuffer, options);
      const waveformData = await this.processInChunks(audioBuffer, adaptiveOptions);
      
      const result = {
        data: waveformData,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        processingTime: performance.now() - startTime,
        quality: adaptiveOptions.quality,
        fromCache: false
      };

      // 💾 **CACHE RESULT**: Store for future use
      this.setCacheData(cacheKey, result);
      
      console.log('✅ [WaveformWorker] Processing complete:', {
        processingTime: result.processingTime.toFixed(2) + 'ms',
        dataPoints: waveformData.length,
        cached: true
      });

      return result;
    } catch (error) {
      console.error('❌ [WaveformWorker] Processing failed:', error);
      throw error;
    }
  }

  // 🧠 **ADAPTIVE QUALITY CALCULATOR**: Tự động tối ưu quality
  calculateAdaptiveOptions(audioBuffer, userOptions) {
    const duration = audioBuffer.duration;
    const fileSize = audioBuffer.length * audioBuffer.numberOfChannels * 4; // Approximate size
    
    let quality, samples, chunkSize;
    
    if (duration > 3600) { // > 1 hour
      quality = 'low';
      samples = Math.min(1000, userOptions.samples || 1000);
      chunkSize = 50000;
    } else if (duration > 1800) { // > 30 minutes  
      quality = 'medium';
      samples = Math.min(2000, userOptions.samples || 2000);
      chunkSize = 25000;
    } else if (duration > 600) { // > 10 minutes
      quality = 'high';
      samples = Math.min(4000, userOptions.samples || 3000);
      chunkSize = 10000;
    } else { // < 10 minutes
      quality = 'ultra';
      samples = userOptions.samples || 5000;
      chunkSize = 5000;
    }

    console.log('🎯 [WaveformWorker] Adaptive quality selected:', {
      duration: duration.toFixed(2) + 's',
      quality,
      samples,
      chunkSize
    });

    return { quality, samples, chunkSize, ...userOptions };
  }

  // ⚡ **CHUNK PROCESSING**: Xử lý theo chunks để progressive
  async processInChunks(audioBuffer, options) {
    const { samples, chunkSize } = options;
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData = [];

    // 🔥 **PROGRESSIVE CHUNKING**: Process in small chunks
    for (let i = 0; i < samples; i += chunkSize) {
      const endIndex = Math.min(i + chunkSize, samples);
      
      // Process chunk
      for (let j = i; j < endIndex; j++) {
        const start = j * blockSize;
        const end = Math.min(start + blockSize, channelData.length);
        
        let max = 0;
        for (let k = start; k < end; k++) {
          const sample = Math.abs(channelData[k]);
          if (sample > max) max = sample;
        }
        waveformData.push(max);
      }

      // 🚀 **YIELD CONTROL**: Cho phép other tasks chạy
      if (i % (chunkSize * 4) === 0) {
        await this.yieldControl();
        
        // 📊 **PROGRESS REPORTING**: Report progress to main thread
        const progress = (i / samples) * 100;
        self.postMessage({
          type: 'progress',
          progress: Math.round(progress),
          currentSamples: i,
          totalSamples: samples
        });
      }
    }

    return waveformData;
  }

  // ⏸️ **YIELD CONTROL**: Cho phép other tasks execute
  async yieldControl() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  // 🗄️ **SMART CACHE**: Intelligent caching with compression
  setCacheData(key, data) {
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // 🔧 Simple compression for cache efficiency
    const compressed = this.compressData(data);
    this.cache.set(key, compressed);
  }

  getCacheData(key) {
    const compressed = this.cache.get(key);
    return compressed ? this.decompressData(compressed) : null;
  }

  // 📦 **DATA COMPRESSION**: Simple but effective compression
  compressData(data) {
    if (!Array.isArray(data)) return data;
    
    // Quantize to reduce precision (0.001 precision is enough for waveform)
    const quantized = data.map(val => Math.round(val * 1000) / 1000);
    return { compressed: quantized, length: data.length };
  }

  decompressData(compressed) {
    return compressed.compressed || compressed;
  }

  // 🎯 **GENERATE CACHE KEY**: Smart cache key generation
  generateCacheKey(audioBuffer, options) {
    const duration = Math.round(audioBuffer.duration * 100) / 100;
    const sampleRate = audioBuffer.sampleRate;
    const samples = options.samples || 2000;
    const quality = options.quality || 'standard';
    
    return `wf_${duration}_${sampleRate}_${samples}_${quality}`;
  }
}

// 🎯 **WORKER MESSAGE HANDLER**
const waveformWorker = new WaveformWorker();

self.onmessage = async function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'process-audio':
        const result = await waveformWorker.processAudioBuffer(data.audioBuffer, data.options);
        self.postMessage({
          type: 'process-complete',
          id,
          result
        });
        break;
        
      case 'cache-set':
        waveformWorker.setCacheData(data.key, data.value);
        self.postMessage({
          type: 'cache-set-complete',
          id
        });
        break;
        
      case 'cache-get':
        const cachedData = waveformWorker.getCacheData(data.key);
        self.postMessage({
          type: 'cache-get-complete',
          id,
          result: cachedData
        });
        break;
        
      default:
        console.warn('🚨 [WaveformWorker] Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message,
      stack: error.stack
    });
  }
};

console.log('🚀 [WaveformWorker] Worker ready for processing');
