// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';
import { WaveformUI } from './WaveformUI';
import { useOptimizedTooltip } from '../../hooks/useOptimizedTooltip';
import { useWaveformCursor } from '../../hooks/useWaveformCursor';
import { useWaveformRender } from '../../hooks/useWaveformRender';

const WaveformCanvas = React.memo(({
  canvasRef,
  waveformData = [],
  currentTime = 0,
  duration = 0,
  startTime = 0,
  endTime = 0,
  hoveredHandle = null,
  isDragging = false,
  isPlaying = false,
  volume = 1,
  isGenerating = false,
  enhancedFeatures = {},
  
  // 🆕 **FADE EFFECTS**: Visual fade in/out effects trên waveform
  fadeIn = 0,   // Fade in duration - bars sẽ hiển thị thấp → cao dần trong khoảng này
  fadeOut = 0,  // Fade out duration - bars sẽ hiển thị cao → thấp dần trong khoảng này
  
  // 🆕 **INVERT SELECTION**: Visual invert selection mode
  isInverted = false, // Invert selection mode - đảo ngược vùng active/inactive
  
  // 🚀 **REALTIME AUDIO ACCESS**: Direct audio element access cho ultra-smooth tooltips
  audioRef,
  
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {

  // 🚀 **BACKGROUND CANVAS CACHE**: Separate canvas for static gray background
  const backgroundCacheRef = useRef(null);
  const lastCacheKey = useRef(null);
  
  // 🚀 **PURPLE WAVEFORM CACHE**: Separate cache for purple waveform bars
  const purpleWaveformCacheRef = useRef(null);
  const lastPurpleCacheKey = useRef(null);

  // 🚀 **OPTIMIZED TOOLTIP HOOK** - Bao gồm main cursor tooltip
  const {
    hoverTooltip,
    handleTooltips: handleTooltipsData,
    mainCursorTooltip,
    updateHoverTooltip,
    clearHoverTooltip
  } = useOptimizedTooltip(canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging, isInverted);

  // 🆕 **HANDLE TOOLTIPS FUNCTION**: Function to handle tooltip updates based on mouse position
  const handleTooltips = useCallback((mouseX) => {
    // This function can be used to trigger tooltip updates based on mouse position
    // For now, it's a placeholder since tooltips are handled by the hook
    updateHoverTooltip({ clientX: mouseX + (canvasRef.current?.getBoundingClientRect().left || 0) });
  }, [updateHoverTooltip, canvasRef]);

  const {
    updateCursor
    // Removed resetCursor since we don't use it with pointer capture
  } = useWaveformCursor(canvasRef, duration, startTime, endTime, isDragging);

  // 🚀 **OPTIMIZED HOOK**: Responsive waveform rendering with hybrid system
  const {
    animatedVolume,
    hybridWaveformData,
    requestRedraw,
    containerWidth
  } = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);

  // 🚀 **ENHANCED MOUSE HANDLERS** - Updated to use Pointer Events for better drag tracking
  const handleEnhancedPointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // 🎯 **POINTER CAPTURE**: Capture pointer để track movement ngay cả khi ra ngoài canvas
      canvas.setPointerCapture(e.pointerId);
      
      updateCursor(mouseX);
      clearHoverTooltip();
    }
    
    if (onMouseDown) onMouseDown(e);
  }, [onMouseDown, canvasRef, updateCursor, clearHoverTooltip]);

  const handleEnhancedPointerMove = useCallback((e) => {
    if (onMouseMove) onMouseMove(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      updateCursor(mouseX);
      
      // 🎯 **TOOLTIP UPDATES**: Update tooltips based on mouse position
      handleTooltips(mouseX);
    }
  }, [onMouseMove, canvasRef, updateCursor, handleTooltips]);

  const handleEnhancedPointerUp = useCallback((e) => {
    if (onMouseUp) onMouseUp(e);
    
    const canvas = canvasRef.current;
    if (canvas) {
      // 🎯 **RELEASE POINTER CAPTURE**: Release pointer capture
      canvas.releasePointerCapture(e.pointerId);
    }
  }, [onMouseUp, canvasRef]);

  const handleEnhancedPointerLeave = useCallback((e) => {
    if (onMouseLeave) onMouseLeave(e);
    
    // 🚀 **ALWAYS HIDE HOVER LINE**: Hide hover cursor line when leaving waveform
    clearHoverTooltip();
  }, [onMouseLeave, clearHoverTooltip]);

  // 🆕 **HANDLE EVENT HANDLERS**: Direct handlers cho handles - Updated for Pointer Events
  const handleHandlePointerDown = useCallback((e) => {
    // 🔧 **CLEAR HOVER TOOLTIP**: Ẩn hover tooltip khi bắt đầu drag handle
    clearHoverTooltip();
    
    // 🎯 **POINTER CAPTURE ON CANVAS**: Capture pointer trên canvas thay vì handle element
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }
    
    // 🔧 **DIRECT CANVAS EVENT**: Optimized direct forwarding
    if (canvas && onMouseDown) {
      const rect = canvas.getBoundingClientRect();
      const canvasEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        canvasX: e.clientX - rect.left,
        canvasY: e.clientY - rect.top,
        pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
      };
      
      onMouseDown(canvasEvent);
    }
  }, [canvasRef, onMouseDown, clearHoverTooltip]);

  const handleHandlePointerMove = useCallback((e) => {
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
        canvasY: e.clientY - rect.top,
        pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
      };
      
      onMouseMove(canvasEvent);
      updateCursor(canvasEvent.canvasX, { isHandleEvent: true, handleType: e.handleType });
    }
  }, [canvasRef, onMouseMove, updateCursor]);

  const handleHandlePointerUp = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas && onMouseUp) {
      // 🎯 **RELEASE POINTER CAPTURE**: Release pointer capture
      canvas.releasePointerCapture(e.pointerId);
      
      const canvasEvent = {
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
      };
      
      onMouseUp(canvasEvent);
    }
  }, [canvasRef, onMouseUp]);

  // 🎯 **RENDER DATA MEMOIZATION**: Prevent unnecessary recalculations  
  const renderData = useMemo(() => {
    if (!hybridWaveformData?.data?.length || duration <= 0) {
      return null;
    }
    
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
      isInverted, // 🆕 **INVERT MODE**: Track invert selection state
      containerWidth
    };
  }, [hybridWaveformData, duration, startTime, endTime, animatedVolume, fadeIn, fadeOut, isInverted, containerWidth]);

  // 🔧 **HEIGHT CONSISTENCY CHECK**: Ensure consistent height during transitions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.height !== WAVEFORM_CONFIG.HEIGHT) {
      canvas.height = WAVEFORM_CONFIG.HEIGHT;
    }
  }, [canvasRef, renderData]);  // Trigger when render data changes

  // 🚀 **BACKGROUND CACHE CREATOR**: Create cached background for ultra-fast re-renders
  const createBackgroundCache = useCallback(async (waveformData, width, height, containerWidth) => {
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Calculate available waveform area
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = width - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 🎯 **CREATE BACKGROUND CANVAS**: Temporary canvas for background rendering
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
    
    // 🚀 **PERFORMANCE SETUP**: GPU acceleration
    bgCtx.imageSmoothingEnabled = false;
    
    // 1. **BACKGROUND GRADIENT**: Match main canvas
    const gradient = bgCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(waveformStartX, 0, availableWaveformWidth, height);    
    // 🔧 **BORDER**: Match main canvas
    bgCtx.strokeStyle = '#e2e8f0'; // Border màu xám nhạt hơn từ #cbd5e1 thành #e2e8f0
    bgCtx.lineWidth = 1;
    bgCtx.strokeRect(waveformStartX, 0, availableWaveformWidth, height);
    // 2. **GRAY WAVEFORM BARS ONLY**: Render all bars in gray (background)
    const centerY = height / 2;
    const FLAT_BAR_HEIGHT_PX = 1;
    const MAX_SCALING_PX = 65;
    const adjustedBarWidth = availableWaveformWidth / waveformData.length;
    
    bgCtx.fillStyle = '#e2e8f0'; // 🔧 **STATIC GRAY**: All background bars are gray (nhạt hơn từ #cbd5e1 thành #e2e8f0)
    
    for (let i = 0; i < waveformData.length; i++) {
      const value = waveformData[i];
      const effectiveBarHeight = FLAT_BAR_HEIGHT_PX + (MAX_SCALING_PX * value);
      const x = waveformStartX + (i * adjustedBarWidth);
      
      bgCtx.fillRect(Math.floor(x), centerY - effectiveBarHeight, adjustedBarWidth, effectiveBarHeight * 2);
    }
    
    // 🚀 **CREATE IMAGEBITMAP**: Convert to ImageBitmap for ultra-fast drawImage
    return createImageBitmap(bgCanvas);
  }, []);

  // 🚀 **PURPLE WAVEFORM CACHE CREATOR**: Create cached purple waveform for ultra-fast region rendering
  const createPurpleWaveformCache = useCallback(async (waveformData, width, height, containerWidth, volume, fadeIn, fadeOut, startTime, endTime, duration) => {
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Calculate available waveform area
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = width - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 🎯 **CREATE PURPLE CANVAS**: Temporary canvas for purple waveform rendering
    const purpleCanvas = document.createElement('canvas');
    purpleCanvas.width = width;
    purpleCanvas.height = height;
    const purpleCtx = purpleCanvas.getContext('2d', { willReadFrequently: true });
    
    // 🚀 **PERFORMANCE SETUP**: GPU acceleration
    purpleCtx.imageSmoothingEnabled = false;
    
    // 🎨 **PURPLE WAVEFORM BARS**: Render all bars in purple (full length)
    const centerY = height / 2;
    const FLAT_BAR_HEIGHT_PX = 1;
    const MAX_SCALING_PX = 65;
    
    const volumePercent = Math.max(0, Math.min(100, volume * 100));
    const volumeStep = volumePercent / 2;
    const scalingPixels = volumeStep * (MAX_SCALING_PX / 50);
    const absoluteBarHeightPx = FLAT_BAR_HEIGHT_PX + scalingPixels;
    const waveformVariation = Math.max(0, Math.min(1, volume));
    const adjustedBarWidth = availableWaveformWidth / waveformData.length;
    
    purpleCtx.fillStyle = '#7c3aed'; // 🔧 **STATIC PURPLE**: All purple bars
      // 🎯 **FADE CALCULATION HELPER**: Calculate fade multiplier for each bar position
    const calculateFadeMultiplier = (barIndex, totalBars) => {
      if (!fadeIn && !fadeOut) return 1;
      
      const barTimePosition = (barIndex / totalBars) * duration;
      
      // 🆕 **INVERT MODE**: Different fade logic for inverted selection
      if (isInverted) {
        let fadeMultiplier = 1;
        
        // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to startTime)
        if (fadeIn > 0 && barTimePosition < startTime) {
          const activeRegionDuration = startTime; // From 0 to startTime
          const fadeInDuration = Math.min(fadeIn, activeRegionDuration);
          
          if (barTimePosition <= fadeInDuration) {
            const fadeProgress = barTimePosition / fadeInDuration;
            fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
          }
        }
        
        // 🔥 **FADE OUT - SECOND ACTIVE REGION** (endTime to duration)
        if (fadeOut > 0 && barTimePosition >= endTime) {
          const activeRegionDuration = duration - endTime; // From endTime to duration
          const fadeOutDuration = Math.min(fadeOut, activeRegionDuration);
          const fadeOutStart = duration - fadeOutDuration; // Fade at the END of this region
          
          if (barTimePosition >= fadeOutStart) {
            const fadeProgress = (duration - barTimePosition) / fadeOutDuration;
            fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
          }
        }
        
        return fadeMultiplier;
      } else {
        // 🎯 **NORMAL MODE**: Original logic for selection region
        const relativePosition = (barTimePosition - startTime) / (endTime - startTime);
        let fadeMultiplier = 1;
        
        // 🎵 **FADE IN EFFECT**: Gradual increase from start
        if (fadeIn > 0 && relativePosition < (fadeIn / (endTime - startTime))) {
          const fadeProgress = relativePosition / (fadeIn / (endTime - startTime));
          fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
        }
        
        // 🎵 **FADE OUT EFFECT**: Gradual decrease to end
        if (fadeOut > 0 && relativePosition > (1 - fadeOut / (endTime - startTime))) {
          const fadeProgress = (1 - relativePosition) / (fadeOut / (endTime - startTime));
          fadeMultiplier *= Math.max(0.05, Math.min(1, fadeProgress));
        }
        
        return fadeMultiplier;
      }
    };
    
    for (let i = 0; i < waveformData.length; i++) {
      const value = waveformData[i];
      
      let effectiveBarHeight;
      if (waveformVariation === 0) {
        // 🎯 **VOLUME 0%**: Show flat bars at minimum height
        effectiveBarHeight = FLAT_BAR_HEIGHT_PX;
      } else {
        const flatHeight = FLAT_BAR_HEIGHT_PX;
        const dynamicHeight = absoluteBarHeightPx * value;
        effectiveBarHeight = flatHeight + (dynamicHeight - flatHeight) * waveformVariation;
      }
        // 🎵 **APPLY FADE EFFECTS**: Modify bar height based on fade position
      if (fadeIn > 0 || fadeOut > 0) {
        const fadeMultiplier = calculateFadeMultiplier(i, waveformData.length);
        effectiveBarHeight = FLAT_BAR_HEIGHT_PX + (effectiveBarHeight - FLAT_BAR_HEIGHT_PX) * fadeMultiplier;
        
        // 🔍 **DEBUG FADE**: Log fade calculations for first few bars when fade is active  
        if (i < 5 && (fadeIn > 0 || fadeOut > 0)) {
          const barTimePosition = (i / waveformData.length) * duration;
          console.log(`[WaveformCanvas] Fade Debug - Bar ${i}: time=${barTimePosition.toFixed(2)}s, fadeMultiplier=${fadeMultiplier.toFixed(3)}, isInverted=${isInverted}, fadeIn=${fadeIn}s, fadeOut=${fadeOut}s, startTime=${startTime}s, endTime=${endTime}s`);
        }
      }
      
      const x = waveformStartX + (i * adjustedBarWidth);
      purpleCtx.fillRect(Math.floor(x), centerY - effectiveBarHeight, adjustedBarWidth, effectiveBarHeight * 2);
    }
      // 🚀 **CREATE IMAGEBITMAP**: Convert to ImageBitmap for ultra-fast drawImage
    return createImageBitmap(purpleCanvas);
  }, [isInverted]);

  // 🎯 **CACHE KEY GENERATOR**: Detect when background needs re-caching
  const generateCacheKey = useCallback((renderData, containerWidth) => {
    if (!renderData?.waveformData) return null;
    
    return `${renderData.waveformData.length}-${renderData.containerWidth || containerWidth}-${renderData.mode || 'default'}`;
  }, []);
  // 🚀 **PURPLE CACHE KEY GENERATOR**: Detect when purple cache needs re-caching
  const generatePurpleCacheKey = useCallback((renderData, containerWidth) => {
    if (!renderData?.waveformData) return null;
    
    const volumeValue = renderData.volume !== undefined ? renderData.volume : 1;
    const fadeInValue = renderData.fadeIn || 0;
    const fadeOutValue = renderData.fadeOut || 0;
    const startTimeValue = renderData.startTime || 0;
    const endTimeValue = renderData.endTime || 0;
    const isInvertedValue = renderData.isInverted || false;
    
    return `purple-${renderData.waveformData.length}-${renderData.containerWidth || containerWidth}-${renderData.mode || 'default'}-${Math.round(volumeValue * 100)}-${Math.round(fadeInValue * 10)}-${Math.round(fadeOutValue * 10)}-${Math.round(startTimeValue * 10)}-${Math.round(endTimeValue * 10)}-${isInvertedValue}`;
  }, []);

  // 🚀 **OPTIMIZED DRAW FUNCTION**: Ultra-fast rendering with cached background  
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) {
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    
    // 🚀 **PERFORMANCE SETUP**: GPU acceleration
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    
    const { 
      duration, 
      startTime, 
      endTime, 
      volume: currentVolume, 
      isInverted
    } = renderData;
    
    // 1. **DRAW CACHED BACKGROUND**: Ultra-fast single drawImage call with volume opacity sync
    if (backgroundCacheRef.current) {
      // 🆕 **BACKGROUND OPACITY SYNC**: Sync background opacity with volume (minimum 30% for visibility)
      ctx.globalAlpha = Math.max(0.30, currentVolume);
      ctx.drawImage(backgroundCacheRef.current, 0, 0);
      ctx.globalAlpha = 1.0; // Reset alpha for subsequent drawings
    }
    
    // 2. **DRAW ACTIVE SELECTION ONLY**: Only render purple bars for selection
    if (startTime < endTime && duration > 0 && purpleWaveformCacheRef.current) {
      const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
      const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
      
      const leftHandleWidth = responsiveHandleWidth;
      const rightHandleWidth = responsiveHandleWidth;
      const waveformStartX = leftHandleWidth;
      const waveformEndX = width - rightHandleWidth;
      const availableWaveformWidth = waveformEndX - waveformStartX;
      
      if (availableWaveformWidth > 0) {
        ctx.save();
        
        if (isInverted) {
          // 🆕 **INVERT MODE**: Clip and draw regions OUTSIDE selection (before + after)
          
          // Draw before selection region (0 to startTime)
          if (startTime > 0) {
            const startPercent = 0;
            const endPercent = startTime / duration;
            const clipStartX = waveformStartX + (startPercent * availableWaveformWidth);
            const clipWidth = (endPercent * availableWaveformWidth);
            
            ctx.beginPath();
            ctx.rect(clipStartX, 0, clipWidth, height);
            ctx.clip();
            ctx.drawImage(purpleWaveformCacheRef.current, 0, 0);
            ctx.restore();
            ctx.save();
          }
          
          // Draw after selection region (endTime to duration)
          if (endTime < duration) {
            const startPercent = endTime / duration;
            const endPercent = 1;
            const clipStartX = waveformStartX + (startPercent * availableWaveformWidth);
            const clipWidth = ((endPercent - startPercent) * availableWaveformWidth);
            
            ctx.beginPath();
            ctx.rect(clipStartX, 0, clipWidth, height);
            ctx.clip();
            ctx.drawImage(purpleWaveformCacheRef.current, 0, 0);
          }
        } else {
          // 🎯 **NORMAL MODE**: Clip and draw region INSIDE selection only
          const startPercent = startTime / duration;
          const endPercent = endTime / duration;
          const clipStartX = waveformStartX + (startPercent * availableWaveformWidth);
          const clipWidth = ((endPercent - startPercent) * availableWaveformWidth);
          
          ctx.beginPath();
          ctx.rect(clipStartX, 0, clipWidth, height);
          ctx.clip();
          ctx.drawImage(purpleWaveformCacheRef.current, 0, 0);
        }
        
        ctx.restore();
      }
      
      // 3. **SELECTION OVERLAY**: Add selection overlay
      const startPercent = startTime / duration;
      const endPercent = endTime / duration;
      const startX = waveformStartX + (startPercent * availableWaveformWidth);
      const endX = waveformStartX + (endPercent * availableWaveformWidth);
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // 4. **CURRENT TIME CURSOR**: Draw playback cursor
    if (renderData.currentTime >= 0 && duration > 0) {
      const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
      const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
      
      const leftHandleWidth = responsiveHandleWidth;
      const rightHandleWidth = responsiveHandleWidth;
      const waveformStartX = leftHandleWidth;
      const waveformEndX = width - rightHandleWidth;
      const availableWaveformWidth = waveformEndX - waveformStartX;
      
      if (availableWaveformWidth > 0) {
        const cursorPercent = renderData.currentTime / duration;
        const cursorX = waveformStartX + (cursorPercent * availableWaveformWidth);
        
        // Draw cursor line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, height);
        ctx.stroke();
      }
    }
  }, [canvasRef, renderData, containerWidth]);

  // 🚀 **BACKGROUND CACHE MANAGEMENT**: Update cache when needed
  useEffect(() => {
    const updateCache = async () => {
      if (!renderData?.waveformData || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const currentCacheKey = generateCacheKey(renderData, containerWidth);
      const currentPurpleCacheKey = generatePurpleCacheKey(renderData, containerWidth);
      let needsRedraw = false;
      
      // 🎯 **BACKGROUND CACHE UPDATE**
      if (currentCacheKey && currentCacheKey !== lastCacheKey.current) {
        try {
          if (backgroundCacheRef.current) {
            backgroundCacheRef.current.close?.();
          }
          backgroundCacheRef.current = await createBackgroundCache(
            renderData.waveformData, 
            canvas.width, 
            canvas.height, 
            containerWidth
          );
          lastCacheKey.current = currentCacheKey;
          needsRedraw = true;
        } catch (error) {
          backgroundCacheRef.current = null;
        }
      }
      
      // 🚀 **PURPLE CACHE UPDATE**
      if (currentPurpleCacheKey && currentPurpleCacheKey !== lastPurpleCacheKey.current) {
        try {
          if (purpleWaveformCacheRef.current) {
            purpleWaveformCacheRef.current.close?.();
          }
          
          purpleWaveformCacheRef.current = await createPurpleWaveformCache(
            renderData.waveformData, 
            canvas.width, 
            canvas.height, 
            containerWidth,
            renderData.volume !== undefined ? renderData.volume : 1,
            renderData.fadeIn,
            renderData.fadeOut,
            renderData.startTime,
            renderData.endTime,
            renderData.duration
          );
          lastPurpleCacheKey.current = currentPurpleCacheKey;
          needsRedraw = true;
        } catch (error) {
          purpleWaveformCacheRef.current = null;
        }
      }
      
      // 🔄 **TRIGGER REDRAW**: Only after cache updates
      if (needsRedraw) {
        requestRedraw(drawWaveform);
      }
    };
    
    updateCache();
  }, [renderData, containerWidth, generateCacheKey, generatePurpleCacheKey, createBackgroundCache, createPurpleWaveformCache, requestRedraw, drawWaveform, canvasRef]);

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
    
    // 🎯 **HANDLE WRAPPING**: Position handles to wrap around region with invert mode logic
    let startHandleX, endHandleX;
    
    if (isInverted) {
      // 🆕 **INVERT MODE POSITIONING**: Flip handle positions so non-radius edges align with points
      startHandleX = regionStartX; // Left edge (no radius) aligns with region start
      endHandleX = regionEndX - responsiveHandleWidth; // Right edge (no radius) aligns with region end
    } else {
      // 🎯 **NORMAL MODE POSITIONING**: Standard positioning
      startHandleX = regionStartX - responsiveHandleWidth; // Right edge aligns with region start
      endHandleX = regionEndX; // Left edge aligns with region end
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
  }, [canvasRef, duration, startTime, endTime, hoveredHandle, isDragging, containerWidth, isInverted]);

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
    
    // 🔧 **UNCLAMPED HOVER LINE**: Use cursorX (original mouse position) for cursor line
    let hoverLineX = -1;
    if (shouldShowHoverLine && hoverTooltip.cursorX !== undefined) {
      // 🎯 **DIRECT CURSOR POSITION**: Use unclamped cursor position for hover line
      hoverLineX = hoverTooltip.cursorX;
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
        visible: shouldShowHoverLine && hoverLineX >= 0,
        x: hoverLineX,
        y: 0,
        width: 0.6, // Ultra thin hover line  
        height: height,
        color: 'rgba(156, 163, 175, 0.6)' // Gray color
      }
    };
  }, [canvasRef, duration, currentTime, isPlaying, hoverTooltip, isDragging, containerWidth]);

  // 🚀 **CLEANUP**: Clean up ImageBitmap on unmount
  useEffect(() => {
    return () => {
      if (backgroundCacheRef.current) {
        backgroundCacheRef.current.close?.();
        backgroundCacheRef.current = null;
      }
      if (purpleWaveformCacheRef.current) {
        purpleWaveformCacheRef.current.close?.();
        purpleWaveformCacheRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative" style={{ 
      minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px`,
      overflow: 'visible'
    }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handleEnhancedPointerDown}
        onPointerMove={handleEnhancedPointerMove}
        onPointerUp={handleEnhancedPointerUp}
        onPointerLeave={handleEnhancedPointerLeave}
        className="w-full"
        style={{ 
          height: WAVEFORM_CONFIG.HEIGHT,
          touchAction: 'none', // 🚀 **IMPORTANT**: Prevent default touch actions for better pointer control
          zIndex: 1 // Base layer - below everything else
        }}
      />

      <WaveformUI 
        hoverTooltip={hoverTooltip}
        handleTooltips={handleTooltipsData}
        mainCursorTooltip={mainCursorTooltip}
        handlePositions={handlePositions}
        cursorPositions={cursorPositions}
        onHandleMouseDown={handleHandlePointerDown}
        onHandleMouseMove={handleHandlePointerMove}
        onHandleMouseUp={handleHandlePointerUp}
        isPlaying={isPlaying}
        isDragging={isDragging}
        isInverted={isInverted}
      />
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;