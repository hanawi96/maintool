import { useState, useRef, useCallback } from 'react';
import { WaveformGenerator } from '../services/waveformGenerator';

export const useWaveform = () => {
  const [waveformData, setWaveformData] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const [hoveredHandle, setHoveredHandle] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canvasRef = useRef(null);

  // 🎯 ENHANCED: Waveform generation with comprehensive logging
  const generateWaveform = useCallback(async (file) => {
    console.log('🌊 [useWaveform] Starting waveform generation...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    setIsGenerating(true);

    try {
      // 🎯 Validate file before processing
      if (!file) {
        throw new Error('No file provided for waveform generation');
      }

      if (file.size === 0) {
        throw new Error('File is empty');
      }

      console.log('🎯 [useWaveform] Calling WaveformGenerator...');
      const result = await WaveformGenerator.generateWaveform(file);
      
      console.log('✅ [useWaveform] Waveform generation successful:', {
        dataLength: result.data.length,
        duration: result.duration,
        sampleRate: result.sampleRate,
        channels: result.numberOfChannels
      });

      // 🎯 Validate result
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
      
      console.log('🎯 [useWaveform] Waveform state updated:', {
        waveformDataLength: result.data.length,
        startTime: 0,
        endTime: result.duration
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [useWaveform] Waveform generation failed:', error);
      
      // 🎯 Reset state on error
      setWaveformData([]);
      setStartTime(0);
      setEndTime(0);
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 🎯 ENHANCED: Reset function with logging
  const reset = useCallback(() => {
    console.log('🔄 [useWaveform] Resetting waveform state...');
    
    setWaveformData([]);
    setStartTime(0);
    setEndTime(0);
    setIsDragging(null);
    setHoveredHandle(null);
    setIsGenerating(false);
    
    console.log('✅ [useWaveform] Waveform state reset complete');
  }, []);

  // 🎯 Enhanced setters with validation and logging
  const setStartTimeWithValidation = useCallback((time) => {
    const validTime = Math.max(0, Math.min(time, endTime - 0.1));
    console.log('⏮️ [useWaveform] Setting start time:', time, '→', validTime);
    setStartTime(validTime);
  }, [endTime]);

  const setEndTimeWithValidation = useCallback((time) => {
    const validTime = Math.max(startTime + 0.1, time);
    console.log('⏭️ [useWaveform] Setting end time:', time, '→', validTime);
    setEndTime(validTime);
  }, [startTime]);

  return {
    // State
    waveformData,
    startTime,
    endTime,
    isDragging,
    hoveredHandle,
    isGenerating,
    
    // Actions
    generateWaveform,
    setStartTime: setStartTimeWithValidation,
    setEndTime: setEndTimeWithValidation,
    setIsDragging,
    setHoveredHandle,
    reset,
    
    // Refs
    canvasRef,
    
    // 🎯 NEW: Debug info
    debugInfo: {
      waveformDataLength: waveformData.length,
      hasData: waveformData.length > 0,
      timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
      duration: endTime - startTime
    }
  };
};