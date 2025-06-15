// services/hybridWaveformService.js

import { WaveformGenerator } from './waveformGenerator';
import { IntelligentCache } from './intelligentCache';

export class HybridWaveformService {
  constructor() {
    this.capabilities = this._detectCapabilities();
    this.intelligentCache = new IntelligentCache();
    this.metrics = {
      processedFiles: 0,
      totalProcessingTime: 0,
      qualityDistribution: { low: 0, standard: 0, high: 0, premium: 0 }
    };
  }

  _detectCapabilities() {
    return {
      webWorkers: typeof Worker !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      audioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    };
  }

  async processFile(file, options = {}) {
    const fileId = await this._generateFileId(file);
    const startTime = performance.now();
    let result, fromCache = false;

    // Always check cache first
    result = await this.intelligentCache.get(fileId, options);
    if (!result) {
      result = await this._directGenerate(file, options);
      await this.intelligentCache.set(fileId, result, options);
    } else {
      fromCache = true;
    }
    const processingTime = performance.now() - startTime;
    this._updateMetrics(processingTime, options.quality, fromCache);

    return {
      ...result,
      strategy: fromCache ? 'cache' : 'direct',
      fromCache,
      processingTime
    };
  }

  async _directGenerate(file, options) {
    // Main thread generator, no worker, skip offscreen logic for stability
    return await WaveformGenerator.generateWaveform(file, {
      samples: this._optimalSamples(0, options.quality),
      quality: options.quality || 'standard'
    });
  }

  async generateThumbnail(file) {
    try {
      const data = await WaveformGenerator.generateWaveform(file, { samples: 100, quality: 'low' });
      return {
        data: data.data,
        type: 'thumbnail',
        samples: 100,
        duration: data.duration
      };
    } catch {
      return null;
    }
  }

  // Background processing, cache after done
  async scheduleFullProcessing(file, options = {}) {
    const fileId = await this._generateFileId(file);
    setTimeout(async () => {
      try {
        const result = await this._directGenerate(file, options);
        await this.intelligentCache.set(fileId, result, options);
      } catch {}
    }, 100);
  }

  async _generateFileId(file) {
    const txt = `${file.name}_${file.size}_${file.lastModified}`;
    const buf = new TextEncoder().encode(txt);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  _optimalSamples(duration, quality) {
    const multi = { low: 0.5, standard: 1, high: 1.5, premium: 2 };
    const base = duration ? Math.min(4000, Math.max(1000, duration * 10)) : 2000;
    return Math.floor(base * (multi[quality] || 1));
  }

  _updateMetrics(processingTime, quality, fromCache) {
    const m = this.metrics;
    m.processedFiles++;
    m.totalProcessingTime += processingTime;
    if (quality && m.qualityDistribution[quality] !== undefined) m.qualityDistribution[quality]++;
    m.averageLoadTime = m.totalProcessingTime / m.processedFiles;
    m.cacheHits = (m.cacheHits || 0) + (fromCache ? 1 : 0);
    m.cacheHitRate = (m.cacheHits / m.processedFiles) * 100;
  }

  getPerformanceStatistics() {
    const cacheStats = this.intelligentCache.getStatistics?.() || {};
    return {
      ...this.metrics,
      averageLoadTime: (this.metrics.averageLoadTime || 0).toFixed(2) + 'ms',
      cacheHitRate: (this.metrics.cacheHitRate || 0).toFixed(1) + '%',
      cache: cacheStats,
      capabilities: this.capabilities
    };
  }

  async clearCache() {
    await this.intelligentCache.clear?.();
  }

  dispose() {
    this.intelligentCache?.dispose?.();
  }
}
