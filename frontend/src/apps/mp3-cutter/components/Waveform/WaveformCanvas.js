// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';
import { WaveformUI } from './WaveformUI';
import { useOptimizedTooltip } from '../../hooks/useOptimizedTooltip';
import { useWaveformCursor } from '../../hooks/useWaveformCursor';
import { useWaveformRender } from '../../hooks/useWaveformRender';

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
  
  // 🚀 **REALTIME AUDIO ACCESS**: Direct audio element access cho ultra-smooth tooltips
  audioRef,
  
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {

  // 🚀 **OPTIMIZED TOOLTIP HOOK** - Bao gồm main cursor tooltip
  const {
    hoverTooltip,
    handleTooltips,
    mainCursorTooltip, // 🆕 **MAIN CURSOR TOOLTIP**: Instant calculated tooltip cho main cursor
    updateHoverTooltip,
    clearHoverTooltip
  } = useOptimizedTooltip(canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging);

  const {
    updateCursor,
    resetCursor
  } = useWaveformCursor(canvasRef, duration, startTime, endTime, isDragging);

  // 🚀 **OPTIMIZED HOOK**: Responsive waveform rendering with hybrid system
  const {
    animatedVolume,
    hybridWaveformData,
    requestRedraw,
    containerWidth
  } = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);

  // 🚀 **ENHANCED MOUSE HANDLERS**
  const handleEnhancedMouseMove = useCallback((e) => {
    if (onMouseMove) onMouseMove(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      updateCursor(mouseX);
      updateHoverTooltip(e);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTooltip]);

  const handleEnhancedMouseLeave = useCallback((e) => {
    if (onMouseLeave) onMouseLeave(e);
    resetCursor();
    clearHoverTooltip();
  }, [onMouseLeave, resetCursor, clearHoverTooltip]);

  const handleEnhancedMouseDown = useCallback((e) => {
    if (onMouseDown) onMouseDown(e);
    clearHoverTooltip();
  }, [onMouseDown, clearHoverTooltip]);

  // 🆕 **HANDLE EVENT HANDLERS**: Direct handlers cho handles
  const handleHandleMouseDown = useCallback((e) => {
    // 🔧 **CLEAR HOVER TOOLTIP**: Ẩn hover tooltip khi bắt đầu drag handle
    clearHoverTooltip();
    
    // 🔧 **DIRECT CANVAS EVENT**: Optimized direct forwarding
    const canvas = canvasRef.current;
    if (canvas && onMouseDown) {
      const rect = canvas.getBoundingClientRect();
      const canvasEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        canvasX: e.clientX - rect.left,
        canvasY: e.clientY - rect.top
      };
      
      onMouseDown(canvasEvent);
    }
  }, [canvasRef, onMouseDown, clearHoverTooltip]);

  const handleHandleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas && onMouseMove) {
      const rect = canvas.getBoundingClientRect();
      const canvasEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        canvasX: e.clientX - rect.left,
        canvasY: e.clientY - rect.top
      };
      
      onMouseMove(canvasEvent);
      updateCursor(canvasEvent.canvasX, { isHandleEvent: true, handleType: e.handleType });
    }
  }, [canvasRef, onMouseMove, updateCursor]);

  const handleHandleMouseUp = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas && onMouseUp) {
      const canvasEvent = {
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true
      };
      
      onMouseUp(canvasEvent);
    }
  }, [canvasRef, onMouseUp]);

  // 🎯 **RENDER DATA MEMOIZATION**: Prevent unnecessary recalculations  
  const renderData = useMemo(() => {
    if (!hybridWaveformData?.data?.length || duration <= 0) return null;
    
    return {
      waveformData: hybridWaveformData.data, // 🚀 **HYBRID DATA**: Use processed data
      barWidth: hybridWaveformData.barWidth, // 🚀 **FIXED BAR WIDTH**: From hybrid system
      mode: hybridWaveformData.mode, // 🚀 **PROCESSING MODE**: natural/interpolate/sample
      duration,
      startTime,
      endTime,
      volume: animatedVolume,
      fadeIn,
      fadeOut,
      containerWidth
    };
  }, [hybridWaveformData, duration, startTime, endTime, animatedVolume, fadeIn, fadeOut, containerWidth]);

  // 🆕 **FADE EFFECT CALCULATOR**: Optimized fade calculation
  const calculateFadeMultiplier = useCallback((barTime, selectionStart, selectionEnd, fadeInDuration, fadeOutDuration) => {
    if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
    if (barTime < selectionStart || barTime > selectionEnd) return 1.0;
    
    const selectionDuration = selectionEnd - selectionStart;
    let fadeMultiplier = 1.0;
    
    if (fadeInDuration > 0) {
      const fadeInEnd = selectionStart + Math.min(fadeInDuration, selectionDuration / 2);
      if (barTime <= fadeInEnd) {
        const fadeProgress = Math.max(0, (barTime - selectionStart) / fadeInDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    if (fadeOutDuration > 0) {
      const fadeOutStart = selectionEnd - Math.min(fadeOutDuration, selectionDuration / 2);
      if (barTime >= fadeOutStart) {
        const fadeProgress = Math.max(0, (selectionEnd - barTime) / fadeOutDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    return Math.max(0.05, Math.min(1.0, fadeMultiplier));
  }, []);

  // 🎯 **OPTIMIZED DRAW FUNCTION**: Ultra-fast rendering without flicker
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🚀 **PERFORMANCE SETUP**: GPU acceleration
    ctx.imageSmoothingEnabled = false;
    
    // 🎯 **SMART CLEAR**: Only clear if actually needed
    ctx.clearRect(0, 0, width, height);
    
    // 1. **BACKGROUND GRADIENT**
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. **WAVEFORM BARS**: Ultra-optimized rendering with hybrid system
    const { 
      waveformData, 
      // barWidth: fixedBarWidth, // 🚀 **REMOVED**: Not used in adjusted rendering
      // mode, // 🚀 **REMOVED**: Not used in adjusted rendering
      duration, 
      startTime, 
      endTime, 
      volume: currentVolume, 
      fadeIn: currentFadeIn, 
      fadeOut: currentFadeOut 
    } = renderData;
    
    const centerY = height / 2;
    
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Reserve space for handles (8px each side)
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth; // Start after left handle
    const waveformEndX = width - rightHandleWidth; // End before right handle
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 🚀 **DEBUG LOG**: Add console.log for debugging if needed
    if (Math.random() < 0.02) { // Log occasionally to avoid spam
      console.log(`🔧 [WAVEFORM-RENDER-FIX] Waveform rendering area:`, {
        canvasWidth: width + 'px',
        leftHandleWidth: leftHandleWidth + 'px', 
        rightHandleWidth: rightHandleWidth + 'px',
        waveformStartX: waveformStartX + 'px',
        waveformEndX: waveformEndX + 'px',
        availableWaveformWidth: availableWaveformWidth + 'px',
        fix: 'Waveform now renders only between handles'
      });
    }
    
    // 🎯 **VOLUME SYSTEM**: Perfect linear scaling
    const FLAT_BAR_HEIGHT_PX = 1;
    const MAX_SCALING_PX = 65;
    const volumePercent = Math.max(0, Math.min(100, currentVolume * 100));
    const volumeStep = volumePercent / 2;
    const scalingPixels = volumeStep * (MAX_SCALING_PX / 50);
    const absoluteBarHeightPx = FLAT_BAR_HEIGHT_PX + scalingPixels;
    const waveformVariation = Math.max(0, Math.min(1, currentVolume));
    
    // 🚀 **HYBRID RENDERING**: Use fixed bar width from hybrid system, but adjust for available space
    if (absoluteBarHeightPx > 0 && availableWaveformWidth > 0) {
      ctx.save();
      
      const fadeEffectsActive = currentFadeIn > 0 || currentFadeOut > 0;
      
      // 🔧 **ADJUSTED RENDERING**: Render bars within available waveform width
      const adjustedBarWidth = availableWaveformWidth / waveformData.length;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const barTime = (i / waveformData.length) * duration;
        
        const fadeMultiplier = fadeEffectsActive ? 
          calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut) : 1.0;
        
        let effectiveBarHeight;
        if (waveformVariation === 0) {
          effectiveBarHeight = FLAT_BAR_HEIGHT_PX;
        } else {
          const flatHeight = FLAT_BAR_HEIGHT_PX;
          const dynamicHeight = absoluteBarHeightPx * value;
          effectiveBarHeight = flatHeight + (dynamicHeight - flatHeight) * waveformVariation;
        }
        
        const finalBarHeight = effectiveBarHeight * fadeMultiplier;
        // 🔧 **FIXED POSITIONING**: Start from waveformStartX instead of 0
        const x = waveformStartX + (i * adjustedBarWidth);
        
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#7c3aed' : '#cbd5e1';
        
        // 🔧 **ADJUSTED BAR WIDTH**: Use adjustedBarWidth for proper spacing
        ctx.fillRect(Math.floor(x), centerY - finalBarHeight, adjustedBarWidth, finalBarHeight * 2);
      }
      
      ctx.restore();
    }
    
    // 3. **SELECTION OVERLAY**: Adjust selection overlay to match waveform area
    if (startTime < endTime && availableWaveformWidth > 0) {
      // 🔧 **ADJUSTED SELECTION**: Map selection to available waveform area
      const startPercent = startTime / duration;
      const endPercent = endTime / duration;
      const startX = waveformStartX + (startPercent * availableWaveformWidth);
      const endX = waveformStartX + (endPercent * availableWaveformWidth);
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // 🎯 **CURSORS & LINES NOW RENDERED AS REACT COMPONENTS** - No longer drawn on canvas
    // Main cursor, hover line, and handles are now rendered in WaveformUI using React components for perfect control
  }, [canvasRef, renderData, calculateFadeMultiplier, containerWidth]);

  // 🚀 **EFFECT OPTIMIZATIONS**: Controlled re-renders
  useEffect(() => {
    if (hoverTooltip?.visible || isPlaying || isDragging) {
      requestRedraw(drawWaveform);
    }
  }, [hoverTooltip, isPlaying, isDragging, requestRedraw, drawWaveform]);
  
  useEffect(() => {
    if (renderData) {
      requestRedraw(drawWaveform);
    }
  }, [renderData, requestRedraw, drawWaveform]);

  // 🆕 **HANDLE POSITION CALCULATOR**: Calculate handle positions for React rendering
  const handlePositions = useMemo(() => {
    if (!canvasRef.current || duration === 0 || startTime >= endTime) {
      return { start: null, end: null };
    }
    
    const canvas = canvasRef.current;
    const currentWidth = containerWidth || canvas.width || 800; // 🚀 **USE CONTAINER WIDTH**: Better responsive
    const height = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Calculate available waveform area
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = currentWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = currentWidth - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 🔧 **NEW HANDLE POSITIONING LOGIC**: Handles wrap around region boundaries
    // Start handle: right edge aligns with region start
    // End handle: left edge aligns with region end
    
    const regionStartPercent = startTime / duration;
    const regionEndPercent = endTime / duration;
    const regionStartX = waveformStartX + (regionStartPercent * availableWaveformWidth);
    const regionEndX = waveformStartX + (regionEndPercent * availableWaveformWidth);
    
    // 🎯 **HANDLE WRAPPING**: Position handles to wrap around region
    const startHandleX = regionStartX - responsiveHandleWidth; // Right edge aligns with region start
    const endHandleX = regionEndX; // Left edge aligns with region end
    
    // 🚀 **DEBUG LOG**: Add console.log to show handle wrapping logic
    if (Math.random() < 0.02) { // Log occasionally to avoid spam
      console.log(`🔧 [HANDLE-WRAP-FIX] Handle wrapping positioning:`, {
        regionBounds: `${regionStartX.toFixed(1)}px - ${regionEndX.toFixed(1)}px`,
        startHandle: {
          position: `${startHandleX.toFixed(1)}px (right edge at ${(startHandleX + responsiveHandleWidth).toFixed(1)}px)`,
          alignsWithRegionStart: (startHandleX + responsiveHandleWidth).toFixed(1) === regionStartX.toFixed(1)
        },
        endHandle: {
          position: `${endHandleX.toFixed(1)}px (left edge at ${endHandleX.toFixed(1)}px)`,
          alignsWithRegionEnd: endHandleX.toFixed(1) === regionEndX.toFixed(1)
        },
        fix: 'Handles now wrap around region boundaries instead of overlapping'
      });
    }
    
    return {
      start: {
        visible: true,
        x: startHandleX,
        y: 0,
        width: responsiveHandleWidth,
        height: height,
        isActive: hoveredHandle === 'start' || isDragging === 'start',
        color: isDragging === 'start' ? '#0d9488' : '#14b8a6' // 🔧 **DRAG-ONLY COLOR**: Chỉ đổi màu khi drag, không đổi khi hover
      },
      end: {
        visible: true,
        x: endHandleX,
        y: 0,
        width: responsiveHandleWidth,
        height: height,
        isActive: hoveredHandle === 'end' || isDragging === 'end',
        color: isDragging === 'end' ? '#0d9488' : '#14b8a6' // 🔧 **DRAG-ONLY COLOR**: Chỉ đổi màu khi drag, không đổi khi hover
      }
    };
  }, [canvasRef, duration, startTime, endTime, hoveredHandle, isDragging, containerWidth]);

  // 🆕 **CURSOR POSITION CALCULATOR**: Calculate cursor positions for React rendering
  const cursorPositions = useMemo(() => {
    if (!canvasRef.current || duration === 0) {
      return { mainCursor: null, hoverLine: null };
    }
    
    const canvas = canvasRef.current;
    const currentWidth = containerWidth || canvas.width || 800; // 🚀 **USE CONTAINER WIDTH**: Better responsive
    const height = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Calculate available waveform area
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = currentWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = currentWidth - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 🔵 **MAIN CURSOR CALCULATION**: Map to waveform area
    const mainCursorPercent = currentTime >= 0 ? currentTime / duration : -1;
    const mainCursorX = mainCursorPercent >= 0 ? 
      waveformStartX + (mainCursorPercent * availableWaveformWidth) : -1;
    
    // 🖱️ **HOVER LINE CALCULATION**: Map to waveform area 
    const shouldShowHoverLine = hoverTooltip && hoverTooltip.visible && 
      isDragging !== 'start' && isDragging !== 'end';
    
    // 🔧 **ADJUSTED HOVER LINE**: Map hover position to waveform area
    let adjustedHoverLineX = -1;
    if (shouldShowHoverLine && hoverTooltip.x >= 0) {
      // Convert absolute hover position to waveform-relative position
      const hoverPercent = (hoverTooltip.x - waveformStartX) / availableWaveformWidth;
      if (hoverPercent >= 0 && hoverPercent <= 1) {
        adjustedHoverLineX = waveformStartX + (hoverPercent * availableWaveformWidth);
      }
    }
    
    return {
      mainCursor: {
        visible: currentTime >= 0 && duration > 0 && mainCursorX >= waveformStartX && mainCursorX <= waveformEndX,
        x: mainCursorX,
        y: 0,
        width: 1, // Ultra thin cursor
        height: height,
        color: isPlaying ? '#3b82f6' : '#2563eb'
      },
      hoverLine: {
        visible: shouldShowHoverLine && adjustedHoverLineX >= 0,
        x: adjustedHoverLineX,
        y: 0,
        width: 0.6, // Ultra thin hover line  
        height: height,
        color: 'rgba(156, 163, 175, 0.6)' // Gray color
      }
    };
  }, [canvasRef, duration, currentTime, isPlaying, hoverTooltip, isDragging, containerWidth]);

  return (
    <div className="relative" style={{ 
      minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px`,
      overflow: 'visible'
    }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleEnhancedMouseDown}
        onMouseMove={handleEnhancedMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={handleEnhancedMouseLeave}
        className="w-full border border-slate-200"
        style={{ 
          height: WAVEFORM_CONFIG.HEIGHT,
          touchAction: 'none',
        }}
      />

      <WaveformUI 
        hoverTooltip={hoverTooltip}
        handleTooltips={handleTooltips}
        mainCursorTooltip={mainCursorTooltip}
        handlePositions={handlePositions}
        cursorPositions={cursorPositions}
        onHandleMouseDown={handleHandleMouseDown}
        onHandleMouseMove={handleHandleMouseMove}
        onHandleMouseUp={handleHandleMouseUp}
        isPlaying={isPlaying}
        isDragging={isDragging}
      />
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;