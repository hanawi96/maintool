import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * 🚀 **ULTRA INSTANT TOOLTIP HOOK** - Zero delay cho tất cả tooltips
 * 
 * ✅ **ULTRA RESPONSIVE VERSION:**
 * - ⚡ **INSTANT HOVER TOOLTIP**: Direct calculation từ mouse position - ZERO DELAY
 * - ⚡ **INSTANT HANDLE TOOLTIPS**: Direct calculation từ startTime/endTime - ZERO DELAY  
 * - 🔥 **NO DELAYS**: Loại bỏ timeouts và animation frames
 */
export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging) => {
  // 🎯 **INSTANT HOVER STATE** - Track mouse position cho instant calculation
  const [hoverMousePosition, setHoverMousePosition] = useState(null);
  const [isHoverActive, setIsHoverActive] = useState(false);
  
  const hoverTimeoutRef = useRef(null);
  
  // 🎯 **TIME FORMATTER**
  const formatTime = useCallback((time) => {
    if (typeof time !== 'number' || isNaN(time)) return '00.00.00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const centiseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);
  
  // ⚡ **INSTANT HANDLE TOOLTIPS CALCULATOR** - Tính toán trực tiếp từ props
  const calculateHandleTooltips = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration === 0 || startTime >= endTime) {
      return { start: null, end: null, selectionDuration: null };
    }
    
    const canvasWidth = canvas.width;
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const selectionDuration = endTime - startTime;
    const durationX = (startX + endX) / 2;
    
    // 🔧 **INSTANT CALCULATION DEBUG** - Log khi có drag để verify instant response
    if (isDragging && Math.random() < 0.05) { // 5% sampling chỉ khi drag
      console.log('⚡ [INSTANT-HANDLE] Direct calculation (NO DELAY):', {
        startTime: `${startTime.toFixed(3)}s`,
        endTime: `${endTime.toFixed(3)}s`,
        startX: `${startX.toFixed(1)}px`,
        endX: `${endX.toFixed(1)}px`,
        isDragging,
        method: 'DIRECT_CALCULATION_FROM_PROPS',
        performance: 'ZERO_ANIMATION_FRAME_DELAY'
      });
    }
    
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
      selectionDuration: selectionDuration >= 0.1 ? {
        visible: true,
        x: durationX,
        duration: selectionDuration,
        formattedTime: formatTime(selectionDuration)
      } : null
    };
  }, [canvasRef, duration, startTime, endTime, formatTime, isDragging]);
  
  // ⚡ **INSTANT HOVER CALCULATOR** - Direct calculation từ mouse position
  const calculateHoverTooltip = useCallback(() => {
    if (!isHoverActive || !hoverMousePosition || !canvasRef?.current || !duration) {
      return null;
    }
    
    const canvas = canvasRef.current;
    const { x: mouseX } = hoverMousePosition;
    const time = (mouseX / canvas.width) * duration;
    
    // 🔧 **VALIDATION**: Ensure valid position
    if (time < 0 || time > duration || mouseX < 0 || mouseX > canvas.width) {
      return null;
    }
    
    // 🔧 **INSTANT HOVER DEBUG** - Log instant calculation
    if (Math.random() < 0.02) { // 2% sampling để track hover performance
      console.log('⚡ [INSTANT-HOVER] Direct calculation from mouse:', {
        mouseX: `${mouseX.toFixed(1)}px`,
        time: `${time.toFixed(3)}s`,
        canvasWidth: `${canvas.width}px`,
        method: 'DIRECT_CALCULATION_FROM_MOUSE',
        performance: 'ZERO_STATE_DELAY'
      });
    }
    
    return {
      visible: true,
      x: mouseX,
      time,
      formattedTime: formatTime(time)
    };
  }, [isHoverActive, hoverMousePosition, canvasRef, duration, formatTime]);
  
  // 🚀 **ULTRA INSTANT HOVER UPDATE** - Chỉ track mouse position, calculation ở useMemo
  const updateHoverTooltip = useCallback((mouseEvent) => {
    if (!canvasRef?.current || !duration) {
      setHoverMousePosition(null);
      setIsHoverActive(false);
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = mouseEvent.clientX - rect.left;
    
    // ⚡ **INSTANT POSITION UPDATE** - Chỉ store position, không calculate tooltip
    setHoverMousePosition({ x });
    setIsHoverActive(true);
    
    // 🔄 **SMART TIMEOUT** - Clear previous timeout và set mới
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
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
  
  // 🧹 **CLEANUP**
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // ⚡ **INSTANT HANDLE TOOLTIPS** - Tính toán mới mỗi render cho instant response
  const handleTooltips = useMemo(() => {
    const tooltips = calculateHandleTooltips();
    
    // 🔧 **INSTANT SYNC DEBUG** - Log khi tooltips được calculate
    if (Math.random() < 0.01) { // 1% sampling để track instant updates
      console.log('⚡ [INSTANT-SYNC] Handle tooltips calculated:', {
        startVisible: !!tooltips.start,
        endVisible: !!tooltips.end,
        durationVisible: !!tooltips.selectionDuration,
        startX: tooltips.start?.x?.toFixed(1),
        endX: tooltips.end?.x?.toFixed(1),
        durationX: tooltips.selectionDuration?.x?.toFixed(1),
        calculation: 'INSTANT_EVERY_RENDER',
        performance: 'ZERO_DELAY_GUARANTEED'
      });
    }
    
    return tooltips;
  }, [calculateHandleTooltips]);
  
  // ⚡ **INSTANT HOVER TOOLTIP** - Direct calculation mỗi render
  const hoverTooltip = useMemo(() => {
    const tooltip = calculateHoverTooltip();
    
    // 🔧 **INSTANT HOVER DEBUG** - Log khi hover tooltip được calculate
    if (tooltip && Math.random() < 0.02) { // 2% sampling cho hover
      console.log('⚡ [INSTANT-HOVER-SYNC] Hover tooltip calculated:', {
        visible: tooltip.visible,
        x: `${tooltip.x.toFixed(1)}px`,
        time: `${tooltip.time.toFixed(3)}s`,
        formattedTime: tooltip.formattedTime,
        calculation: 'INSTANT_FROM_MOUSE_POSITION',
        performance: 'ZERO_CALCULATION_DELAY'
      });
    }
    
    return tooltip;
  }, [calculateHoverTooltip]);
  
  // 🎯 **RETURN** - Instant calculated hover + handles
  return useMemo(() => {
    return {
      hoverTooltip,
      handleTooltips,
      updateHoverTooltip,
      clearHoverTooltip
    };
  }, [hoverTooltip, handleTooltips, updateHoverTooltip, clearHoverTooltip]);
};