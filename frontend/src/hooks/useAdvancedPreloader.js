// 🚀 **PHASE 2: ADVANCED COMPONENT PRELOADER** - Smart preloading for Phase 2 optimization
import { useState, useEffect, useCallback, useRef } from 'react';

// 🎯 **INTERSECTION OBSERVER PRELOADER** - Preload based on user scroll behavior
export const useIntersectionPreloader = () => {
  const [preloadTriggers, setPreloadTriggers] = useState(new Set());

  const createTrigger = useCallback((elementRef, componentName, loadComponent) => {
    if (!elementRef.current || preloadTriggers.has(componentName)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log(`🎯 [IntersectionPreloader] Preloading ${componentName}...`);
            const startTime = performance.now();
            
            loadComponent()
              .then(() => {
                const endTime = performance.now();
                console.log(`⚡ [IntersectionPreloader] ${componentName} preloaded in ${(endTime - startTime).toFixed(2)}ms`);
              })
              .catch(console.warn);
            
            observer.disconnect();
            setPreloadTriggers(prev => new Set([...prev, componentName]));
          }
        });
      },
      { 
        rootMargin: '100px', // Start loading 100px before element comes into view
        threshold: 0.1 
      }
    );

    observer.observe(elementRef.current);
    
    return () => observer.disconnect();
  }, [preloadTriggers]);

  return { createTrigger };
};

// 🎯 **IDLE CALLBACK PRELOADER** - Preload during browser idle time
export const useIdlePreloader = () => {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    const requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    
    const handleIdle = () => {
      setIsIdle(true);
      console.log('🛌 [IdlePreloader] Browser is idle - perfect time for preloading');
    };

    requestIdleCallback(handleIdle, { timeout: 2000 });
  }, []);

  const preloadWhenIdle = useCallback((loadComponent, componentName) => {
    if (!isIdle) return;

    const requestIdleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    
    requestIdleCallback(() => {
      console.log(`🛌 [IdlePreloader] Preloading ${componentName} during idle time...`);
      const startTime = performance.now();
      
      loadComponent()
        .then(() => {
          const endTime = performance.now();
          console.log(`⚡ [IdlePreloader] ${componentName} preloaded in ${(endTime - startTime).toFixed(2)}ms`);
        })
        .catch(console.warn);
    }, { timeout: 1000 });
  }, [isIdle]);

  return { preloadWhenIdle, isIdle };
};

// 🎯 **USER INTERACTION PRELOADER** - Preload based on user actions
export const useInteractionPreloader = () => {
  const [interactionScore, setInteractionScore] = useState(0);

  const trackInteraction = useCallback((type) => {
    setInteractionScore(prev => {
      const newScore = prev + 1;
      
      // Trigger preloading after certain interaction thresholds
      if (newScore === 3) {
        console.log('🖱️ [InteractionPreloader] User is actively engaging - preloading FadeControls');
        import('../apps/mp3-cutter/components/Effects/FadeControls').catch(console.warn);      } else if (newScore === 5) {
        console.log('🖱️ [InteractionPreloader] High engagement - preloading ExportPanel');
        import('../apps/mp3-cutter/components/Export').catch(console.warn);
      }
      
      return newScore;
    });
  }, []);

  return { trackInteraction, interactionScore };
};

// Define preload queue outside component to avoid dependency issues
const PRELOAD_QUEUE = [
  {
    name: 'SmartWaveform',
    priority: 1,
    loader: () => import('../apps/mp3-cutter/components/Waveform/SmartWaveform'),
    trigger: 'fileLoad'
  },
  {
    name: 'UnifiedControlBar',
    priority: 2,
    loader: () => import('../apps/mp3-cutter/components/UnifiedControlBar'),
    trigger: 'fileLoad'
  },
  {
    name: 'FadeControls',
    priority: 3,
    loader: () => import('../apps/mp3-cutter/components/Effects/FadeControls'),
    trigger: 'waveformReady'
  },
  {
    name: 'ExportPanel',
    priority: 4,
    loader: () => import('../apps/mp3-cutter/components/Export'),
    trigger: 'userInteraction'
  }
];

// 🎯 **PROGRESSIVE PRELOADER** - Load components in priority order
export const useProgressivePreloader = () => {
  const [loadedComponents, setLoadedComponents] = useState(new Set());

  const triggerPreload = useCallback((trigger) => {
    const componentsToLoad = PRELOAD_QUEUE
      .filter(comp => comp.trigger === trigger && !loadedComponents.has(comp.name))
      .sort((a, b) => a.priority - b.priority);

    componentsToLoad.forEach((component, index) => {
      // Stagger loading to avoid overwhelming the browser
      setTimeout(() => {
        console.log(`🎯 [ProgressivePreloader] Loading ${component.name} (priority ${component.priority})`);
        const startTime = performance.now();
        
        component.loader()
          .then(() => {
            const endTime = performance.now();
            console.log(`⚡ [ProgressivePreloader] ${component.name} loaded in ${(endTime - startTime).toFixed(2)}ms`);
            setLoadedComponents(prev => new Set([...prev, component.name]));
          })
          .catch(console.warn);
      }, index * 200); // 200ms between each component
    });
  }, [loadedComponents]);

  return { triggerPreload, loadedComponents };
};

// 🎯 **NETWORK-AWARE PRELOADER** - Adjust preloading based on connection
export const useNetworkAwarePreloader = () => {
  const [connectionInfo, setConnectionInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    saveData: false
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const updateConnection = () => {
        setConnectionInfo({
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          saveData: navigator.connection.saveData
        });
      };

      updateConnection();
      navigator.connection.addEventListener('change', updateConnection);
      
      return () => {
        navigator.connection.removeEventListener('change', updateConnection);
      };
    }
  }, []);
  const shouldPreload = useCallback((componentSize = 'medium') => {
    const { effectiveType, saveData } = connectionInfo;
    
    // Don't preload if user has save-data enabled
    if (saveData) {
      console.log('📶 [NetworkPreloader] Save-data mode - skipping preload');
      return false;
    }
    
    // Adjust based on connection speed
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      console.log('📶 [NetworkPreloader] Slow connection - minimal preloading');
      return componentSize === 'small';
    }
    
    if (effectiveType === '3g' && componentSize === 'large') {
      console.log('📶 [NetworkPreloader] 3G connection - skipping large components');
      return false;
    }
    
    // Fast connection - preload everything
    return true;
  }, [connectionInfo]);

  return { shouldPreload, connectionInfo };
};

// 🎯 **MEMORY-AWARE PRELOADER** - Monitor memory usage
export const useMemoryAwarePreloader = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemory = () => {
        const newMemoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
        
        // Only update if there's a significant change to prevent infinite re-renders
        setMemoryInfo(prev => {
          if (!prev) return newMemoryInfo;
          
          const usageChange = Math.abs(newMemoryInfo.used - prev.used) / prev.used;
          if (usageChange > 0.05) { // Only update if 5% change
            return newMemoryInfo;
          }
          return prev;
        });
      };

      updateMemory();
      intervalRef.current = setInterval(updateMemory, 10000); // Check every 10 seconds instead of 5
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, []); // Empty dependency array to run only once

  const shouldPreload = useCallback(() => {
    if (!memoryInfo) return true; // If we can't measure, proceed

    const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
    
    if (usagePercent > 80) {
      console.log('🧠 [MemoryPreloader] High memory usage - skipping preload');
      return false;
    }
    
    if (usagePercent > 60) {
      console.log('🧠 [MemoryPreloader] Moderate memory usage - limited preloading');
      return 'limited';
    }
    
    return true;
  }, [memoryInfo]);

  return { shouldPreload, memoryInfo };
};

const advancedPreloaderHooks = {
  useIntersectionPreloader,
  useIdlePreloader,
  useInteractionPreloader,
  useProgressivePreloader,
  useNetworkAwarePreloader,
  useMemoryAwarePreloader
};

export default advancedPreloaderHooks;
