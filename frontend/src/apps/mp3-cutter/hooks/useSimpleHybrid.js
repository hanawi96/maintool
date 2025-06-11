// 🪝 **SIMPLE HYBRID HOOK** - Easy integration with React components
import { useState, useRef, useCallback, useEffect } from 'react';
import { SimpleHybridService } from '../services/simpleHybridService.js';

export const useSimpleHybrid = () => {
  // 🔄 **SERVICE INSTANCE**
  const serviceRef = useRef(null);
  
  // 📊 **STATE**
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waveformData, setWaveformData] = useState(null);
  const [error, setError] = useState(null);

  // 🚀 **INITIALIZE SERVICE**
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new SimpleHybridService();
    }
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
      }
    };
  }, []);

  // 🎯 **PROCESS FILE**
  const processFile = useCallback(async (file, options = {}) => {
    if (!serviceRef.current || !file) return null;

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setWaveformData(null);

    try {
      const result = await serviceRef.current.processFile(file, {
        ...options,
        onProgress: (progressData) => {
          setProgress(progressData.progress || 0);
        }
      });

      setWaveformData(result);
      setProgress(100);
      
      console.log('✅ [useSimpleHybrid] Processing complete:', {
        fromCache: result.fromCache,
        strategy: result.strategy,
        time: result.processingTime.toFixed(2) + 'ms'
      });

      return result;
    } catch (err) {
      setError(err.message || 'Processing failed');
      console.error('❌ [useSimpleHybrid] Processing failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 📊 **GET STATS**
  const getStats = useCallback(() => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getStats();
  }, []);

  // 🧹 **CLEAR CACHE**
  const clearCache = useCallback(async () => {
    if (serviceRef.current?.cache) {
      await serviceRef.current.cache.clear();
    }
  }, []);

  return {
    // 🎯 **MAIN FUNCTIONS**
    processFile,
    
    // 📊 **STATE**
    isLoading,
    progress,
    waveformData,
    error,
    
    // 🔧 **UTILITIES**
    getStats,
    clearCache,
    
    // 📈 **DERIVED STATE**
    isReady: !!serviceRef.current,
    hasData: !!waveformData,
    hasError: !!error
  };
};
