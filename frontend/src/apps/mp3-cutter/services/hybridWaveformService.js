// 🚀 **HYBRID WAVEFORM SERVICE** - Ultimate performance orchestrator
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\hybridWaveformService.js

import { WaveformGenerator } from './waveformGenerator';
import { OffscreenWaveformRenderer } from './offscreenRenderer';
import { IntelligentCache } from './intelligentCache';
import { WAVEFORM_CONFIG } from '../utils/constants';

export class HybridWaveformService {
  constructor() {
    // 🎯 **CAPABILITY DETECTION**: Detect browser capabilities
    this.capabilities = this.detectCapabilities();
    
    // 🧠 **INTELLIGENT CACHE**: Multi-layer caching system
    this.intelligentCache = new IntelligentCache();
    
    // 🎨 **OFFSCREEN RENDERER**: Background rendering
    this.offscreenRenderer = new OffscreenWaveformRenderer();
    
    // 🔧 **PROCESSING WORKER**: Heavy computation worker
    this.processingWorker = null;
    this.initializeWorker();
    
    // 📊 **PERFORMANCE METRICS**: Track performance
    this.metrics = {
      processedFiles: 0,
      totalProcessingTime: 0,
      cacheHitRate: 0,
      averageLoadTime: 0,
      qualityDistribution: { low: 0, standard: 0, high: 0, premium: 0 }
    };
    
    console.log('🚀 [HybridWaveformService] Initialized with capabilities:', this.capabilities);
  }

  // 🔍 **CAPABILITY DETECTION**: Detect browser features
  detectCapabilities() {
    const capabilities = {
      webWorkers: typeof Worker !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      webGL: this.detectWebGL(),
      audioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
      transferableObjects: this.detectTransferableObjects()
    };
    
    // 🎯 **STRATEGY SELECTION**: Choose optimal strategy based on capabilities
    if (capabilities.webWorkers && capabilities.offscreenCanvas && capabilities.indexedDB) {
      capabilities.recommendedStrategy = 'hybrid-supreme';
    } else if (capabilities.webWorkers && capabilities.indexedDB) {
      capabilities.recommendedStrategy = 'worker-cached';
    } else if (capabilities.offscreenCanvas) {
      capabilities.recommendedStrategy = 'offscreen-only';
    } else {
      capabilities.recommendedStrategy = 'enhanced-legacy';
    }
    
    return capabilities;
  }

  detectWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  detectTransferableObjects() {
    try {
      const ab = new ArrayBuffer(1);
      const worker = new Worker('data:text/javascript,self.postMessage("test")');
      worker.postMessage(ab, [ab]);
      return ab.byteLength === 0; // ArrayBuffer should be transferred (emptied)
    } catch (e) {
      return false;
    }
  }

  // 🔧 **WORKER INITIALIZATION**: Setup processing worker
  async initializeWorker() {
    if (!this.capabilities.webWorkers) {
      console.warn('⚠️ [HybridWaveformService] Web Workers not supported, using main thread fallback');
      return;
    }
    
    try {
      this.processingWorker = new Worker('/workers/waveform-processor.js');
      
      this.processingWorker.onmessage = (e) => {
        const { type, id, result, error } = e.data;
        
        if (error) {
          console.error('❌ [HybridWaveformService] Worker error:', error);
          return;
        }
        
        switch (type) {
          case 'process-complete':
            this.handleWorkerComplete(id, result);
            break;
          case 'progress':
            this.handleWorkerProgress(id, result);
            break;
        }
      };
      
      this.processingWorker.onerror = (error) => {
        console.error('❌ [HybridWaveformService] Worker initialization failed:', error);
        this.processingWorker = null;
      };
      
      console.log('✅ [HybridWaveformService] Processing worker initialized');
    } catch (error) {
      console.error('❌ [HybridWaveformService] Worker setup failed:', error);
      this.processingWorker = null;
    }
  }

  // 🎯 **MAIN PROCESSING FUNCTION**: Intelligent routing based on file and capabilities
  async processFile(file, options = {}) {
    const startTime = performance.now();
    const fileId = await this.generateFileId(file);
    const { priority = 'normal', quality = 'standard' } = options;
    
    console.log('🎯 [HybridWaveformService] Processing file:', {
      fileName: file.name,
      fileSize: this.formatBytes(file.size),
      duration: 'detecting...',
      quality,
      strategy: this.capabilities.recommendedStrategy
    });
    
    try {      // 🏎️ **IMMEDIATE RESPONSE**: Always provide immediate visual feedback
      this.generateThumbnail(file); // Generate thumbnail but don't block on it
      
      // 🧠 **CACHE CHECK**: Check if we already have this file cached
      const cacheKey = `${fileId}_${quality}`;
      const cached = await this.intelligentCache.get(cacheKey, { quality });
      
      if (cached) {
        const processingTime = performance.now() - startTime;
        this.updateMetrics('cache-hit', processingTime, quality);
        
        console.log('⚡ [HybridWaveformService] Cache hit - instant load:', {
          processingTime: processingTime.toFixed(2) + 'ms',
          quality,
          cacheType: 'full'
        });
        
        return {
          ...cached,
          processingTime,
          fromCache: true,
          strategy: 'cache-hit'
        };
      }
      
      // 🚀 **STRATEGY ROUTING**: Route to optimal processing strategy
      let result;
      switch (this.capabilities.recommendedStrategy) {
        case 'hybrid-supreme':
          result = await this.processWithHybridSupreme(file, fileId, options);
          break;
        case 'worker-cached':
          result = await this.processWithWorkerCached(file, fileId, options);
          break;
        case 'offscreen-only':
          result = await this.processWithOffscreenOnly(file, fileId, options);
          break;
        default:
          result = await this.processWithEnhancedLegacy(file, fileId, options);
      }
      
      // 💾 **CACHE RESULT**: Store result for future use
      await this.intelligentCache.set(cacheKey, result, {
        quality,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          strategy: this.capabilities.recommendedStrategy,
          processingTime: result.processingTime
        }
      });
      
      const totalTime = performance.now() - startTime;
      this.updateMetrics('cache-miss', totalTime, quality);
      
      // 🔄 **BACKGROUND ENHANCEMENT**: Schedule higher quality processing if needed
      if (quality !== 'premium' && priority !== 'low') {
        this.scheduleFullProcessing(file, fileId, { ...options, quality: 'premium' });
      }
      
      console.log('✅ [HybridWaveformService] Processing complete:', {
        strategy: this.capabilities.recommendedStrategy,
        totalTime: totalTime.toFixed(2) + 'ms',
        quality: result.quality || quality,
        cacheStored: true
      });
      
      return {
        ...result,
        processingTime: totalTime,
        fromCache: false,
        strategy: this.capabilities.recommendedStrategy
      };
      
    } catch (error) {
      console.error('❌ [HybridWaveformService] Processing failed:', error);
      
      // 🔄 **FALLBACK**: Try with legacy method
      try {
        const fallbackResult = await this.processWithEnhancedLegacy(file, fileId, options);
        return {
          ...fallbackResult,
          processingTime: performance.now() - startTime,
          fromCache: false,
          strategy: 'fallback-legacy'
        };
      } catch (fallbackError) {
        console.error('❌ [HybridWaveformService] Fallback processing also failed:', fallbackError);
        throw new Error(`Processing failed: ${error.message}`);
      }
    }
  }

  // 🥇 **HYBRID SUPREME PROCESSING**: Best performance - Web Worker + OffscreenCanvas + Intelligent Cache
  async processWithHybridSupreme(file, fileId, options) {
    console.log('🥇 [HybridWaveformService] Using Hybrid Supreme processing');
    
    // 🔄 **PHASE 1**: Immediate thumbnail for instant feedback
    const thumbnailPromise = this.generateThumbnail(file);
    
    // 🔄 **PHASE 2**: Worker processing for data generation
    const workerPromise = this.processWithWorkerCached(file, fileId, options);
    
    // 🔄 **PHASE 3**: OffscreenCanvas rendering
    const [thumbnail, workerResult] = await Promise.all([thumbnailPromise, workerPromise]);
    
    // 🎨 **ENHANCED RENDERING**: Use OffscreenCanvas for final high-quality render
    const renderedCanvas = await this.offscreenRenderer.renderWaveformBackground(workerResult.data, {
      width: 800,
      height: WAVEFORM_CONFIG.HEIGHT,
      volume: 1,
      startTime: options.startTime || 0,
      endTime: options.endTime || workerResult.duration,
      duration: workerResult.duration
    });
    
    return {
      ...workerResult,
      renderedCanvas,
      thumbnail,
      strategy: 'hybrid-supreme',
      phases: {
        thumbnail: 'immediate',
        processing: 'worker-based',
        rendering: 'offscreen-canvas'
      }
    };
  }

  // 🥈 **WORKER CACHED PROCESSING**: Good performance - Web Worker + Intelligent Cache
  async processWithWorkerCached(file, fileId, options) {
    console.log('🥈 [HybridWaveformService] Using Worker Cached processing');
    
    if (!this.processingWorker) {
      console.warn('⚠️ [HybridWaveformService] Worker not available, falling back to main thread');
      return this.processWithEnhancedLegacy(file, fileId, options);
    }
    
    // 🔧 **CONVERT TO AUDIO BUFFER**: Prepare for worker processing
    const audioBuffer = await this.convertFileToAudioBuffer(file);
    
    // 🚀 **WORKER PROCESSING**: Process in Web Worker (non-blocking)
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        if (e.data.id !== fileId) return;
        
        this.processingWorker.removeEventListener('message', messageHandler);
        
        if (e.data.type === 'process-complete') {
          resolve(e.data.result);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
        }
      };
      
      this.processingWorker.addEventListener('message', messageHandler);
      
      // 🔄 **SEND TO WORKER**: Transfer audio buffer to worker
      this.processingWorker.postMessage({
        type: 'process-audio',
        id: fileId,
        data: {
          audioBuffer: audioBuffer,
          options: {
            samples: this.calculateOptimalSamples(audioBuffer.duration, options.quality),
            quality: options.quality || 'standard',
            chunkSize: 200 // Progressive processing
          }
        }
      });
    });
  }

  // 🥉 **OFFSCREEN ONLY PROCESSING**: Decent performance - OffscreenCanvas rendering only
  async processWithOffscreenOnly(file, fileId, options) {
    console.log('🥉 [HybridWaveformService] Using Offscreen Only processing');
      // 🔧 **MAIN THREAD PROCESSING**: Use current system for data generation
    await this.convertFileToAudioBuffer(file); // Verify file is valid audio
    const waveformData = await WaveformGenerator.generateWaveform(file);
    
    // 🎨 **OFFSCREEN RENDERING**: Render in background
    const renderedCanvas = await this.offscreenRenderer.renderWaveformBackground(waveformData.data, {
      width: 800,
      height: WAVEFORM_CONFIG.HEIGHT,
      volume: 1,
      startTime: options.startTime || 0,
      endTime: options.endTime || waveformData.duration,
      duration: waveformData.duration
    });
    
    return {
      ...waveformData,
      renderedCanvas,
      strategy: 'offscreen-only'
    };
  }

  // 🔄 **ENHANCED LEGACY PROCESSING**: Fallback with improvements
  async processWithEnhancedLegacy(file, fileId, options) {
    console.log('🔄 [HybridWaveformService] Using Enhanced Legacy processing');
    
    // 🎯 **PROGRESSIVE PROCESSING**: Break processing into chunks to prevent blocking
    const result = await new Promise(async (resolve, reject) => {
      try {
        // Small delay to prevent complete UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const waveformData = await WaveformGenerator.generateWaveform(file, {
          samples: this.calculateOptimalSamples(0, options.quality), // Estimate samples
          quality: options.quality || 'standard'
        });
        
        resolve(waveformData);
      } catch (error) {
        reject(error);
      }
    });
    
    return {
      ...result,
      strategy: 'enhanced-legacy'
    };
  }

  // 🖼️ **THUMBNAIL GENERATION**: Quick preview for immediate feedback
  async generateThumbnail(file) {
    console.log('🖼️ [HybridWaveformService] Generating thumbnail for immediate feedback');
    
    try {
      // 🏃‍♂️ **QUICK PROCESSING**: Generate low-quality thumbnail quickly
      const thumbnailData = await WaveformGenerator.generateWaveform(file, {
        samples: 100, // Very low resolution for speed
        quality: 'low'
      });
      
      return {
        data: thumbnailData.data,
        type: 'thumbnail',
        samples: 100,
        duration: thumbnailData.duration
      };
    } catch (error) {
      console.error('❌ [HybridWaveformService] Thumbnail generation failed:', error);
      return null;
    }
  }

  // ⏰ **BACKGROUND PROCESSING**: Schedule full processing without blocking UI
  async scheduleFullProcessing(file, fileId, options) {
    console.log('⏰ [HybridWaveformService] Scheduling full background processing');
    
    // 🔄 **BACKGROUND PROCESSING**: Process in background with low priority
    setTimeout(async () => {
      try {
        const fullResult = await this.processWithWorkerCached(file, fileId, options);
        
        // 💾 **UPDATE CACHE**: Store high-quality result
        const cacheKey = `${fileId}_${options.quality}`;
        await this.intelligentCache.set(cacheKey, fullResult, {
          quality: options.quality,
          metadata: {
            fileName: file.name,
            backgroundProcessed: true,
            processingTime: fullResult.processingTime
          }
        });
        
        console.log('✅ [HybridWaveformService] Background processing complete and cached');
      } catch (error) {
        console.error('❌ [HybridWaveformService] Background processing failed:', error);
      }
    }, 100); // Small delay to ensure UI responsiveness
  }

  // 🔧 **UTILITY FUNCTIONS**: Helper functions for processing
  async convertFileToAudioBuffer(file) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  }

  async generateFileId(file) {
    // Generate unique ID based on file characteristics
    const fileInfo = `${file.name}_${file.size}_${file.lastModified}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(fileInfo);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  calculateOptimalSamples(duration, quality) {
    const qualityMultipliers = {
      low: 0.5,
      standard: 1.0,
      high: 1.5,
      premium: 2.0
    };
    
    const baseSamples = duration ? Math.min(4000, Math.max(1000, duration * 10)) : 2000;
    return Math.floor(baseSamples * (qualityMultipliers[quality] || 1.0));
  }

  // 📊 **PERFORMANCE TRACKING**: Update metrics
  updateMetrics(type, processingTime, quality) {
    this.metrics.processedFiles++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageLoadTime = this.metrics.totalProcessingTime / this.metrics.processedFiles;
    
    if (quality && this.metrics.qualityDistribution[quality] !== undefined) {
      this.metrics.qualityDistribution[quality]++;
    }
    
    if (type === 'cache-hit') {
      const totalRequests = this.metrics.processedFiles;
      this.metrics.cacheHitRate = ((this.metrics.cacheHitRate * (totalRequests - 1)) + 1) / totalRequests;
    } else {
      const totalRequests = this.metrics.processedFiles;
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate * (totalRequests - 1)) / totalRequests;
    }
  }

  // 📊 **GET PERFORMANCE STATISTICS**: Return current performance metrics
  getPerformanceStatistics() {
    const cacheStats = this.intelligentCache.getStatistics();
    
    return {
      ...this.metrics,
      cacheHitRate: (this.metrics.cacheHitRate * 100).toFixed(1) + '%',
      averageLoadTime: this.metrics.averageLoadTime.toFixed(2) + 'ms',
      cache: cacheStats,
      capabilities: this.capabilities,
      recommendedStrategy: this.capabilities.recommendedStrategy
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 🧹 **CLEANUP**: Dispose of resources
  dispose() {
    if (this.processingWorker) {
      this.processingWorker.terminate();
      this.processingWorker = null;
    }
    
    if (this.offscreenRenderer) {
      this.offscreenRenderer.dispose();
    }
    
    if (this.intelligentCache) {
      this.intelligentCache.dispose();
    }
    
    console.log('🧹 [HybridWaveformService] Disposed successfully');
  }
}
