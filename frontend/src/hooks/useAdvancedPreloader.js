import { useState, useEffect, useCallback, useRef } from 'react';

// 1. Intersection Observer Preloader
export const useIntersectionPreloader = () => {
  const loadedSetRef = useRef(new Set());
  const createTrigger = useCallback((elementRef, name, loader) => {
    if (!elementRef.current || loadedSetRef.current.has(name)) return;
    const observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          loader?.();
          loadedSetRef.current.add(name);
          observer.disconnect();
        }
      }
    }, { rootMargin: '100px', threshold: 0.1 });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);
  return { createTrigger };
};

// 2. Idle Callback Preloader
export const useIdlePreloader = () => {
  const [isIdle, setIsIdle] = useState(false);
  useEffect(() => {
    const cb = window.requestIdleCallback || ((f) => setTimeout(f, 1));
    cb(() => setIsIdle(true), { timeout: 2000 });
  }, []);
  const preloadWhenIdle = useCallback((loader) => { isIdle && loader?.(); }, [isIdle]);
  return { preloadWhenIdle, isIdle };
};

// 3. User Interaction Preloader
export const useInteractionPreloader = () => {
  const [score, setScore] = useState(0);
  const trackInteraction = useCallback((type) => {
    setScore(prev => {
      const n = prev + 1;
      if (n === 3) import('../apps/mp3-cutter/components/Effects/FadeControls').catch(()=>{});
      else if (n === 5) import('../apps/mp3-cutter/components/Export').catch(()=>{});
      return n;
    });
  }, []);
  return { trackInteraction, interactionScore: score };
};

// 4. Progressive Preloader (priority queue, only Set as ref, not state)
const PRELOAD_QUEUE = [
  { name: 'SmartWaveform', priority: 1, loader: () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'), trigger: 'fileLoad' },
  { name: 'UnifiedControlBar', priority: 2, loader: () => import('../apps/mp3-cutter/components/UnifiedControlBar'), trigger: 'fileLoad' },
  { name: 'FadeControls', priority: 3, loader: () => import('../apps/mp3-cutter/components/Effects/FadeControls'), trigger: 'waveformReady' },
  { name: 'ExportPanel', priority: 4, loader: () => import('../apps/mp3-cutter/components/Export'), trigger: 'userInteraction' }
];
export const useProgressivePreloader = () => {
  const loadedSet = useRef(new Set());
  const triggerPreload = useCallback((trigger) => {
    PRELOAD_QUEUE
      .filter(c => c.trigger === trigger && !loadedSet.current.has(c.name))
      .sort((a, b) => a.priority - b.priority)
      .forEach((c, i) => {
        setTimeout(() => {
          c.loader().then(() => loadedSet.current.add(c.name)).catch(()=>{});
        }, i * 150);
      });
  }, []);
  return { triggerPreload, loadedComponents: loadedSet.current };
};

// 5. Network-aware preloader
export const useNetworkAwarePreloader = () => {
  const [info, setInfo] = useState({ effectiveType: '4g', downlink: 10, saveData: false });
  useEffect(() => {
    if (!('connection' in navigator)) return;
    const update = () => setInfo({
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      saveData: navigator.connection.saveData
    });
    navigator.connection.addEventListener('change', update);
    update();
    return () => navigator.connection.removeEventListener('change', update);
  }, []);
  const shouldPreload = useCallback((size = 'medium') => {
    if (info.saveData) return false;
    if (info.effectiveType === '2g' || info.effectiveType === 'slow-2g') return size === 'small';
    if (info.effectiveType === '3g' && size === 'large') return false;
    return true;
  }, [info]);
  return { shouldPreload, connectionInfo: info };
};

// 6. Memory-aware preloader (uses ref, only updates when change >5%)
export const useMemoryAwarePreloader = () => {
  const [memory, setMemory] = useState(null);
  useEffect(() => {
    if (!performance.memory) return;
    const update = () => {
      const m = performance.memory;
      setMemory(prev => {
        if (!prev || Math.abs(m.usedJSHeapSize - prev.used) / prev.used > 0.05)
          return { used: m.usedJSHeapSize, total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit };
        return prev;
      });
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  const shouldPreload = useCallback(() => {
    if (!memory) return true;
    const percent = (memory.used / memory.limit) * 100;
    if (percent > 80) return false;
    if (percent > 60) return 'limited';
    return true;
  }, [memory]);
  return { shouldPreload, memoryInfo: memory };
};

export default {
  useIntersectionPreloader,
  useIdlePreloader,
  useInteractionPreloader,
  useProgressivePreloader,
  useNetworkAwarePreloader,
  useMemoryAwarePreloader,
};
