export const useOptimizedTooltip = (canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging) => {
  // 🎯 **INSTANT HOVER STATE** - Track mouse position cho instant calculation
  const [hoverMousePosition, setHoverMousePosition] = useState(null);
  const [isHoverActive, setIsHoverActive] = useState(false);
  
  const hoverTimeoutRef = useRef(null);
  
  // 🎯 **UNIFIED TIME FORMATTER** - Perfect consistency với CompactTimeSelector
  const formatTime = useCallback(formatTimeUnified, []);
  
  // 🚀 **RESPONSIVE FIX**: Get effective canvas width (displayed size vs internal size)
  const getEffectiveCanvasWidth = useCallback((canvas) => {
    return canvas.getBoundingClientRect().width;
  }, []);
  
  // ⚡ **INSTANT MAIN CURSOR CALCULATOR** - Direct calculation từ currentTime
  const calculateMainCursorTooltip = useCallback(() => {
    // 🔧 **SHOW WHEN HAS AUDIO FILE**: Hiện khi có file mp3, không cần đang play
    if (!canvasRef?.current || !duration || duration === 0 || typeof currentTime !== 'number') {
      return null;
    }
    
    const canvas = canvasRef.current;
    const canvasWidth = getEffectiveCanvasWidth(canvas); // 🚀 **RESPONSIVE FIX**
    const cursorX = (currentTime / duration) * canvasWidth;
    
    // 🔧 **BOUNDARY CHECK**: Ensure cursor trong phạm vi canvas
    if (cursorX < 0 || cursorX > canvasWidth || currentTime < 0 || currentTime > duration) {
      return null;
    }
    
    return {
      visible: true,
      x: cursorX,
      time: currentTime,
      formattedTime: formatTime(currentTime)
    };
  }, [canvasRef, duration, currentTime, formatTime, getEffectiveCanvasWidth]);
  
  // ⚡ **INSTANT HANDLE TOOLTIPS CALCULATOR** - Tính toán trực tiếp từ props
  const calculateHandleTooltips = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration === 0 || startTime >= endTime) {
      return { start: null, end: null, selectionDuration: null };
    }
    
    const canvasWidth = getEffectiveCanvasWidth(canvas); // 🚀 **RESPONSIVE FIX**
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const selectionDuration = endTime - startTime;
    const durationX = (startX + endX) / 2;
          
    // 🔧 **REGION WIDTH CALCULATION**: Tính chiều dài region để ẩn tooltip khi quá nhỏ
    const regionWidthPx = Math.abs(endX - startX);
    
    // 🎯 **SMART MINIMUM WIDTH CALCULATION**: Sử dụng constants để tính minimum width
    const estimatedTooltipWidth = DURATION_TOOLTIP_CONFIG.ESTIMATED_WIDTH; // ~51.6px
    const minimumRegionWidth = DURATION_TOOLTIP_CONFIG.MINIMUM_REGION_WIDTH; // ~63.6px
    
    // 🔧 **SMART DURATION TOOLTIP HIDING**: Ẩn khi region quá nhỏ theo yêu cầu user
    const shouldShowDurationTooltip = selectionDuration >= 0.1 && regionWidthPx >= minimumRegionWidth;
    
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
      } : null // 🔧 **HIDE WHEN TOO SMALL**: Ẩn khi region quá nhỏ
    };
  }, [canvasRef, duration, startTime, endTime, formatTime, getEffectiveCanvasWidth]);
  
  // ⚡ **INSTANT HOVER CALCULATOR** - Direct calculation từ mouse position
  const calculateHoverTooltip = useCallback(() => {
    // 🔧 **HIDE WHEN DRAGGING HANDLES**: Ẩn hover tooltip khi đang drag handles theo yêu cầu user
    if (!isHoverActive || !hoverMousePosition || !canvasRef?.current || !duration ||
        isDragging === 'start' || isDragging === 'end') {
      return null;
    }
    
    const canvas = canvasRef.current;
    const { x: mouseX } = hoverMousePosition;
    const canvasWidth = getEffectiveCanvasWidth(canvas); // 🚀 **RESPONSIVE FIX**
    const time = (mouseX / canvasWidth) * duration;
    
    // 🔧 **VALIDATION**: Ensure valid position
    if (time < 0 || time > duration || mouseX < 0 || mouseX > canvasWidth) {
      return null;
    }
    
    return {
      visible: true,
      x: mouseX,
      time,
      formattedTime: formatTime(time)
    };
  }, [isHoverActive, hoverMousePosition, canvasRef, duration, formatTime, isDragging, getEffectiveCanvasWidth]);

  // ... existing code ...
} 