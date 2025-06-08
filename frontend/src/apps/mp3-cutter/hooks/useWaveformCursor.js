import { useCallback, useRef, useEffect } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformCursor = (canvasRef, duration, startTime, endTime, isDragging) => {
  const currentCursorRef = useRef('pointer');
  const lastCursorUpdateRef = useRef(0);

  // Detect cursor type based on mouse position
  const detectCursorType = useCallback((mouseX, canvasWidth) => {
    if (!canvasWidth || duration === 0) return 'pointer';

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
    // 🔧 **UPDATED FOR EXTERNAL HANDLES**: Increase tolerance since handles are now outside waveform
    const baseTolerance = responsiveHandleWidth + 8; // Tăng từ 3px lên 8px cho handles ở ngoài
    const mobileTolerance = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 18 : 12; // Tăng mobile tolerance
    const tolerance = Math.min(baseTolerance, mobileTolerance);
    
    if (startTime < endTime) {
      const overStartHandle = Math.abs(mouseX - startX) <= tolerance;
      const overEndHandle = Math.abs(mouseX - endX) <= tolerance;
      
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

  // Update cursor
  const updateCursor = useCallback((mouseX) => {
    const now = performance.now();
    
    let throttleInterval;
    if (isDragging === 'region' || isDragging === 'region-potential') {
      throttleInterval = 8;
    } else if (currentCursorRef.current === 'ew-resize') {
      throttleInterval = 8;
    } else {
      throttleInterval = 16;
    }
    
    if (now - lastCursorUpdateRef.current < throttleInterval) return;
    lastCursorUpdateRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const newCursor = detectCursorType(mouseX, canvas.width);
    
    const isLeavingHandle = currentCursorRef.current === 'ew-resize' && newCursor !== 'ew-resize';
    const isEnteringHandle = currentCursorRef.current !== 'ew-resize' && newCursor === 'ew-resize';
    const shouldForceUpdate = isLeavingHandle || isEnteringHandle;
    
    if (newCursor !== currentCursorRef.current || shouldForceUpdate) {
      const finalCursor = applyCursorWithFallbacks(canvas, newCursor);
      currentCursorRef.current = finalCursor;
    }
  }, [canvasRef, detectCursorType, applyCursorWithFallbacks, isDragging]);

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