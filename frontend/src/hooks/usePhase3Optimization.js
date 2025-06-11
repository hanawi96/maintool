// 🚀 **PHASE 3: WEB WORKER PRELOADER HOOK** - Ultimate performance optimization
import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebWorkerPreloader = () => {
  const workerRef = useRef(null);
  const [workerStatus, setWorkerStatus] = useState({
    isReady: false,
    isSupported: typeof Worker !== 'undefined',
    metrics: {
      totalPreloaded: 0,
      averageLoadTime: 0,
      failureCount: 0,
      queueLength: 0,
      loadedComponents: []
    }
  });  // 🎯 Initialize Web Worker
  useEffect(() => {
    if (!workerStatus.isSupported) {
      console.warn('🛠️ [WebWorkerPreloader] Web Workers not supported in this environment');
      return;
    }

    try {
      // For now, disable Web Worker to avoid blocking main functionality
      console.log('🛠️ [WebWorkerPreloader] Web Worker temporarily disabled for stability');
      setWorkerStatus(prev => ({ 
        ...prev, 
        isSupported: false,
        isReady: false 
      }));
      return;

      // TODO: Re-enable when Web Worker path issues are resolved
      /*
      let worker;
      
      try {
        // Try modern ES module worker first
        worker = new Worker(
          new URL('../workers/componentPreloader.js', import.meta.url),
          { type: 'module' }
        );
      } catch (esModuleError) {
        console.warn('🛠️ [WebWorkerPreloader] ES module worker failed, trying standard worker');
        
        // Fallback to standard worker (will be handled gracefully)
        worker = new Worker('/workers/componentPreloader.js');
      }

      workerRef.current = worker;
      */

      // Handle worker messages
      workerRef.current.onmessage = (event) => {
        const { type, data, metrics, componentName, loadTime, totalLoaded } = event.data;

        switch (type) {
          case 'WORKER_READY':
            console.log('🚀 [WebWorkerPreloader] Worker initialized and ready');
            setWorkerStatus(prev => ({ ...prev, isReady: true }));
            break;

          case 'COMPONENT_LOADED':
            console.log(`⚡ [WebWorkerPreloader] ${componentName} preloaded in ${loadTime?.toFixed(2)}ms (Total: ${totalLoaded})`);
            break;

          case 'COMPONENT_FAILED':
            console.warn(`❌ [WebWorkerPreloader] Failed to preload ${componentName}`);
            break;

          case 'QUEUE_UPDATED':
            setWorkerStatus(prev => ({
              ...prev,
              metrics: { ...prev.metrics, queueLength: data?.queueLength || 0 }
            }));
            break;

          case 'METRICS_RESPONSE':
          case 'PERIODIC_METRICS':
            if (metrics) {
              setWorkerStatus(prev => ({ ...prev, metrics }));
            }
            break;

          case 'ERROR':
            console.error('🚨 [WebWorkerPreloader] Worker error:', data);
            break;

          default:
            console.log('📨 [WebWorkerPreloader] Unknown message:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('🚨 [WebWorkerPreloader] Worker error:', error);
        setWorkerStatus(prev => ({ ...prev, isReady: false }));
      };

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          console.log('🛑 [WebWorkerPreloader] Worker terminated');
        }
      };
    } catch (error) {
      console.error('🚨 [WebWorkerPreloader] Failed to initialize worker:', error);
      setWorkerStatus(prev => ({ ...prev, isSupported: false }));
    }
  }, [workerStatus.isSupported]);

  // 🎯 Add component to preload queue
  const addToPreloadQueue = useCallback((componentName, importPath, priority = 1) => {
    if (!workerRef.current || !workerStatus.isReady) {
      console.warn('🛠️ [WebWorkerPreloader] Worker not ready, skipping preload');
      return false;
    }

    workerRef.current.postMessage({
      type: 'ADD_TO_QUEUE',
      data: { name: componentName, path: importPath, priority }
    });

    console.log(`📋 [WebWorkerPreloader] Added ${componentName} to preload queue (priority: ${priority})`);
    return true;
  }, [workerStatus.isReady]);

  // 🎯 Start processing the preload queue
  const startPreloading = useCallback(() => {
    if (!workerRef.current || !workerStatus.isReady) {
      console.warn('🛠️ [WebWorkerPreloader] Worker not ready');
      return false;
    }

    workerRef.current.postMessage({ type: 'START_PROCESSING' });
    console.log('🚀 [WebWorkerPreloader] Started processing preload queue');
    return true;
  }, [workerStatus.isReady]);

  // 🎯 Get current metrics
  const getMetrics = useCallback(() => {
    if (!workerRef.current || !workerStatus.isReady) {
      return workerStatus.metrics;
    }

    workerRef.current.postMessage({ type: 'GET_METRICS' });
    return workerStatus.metrics;
  }, [workerStatus.isReady, workerStatus.metrics]);

  // 🎯 Reset worker state
  const resetWorker = useCallback(() => {
    if (!workerRef.current || !workerStatus.isReady) {
      return false;
    }

    workerRef.current.postMessage({ type: 'RESET' });
    console.log('🔄 [WebWorkerPreloader] Reset worker state');
    return true;
  }, [workerStatus.isReady]);

  // 🎯 Preload critical components automatically
  const preloadCriticalComponents = useCallback(() => {
    const criticalComponents = [
      { name: 'SmartWaveform', path: '../apps/mp3-cutter/components/Waveform/SmartWaveform', priority: 10 },
      { name: 'UnifiedControlBar', path: '../apps/mp3-cutter/components/UnifiedControlBar', priority: 8 },
      { name: 'FadeControls', path: '../apps/mp3-cutter/components/Effects/FadeControls', priority: 6 },
      { name: 'ExportPanel', path: '../apps/mp3-cutter/components/Export', priority: 4 }
    ];

    let addedCount = 0;
    criticalComponents.forEach(component => {
      if (addToPreloadQueue(component.name, component.path, component.priority)) {
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setTimeout(() => startPreloading(), 100);
      console.log(`🎯 [WebWorkerPreloader] Queued ${addedCount} critical components for preloading`);
    }

    return addedCount;
  }, [addToPreloadQueue, startPreloading]);

  return {
    // Status
    isReady: workerStatus.isReady,
    isSupported: workerStatus.isSupported,
    metrics: workerStatus.metrics,
    
    // Actions
    addToPreloadQueue,
    startPreloading,
    preloadCriticalComponents,
    getMetrics,
    resetWorker
  };
};

// 🎯 **PHASE 3: IDLE CALLBACK PRELOADER** - Use browser idle time
export const useIdleCallbackPreloader = () => {
  const [isIdle, setIsIdle] = useState(false);
  const [idleHandle, setIdleHandle] = useState(null);

  const requestIdleCallback = useCallback((callback, options = {}) => {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, options);
    }
    
    // Fallback for browsers without requestIdleCallback
    return setTimeout(() => {
      const start = performance.now();
      callback({
        timeRemaining: () => Math.max(0, 50 - (performance.now() - start)),
        didTimeout: false
      });
    }, 1);
  }, []);

  const cancelIdleCallback = useCallback((handle) => {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(handle);
    } else {
      clearTimeout(handle);
    }
  }, []);

  const scheduleIdlePreload = useCallback((preloadFunction, timeout = 2000) => {
    if (idleHandle) {
      cancelIdleCallback(idleHandle);
    }

    const handle = requestIdleCallback((deadline) => {
      if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
        setIsIdle(true);
        console.log('🛌 [IdlePreloader] Browser is idle - executing preload');
        
        try {
          preloadFunction();
        } catch (error) {
          console.error('🚨 [IdlePreloader] Error during idle preload:', error);
        } finally {
          // Reset idle state after a delay
          setTimeout(() => setIsIdle(false), 1000);
        }
      }
    }, { timeout });

    setIdleHandle(handle);
    
    return () => {
      if (handle) {
        cancelIdleCallback(handle);
      }
    };
  }, [idleHandle, requestIdleCallback, cancelIdleCallback]);

  useEffect(() => {
    return () => {
      if (idleHandle) {
        cancelIdleCallback(idleHandle);
      }
    };
  }, [idleHandle, cancelIdleCallback]);

  return {
    isIdle,
    scheduleIdlePreload,
    requestIdleCallback,
    cancelIdleCallback
  };
};

// 🎯 **PHASE 3: ADVANCED CACHING SYSTEM** - Intelligent component caching
export const useAdvancedComponentCache = () => {
  const cacheRef = useRef(new Map());
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    totalSize: 0,
    entryCount: 0
  });

  const addToCache = useCallback((key, component, metadata = {}) => {
    const entry = {
      component,
      timestamp: Date.now(),
      accessCount: 0,
      metadata: {
        size: metadata.size || 1,
        priority: metadata.priority || 1,
        ...metadata
      }
    };

    cacheRef.current.set(key, entry);
    
    setCacheStats(prev => ({
      ...prev,
      totalSize: prev.totalSize + entry.metadata.size,
      entryCount: prev.entryCount + 1
    }));

    console.log(`📦 [ComponentCache] Added ${key} to cache (size: ${entry.metadata.size})`);
  }, []);

  const getFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      console.log(`✅ [ComponentCache] Cache hit for ${key} (accessed ${entry.accessCount} times)`);
      
      return entry.component;
    }
    
    setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
    console.log(`❌ [ComponentCache] Cache miss for ${key}`);
    
    return null;
  }, []);

  const removeFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (entry) {
      cacheRef.current.delete(key);
      setCacheStats(prev => ({
        ...prev,
        totalSize: prev.totalSize - entry.metadata.size,
        entryCount: prev.entryCount - 1
      }));
      console.log(`🗑️ [ComponentCache] Removed ${key} from cache`);
      return true;
    }
    return false;
  }, []);

  const clearCache = useCallback(() => {
    const entryCount = cacheRef.current.size;
    cacheRef.current.clear();
    setCacheStats({
      hits: 0,
      misses: 0,
      totalSize: 0,
      entryCount: 0
    });
    console.log(`🧹 [ComponentCache] Cleared cache (${entryCount} entries removed)`);
  }, []);

  const optimizeCache = useCallback((maxSize = 100, maxAge = 10 * 60 * 1000) => {
    const now = Date.now();
    let removedCount = 0;
    let freedSize = 0;

    // Remove old entries
    for (const [key, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > maxAge) {
        freedSize += entry.metadata.size;
        cacheRef.current.delete(key);
        removedCount++;
      }
    }

    // Remove least used entries if cache is too large
    if (cacheRef.current.size > maxSize) {
      const entries = Array.from(cacheRef.current.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount);
      
      const toRemove = entries.slice(0, entries.length - maxSize);
      toRemove.forEach(([key, entry]) => {
        freedSize += entry.metadata.size;
        cacheRef.current.delete(key);
        removedCount++;
      });
    }

    setCacheStats(prev => ({
      ...prev,
      totalSize: prev.totalSize - freedSize,
      entryCount: prev.entryCount - removedCount
    }));

    if (removedCount > 0) {
      console.log(`🔧 [ComponentCache] Optimized cache: removed ${removedCount} entries, freed ${freedSize} units`);
    }

    return { removedCount, freedSize };
  }, []);  return {
    addToCache,
    getFromCache,
    removeFromCache,
    clearCache,
    optimizeCache,
    cacheStats,
    getCacheSize: () => cacheRef.current.size,
    getCacheKeys: () => Array.from(cacheRef.current.keys())
  };
};
