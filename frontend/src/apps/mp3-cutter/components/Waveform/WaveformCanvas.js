// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';
import { WaveformUI } from './WaveformUI';
import { useWaveformTooltips } from '../../hooks/useWaveformTooltips';
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
  
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {

  const lastRenderDataRef = useRef(null);

  // 🆕 **SEPARATED HOOKS**: Sử dụng hooks đã tách riêng
  const {
    hoverTooltip,
    handleTooltips,
    updateHoverTime,
    clearHoverTooltip
  } = useWaveformTooltips(canvasRef, duration, startTime, endTime, isDragging);

  const {
    updateCursor,
    resetCursor
  } = useWaveformCursor(canvasRef, duration, startTime, endTime, isDragging);

  const {
    animatedVolume,
    adaptiveWaveformData,
    requestRedraw
  } = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);

  // 🚀 **OPTIMIZED MOUSE HANDLERS**: Giảm thiểu re-computation
  const handleEnhancedMouseMove = useCallback((e) => {
    if (onMouseMove) onMouseMove(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      updateCursor(mouseX);
      updateHoverTime(mouseX, canvas.width);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTime]);

  const handleEnhancedMouseLeave = useCallback((e) => {
    if (onMouseLeave) onMouseLeave(e);
    resetCursor();
    clearHoverTooltip();
  }, [onMouseLeave, resetCursor, clearHoverTooltip]);

  const handleEnhancedMouseDown = useCallback((e) => {
    if (onMouseDown) onMouseDown(e);
    clearHoverTooltip();
  }, [onMouseDown, clearHoverTooltip]);

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
    
    // 4. **HANDLES**
    if (startTime < endTime) {
      const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      const responsiveHandleWidth = width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
      
      const drawCrispHandle = (x, isLeft, isActive) => {
        const centerX = Math.round(x);
        const baseColor = isLeft ? '#14b8a6' : '#f97316';
        const activeColor = isLeft ? '#0d9488' : '#ea580c';
        const fillColor = isActive ? activeColor : baseColor;
        
        const handleX = Math.round(centerX - responsiveHandleWidth / 2);
        const handleY = 0;
        const handleWidth = responsiveHandleWidth;
        const handleHeight = height;
        
        ctx.fillStyle = fillColor;
        ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
      };
      
      const isStartActive = hoveredHandle === 'start' || isDragging === 'start';
      drawCrispHandle(startX, true, isStartActive);
      
      const isEndActive = hoveredHandle === 'end' || isDragging === 'end';
      drawCrispHandle(endX, false, isEndActive);
    }
    
    // 5. 🔵 **MAIN CURSOR**: Blue cursor với ultra-thin design
    if (duration > 0 && currentTime >= 0) {
      const cursorX = (currentTime / duration) * width;
      
      // 🔵 **CURSOR LINE**
      ctx.strokeStyle = isPlaying ? '#3b82f6' : '#2563eb';
      ctx.lineWidth = 0.5;
      
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      
      // 🔵 **CURSOR TRIANGLE**
      const triangleSize = 1;
      ctx.fillStyle = isPlaying ? '#3b82f6' : '#2563eb';
      
      ctx.beginPath();
      ctx.moveTo(cursorX - triangleSize, 0);
      ctx.lineTo(cursorX + triangleSize, 0);
      ctx.lineTo(cursorX, triangleSize * 1.5);
      ctx.closePath();
      ctx.fill();
    }

    // 6. **HOVER LINE**
    if (hoverTooltip && hoverTooltip.visible && duration > 0) {
      const hoverX = hoverTooltip.x;
      
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 0.5;
      
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
    }
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
          touchAction: 'none',
          overflow: 'hidden',
        }}
      />

      <WaveformUI 
        hoverTooltip={hoverTooltip}
        handleTooltips={handleTooltips}
      />
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;