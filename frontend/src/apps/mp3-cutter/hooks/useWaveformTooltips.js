// 🔄 **LEGACY HOOK** - Backup của useWaveformTooltips cũ
// ⚠️ **DEPRECATED**: Đã được thay thế bởi useOptimizedTooltip.js
// 📝 **GIỮ LẠI**: Để reference và rollback nếu cần

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export const useWaveformTooltips = (canvasRef, duration, startTime, endTime, isDragging, currentTime, isPlaying, audioRef) => {
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [handleTooltips, setHandleTooltips] = useState({
    startHandle: null,
    endHandle: null,
    selectionDuration: null
  });
  
  // 🆕 **CURRENT TIME TOOLTIP STATE**: Tooltip cho main cursor phát nhạc
  const [currentTimeTooltip, setCurrentTimeTooltip] = useState(null);
  
  const lastHoverUpdateRef = useRef(0);
  const hoverTimeoutRef = useRef(null);
  
  // 🆕 **REALTIME REFS**: Direct audio reading cho ultra-smooth updates
  const realtimeAnimationRef = useRef(null);
  const lastRealtimeUpdateRef = useRef(0);
  const isRealtimeActiveRef = useRef(false);
  const animationCallCountRef = useRef(0);
  
  // 🚀 **PERFORMANCE OPTIMIZATION**: Prevent excessive state updates
  const lastTooltipDataRef = useRef(null);
  const updateThrottleRef = useRef(0);
  
  // 🚀 **OPTIMIZED TIME FORMATTER**: Memoized format function
  const formatTime = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return '0:00.000';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);

  // 🚀 **STABLE FUNCTION REFS**: Prevent dependency hell và improve performance
  const updateCurrentTimeTooltipRealtimeRef = useRef(null);
  const startRealtimeTooltipAnimationRef = useRef(null);
  const stopRealtimeTooltipAnimationRef = useRef(null);

  // 🔧 **DEBUG THROTTLING**: Reduce console spam
  const debugIntervalRef = useRef(null);
  
  useEffect(() => {
    debugIntervalRef.current = setInterval(() => {
      if (!audioRef?.current) return;
      
      const realCurrentTime = audioRef.current.currentTime || 0;
      const audioPaused = audioRef.current.paused;
      const audioEnded = audioRef.current.ended;
      
      console.log('🔧 [TooltipDebug] Audio State Check:', {
        realCurrentTime: `${realCurrentTime.toFixed(3)}s`,
        stateTime: `${currentTime.toFixed(3)}s`,
        timeDiff: `${Math.abs(realCurrentTime - currentTime).toFixed(3)}s`,
        audioPaused,
        audioEnded,
        isRealtimeActive: isRealtimeActiveRef.current
      });
    }, 1000); // Every 1 second instead of every update
    
    return () => {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
      }
    };
  }, [currentTime, audioRef]);

  // 🚀 **FIXED VISIBILITY LOGIC**: Simplified - tooltip luôn visible khi có audio và thời gian hợp lệ
  const shouldShowTooltip = useMemo(() => {
    if (!audioRef?.current || !duration) return false;
    
    const realCurrentTime = audioRef.current.currentTime || 0;
    const hasValidTime = realCurrentTime >= 0 && realCurrentTime <= duration;
    
    // 🎯 **SIMPLIFIED LOGIC**: Luôn hiện tooltip khi có audio và thời gian hợp lệ
    // Không cần phức tạp với isNearSelection hay isDragging
    const shouldShow = hasValidTime && realCurrentTime > 0;
    
    // 🔧 **DEBUG**: Chỉ log khi có thay đổi
    const lastDecision = lastTooltipDataRef.current?.shouldShow;
    if (lastDecision !== shouldShow) {
      console.log('🔧 [TooltipDebug] Visibility Decision CHANGED:', {
        shouldShowTooltip: shouldShow,
        realCurrentTime: `${realCurrentTime.toFixed(3)}s`,
        hasValidTime,
        duration: `${duration.toFixed(3)}s`,
        previousDecision: lastDecision
      });
    }
    
    return shouldShow;
  }, [audioRef, duration]);

  // 🚀 **OPTIMIZED UPDATE FUNCTION**: Always update position, only control visibility
  updateCurrentTimeTooltipRealtimeRef.current = useCallback(() => {
    if (!canvasRef?.current || !audioRef?.current || !duration) return;
    
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    const realCurrentTime = audio.currentTime || 0;
    
    // 🚀 **SMART THROTTLING**: 16ms throttle for 60fps
    const now = performance.now();
    if (now - updateThrottleRef.current < 16) return; // 60fps limit
    updateThrottleRef.current = now;
    
    // 🚀 **ALWAYS CALCULATE POSITION**: Regardless of visibility
    const formattedTime = formatTime(realCurrentTime);
    const cursorX = (realCurrentTime / duration) * canvas.width;
    
    // 🚀 **CHANGE DETECTION**: Only update if significant change
    const lastData = lastTooltipDataRef.current;
    const hasSignificantChange = !lastData || 
      Math.abs(cursorX - lastData.x) > 0.5 || // Pixel threshold
      Math.abs(realCurrentTime - lastData.time) > 0.01; // Time threshold
    
    if (!hasSignificantChange) return;
    
    const newTooltipData = {
      visible: shouldShowTooltip, // 🎯 Use calculated visibility
      x: cursorX,
      time: realCurrentTime,
      formattedTime,
      isPlaying: !audio.paused && !audio.ended,
      shouldShow: shouldShowTooltip
    };
    
    // 🔧 **DEBUG**: Log position updates
    if (!lastData || Math.abs(cursorX - lastData.x) > 5) {
      console.log('🔧 [TooltipDebug] Tooltip Update:', {
        x: `${cursorX.toFixed(1)}px`,
        time: `${realCurrentTime.toFixed(3)}s`,
        formattedTime,
        visible: newTooltipData.visible,
        isPlaying: newTooltipData.isPlaying,
        canvasWidth: `${canvas.width}px`
      });
    }
    
    lastTooltipDataRef.current = newTooltipData;
    
    // 🚀 **ALWAYS UPDATE**: Let React handle the optimization
    setCurrentTimeTooltip(newTooltipData);
  }, [canvasRef, audioRef, duration, shouldShowTooltip, formatTime]);

  // 🚀 **SIMPLIFIED START FUNCTION**: Always start when audio exists
  startRealtimeTooltipAnimationRef.current = useCallback(() => {
    if (isRealtimeActiveRef.current || !audioRef?.current) return;
    
    console.log('🚀 [RealtimeTooltip] Starting ULTRA-SMOOTH realtime animation (60fps+)');
    isRealtimeActiveRef.current = true;
    animationCallCountRef.current = 0;
    
    const animate = () => {
      if (!isRealtimeActiveRef.current) return;
      
      animationCallCountRef.current++;
      updateCurrentTimeTooltipRealtimeRef.current?.();
      
      realtimeAnimationRef.current = requestAnimationFrame(animate);
    };
    
    console.log('✅ [RealtimeTooltip] Animation requestAnimationFrame scheduled');
    realtimeAnimationRef.current = requestAnimationFrame(animate);
  }, [audioRef]);

  // 🚀 **OPTIMIZED STOP FUNCTION**: Memoized
  stopRealtimeTooltipAnimationRef.current = useCallback(() => {
    if (!isRealtimeActiveRef.current) {
      console.log('✅ [TooltipDebug] Animation already stopped, no need to stop');
      return;
    }
    
    console.log('⏹️ [RealtimeTooltip] Stopping realtime animation');
    console.log('🔧 [TooltipDebug] Animation Stats - Total calls:', animationCallCountRef.current);
    
    isRealtimeActiveRef.current = false;
    
    if (realtimeAnimationRef.current) {
      cancelAnimationFrame(realtimeAnimationRef.current);
      realtimeAnimationRef.current = null;
      console.log('✅ [RealtimeTooltip] Animation frame cancelled');
    }
  }, []);

  // 🚀 **SIMPLIFIED ANIMATION CONTROL**: Always run when audio exists
  useEffect(() => {
    const hasAudio = !!audioRef?.current;
    
    console.log('🎮 [RealtimeTooltip] Animation control triggered - hasAudio:', hasAudio, ', audioRef:', audioRef?.current?.src);
    
    if (hasAudio) {
      // 🎯 **ALWAYS START**: Animation luôn chạy khi có audio, chỉ điều khiển visibility
      startRealtimeTooltipAnimationRef.current?.();
    } else {
      stopRealtimeTooltipAnimationRef.current?.();
    }
  }, [audioRef]); // 🎯 Chỉ phụ thuộc vào audioRef

  // 🚀 **CLEANUP OPTIMIZATION**: Prevent memory leaks
  useEffect(() => {
    return () => {
      console.log('🧹 [TooltipDebug] Cleanup - stopping animation on unmount');
      stopRealtimeTooltipAnimationRef.current?.();
      
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
      }
    };
  }, []);

  // 🔧 **DEBUG LOG**: Only log on state changes
  useEffect(() => {
    if (currentTimeTooltip) {
      console.log('🔧 [TooltipDebug] Tooltip State Changed:', {
        visible: currentTimeTooltip.visible,
        x: `${currentTimeTooltip.x.toFixed(1)}px`,
        time: `${currentTimeTooltip.time.toFixed(3)}s`,
        formattedTime: currentTimeTooltip.formattedTime,
        isPlaying: currentTimeTooltip.isPlaying
      });
    }
  }, [currentTimeTooltip?.x, currentTimeTooltip?.visible, currentTimeTooltip?.isPlaying]);

  // 🚀 **FIXED HOVER FUNCTIONS**: Correct mouse position calculation
  const updateHoverTime = useCallback((mouseEvent) => {
    const now = performance.now();
    if (now - lastHoverUpdateRef.current < 16) return; // 60fps throttle
    lastHoverUpdateRef.current = now;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (!canvasRef?.current || !duration) {
      setHoverTooltip(null);
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // 🎯 **CORRECT MOUSE POSITION**: Get from mouseEvent, not clientX parameter
    const clientX = mouseEvent.clientX || mouseEvent.pageX || 0;
    const x = clientX - rect.left;
    const time = (x / canvas.width) * duration;

    // 🔧 **DEBUG**: Log hover calculation
    console.log('🖱️ [HoverTooltip] Mouse position calculation:', {
      clientX: `${clientX}px`,
      rectLeft: `${rect.left}px`,
      x: `${x}px`,
      canvasWidth: `${canvas.width}px`,
      time: `${time.toFixed(3)}s`,
      duration: `${duration.toFixed(3)}s`
    });

    if (time >= 0 && time <= duration && x >= 0 && x <= canvas.width) {
      setHoverTooltip({
        visible: true,
        x,
        time,
        formattedTime: formatTime(time)
      });

      hoverTimeoutRef.current = setTimeout(() => {
        setHoverTooltip(null);
      }, 2000);
    } else {
      setHoverTooltip(null);
    }
  }, [canvasRef, duration, formatTime]);

  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoverTooltip(null);
  }, []);

  // 🚀 **MEMOIZED RETURN OBJECT**: Prevent recreation
  return useMemo(() => ({
    hoverTooltip,
    handleTooltips,
    currentTimeTooltip,
    updateHoverTime,
    clearHoverTooltip
  }), [hoverTooltip, handleTooltips, currentTimeTooltip, updateHoverTime, clearHoverTooltip]);
};