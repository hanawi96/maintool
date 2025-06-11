// 🧠 **INTELLIGENT CACHE SYSTEM** - Multi-layer caching with compression
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\services\intelligentCache.js

export class IntelligentCache {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB memory limit
    this.currentMemoryUsage = 0;
    this.dbName = 'MP3CutterWaveformCache';
    this.dbVersion = 1;
    this.db = null;
    this.compressionThreshold = 5 * 1024 * 1024; // 5MB
    this.performanceMetrics = {
      hits: 0,
      misses: 0,
      compressionRatio: 0,
      averageRetrievalTime: 0
    };
    
    console.log('🧠 [IntelligentCache] Initializing...');
    this.initializeDB();
  }

  // 🚀 **DATABASE INITIALIZATION**: Setup IndexedDB for persistent storage
  async initializeDB() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // 🗄️ **WAVEFORM STORE**: Store processed waveform data
          if (!db.objectStoreNames.contains('waveformCache')) {
            const store = db.createObjectStore('waveformCache', { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('fileHash', 'fileHash', { unique: false });
            store.createIndex('quality', 'quality', { unique: false });
          }
          
          // 📊 **METRICS STORE**: Store performance metrics
          if (!db.objectStoreNames.contains('cacheMetrics')) {
            db.createObjectStore('cacheMetrics', { keyPath: 'id' });
          }
        };
      });
      
      console.log('✅ [IntelligentCache] IndexedDB initialized successfully');
      
      // 🧹 **CLEANUP OLD ENTRIES**: Remove entries older than 7 days
      await this.cleanupOldEntries();
      
    } catch (error) {
      console.error('❌ [IntelligentCache] IndexedDB initialization failed:', error);
      // Fallback to memory-only caching
    }
  }

  // 🎯 **GET CACHED DATA**: Retrieve with performance tracking
  async get(key, options = {}) {
    const startTime = performance.now();
    const { quality = 'standard' } = options;
    
    try {
      // 🏃‍♂️ **MEMORY CACHE FIRST**: Check memory cache first (fastest)
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached && memoryCached.quality >= this.getQualityScore(quality)) {
        this.performanceMetrics.hits++;
        const retrievalTime = performance.now() - startTime;
        this.updateAverageRetrievalTime(retrievalTime);
        
        console.log('⚡ [IntelligentCache] Memory cache hit:', {
          key: key.substring(0, 16) + '...',
          quality: memoryCached.quality,
          retrievalTime: retrievalTime.toFixed(2) + 'ms'
        });
        
        return memoryCached.data;
      }
      
      // 💾 **INDEXEDDB FALLBACK**: Check persistent storage
      if (this.db) {
        const transaction = this.db.transaction(['waveformCache'], 'readonly');
        const store = transaction.objectStore('waveformCache');
        const request = store.get(key);
        
        const result = await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        
        if (result && result.quality >= this.getQualityScore(quality)) {
          // 🗜️ **DECOMPRESS IF NEEDED**: Decompress data if it was compressed
          let data = result.data;
          if (result.compressed) {
            data = await this.decompress(result.data);
          }
          
          // 🔄 **PROMOTE TO MEMORY**: Move frequently accessed items to memory
          this.setMemoryCache(key, data, result.quality, result.metadata);
          
          this.performanceMetrics.hits++;
          const retrievalTime = performance.now() - startTime;
          this.updateAverageRetrievalTime(retrievalTime);
          
          console.log('💾 [IntelligentCache] IndexedDB cache hit:', {
            key: key.substring(0, 16) + '...',
            quality: result.quality,
            compressed: result.compressed,
            retrievalTime: retrievalTime.toFixed(2) + 'ms'
          });
          
          return data;
        }
      }
      
      // ❌ **CACHE MISS**: No cached data found
      this.performanceMetrics.misses++;
      console.log('❌ [IntelligentCache] Cache miss:', {
        key: key.substring(0, 16) + '...',
        quality,
        totalHits: this.performanceMetrics.hits,
        totalMisses: this.performanceMetrics.misses
      });
      
      return null;
      
    } catch (error) {
      console.error('❌ [IntelligentCache] Get operation failed:', error);
      this.performanceMetrics.misses++;
      return null;
    }
  }

  // 💾 **SET CACHED DATA**: Store with intelligent compression
  async set(key, data, options = {}) {
    const startTime = performance.now();
    const { 
      quality = 'standard', 
      metadata = {}, 
      ttl = 7 * 24 * 60 * 60 * 1000, // 7 days default
      forceCompress = false 
    } = options;
    
    try {
      const qualityScore = this.getQualityScore(quality);
      const dataSize = this.estimateDataSize(data);
      const shouldCompress = forceCompress || dataSize > this.compressionThreshold;
      
      // 🗜️ **COMPRESSION DECISION**: Compress large data
      let processedData = data;
      let compressed = false;
      
      if (shouldCompress) {
        processedData = await this.compress(data);
        compressed = true;
        const compressionRatio = processedData.length / dataSize;
        this.performanceMetrics.compressionRatio = (this.performanceMetrics.compressionRatio + compressionRatio) / 2;
        
        console.log('🗜️ [IntelligentCache] Data compressed:', {
          originalSize: this.formatBytes(dataSize),
          compressedSize: this.formatBytes(processedData.length),
          ratio: (compressionRatio * 100).toFixed(1) + '%'
        });
      }
      
      const cacheEntry = {
        id: key,
        data: processedData,
        quality: qualityScore,
        metadata,
        compressed,
        timestamp: Date.now(),
        ttl,
        fileHash: await this.generateFileHash(data),
        size: compressed ? processedData.length : dataSize
      };
      
      // 🏃‍♂️ **MEMORY CACHE**: Always try to cache in memory first
      this.setMemoryCache(key, data, qualityScore, metadata);
      
      // 💾 **PERSISTENT CACHE**: Store in IndexedDB for persistence
      if (this.db) {
        const transaction = this.db.transaction(['waveformCache'], 'readwrite');
        const store = transaction.objectStore('waveformCache');
        await new Promise((resolve, reject) => {
          const request = store.put(cacheEntry);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
      }
      
      const operationTime = performance.now() - startTime;
      console.log('✅ [IntelligentCache] Data cached successfully:', {
        key: key.substring(0, 16) + '...',
        quality,
        size: this.formatBytes(dataSize),
        compressed,
        operationTime: operationTime.toFixed(2) + 'ms'
      });
      
    } catch (error) {
      console.error('❌ [IntelligentCache] Set operation failed:', error);
    }
  }

  // 🧠 **MEMORY CACHE MANAGEMENT**: LRU eviction with size limits
  setMemoryCache(key, data, quality, metadata) {
    const dataSize = this.estimateDataSize(data);
    
    // 🧹 **LRU EVICTION**: Remove oldest entries if memory limit exceeded
    while (this.currentMemoryUsage + dataSize > this.maxMemorySize && this.memoryCache.size > 0) {
      const oldestKey = this.memoryCache.keys().next().value;
      const oldestEntry = this.memoryCache.get(oldestKey);
      this.currentMemoryUsage -= this.estimateDataSize(oldestEntry.data);
      this.memoryCache.delete(oldestKey);
      
      console.log('🧹 [IntelligentCache] LRU eviction:', {
        evictedKey: oldestKey.substring(0, 16) + '...',
        memoryFreed: this.formatBytes(this.estimateDataSize(oldestEntry.data)),
        remainingEntries: this.memoryCache.size
      });
    }
    
    // 💾 **ADD TO MEMORY**: Store in memory cache
    this.memoryCache.set(key, {
      data,
      quality,
      metadata,
      timestamp: Date.now(),
      accessCount: 1
    });
    
    this.currentMemoryUsage += dataSize;
  }

  // 🗜️ **COMPRESSION UTILITIES**: Simple string compression
  async compress(data) {
    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);
      
      // Simple run-length encoding for demonstration
      // In production, use proper compression like pako.js for gzip
      const compressed = this.runLengthEncode(uint8Array);
      return compressed;
    } catch (error) {
      console.error('❌ [IntelligentCache] Compression failed:', error);
      return data;
    }
  }

  async decompress(compressedData) {
    try {
      const decompressed = this.runLengthDecode(compressedData);
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decompressed);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('❌ [IntelligentCache] Decompression failed:', error);
      return compressedData;
    }
  }

  // 🔀 **SIMPLE RLE COMPRESSION**: Basic compression implementation
  runLengthEncode(data) {
    const result = [];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === data[i - 1] && count < 255) {
        count++;
      } else {
        result.push(count, data[i - 1]);
        count = 1;
      }
    }
    
    if (data.length > 0) {
      result.push(count, data[data.length - 1]);
    }
    
    return new Uint8Array(result);
  }

  runLengthDecode(compressedData) {
    const result = [];
    
    for (let i = 0; i < compressedData.length; i += 2) {
      const count = compressedData[i];
      const value = compressedData[i + 1];
      
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
    }
    
    return new Uint8Array(result);
  }

  // 🔢 **UTILITY FUNCTIONS**: Helper functions
  getQualityScore(quality) {
    const scores = { low: 1, standard: 2, high: 3, premium: 4 };
    return scores[quality] || 2;
  }

  estimateDataSize(data) {
    // Rough estimation of memory usage
    return JSON.stringify(data).length * 2; // UTF-16 approximation
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateFileHash(data) {
    // Simple hash for cache key generation
    const str = JSON.stringify(data).substring(0, 1000); // Sample first 1000 chars
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  updateAverageRetrievalTime(newTime) {
    const totalRequests = this.performanceMetrics.hits + this.performanceMetrics.misses;
    this.performanceMetrics.averageRetrievalTime = 
      (this.performanceMetrics.averageRetrievalTime * (totalRequests - 1) + newTime) / totalRequests;
  }

  // 🧹 **CLEANUP OPERATIONS**: Maintenance tasks
  async cleanupOldEntries() {
    if (!this.db) return;
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    try {
      const transaction = this.db.transaction(['waveformCache'], 'readwrite');
      const store = transaction.objectStore('waveformCache');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(oneWeekAgo);
      
      let deletedCount = 0;
      const request = index.openCursor(range);
      
      await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
      
      if (deletedCount > 0) {
        console.log(`🧹 [IntelligentCache] Cleanup complete: ${deletedCount} old entries removed`);
      }
    } catch (error) {
      console.error('❌ [IntelligentCache] Cleanup failed:', error);
    }
  }

  // 📊 **CACHE STATISTICS**: Performance monitoring
  getStatistics() {
    const hitRate = this.performanceMetrics.hits + this.performanceMetrics.misses > 0 
      ? (this.performanceMetrics.hits / (this.performanceMetrics.hits + this.performanceMetrics.misses) * 100).toFixed(1)
      : 0;
    
    return {
      memoryUsage: this.formatBytes(this.currentMemoryUsage),
      memoryCacheSize: this.memoryCache.size,
      hitRate: hitRate + '%',
      totalRequests: this.performanceMetrics.hits + this.performanceMetrics.misses,
      averageRetrievalTime: this.performanceMetrics.averageRetrievalTime.toFixed(2) + 'ms',
      compressionRatio: (this.performanceMetrics.compressionRatio * 100).toFixed(1) + '%'
    };
  }

  // 🔄 **INVALIDATE CACHE**: Manual cache invalidation
  async invalidate(pattern) {
    // Clear memory cache entries matching pattern
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        const entry = this.memoryCache.get(key);
        this.currentMemoryUsage -= this.estimateDataSize(entry.data);
        this.memoryCache.delete(key);
      }
    }
    
    // Clear IndexedDB entries matching pattern
    if (this.db) {
      const transaction = this.db.transaction(['waveformCache'], 'readwrite');
      const store = transaction.objectStore('waveformCache');
      const request = store.openCursor();
      
      await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.key.includes(pattern)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    }
    
    console.log(`🔄 [IntelligentCache] Cache invalidated for pattern: ${pattern}`);
  }

  // 🧹 **DISPOSE**: Cleanup resources
  dispose() {
    this.memoryCache.clear();
    this.currentMemoryUsage = 0;
    if (this.db) {
      this.db.close();
    }
    console.log('🧹 [IntelligentCache] Disposed successfully');
  }
}
