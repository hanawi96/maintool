// 🚀 **HYBRID WAVEFORM SERVICE** - Ultimate performance orchestrator
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\hybridWaveformService.js

import { WaveformGenerator } from './waveformGenerator';
import { OffscreenWaveformRenderer } from './offscreenRenderer';
import { IntelligentCache } from './intelligentCache';

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
      capabilities.recommendedStrategy = 'enhanced-legacy'; // Simplified for stability
    } else if (capabilities.webWorkers && capabilities.indexedDB) {
      capabilities.recommendedStrategy = 'enhanced-legacy'; // Simplified for stability
    } else if (capabilities.offscreenCanvas) {
      capabilities.recommendedStrategy = 'enhanced-legacy'; // Simplified for stability
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
    // 🛠️ **TEMPORARILY DISABLED**: Avoid creating test workers for stability
    return false;
  }

  // 🚀 **INITIALIZE WEB WORKER**: Setup worker for background processing
  async initializeWorker() {
    // 🚀 **TEMPORARILY DISABLED**: Worker processing disabled for stability
    console.log('🛠️ [HybridWaveformService] Worker processing temporarily disabled for stability');
    this.processingWorker = null;
    return false;
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

  // 🏆 **HYBRID SUPREME PROCESSING**: Best performance - combines all available optimizations
  async processWithHybridSupreme(file, fileId, options) {
    console.log('🏆 [HybridWaveformService] Using Hybrid Supreme processing');
    
    const processingStart = performance.now();
    
    // 🚀 **DIRECT OPTIMIZED PROCESSING**: Use best available method without Worker complexity
    let primaryResult;
    
    try {
      // 🎯 **PRIMARY**: Enhanced Legacy (optimized main thread)
      primaryResult = await this.processWithEnhancedLegacy(file, fileId, {
        ...options,
        priority: 'primary'
      });
      
      console.log('✅ [HybridWaveformService] Primary processing complete');
      
      // 🎨 **BACKGROUND ENHANCEMENT**: Temporarily disabled to avoid transfer errors
      console.log('🛠️ [HybridWaveformService] Background rendering temporarily disabled for stability');
      
      const processingTime = performance.now() - processingStart;
      this.updateMetrics('hybrid-supreme', processingTime, options.quality);
      
      return {
        ...primaryResult,
        strategy: 'hybrid-supreme-simplified',
        processingTime,
        capabilities: this.capabilities
      };
      
    } catch (error) {
      console.error('❌ [HybridWaveformService] Processing failed:', error);
      throw error;
    }
  }

  // 🏆 **WORKER CACHED PROCESSING**: Supreme performance - with intelligent caching
  async processWithWorkerCached(file, fileId, options) {
    console.log('🏆 [HybridWaveformService] Using optimized main thread processing (Worker temporarily disabled)');
    
    // 🚀 **DIRECT PROCESSING**: Use main thread with optimizations for now
    return this.processWithEnhancedLegacy(file, fileId, options);
  }

  // 🥉 **OFFSCREEN ONLY PROCESSING**: Decent performance - OffscreenCanvas rendering only
  async processWithOffscreenOnly(file, fileId, options) {
    console.log('🥉 [HybridWaveformService] Using simplified main thread processing (Offscreen temporarily disabled)');
    
    // 🔧 **MAIN THREAD PROCESSING**: Use current system for data generation
    const waveformData = await WaveformGenerator.generateWaveform(file);
    
    // 🎨 **SIMPLIFIED PROCESSING**: Direct return without offscreen rendering
    console.log('🛠️ [HybridWaveformService] Offscreen rendering temporarily disabled for stability');
    
    return {
      ...waveformData,
      strategy: 'main-thread-simplified'
    };
  }

  // 🔄 **ENHANCED LEGACY PROCESSING**: Optimized main thread processing
  async processWithEnhancedLegacy(file, fileId, options) {
    console.log('🔄 [HybridWaveformService] Using Enhanced Legacy processing');
    
    // 🎯 **OPTIMIZED PROCESSING**: Efficient main thread processing with minimal blocking
    try {
      // 🚀 **NON-BLOCKING DELAY**: Prevent UI freeze
      if (options.priority !== 'primary') {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      const waveformData = await WaveformGenerator.generateWaveform(file, {
        samples: this.calculateOptimalSamples(0, options.quality),
        quality: options.quality || 'standard'
      });
      
      return {
        ...waveformData,
        strategy: 'enhanced-legacy'
      };
    } catch (error) {
      console.error('❌ [HybridWaveformService] Enhanced Legacy processing failed:', error);
      throw error;
    }
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
