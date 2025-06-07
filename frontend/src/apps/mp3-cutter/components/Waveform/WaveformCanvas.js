// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom'; // 🆕 **PORTAL IMPORT**: For rendering tooltips outside stacking context
import { WAVEFORM_CONFIG } from '../../utils/constants';

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
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {
  // 🎯 Animation refs - prevent memory leaks
  const animationFrameRef = useRef(null);
  const lastDrawTimeRef = useRef(0);
  const lastRenderDataRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastCanvasWidthRef = useRef(0);
  
  // 🆕 **VOLUME ANIMATION**: Smooth volume transitions
  const volumeAnimationRef = useRef(volume);
  const targetVolumeRef = useRef(volume);
  const [animatedVolume, setAnimatedVolume] = useState(volume); // 🆕 **STATE FOR DEPENDENCIES**
  
  // 🔇 **VOLUME LOGGING**: Track last logged volume to prevent spam
  const lastVolumeLogRef = useRef(null);
  
  // 🔥 **OPTIMIZED**: Removed all debug logging refs to prevent spam
  const setupCompleteRef = useRef(false);

  // 🆕 **CURSOR INTELLIGENCE**: Smart cursor management based on hover position
  const currentCursorRef = useRef('crosshair');
  const lastCursorUpdateRef = useRef(0);

  // 🆕 **TIME TOOLTIP SYSTEM**: Hover time display and cursor line
  const [hoverPosition, setHoverPosition] = useState(null); // { x, time, visible }
  const lastHoverUpdateRef = useRef(0);
  const hoverTimeoutRef = useRef(null);

  // 🆕 **ADVANCED TOOLTIP SYSTEM**: Handle tooltips, cursor tooltip, và selection duration tooltip
  const [tooltipPositions, setTooltipPositions] = useState({
    startHandle: null,    // { x, time, visible, formattedTime }
    endHandle: null,      // { x, time, visible, formattedTime }
    cursor: null,         // { x, time, visible, formattedTime }
    selectionDuration: null // { x, duration, visible, formattedDuration }
  });
  const lastTooltipUpdateRef = useRef(0);

  // 🆕 **PORTAL SYSTEM**: Refs for portal-based tooltips rendering
  const portalContainerRef = useRef(null);
  const canvasRectRef = useRef(null);
  const tooltipPortalTargetRef = useRef(null);

  // 🆕 **CANVAS POSITION TRACKER**: Track canvas position for absolute tooltip positioning
  const updateCanvasPosition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    canvasRectRef.current = rect;
    
    console.log(`📍 [CanvasPosition] Updated:`, {
      x: rect.x.toFixed(1),
      y: rect.y.toFixed(1),
      width: rect.width.toFixed(1),
      height: rect.height.toFixed(1),
      scrollX: window.scrollX,
      scrollY: window.scrollY
    });
    
    return rect;
  }, [canvasRef]);

  // 🎯 **SMART CURSOR DETECTION**: Detect cursor type based on mouse position
  const detectCursorType = useCallback((mouseX, canvasWidth) => {
    if (!canvasWidth || duration === 0) return 'crosshair';

    // 🔧 **DEBUG REDUCED**: Only log significant cursor detections to reduce console spam
    const shouldLog = currentCursorRef.current === 'crosshair' || Math.random() < 0.1; // 10% sampling
    if (shouldLog) {
      console.log(`🖱️ [CursorDetect] Analyzing position ${mouseX.toFixed(1)}px of ${canvasWidth}px`);
    }

    // 🎯 **HANDLE DETECTION**: Check if hovering over handles first (highest priority)
    const { HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(8, HANDLE_WIDTH * 0.8) : HANDLE_WIDTH;
    
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const tolerance = Math.max(responsiveHandleWidth / 2, WAVEFORM_CONFIG.RESPONSIVE.TOUCH_TOLERANCE);
    
    // 🔍 **HANDLE HOVER DETECTION**
    if (startTime < endTime) { // Only check handles if there's a valid selection
      if (Math.abs(mouseX - startX) <= tolerance) {
        if (shouldLog) console.log(`🎯 [CursorDetect] START HANDLE at ${startX.toFixed(1)}px`);
        return 'ew-resize'; // ← Handle resize cursor
      }
      if (Math.abs(mouseX - endX) <= tolerance) {
        if (shouldLog) console.log(`🎯 [CursorDetect] END HANDLE at ${endX.toFixed(1)}px`);
        return 'ew-resize'; // ← Handle resize cursor
      }
    }

    // 🔍 **REGION DETECTION**: Check if hovering inside selection region
    if (startTime < endTime) {
      const timeAtPosition = (mouseX / canvasWidth) * duration;
      const isInRegion = timeAtPosition >= startTime && timeAtPosition <= endTime;
      
      if (isInRegion) {
        if (shouldLog) console.log(`🔄 [CursorDetect] INSIDE REGION - time: ${timeAtPosition.toFixed(2)}s`);
        // 🆕 **FIXED CURSOR LOGIC**: Region hover = pointer, region drag = move
        return 'pointer'; // ← Hand cursor for region hover (changed from 'move')
      }
    }

    // 🔍 **OUTSIDE REGION**: Default cursor for empty areas
    if (shouldLog) console.log(`👆 [CursorDetect] OUTSIDE REGION - pointer cursor`);
    return 'pointer'; // ← Hand cursor for clicking outside selection

  }, [duration, startTime, endTime]);

  // 🆕 **CURSOR UPDATE HANDLER**: Update cursor with throttling for performance
  const updateCursor = useCallback((mouseX) => {
    const now = performance.now();
    
    // 🔥 **PERFORMANCE THROTTLING**: Update cursor max 60fps to prevent lag
    if (now - lastCursorUpdateRef.current < 16) return; // 60fps throttling
    lastCursorUpdateRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 🎯 **DRAGGING STATE OVERRIDE**: Different cursors during drag
    if (isDragging) {
      // 🆕 **IMPROVED DRAG CURSORS**: Specific cursors for different drag types
      let draggingCursor;
      if (isDragging === 'region') {
        draggingCursor = 'move'; // ← 4-directional arrows for region drag
      } else {
        draggingCursor = 'grabbing'; // ← Grabbing for handle drag
      }
      
      if (currentCursorRef.current !== draggingCursor) {
        canvas.style.cursor = draggingCursor;
        currentCursorRef.current = draggingCursor;
        console.log(`🫳 [CursorUpdate] DRAGGING cursor: ${draggingCursor} (type: ${isDragging})`);
      }
      return;
    }

    // 🎯 **DETECT NEW CURSOR TYPE**: Based on current mouse position
    const newCursorType = detectCursorType(mouseX, canvas.width);
    
    // 🔄 **UPDATE ONLY IF CHANGED**: Prevent unnecessary DOM updates
    if (currentCursorRef.current !== newCursorType) {
      canvas.style.cursor = newCursorType;
      currentCursorRef.current = newCursorType;
      console.log(`✨ [CursorUpdate] Cursor changed: ${newCursorType}`);
    }
  }, [canvasRef, isDragging, detectCursorType]);

  // 🆕 **TIME FORMATTING**: Convert seconds to MM:SS.d format với decimal
  const formatTime = useCallback((timeInSeconds) => {
    if (timeInSeconds < 0) return '00:00.0';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const decimal = Math.floor((timeInSeconds % 1) * 10); // 1 decimal place
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${decimal}`;
  }, []);

  // 🆕 **DURATION FORMATTING**: Convert seconds to MM:SS.d format cho selection duration
  const formatDuration = useCallback((durationInSeconds) => {
    if (durationInSeconds < 0) return '00:00.0';
    
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const decimal = Math.floor((durationInSeconds % 1) * 10); // 1 decimal place
    
    // 🎯 **CONSISTENT FORMAT**: Luôn dùng MM:SS.d format cho consistency
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${decimal}`;
  }, []);

  // 🆕 **ADVANCED TOOLTIP POSITION TRACKER**: Cập nhật vị trí tất cả tooltips real-time
  const updateTooltipPositions = useCallback(() => {
    const now = performance.now();
    
    // 🔥 **PERFORMANCE THROTTLING**: 60fps cho smooth tooltip movement
    if (now - lastTooltipUpdateRef.current < 16) return; // 60fps
    lastTooltipUpdateRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas || duration === 0) {
      setTooltipPositions({
        startHandle: null,
        endHandle: null,
        cursor: null,
        selectionDuration: null
      });
      return;
    }

    // 🆕 **UPDATE CANVAS POSITION**: Always update canvas position for portal rendering
    const canvasRect = updateCanvasPosition();
    if (!canvasRect) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 🎯 **CALCULATE POSITIONS**: Tính toán vị trí pixel từ time
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const cursorX = (currentTime / duration) * canvasWidth;
    
    // 🎯 **SELECTION INFO**: Thông tin về selection
    const hasValidSelection = startTime < endTime;
    const selectionDuration = hasValidSelection ? endTime - startTime : 0;
    const selectionCenterX = hasValidSelection ? (startX + endX) / 2 : null;

    // 🆕 **TOOLTIP VISIBILITY LOGIC**: Chỉ hiện tooltip khi cần thiết
    const showStartHandle = hasValidSelection && startX >= 0 && startX <= canvasWidth;
    const showEndHandle = hasValidSelection && endX >= 0 && endX <= canvasWidth;
    const showCursor = currentTime >= 0 && currentTime <= duration && cursorX >= 0 && cursorX <= canvasWidth;
    const showSelectionDuration = hasValidSelection && selectionDuration > 0.1; // Chỉ hiện nếu selection > 0.1s

    // 🆕 **ABSOLUTE POSITIONING**: Calculate absolute positions for portal rendering
    const absoluteStartX = canvasRect.left + startX + window.scrollX;
    const absoluteEndX = canvasRect.left + endX + window.scrollX;
    const absoluteCursorX = canvasRect.left + cursorX + window.scrollX;
    const absoluteSelectionCenterX = hasValidSelection ? canvasRect.left + selectionCenterX + window.scrollX : null;
    const tooltipBaseY = canvasRect.top + window.scrollY;

    // 🆕 **DIFFERENTIATED Y POSITIONING**: Different Y positions for different tooltip types
    const handlesTooltipY = tooltipBaseY + WAVEFORM_CONFIG.HEIGHT + 5; // 🎯 **BELOW WAVEFORM**: 5px below canvas for handles
    const cursorTooltipY = tooltipBaseY - 30; // 🎯 **ABOVE WAVEFORM**: 30px above canvas for cursor (unchanged)

    // 🎯 **UPDATE TOOLTIP POSITIONS**: Cập nhật state với vị trí mới (differentiated positioning)
    setTooltipPositions({
      // 🏷️ **START HANDLE TOOLTIP**: Tooltip cho handle trái - BELOW waveform
      startHandle: showStartHandle ? {
        x: startX, // Canvas relative position
        absoluteX: absoluteStartX, // Absolute position for portal
        absoluteY: handlesTooltipY, // 🆕 **BELOW CANVAS**: 5px below waveform
        time: startTime,
        visible: true,
        formattedTime: formatTime(startTime)
      } : null,

      // 🏷️ **END HANDLE TOOLTIP**: Tooltip cho handle phải - BELOW waveform  
      endHandle: showEndHandle ? {
        x: endX, // Canvas relative position
        absoluteX: absoluteEndX, // Absolute position for portal
        absoluteY: handlesTooltipY, // 🆕 **BELOW CANVAS**: 5px below waveform
        time: endTime,
        visible: true,
        formattedTime: formatTime(endTime)
      } : null,

      // 🏷️ **CURSOR TOOLTIP**: Tooltip cho cursor line - ABOVE waveform (unchanged)
      cursor: showCursor ? {
        x: cursorX, // Canvas relative position
        absoluteX: absoluteCursorX, // Absolute position for portal
        absoluteY: cursorTooltipY, // 🎯 **ABOVE CANVAS**: Keep cursor tooltip above (unchanged)
        time: currentTime,
        visible: true,
        formattedTime: formatTime(currentTime)
      } : null,

      // 🏷️ **SELECTION DURATION TOOLTIP**: Tooltip cho duration ở giữa selection (INSIDE waveform)
      selectionDuration: showSelectionDuration ? {
        x: selectionCenterX, // Canvas relative position
        absoluteX: absoluteSelectionCenterX, // Absolute position for portal
        absoluteY: tooltipBaseY + WAVEFORM_CONFIG.HEIGHT - 35, // Inside waveform (unchanged)
        duration: selectionDuration,
        visible: true,
        formattedDuration: formatDuration(selectionDuration)
      } : null
    });

    // 🔧 **DEBUG TOOLTIP POSITIONS**: Log occasional để track tooltip positions với differentiated positioning
    if (Math.random() < 0.02) { // 2% sampling
      console.log(`🏷️ [TooltipPositions] Updated with DIFFERENTIATED positioning:`, {
        startHandle: showStartHandle ? `${absoluteStartX.toFixed(1)}px absolute, Y: ${handlesTooltipY.toFixed(1)}px BELOW (${formatTime(startTime)})` : 'hidden',
        endHandle: showEndHandle ? `${absoluteEndX.toFixed(1)}px absolute, Y: ${handlesTooltipY.toFixed(1)}px BELOW (${formatTime(endTime)})` : 'hidden',
        cursor: showCursor ? `${absoluteCursorX.toFixed(1)}px absolute, Y: ${cursorTooltipY.toFixed(1)}px ABOVE (${formatTime(currentTime)})` : 'hidden',
        selectionDuration: showSelectionDuration ? `${absoluteSelectionCenterX.toFixed(1)}px absolute - INSIDE WAVEFORM` : 'hidden',
        positioning: {
          handlesY: `${handlesTooltipY.toFixed(1)}px (canvas + ${WAVEFORM_CONFIG.HEIGHT} + 5px)`,
          cursorY: `${cursorTooltipY.toFixed(1)}px (canvas - 30px)`,
          differentiatedMode: 'ENABLED - Handles BELOW, Cursor ABOVE'
        },
        canvasRect: {
          left: canvasRect.left.toFixed(1),
          top: canvasRect.top.toFixed(1),
          width: canvasRect.width.toFixed(1),
          height: canvasRect.height.toFixed(1)
        },
        portalMode: 'ACTIVE - Outside stacking context'
      });
    }

  }, [canvasRef, duration, startTime, endTime, currentTime, formatTime, formatDuration, updateCanvasPosition]);

  // 🆕 **HOVER TIME TRACKER**: Track mouse position and calculate time
  const updateHoverTime = useCallback((mouseX, canvasWidth) => {
    const now = performance.now();
    
    // 🔥 **THROTTLE HOVER UPDATES**: 60fps to prevent lag
    if (now - lastHoverUpdateRef.current < 16) return; // 60fps
    lastHoverUpdateRef.current = now;

    if (!canvasWidth || duration === 0) {
      setHoverPosition(null);
      return;
    }

    // 🆕 **HANDLE DETECTION**: Check if hovering over handles to hide cursor line
    const { HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = canvasWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(8, HANDLE_WIDTH * 0.8) : HANDLE_WIDTH;
    
    const startX = (startTime / duration) * canvasWidth;
    const endX = (endTime / duration) * canvasWidth;
    const tolerance = Math.max(responsiveHandleWidth / 2, WAVEFORM_CONFIG.RESPONSIVE.TOUCH_TOLERANCE);
    
    // 🚫 **HIDE CURSOR LINE**: When hovering over handles
    if (startTime < endTime) { // Only check handles if there's a valid selection
      if (Math.abs(mouseX - startX) <= tolerance || Math.abs(mouseX - endX) <= tolerance) {
        // 🔧 **DEBUG HANDLE HOVER**: Log when hiding cursor line for handles
        if (Math.random() < 0.1) { // 10% sampling
          console.log(`🚫 [HoverTime] Hiding cursor line - hovering over handle`);
        }
        setHoverPosition(null); // ← Hide cursor line when on handles
        return;
      }
    }

    // 🎯 **CALCULATE TIME**: Convert mouse X to time position
    const timeAtPosition = (mouseX / canvasWidth) * duration;
    const clampedTime = Math.max(0, Math.min(timeAtPosition, duration));
    
    // 🆕 **UPDATE HOVER POSITION**: Set hover data for tooltip and line
    setHoverPosition({
      x: mouseX,
      time: clampedTime,
      formattedTime: formatTime(clampedTime),
      visible: true
    });

    // 🔧 **DEBUG SAMPLING**: Only log occasionally to prevent spam với format mới
    if (Math.random() < 0.05) { // 5% sampling
      console.log(`⏰ [HoverTime] Position: ${mouseX.toFixed(1)}px → ${formatTime(clampedTime)} (precise: ${clampedTime.toFixed(3)}s)`);
    }
  }, [duration, formatTime, startTime, endTime]);

  // 🆕 **ENHANCED MOUSE MOVE HANDLER**: Add cursor detection and time tracking
  const handleEnhancedMouseMove = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseMove) {
      onMouseMove(e);
    }

    // 🆕 **CURSOR AND TIME INTELLIGENCE**: Update cursor and time tracking
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // 🎯 **UPDATE CURSOR**: Smart cursor management
      updateCursor(mouseX);
      
      // 🆕 **UPDATE HOVER TIME**: Time tooltip and hover line
      updateHoverTime(mouseX, canvas.width);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTime]);

  // 🆕 **ENHANCED MOUSE LEAVE HANDLER**: Reset cursor and hide tooltip
  const handleEnhancedMouseLeave = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseLeave) {
      onMouseLeave(e);
    }

    // 🆕 **RESET CURSOR**: Reset to default when leaving canvas
    const canvas = canvasRef.current;
    if (canvas && !isDragging) {
      canvas.style.cursor = 'default';
      currentCursorRef.current = 'default';
      console.log(`🫥 [CursorUpdate] Mouse left canvas - reset to default cursor`);
    }

    // 🆕 **HIDE TOOLTIP**: Hide time tooltip when leaving canvas
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // 🎯 **DELAYED HIDE**: Small delay to prevent flickering
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverPosition(null);
      console.log(`⏰ [HoverTime] Hidden - mouse left canvas`);
    }, 50);
    
  }, [onMouseLeave, canvasRef, isDragging]);

  // 🔥 **OPTIMIZED ADAPTIVE DATA**: Giảm logging và chỉ log khi cần
  const adaptiveWaveformData = useMemo(() => {
    if (!waveformData.length) return [];
    
    const canvas = canvasRef.current;
    if (!canvas) return waveformData;
    
    const canvasWidth = canvas.width || 800;
    const currentWidth = lastCanvasWidthRef.current || canvasWidth;
    
    // 🎯 SMART ADAPTIVE SAMPLING using configuration
    const { SAMPLING_RULES } = WAVEFORM_CONFIG.RESPONSIVE;
    let rule;
    
    if (currentWidth <= SAMPLING_RULES.SMALL.maxWidth) {
      rule = SAMPLING_RULES.SMALL;
    } else if (currentWidth <= SAMPLING_RULES.MEDIUM.maxWidth) {
      rule = SAMPLING_RULES.MEDIUM;  
    } else {
      rule = SAMPLING_RULES.LARGE;
    }
    
    const targetSamples = Math.max(100, Math.floor(currentWidth * rule.samplesPerPx));
    const finalSamples = Math.min(waveformData.length, targetSamples);
    
    // 🎯 DOWNSAMPLE if needed (averaging for smoother result)
    if (waveformData.length > finalSamples) {
      const step = waveformData.length / finalSamples;
      const adaptedData = [];
      
      for (let i = 0; i < finalSamples; i++) {
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(Math.floor((i + 1) * step), waveformData.length);
        
        // Average the values in this range for smoother result
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j < endIdx; j++) {
          sum += waveformData[j];
          count++;
        }
        adaptedData.push(count > 0 ? sum / count : 0);
      }
      
      return adaptedData;
    }
    
    return waveformData;
  }, [waveformData, canvasRef]);

  // 🔥 **STABLE RENDER DATA**: Giảm re-calculation và logging với volume support
  const renderData = useMemo(() => {    
    if (!adaptiveWaveformData.length || duration === 0) {
      return null;
    }
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    
    // 🔥 **STABLE HASH**: Use rounded values to prevent excessive re-calculations
    const stableStartTime = Math.round(startTime * 10) / 10; // 0.1s precision
    const stableEndTime = Math.round(endTime * 10) / 10;     // 0.1s precision
    const stableDuration = Math.round(duration * 10) / 10;   // 0.1s precision
    const stableVolume = Math.round(animatedVolume * 1000) / 1000; // 🆕 **USE STATE** instead of ref
    
    const data = {
      waveformData: adaptiveWaveformData,
      duration: stableDuration,
      startTime: stableStartTime,
      endTime: stableEndTime,
      hoveredHandle,
      isDragging,
      canvasWidth,
      volume: stableVolume, // 🆕 **ANIMATED VOLUME**: Use animation ref for smooth transitions
      dataHash: `${adaptiveWaveformData.length}-${stableDuration}-${stableStartTime}-${stableEndTime}-${hoveredHandle || 'none'}-${isDragging || 'none'}-${canvasWidth}-${stableVolume}`
    };
    
    // 🔥 **UPDATE REF**: Update ref without logging to prevent spam
    lastRenderDataRef.current = data;
    
    return data;
  }, [adaptiveWaveformData, duration, startTime, endTime, hoveredHandle, isDragging, canvasRef, animatedVolume]);

  // 🎯 ENHANCED: Drawing function with performance optimizations
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🎯 Update canvas width ref without logging
    if (width !== lastCanvasWidthRef.current) {
      lastCanvasWidthRef.current = width;
    }
    
    // 🎯 Clear canvas efficiently
    ctx.clearRect(0, 0, width, height);
    
    // 1. 🎯 Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. 🎯 RESPONSIVE WAVEFORM BARS với Volume Scaling
    const { waveformData, duration, startTime, endTime, volume: currentVolume } = renderData;
    const centerY = height / 2;
    
    // 🎯 SMART BAR WIDTH CALCULATION
    const rawBarWidth = width / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    const barWidth = Math.max(minBarWidth, rawBarWidth);
    const useOptimizedSpacing = rawBarWidth < minBarWidth;
    
    // 🆕 **VOLUME ANIMATION SYSTEM**: Enhanced responsive volume animation
    const volumeMultiplier = Math.max(0.05, Math.min(2.5, currentVolume)); // Range: 0.05x to 2.5x (wider range)
    
    // 🆕 **EXPONENTIAL SCALING**: More noticeable changes at low volumes
    const exponentialScale = Math.pow(volumeMultiplier, 0.7); // Gentler curve for low volumes
    const linearScale = volumeMultiplier * 0.8;
    const hybridScale = (exponentialScale + linearScale) / 2; // Hybrid approach
    
    const baseVolumeMultiplier = 0.15; // Higher minimum visible height
    const finalVolumeMultiplier = baseVolumeMultiplier + (hybridScale * (1 - baseVolumeMultiplier));
    
    // 🔊 **SENSITIVE LOGGING**: Log even small volume changes for debugging
    if (!lastVolumeLogRef.current || Math.abs(currentVolume - lastVolumeLogRef.current) > 0.01) {
      console.log(`🔊 [WaveformDraw] Volume scaling: ${currentVolume.toFixed(3)} → ${finalVolumeMultiplier.toFixed(3)}x height (exp: ${exponentialScale.toFixed(3)}, linear: ${linearScale.toFixed(3)})`);
      lastVolumeLogRef.current = currentVolume;
    }
    
    // 🎯 PERFORMANCE: Batch draw operations
    ctx.save();
    
    if (useOptimizedSpacing) {
      // 🎯 SMALL SCREENS: Fill entire width with evenly spaced bars
      const totalBarSpace = width;
      const spacing = totalBarSpace / waveformData.length;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const baseBarHeight = Math.max(3, (value * height) / 2); // Increased minimum from 2px to 3px
        const scaledBarHeight = baseBarHeight * finalVolumeMultiplier; // 🆕 **ENHANCED VOLUME SCALING**
        const x = i * spacing;
        const barTime = (i / waveformData.length) * duration;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with guaranteed visibility and volume scaling
        ctx.fillRect(Math.floor(x), centerY - scaledBarHeight, minBarWidth, scaledBarHeight * 2);
      }
    } else {
      // 🎯 LARGE SCREENS: Normal spacing with calculated bar width
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const baseBarHeight = Math.max(3, (value * height) / 2); // Increased minimum from 2px to 3px
        const scaledBarHeight = baseBarHeight * finalVolumeMultiplier; // 🆕 **ENHANCED VOLUME SCALING**
        const x = i * barWidth;
        const barTime = (i / waveformData.length) * duration;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with optimized width and volume scaling
        const drawWidth = Math.max(1, barWidth - 0.3);
        ctx.fillRect(Math.floor(x), centerY - scaledBarHeight, drawWidth, scaledBarHeight * 2);
      }
    }
    ctx.restore();
    
    // 3. 🎯 Selection overlay
    if (startTime < endTime) {
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      // Selection area highlight
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Selection borders
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
    
    // 4. 🎯 Handles - responsive sizing
    if (startTime < endTime) {
      const { HANDLE_WIDTH, HANDLE_HEIGHT } = WAVEFORM_CONFIG;
      const { hoveredHandle, isDragging } = renderData;
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      const handleY = (height - HANDLE_HEIGHT) / 2;
      
      // 🎯 RESPONSIVE HANDLE SIZE (smaller on mobile)
      const responsiveHandleWidth = width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(8, HANDLE_WIDTH * 0.8) : HANDLE_WIDTH;
      
      // Left handle
      const leftHandleX = startX - responsiveHandleWidth / 2;
      const isLeftActive = hoveredHandle === 'start' || isDragging === 'start';
      
      ctx.fillStyle = isLeftActive ? '#6366f1' : '#e2e8f0';
      ctx.fillRect(leftHandleX, handleY, responsiveHandleWidth, HANDLE_HEIGHT);
      ctx.strokeStyle = isLeftActive ? '#4f46e5' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftHandleX, handleY, responsiveHandleWidth, HANDLE_HEIGHT);
      
      // Right handle
      const rightHandleX = endX - responsiveHandleWidth / 2;
      const isRightActive = hoveredHandle === 'end' || isDragging === 'end';
      
      ctx.fillStyle = isRightActive ? '#ec4899' : '#e2e8f0';
      ctx.fillRect(rightHandleX, handleY, responsiveHandleWidth, HANDLE_HEIGHT);
      ctx.strokeStyle = isRightActive ? '#db2777' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(rightHandleX, handleY, responsiveHandleWidth, HANDLE_HEIGHT);
    }
    
    // 5. 🔥 **CLEAN CURSOR**: Slim 2px cursor as requested
    if (duration > 0 && currentTime >= 0) {
      const cursorX = (currentTime / duration) * width;
      
      // 🔥 **SLIM CURSOR LINE**: Clean 2px line for all states
      ctx.strokeStyle = isPlaying ? '#f59e0b' : '#f97316';
      ctx.lineWidth = 2; // ← Fixed 2px as requested
      ctx.shadowColor = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowBlur = isPlaying ? 2 : 1; // Subtle shadow
      
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // 🔥 **COMPACT CURSOR TRIANGLE**: Smaller, cleaner triangle
      const triangleSize = 4; // Reduced from 6/5 to 4
      ctx.fillStyle = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowColor = isPlaying ? '#f59e0b' : '#f97316';
      ctx.shadowBlur = isPlaying ? 1 : 0;
      
      ctx.beginPath();
      ctx.moveTo(cursorX - triangleSize, 0);
      ctx.lineTo(cursorX + triangleSize, 0);
      ctx.lineTo(cursorX, triangleSize * 1.5); // Slightly shorter triangle
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 6. 🆕 **HOVER TIME LINE**: Thin 1px line showing hover position
    if (hoverPosition && hoverPosition.visible && duration > 0) {
      const hoverX = hoverPosition.x;
      
      // 🎯 **ULTRA-THIN HOVER LINE**: 1px line as requested
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // Blue with transparency
      ctx.lineWidth = 1; // ← Exactly 1px as requested
      ctx.setLineDash([2, 2]); // Dashed line to distinguish from cursor
      
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // 🔧 **DEBUG HOVER LINE**: Occasional logging
      if (Math.random() < 0.02) { // 2% sampling
        console.log(`📍 [HoverLine] Drawing at ${hoverX.toFixed(1)}px for time ${hoverPosition.formattedTime}`);
      }
    }
  }, [canvasRef, renderData, currentTime, isPlaying, hoverPosition]);

  // 🔥 **OPTIMIZED REDRAW**: High-performance cursor animation
  const requestRedraw = useCallback(() => {
    // 🔥 Cancel previous frame to prevent stacking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      // 🔥 **SMART PERFORMANCE**: Context-aware frame rates
      let minInterval;
      if (isDragging) {
        minInterval = 8;   // 120fps for ultra-smooth dragging
      } else if (isPlaying) {
        minInterval = 16;  // 60fps for smooth cursor movement
      } else {
        minInterval = 33;  // 30fps for static UI
      }
      
      // 🔥 **SMOOTH THROTTLING**: Allow cursor updates
      if (timestamp - lastDrawTimeRef.current >= minInterval) {
        drawWaveform();
        lastDrawTimeRef.current = timestamp;
      }
      
      animationFrameRef.current = null;
    });
  }, [drawWaveform, isDragging, isPlaying]);

  // 🔥 **RESPONSIVE CURSOR**: High-frequency cursor updates for smooth movement
  useEffect(() => {
    if (isPlaying && renderData && duration > 0) {
      // 🔥 **IMMEDIATE REDRAW**: Không delay cho cursor movement
      requestRedraw();
    }
  }, [currentTime, isPlaying, renderData, requestRedraw, duration]);

  // 🔥 **STABLE REDRAW**: Minimal re-triggers for non-cursor updates
  useEffect(() => {
    if (renderData && !isPlaying) {
      // 🔥 **STATIC UPDATES**: Chỉ khi không playing để tránh conflict
      const timeoutId = setTimeout(requestRedraw, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [renderData, requestRedraw, isPlaying, hoverPosition]); // 🆕 **HOVER DEPENDENCY**: Include hoverPosition for hover line updates

  // 🆕 **TOOLTIP POSITION UPDATES**: Trigger tooltip position updates khi cần thiết
  useEffect(() => {
    // 🎯 **REAL-TIME UPDATES**: Update tooltip positions khi có thay đổi quan trọng
    updateTooltipPositions();
    
    // 🔧 **DEBUG TOOLTIP TRIGGER**: Log khi tooltip positions được update
    console.log(`🏷️ [TooltipTrigger] Positions updated due to time/selection changes`);
  }, [startTime, endTime, currentTime, duration, updateTooltipPositions]);

  // 🆕 **DRAGGING TOOLTIP UPDATES**: Update tooltips với tần suất cao khi đang drag
  useEffect(() => {
    if (isDragging) {
      // 🔥 **HIGH FREQUENCY UPDATES**: Update tooltips mỗi 16ms khi đang drag để smooth
      const dragTooltipInterval = setInterval(() => {
        updateTooltipPositions();
      }, 16); // 60fps

      console.log(`🏷️ [TooltipDragging] Started high-frequency tooltip updates for smooth dragging`);

      return () => {
        clearInterval(dragTooltipInterval);
        console.log(`🏷️ [TooltipDragging] Stopped high-frequency tooltip updates`);
      };
    }
  }, [isDragging, updateTooltipPositions]);

  // 🔥 **CANVAS SETUP**: Minimal setup với reduced logging
  useEffect(() => {
    let resizeTimeoutRef = null;
    
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      
      const parent = canvas.parentElement;
      const parentWidth = parent.offsetWidth;
      
      // 🔥 RESPONSIVE: Minimum width protection
      const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
      const newWidth = Math.max(minWidth, parentWidth);
      const newHeight = WAVEFORM_CONFIG.HEIGHT;
      
      // 🔥 **ONLY RESIZE**: if dimensions actually changed
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        lastCanvasWidthRef.current = newWidth;
        
        // 🔥 **DEBOUNCED REDRAW**: Prevent resize loops
        if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
        resizeTimeoutRef = setTimeout(() => {
          requestRedraw();
          resizeTimeoutRef = null;
        }, 16);
      }
    };
    
    // 🔥 **DEBOUNCED RESIZE**: Handler
    const handleResize = () => {
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      resizeTimeoutRef = setTimeout(setupCanvas, 100);
    };
    
    setupCanvas();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // 🆕 **HOVER CLEANUP**: Clear hover timeout to prevent memory leaks
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  // 🆕 **VOLUME ANIMATION SYSTEM**: Enhanced responsive volume animation
  useEffect(() => {
    // 🎯 **IMMEDIATE TARGET UPDATE**: Set new target volume immediately
    targetVolumeRef.current = volume;
    
    let animationId = null;
    
    const animateVolume = () => {
      const current = volumeAnimationRef.current;
      const target = targetVolumeRef.current;
      const diff = target - current;
      
      // 🆕 **ULTRA-SENSITIVE**: Animate even tiny volume changes (0.001 threshold)
      if (Math.abs(diff) > 0.001) {
        // 🎯 **ADAPTIVE SPEED**: Faster animation for small changes, smoother for large changes
        const adaptiveSpeed = Math.abs(diff) > 0.1 ? 0.12 : 0.25; // Faster for small changes
        volumeAnimationRef.current = current + diff * adaptiveSpeed;
        setAnimatedVolume(volumeAnimationRef.current); // 🆕 **UPDATE STATE** for dependencies
        
        // 🔊 **ENHANCED LOGGING**: Log ALL volume changes for debugging
        console.log(`🔊 [VolumeAnimation] Animating: ${current.toFixed(3)} → ${target.toFixed(3)} (diff: ${diff.toFixed(3)})`);
        
        // 🎯 **CONTINUE ANIMATION**: Schedule next frame
        animationId = requestAnimationFrame(animateVolume);
      } else {
        // 🎯 **SNAP TO TARGET**: When close enough, snap to target
        volumeAnimationRef.current = target;
        setAnimatedVolume(target); // 🆕 **FINAL UPDATE** to state
        console.log(`✅ [VolumeAnimation] Complete: ${target.toFixed(3)}`);
        animationId = null;
      }
    };
    
    // 🆕 **ALWAYS START ANIMATION**: Remove threshold, animate all changes
    console.log(`🔊 [VolumeAnimation] Starting: ${volumeAnimationRef.current.toFixed(3)} → ${volume.toFixed(3)}`);
    animationId = requestAnimationFrame(animateVolume);
    
    // 🎯 **CLEANUP**: Cancel animation on unmount or volume change
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [volume]);

  // 🆕 **CURSOR INITIALIZATION**: Setup intelligent cursor system when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // 🎯 **INITIAL CURSOR**: Set default cursor when component first loads
      canvas.style.cursor = 'pointer';
      currentCursorRef.current = 'pointer';
      console.log(`🎯 [CursorInit] Initialized canvas cursor system with default: pointer`);
      
      // 🆕 **RESPONSIVE CURSOR UPDATES**: Update cursor when selection changes
      const updateCursorForSelection = () => {
        // If there's no selection yet, keep pointer cursor
        if (startTime >= endTime || duration === 0) {
          if (currentCursorRef.current !== 'pointer') {
            canvas.style.cursor = 'pointer';
            currentCursorRef.current = 'pointer';
            console.log(`🔄 [CursorInit] Updated to pointer - no valid selection`);
          }
        }
      };
      
      updateCursorForSelection();
    }
  }, [canvasRef, startTime, endTime, duration]); // Update when selection changes

  // 🆕 **PORTAL CONTAINER SETUP**: Setup portal container for tooltips
  useEffect(() => {
    // 🎯 **CREATE PORTAL CONTAINER**: Create container at body level for tooltips
    let portalContainer = document.getElementById('waveform-tooltips-portal');
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'waveform-tooltips-portal';
      portalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999999;
        overflow: visible;
      `;
      document.body.appendChild(portalContainer);
      console.log(`🚪 [Portal] Created tooltip portal container`);
    }
    
    tooltipPortalTargetRef.current = portalContainer;
    
    // 🎯 **SCROLL & RESIZE TRACKING**: Update canvas position on scroll/resize for accurate tooltip positioning
    const updatePositionOnScroll = () => {
      updateCanvasPosition();
      updateTooltipPositions();
    };
    
    const updatePositionOnResize = () => {
      setTimeout(() => {
        updateCanvasPosition();
        updateTooltipPositions();
      }, 100); // Small delay for DOM to settle
    };
    
    window.addEventListener('scroll', updatePositionOnScroll, { passive: true });
    window.addEventListener('resize', updatePositionOnResize, { passive: true });
    
    console.log(`📍 [Portal] Setup scroll/resize tracking for tooltips`);
    
    // 🎯 **CLEANUP**: Remove event listeners and portal container
    return () => {
      window.removeEventListener('scroll', updatePositionOnScroll);
      window.removeEventListener('resize', updatePositionOnResize);
      
      // Only remove portal if it exists and no other instances are using it
      if (tooltipPortalTargetRef.current && tooltipPortalTargetRef.current.children.length === 0) {
        document.body.removeChild(tooltipPortalTargetRef.current);
        console.log(`🚪 [Portal] Removed tooltip portal container`);
      }
    };
  }, [updateCanvasPosition, updateTooltipPositions]);

  // 🆕 **TOOLTIP PORTAL COMPONENT**: Component to render tooltips via portal
  const TooltipPortal = useCallback(({ children }) => {
    if (!tooltipPortalTargetRef.current) return null;
    return createPortal(children, tooltipPortalTargetRef.current);
  }, []);

  // �� **VOLUME ANIMATION REDRAW**: Trigger redraw during volume animation
  useEffect(() => {
    // 🎯 **SMOOTH ANIMATION REDRAW**: Request redraw when animated volume changes
    if (renderData) {
      requestRedraw();
    }
  }, [animatedVolume, renderData, requestRedraw]);

  return (
    <div className="relative" style={{ minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px` }}>
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={handleEnhancedMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={handleEnhancedMouseLeave}
        className="w-full border border-slate-200 rounded-lg"
        style={{ 
          height: WAVEFORM_CONFIG.HEIGHT,
          touchAction: 'none', // Prevent scrolling on touch devices
          overflow: 'hidden', // 🚫 **NO CANVAS SCROLLBARS**: Đảm bảo canvas không tạo scrollbar
          // 🆕 **INTELLIGENT CURSOR**: Removed hardcoded cursor - let JavaScript handle it dynamically
        }}
      />
      
      {/* 🆕 **TIME TOOLTIP**: Hover time display - Updated format (RELATIVE POSITIONING) */}
      {hoverPosition && hoverPosition.visible && (
        <div
          className="absolute pointer-events-none text-xs px-2 py-1 rounded font-medium"
          style={{
            left: `${hoverPosition.x}px`,
            top: '-8px', // 8px above canvas
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(71, 85, 105, 0.95)', // Slate color
            color: 'white',
            transition: 'none', // No transition for immediate response
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 30 // 🎯 **HIGH Z-INDEX**: Đảm bảo nổi trên cùng
          }}
        >
          {hoverPosition.formattedTime}
        </div>
      )}

      {/* 🆕 **PORTAL TOOLTIPS**: All handles and cursor tooltips render via portal (ABSOLUTE POSITIONING) */}
      <TooltipPortal>
        {/* 🏷️ **START HANDLE TOOLTIP**: Portal-rendered tooltip cho left handle */}
        {tooltipPositions.startHandle && tooltipPositions.startHandle.visible && (
          <div
            className="pointer-events-none text-xs px-2 py-1 rounded font-medium"
            style={{
              position: 'absolute',
              left: `${tooltipPositions.startHandle.absoluteX}px`,
              top: `${tooltipPositions.startHandle.absoluteY}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(20, 184, 166, 0.95)', // Cyan color như đối thủ
              color: 'white',
              transition: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(6px)',
              zIndex: 999999 // 🆕 **PORTAL Z-INDEX**: Highest possible z-index via portal
            }}
          >
            {tooltipPositions.startHandle.formattedTime}
          </div>
        )}

        {/* 🏷️ **END HANDLE TOOLTIP**: Portal-rendered tooltip cho right handle */}
        {tooltipPositions.endHandle && tooltipPositions.endHandle.visible && (
          <div
            className="pointer-events-none text-xs px-2 py-1 rounded font-medium"
            style={{
              position: 'absolute',
              left: `${tooltipPositions.endHandle.absoluteX}px`,
              top: `${tooltipPositions.endHandle.absoluteY}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(20, 184, 166, 0.95)', // Cyan color như đối thủ
              color: 'white',
              transition: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(6px)',
              zIndex: 999999 // 🆕 **PORTAL Z-INDEX**: Highest possible z-index via portal
            }}
          >
            {tooltipPositions.endHandle.formattedTime}
          </div>
        )}

        {/* 🏷️ **CURSOR TOOLTIP**: Portal-rendered tooltip cho cursor line */}
        {tooltipPositions.cursor && tooltipPositions.cursor.visible && (
          <div
            className="pointer-events-none text-xs px-2 py-1 rounded font-medium"
            style={{
              position: 'absolute',
              left: `${tooltipPositions.cursor.absoluteX}px`,
              top: `${tooltipPositions.cursor.absoluteY}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)', // Trắng như đối thủ
              color: 'rgba(30, 41, 59, 0.9)', // Dark text
              transition: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              zIndex: 999999 // 🆕 **PORTAL Z-INDEX**: Highest possible z-index via portal
            }}
          >
            {tooltipPositions.cursor.formattedTime}
          </div>
        )}

        {/* 🏷️ **SELECTION DURATION TOOLTIP**: Portal-rendered tooltip TRONG waveform - TEXT ONLY */}
        {tooltipPositions.selectionDuration && tooltipPositions.selectionDuration.visible && (
          <div
            className="pointer-events-none text-sm font-semibold"
            style={{
              position: 'absolute',
              left: `${tooltipPositions.selectionDuration.absoluteX}px`,
              top: `${tooltipPositions.selectionDuration.absoluteY}px`,
              transform: 'translateX(-50%)',
              // 🚫 **NO BACKGROUND**: Removed background, border, shadow for clean text-only display
              color: 'rgba(30, 41, 59, 0.9)', // Dark text for good contrast
              transition: 'none',
              whiteSpace: 'nowrap',
              // 🎯 **TEXT SHADOW**: Subtle text shadow for readability on waveform background
              textShadow: '0 1px 2px rgba(255, 255, 255, 0.8), 0 -1px 1px rgba(0, 0, 0, 0.2)',
              fontWeight: '600', // Slightly bolder for better visibility
              zIndex: 999999 // 🆕 **PORTAL Z-INDEX**: Highest possible z-index via portal
            }}
          >
            {tooltipPositions.selectionDuration.formattedDuration}
          </div>
        )}
      </TooltipPortal>
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;