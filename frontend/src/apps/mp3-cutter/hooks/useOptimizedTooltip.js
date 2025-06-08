import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * 🚀 **OPTIMIZED TOOLTIP HOOK** - Hover và Handle tooltips only
 * 
 * ✅ **SIMPLIFIED VERSION:**
 * - 🎯 **HOVER TOOLTIP**: Tooltip khi hover mouse
 * - 🤚 **HANDLE TOOLTIPS**: Tooltips cho start/end handles và selection duration
 * - 💨 **ZERO LAG**: Instant response to all interactions
 */
export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging) => {
  // 🎯 **CORE STATE** - Chỉ hover và handles
  const [tooltipData, setTooltipData] = useState({
    hover: null,
    handles: { start: null, end: null, selectionDuration: null }
  });
  
  // 🚀 **IMMEDIATE REFS** - Zero delay updates
  const durationRef = useRef(duration);
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  const canvasRefRef = useRef(canvasRef);
  const isDraggingRef = useRef(isDragging);
  
  // 🔥 **ANIMATION REFS** - Chỉ cho handles
  const handlesAnimationRef = useRef(null);
  const isHandlesAnimatingRef = useRef(false);
  
  const handlesFrameCountRef = useRef(0);
  const hoverTimeoutRef = useRef(null);
  
  // 🔥 **IMMEDIATE SYNC** - No useEffect delays
  durationRef.current = duration;
  startTimeRef.current = startTime;
  endTimeRef.current = endTime;
  canvasRefRef.current = canvasRef;
  isDraggingRef.current = isDragging;
  
  // 🎯 **TIME FORMATTER**
  const formatTime = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return '00.00.00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);
  
  // 🆕 **INSTANT HANDLES ANIMATION**
  const runHandlesAnimation = useCallback(() => {
    if (isHandlesAnimatingRef.current) return;
    
    const animate = () => {
      if (!isHandlesAnimatingRef.current) return;
      
      handlesFrameCountRef.current++;
      
      const canvas = canvasRefRef.current?.current;
      const duration = durationRef.current;
      const startTime = startTimeRef.current;
      const endTime = endTimeRef.current;
      const currentIsDragging = isDraggingRef.current;
      
      if (canvas && duration) {
        if (startTime < endTime) {
          const canvasWidth = canvas.width;
          const startX = (startTime / duration) * canvasWidth;
          const endX = (endTime / duration) * canvasWidth;
          const selectionDuration = endTime - startTime;
          const durationX = (startX + endX) / 2;
          
          setTooltipData(prev => ({
            ...prev,
            handles: {
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
              selectionDuration: selectionDuration >= 0.1 ? {
                visible: true,
                x: durationX,
                duration: selectionDuration,
                formattedTime: formatTime(selectionDuration)
              } : null
            }
          }));
        }
      }
      
      handlesAnimationRef.current = requestAnimationFrame(animate);
    };
    
    isHandlesAnimatingRef.current = true;
    handlesFrameCountRef.current = 0;
    animate();
  }, [formatTime]);
  
  // 🔧 **STOP HANDLES ANIMATION**
  const stopHandlesAnimation = useCallback(() => {
    isHandlesAnimatingRef.current = false;
    if (handlesAnimationRef.current) {
      cancelAnimationFrame(handlesAnimationRef.current);
      handlesAnimationRef.current = null;
    }
  }, []);
  
  // 🚀 **HANDLES CONTROL** - Start once and run continuously
  useEffect(() => {
    const shouldStartHandlesAnimation = audioRef?.current && duration > 0;
    
    if (shouldStartHandlesAnimation) {
      runHandlesAnimation();
    } else {
      stopHandlesAnimation();
    }
    
    return stopHandlesAnimation;
  }, [audioRef, duration, runHandlesAnimation, stopHandlesAnimation]);
  
  // 🚀 **INSTANT HOVER TOOLTIP**
  const updateHoverTooltip = useCallback((mouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (!canvasRef?.current || !duration) {
      setTooltipData(prev => ({ ...prev, hover: null }));
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = mouseEvent.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    if (time >= 0 && time <= duration && x >= 0 && x <= canvas.width) {
      setTooltipData(prev => ({
        ...prev,
        hover: {
          visible: true,
          x,
          time,
          formattedTime: formatTime(time)
        }
      }));
      
      hoverTimeoutRef.current = setTimeout(() => {
        setTooltipData(prev => ({ ...prev, hover: null }));
      }, 2000);
    } else {
      setTooltipData(prev => ({ ...prev, hover: null }));
    }
  }, [canvasRef, duration, formatTime]);
  
  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setTooltipData(prev => ({ ...prev, hover: null }));
  }, []);
  
  // 🧹 **CLEANUP**
  useEffect(() => {
    return () => {
      stopHandlesAnimation();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [stopHandlesAnimation]);
  
  // 🎯 **RETURN** - Chỉ hover và handle tooltips
  return useMemo(() => {
    return {
      hoverTooltip: tooltipData.hover,
      handleTooltips: tooltipData.handles,
      updateHoverTooltip,
      clearHoverTooltip
    };
  }, [tooltipData, updateHoverTooltip, clearHoverTooltip]);
};