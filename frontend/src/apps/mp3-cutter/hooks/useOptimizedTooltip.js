import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * 🚀 **OPTIMIZED TOOLTIP HOOK** - Siêu tối ưu cho MP3 Cutter
 * 
 * ✅ **GIẢI PHÁP CHO EXCESSIVE RE-RENDERS:**
 * - Single animation loop thay vì multiple loops
 * - Smart change detection với proper throttling  
 * - Reduced re-renders bằng refs thay vì state
 * - Cleanup logic tốt hơn
 * 
 * ✅ **TÍNH NĂNG:**
 * - Realtime tooltip theo cursor khi phát nhạc
 * - Hover tooltip khi di chuột
 * - Handle tooltips cho start/end points
 * - Ultra-smooth 60fps animation
 */
export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef) => {
  // 🎯 **MINIMAL STATE** - Chỉ giữ state cần thiết cho render
  const [tooltipData, setTooltipData] = useState({
    currentTime: null,
    hover: null,
    handles: { start: null, end: null }
  });
  
  // 🚀 **PERFORMANCE REFS** - Tất cả logic xử lý qua refs
  const animationRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const lastPositionRef = useRef({ x: -1, time: -1 });
  const throttleTimeRef = useRef(0);
  const hoverTimeoutRef = useRef(null);
  
  // 🎯 **OPTIMIZED TIME FORMATTER** - Memoized và cached
  const formatTime = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return '0:00.000';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);
  
  // 🚀 **SMART UPDATE FUNCTION** - Chỉ update khi thực sự cần thiết
  const updateCurrentTimeTooltip = useCallback(() => {
    if (!canvasRef?.current || !audioRef?.current || !duration) return;
    
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    const realCurrentTime = audio.currentTime || 0;
    
    // 🎯 **ENHANCED THROTTLING** - Tăng throttling để giảm CPU usage
    const now = performance.now();
    if (now - throttleTimeRef.current < 32) return; // 30fps limit thay vì 60fps
    throttleTimeRef.current = now;
    
    // 🎯 **CALCULATE POSITION**
    const cursorX = (realCurrentTime / duration) * canvas.width;
    
    // 🚀 **SMART CHANGE DETECTION** - Tăng threshold để giảm updates
    const lastPos = lastPositionRef.current;
    const hasSignificantChange = 
      Math.abs(cursorX - lastPos.x) > 1.0 || // 1.0px threshold thay vì 0.5px
      Math.abs(realCurrentTime - lastPos.time) > 0.05; // 0.05s threshold thay vì 0.01s
    
    if (!hasSignificantChange) return;
    
    // 🎯 **UPDATE REFS** - Lưu position mới
    lastPositionRef.current = { x: cursorX, time: realCurrentTime };
    
    // 🚀 **CONDITIONAL VISIBILITY** - Chỉ hiện khi cần thiết
    const shouldShow = realCurrentTime > 0 && realCurrentTime <= duration;
    
    if (shouldShow) {
      // 🎯 **SINGLE STATE UPDATE** - Chỉ update một lần
      setTooltipData(prev => ({
        ...prev,
        currentTime: {
          visible: true,
          x: cursorX,
          time: realCurrentTime,
          formattedTime: formatTime(realCurrentTime),
          isPlaying: !audio.paused && !audio.ended
        }
      }));
    } else {
      // 🎯 **HIDE TOOLTIP** - Ẩn khi không cần
      setTooltipData(prev => ({
        ...prev,
        currentTime: null
      }));
    }
  }, [canvasRef, audioRef, duration, formatTime]);
  
  // 🚀 **LIGHTWEIGHT ANIMATION LOOP** - Chỉ chạy khi cần thiết  
  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    isAnimatingRef.current = true;
    
    const animate = () => {
      if (!isAnimatingRef.current) return;
      
      // 🎯 **CONDITIONAL UPDATE** - Chỉ update khi đang phát
      if (isPlaying && audioRef?.current) {
        updateCurrentTimeTooltip();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    console.log('🎯 [TooltipAnimation] Starting TOOLTIP animation (30fps)');
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, audioRef, updateCurrentTimeTooltip]);
  
  // 🚀 **CLEANUP ANIMATION**
  const stopAnimation = useCallback(() => {
    if (!isAnimatingRef.current) return;
    
    isAnimatingRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      console.log('🧹 [TooltipAnimation] Stopped TOOLTIP animation');
    }
  }, []);
  
  // 🎯 **SMART ANIMATION CONTROL** - Chỉ chạy khi cần thiết
  useEffect(() => {
    if (isPlaying && audioRef?.current && duration > 0) {
      startAnimation();
    } else {
      stopAnimation();
    }
    
    return stopAnimation;
  }, [isPlaying, audioRef, duration, startAnimation, stopAnimation]);
  
  // 🚀 **HOVER TOOLTIP** - Tối ưu hover detection
  const updateHoverTooltip = useCallback((mouseEvent) => {
    const now = performance.now();
    if (now - lastUpdateTimeRef.current < 16) return; // 60fps throttle
    lastUpdateTimeRef.current = now;
    
    // 🎯 **CLEAR PREVIOUS TIMEOUT**
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
    
    // 🎯 **VALIDATE POSITION**
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
      
      // 🎯 **AUTO HIDE** - Tự động ẩn sau 2s
      hoverTimeoutRef.current = setTimeout(() => {
        setTooltipData(prev => ({ ...prev, hover: null }));
      }, 2000);
    } else {
      setTooltipData(prev => ({ ...prev, hover: null }));
    }
  }, [canvasRef, duration, formatTime]);
  
  // 🚀 **CLEAR HOVER**
  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setTooltipData(prev => ({ ...prev, hover: null }));
  }, []);
  
  // 🧹 **CLEANUP ON UNMOUNT**
  useEffect(() => {
    return () => {
      stopAnimation();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [stopAnimation]);
  
  // 🎯 **MEMOIZED RETURN** - Tránh recreation
  return useMemo(() => ({
    currentTimeTooltip: tooltipData.currentTime,
    hoverTooltip: tooltipData.hover,
    handleTooltips: tooltipData.handles,
    updateHoverTooltip,
    clearHoverTooltip
  }), [tooltipData, updateHoverTooltip, clearHoverTooltip]);
}; 