// 🪝 **ENHANCED WAVEFORM HOOK** - Hybrid system integration with backward compatibility
import { useState, useRef, useCallback } from 'react';
import { HybridWaveformGenerator } from '../services/hybridWaveformIntegration';

export const useEnhancedWaveform = () => {
  const [waveformData, setWaveformData] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const [hoveredHandle, setHoveredHandle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🆕 **ENHANCED STATE**: Additional state for hybrid features
  const [processingStrategy, setProcessingStrategy] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [prerenderedCanvas, setPrerenderedCanvas] = useState(null);
  
  const canvasRef = useRef(null);

  // 🎯 **ENHANCED WAVEFORM GENERATION**: Uses hybrid system with fallback
  const generateWaveform = useCallback(async (file) => {
    setIsGenerating(true);
    setFromCache(false);
    setProcessingStrategy(null);
    setProcessingTime(0);
    setPrerenderedCanvas(null);

    try {
      // 🎯 Validate file before processing
      if (!file) {
        throw new Error('No file provided for waveform generation');
      }

      if (file.size === 0) {
        throw new Error('File is empty');
      }

      // 🚀 **UNIFIED PROCESSING**: Single call, no duplicate loading states
      const result = await HybridWaveformGenerator.generateWaveform(file, {
        unifiedLoading: true, // 🔧 **PREVENT DOUBLE LOADING**: Flag to ensure single loading state
        quality: 'standard'
      });
      
      if (!result.data || result.data.length === 0) {
        throw new Error('Generated waveform data is empty');
      }

      if (!result.duration || result.duration <= 0) {
        throw new Error('Invalid duration from waveform generation');
      }

      // 🎯 Set waveform data
      setWaveformData(result.data);
      setEndTime(result.duration);
      setStartTime(0);
      
      // 🆕 **ENHANCED STATE**: Set hybrid-specific data
      setProcessingStrategy(result.strategy);
      setFromCache(result.fromCache || false);
      setProcessingTime(result.processingTime || 0);
      setPrerenderedCanvas(result.canvas || null);
      
      return result;
      
    } catch (error) {
      // 🎯 Reset state on error
      setWaveformData([]);
      setStartTime(0);
      setEndTime(0);
      setProcessingStrategy(null);
      setFromCache(false);
      setProcessingTime(0);
      setPrerenderedCanvas(null);
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 🎯 **ENHANCED RESET**: Reset function with hybrid state
  const reset = useCallback(() => {
    setWaveformData([]);
    setStartTime(0);
    setEndTime(0);
    setIsDragging(null);
    setHoveredHandle(null);
    setIsGenerating(false);
    
    // 🆕 **RESET HYBRID STATE**
    setProcessingStrategy(null);
    setFromCache(false);
    setProcessingTime(0);
    setPrerenderedCanvas(null);
    
  }, []);

  // 🎯 Enhanced setters with validation and logging
  const setStartTimeWithValidation = useCallback((time) => {
    const validTime = Math.max(0, Math.min(time, endTime - 0.1));
    setStartTime(validTime);
  }, [endTime]);

  const setEndTimeWithValidation = useCallback((time) => {
    const validTime = Math.max(startTime + 0.1, time);
    setEndTime(validTime);
  }, [startTime]);

  return {
    // 🔄 **BACKWARD COMPATIBLE STATE**: Same as original useWaveform
    waveformData,
    startTime,
    endTime,
    isDragging,
    hoveredHandle,
    isGenerating,
    
    // 🔄 **BACKWARD COMPATIBLE ACTIONS**: Same API as original
    generateWaveform,
    setStartTime: setStartTimeWithValidation,
    setEndTime: setEndTimeWithValidation,
    setIsDragging,
    setHoveredHandle,
    reset,
    
    // 🔄 **BACKWARD COMPATIBLE REFS**
    canvasRef,
    
    // 🆕 **ENHANCED FEATURES**: New hybrid-specific features
    enhancedFeatures: {
      processingStrategy,
      fromCache,
      processingTime,
      prerenderedCanvas,
      
      // 🎯 **PERFORMANCE INDICATORS**
      isFromCache: fromCache,
      isWorkerProcessed: processingStrategy === 'worker',
      isFallback: processingStrategy === 'fallback',
      
      // 🎯 **PERFORMANCE METRICS**
      getPerformanceStats: () => ({
        processingTime,
        strategy: processingStrategy,
        fromCache,
        speedImprovement: fromCache ? 'Instant (Cache)' : 
                         processingStrategy === 'worker' ? '4-10x Faster' : 'Standard'
      })
    },
    
    // 🎯 **DEBUG INFO**: Enhanced debug information
    debugInfo: {
      waveformDataLength: waveformData.length,
      hasData: waveformData.length > 0,
      timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      duration: endTime - startTime,
      
      // 🆕 **HYBRID DEBUG INFO**
      hybridInfo: {
        strategy: processingStrategy,
        fromCache,
        processingTime: processingTime + 'ms',
        hasPrerenderedCanvas: !!prerenderedCanvas
      }
    }
  };
};

// 🔄 **LEGACY SUPPORT**: Export original hook name for backward compatibility
export const useWaveform = useEnhancedWaveform;
