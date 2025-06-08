import { useState, useCallback, useRef, useEffect } from 'react';

export const useWaveformTooltips = (canvasRef, duration, startTime, endTime, isDragging) => {
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [handleTooltips, setHandleTooltips] = useState({
    startHandle: null,
    endHandle: null,
    selectionDuration: null
  });
  
  const lastHoverUpdateRef = useRef(0);
  const hoverTimeoutRef = useRef(null);

  // Time formatting utilities
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

  // Update handle tooltips
  const updateHandleTooltips = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) {
      setHandleTooltips({ startHandle: null, endHandle: null, selectionDuration: null });
      return;
    }

    const canvasWidth = canvas.width;
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const hasValidSelection = startTime < endTime;
    const selectionDuration = hasValidSelection ? endTime - startTime : 0;

    setHandleTooltips({
      startHandle: hasValidSelection && startX >= 0 && startX <= canvasWidth ? {
        x: startX,
        time: startTime,
        visible: true,
        formattedTime: formatTime(startTime)
      } : null,

      endHandle: hasValidSelection && endX >= 0 && endX <= canvasWidth ? {
        x: endX,
        time: endTime,
        visible: true,
        formattedTime: formatTime(endTime)
      } : null,

      selectionDuration: hasValidSelection && selectionDuration > 0.1 ? {
        x: (startX + endX) / 2,
        duration: selectionDuration,
        visible: true,
        formattedDuration: formatDuration(selectionDuration)
      } : null
    });
  }, [canvasRef, duration, startTime, endTime, formatTime, formatDuration]);

  // Update hover time
  const updateHoverTime = useCallback((mouseX, canvasWidth) => {
    const now = performance.now();
    if (now - lastHoverUpdateRef.current < 8) return;
    lastHoverUpdateRef.current = now;

    if (!canvasWidth || duration === 0 || isDragging === 'region' || isDragging === 'region-potential') {
      setHoverTooltip(null);
      return;
    }

    const timeAtPosition = (mouseX / canvasWidth) * duration;
    const clampedTime = Math.max(0, Math.min(timeAtPosition, duration));
    
    setHoverTooltip({
      x: mouseX,
      time: clampedTime,
      formattedTime: formatTime(clampedTime),
      visible: true
    });
  }, [duration, formatTime, isDragging]);

  // Clear hover tooltip
  const clearHoverTooltip = useCallback(() => {
    setHoverTooltip(null);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Effects
  useEffect(() => {
    updateHandleTooltips();
  }, [startTime, endTime, duration, updateHandleTooltips]);

  useEffect(() => {
    if (isDragging) {
      const interval = setInterval(updateHandleTooltips, 16);
      return () => clearInterval(interval);
    }
  }, [isDragging, updateHandleTooltips]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    hoverTooltip,
    handleTooltips,
    updateHoverTime,
    clearHoverTooltip,
    formatTime,
    formatDuration
  };
};