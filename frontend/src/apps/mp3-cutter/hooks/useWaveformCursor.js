import { useCallback, useRef, useEffect } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformCursor = (canvasRef, duration, startTime, endTime, isDragging) => {
  const currentCursorRef = useRef('pointer');
  const lastCursorUpdateRef = useRef(0);

  // Detect cursor type based on mouse position
  const detectCursorType = useCallback((mouseX, canvasWidth, eventInfo = null) => {
    if (!canvasWidth || duration === 0) return 'pointer';

    // 🆕 **DIRECT HANDLE EVENT**: Nếu event từ handle trực tiếp, return resize cursor
    if (eventInfo?.isHandleEvent && eventInfo?.handleType) {
      console.log(`🖱️ [CURSOR-DIRECT] Handle event detected, cursor: ew-resize`, {
        handleType: eventInfo.handleType,
        mouseX: mouseX.toFixed(1),
        source: 'DIRECT_HANDLE'
      });
      return 'ew-resize';
    }

    // Priority 1: Region drag cursor
    if (isDragging === 'region' || isDragging === 'region-potential') {
      return 'all-scroll';
    }

    // Priority 2: Handle detection
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(6, MODERN_HANDLE_WIDTH * 0.8) : MODERN_HANDLE_WIDTH;
    
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    
    // 🎯 **ZERO DETECTION AREA**: Detection area = 0, chỉ detect khi hover chính xác vào handle
    // Handle left: từ [startX - 8px] đến [startX]  
    // Handle right: từ [endX - 8px] đến [endX]
    const startHandleLeftEdge = startX - responsiveHandleWidth; // Visual left edge
    const startHandleRightEdge = startX;                        // Visual right edge  
    const endHandleLeftEdge = endX - responsiveHandleWidth;     // Visual left edge
    const endHandleRightEdge = endX;                            // Visual right edge
    
    if (startTime < endTime) {
      // 🔧 **EXACT HANDLE AREA ONLY**: Chỉ detect khi mouse nằm chính xác trong visual area của handle
      const overStartHandle = mouseX >= startHandleLeftEdge && mouseX <= startHandleRightEdge;
      const overEndHandle = mouseX >= endHandleLeftEdge && mouseX <= endHandleRightEdge;
      
      // 🚀 **CURSOR DEBUG**: Log khi detect handle với zero tolerance
      if (overStartHandle || overEndHandle) {
        console.log(`🖱️ [CURSOR-DETECT-ZERO-AREA] Handle detected with ZERO detection area:`, {
          mouseX: mouseX.toFixed(1),
          startHandle: overStartHandle ? {
            detected: true,
            visualArea: `[${startHandleLeftEdge.toFixed(1)}, ${startHandleRightEdge.toFixed(1)}]`,
            width: responsiveHandleWidth + 'px'
          } : { detected: false },
          endHandle: overEndHandle ? {
            detected: true, 
            visualArea: `[${endHandleLeftEdge.toFixed(1)}, ${endHandleRightEdge.toFixed(1)}]`,
            width: responsiveHandleWidth + 'px'
          } : { detected: false },
          detectionArea: '0px (ZERO TOLERANCE)',
          cursor: 'ew-resize',
          userFix: 'Now 8px area before handle right is clickable for cursor movement'
        });
      }
      
      if (overStartHandle || overEndHandle) {
        return 'ew-resize';
      }
    }

    // Priority 3: Region hover
    const timeAtPosition = (mouseX / canvasWidth) * duration;
    const isInsideRegion = timeAtPosition >= startTime && timeAtPosition <= endTime && startTime < endTime;
    
    if (isInsideRegion) {
      return 'grab';
    }
    
    return 'pointer';
  }, [duration, startTime, endTime, isDragging]);

  // Apply cursor with fallbacks
  const applyCursorWithFallbacks = useCallback((canvas, requestedCursor) => {
    try {
      let cursorOptions, dataAttribute;
      
      if (requestedCursor === 'all-scroll') {
        dataAttribute = 'region-potential';
        cursorOptions = ['all-scroll', 'move', '-webkit-grab', 'grab', 'crosshair', 'pointer'];
      } else if (requestedCursor === 'ew-resize') {
        dataAttribute = 'handle-resize';
        cursorOptions = ['ew-resize', 'col-resize', 'e-resize', 'w-resize', 'pointer'];
      } else if (requestedCursor === 'grab') {
        dataAttribute = 'region-hover';
        cursorOptions = ['grab', '-webkit-grab', 'move', 'pointer'];
      } else {
        dataAttribute = 'pointer';
        cursorOptions = ['pointer', 'default'];
      }
      
      canvas.setAttribute('data-cursor', dataAttribute);
      
      canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
      if (requestedCursor === 'all-scroll') {
        canvas.className = `${canvas.className} cursor-all-scroll`.trim();
      } else if (requestedCursor === 'grab') {
        canvas.className = `${canvas.className} cursor-grab`.trim();
      }
      
      let appliedCursor = 'pointer';
      
      for (const cursorValue of cursorOptions) {
        canvas.style.cursor = cursorValue;
        const computedCursor = getComputedStyle(canvas).cursor;
        
        if (computedCursor === cursorValue || 
            (cursorValue === 'all-scroll' && computedCursor.includes('scroll')) ||
            (cursorValue === 'move' && computedCursor.includes('move')) ||
            (cursorValue === 'ew-resize' && computedCursor.includes('resize')) ||
            (cursorValue.includes('grab') && computedCursor.includes('grab'))) {
          appliedCursor = cursorValue;
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
  }, []);

  // Update cursor based on mouse position
  const updateCursor = useCallback((mouseX, eventInfo = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 🚀 **THROTTLE CURSOR UPDATES**: Limit to 120fps for performance
    const now = performance.now();
    if (now - lastCursorUpdateRef.current < 8) return; // 8ms = 120fps
    lastCursorUpdateRef.current = now;

    const canvasWidth = canvas.width;
    const newCursor = detectCursorType(mouseX, canvasWidth, eventInfo);

    // 🚀 **ONLY UPDATE IF CHANGED**: Prevent excessive DOM updates
    if (newCursor !== currentCursorRef.current) {
      canvas.style.cursor = newCursor;
      currentCursorRef.current = newCursor;
      
      // 🔧 **CURSOR CHANGE LOG**: Enhanced logging với eventInfo
      console.log(`🖱️ [CURSOR-UPDATE] Cursor changed to: ${newCursor}`, {
        mouseX: mouseX.toFixed(1),
        previous: currentCursorRef.current,
        eventSource: eventInfo?.isHandleEvent ? 'HANDLE' : 'CANVAS',
        handleType: eventInfo?.handleType || 'none'
      });
    }
  }, [canvasRef, detectCursorType]);

  // Reset cursor
  const resetCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'pointer';
      canvas.setAttribute('data-cursor', 'pointer');
      canvas.className = canvas.className.replace(/cursor-\S+/g, '').trim();
      currentCursorRef.current = 'pointer';
    }
  }, [canvasRef]);

  // Initialize cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'pointer';
      currentCursorRef.current = 'pointer';
    }
  }, [canvasRef]);

  // Handle drag state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isDragging === 'region-potential' || isDragging === 'region') {
      applyCursorWithFallbacks(canvas, 'all-scroll');
      currentCursorRef.current = 'all-scroll';
    } else if (isDragging === null && currentCursorRef.current !== 'pointer') {
      resetCursor();
    }
  }, [isDragging, canvasRef, applyCursorWithFallbacks, resetCursor]);

  return {
    updateCursor,
    resetCursor,
    currentCursor: currentCursorRef.current
  };
};