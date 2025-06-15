import { useState, useEffect, useRef, useCallback } from 'react';

// ========== 1. WebWorker Preloader (disabled) ==========
export const useWebWorkerPreloader = () => {
  // Trả về object tĩnh, chỉ còn lại preloadCriticalComponents
  const preloadCriticalComponents = useCallback(() => {
    [
      () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'),
      () => import('../apps/mp3-cutter/components/UnifiedControlBar'),
      () => import('../apps/mp3-cutter/components/Effects/FadeControls'),
      () => import('../apps/mp3-cutter/components/Export')
    ].forEach((load, i) => setTimeout(() => load().catch(() => {}), i * 100));
    return 4;
  }, []);
  return {
    isReady: false,
    isSupported: false,
    metrics: {
      totalPreloaded: 0, averageLoadTime: 0, failureCount: 0, queueLength: 0, loadedComponents: []
    },
    addToPreloadQueue: () => false,
    startPreloading: () => false,
    preloadCriticalComponents,
    getMetrics: () => ({
      totalPreloaded: 0, averageLoadTime: 0, failureCount: 0, queueLength: 0, loadedComponents: []
    }),
    resetWorker: () => false
  };
};

// ========== 2. Idle Callback Preloader ==========
const _requestIdleCallback = window.requestIdleCallback ||
  ((cb, opt) => setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: false }), opt?.timeout || 1));
const _cancelIdleCallback = window.cancelIdleCallback || clearTimeout;

export const useIdleCallbackPreloader = () => {
  const [isIdle, setIsIdle] = useState(false);
  const idleHandleRef = useRef(null);

  const scheduleIdlePreload = useCallback((fn, timeout = 2000) => {
    if (idleHandleRef.current) _cancelIdleCallback(idleHandleRef.current);
    idleHandleRef.current = _requestIdleCallback(() => {
      setIsIdle(true);
      try { fn(); } finally { setIsIdle(false); }
    }, { timeout });
    return () => _cancelIdleCallback(idleHandleRef.current);
  }, []);

  useEffect(() => () => _cancelIdleCallback(idleHandleRef.current), []);
  return { isIdle, scheduleIdlePreload, requestIdleCallback: _requestIdleCallback, cancelIdleCallback: _cancelIdleCallback };
};

// ========== 3. Advanced Component Cache ==========
export const useAdvancedComponentCache = () => {
  const cacheRef = useRef(new Map());
  const [stats, setStats] = useState({ hits: 0, misses: 0, totalSize: 0, entryCount: 0 });

  const addToCache = useCallback((key, comp, meta = {}) => {
    if (cacheRef.current.has(key)) return;
    const size = meta.size || 1;
    cacheRef.current.set(key, { comp, ts: Date.now(), ac: 0, meta: { ...meta, size } });
    setStats(s => ({ ...s, totalSize: s.totalSize + size, entryCount: s.entryCount + 1 }));
  }, []);

  const getFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (entry) {
      entry.ac++; entry.last = Date.now();
      setStats(s => ({ ...s, hits: s.hits + 1 }));
      return entry.comp;
    } else {
      setStats(s => ({ ...s, misses: s.misses + 1 }));
      return null;
    }
  }, []);

  const removeFromCache = useCallback((key) => {
    const entry = cacheRef.current.get(key);
    if (!entry) return false;
    cacheRef.current.delete(key);
    setStats(s => ({
      ...s,
      totalSize: s.totalSize - entry.meta.size,
      entryCount: s.entryCount - 1
    }));
    return true;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    setStats({ hits: 0, misses: 0, totalSize: 0, entryCount: 0 });
  }, []);

  const optimizeCache = useCallback((maxSize = 100, maxAge = 10 * 60 * 1000) => {
    const now = Date.now();
    let removed = 0, freed = 0;
    for (const [k, v] of cacheRef.current) {
      if (now - v.ts > maxAge) { freed += v.meta.size; cacheRef.current.delete(k); removed++; }
    }
    if (cacheRef.current.size > maxSize) {
      [...cacheRef.current.entries()].sort(([, a], [, b]) => a.ac - b.ac)
        .slice(0, cacheRef.current.size - maxSize)
        .forEach(([k, v]) => { freed += v.meta.size; cacheRef.current.delete(k); removed++; });
    }
    setStats(s => ({
      ...s,
      totalSize: Math.max(0, s.totalSize - freed),
      entryCount: Math.max(0, s.entryCount - removed)
    }));
    return { removedCount: removed, freedSize: freed };
  }, []);

  return {
    addToCache,
    getFromCache,
    removeFromCache,
    clearCache,
    optimizeCache,
    cacheStats: stats,
    getCacheSize: () => cacheRef.current.size,
    getCacheKeys: () => Array.from(cacheRef.current.keys()),
  };
};
