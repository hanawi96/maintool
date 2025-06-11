// 🧠 **SMART CACHE MANAGER** - Efficient caching with IndexedDB
export class SmartCacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryItems = 50;
    this.dbName = 'WaveformCache';
    this.dbVersion = 1;
    this.db = null;
    this.isIndexedDBSupported = 'indexedDB' in window;
    
    if (this.isIndexedDBSupported) {
      this.initIndexedDB();
    }
  }

  // 🗄️ **INIT INDEXEDDB**: Setup persistent storage
  async initIndexedDB() {
    try {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('waveforms')) {
          const store = db.createObjectStore('waveforms', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      this.db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      console.log('💾 [SmartCache] IndexedDB initialized');
    } catch (error) {
      console.warn('⚠️ [SmartCache] IndexedDB failed, using memory only:', error);
    }
  }

  // 💾 **SET CACHE**: Store data with compression
  async set(key, data) {
    const compressed = this.compress(data);
    const item = {
      id: key,
      data: compressed,
      timestamp: Date.now(),
      size: JSON.stringify(compressed).length
    };

    // Store in memory cache
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, item);

    // Store in IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['waveforms'], 'readwrite');
        const store = transaction.objectStore('waveforms');
        await store.put(item);
      } catch (error) {
        console.warn('⚠️ [SmartCache] IndexedDB write failed:', error);
      }
    }
  }

  // 📖 **GET CACHE**: Retrieve data with decompression
  async get(key) {
    // Check memory cache first
    let item = this.memoryCache.get(key);
    
    if (item) {
      console.log('⚡ [SmartCache] Memory cache hit:', key);
      return this.decompress(item.data);
    }

    // Check IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['waveforms'], 'readonly');
        const store = transaction.objectStore('waveforms');
        const request = store.get(key);
        
        item = await new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });

        if (item) {
          console.log('💾 [SmartCache] IndexedDB cache hit:', key);
          // Put back in memory cache
          this.memoryCache.set(key, item);
          return this.decompress(item.data);
        }
      } catch (error) {
        console.warn('⚠️ [SmartCache] IndexedDB read failed:', error);
      }
    }

    return null;
  }

  // 📦 **COMPRESS**: Simple data compression
  compress(data) {
    if (!data || !Array.isArray(data.data)) return data;
    
    // Quantize waveform data to reduce precision
    const quantized = data.data.map(val => Math.round(val * 1000) / 1000);
    
    return {
      ...data,
      data: quantized,
      compressed: true
    };
  }

  // 📤 **DECOMPRESS**: Restore compressed data
  decompress(data) {
    return data; // Simple quantization doesn't need decompression
  }

  // 📊 **GET STATS**: Cache statistics
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.maxMemoryItems,
      indexedDBSupported: this.isIndexedDBSupported,
      dbReady: !!this.db
    };
  }

  // 🧹 **CLEAR**: Clear all cache
  async clear() {
    this.memoryCache.clear();
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['waveforms'], 'readwrite');
        const store = transaction.objectStore('waveforms');
        await store.clear();
        console.log('🧹 [SmartCache] All cache cleared');
      } catch (error) {
        console.warn('⚠️ [SmartCache] Clear failed:', error);
      }
    }
  }
}
