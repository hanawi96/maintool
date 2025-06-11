// 🚀 **HYBRID WAVEFORM HOOK** - Integration hook for the complete system
// filepath: d:\mp3-cutter-pro\frontend\src\apps\mp3-cutter\hooks\useHybridWaveform.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { HybridWaveformService } from '../services/hybridWaveformService';

export const useHybridWaveform = () => {
  // 🔄 **SERVICE INSTANCE**: Singleton hybrid service
  const serviceRef = useRef(null);
  
  // 📊 **STATE MANAGEMENT**: Waveform processing state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('idle'); // idle, thumbnail, processing, rendering, complete
  const [progress, setProgress] = useState(0);
  const [waveformData, setWaveformData] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [error, setError] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);
  
  // 🎯 **PROCESSING QUEUE**: Handle multiple file processing
  const processingQueueRef = useRef([]);
  const currentProcessingRef = useRef(null);

  // 🚀 **INITIALIZATION**: Initialize service on first use
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new HybridWaveformService();
      console.log('🚀 [useHybridWaveform] Hybrid service initialized');
    }
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose();
        serviceRef.current = null;
        console.log('🧹 [useHybridWaveform] Service disposed');
      }
    };
  }, []);

  // 🎯 **MAIN PROCESSING FUNCTION**: Process audio file with hybrid approach
  const processFile = useCallback(async (file, options = {}) => {
    if (!serviceRef.current) {
      console.error('❌ [useHybridWaveform] Service not initialized');
      return null;
    }
    
    const { 
      quality = 'standard', 
      priority = 'normal',
      onProgress = null,
      onThumbnail = null 
    } = options;
    
    console.log('🎯 [useHybridWaveform] Starting file processing:', {
      fileName: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      quality,
      priority
    });
    
    try {
      setIsLoading(true);
      setLoadingPhase('thumbnail');
      setProgress(0);
      setError(null);
      setWaveformData(null);
      setThumbnail(null);
      
      // 🔄 **CANCEL PREVIOUS**: Cancel any ongoing processing
      if (currentProcessingRef.current) {
        currentProcessingRef.current.cancelled = true;
      }
      
      // 🎯 **NEW PROCESSING CONTEXT**: Create new processing context
      const processingContext = { cancelled: false, fileId: Date.now().toString() };
      currentProcessingRef.current = processingContext;
      
      // 🚀 **PHASE 1: IMMEDIATE THUMBNAIL** (0-20%)
      setLoadingPhase('thumbnail');
      setProgress(10);
      
      // 🔧 **HYBRID PROCESSING**: Use the intelligent hybrid service
      const result = await serviceRef.current.processFile(file, {
        quality,
        priority,
        onProgress: (progressData) => {
          if (processingContext.cancelled) return;
          
          const phase = progressData.phase || 'processing';
          const percent = progressData.percent || 0;
          
          setLoadingPhase(phase);
          setProgress(Math.min(95, 20 + (percent * 0.75))); // Scale to 20-95%
          
          if (onProgress) {
            onProgress({ phase, percent, ...progressData });
          }
        }
      });
      
      // ❌ **CHECK CANCELLATION**: Stop if cancelled
      if (processingContext.cancelled) {
        console.log('🔄 [useHybridWaveform] Processing cancelled');
        return null;
      }
      
      // ✅ **PROCESSING COMPLETE**: Update state with results
      setLoadingPhase('complete');
      setProgress(100);
      
      // 📊 **SET RESULTS**: Update state with processed data
      if (result.thumbnail && onThumbnail) {
        setThumbnail(result.thumbnail);
        onThumbnail(result.thumbnail);
      }
      
      setWaveformData(result);
      setProcessingStats({
        processingTime: result.processingTime,
        strategy: result.strategy,
        fromCache: result.fromCache,
        quality: result.quality || quality
      });
      
      console.log('✅ [useHybridWaveform] Processing complete:', {
        strategy: result.strategy,
        processingTime: result.processingTime?.toFixed(2) + 'ms',
        fromCache: result.fromCache,
        dataPoints: result.data?.length || 0
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [useHybridWaveform] Processing failed:', error);
      setError(error.message || 'Processing failed');
      return null;
    } finally {
      setIsLoading(false);
      setLoadingPhase('idle');
      currentProcessingRef.current = null;
    }
  }, []);

  // 🔄 **CANCEL PROCESSING**: Cancel current processing
  const cancelProcessing = useCallback(() => {
    if (currentProcessingRef.current) {
      currentProcessingRef.current.cancelled = true;
      currentProcessingRef.current = null;
      
      setIsLoading(false);
      setLoadingPhase('idle');
      setProgress(0);
      
      console.log('🔄 [useHybridWaveform] Processing cancelled by user');
    }
  }, []);

  // 📊 **GET PERFORMANCE STATS**: Get current performance statistics
  const getPerformanceStats = useCallback(() => {
    if (!serviceRef.current) return null;
    return serviceRef.current.getPerformanceStatistics();
  }, []);

  // 🧠 **CACHE MANAGEMENT**: Cache-related functions
  const cacheManager = {
    // 🔄 **INVALIDATE CACHE**: Clear cache for specific pattern
    invalidate: useCallback((pattern) => {
      if (serviceRef.current?.intelligentCache) {
        return serviceRef.current.intelligentCache.invalidate(pattern);
      }
    }, []),
    
    // 📊 **GET CACHE STATS**: Get cache statistics
    getStats: useCallback(() => {
      if (serviceRef.current?.intelligentCache) {
        return serviceRef.current.intelligentCache.getStatistics();
      }
      return null;
    }, []),
    
    // 🧹 **CLEAR ALL**: Clear entire cache
    clearAll: useCallback(() => {
      if (serviceRef.current?.intelligentCache) {
        serviceRef.current.intelligentCache.dispose();
        // Reinitialize cache
        serviceRef.current.intelligentCache = new (serviceRef.current.intelligentCache.constructor)();
      }
    }, [])
  };

  // 🎯 **BATCH PROCESSING**: Process multiple files efficiently
  const processBatch = useCallback(async (files, options = {}) => {
    if (!Array.isArray(files) || files.length === 0) return [];
    
    const { 
      batchSize = 3, 
      onBatchProgress = null,
      quality = 'standard' 
    } = options;
    
    console.log(`🎯 [useHybridWaveform] Starting batch processing:`, {
      totalFiles: files.length,
      batchSize,
      quality
    });
    
    const results = [];
    let completedFiles = 0;
    
    // 🔄 **PROCESS IN BATCHES**: Process files in batches to prevent overwhelming
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // 🚀 **PARALLEL PROCESSING**: Process batch files in parallel
      const batchPromises = batch.map(async (file, batchIndex) => {
        try {
          const result = await processFile(file, {
            quality,
            priority: 'batch',
            onProgress: (progressData) => {
              if (onBatchProgress) {
                onBatchProgress({
                  fileIndex: i + batchIndex,
                  fileName: file.name,
                  fileProgress: progressData.percent,
                  totalProgress: ((completedFiles + (progressData.percent / 100)) / files.length) * 100
                });
              }
            }
          });
          
          completedFiles++;
          return { file, result, success: true };
        } catch (error) {
          console.error(`❌ [useHybridWaveform] Batch processing failed for ${file.name}:`, error);
          return { file, error: error.message, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 🔄 **BATCH COMPLETE**: Small delay between batches
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ [useHybridWaveform] Batch processing complete:`, {
      totalFiles: files.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
    
    return results;
  }, [processFile]);

  // 🎨 **PRELOAD OPTIMIZATIONS**: Preload common files
  const preloadFile = useCallback(async (file, options = {}) => {
    if (!serviceRef.current) return;
    
    // 🔄 **BACKGROUND PRELOAD**: Load with low priority in background
    try {
      await serviceRef.current.processFile(file, {
        ...options,
        priority: 'low',
        quality: 'standard'
      });
      
      console.log('🎨 [useHybridWaveform] File preloaded successfully:', file.name);
    } catch (error) {
      console.warn('⚠️ [useHybridWaveform] Preload failed (non-critical):', error);
    }
  }, []);

  // 🔧 **UTILITY FUNCTIONS**: Helper functions
  const utils = {
    // 📏 **ESTIMATE PROCESSING TIME**: Estimate how long processing will take
    estimateProcessingTime: useCallback((file, quality = 'standard') => {
      if (!serviceRef.current) return 0;
      
      const stats = serviceRef.current.getPerformanceStatistics();
      const baseTime = stats.averageLoadTime || 500; // Default 500ms
      
      // 🎯 **ESTIMATION FACTORS**: File size, quality, cache hit rate
      const fileSizeFactor = Math.log10(file.size / 1024 / 1024 + 1); // Log scale for file size
      const qualityFactors = { low: 0.5, standard: 1.0, high: 1.5, premium: 2.0 };
      const qualityFactor = qualityFactors[quality] || 1.0;
      const cacheHitRate = parseFloat(stats.cacheHitRate) / 100;
      
      const estimatedTime = baseTime * fileSizeFactor * qualityFactor * (1 - cacheHitRate * 0.9);
      return Math.max(50, estimatedTime); // Minimum 50ms
    }, []),
    
    // 🎯 **GET OPTIMAL QUALITY**: Suggest optimal quality based on file and device
    getOptimalQuality: useCallback((file) => {
      const fileSizeMB = file.size / 1024 / 1024;
      const isMobile = window.innerWidth < 768;
      
      if (isMobile && fileSizeMB > 10) return 'standard';
      if (fileSizeMB > 50) return 'high';
      if (fileSizeMB > 100) return 'premium';
      return 'standard';
    }, []),
    
    // 📊 **FORMAT FILE SIZE**: Human readable file size
    formatFileSize: useCallback((bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, [])
  };

  return {
    // 🎯 **CORE FUNCTIONS**: Main processing functions
    processFile,
    processBatch,
    preloadFile,
    cancelProcessing,
    
    // 📊 **STATE**: Current processing state
    isLoading,
    loadingPhase,
    progress,
    waveformData,
    thumbnail,
    error,
    processingStats,
    
    // 🔧 **UTILITIES**: Helper functions and management
    getPerformanceStats,
    cacheManager,
    utils,
    
    // 🎨 **DERIVED STATE**: Computed values
    isProcessing: isLoading && loadingPhase !== 'idle',
    hasResults: !!waveformData,
    hasThumbnail: !!thumbnail,
    hasError: !!error,
    
    // 📈 **LOADING STATES**: Specific loading states
    isLoadingThumbnail: loadingPhase === 'thumbnail',
    isProcessingAudio: loadingPhase === 'processing',
    isRendering: loadingPhase === 'rendering',
    isComplete: loadingPhase === 'complete'
  };
};

export default useHybridWaveform;
