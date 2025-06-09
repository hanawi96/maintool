import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { formatTimeUnified } from '../utils/timeFormatter';

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
  
  // 🚀 **WINDOW RESIZE LISTENER** - Update tooltips on window resize
  useEffect(() => {
    const handleResize = () => {
      setResizeTrigger(prev => prev + 1);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ⚡ **MAIN CURSOR CALCULATOR** - Optimized for 60fps
  const calculateMainCursorTooltip = useCallback(() => {
    if (!canvasRef?.current || !duration || duration === 0 || typeof currentTime !== 'number') return null;
    
    const canvas = canvasRef.current;
    const canvasWidth = getEffectiveCanvasWidth(canvas);
    const cursorX = (currentTime / duration) * canvasWidth;
    
    if (cursorX < 0 || cursorX > canvasWidth || currentTime < 0 || currentTime > duration) return null;
    
    return {
      visible: true,
      x: cursorX,
      time: currentTime,
      formattedTime: formatTime(currentTime)
    };
  }, [canvasRef, duration, currentTime, formatTime, resizeTrigger]);
  
  // ⚡ **HANDLE TOOLTIPS CALCULATOR** - 60fps optimized
  const calculateHandleTooltips = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration === 0 || startTime >= endTime) {
      return { start: null, end: null, selectionDuration: null };
    }
    
    const canvasWidth = getEffectiveCanvasWidth(canvas);
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
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
  }, [canvasRef, duration, startTime, endTime, formatTime, resizeTrigger]);
  
  // ⚡ **HOVER CALCULATOR** - 60fps optimized
  const calculateHoverTooltip = useCallback(() => {
    if (!isHoverActive || !hoverMousePosition || !canvasRef?.current || !duration ||
        isDragging === 'start' || isDragging === 'end') return null;
    
    const canvas = canvasRef.current;
    const { x: mouseX } = hoverMousePosition;
    const canvasWidth = getEffectiveCanvasWidth(canvas);
    const time = (mouseX / canvasWidth) * duration;
    
    if (time < 0 || time > duration || mouseX < 0 || mouseX > canvasWidth) return null;
    
    return {
      visible: true,
      x: mouseX,
      time,
      formattedTime: formatTime(time)
    };
  }, [isHoverActive, hoverMousePosition, canvasRef, duration, formatTime, isDragging, resizeTrigger]);
  
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