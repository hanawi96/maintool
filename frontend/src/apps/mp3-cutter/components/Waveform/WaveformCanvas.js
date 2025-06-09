// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo } from 'react';
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

  const lastRenderDataRef = useRef(null);

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

  const {
    animatedVolume,
    adaptiveWaveformData,
    requestRedraw
  } = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);

  // 🚀 **ENHANCED MOUSE HANDLERS**
  const handleEnhancedMouseMove = useCallback((e) => {
    if (onMouseMove) onMouseMove(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // 🎯 **STANDARD UPDATES**: Cursor và hover
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
    
    // 🔧 **CLEAR HOVER TOOLTIP**: Ẩn hover tooltip khi nhấn giữ/drag theo yêu cầu user
    clearHoverTooltip();
    
    // 🔧 **DEBUG MOUSE DOWN**: Log mouse down events
    if (Math.random() < 0.1) { // 10% sampling để track mouse down
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        console.log('🖱️ [MOUSE-DOWN] Enhanced mouse down - hover tooltip cleared:', {
          mouseX: `${mouseX.toFixed(1)}px`,
          note: 'Hover tooltip bị ẩn khi nhấn giữ/drag - theo yêu cầu user'
        });
      }
    }
  }, [onMouseDown, canvasRef, clearHoverTooltip]);

  // 🆕 **HANDLE EVENT HANDLERS**: Direct handlers cho handles
  const handleHandleMouseDown = useCallback((e) => {
    console.log('🤚 [HANDLE-MOUSE-DOWN] Direct handle mouse down:', {
      handleType: e.handleType,
      clientX: e.clientX,
      clientY: e.clientY,
      isHandleEvent: e.isHandleEvent
    });
    
    // 🔧 **CLEAR HOVER TOOLTIP**: Ẩn hover tooltip khi bắt đầu drag handle
    clearHoverTooltip();
    
    // 🔧 **CONVERT TO CANVAS COORDINATES**: Chuyển đổi handle mouse position thành canvas coordinates
    const canvas = canvasRef.current;
    if (canvas && onMouseDown) {
      const rect = canvas.getBoundingClientRect();
      
      // 🔧 **CALCULATE CANVAS POSITION**: Tính toán vị trí trong canvas
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      // 🔧 **CREATE CANVAS EVENT**: Tạo event tương tự canvas event
      const canvasEvent = {
        ...e,
        clientX: e.clientX, // Giữ nguyên global position
        clientY: e.clientY,
        target: canvas, // Set target là canvas
        currentTarget: canvas,
        handleType: e.handleType, // Preserve handle type info
        isHandleEvent: e.isHandleEvent,
        canvasX: canvasX, // 🆕 **CANVAS COORDINATES**: Thêm canvas coordinates
        canvasY: canvasY
      };
      
      console.log('🔄 [HANDLE-TO-CANVAS] Converting handle event to canvas event:', {
        handleType: e.handleType,
        globalPos: `${e.clientX}, ${e.clientY}`,
        canvasPos: `${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}`,
        conversion: 'success'
      });
      
      // 🔧 **FORWARD TO CANVAS HANDLER**: Gọi canvas mouse down handler
      onMouseDown(canvasEvent);
    }
  }, [canvasRef, onMouseDown, clearHoverTooltip]);

  const handleHandleMouseMove = useCallback((e) => {
    // 🔧 **HANDLE MOUSE MOVE**: Xử lý mouse move trên handle
    const canvas = canvasRef.current;
    if (canvas && onMouseMove) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      // 🆕 **CREATE EVENT INFO**: Create eventInfo for cursor update
      const eventInfo = {
        isHandleEvent: e.isHandleEvent,
        handleType: e.handleType,
        originalEvent: e.originalEvent || e
      };
      
      const canvasEvent = {
        ...e,
        clientX: e.clientX,
        clientY: e.clientY,
        target: canvas,
        currentTarget: canvas,
        handleType: e.handleType,
        isHandleEvent: e.isHandleEvent,
        canvasX: canvasX,
        canvasY: canvasY
      };
      
      // 🔧 **FORWARD TO CANVAS HANDLER**: Gọi canvas mouse move handler
      onMouseMove(canvasEvent);
      
      // 🔧 **UPDATE CURSOR WITH EVENT INFO**: Cập nhật cursor với eventInfo
      updateCursor(canvasX, eventInfo);
    }
  }, [canvasRef, onMouseMove, updateCursor]);

  const handleHandleMouseUp = useCallback((e) => {
    console.log('🤚 [HANDLE-MOUSE-UP] Direct handle mouse up:', {
      handleType: e.handleType,
      isHandleEvent: e.isHandleEvent
    });
    
    // 🔧 **HANDLE MOUSE UP**: Xử lý mouse up trên handle
    const canvas = canvasRef.current;
    if (canvas && onMouseUp) {
      const canvasEvent = {
        ...e,
        target: canvas,
        currentTarget: canvas,
        handleType: e.handleType,
        isHandleEvent: e.isHandleEvent
      };
      
      // 🔧 **FORWARD TO CANVAS HANDLER**: Gọi canvas mouse up handler
      onMouseUp(canvasEvent);
    }
  }, [canvasRef, onMouseUp]);

  // 🔥 **STABLE RENDER DATA**: Optimized memoization
  const renderData = useMemo(() => {    
    if (!adaptiveWaveformData.length || duration === 0) return null;
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    
    // 🎯 **ROUND VALUES**: Prevent floating point precision issues
    const stableStartTime = Math.round(startTime * 100) / 100;
    const stableEndTime = Math.round(endTime * 100) / 100;
    const stableDuration = Math.round(duration * 100) / 100;
    const stableVolume = Math.round(animatedVolume * 1000) / 1000;
    const stableFadeIn = Math.round(fadeIn * 100) / 100;
    const stableFadeOut = Math.round(fadeOut * 100) / 100;
    
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

  // 🎯 **OPTIMIZED DRAW FUNCTION**: Ultra-fast rendering
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🔥 **DEBUG CANVAS DIMENSIONS**: Log canvas info
    if (Math.random() < 0.05) { // 5% sampling
      console.log('🖼️ [CANVAS-DEBUG] Canvas dimensions:', {
        canvasWidth: width,
        canvasHeight: height,
        canvasStyle: {
          width: canvas.style.width,
          height: canvas.style.height,
          overflow: canvas.style.overflow || 'default',
          position: canvas.style.position || 'default'
        },
        boundingRect: canvas.getBoundingClientRect(),
        note: 'Checking if handles are being clipped by canvas bounds'
      });
    }
    
    // 🚀 **PERFORMANCE SETUP**: GPU acceleration
    ctx.imageSmoothingEnabled = false;
    canvas.style.willChange = 'transform';
    
    // 🎯 **CLEAR CANVAS**
    ctx.clearRect(0, 0, width, height);
    
    // 1. **BACKGROUND GRADIENT**
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. **WAVEFORM BARS**: Ultra-optimized rendering
    const { waveformData, duration, startTime, endTime, volume: currentVolume, fadeIn: currentFadeIn, fadeOut: currentFadeOut } = renderData;
    const centerY = height / 2;
    
    // 🎯 **BAR CALCULATIONS**
    const rawBarWidth = width / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    const barWidth = Math.max(minBarWidth, rawBarWidth);
    const useOptimizedSpacing = rawBarWidth < minBarWidth;
    
    // 🎯 **VOLUME SYSTEM**: Perfect linear scaling
    const FLAT_BAR_HEIGHT_PX = 1;
    const MAX_SCALING_PX = 65;
    const volumePercent = Math.max(0, Math.min(100, currentVolume * 100));
    const volumeStep = volumePercent / 2;
    const scalingPixels = volumeStep * (MAX_SCALING_PX / 50);
    const absoluteBarHeightPx = FLAT_BAR_HEIGHT_PX + scalingPixels;
    const waveformVariation = Math.max(0, Math.min(1, currentVolume));
    
    // 🎯 **RENDER BARS**
    if (absoluteBarHeightPx > 0) {
      ctx.save();
      
      const fadeEffectsActive = currentFadeIn > 0 || currentFadeOut > 0;
      
      if (useOptimizedSpacing) {
        const spacing = width / waveformData.length;
        
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
          const x = i * spacing;
          
          const isInSelection = barTime >= startTime && barTime <= endTime;
          ctx.fillStyle = isInSelection ? '#7c3aed' : '#cbd5e1';
          
          const ultraThinWidth = Math.max(0.5, minBarWidth * 0.7);
          ctx.fillRect(Math.floor(x), centerY - finalBarHeight, ultraThinWidth, finalBarHeight * 2);
        }
      } else {
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
          const x = i * barWidth;
          
          const isInSelection = barTime >= startTime && barTime <= endTime;
          ctx.fillStyle = isInSelection ? '#7c3aed' : '#cbd5e1';
          
          const refinedWidth = Math.max(0.4, barWidth * 0.6);
          const spacingGap = barWidth * 0.4;
          ctx.fillRect(Math.floor(x + spacingGap/2), centerY - finalBarHeight, refinedWidth, finalBarHeight * 2);
        }
      }
      
      ctx.restore();
    }
    
    // 3. **SELECTION OVERLAY**
    if (startTime < endTime) {
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // 🎯 **CURSORS & LINES NOW RENDERED AS REACT COMPONENTS** - No longer drawn on canvas
    // Main cursor, hover line, and handles are now rendered in WaveformUI using React components for perfect control
  }, [canvasRef, renderData, currentTime, isPlaying, hoverTooltip, calculateFadeMultiplier]);

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
    const width = canvas.width || 800;
    const height = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    
    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;
    
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    return {
      start: {
        visible: true,
        x: startX,
        y: 0,
        width: responsiveHandleWidth,
        height: height,
        isActive: hoveredHandle === 'start' || isDragging === 'start',
        color: hoveredHandle === 'start' || isDragging === 'start' ? '#0d9488' : '#14b8a6'
      },
      end: {
        visible: true,
        x: endX + responsiveHandleWidth,
        y: 0, 
        width: responsiveHandleWidth,
        height: height,
        isActive: hoveredHandle === 'end' || isDragging === 'end',
        color: hoveredHandle === 'end' || isDragging === 'end' ? '#ea580c' : '#f97316'
      }
    };
  }, [canvasRef, duration, startTime, endTime, hoveredHandle, isDragging]);

  // 🆕 **CURSOR POSITION CALCULATOR**: Calculate cursor positions for React rendering
  const cursorPositions = useMemo(() => {
    if (!canvasRef.current || duration === 0) {
      return { mainCursor: null, hoverLine: null };
    }
    
    const canvas = canvasRef.current;
    const width = canvas.width || 800;
    const height = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    
    // 🔵 **MAIN CURSOR CALCULATION**
    const mainCursorX = currentTime >= 0 ? (currentTime / duration) * width : -1;
    
    // 🖱️ **HOVER LINE CALCULATION** 
    const shouldShowHoverLine = hoverTooltip && hoverTooltip.visible && 
      isDragging !== 'start' && isDragging !== 'end';
    const hoverLineX = shouldShowHoverLine ? hoverTooltip.x : -1;
    
    return {
      mainCursor: {
        visible: currentTime >= 0 && duration > 0,
        x: mainCursorX,
        y: 0,
        width: 1, // Ultra thin cursor
        height: height,
        color: isPlaying ? '#3b82f6' : '#2563eb',
        showTriangle: true,
        triangleSize: 1
      },
      hoverLine: {
        visible: shouldShowHoverLine && hoverLineX >= 0,
        x: hoverLineX,
        y: 0,
        width: 0.6, // Ultra thin hover line  
        height: height,
        color: 'rgba(156, 163, 175, 0.6)' // Gray color
      }
    };
  }, [canvasRef, duration, currentTime, isPlaying, hoverTooltip, isDragging]);

  return (
    <div className="relative" style={{ minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px` }}>
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
      />
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;