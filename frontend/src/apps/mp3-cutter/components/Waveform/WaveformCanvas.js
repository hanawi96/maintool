// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const WaveformCanvas = React.memo(({
  canvasRef,
  waveformData,
  currentTime,
  duration,
  startTime,
  endTime,
  hoveredHandle,
  isDragging,
  isPlaying,
  volume = 1, // 🆕 **VOLUME PROP**: Volume level (0-1) for responsive bars
  
  // 🆕 **FADE EFFECTS**: Visual fade in/out effects cho waveform bars
  fadeIn = 0,   // Fade in duration (seconds) - sóng âm thấp → cao dần
  fadeOut = 0,  // Fade out duration (seconds) - sóng âm cao → thấp dần
  
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {
  // 🎯 Animation refs - prevent memory leaks
  const animationFrameRef = useRef(null);
  const lastDrawTimeRef = useRef(0);
  const lastRenderDataRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastCanvasWidthRef = useRef(0);
  
  // 🆕 **VOLUME ANIMATION**: Smooth volume transitions
  const volumeAnimationRef = useRef(volume);
  const targetVolumeRef = useRef(volume);
  const [animatedVolume, setAnimatedVolume] = useState(volume); // 🆕 **STATE FOR DEPENDENCIES**
  
  // 🔇 **VOLUME LOGGING**: Track last logged volume to prevent spam
  const lastVolumeLogRef = useRef(null);
  
  // 🔥 **OPTIMIZED**: Removed all debug logging refs to prevent spam
  const setupCompleteRef = useRef(false);

  // 🆕 **CURSOR INTELLIGENCE**: Detect cursor type based on mouse position
  const currentCursorRef = useRef('pointer'); // 🔧 **FIXED**: Default to pointer instead of crosshair
  const lastCursorUpdateRef = useRef(0);

  // 🆕 **SIMPLIFIED HOVER TOOLTIP**: Chỉ lưu mouse position và time đơn giản
  const [hoverTooltip, setHoverTooltip] = useState(null); // { x, time, formattedTime, visible }
  const lastHoverUpdateRef = useRef(0);
  const hoverTimeoutRef = useRef(null);

  // 🆕 **HANDLE TOOLTIPS STATE**: Chỉ lưu handle tooltips (không dùng portal)
  const [handleTooltips, setHandleTooltips] = useState({
    startHandle: null,    // { x, time, visible, formattedTime }
    endHandle: null,      // { x, time, visible, formattedTime }
    selectionDuration: null // { x, duration, visible, formattedDuration }
  });

  // 🆕 **CURSOR INTELLIGENCE**: Detect cursor type based on mouse position
  const detectCursorType = useCallback((mouseX, canvasWidth) => {
    if (!canvasWidth || duration === 0) return 'pointer'; // 🔧 **FIXED**: Default pointer instead of crosshair

    // 🔧 **DEBUG ENHANCED**: Enhanced logging for cursor detection - more selective logging
    const shouldLog = Math.random() < 0.02; // 2% sampling to reduce console spam
    if (shouldLog) {
      console.log(`🖱️ [CursorDetect] Analyzing position ${mouseX.toFixed(1)}px of ${canvasWidth}px (duration: ${duration.toFixed(2)}s)`);
    }

    // 🔥 **PRIORITY 1: REGION DRAG CURSOR** - Highest priority when dragging region
    if (isDragging === 'region' || isDragging === 'region-potential') {
      // 🎯 **CROSS-PLATFORM 4-WAY ARROW**: Use all-scroll which works consistently across OS
      if (shouldLog) console.log(`🔄 [CursorDetect] REGION DRAG ACTIVE - forcing 4-way arrow cursor`, {
        mousePosition: mouseX.toFixed(1) + 'px',
        dragState: isDragging === 'region' ? 'ACTIVE_REGION_DRAG' : 'POTENTIAL_REGION_DRAG',
        cursorType: 'all-scroll (4-directional arrow - CROSS-PLATFORM)',
        isDragging: isDragging,
        note: '4-way arrow LOCKED during region drag/potential - using all-scroll for Windows compatibility'
      });
      
      // 🔧 **ENHANCED DEBUG**: Always log region drag cursor for debugging
      console.log(`🎯 [CursorDebug] REGION DRAG CURSOR: isDragging=${isDragging} → forcing 'all-scroll' cursor (4-way arrow)`);
      return 'all-scroll'; // 🔄 **CROSS-PLATFORM 4-WAY ARROW**: Use all-scroll instead of move for better compatibility
    }

    // 🎯 **PRIORITY 2: HANDLE DETECTION** - Only when NOT dragging region
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(6, MODERN_HANDLE_WIDTH * 0.8) : MODERN_HANDLE_WIDTH;
    
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    
    // 🔧 **OPTIMIZED TOLERANCE**: Much smaller and more precise handle detection
    // Giảm tolerance để cursor chỉ hiện ew-resize khi thực sự hover over handle
    const baseTolerance = responsiveHandleWidth + 3; // Chỉ 3px padding thêm thay vì 8px
    const mobileTolerance = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 12 : 8; // Giảm mobile tolerance
    const tolerance = Math.min(baseTolerance, mobileTolerance); // Chọn giá trị nhỏ hơn
    
    // 🔧 **STRICT HANDLE DETECTION**: Only show ew-resize cursor when actually over handles
    if (startTime < endTime) { // Only check handles if there's a valid selection
      const overStartHandle = Math.abs(mouseX - startX) <= tolerance;
      const overEndHandle = Math.abs(mouseX - endX) <= tolerance;
      
      if (overStartHandle) {
        // 🔧 **ENHANCED DEBUG**: Log handle detection with precise tolerance info
        console.log(`🎯 [CursorDetect] START HANDLE detected at ${startX.toFixed(1)}px (mouse: ${mouseX.toFixed(1)}px, tolerance: ${tolerance}px) - ew-resize cursor`);
        return 'ew-resize'; // ← Handle resize cursor
      }
      if (overEndHandle) {
        // 🔧 **ENHANCED DEBUG**: Log handle detection with precise tolerance info
        console.log(`🎯 [CursorDetect] END HANDLE detected at ${endX.toFixed(1)}px (mouse: ${mouseX.toFixed(1)}px, tolerance: ${tolerance}px) - ew-resize cursor`);
        return 'ew-resize'; // ← Handle resize cursor
      }
      
      // 🔧 **DEBUG FALSE NEGATIVES**: Log when close to handle but not detected
      const distanceToStart = Math.abs(mouseX - startX);
      const distanceToEnd = Math.abs(mouseX - endX);
      if (shouldLog && (distanceToStart <= tolerance + 5 || distanceToEnd <= tolerance + 5)) {
        console.log(`🔍 [CursorDetect] Close to handle but not detected:`, {
          startDistance: distanceToStart.toFixed(1) + 'px',
          endDistance: distanceToEnd.toFixed(1) + 'px',
          tolerance: tolerance + 'px',
          startPos: startX.toFixed(1) + 'px',
          endPos: endX.toFixed(1) + 'px',
          mousePos: mouseX.toFixed(1) + 'px'
        });
      }
    }

    // 🎯 **PRIORITY 3: DEFAULT CURSOR** - Smart cursor based on position
    if (shouldLog) {
      const timeAtPosition = (mouseX / canvasWidth) * duration;
      const isInsideRegion = timeAtPosition >= startTime && timeAtPosition <= endTime && startTime < endTime;
      console.log(`🎯 [CursorDetect] Normal interaction cursor logic`, {
        mousePosition: mouseX.toFixed(1) + 'px',
        timeAtPosition: timeAtPosition.toFixed(2) + 's',
        isInsideRegion: isInsideRegion,
        tolerance: tolerance + 'px'
      });
    }
    
    // 🆕 **REGION HOVER DETECTION**: Check if mouse is inside region for grab cursor
    const timeAtPosition = (mouseX / canvasWidth) * duration;
    const isInsideRegion = timeAtPosition >= startTime && timeAtPosition <= endTime && startTime < endTime;
    
    if (isInsideRegion) {
      // 🤚 **GRAB CURSOR**: "Hình bàn tay xòe ra" khi hover vào region
      console.log(`🤚 [CursorDetect] REGION HOVER - grab cursor (open hand)`, {
        mousePosition: mouseX.toFixed(1) + 'px',
        timeAtPosition: timeAtPosition.toFixed(2) + 's',
        regionRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
        cursorType: 'grab (bàn tay xòe ra - theo yêu cầu user)',
        note: 'User requested open hand cursor when hovering over region'
      });
      return 'grab'; // 🤚 **GRAB CURSOR**: Bàn tay xòe ra như user yêu cầu
    }
    
    // 👆 **POINTER CURSOR**: Default cursor cho các vùng khác
    if (shouldLog) {
      console.log(`👆 [CursorDetect] Outside region - pointer cursor`, {
        mousePosition: mouseX.toFixed(1) + 'px',
        timeAtPosition: timeAtPosition.toFixed(2) + 's',
        cursorType: 'pointer (outside region)'
      });
    }
    return 'pointer'; // 👆 **POINTER**: Default cursor cho hover ngoài region
  }, [duration, startTime, endTime, isDragging]);

  // 🚀 **ULTRA-SMOOTH CURSOR UPDATE**: Update cursor with reduced throttling
  const updateCursor = useCallback((mouseX) => {
    const now = performance.now();
    
    // 🚀 **ADAPTIVE THROTTLING**: Different throttling based on current cursor state
    let throttleInterval;
    if (isDragging === 'region' || isDragging === 'region-potential') {
      throttleInterval = 8; // 125fps for region drag feedback
    } else if (currentCursorRef.current === 'ew-resize') {
      throttleInterval = 8; // 125fps for handle hover feedback
    } else {
      throttleInterval = 16; // 60fps for normal cursor updates
    }
    
    if (now - lastCursorUpdateRef.current < throttleInterval) return;
    lastCursorUpdateRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasWidth = canvas.width;
    const newCursor = detectCursorType(mouseX, canvasWidth);
    
    // 🎯 **ALWAYS UPDATE WHEN SWITCHING FROM RESIZE CURSOR**: Ensure immediate reset from handle cursor
    const isLeavingHandle = currentCursorRef.current === 'ew-resize' && newCursor !== 'ew-resize';
    const isEnteringHandle = currentCursorRef.current !== 'ew-resize' && newCursor === 'ew-resize';
    const shouldForceUpdate = isLeavingHandle || isEnteringHandle;
    
    // 🎯 **UPDATE LOGIC**: When cursor actually changes or when forcing update
    if (newCursor !== currentCursorRef.current || shouldForceUpdate) {
      // 🆕 **ENHANCED CROSS-PLATFORM CURSOR**: Unified cursor application with CSS data attributes
      const applyCursorWithEnhancedFallback = (requestedCursor) => {
        try {
          // 🎯 **DETERMINE CURSOR STRATEGY**: Based on requested cursor type
          let cursorOptions, dataAttribute;
          
          if (requestedCursor === 'all-scroll') {
            // 🔄 **4-WAY ARROW CURSOR**: Region drag cursors
            dataAttribute = 'region-potential';
            cursorOptions = ['all-scroll', 'move', '-webkit-grab', 'grab', 'crosshair', 'pointer'];
          } else if (requestedCursor === 'ew-resize') {
            // ↔️ **HANDLE RESIZE CURSOR**: Handle drag cursors  
            dataAttribute = 'handle-resize';
            cursorOptions = ['ew-resize', 'col-resize', 'e-resize', 'w-resize', 'pointer'];
          } else if (requestedCursor === 'grab') {
            // 🤚 **GRAB CURSOR**: Region hover cursors với fallbacks
            dataAttribute = 'region-hover';
            cursorOptions = ['grab', '-webkit-grab', 'move', 'pointer'];
          } else {
            // 👆 **POINTER CURSOR**: Default cursor
            dataAttribute = 'pointer';
            cursorOptions = ['pointer', 'default'];
          }
          
          // 🎯 **APPLY CSS DATA ATTRIBUTE**: For CSS-based styling
          canvas.setAttribute('data-cursor', dataAttribute);
          
          // 🎯 **APPLY CSS CLASS**: Add appropriate cursor class
          canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
          if (requestedCursor === 'all-scroll') {
            canvas.className = `${canvas.className} cursor-all-scroll`.trim();
          } else if (requestedCursor === 'grab') {
            canvas.className = `${canvas.className} cursor-grab`.trim();
          }
          
          // 🎯 **DIRECT STYLE FALLBACK**: Try multiple cursor values
          let appliedCursor = 'pointer';
          
          for (const cursorValue of cursorOptions) {
            canvas.style.cursor = cursorValue;
            
            // 🔧 **VERIFY APPLICATION**: Check if browser accepted the cursor  
            const computedCursor = getComputedStyle(canvas).cursor;
            
            if (computedCursor === cursorValue || 
                (cursorValue === 'all-scroll' && computedCursor.includes('scroll')) ||
                (cursorValue === 'move' && computedCursor.includes('move')) ||
                (cursorValue === 'ew-resize' && computedCursor.includes('resize')) ||
                (cursorValue.includes('grab') && computedCursor.includes('grab'))) {
              appliedCursor = cursorValue;
              
              // 🔧 **LOG SUCCESS**: Only log important cursor changes
              if (isLeavingHandle) {
                console.log(`✅ [CursorReset] LEFT handle - reset from ew-resize to ${cursorValue}`);
              } else if (isEnteringHandle) {
                console.log(`✅ [CursorUpdate] ENTERED handle - applied cursor: ${cursorValue}`);
              } else if (cursorValue === 'all-scroll') {
                console.log(`✅ [CursorUpdate] Successfully applied cursor: ${cursorValue} (requested: ${requestedCursor})`);
              } else if (cursorValue === 'grab' || cursorValue === '-webkit-grab') {
                console.log(`✅ [CursorUpdate] Successfully applied GRAB cursor: ${cursorValue} (region hover - bàn tay xòe ra)`);
              }
              break;
            }
          }
          
          return appliedCursor;
          
        } catch (error) {
          console.warn(`🚨 [CursorError] Failed to apply cursor ${requestedCursor}:`, error);
          canvas.style.cursor = 'pointer';
          canvas.setAttribute('data-cursor', 'pointer');
          canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
          return 'pointer';
        }
      };
      
      const finalCursor = applyCursorWithEnhancedFallback(newCursor);
      currentCursorRef.current = finalCursor;
      
      // 🔧 **SELECTIVE LOGGING**: Only log important cursor changes to reduce noise
      if (shouldForceUpdate || finalCursor === 'all-scroll' || finalCursor === 'ew-resize' || finalCursor === 'grab' || finalCursor === '-webkit-grab') {
        const timeAtPosition = duration > 0 ? (mouseX / canvasWidth) * duration : 0;
        const isInRegion = timeAtPosition >= startTime && timeAtPosition <= endTime && startTime < endTime;
        
        console.log(`🖱️ [CursorUpdate] Changed to '${finalCursor}' at ${mouseX.toFixed(1)}px (${timeAtPosition.toFixed(2)}s)`, {
          requestedCursor: newCursor,
          appliedCursor: finalCursor,
          position: mouseX.toFixed(1) + 'px',
          timeAtPosition: timeAtPosition.toFixed(2) + 's',
          isInRegion: isInRegion,
          hasValidSelection: startTime < endTime,
          selectionRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
          debugInfo: isDragging ? `Currently dragging: ${isDragging}` : 'Not dragging',
          reason: shouldForceUpdate ? (isLeavingHandle ? 'LEAVING_HANDLE' : 'ENTERING_HANDLE') : 'CURSOR_CHANGE'
        });
      }
    }
  }, [canvasRef, detectCursorType, duration, startTime, endTime, isDragging]);

  // 🔧 **PERFORMANCE OPTIMIZATION**: Format time and duration with memoization
  const formatTime = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = (seconds % 60);
      return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    }
    return `${seconds.toFixed(1)}s`;
  }, []);

  // 🆕 **SIMPLIFIED HANDLE TOOLTIPS**: Chỉ update handle tooltips khi cần thiết
  const updateHandleTooltips = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) {
      setHandleTooltips({
        startHandle: null,
        endHandle: null,
        selectionDuration: null
      });
      return;
    }

    const canvasWidth = canvas.width;
    
    // 🎯 **CALCULATE POSITIONS**: Tính toán vị trí pixel từ time
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    
    // 🎯 **SELECTION INFO**: Thông tin về selection
    const hasValidSelection = startTime < endTime;
    const selectionDuration = hasValidSelection ? endTime - startTime : 0;
    const selectionCenterX = hasValidSelection ? (startX + endX) / 2 : null;

    // 🆕 **TOOLTIP VISIBILITY LOGIC**: Chỉ hiện tooltip khi cần thiết
    const showStartHandle = hasValidSelection && startX >= 0 && startX <= canvasWidth;
    const showEndHandle = hasValidSelection && endX >= 0 && endX <= canvasWidth;
    const showSelectionDuration = hasValidSelection && selectionDuration > 0.1;

    // 🎯 **UPDATE HANDLE TOOLTIPS**: Simple relative positioning
    setHandleTooltips({
      startHandle: showStartHandle ? {
        x: startX,
        time: startTime,
        visible: true,
        formattedTime: formatTime(startTime)
      } : null,

      endHandle: showEndHandle ? {
        x: endX,
        time: endTime,
        visible: true,
        formattedTime: formatTime(endTime)
      } : null,

      selectionDuration: showSelectionDuration ? {
        x: selectionCenterX,
        duration: selectionDuration,
        visible: true,
        formattedDuration: formatDuration(selectionDuration)
      } : null
    });

    // 🔧 **MINIMAL DEBUG**: Reduced logging để improve performance
    if (Math.random() < 0.01) { // 1% sampling
      console.log(`🏷️ [HandleTooltips] Updated:`, {
        tooltipCount: [showStartHandle, showEndHandle, showSelectionDuration].filter(Boolean).length
      });
    }

  }, [canvasRef, duration, startTime, endTime, formatTime, formatDuration]);

  // 🆕 **SIMPLIFIED HOVER TIME TRACKER**: Đơn giản hóa hover tooltip
  const updateHoverTime = useCallback((mouseX, canvasWidth) => {
    const now = performance.now();
    
    // 🚀 **MINIMAL THROTTLING**: Smooth hover tooltip
    if (now - lastHoverUpdateRef.current < 8) return; // 125fps cho smooth hover
    lastHoverUpdateRef.current = now;

    if (!canvasWidth || duration === 0) {
      setHoverTooltip(null);
      return;
    }

    // 🚫 **HIDE DURING REGION DRAG**: Hide hover tooltip completely when dragging region
    if (isDragging === 'region' || isDragging === 'region-potential') {
      setHoverTooltip(null);
      if (Math.random() < 0.02) { // 2% sampling
        console.log(`🚫 [HoverTooltip] HIDDEN during ${isDragging} - maintaining clean UI`);
      }
      return;
    }

    // 🎯 **HANDLE DETECTION**: Check if hovering over handles to hide cursor line
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(6, MODERN_HANDLE_WIDTH * 0.8) : MODERN_HANDLE_WIDTH;
    
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const tolerance = Math.max(responsiveHandleWidth / 2 + 8, WAVEFORM_CONFIG.RESPONSIVE.TOUCH_TOLERANCE);
    
    // 🚫 **HIDE HOVER TOOLTIP**: When hovering over handles
    if (startTime < endTime) {
      if (Math.abs(mouseX - startX) <= tolerance || Math.abs(mouseX - endX) <= tolerance) {
        setHoverTooltip(null);
        return;
      }
    }

    // 🎯 **CALCULATE TIME**: Convert mouse X to time position
    const timeAtPosition = (mouseX / canvasWidth) * duration;
    const clampedTime = Math.max(0, Math.min(timeAtPosition, duration));
    
    // 🆕 **SIMPLE HOVER TOOLTIP**: Set hover data
    setHoverTooltip({
      x: mouseX,
      time: clampedTime,
      formattedTime: formatTime(clampedTime),
      visible: true
    });

    // 🔧 **REDUCED DEBUG LOGGING**
    if (Math.random() < 0.005) { // 0.5% sampling
      console.log(`✅ [HoverTooltip] Smooth update: ${clampedTime.toFixed(3)}s at ${mouseX.toFixed(1)}px`);
    }
  }, [duration, formatTime, startTime, endTime, isDragging]);

  // 🆕 **ENHANCED MOUSE MOVE HANDLER**: Ultra-smooth processing
  const handleEnhancedMouseMove = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseMove) {
      onMouseMove(e);
    }

    // 🚀 **ULTRA-SMOOTH CURSOR AND TIME INTELLIGENCE**: No additional throttling
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // 🎯 **UPDATE CURSOR**: Smart cursor management
      updateCursor(mouseX);
      
      // 🚀 **SMOOTH HOVER TIME**: Update hover tooltip
      updateHoverTime(mouseX, canvas.width);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTime]);

  // 🆕 **ENHANCED MOUSE LEAVE HANDLER**: Reset cursor and hide tooltip
  const handleEnhancedMouseLeave = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseLeave) {
      onMouseLeave(e);
    }

    // 🆕 **FORCE CURSOR RESET**: Always reset cursor when leaving canvas, regardless of drag state
    const canvas = canvasRef.current;
    if (canvas) {
      // 🔧 **ENHANCED CURSOR RESET**: Force reset with detailed logging
      const previousCursor = currentCursorRef.current;
      
      // 🎯 **APPLY RESET**: Multiple methods to ensure cursor is reset
      canvas.style.cursor = 'pointer';
      canvas.setAttribute('data-cursor', 'pointer');
      canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
      currentCursorRef.current = 'pointer';
      
      // 🔧 **LOG CURSOR RESET**: Only log when actually changing from non-pointer cursor
      if (previousCursor !== 'pointer') {
        console.log(`🫥 [CursorReset] Mouse left canvas - forced reset from '${previousCursor}' to 'pointer'`);
      }
    }

    // 🆕 **HIDE TOOLTIP**: Hide hover tooltip when leaving canvas
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // 🎯 **DELAYED HIDE**: Small delay to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverTooltip(null);
      console.log(`⏰ [HoverTooltip] Hidden - mouse left canvas`);
    }, 50);
    
  }, [onMouseLeave, canvasRef]);

  // 🆕 **ENHANCED MOUSE DOWN HANDLER**: Hide hover tooltip on click
  const handleEnhancedMouseDown = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality first
    if (onMouseDown) {
      onMouseDown(e);
    }

    // 🆕 **HIDE HOVER TOOLTIP ON CLICK**: Clear hover tooltip when user clicks
    setHoverTooltip(null);
    
    // 🚫 **CLEAR HOVER TIMEOUT**: Cancel any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    console.log(`🖱️ [ClickBehavior] Hover tooltip hidden on click`);
  }, [onMouseDown]);

  // 🔥 **OPTIMIZED ADAPTIVE DATA**: Giảm logging và chỉ log khi cần
  const adaptiveWaveformData = useMemo(() => {
    if (!waveformData.length) return [];
    
    const canvas = canvasRef.current;
    if (!canvas) return waveformData;
    
    const canvasWidth = canvas.width || 800;
    const currentWidth = lastCanvasWidthRef.current || canvasWidth;
    
    // 🎯 SMART ADAPTIVE SAMPLING using configuration
    const { SAMPLING_RULES } = WAVEFORM_CONFIG.RESPONSIVE;
    let rule;
    
    if (currentWidth <= SAMPLING_RULES.SMALL.maxWidth) {
      rule = SAMPLING_RULES.SMALL;
    } else if (currentWidth <= SAMPLING_RULES.MEDIUM.maxWidth) {
      rule = SAMPLING_RULES.MEDIUM;  
    } else {
      rule = SAMPLING_RULES.LARGE;
    }
    
    const targetSamples = Math.max(100, Math.floor(currentWidth * rule.samplesPerPx));
    const finalSamples = Math.min(waveformData.length, targetSamples);
    
    // 🎯 DOWNSAMPLE if needed (averaging for smoother result)
    if (waveformData.length > finalSamples) {
      const step = waveformData.length / finalSamples;
      const adaptedData = [];
      
      for (let i = 0; i < finalSamples; i++) {
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(Math.floor((i + 1) * step), waveformData.length);
        
        // Average the values in this range for smoother result
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j < endIdx; j++) {
          sum += waveformData[j];
          count++;
        }
        adaptedData.push(count > 0 ? sum / count : 0);
      }
      
      return adaptedData;
    }
    
    return waveformData;
  }, [waveformData, canvasRef]);

  // 🔥 **STABLE RENDER DATA**: Giảm re-calculation và logging với volume support + fade effects
  const renderData = useMemo(() => {    
    if (!adaptiveWaveformData.length || duration === 0) {
      return null;
    }
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    const stableStartTime = Math.round(startTime * 10) / 10;
    const stableEndTime = Math.round(endTime * 10) / 10;
    const stableDuration = Math.round(duration * 10) / 10;
    const stableVolume = Math.round(animatedVolume * 1000) / 1000;
    const stableFadeIn = Math.round(fadeIn * 10) / 10;
    const stableFadeOut = Math.round(fadeOut * 10) / 10;
    const data = {
      waveformData: adaptiveWaveformData,
      duration: stableDuration,
      startTime: stableStartTime,
      endTime: stableEndTime,
      hoveredHandle,
      isDragging,
      canvasWidth,
      volume: stableVolume,
      fadeIn: stableFadeIn,
      fadeOut: stableFadeOut,
      dataHash: `${adaptiveWaveformData.length}-${stableDuration}-${stableStartTime}-${stableEndTime}-${hoveredHandle || 'none'}-${isDragging || 'none'}-${canvasWidth}-${stableVolume}-${stableFadeIn}-${stableFadeOut}`
    };
    lastRenderDataRef.current = data;
    return data;
  }, [adaptiveWaveformData, duration, startTime, endTime, hoveredHandle, isDragging, canvasRef, animatedVolume, fadeIn, fadeOut]);

  // 🆕 **FADE EFFECT CALCULATOR**: Tính toán fade multiplier cho từng bar dựa theo thời gian
  const calculateFadeMultiplier = useCallback((barTime, selectionStart, selectionEnd, fadeInDuration, fadeOutDuration) => {
    // 🚫 **NO FADE**: Return 1.0 if no fade configured
    if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
    
    // 🚫 **OUTSIDE SELECTION**: Return 1.0 if bar is outside selection range
    if (barTime < selectionStart || barTime > selectionEnd) return 1.0;
    
    const selectionDuration = selectionEnd - selectionStart;
    
    let fadeMultiplier = 1.0;
    
    // 🎨 **FADE IN EFFECT**: From selection start
    if (fadeInDuration > 0) {
      const fadeInEnd = selectionStart + Math.min(fadeInDuration, selectionDuration / 2);
      if (barTime <= fadeInEnd) {
        const fadeProgress = Math.max(0, (barTime - selectionStart) / fadeInDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // 🎨 **FADE OUT EFFECT**: To selection end
    if (fadeOutDuration > 0) {
      const fadeOutStart = selectionEnd - Math.min(fadeOutDuration, selectionDuration / 2);
      if (barTime >= fadeOutStart) {
        const fadeProgress = Math.max(0, (selectionEnd - barTime) / fadeOutDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // 🎯 **MINIMUM VISIBILITY**: Ensure minimum 5% height for visibility
    const finalMultiplier = Math.max(0.05, Math.min(1.0, fadeMultiplier));
    
    // 🔧 **DEBUG FADE CALCULATION**: Log fade calculation occasionally
    if (Math.random() < 0.005) { // 0.5% sampling to avoid spam
      console.log(`🎨 [FadeCalculation] Bar at ${barTime.toFixed(2)}s: fadeIn=${fadeInDuration}s, fadeOut=${fadeOutDuration}s, multiplier=${finalMultiplier.toFixed(3)}`);
    }
    
    return finalMultiplier;
  }, []);

  // 🎯 ENHANCED: Drawing function with performance optimizations
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🎯 Update canvas width ref without logging
    if (width !== lastCanvasWidthRef.current) {
      lastCanvasWidthRef.current = width;
    }
    
    // 🎯 Clear canvas efficiently
    ctx.clearRect(0, 0, width, height);
    
    // 1. 🎯 Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. 🎯 RESPONSIVE WAVEFORM BARS với Volume Scaling + Fade Effects
    const { waveformData, duration, startTime, endTime, volume: currentVolume, fadeIn: currentFadeIn, fadeOut: currentFadeOut } = renderData;
    const centerY = height / 2;
    
    // 🎯 SMART BAR WIDTH CALCULATION
    const rawBarWidth = width / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    const barWidth = Math.max(minBarWidth, rawBarWidth);
    const useOptimizedSpacing = rawBarWidth < minBarWidth;
    
    // 🆕 **VOLUME ANIMATION SYSTEM**: Enhanced responsive volume animation
    const volumeMultiplier = Math.max(0.05, Math.min(2.5, currentVolume)); // Range: 0.05x to 2.5x (wider range)
    
    // 🆕 **EXPONENTIAL SCALING**: More noticeable changes at low volumes
    const exponentialScale = Math.pow(volumeMultiplier, 0.7); // Gentler curve for low volumes
    const linearScale = volumeMultiplier * 0.8;
    const hybridScale = (exponentialScale + linearScale) / 2; // Hybrid approach
    
    const baseVolumeMultiplier = 0.15; // Higher minimum visible height
    const finalVolumeMultiplier = baseVolumeMultiplier + (hybridScale * (1 - baseVolumeMultiplier));
    
    // 🔊 **SENSITIVE LOGGING**: Log even small volume changes for debugging
    if (!lastVolumeLogRef.current || Math.abs(currentVolume - lastVolumeLogRef.current) > 0.01) {
      console.log(`🔊 [WaveformDraw] Volume scaling: ${currentVolume.toFixed(3)} → ${finalVolumeMultiplier.toFixed(3)}x height (exp: ${exponentialScale.toFixed(3)}, linear: ${linearScale.toFixed(3)})`);
      lastVolumeLogRef.current = currentVolume;
    }
    
    // 🆕 **FADE EFFECTS LOGGING**: Log fade configuration khi đang active
    let fadeEffectsActive = false;
    if (currentFadeIn > 0 || currentFadeOut > 0) {
      fadeEffectsActive = true;
      // 🔧 **OCCASIONAL FADE LOGGING**: Log fade effects occasionally để tránh spam
      if (Math.random() < 0.01) { // 1% sampling
        console.log(`🎨 [FadeEffects] Active fade configuration:`, {
          fadeIn: currentFadeIn > 0 ? currentFadeIn.toFixed(1) + 's' : 'off',
          fadeOut: currentFadeOut > 0 ? currentFadeOut.toFixed(1) + 's' : 'off',
          selectionRange: `${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s`,
          fadeInRange: currentFadeIn > 0 ? `${startTime.toFixed(2)}s → ${(startTime + currentFadeIn).toFixed(2)}s` : 'none',
          fadeOutRange: currentFadeOut > 0 ? `${(endTime - currentFadeOut).toFixed(2)}s → ${endTime.toFixed(2)}s` : 'none'
        });
      }
    }
    
    // 🎯 PERFORMANCE: Batch draw operations
    ctx.save();
    
    if (useOptimizedSpacing) {
      // 🎯 SMALL SCREENS: Fill entire width with evenly spaced bars + fade effects
      const totalBarSpace = width;
      const spacing = totalBarSpace / waveformData.length;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const baseBarHeight = Math.max(3, (value * height) / 2); // Increased minimum from 2px to 3px
        
        // 🎯 **CALCULATE TIME**: Time position của bar này
        const barTime = (i / waveformData.length) * duration;
        
        // 🆕 **APPLY FADE EFFECT**: Tính toán fade multiplier cho bar này
        const fadeMultiplier = fadeEffectsActive ? 
          calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut) : 1.0;
        
        // 🆕 **COMBINED SCALING**: Volume scaling + Fade effect
        const volumeScaledHeight = baseBarHeight * finalVolumeMultiplier;
        const finalBarHeight = volumeScaledHeight * fadeMultiplier; // 🎨 **FADE + VOLUME**
        
        const x = i * spacing;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with guaranteed visibility + volume scaling + fade effects
        ctx.fillRect(Math.floor(x), centerY - finalBarHeight, minBarWidth, finalBarHeight * 2);
      }
    } else {
      // 🎯 LARGE SCREENS: Normal spacing with calculated bar width + fade effects
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const baseBarHeight = Math.max(3, (value * height) / 2); // Increased minimum from 2px to 3px
        
        // 🎯 **CALCULATE TIME**: Time position của bar này
        const barTime = (i / waveformData.length) * duration;
        
        // 🆕 **APPLY FADE EFFECT**: Tính toán fade multiplier cho bar này
        const fadeMultiplier = fadeEffectsActive ? 
          calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut) : 1.0;
        
        // 🆕 **COMBINED SCALING**: Volume scaling + Fade effect
        const volumeScaledHeight = baseBarHeight * finalVolumeMultiplier;
        const finalBarHeight = volumeScaledHeight * fadeMultiplier; // 🎨 **FADE + VOLUME**
        
        const x = i * barWidth;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with optimized width + volume scaling + fade effects
        const drawWidth = Math.max(1, barWidth - 0.3);
        ctx.fillRect(Math.floor(x), centerY - finalBarHeight, drawWidth, finalBarHeight * 2);
      }
    }
    ctx.restore();
    
    // 3. 🎯 Selection overlay
    if (startTime < endTime) {
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      // Selection area highlight
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Selection borders
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // 4. 🎯 **MODERN HANDLES**: Modern vertical bar design inspired by competitor
    if (startTime < endTime) {
      const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
      const { hoveredHandle, isDragging } = renderData;
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      // 🎯 **RESPONSIVE MODERN HANDLE SIZE**: Slightly smaller on mobile
      const responsiveHandleWidth = width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
      
      // 🎯 **ULTRA-CRISP HANDLE STYLING**: Hoàn toàn sắc nét, không mờ nhòe
      const drawCrispHandle = (x, isLeft, isActive) => {
        // 🔥 **PIXEL-PERFECT CENTER**: Làm tròn hoàn toàn để tránh sub-pixel
        const centerX = Math.round(x);
        
        // 🎯 **BRAND COLORS**: Màu sắc sắc nét, không hiệu ứng
        const baseColor = isLeft ? '#14b8a6' : '#f97316'; // Teal & Orange
        const activeColor = isLeft ? '#0d9488' : '#ea580c'; // Darker when active
        const fillColor = isActive ? activeColor : baseColor;
        
        // 🔥 **ULTRA-SHARP RECTANGLE**: Sử dụng fillRect thay vì roundRect
        // Loại bỏ hoàn toàn rounded corners để có cạnh sắc nét 100%
        const handleX = Math.round(centerX - responsiveHandleWidth / 2);
        const handleY = 0;
        const handleWidth = responsiveHandleWidth;
        const handleHeight = height;
        
        // 🎯 **SINGLE LAYER RENDERING**: Chỉ vẽ một lớp duy nhất
        ctx.fillStyle = fillColor;
        ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
        
        // 🔧 **DEBUG ULTRA-CRISP**: Log rendering info với throttling
        if (Math.random() < 0.01) { // 1% sampling để tránh spam console
          console.log(`🔥 [UltraCrispHandle] ${isLeft ? 'START' : 'END'} handle:`, {
            position: `${centerX}px (pixel-perfect)`,
            dimensions: `${handleWidth}px × ${handleHeight}px`,
            color: fillColor,
            active: isActive,
            rendering: 'ULTRA_CRISP_SINGLE_LAYER',
            sharpness: '100% - NO_BLUR_NO_GLOW_NO_ROUNDED'
          });
        }
      };
      
      // 🎯 **DRAW START HANDLE**: Crisp left handle with teal brand color
      const isStartActive = hoveredHandle === 'start' || isDragging === 'start';
      drawCrispHandle(startX, true, isStartActive);
      
      // 🎯 **DRAW END HANDLE**: Crisp right handle with orange brand color
      const isEndActive = hoveredHandle === 'end' || isDragging === 'end';
      drawCrispHandle(endX, false, isEndActive);
    }
    
    // 5. 🔥 **COMPACT CURSOR**: Reduced size by 50% as requested by user
    if (duration > 0 && currentTime >= 0) {
      const cursorX = (currentTime / duration) * width;
      
      // 🔥 **ULTRA-SLIM CURSOR LINE**: Reduced from 2px to 1px (50% smaller as requested)
      ctx.strokeStyle = isPlaying ? '#f59e0b' : '#f97316';
      ctx.lineWidth = 1; // 🆕 **REDUCED SIZE**: Changed from 2px to 1px (50% reduction)
      ctx.shadowColor = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowBlur = isPlaying ? 1 : 0.5; // Reduced shadow blur proportionally
      
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // 🔥 **MINI CURSOR TRIANGLE**: Reduced from 4px to 2px (50% smaller as requested)
      const triangleSize = 2; // 🆕 **REDUCED SIZE**: Changed from 4px to 2px (50% reduction)
      ctx.fillStyle = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowColor = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowBlur = isPlaying ? 0.5 : 0; // Reduced shadow blur
      
      ctx.beginPath();
      ctx.moveTo(cursorX - triangleSize, 0);
      ctx.lineTo(cursorX + triangleSize, 0);
      ctx.lineTo(cursorX, triangleSize * 1.5); // Proportionally smaller triangle
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // 🔧 **DEBUG COMPACT CURSOR**: Log size reduction occasionally
      if (Math.random() < 0.002) { // 0.2% sampling
        console.log(`🔥 [CompactCursor] Rendered 50% smaller cursor:`, {
          lineWidth: '1px (was 2px)',
          triangleSize: '2px (was 4px)',
          position: cursorX.toFixed(1) + 'px',
          time: currentTime.toFixed(2) + 's',
          isPlaying
        });
      }
    }

    // 6. 🆕 **HOVER TIME LINE**: Thin 1px line showing hover position
    if (hoverTooltip && hoverTooltip.visible && duration > 0) {
      const hoverX = hoverTooltip.x;
      
      // 🎯 **ULTRA-THIN HOVER LINE**: 1px line as requested
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // Blue with transparency
      ctx.lineWidth = 1; // ← Exactly 1px as requested
      ctx.setLineDash([2, 2]); // Dashed line to distinguish from cursor
      
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // 🔧 **DEBUG HOVER LINE**: Occasional logging
      if (Math.random() < 0.02) { // 2% sampling
        console.log(`📍 [HoverLine] Drawing at ${hoverX.toFixed(1)}px for time ${hoverTooltip.formattedTime}`);
      }
    }
  }, [canvasRef, renderData, currentTime, isPlaying, hoverTooltip]);

  // 🚀 **ULTRA-SMOOTH REDRAW**: High-performance cursor và hover line animation
  const requestRedraw = useCallback(() => {
    // 🔥 Cancel previous frame to prevent stacking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      // 🚀 **ULTRA-SMOOTH PERFORMANCE**: Context-aware frame rates với improved hover handling
      let minInterval;
      if (isDragging) {
        minInterval = 2;   // 🚀 **500FPS** for ultra-smooth dragging
      } else if (isPlaying) {
        minInterval = 8;   // 🚀 **125FPS** for smooth cursor movement
      } else if (hoverTooltip && hoverTooltip.visible) {
        minInterval = 8;   // 🚀 **125FPS** for smooth hover line
      } else {
        minInterval = 16;  // 60fps for static UI
      }
      
      // 🔧 **DEBUG PERFORMANCE**: Log performance improvements occasionally
      if (Math.random() < 0.001) { // 0.1% sampling
        const mode = isDragging ? 'DRAGGING' : isPlaying ? 'PLAYING' : hoverTooltip?.visible ? 'HOVERING' : 'STATIC';
        console.log(`⚡ [RenderPerf] Smooth rendering: ${mode} - ${minInterval}ms (${Math.round(1000 / minInterval)}fps)`);
      }
      
      // 🚀 **SMOOTH THROTTLING**: Allow ultra-smooth updates
      if (timestamp - lastDrawTimeRef.current >= minInterval) {
        drawWaveform();
        lastDrawTimeRef.current = timestamp;
      }
      
      animationFrameRef.current = null;
    });
  }, [drawWaveform, isDragging, isPlaying, hoverTooltip]);

  // 🚀 **SMOOTH HOVER LINE**: Trigger redraw khi hover tooltip thay đổi
  useEffect(() => {
    // 🚫 **SKIP REDRAW DURING REGION DRAG**: Don't redraw hover line when dragging region
    if (isDragging === 'region' || isDragging === 'region-potential') {
      if (Math.random() < 0.02) { // 2% sampling
        console.log(`🚫 [HoverLine] Skipping redraw during ${isDragging} - maintaining clean UI`);
      }
      return; // Exit early for region drag
    }
    
    if (hoverTooltip && hoverTooltip.visible && renderData) {
      // 🚀 **IMMEDIATE HOVER REDRAW**: Redraw ngay lập tức khi hover position changes
      requestRedraw();
    }
  }, [hoverTooltip, renderData, requestRedraw, isDragging]); // 🆕 **ADDED isDragging**: Track drag state

  // 🔥 **RESPONSIVE CURSOR**: High-frequency cursor updates for smooth movement
  useEffect(() => {
    if (isPlaying && renderData && duration > 0) {
      // 🔥 **IMMEDIATE REDRAW**: Không delay cho cursor movement
      requestRedraw();
    }
  }, [currentTime, isPlaying, renderData, requestRedraw, duration]);

  // 🔥 **STABLE REDRAW**: Minimal re-triggers for non-cursor updates
  useEffect(() => {
    if (renderData && !isPlaying) {
      // 🔥 **STATIC UPDATES**: Chỉ khi không playing để tránh conflict
      const timeoutId = setTimeout(requestRedraw, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [renderData, requestRedraw, isPlaying, hoverTooltip]);

  // 🆕 **HANDLE TOOLTIP UPDATES**: Update handle tooltips khi cần thiết
  useEffect(() => {
    updateHandleTooltips();
  }, [startTime, endTime, currentTime, duration, updateHandleTooltips]);

  // 🆕 **DRAGGING TOOLTIP UPDATES**: Update handle tooltips với tần suất cao khi đang drag
  useEffect(() => {
    if (isDragging) {
      // 🔥 **HIGH FREQUENCY UPDATES**: Update tooltips mỗi 16ms khi đang drag để smooth
      const dragTooltipInterval = setInterval(() => {
        updateHandleTooltips();
      }, 16); // 60fps

      console.log(`🏷️ [HandleTooltips] Started high-frequency updates for smooth dragging`);

      return () => {
        clearInterval(dragTooltipInterval);
        console.log(`🏷️ [HandleTooltips] Stopped high-frequency updates`);
      };
    }
  }, [isDragging, updateHandleTooltips]);

  // 🔥 **CANVAS SETUP**: Minimal setup với reduced logging
  useEffect(() => {
    let resizeTimeoutRef = null;
    
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      
      const parent = canvas.parentElement;
      const parentWidth = parent.offsetWidth;
      
      // 🔥 RESPONSIVE: Minimum width protection
      const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
      const newWidth = Math.max(minWidth, parentWidth);
      const newHeight = WAVEFORM_CONFIG.HEIGHT;
      
      // 🔥 **ONLY RESIZE**: if dimensions actually changed
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        lastCanvasWidthRef.current = newWidth;
        
        // 🔥 **DEBOUNCED REDRAW**: Prevent resize loops
        if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
        resizeTimeoutRef = setTimeout(() => {
          requestRedraw();
          resizeTimeoutRef = null;
        }, 16);
      }
    };
    
    // 🔥 **DEBOUNCED RESIZE**: Handler
    const handleResize = () => {
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      resizeTimeoutRef = setTimeout(setupCanvas, 100);
    };
    
    setupCanvas();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // 🆕 **HOVER CLEANUP**: Clear hover timeout to prevent memory leaks
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  // 🆕 **VOLUME ANIMATION SYSTEM**: Siêu nhanh, siêu mượt cho volume changes
  useEffect(() => {
    targetVolumeRef.current = volume;
    let animationId = null;
    const animateVolume = () => {
      const current = volumeAnimationRef.current;
      const target = targetVolumeRef.current;
      const diff = target - current;
      let changed = false;
      // Siêu nhạy: threshold cực nhỏ, tốc độ lớn
      if (Math.abs(diff) > 0.0001) {
        const adaptiveSpeed = 0.5;
        volumeAnimationRef.current = current + diff * adaptiveSpeed;
        setAnimatedVolume(volumeAnimationRef.current);
        changed = true;
      } else if (animatedVolume !== target) {
        volumeAnimationRef.current = target;
        setAnimatedVolume(target);
        changed = true;
      }
      if (changed) {
        animationId = requestAnimationFrame(animateVolume);
      } else {
        animationId = null;
      }
    };
    animationId = requestAnimationFrame(animateVolume);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [volume, animatedVolume]);

  // 🆕 **CURSOR INITIALIZATION**: Setup intelligent cursor system when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // 🎯 **INITIAL CURSOR**: Set default cursor when component first loads
      canvas.style.cursor = 'pointer';
      currentCursorRef.current = 'pointer';
      console.log(`🎯 [CursorInit] Initialized canvas cursor system with default: pointer`);
      
      // 🆕 **RESPONSIVE CURSOR UPDATES**: Update cursor when selection changes
      const updateCursorForSelection = () => {
        // If there's no selection yet, keep pointer cursor
        if (startTime >= endTime || duration === 0) {
          if (currentCursorRef.current !== 'pointer') {
            canvas.style.cursor = 'pointer';
            currentCursorRef.current = 'pointer';
            console.log(`🔄 [CursorInit] Updated to pointer - no valid selection`);
          }
        }
      };
      
      updateCursorForSelection();
    }
  }, [canvasRef, startTime, endTime, duration]); // Update when selection changes

  // 🆕 **DRAG STATE CURSOR UPDATE**: Force cursor update when isDragging changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 🎯 **IMMEDIATE CURSOR UPDATE**: Update cursor immediately when drag state changes
    if (isDragging === 'region-potential' || isDragging === 'region') {
      // 🔄 **ENHANCED CROSS-PLATFORM CURSOR**: Multiple fallback strategies
      const applyCursorWithMultipleFallbacks = () => {
        try {
          // 🎯 **METHOD 1: CSS Data Attribute**: Use CSS classes with data attributes
          canvas.setAttribute('data-cursor', 'region-potential');
          canvas.className = `${canvas.className.replace(/cursor-\S+/g, '')} cursor-all-scroll`.trim();
          
          // 🎯 **METHOD 2: Direct Style with Fallbacks**: Try multiple cursor values
          const cursorOptions = [
            'all-scroll',      // Primary: 4-way arrow
            'move',            // Fallback 1: Move cursor
            '-webkit-grab',    // Fallback 2: Webkit grab
            'grab',            // Fallback 3: Standard grab
            'crosshair',       // Fallback 4: Crosshair
            'pointer'          // Final fallback: Pointer
          ];
          
          let appliedCursor = 'pointer';
          
          for (const cursorValue of cursorOptions) {
            canvas.style.cursor = cursorValue;
            
            // 🔧 **VERIFY APPLICATION**: Check if browser accepted the cursor
            const computedCursor = getComputedStyle(canvas).cursor;
            
            if (computedCursor === cursorValue || 
                (cursorValue === 'all-scroll' && computedCursor.includes('scroll')) ||
                (cursorValue === 'move' && computedCursor.includes('move')) ||
                (cursorValue === 'grab' && computedCursor.includes('grab'))) {
              appliedCursor = cursorValue;
              console.log(`✅ [DragStateCursor] Successfully applied cursor: ${cursorValue}`);
              break;
            }
          }
          
          currentCursorRef.current = appliedCursor;
          
          console.log(`🔄 [DragStateCursor] IMMEDIATE cursor update for isDragging=${isDragging}`);
          console.log(`🎯 [CursorForced] Applied ${appliedCursor} cursor via enhanced fallback system`);
          
          return appliedCursor;
          
        } catch (error) {
          console.warn(`🚨 [CursorError] Failed to apply drag state cursor:`, error);
          canvas.style.cursor = 'pointer';
          canvas.setAttribute('data-cursor', 'pointer');
          currentCursorRef.current = 'pointer';
          return 'pointer';
        }
      };
      
      applyCursorWithMultipleFallbacks();
      
    } else if (isDragging === null && currentCursorRef.current !== 'pointer') {
      // 🔄 **RESET CURSOR**: Reset to pointer when drag ends
      canvas.style.cursor = 'pointer';
      canvas.setAttribute('data-cursor', 'pointer');
      canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
      currentCursorRef.current = 'pointer';
      console.log(`🔄 [DragStateCursor] Reset cursor to pointer - drag ended`);
    }
  }, [isDragging, canvasRef]); // Trigger when isDragging changes

  // 🆕 **FADE EFFECT LOGGER**: Log khi fade values thay đổi để debug
  useEffect(() => {
    if (fadeIn > 0 || fadeOut > 0) {
      console.log(`🎨 [FadeEffects] Fade configuration updated:`, {
        fadeIn: fadeIn.toFixed(1) + 's',
        fadeOut: fadeOut.toFixed(1) + 's',
        startTime: startTime.toFixed(2) + 's',
        endTime: endTime.toFixed(2) + 's',
        selectionDuration: (endTime - startTime).toFixed(2) + 's',
        fadeInRange: fadeIn > 0 ? `${startTime.toFixed(2)}s → ${(startTime + fadeIn).toFixed(2)}s` : 'none',
        fadeOutRange: fadeOut > 0 ? `${(endTime - fadeOut).toFixed(2)}s → ${endTime.toFixed(2)}s` : 'none'
      });
    }
  }, [fadeIn, fadeOut, startTime, endTime]);

  return (
    <div className="relative" style={{ minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px` }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleEnhancedMouseDown}
        onMouseMove={handleEnhancedMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={handleEnhancedMouseLeave}
        className="w-full border border-slate-200 rounded-lg"
        style={{ 
          height: WAVEFORM_CONFIG.HEIGHT,
          touchAction: 'none', // Prevent scrolling on touch devices
          overflow: 'hidden', // 🚫 **NO CANVAS SCROLLBARS**: Đảm bảo canvas không tạo scrollbar
        }}
      />
      
      {/* 🆕 **SIMPLIFIED TOOLTIPS**: Relative positioning tooltips - NO PORTAL */}
      
      {/* 🆕 **HOVER TIME TOOLTIP**: Simple relative positioning */}
      {hoverTooltip && hoverTooltip.visible && (
        <div
          className="absolute pointer-events-none text-xs font-bold z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: '-25px', // 🎯 **ABOVE CANVAS**: 25px above canvas
            transform: 'translateX(-50%)',
            color: 'rgba(30, 41, 59, 0.95)',
            whiteSpace: 'nowrap',
            fontWeight: '700',
            fontSize: '11px',
            textShadow: '0 1px 4px rgba(255, 255, 255, 0.9), 0 -1px 2px rgba(0, 0, 0, 0.8), 1px 0 3px rgba(255, 255, 255, 0.8), -1px 0 3px rgba(255, 255, 255, 0.8)',
            WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.9)'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🏷️ **START HANDLE TOOLTIP**: Below waveform */}
      {handleTooltips.startHandle && handleTooltips.startHandle.visible && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded font-medium z-40"
          style={{
            left: `${handleTooltips.startHandle.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT + 5}px`, // 🎯 **BELOW CANVAS**: 5px below canvas
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(20, 184, 166, 0.95)',
            color: 'white',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)'
          }}
        >
          {handleTooltips.startHandle.formattedTime}
        </div>
      )}

      {/* 🏷️ **END HANDLE TOOLTIP**: Below waveform */}
      {handleTooltips.endHandle && handleTooltips.endHandle.visible && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded font-medium z-40"
          style={{
            left: `${handleTooltips.endHandle.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT + 5}px`, // 🎯 **BELOW CANVAS**: 5px below canvas
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(249, 115, 22, 0.95)',
            color: 'white',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)'
          }}
        >
          {handleTooltips.endHandle.formattedTime}
        </div>
      )}

      {/* 🏷️ **SELECTION DURATION TOOLTIP**: Inside waveform */}
      {handleTooltips.selectionDuration && handleTooltips.selectionDuration.visible && (
        <div
          className="absolute pointer-events-none text-sm font-semibold z-30"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_CONFIG.HEIGHT - 30}px`, // 🎯 **INSIDE CANVAS**: 30px from bottom
            transform: 'translateX(-50%)',
            color: 'rgba(30, 41, 59, 0.9)',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 -1px 1px rgba(0, 0, 0, 0.2)',
            fontWeight: '600'
          }}
        >
          {handleTooltips.selectionDuration.formattedDuration}
        </div>
      )}
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;