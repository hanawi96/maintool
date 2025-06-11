// 🚀 **PHASE 3: SIMPLIFIED OPTIMIZATION HOOKS** - Stable and working optimization
import { useState, useEffect, useRef, useCallback } from 'react';

// 🎯 **SIMPLIFIED WEB WORKER PRELOADER** - Disabled for stability
export const useWebWorkerPreloader = () => {
  const [workerStatus] = useState({
    isReady: false,
    isSupported: false, // Temporarily disabled
    metrics: {
      totalPreloaded: 0,
      averageLoadTime: 0,
      failureCount: 0,
      queueLength: 0,
      loadedComponents: []
    }
  });

  // 🎯 Mock functions for compatibility
  const addToPreloadQueue = useCallback(() => {
    console.log('🛠️ [WebWorkerPreloader] Currently disabled - preload queue not available');
    return false;
  }, []);

  const startPreloading = useCallback(() => {
    console.log('🛠️ [WebWorkerPreloader] Currently disabled');
    return false;
  }, []);

  const getMetrics = useCallback(() => {
    return workerStatus.metrics;
  }, [workerStatus.metrics]);

  const resetWorker = useCallback(() => {
    console.log('🛠️ [WebWorkerPreloader] Currently disabled');
    return false;
  }, []);

  const preloadCriticalComponents = useCallback(() => {
    console.log('🛠️ [WebWorkerPreloader] Currently disabled - using fallback preloading');
    
    // Fallback: Use regular dynamic imports for preloading
    const criticalComponents = [
      () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'),
      () => import('../apps/mp3-cutter/components/UnifiedControlBar'),
      () => import('../apps/mp3-cutter/components/Effects/FadeControls'),
      () => import('../apps/mp3-cutter/components/Export')
    ];

    // Preload components with staggered delays
    criticalComponents.forEach((loadComponent, index) => {
      setTimeout(() => {
        loadComponent().catch(console.warn);
      }, index * 100);
    });

    return criticalComponents.length;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Status
    isReady: workerStatus.isReady,
    isSupported: workerStatus.isSupported,
    metrics: workerStatus.metrics,
    
    // Actions (all work but with fallback behavior)
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
  const idleHandleRef = useRef(null); // Track handle to prevent stale closure

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
    // Use ref value to avoid stale closure
    if (idleHandleRef.current) {
      cancelIdleCallback(idleHandleRef.current);
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

    // Update both state and ref
    idleHandleRef.current = handle;
    
    return () => {
      if (handle) {
        cancelIdleCallback(handle);
      }
    };
  }, [requestIdleCallback, cancelIdleCallback]);

  useEffect(() => {
    return () => {
      if (idleHandleRef.current) {
        cancelIdleCallback(idleHandleRef.current);
      }
    };
  }, [cancelIdleCallback]);

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
  
  // 🆕 **THROTTLE STATS UPDATES**: Prevent infinite updates
  const statsUpdateTimeoutRef = useRef(null);
  const pendingStatsRef = useRef(null);
  
  const updateStatsThrottled = useCallback((updateFn) => {
    // Store pending update function
    pendingStatsRef.current = updateFn;
    
    // Clear existing timeout
    if (statsUpdateTimeoutRef.current) {
      clearTimeout(statsUpdateTimeoutRef.current);
    }
    
    // Schedule throttled update
    statsUpdateTimeoutRef.current = setTimeout(() => {
      if (pendingStatsRef.current && typeof pendingStatsRef.current === 'function') {
        setCacheStats(pendingStatsRef.current);
        pendingStatsRef.current = null;
      }
      statsUpdateTimeoutRef.current = null;
    }, 100); // 100ms throttle
  }, []);

  const addToCache = useCallback((key, component, metadata = {}) => {
    // Check if key already exists to prevent duplicate updates
    if (cacheRef.current.has(key)) {
      console.log(`📦 [ComponentCache] ${key} already in cache - skipping duplicate add`);
      return;
    }
    
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
    
    // Use throttled update to prevent infinite loops
    updateStatsThrottled(prev => ({
      ...prev,
      totalSize: prev.totalSize + entry.metadata.size,
      entryCount: prev.entryCount + 1
    }));

    console.log(`📦 [ComponentCache] Added ${key} to cache (size: ${entry.metadata.size})`);
  }, [updateStatsThrottled]);

  const getFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      // Use throttled update for hits
      updateStatsThrottled(prev => ({ ...prev, hits: prev.hits + 1 }));
      console.log(`✅ [ComponentCache] Cache hit for ${key} (accessed ${entry.accessCount} times)`);
      
      return entry.component;
    }
    
    // Use throttled update for misses
    updateStatsThrottled(prev => ({ ...prev, misses: prev.misses + 1 }));
    console.log(`❌ [ComponentCache] Cache miss for ${key}`);
    
    return null;
  }, [updateStatsThrottled]);

  const removeFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (entry) {
      cacheRef.current.delete(key);
      updateStatsThrottled(prev => ({
        ...prev,
        totalSize: prev.totalSize - entry.metadata.size,
        entryCount: prev.entryCount - 1
      }));
      console.log(`🗑️ [ComponentCache] Removed ${key} from cache`);
      return true;
    }
    return false;
  }, [updateStatsThrottled]);

  const clearCache = useCallback(() => {
    const entryCount = cacheRef.current.size;
    cacheRef.current.clear();
    
    // Use throttled update for consistency
    updateStatsThrottled(() => ({
      hits: 0,
      misses: 0,
      totalSize: 0,
      entryCount: 0
    }));
    
    console.log(`🧹 [ComponentCache] Cleared cache (${entryCount} entries removed)`);
  }, [updateStatsThrottled]);

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

    updateStatsThrottled(prev => ({
      ...prev,
      totalSize: prev.totalSize - freedSize,
      entryCount: prev.entryCount - removedCount
    }));

    if (removedCount > 0) {
      console.log(`🔧 [ComponentCache] Optimized cache: removed ${removedCount} entries, freed ${freedSize} units`);
    }

    return { removedCount, freedSize };
  }, [updateStatsThrottled]);
  
  // 🧹 **CLEANUP**: Clear timeout and pending operations on unmount
  useEffect(() => {
    return () => {
      if (statsUpdateTimeoutRef.current) {
        clearTimeout(statsUpdateTimeoutRef.current);
        statsUpdateTimeoutRef.current = null;
      }
      // Clear pending state update to prevent memory leaks
      pendingStatsRef.current = null;
    };
  }, []);

  return {
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
