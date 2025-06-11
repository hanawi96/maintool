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
  
  // 🆕 **INVERT SELECTION**: Visual invert selection mode
  isInverted = false, // Invert selection mode - đảo ngược vùng active/inactive
  
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
    mainCursorTooltip,
    updateHoverTooltip,
    clearHoverTooltip
  } = useOptimizedTooltip(canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging, isInverted);

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
    if (onMouseDown) onMouseDown(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      // 🎯 **POINTER CAPTURE**: Capture pointer để track movement ngay cả khi ra ngoài canvas
      canvas.setPointerCapture(e.pointerId);
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      updateCursor(mouseX);
      clearHoverTooltip();
    }
  }, [onMouseDown, canvasRef, updateCursor, clearHoverTooltip]);

  const handleEnhancedPointerMove = useCallback((e) => {
    if (onMouseMove) onMouseMove(e);
  
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      updateCursor(mouseX);
      updateHoverTooltip(e);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTooltip]);

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
    
    // 🆕 **INVERT MODE INSTANT HIDE**: When in invert mode, immediately hide hover cursor line
    if (isInverted) {
      clearHoverTooltip();
      console.log('🔄 [InvertMode] Mouse left waveform - hover cursor line hidden instantly');
    }
    
    // 🚀 **NO CURSOR/TOOLTIP RESET**: Không reset cursor hay tooltip khi pointer leave trong normal mode vì có pointer capture
    // resetCursor();
    // clearHoverTooltip();
  }, [onMouseLeave, isInverted, clearHoverTooltip]);

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
      isInverted, // 🆕 **INVERT MODE**: Track invert selection state
      containerWidth
    };
  }, [hybridWaveformData, duration, startTime, endTime, animatedVolume, fadeIn, fadeOut, isInverted, containerWidth]);

  // 🔧 **HEIGHT CONSISTENCY CHECK**: Ensure consistent height during transitions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.height !== WAVEFORM_CONFIG.HEIGHT) {
      console.log(`🔧 [WaveformHeight-FIX] Correcting canvas height:`, {
        currentHeight: canvas.height,
        expectedHeight: WAVEFORM_CONFIG.HEIGHT,
        note: 'Ensuring consistent height across all states'
      });
      canvas.height = WAVEFORM_CONFIG.HEIGHT;
    }
  }, [canvasRef, renderData]);  // Trigger when render data changes

  // 🆕 **FADE EFFECT CALCULATOR**: Ultra-optimized fade calculation - Fixed invert mode fadeout
  const calculateFadeMultiplier = useCallback((barTime, selectionStart, selectionEnd, fadeInDuration, fadeOutDuration, isInverted = false, duration = 0) => {
    if (isInverted) {
      // 🆕 **INVERT MODE**: Silence region has absolute priority
      if (barTime >= selectionStart && barTime <= selectionEnd) {
        return 0.02; // 🎨 **FLAT LINE**: Small visual multiplier for silence region boundary
      }
      
      // 🔥 **FADE EFFECTS FOR ACTIVE REGIONS**: Apply to regions before startTime and after endTime
      if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
      
      let fadeMultiplier = 1.0;
      
      // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to selectionStart)
      if (fadeInDuration > 0 && barTime < selectionStart) {
        const activeRegionDuration = selectionStart; // From 0 to selectionStart
        const fadeInEnd = Math.min(fadeInDuration, activeRegionDuration);
        
        if (barTime <= fadeInEnd) {
          const fadeProgress = barTime / fadeInEnd;
          fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
          
          // 🔍 **DEBUG FADE IN**: Log fade in calculation occasionally
          if (Math.random() < 0.01) {
            console.log(`🎨 [INVERT-FADEIN] Bar at ${barTime.toFixed(2)}s: fadeProgress=${fadeProgress.toFixed(3)}, fadeIn=${fadeInDuration.toFixed(1)}s, region=[0-${selectionStart.toFixed(2)}s]`);
          }
        }
      }
      
      // 🔥 **FADE OUT - SECOND ACTIVE REGION** (selectionEnd to duration)
      if (fadeOutDuration > 0 && barTime >= selectionEnd) {
        const activeRegionDuration = duration - selectionEnd; // From selectionEnd to duration
        const actualFadeOutDuration = Math.min(fadeOutDuration, activeRegionDuration);
        const fadeOutStart = duration - actualFadeOutDuration; // Fade at the END of this region
        
        if (barTime >= fadeOutStart) {
          const fadeProgress = (duration - barTime) / actualFadeOutDuration;
          fadeMultiplier = Math.min(fadeMultiplier, Math.max(0.05, fadeProgress));
          
          // 🔍 **DEBUG FADE OUT**: Log fade out calculation occasionally  
          if (Math.random() < 0.01) {
            console.log(`🔥 [INVERT-FADEOUT] Bar at ${barTime.toFixed(2)}s: fadeProgress=${fadeProgress.toFixed(3)}, fadeOut=${fadeOutDuration.toFixed(1)}s, region=[${selectionEnd.toFixed(2)}s-${duration.toFixed(2)}s], fadeStart=${fadeOutStart.toFixed(2)}s`);
          }
        }
      }
      
      return Math.max(0.05, Math.min(1.0, fadeMultiplier));
    } else {
      // 🎯 **NORMAL MODE**: Original logic unchanged
      if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
      if (barTime < selectionStart || barTime > selectionEnd) return 1.0;
      
      let fadeMultiplier = 1.0;
      const selectionDuration = selectionEnd - selectionStart;
      
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
    }
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
    
    // 🔧 **HANDLE SPACE ADJUSTMENT**: Reserve space for handles (8px each side)
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth; // Start after left handle
    const waveformEndX = width - rightHandleWidth; // End before right handle
    const availableWaveformWidth = waveformEndX - waveformStartX;
    
    // 1. **BACKGROUND GRADIENT**: 🔧 **FIXED ALIGNMENT** - Match waveform bars rendering area
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(waveformStartX, 0, availableWaveformWidth, height);
    
    // 🔧 **ALIGNED BORDER**: Draw border to match waveform rendering area
    ctx.strokeStyle = '#cbd5e1'; // Same as CSS border-slate-200
    ctx.lineWidth = 1;
    ctx.strokeRect(waveformStartX, 0, availableWaveformWidth, height);
    
    // 2. **WAVEFORM BARS**: Ultra-optimized rendering with hybrid system
    const { 
      waveformData, 
      duration, 
      startTime, 
      endTime, 
      volume: currentVolume, 
      fadeIn: currentFadeIn, 
      fadeOut: currentFadeOut,
      isInverted // 🆕 **INVERT MODE**: Get invert state from renderData
    } = renderData;
    
    const centerY = height / 2;
    
    // 🚀 **DEBUG LOG**: Add console.log for debugging if needed
    if (Math.random() < 0.001) { // Log very rarely to avoid spam
      console.log(`🔧 [WAVEFORM-RENDER-FIX] Waveform rendering area:`, {
        canvasWidth: width + 'px',
        leftHandleWidth: leftHandleWidth + 'px', 
        rightHandleWidth: rightHandleWidth + 'px',
        waveformStartX: waveformStartX + 'px',
        waveformEndX: waveformEndX + 'px',
        availableWaveformWidth: availableWaveformWidth + 'px',
        fix: 'Background and border now match waveform bars area'
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
    
    // 🔧 **DEBUG WAVEFORM HEIGHT**: Log để debug height inconsistency
    if (Math.random() < 0.001) { // Log very rarely
      console.log(`🔧 [WaveformHeight-DEBUG] Height calculation details:`, {
        currentVolume: currentVolume.toFixed(3),
        volumePercent: volumePercent.toFixed(1) + '%',
        volumeStep: volumeStep.toFixed(1),
        scalingPixels: scalingPixels.toFixed(1) + 'px',
        absoluteBarHeightPx: absoluteBarHeightPx.toFixed(1) + 'px',
        waveformVariation: waveformVariation.toFixed(3),
        waveformDataLength: waveformData.length,
        note: 'Tracking height consistency between initial load and completion'
      });
    }
    
    // 🚀 **HYBRID RENDERING**: Use fixed bar width from hybrid system, but adjust for available space
    if (absoluteBarHeightPx > 0 && availableWaveformWidth > 0) {
      ctx.save();
      
      const fadeEffectsActive = currentFadeIn > 0 || currentFadeOut > 0;
      
      // 🔧 **ADJUSTED RENDERING**: Render bars within available waveform width
      const adjustedBarWidth = availableWaveformWidth / waveformData.length;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const barTime = (i / waveformData.length) * duration;
        
        // 🚀 **ULTRA-FAST FADE CALCULATION**: Optimized for speed
        let fadeMultiplier = 1.0;
        
        if (isInverted && barTime >= startTime && barTime <= endTime) {
          // 🔇 **SILENCE REGION - VISUAL FLAT LINE**: Show flat line but audio is still 0
          fadeMultiplier = 0.02; // 🎨 **FLAT LINE**: Small visual multiplier to show silence region boundary
        } else if (fadeEffectsActive) {
          // Only calculate fade for non-silence bars
          fadeMultiplier = calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut, isInverted, duration);
        }
        
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
        
        // 🆕 **INVERT SELECTION LOGIC**: Đảo ngược logic màu sắc khi isInverted = true
        const isInSelection = barTime >= startTime && barTime <= endTime;
        const shouldBeActive = isInverted ? !isInSelection : isInSelection;
        ctx.fillStyle = shouldBeActive ? '#7c3aed' : '#cbd5e1';
        
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
    
    // 🚀 **DEBUG LOG**: Add console.log to show handle positioning logic
    if (Math.random() < 0.001) { // Log very rarely to avoid spam
      console.log(`🔧 [HANDLE-INVERT-POSITIONING] Handle positioning with invert mode:`, {
        isInverted,
        regionBounds: `${regionStartX.toFixed(1)}px - ${regionEndX.toFixed(1)}px`,
        startHandle: {
          position: `${startHandleX.toFixed(1)}px (${isInverted ? 'left' : 'right'} edge at ${isInverted ? startHandleX.toFixed(1) : (startHandleX + responsiveHandleWidth).toFixed(1)}px)`,
          alignsWithRegionStart: true,
          borderRadius: isInverted ? 'right side' : 'left side'
        },
        endHandle: {
          position: `${endHandleX.toFixed(1)}px (${isInverted ? 'right' : 'left'} edge at ${isInverted ? (endHandleX + responsiveHandleWidth).toFixed(1) : endHandleX.toFixed(1)}px)`,
          alignsWithRegionEnd: true,
          borderRadius: isInverted ? 'left side' : 'right side'
        },
        logic: 'Non-radius edges always point to start/end points'
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
        }}
      />

      <WaveformUI 
        hoverTooltip={hoverTooltip}
        handleTooltips={handleTooltips}
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