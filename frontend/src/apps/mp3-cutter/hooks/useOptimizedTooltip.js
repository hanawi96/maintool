import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { formatTimeUnified } from '../utils/timeFormatter';
import { WAVEFORM_CONFIG } from '../utils/constants';

/**
 * 🚀 **ULTRA INSTANT TOOLTIP HOOK** - Zero delay cho tất cả tooltips
 * 
 * ✅ **ULTRA RESPONSIVE VERSION:**
 * - ⚡ **INSTANT HOVER TOOLTIP**: Direct calculation từ mouse position - ZERO DELAY
 * - ⚡ **INSTANT HANDLE TOOLTIPS**: Direct calculation từ startTime/endTime - ZERO DELAY  
 * - ⚡ **INSTANT MAIN CURSOR TOOLTIP**: Direct calculation từ currentTime - ZERO DELAY
 * - 🔥 **NO DELAYS**: Loại bỏ timeouts và animation frames
 * - 🎯 **SMART DURATION HIDING**: Ẩn duration tooltip khi region quá nhỏ
 * - 🔥 **PERFECT CONSISTENCY**: Unified time formatter cho consistency với CompactTimeSelector
 * - 🔧 **HANDLE SPACE AWARE**: Tooltips work with waveform area that excludes handle spaces
 */

// 🎯 **DURATION TOOLTIP CONSTANTS**
const DURATION_TOOLTIP_CONFIG = {
  // Font size 0.5rem, monospace, format MM.SS.CC = ~9 characters
  ESTIMATED_CHAR_WIDTH: 3.2, // pixels per character for 0.5rem monospace (~8px)
  TYPICAL_TIME_FORMAT_LENGTH: 9, // MM.SS.CC = 9 characters
  PADDING_BUFFER: 8, // Extra padding for 0.5rem font
  
  get ESTIMATED_WIDTH() {
    return this.ESTIMATED_CHAR_WIDTH * this.TYPICAL_TIME_FORMAT_LENGTH;
  },
  
  get MINIMUM_REGION_WIDTH() {
    return this.ESTIMATED_WIDTH + this.PADDING_BUFFER;
  }
};

// 🚀 **60FPS OPTIMIZED TOOLTIP HOOK** - Minimal overhead cho drag performance

export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging) => {
  // 🎯 **INSTANT HOVER STATE** - Track mouse position cho instant calculation
  const [hoverMousePosition, setHoverMousePosition] = useState(null);
  const [isHoverActive, setIsHoverActive] = useState(false);
  
  const hoverTimeoutRef = useRef(null);
  
  // 🚀 **RESIZE TRIGGER STATE** - Force tooltip update on window resize
  const [resizeTrigger, setResizeTrigger] = useState(0);
  
  // 🎯 **UNIFIED TIME FORMATTER** - Perfect consistency với CompactTimeSelector
  const formatTime = useCallback(formatTimeUnified, []);
  
  // 🚀 **RESPONSIVE FIX**: Get effective canvas width (no caching for realtime updates)
  const getEffectiveCanvasWidth = (canvas) => {
    return canvas.getBoundingClientRect().width;
  };
  
  // 🔧 **HANDLE SPACE CALCULATOR**: Calculate waveform area excluding handles
  const getWaveformArea = useCallback((canvas) => {
    const canvasWidth = getEffectiveCanvasWidth(canvas);
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = canvasWidth - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    return {
      canvasWidth,
      waveformStartX,
      waveformEndX,
      availableWaveformWidth,
      leftHandleWidth,
      rightHandleWidth
    };
  }, []);
  
  // 🚀 **WINDOW RESIZE LISTENER** - Update tooltips on window resize
  useEffect(() => {
    const handleResize = () => {
      setResizeTrigger(prev => prev + 1);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ⚡ **MAIN CURSOR CALCULATOR** - Optimized for 60fps with handle space awareness
  const calculateMainCursorTooltip = useCallback(() => {
    if (!canvasRef?.current || !duration || duration === 0 || typeof currentTime !== 'number') return null;
    
    const canvas = canvasRef.current;
    const { waveformStartX, availableWaveformWidth } = getWaveformArea(canvas);
    
    // 🔧 **MAP TO WAVEFORM AREA**: Map currentTime to waveform area
    const timePercent = currentTime / duration;
    const cursorX = waveformStartX + (timePercent * availableWaveformWidth);
    
    if (currentTime < 0 || currentTime > duration) return null;
    
    return {
      visible: true,
      x: cursorX,
      time: currentTime,
      formattedTime: formatTime(currentTime)
    };
  }, [canvasRef, duration, currentTime, formatTime, resizeTrigger, getWaveformArea]);
  
  // ⚡ **HANDLE TOOLTIPS CALCULATOR** - 60fps optimized with handle space awareness
  const calculateHandleTooltips = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration === 0 || startTime >= endTime) {
      return { start: null, end: null, selectionDuration: null };
    }
    
    const { waveformStartX, availableWaveformWidth } = getWaveformArea(canvas);
    
    // 🔧 **MAP TO WAVEFORM AREA**: Map start/end times to waveform area
    const startPercent = startTime / duration;
    const endPercent = endTime / duration;
    const startX = waveformStartX + (startPercent * availableWaveformWidth);
    const endX = waveformStartX + (endPercent * availableWaveformWidth);
    const selectionDuration = endTime - startTime;
    const durationX = (startX + endX) / 2;
    const regionWidthPx = Math.abs(endX - startX);
    const shouldShowDurationTooltip = selectionDuration >= 0.1 && regionWidthPx >= DURATION_TOOLTIP_CONFIG.MINIMUM_REGION_WIDTH;
    
    return {
      start: {
        visible: true,
        x: startX,
        time: startTime,
        formattedTime: formatTime(startTime)
      },
      end: {
        visible: true,
        x: endX,
        time: endTime,
        formattedTime: formatTime(endTime)
      },
      selectionDuration: shouldShowDurationTooltip ? {
        visible: true,
        x: durationX,
        duration: selectionDuration,
        formattedTime: formatTime(selectionDuration)
      } : null
    };
  }, [canvasRef, duration, startTime, endTime, formatTime, resizeTrigger, getWaveformArea]);
  
  // ⚡ **HOVER CALCULATOR** - 60fps optimized with handle space awareness
  const calculateHoverTooltip = useCallback(() => {
    if (!isHoverActive || !hoverMousePosition || !canvasRef?.current || !duration ||
        isDragging === 'start' || isDragging === 'end') return null;
    
    const canvas = canvasRef.current;
    const { x: mouseX } = hoverMousePosition;
    const { waveformStartX, waveformEndX, availableWaveformWidth } = getWaveformArea(canvas);
    
    // 🔧 **CHECK WAVEFORM BOUNDS**: Only show tooltip within waveform area
    if (mouseX < waveformStartX || mouseX > waveformEndX) return null;
    
    // 🔧 **MAP FROM WAVEFORM AREA**: Convert mouse position to time
    const waveformRelativeX = mouseX - waveformStartX;
    const timePercent = waveformRelativeX / availableWaveformWidth;
    const time = timePercent * duration;
    
    if (time < 0 || time > duration) return null;
    
    return {
      visible: true,
      x: mouseX,
      time,
      formattedTime: formatTime(time)
    };
  }, [isHoverActive, hoverMousePosition, canvasRef, duration, formatTime, isDragging, resizeTrigger, getWaveformArea]);
  
  // 🚀 **ULTRA FAST HOVER UPDATE**
  const updateHoverTooltip = useCallback((mouseEvent) => {
    if (!canvasRef?.current || !duration) {
      setHoverMousePosition(null);
      setIsHoverActive(false);
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = mouseEvent.clientX - rect.left;
    
    setHoverMousePosition({ x });
    setIsHoverActive(true);
    
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverActive(false);
      setHoverMousePosition(null);
    }, 2000);
  }, [canvasRef, duration]);
  
  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverActive(false);
    setHoverMousePosition(null);
  }, []);
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);
  
  // ⚡ **INSTANT CALCULATIONS** - Direct memoization for 60fps
  const mainCursorTooltip = useMemo(() => calculateMainCursorTooltip(), [calculateMainCursorTooltip]);
  const handleTooltips = useMemo(() => calculateHandleTooltips(), [calculateHandleTooltips]);
  const hoverTooltip = useMemo(() => calculateHoverTooltip(), [calculateHoverTooltip]);
  
  return useMemo(() => ({
    hoverTooltip,
    handleTooltips,
    mainCursorTooltip,
    updateHoverTooltip,
    clearHoverTooltip
  }), [hoverTooltip, handleTooltips, mainCursorTooltip, updateHoverTooltip, clearHoverTooltip]);
};