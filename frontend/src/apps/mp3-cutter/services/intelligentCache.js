// 🧠 **INTELLIGENT CACHE SYSTEM** - Multi-layer caching with compression
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\intelligentCache.js

export class IntelligentCache {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB
    this.currentMemoryUsage = 0;
    this.dbName = 'MP3CutterWaveformCache';
    this.dbVersion = 1;
    this.db = null;
    this.compressionThreshold = 5 * 1024 * 1024; // 5MB
    this.performanceMetrics = {
      hits: 0, misses: 0, compressionRatio: 0, averageRetrievalTime: 0
    };
    this._ready = this._initDB();
  }

  // --- DB init + Wait for ready ---
  async _initDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('waveformCache')) {
            const store = db.createObjectStore('waveformCache', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('fileHash', 'fileHash', { unique: false });
            store.createIndex('quality', 'quality', { unique: false });
          }
          if (!db.objectStoreNames.contains('cacheMetrics')) {
            db.createObjectStore('cacheMetrics', { keyPath: 'id' });
          }
        };
      });
      await this._cleanupOldEntries();
    } catch (e) {
      console.error('[IntelligentCache] IndexedDB init failed:', e);
      this.db = null;
    }
  }

  async _waitReady() {
    if (this._ready) await this._ready;
  }

  // --- LRU memory cache (move to end) ---
  _setMemoryCache(key, data, quality, metadata) {
    const dataSize = this._estimateDataSize(data);
    // Remove if full (LRU: oldest first)
    while (this.currentMemoryUsage + dataSize > this.maxMemorySize && this.memoryCache.size > 0) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.currentMemoryUsage -= this._estimateDataSize(this.memoryCache.get(oldestKey).data);
      this.memoryCache.delete(oldestKey);
    }
    // Remove old entry size if existed
    if (this.memoryCache.has(key)) {
      this.currentMemoryUsage -= this._estimateDataSize(this.memoryCache.get(key).data);
      this.memoryCache.delete(key);
    }
    // Set, move to end
    this.memoryCache.set(key, { data, quality, metadata, timestamp: Date.now(), accessCount: 1 });
    this.currentMemoryUsage += dataSize;
  }
  _touchMemoryCache(key) {
    if (!this.memoryCache.has(key)) return;
    const entry = this.memoryCache.get(key);
    this.memoryCache.delete(key);
    this.memoryCache.set(key, entry);
    entry.accessCount++;
    entry.timestamp = Date.now();
  }

  // --- GET (multi layer, LRU update) ---
  async get(key, options = {}) {
    await this._waitReady();
    const startTime = performance.now();
    const qualityScore = this._getQualityScore(options.quality || 'standard');
    // Fastest: memory
    const entry = this.memoryCache.get(key);
    if (entry && entry.quality >= qualityScore) {
      this._touchMemoryCache(key);
      this.performanceMetrics.hits++;
      this._updateAvgRetrievalTime(performance.now() - startTime);
      return entry.data;
    }
    // Next: persistent
    if (this.db) {
      const result = await this._dbGet('waveformCache', key);
      if (result && result.quality >= qualityScore) {
        let data = result.data;
        if (result.compressed) data = await this._decompress(data);
        this._setMemoryCache(key, data, result.quality, result.metadata);
        this.performanceMetrics.hits++;
        this._updateAvgRetrievalTime(performance.now() - startTime);
        return data;
      }
    }
    this.performanceMetrics.misses++;
    return null;
  }

  // --- SET (with compression, LRU memory, persistent) ---
  async set(key, data, options = {}) {
    await this._waitReady();
    const {
      quality = 'standard',
      metadata = {},
      ttl = 7 * 24 * 60 * 60 * 1000, // 7 days
      forceCompress = false
    } = options;

    try {
      // Only serialize once if used by multiple places
      const jsonString = JSON.stringify(data);
      const dataSize = jsonString.length * 2; // UTF-16 estimate
      const shouldCompress = forceCompress || dataSize > this.compressionThreshold;
      let processedData = data, compressed = false;
      let compressedLen = 0;
      if (shouldCompress) {
        processedData = await this._compress(jsonString);
        compressed = true;
        compressedLen = processedData.length;
        this.performanceMetrics.compressionRatio =
          (this.performanceMetrics.compressionRatio + (compressedLen / dataSize)) / 2;
      }
      const cacheEntry = {
        id: key,
        data: processedData,
        quality: this._getQualityScore(quality),
        metadata,
        compressed,
        timestamp: Date.now(),
        ttl,
        fileHash: await this._generateFileHash(jsonString),
        size: compressed ? compressedLen : dataSize
      };
      this._setMemoryCache(key, data, cacheEntry.quality, metadata);
      if (this.db) await this._dbPut('waveformCache', cacheEntry);
    } catch (e) {
      console.error('[IntelligentCache] Set operation failed:', e);
    }
  }

  // --- IndexedDB utils ---
  _dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      } catch (e) {
        resolve(null);
      }
    });
  }
  _dbPut(storeName, value) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      } catch (e) { resolve(); }
    });
  }

  // --- Compression (RLE, simple demo) ---
  async _compress(jsonString) {
    // RLE over UTF-8 bytes of string
    const uint8 = new TextEncoder().encode(jsonString);
    return this._runLengthEncode(uint8);
  }
  async _decompress(uint8data) {
    const decomp = this._runLengthDecode(uint8data);
    const jsonString = new TextDecoder().decode(decomp);
    return JSON.parse(jsonString);
  }
  _runLengthEncode(uint8arr) {
    const res = [];
    let count = 1;
    for (let i = 1; i < uint8arr.length; i++) {
      if (uint8arr[i] === uint8arr[i - 1] && count < 255) count++;
      else { res.push(count, uint8arr[i - 1]); count = 1; }
    }
    if (uint8arr.length > 0) res.push(count, uint8arr[uint8arr.length - 1]);
    return new Uint8Array(res);
  }
  _runLengthDecode(uint8arr) {
    const res = [];
    for (let i = 0; i < uint8arr.length; i += 2)
      for (let j = 0; j < uint8arr[i]; j++) res.push(uint8arr[i + 1]);
    return new Uint8Array(res);
  }

  // --- Utilities ---
  _getQualityScore(quality) {
    return { low: 1, standard: 2, high: 3, premium: 4 }[quality] || 2;
  }
  _estimateDataSize(data) {
    // Only for memory cache, estimate as utf-16
    if (typeof data === 'string') return data.length * 2;
    return JSON.stringify(data).length * 2;
  }
  _formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  async _generateFileHash(jsonString) {
    let hash = 0;
    for (let i = 0; i < Math.min(1000, jsonString.length); i++) {
      hash = ((hash << 5) - hash) + jsonString.charCodeAt(i); hash = hash & hash;
    }
    return hash.toString(36);
  }
  _updateAvgRetrievalTime(newTime) {
    const total = this.performanceMetrics.hits + this.performanceMetrics.misses;
    this.performanceMetrics.averageRetrievalTime =
      total > 1 ? ((this.performanceMetrics.averageRetrievalTime * (total - 1) + newTime) / total) : newTime;
  }

  // --- Cleanup old entries (TTL) ---
  async _cleanupOldEntries() {
    if (!this.db) return;
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    try {
      const tx = this.db.transaction(['waveformCache'], 'readwrite');
      const store = tx.objectStore('waveformCache');
      const idx = store.index('timestamp');
      const range = IDBKeyRange.upperBound(oneWeekAgo);
      let deletedCount = 0;
      await new Promise((resolve, reject) => {
        const req = idx.openCursor(range);
        req.onerror = () => reject(req.error);
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) { cursor.delete(); deletedCount++; cursor.continue(); }
          else resolve();
        };
      });
      if (deletedCount) console.log(`[IntelligentCache] Cleanup: ${deletedCount} old entries removed`);
    } catch (e) {
      console.error('[IntelligentCache] Cleanup failed:', e);
    }
  }

  // --- Invalidate cache by key pattern ---
  async invalidate(pattern) {
    // Memory cache
    for (const [key, entry] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.currentMemoryUsage -= this._estimateDataSize(entry.data);
        this.memoryCache.delete(key);
      }
    }
    await this._waitReady();
    if (this.db) {
      const tx = this.db.transaction(['waveformCache'], 'readwrite');
      const store = tx.objectStore('waveformCache');
      await new Promise((resolve, reject) => {
        const req = store.openCursor();
        req.onerror = () => reject(req.error);
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.key.includes(pattern)) cursor.delete();
            cursor.continue();
          } else resolve();
        };
      });
    }
  }

  // --- Get statistics for UI ---
  getStatistics() {
    const total = this.performanceMetrics.hits + this.performanceMetrics.misses;
    return {
      memoryUsage: this._formatBytes(this.currentMemoryUsage),
      memoryCacheSize: this.memoryCache.size,
      hitRate: total ? ((this.performanceMetrics.hits / total) * 100).toFixed(1) + '%' : '0%',
      totalRequests: total,
      averageRetrievalTime: this.performanceMetrics.averageRetrievalTime.toFixed(2) + 'ms',
      compressionRatio: (this.performanceMetrics.compressionRatio * 100).toFixed(1) + '%'
    };
  }

  // --- Dispose all (close db) ---
  dispose() {
    this.memoryCache.clear();
    this.currentMemoryUsage = 0;
    if (this.db) { this.db.close(); this.db = null; }
  }
}
