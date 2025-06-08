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
 * - Handle tooltips cho start/end points với realtime drag updates
 * - Ultra-smooth 30fps animation
 */
export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging) => {
  // 🎯 **MINIMAL STATE** - Chỉ giữ state cần thiết cho render
  const [tooltipData, setTooltipData] = useState({
    currentTime: null,
    hover: null,
    handles: { start: null, end: null, selectionDuration: null }
  });
  
  // 🚀 **PERFORMANCE REFS** - Tất cả logic xử lý qua refs
  const animationRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const lastPositionRef = useRef({ x: -1, time: -1 });
  const throttleTimeRef = useRef(0);
  const hoverTimeoutRef = useRef(null);
  
  // 🆕 **HANDLE TOOLTIP REFS** - Track handle tooltip states
  const lastHandlePositionsRef = useRef({ startX: -1, endX: -1 });
  const handleUpdateThrottleRef = useRef(0);
  
  // 🎯 **SIMPLE TIME FORMATTER** - Format theo yêu cầu: 00.00.00 (mm.ss.ms)
  const formatTime = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return '00.00.00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100); // 🆕 **CENTISECONDS**: Dùng centiseconds thay vì milliseconds cho format ngắn gọn
    return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
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
  
  // 🆕 **HANDLE TOOLTIPS UPDATE FUNCTION** - Realtime handle tooltips
  const updateHandleTooltips = useCallback(() => {
    if (!canvasRef?.current || !duration || startTime >= endTime) {
      // 🎯 **CLEAR HANDLES** - Ẩn khi không có selection
      setTooltipData(prev => ({
        ...prev,
        handles: { start: null, end: null, selectionDuration: null }
      }));
      return;
    }
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    
    // 🎯 **THROTTLING** - Giới hạn updates
    const now = performance.now();
    if (now - handleUpdateThrottleRef.current < 50) return; // 20fps cho handle tooltips
    handleUpdateThrottleRef.current = now;
    
    // 🎯 **CALCULATE POSITIONS**
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    
    // 🚀 **SMART CHANGE DETECTION** - Chỉ update khi có thay đổi đáng kể
    const lastPos = lastHandlePositionsRef.current;
    const hasSignificantChange = 
      Math.abs(startX - lastPos.startX) > 0.5 || 
      Math.abs(endX - lastPos.endX) > 0.5;
    
    if (!hasSignificantChange && !isDragging) return;
    
    // 🎯 **UPDATE REFS** - Lưu positions mới
    lastHandlePositionsRef.current = { startX, endX };
    
    // 🎯 **CALCULATE SELECTION DURATION**
    const selectionDuration = endTime - startTime;
    const durationX = (startX + endX) / 2; // Center between handles
    
    // 🎯 **ALWAYS SHOW HANDLES** - Start/End tooltips luôn hiển thị khi có selection
    const showStartHandle = true; // 🆕 **ALWAYS VISIBLE**: Luôn hiện start handle khi có selection
    const showEndHandle = true;   // 🆕 **ALWAYS VISIBLE**: Luôn hiện end handle khi có selection
    const showDuration = selectionDuration >= 0.1; // 🎯 **SIMPLIFIED**: Chỉ cần duration đủ lớn
    
    // 🎯 **UPDATE HANDLE TOOLTIPS STATE**
    setTooltipData(prev => ({
      ...prev,
      handles: {
        start: showStartHandle ? {
          visible: true,
          x: startX,
          time: startTime,
          formattedTime: formatTime(startTime)
        } : null,
        end: showEndHandle ? {
          visible: true,
          x: endX,
          time: endTime,
          formattedTime: formatTime(endTime)
        } : null,
        selectionDuration: showDuration ? {
          visible: true,
          x: durationX,
          duration: selectionDuration,
          formattedTime: formatTime(selectionDuration)
        } : null
      }
    }));
    
    // 🔧 **DEBUG HANDLE UPDATES** - Log khi có thay đổi lớn với positioning info
    if (hasSignificantChange || (isDragging && Math.random() < 0.1)) {
      console.log('🎛️ [SimpleTooltips] Always visible tooltips updated:', {
        startTime: `${startTime.toFixed(2)}s → ${formatTime(startTime)}`,
        endTime: `${endTime.toFixed(2)}s → ${formatTime(endTime)}`,
        duration: `${selectionDuration.toFixed(2)}s → ${formatTime(selectionDuration)}`,
        positions: {
          startX: `${startX.toFixed(1)}px`,
          endX: `${endX.toFixed(1)}px`,
          durationX: `${durationX.toFixed(1)}px (center)`
        },
        visibility: {
          start: 'ALWAYS',
          end: 'ALWAYS', 
          duration: showDuration ? 'YES' : 'NO'
        },
        states: { hoveredHandle, isDragging },
        canvasWidth: `${canvasWidth}px`,
        styling: 'Simple text-only, no background/icons',
        format: '00.00.00 (mm.ss.cs)'
      });
    }
  }, [canvasRef, duration, startTime, endTime, hoveredHandle, isDragging, formatTime]);
  
  // 🚀 **LIGHTWEIGHT ANIMATION LOOP** - Chỉ chạy khi cần thiết  
  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    isAnimatingRef.current = true;
    
    const animate = () => {
      if (!isAnimatingRef.current) return;
      
      // 🎯 **CONDITIONAL UPDATES** - Update theo priority
      if (isPlaying && audioRef?.current) {
        updateCurrentTimeTooltip();
      }
      
      // 🆕 **HANDLE TOOLTIPS UPDATE** - Update handle tooltips
      updateHandleTooltips();
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    console.log('🎯 [TooltipAnimation] Starting TOOLTIP animation (30fps) with handle support');
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, audioRef, updateCurrentTimeTooltip, updateHandleTooltips]);
  
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
  
  // 🎯 **SMART ANIMATION CONTROL** - Always run khi có duration để show start/end tooltips
  useEffect(() => {
    const needsAnimation = (isPlaying && audioRef?.current && duration > 0) || // Current time tooltip
                          hoveredHandle || // Hover interactions
                          isDragging ||    // Drag interactions
                          (startTime < endTime && duration > 0); // 🆕 **ALWAYS FOR SELECTION**: Always animate khi có selection để ensure tooltips update
    
    console.log('🎯 [TooltipAnimation] Animation control check:', {
      needsAnimation,
      reasons: {
        isPlaying: isPlaying && audioRef?.current && duration > 0,
        hoveredHandle: !!hoveredHandle,
        isDragging: !!isDragging,
        hasSelection: startTime < endTime && duration > 0
      }
    });
    
    if (needsAnimation) {
      startAnimation();
    } else {
      stopAnimation();
    }
    
    return stopAnimation;
  }, [isPlaying, audioRef, duration, hoveredHandle, isDragging, startTime, endTime, startAnimation, stopAnimation]);
  
  // 🆕 **IMMEDIATE HANDLE UPDATE** - Update handles ngay khi có thay đổi
  useEffect(() => {
    updateHandleTooltips();
  }, [startTime, endTime, hoveredHandle, isDragging, updateHandleTooltips]);
  
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
  return useMemo(() => {
    // 🔧 **DEBUG RETURN DATA** - Log state occasionally  
    if (Math.random() < 0.05) { // 5% sampling
      console.log('🎯 [SimpleTooltips] Return state:', {
        currentTimeTooltip: !!tooltipData.currentTime,
        hoverTooltip: !!tooltipData.hover, 
        handleTooltips: {
          start: !!tooltipData.handles.start,
          end: !!tooltipData.handles.end,
          selectionDuration: !!tooltipData.handles.selectionDuration
        },
        format: '00.00.00 (mm.ss.cs)',
        styling: 'Simple text-only, no background/borders/icons',
        visibility: 'Start/End always visible when selection exists'
      });
    }
    
    return {
      currentTimeTooltip: tooltipData.currentTime,
      hoverTooltip: tooltipData.hover,
      handleTooltips: tooltipData.handles,
      updateHoverTooltip,
      clearHoverTooltip
    };
  }, [tooltipData, updateHoverTooltip, clearHoverTooltip]);
}; 