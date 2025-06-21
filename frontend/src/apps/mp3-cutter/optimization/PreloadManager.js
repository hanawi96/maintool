import { useEffect, useCallback } from 'react';
import { 
  useProgressivePreloader, useNetworkAwarePreloader, 
  useMemoryAwarePreloader, useInteractionPreloader 
} from '../../../hooks/useAdvancedPreloader';
import { 
  useWebWorkerPreloader, useIdleCallbackPreloader, useAdvancedComponentCache 
} from '../../../hooks/usePhase3OptimizationStable';
import { preloadHeavyComponents } from '../../../components/LazyComponents';

// 🚀 Smart preloader hook
export const useSmartPreloader = (audioFile, waveformData) => {
  const { triggerPreload } = useProgressivePreloader();
  const { shouldPreload: netPreload } = useNetworkAwarePreloader();
  const { shouldPreload: memPreload } = useMemoryAwarePreloader();
  const { trackInteraction } = useInteractionPreloader();

  useEffect(() => {
    if (audioFile && netPreload('large') && memPreload() !== false) {
      triggerPreload('fileLoad');
      preloadHeavyComponents();
    }
  }, [audioFile, netPreload, memPreload, triggerPreload]);

  useEffect(() => {
    if (waveformData.length > 0) triggerPreload('waveformReady');
  }, [waveformData.length, triggerPreload]);

  const handleUserInteraction = useCallback((type) => {
    trackInteraction(type);
    triggerPreload('userInteraction');
  }, [trackInteraction, triggerPreload]);

  return { handleUserInteraction };
};

// Phase 3 optimization manager
export const usePhase3OptimizationManager = (audioFile, isWorkerSupported, isWorkerReady, workerMetrics, addComponentToCache) => {
  const { preloadCriticalComponents } = useWebWorkerPreloader();
  const { scheduleIdlePreload } = useIdleCallbackPreloader();

  // Phase 3 optimization effects
  useEffect(() => {
    if (isWorkerSupported && isWorkerReady) {
      preloadCriticalComponents();
    }
    if (audioFile) {
      scheduleIdlePreload(() => {});
    }
  }, [isWorkerSupported, isWorkerReady, audioFile, preloadCriticalComponents, scheduleIdlePreload]);

  useEffect(() => {
    if (isWorkerReady && workerMetrics.totalPreloaded > 0) {
      workerMetrics.loadedComponents.forEach(componentName => {
        setTimeout(() => {
          addComponentToCache(componentName, null, { source: 'webWorker', preloadTime: Date.now() });
        }, 0);
      });
    }
  }, [workerMetrics.totalPreloaded, workerMetrics.loadedComponents, isWorkerReady, addComponentToCache]);

  return {
    preloadCriticalComponents,
    scheduleIdlePreload
  };
}; 