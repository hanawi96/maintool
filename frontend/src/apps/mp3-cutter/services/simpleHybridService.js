// 🎯 **SIMPLE HYBRID SERVICE** - Lightweight and efficient
import { SmartCacheManager } from './smartCacheManager.js';
import { SimpleOffscreenRenderer } from './simpleOffscreenRenderer.js';

export class SimpleHybridService {
  constructor() {
    this.cache = new SmartCacheManager();
    this.renderer = new SimpleOffscreenRenderer();
    this.worker = null;
    this.isWorkerSupported = typeof Worker !== 'undefined';
    this.currentId = 0;
    this.pendingRequests = new Map();
    
    if (this.isWorkerSupported) {
      this.initWorker();
    }
    
    console.log('🎯 [SimpleHybridService] Initialized');
  }

  // 🔧 **INIT WORKER**
  initWorker() {
    try {
      this.worker = new Worker('/workers/waveform-processor.js');
      
      this.worker.onmessage = (e) => {
        const { type, id, result, error } = e.data;
        const request = this.pendingRequests.get(id);
        
        if (!request) return;

        if (type === 'process-complete') {
          request.resolve(result);
          this.pendingRequests.delete(id);
        } else if (type === 'error') {
          request.reject(new Error(error));
          this.pendingRequests.delete(id);
        } else if (type === 'progress' && request.onProgress) {
          request.onProgress(e.data);
        }
      };

      console.log('🔧 [SimpleHybridService] Worker ready');
    } catch (error) {
      console.warn('⚠️ [SimpleHybridService] Worker failed, using main thread');
      this.isWorkerSupported = false;
    }
  }

  // 🎯 **PROCESS FILE**: Main entry point
  async processFile(file, options = {}) {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(file, options);
    
    // 🔍 **CACHE CHECK**
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log('⚡ [SimpleHybridService] Cache hit:', file.name);
      return {
        ...cached,
        fromCache: true,
        processingTime: performance.now() - startTime
      };
    }

    console.log('🎵 [SimpleHybridService] Processing:', file.name);

    try {
      // Convert to AudioBuffer
      const audioBuffer = await this.fileToAudioBuffer(file);
      
      // Process with worker or main thread
      let result;
      if (this.isWorkerSupported && this.worker) {
        result = await this.processWithWorker(audioBuffer, options);
      } else {
        result = await this.processMainThread(audioBuffer, options);
      }

      // Add visual rendering
      const canvas = await this.renderer.renderWaveform(result.data, {
        width: options.width || 800,
        height: options.height || 200
      });

      const finalResult = {
        ...result,
        canvas,
        processingTime: performance.now() - startTime,
        strategy: this.isWorkerSupported ? 'worker' : 'main-thread'
      };

      // 💾 **CACHE RESULT**
      await this.cache.set(cacheKey, finalResult);

      console.log('✅ [SimpleHybridService] Complete:', {
        file: file.name,
        time: finalResult.processingTime.toFixed(2) + 'ms',
        strategy: finalResult.strategy
      });

      return finalResult;
    } catch (error) {
      console.error('❌ [SimpleHybridService] Failed:', error);
      throw error;
    }
  }

  // 🔧 **WORKER PROCESSING**
  async processWithWorker(audioBuffer, options) {
    const id = ++this.currentId;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { 
        resolve, 
        reject, 
        onProgress: options.onProgress 
      });

      this.worker.postMessage({
        type: 'process-audio',
        id,
        data: { audioBuffer, options }
      });
    });
  }

  // 🔧 **MAIN THREAD PROCESSING**
  async processMainThread(audioBuffer, options) {
    const samples = options.samples || 2000;
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      
      let max = 0;
      for (let j = start; j < end; j++) {
        const sample = Math.abs(channelData[j]);
        if (sample > max) max = sample;
      }
      waveformData.push(max);
    }

    return {
      data: waveformData,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels
    };
  }

  // 🔧 **FILE TO AUDIO BUFFER**
  async fileToAudioBuffer(file) {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioContext.close();
      return audioBuffer;
    } catch (error) {
      audioContext.close();
      throw error;
    }
  }

  // 🎯 **GENERATE CACHE KEY**
  generateCacheKey(file, options) {
    const { name, size, lastModified } = file;
    const { samples = 2000, quality = 'standard' } = options;
    return `${name}_${size}_${lastModified}_${samples}_${quality}`;
  }

  // 📊 **GET STATS**
  getStats() {
    return {
      workerSupported: this.isWorkerSupported,
      workerActive: !!this.worker,
      cache: this.cache.getStats(),
      pendingRequests: this.pendingRequests.size
    };
  }

  // 🧹 **DISPOSE**
  dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.renderer.dispose();
    this.pendingRequests.clear();
    
    console.log('🧹 [SimpleHybridService] Disposed');
  }
}
