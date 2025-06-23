// 🎯 UNIFIED POSITION CALCULATION UTILITY
// Ensures consistency across all mouse position → time conversions

import { WAVEFORM_CONFIG } from './constants';

// Helper: responsive handle width (matches WaveformCanvas.js)
export const getResponsiveHandleWidth = (width) =>
  width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT
    ? Math.max(3, WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH * 0.75)
    : WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH;

// Helper: waveform area calculation (matches WaveformCanvas.js)
export const getWaveformArea = (width) => {
  const handleW = getResponsiveHandleWidth(width);
  return {
    startX: handleW,
    endX: width - handleW,
    areaWidth: width - 2 * handleW,
    handleW
  };
};

/**
 * 🎯 UNIFIED MOUSE POSITION TO TIME CONVERSION
 * This function ensures ALL cursor position calculations use identical logic
 */
export const mousePositionToTime = (mouseX, canvasWidth, duration) => {
  if (!canvasWidth || duration <= 0 || mouseX < 0) return 0;
  
  const { startX, areaWidth } = getWaveformArea(canvasWidth);
  
  // 🔧 CRITICAL: Use exact same formula everywhere
  const clickTime = ((mouseX - startX) / areaWidth) * duration;
  
  // Clamp to valid range
  return Math.max(0, Math.min(clickTime, duration));
};

/**
 * 🎯 UNIFIED TIME TO POSITION CONVERSION
 * For consistent cursor line positioning
 */
export const timeToMousePosition = (time, canvasWidth, duration) => {
  if (!canvasWidth || duration <= 0 || time < 0) return 0;
  
  const { startX, areaWidth } = getWaveformArea(canvasWidth);
  
  // 🔧 CRITICAL: Inverse of mousePositionToTime
  const mouseX = startX + (time / duration) * areaWidth;
  
  return Math.max(startX, Math.min(mouseX, startX + areaWidth));
};

/**
 * 🔧 DEBUG HELPER - Log position calculation details
 */
export const debugPositionCalculation = (mouseX, canvasWidth, duration, context = 'unknown') => {
  const { startX, areaWidth } = getWaveformArea(canvasWidth);
  const clickTime = mousePositionToTime(mouseX, canvasWidth, duration);
  
  console.log(`🔍 [${context}] Position calc:`, {
    mouseX: mouseX.toFixed(2),
    canvasWidth,
    startX: startX.toFixed(2),
    areaWidth: areaWidth.toFixed(2),
    duration: duration.toFixed(2),
    calculatedTime: clickTime.toFixed(2),
    formattedTime: `${Math.floor(clickTime / 60)}:${(clickTime % 60).toFixed(1).padStart(4, '0')}`
  });
  
  return clickTime;
};
