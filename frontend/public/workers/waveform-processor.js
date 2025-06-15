// 🚀 WAVEFORM PROCESSING WEB WORKER (Optimized, keep all logic)
// filepath: d:\mp3-cutter-pro\frontend\public\workers\waveform-processor.js

class WaveformWorker {
  constructor() {
    this.cache = new Map();
  }

  async processAudioBuffer(audioBuffer, options = {}) {
    const t0 = performance.now();
    const cacheKey = this._genCacheKey(audioBuffer, options);
    const cached = this._cacheGet(cacheKey);

    if (cached) {
      return { ...cached, fromCache: true, processingTime: performance.now() - t0 };
    }

    const { samples, chunkSize, quality } = this._calcOptions(audioBuffer, options);
    const data = await this._processChunks(audioBuffer, samples, chunkSize);

    const result = {
      data,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      processingTime: performance.now() - t0,
      quality,
      fromCache: false
    };
    this._cacheSet(cacheKey, result);
    return result;
  }

  _calcOptions(audioBuffer, userOptions = {}) {
    const duration = audioBuffer.duration;
    // Ưu tiên options truyền vào, fallback về auto
    if (userOptions.samples && userOptions.chunkSize && userOptions.quality) {
      return {
        samples: userOptions.samples,
        chunkSize: userOptions.chunkSize,
        quality: userOptions.quality
      };
    }
    // Auto adapt
    if (duration > 3600)      return { quality: 'low',    samples: 1000, chunkSize: 50000, ...userOptions };
    if (duration > 1800)      return { quality: 'medium', samples: 2000, chunkSize: 25000, ...userOptions };
    if (duration > 600)       return { quality: 'high',   samples: 4000, chunkSize: 10000, ...userOptions };
    /* < 10 phút */           return { quality: 'ultra',  samples: 5000, chunkSize: 5000, ...userOptions };
  }

  async _processChunks(audioBuffer, samples, chunkSize) {
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveformData = new Array(samples);

    for (let i = 0; i < samples; i += chunkSize) {
      const end = Math.min(i + chunkSize, samples);

      for (let j = i; j < end; j++) {
        let max = 0, idxStart = j * blockSize, idxEnd = Math.min(idxStart + blockSize, channelData.length);
        for (let k = idxStart; k < idxEnd; k++) {
          const v = Math.abs(channelData[k]);
          if (v > max) max = v;
        }
        waveformData[j] = max;
      }

      // Yield & report progress
      if (i % (chunkSize * 4) === 0) {
        await this._yield();
        self.postMessage({
          type: 'progress',
          progress: Math.round((i / samples) * 100),
          currentSamples: i,
          totalSamples: samples
        });
      }
    }
    return waveformData;
  }

  async _yield() {
    return new Promise(res => setTimeout(res, 0));
  }

  // --- CACHE ---
  _cacheSet(key, data) {
    // Limit cache size
    if (this.cache.size > 100) this.cache.delete(this.cache.keys().next().value);
    // Chỉ nén mảng data
    const compressed = {
      ...data,
      data: this._compress(data.data)
    };
    this.cache.set(key, compressed);
  }

  _cacheGet(key) {
    const compressed = this.cache.get(key);
    if (!compressed) return null;
    return {
      ...compressed,
      data: this._decompress(compressed.data)
    };
  }

  _compress(arr) {
    // Chỉ nén nếu là mảng số
    if (!Array.isArray(arr)) return arr;
    // Quantize 0.001 (nhẹ nhất mà không mất chi tiết)
    const q = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) q[i] = Math.round(arr[i] * 1000) / 1000;
    return q;
  }

  _decompress(arr) {
    // Trả lại dạng array
    if (arr instanceof Float32Array) return Array.from(arr);
    if (Array.isArray(arr)) return arr;
    return [];
  }

  _genCacheKey(audioBuffer, options) {
    // Dùng các thuộc tính quyết định waveform
    return [
      'wf',
      Math.round(audioBuffer.duration * 100) / 100,
      audioBuffer.sampleRate,
      options.samples || 2000,
      options.quality || 'standard'
    ].join('_');
  }
}

// === WORKER HANDLER ===
const worker = new WaveformWorker();

self.onmessage = async function (e) {
  const { type, data, id } = e.data;
  try {
    if (type === 'process-audio') {
      const result = await worker.processAudioBuffer(data.audioBuffer, data.options);
      self.postMessage({ type: 'process-complete', id, result });
    } else if (type === 'cache-set') {
      worker._cacheSet(data.key, data.value);
      self.postMessage({ type: 'cache-set-complete', id });
    } else if (type === 'cache-get') {
      const cachedData = worker._cacheGet(data.key);
      self.postMessage({ type: 'cache-get-complete', id, result: cachedData });
    } else {
      // Unknown
      // Optionally: ignore silently, or log in dev mode
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
