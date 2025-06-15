import { useState, useRef, useCallback } from 'react';
import { HybridWaveformGenerator } from '../services/hybridWaveformIntegration';

// Tối ưu state, reset, validate, chuẩn hóa error handling
export const useEnhancedWaveform = () => {
  const [waveformData, setWaveformData] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const [hoveredHandle, setHoveredHandle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hybrid state
  const [processingStrategy, setProcessingStrategy] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [prerenderedCanvas, setPrerenderedCanvas] = useState(null);

  const canvasRef = useRef(null);

  const generateWaveform = useCallback(async (file) => {
    setIsGenerating(true);
    setFromCache(false);
    setProcessingStrategy(null);
    setProcessingTime(0);
    setPrerenderedCanvas(null);

    try {
      if (!file || file.size === 0) throw new Error('No file provided or file is empty');
      const result = await HybridWaveformGenerator.generateWaveform(file, {
        unifiedLoading: true,
        quality: 'standard'
      });
      if (!result.data?.length || !result.duration) throw new Error('Generated waveform data is empty or invalid');

      setWaveformData(result.data);
      setEndTime(result.duration);
      setStartTime(0);
      setProcessingStrategy(result.strategy);
      setFromCache(!!result.fromCache);
      setProcessingTime(result.processingTime || 0);
      setPrerenderedCanvas(result.canvas || null);
      return result;
    } catch (error) {
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

  const reset = useCallback(() => {
    setWaveformData([]); setStartTime(0); setEndTime(0);
    setIsDragging(null); setHoveredHandle(null); setIsGenerating(false);
    setProcessingStrategy(null); setFromCache(false); setProcessingTime(0); setPrerenderedCanvas(null);
  }, []);

  const setStartTimeWithValidation = useCallback(
    (time) => setStartTime(Math.max(0, Math.min(time, endTime - 0.1))),
    [endTime]
  );
  const setEndTimeWithValidation = useCallback(
    (time) => setEndTime(Math.max(startTime + 0.1, time)),
    [startTime]
  );

  return {
    waveformData, startTime, endTime, isDragging, hoveredHandle, isGenerating,
    generateWaveform,
    setStartTime: setStartTimeWithValidation,
    setEndTime: setEndTimeWithValidation,
    setIsDragging, setHoveredHandle, reset,
    canvasRef,
    enhancedFeatures: {
      processingStrategy, fromCache, processingTime, prerenderedCanvas,
      isFromCache: fromCache,
      isWorkerProcessed: processingStrategy === 'worker',
      isFallback: processingStrategy === 'fallback',
      getPerformanceStats: () => ({
        processingTime, strategy: processingStrategy, fromCache,
        speedImprovement: fromCache
          ? 'Instant (Cache)'
          : processingStrategy === 'worker'
          ? '4-10x Faster'
          : 'Standard'
      }),
    },
    debugInfo: {
      waveformDataLength: waveformData.length,
      hasData: waveformData.length > 0,
      timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      duration: endTime - startTime,
      hybridInfo: {
        strategy: processingStrategy,
        fromCache,
        processingTime: processingTime + 'ms',
        hasPrerenderedCanvas: !!prerenderedCanvas
      }
    }
  };
};

// Backward compatible export
export const useWaveform = useEnhancedWaveform;
