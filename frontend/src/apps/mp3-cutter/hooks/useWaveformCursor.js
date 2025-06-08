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
    
    // 🔧 **SYNC WITH INTERACTION UTILS**: Sử dụng chính xác cùng logic
    const startHandleVisualCenter = startX - (responsiveHandleWidth / 2); // startX - 4
    const endHandleVisualCenter = endX + (responsiveHandleWidth / 2);     // endX + 4
    const detectionTolerance = responsiveHandleWidth / 2 + 2; // 6px total
    
    if (startTime < endTime) {
      const overStartHandle = Math.abs(mouseX - startHandleVisualCenter) <= detectionTolerance;
      const overEndHandle = Math.abs(mouseX - endHandleVisualCenter) <= detectionTolerance;
      
      // 🚀 **CURSOR DEBUG**: Log khi detect handle
      if (overStartHandle || overEndHandle) {
        console.log(`🖱️ [CURSOR-DETECT] Handle detected for cursor change:`, {
          mouseX: mouseX.toFixed(1),
          startHandle: overStartHandle ? `YES (center: ${startHandleVisualCenter.toFixed(1)}, dist: ${Math.abs(mouseX - startHandleVisualCenter).toFixed(1)})` : 'NO',
          endHandle: overEndHandle ? `YES (center: ${endHandleVisualCenter.toFixed(1)}, dist: ${Math.abs(mouseX - endHandleVisualCenter).toFixed(1)})` : 'NO',
          tolerance: detectionTolerance + 'px',
          cursor: 'ew-resize'
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

  // Update cursor
  const updateCursor = useCallback((mouseX) => {
    const now = performance.now();
    
    let throttleInterval;
    if (isDragging === 'region' || isDragging === 'region-potential') {
      throttleInterval = 4; // Giảm từ 8ms xuống 4ms cho region drag
    } else if (currentCursorRef.current === 'ew-resize') {
      throttleInterval = 2; // Giảm từ 8ms xuống 2ms cho handle hover - SIÊU NHẠY
    } else {
      // 🚀 **ENHANCED LOGIC**: Check if mouse is near handles to use faster update
      const canvas = canvasRef.current;
      if (canvas && duration > 0) {
        const canvasWidth = canvas.width;
        const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
          Math.max(6, WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH * 0.8) : WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH;
        
        const startX = (startTime / duration) * canvasWidth;
        const endX = (endTime / duration) * canvasWidth;
        
        // 🔧 **SYNC WITH NEW DETECTION**: Sử dụng detection position mới
        const startHandleVisualCenter = startX - (responsiveHandleWidth / 2);
        const endHandleVisualCenter = endX + (responsiveHandleWidth / 2);
        const detectionTolerance = responsiveHandleWidth / 2 + 2;
        
        // Check if mouse is near any handle (với visual position chính xác)
        const nearStartHandle = Math.abs(mouseX - startHandleVisualCenter) <= detectionTolerance * 1.5; // 1.5x tolerance for pre-detection
        const nearEndHandle = Math.abs(mouseX - endHandleVisualCenter) <= detectionTolerance * 1.5;
        
        if (nearStartHandle || nearEndHandle) {
          throttleInterval = 4; // Faster update when near handles
          
          // 🚀 **DEBUG ENHANCED DETECTION**: Log when using enhanced detection với visual sync
          if (Math.random() < 0.02) { // 2% sampling
            console.log('🎯 [ENHANCED-CURSOR] Near handle detected - VISUAL SYNC:', {
              mouseX: mouseX.toFixed(1),
              startHandleCenter: startHandleVisualCenter.toFixed(1),
              endHandleCenter: endHandleVisualCenter.toFixed(1),
              handleTolerance: detectionTolerance.toFixed(1),
              nearStart: nearStartHandle,
              nearEnd: nearEndHandle,
              throttleInterval: throttleInterval + 'ms',
              improvement: 'PERFECT SYNC - detection khớp visual position'
            });
          }
        } else {
          throttleInterval = 8; // Normal rate for other areas
        }
      } else {
        throttleInterval = 8; // Fallback
      }
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