import { useCallback, useRef, useEffect } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformCursor = (canvasRef, duration, startTime, endTime, isDragging) => {
  const currentCursorRef = useRef('pointer');
  const lastCursorUpdateRef = useRef(0);

  const detectCursorType = useCallback((mouseX, canvasWidth, eventInfo) => {
    if (!canvasWidth || duration === 0) return 'pointer';
    if (eventInfo?.isHandleEvent && eventInfo?.handleType) return 'ew-resize';
    if (isDragging === 'region' || isDragging === 'region-potential') return 'all-scroll';
    const { MODERN_HANDLE_WIDTH, RESPONSIVE } = WAVEFORM_CONFIG;
    const hWidth = canvasWidth < RESPONSIVE.MOBILE_BREAKPOINT ? Math.max(6, MODERN_HANDLE_WIDTH * 0.8) : MODERN_HANDLE_WIDTH;
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    if (startTime < endTime) {
      const overStart = mouseX >= startX - hWidth && mouseX <= startX;
      const overEnd = mouseX >= endX - hWidth && mouseX <= endX;
      if (overStart || overEnd) return 'ew-resize';
    }
    const t = (mouseX / canvasWidth) * duration;
    if (t >= startTime && t <= endTime && startTime < endTime) return 'grab';
    return 'pointer';
  }, [duration, startTime, endTime, isDragging]);

  const applyCursorWithFallbacks = useCallback((canvas, requestedCursor) => {
    let cursor;
    if (requestedCursor === 'all-scroll') cursor = 'all-scroll';
    else if (requestedCursor === 'ew-resize') cursor = 'ew-resize';
    else if (requestedCursor === 'grab') cursor = 'grab';
    else cursor = 'pointer';
    canvas.style.cursor = cursor;
    return cursor;
  }, []);

  const updateCursor = useCallback((mouseX, eventInfo = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const now = performance.now();
    if (now - lastCursorUpdateRef.current < 8) return;
    lastCursorUpdateRef.current = now;
    const newCursor = detectCursorType(mouseX, canvas.width, eventInfo);
    if (newCursor !== currentCursorRef.current) {
      canvas.style.cursor = newCursor;
      currentCursorRef.current = newCursor;
    }
  }, [canvasRef, detectCursorType]);

  const resetCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'pointer';
      currentCursorRef.current = 'pointer';
    }
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'pointer';
    currentCursorRef.current = 'pointer';
  }, [canvasRef]);

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

  return { updateCursor, resetCursor, currentCursor: currentCursorRef.current };
};
