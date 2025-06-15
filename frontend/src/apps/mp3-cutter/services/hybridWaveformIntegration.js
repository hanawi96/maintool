// api/hybridWaveformIntegration.js

import { WaveformGenerator } from './waveformGenerator';
import { HybridWaveformService } from './hybridWaveformService';

class HybridWaveformIntegration {
  constructor() {
    this.hybridService = new HybridWaveformService();
    this.fallbackGenerator = WaveformGenerator;
    this.useHybridSystem = true;
  }

  // Main API: Tự chọn hệ thống, fallback tự động, giữ thời gian xử lý
  async generateWaveform(file, options = {}) {
    const start = performance.now();
    try {
      const result = this.useHybridSystem
        ? await this._processUnifiedHybrid(file, options)
        : await this._processFallback(file, options);
      return { ...result, processingTime: performance.now() - start };
    } catch (err) {
      if (this.useHybridSystem) {
        // Fallback tự động nếu hybrid lỗi
        try {
          const result = await this._processFallback(file, options);
          return { ...result, processingTime: performance.now() - start };
        } catch (fbErr) {
          throw fbErr;
        }
      }
      throw err;
    }
  }

  // Hybrid: Ưu tiên direct generator, lỗi mới gọi hybridService
  async _processUnifiedHybrid(file, options) {
    const opts = {
      quality: options.quality || 'standard',
      priority: options.priority || 'normal',
      skipThumbnail: true,
      unifiedProgress: true
    };

    try {
      // Ưu tiên generator cũ nếu chạy được
      const res = await this.fallbackGenerator.generateWaveform(file);
      return this._normalizeResult(res, 'unified-direct', false);
    } catch {
      // Nếu không, fallback sang hybridService
      const res = await this.hybridService.processFile(file, opts);
      return this._normalizeResult(res, res.strategy, res.fromCache, res.processingTime);
    }
  }

  // Fallback luôn gọi generator cũ
  async _processFallback(file, options) {
    const res = await this.fallbackGenerator.generateWaveform(file);
    return this._normalizeResult(res, 'fallback', false);
  }

  // Chuẩn hóa dữ liệu trả về (giảm lặp code)
  _normalizeResult(res, strategy, fromCache = false, processingTime) {
    return {
      data: res.data,
      duration: res.duration,
      sampleRate: res.sampleRate || 44100,
      numberOfChannels: res.numberOfChannels || 1,
      strategy,
      fromCache,
      ...(processingTime ? { processingTime } : {})
    };
  }

  // Cho phép bật/tắt hybrid
  setHybridEnabled(enabled) {
    this.useHybridSystem = !!enabled;
  }

  // Xoá cache
  async clearCache() {
    if (this.hybridService?.cache) {
      await this.hybridService.cache.clear();
    }
  }

  // Lấy thông tin cache
  async getPerformanceStats() {
    return this.hybridService?.cache?.getStats?.() || null;
  }

  // Xoá resources
  dispose() {
    this.hybridService?.dispose?.();
  }
}

// Singleton export
let instance = null;
export const getHybridWaveformIntegration = () => {
  if (!instance) instance = new HybridWaveformIntegration();
  return instance;
};

// Drop-in replacement (giữ interface cũ)
export const HybridWaveformGenerator = {
  async generateWaveform(file, options = {}) {
    return getHybridWaveformIntegration().generateWaveform(file, options);
  }
};
