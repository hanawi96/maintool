// 🔄 **HYBRID WAVEFORM INTEGRATION** - Bridge between old and new systems
import { WaveformGenerator } from './waveformGenerator';
import { HybridWaveformService } from './hybridWaveformService';

export class HybridWaveformIntegration {
  constructor() {
    this.hybridService = new HybridWaveformService();
    this.fallbackGenerator = WaveformGenerator;
    this.useHybridSystem = true; // Flag to enable/disable hybrid system
    
    console.log('🔄 [HybridWaveformIntegration] Initialized with hybrid:', this.useHybridSystem);
  }

  /**
   * 🎯 **MAIN PROCESSING METHOD** - Intelligently routes to best system
   */
  async generateWaveform(file, options = {}) {
    const startTime = performance.now();
    

    try {
      let result;

      if (this.useHybridSystem) {
        // 🚀 **HYBRID SYSTEM**: Use new OffscreenCanvas + Worker + Cache
        result = await this.processWithHybridSystem(file, options);
      } else {
        // 🔄 **FALLBACK**: Use original system
        result = await this.processWithFallback(file, options);
      }

      const processingTime = performance.now() - startTime;


      return {
        ...result,
        processingTime
      };

    } catch (error) {
      console.error('❌ [HybridWaveformIntegration] Failed:', error);
      
      // 🔄 **AUTO-FALLBACK**: If hybrid fails, try fallback
      if (this.useHybridSystem) {
        try {
          return await this.processWithFallback(file, options);
        } catch (fallbackError) {
          console.error('❌ [HybridWaveformIntegration] Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * 🚀 **HYBRID SYSTEM PROCESSING**
   */
  async processWithHybridSystem(file, options = {}) {
    const hybridOptions = {
      quality: options.quality || 'standard',
      priority: options.priority || 'normal'
    };

    const result = await this.hybridService.processFile(file, hybridOptions);
    
    // 🔄 **NORMALIZE RESULT**: Convert to format expected by existing code
    return {
      data: result.data,
      duration: result.duration,
      sampleRate: result.sampleRate || 44100,
      numberOfChannels: result.numberOfChannels || 1,
      strategy: result.strategy,
      fromCache: result.fromCache,
      processingTime: result.processingTime
    };
  }

  /**
   * 🔄 **FALLBACK PROCESSING**
   */
  async processWithFallback(file, options = {}) {
    const result = await this.fallbackGenerator.generateWaveform(file);
    
    return {
      ...result,
      strategy: 'fallback',
      fromCache: false
    };
  }

  /**
   * 🎯 **ENABLE/DISABLE HYBRID SYSTEM**
   */
  setHybridEnabled(enabled) {
    this.useHybridSystem = enabled;
    console.log('🔄 [HybridWaveformIntegration] Hybrid system:', enabled ? 'ENABLED' : 'DISABLED');
  }

  /**
   * 🧹 **CLEANUP**
   */
  dispose() {
    if (this.hybridService) {
      this.hybridService.dispose();
    }
  }

  /**
   * 📊 **GET PERFORMANCE STATS**
   */
  async getPerformanceStats() {
    if (this.hybridService && this.hybridService.cache) {
      return await this.hybridService.cache.getStats();
    }
    return null;
  }

  /**
   * 🧹 **CLEAR CACHE**
   */
  async clearCache() {
    if (this.hybridService && this.hybridService.cache) {
      await this.hybridService.cache.clear();
      console.log('🧹 [HybridWaveformIntegration] Cache cleared');
    }
  }
}

// 🎯 **SINGLETON INSTANCE** - Single instance across the app
let hybridIntegrationInstance = null;

export const getHybridWaveformIntegration = () => {
  if (!hybridIntegrationInstance) {
    hybridIntegrationInstance = new HybridWaveformIntegration();
  }
  return hybridIntegrationInstance;
};

// 🔄 **BACKWARD COMPATIBILITY** - Drop-in replacement for WaveformGenerator
export const HybridWaveformGenerator = {
  async generateWaveform(file, options = {}) {
    const integration = getHybridWaveformIntegration();
    return await integration.generateWaveform(file, options);
  }
};
