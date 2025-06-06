// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo } from 'react';
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
  const debugLogTimeRef = useRef(0); // 🆕 Control debug logging frequency
  const renderCountRef = useRef(0); // 🆕 Track render count

  // 🆕 DEBUG: Component render tracking
  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    
    // 🆕 Log render info every 2 seconds to prevent spam
    if (now - debugLogTimeRef.current > 2000) {
      console.log(`🔄 [WaveformCanvas] Render #${renderCountRef.current}`, {
        waveformDataLength: waveformData.length,
        duration: duration.toFixed(2),
        timeRange: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
        isPlaying,
        isDragging: isDragging || 'none',
        hoveredHandle: hoveredHandle || 'none'
      });
      debugLogTimeRef.current = now;
    }
  });

  // 🎯 ENHANCED: Smart waveform sampling with debug throttling
  const adaptiveWaveformData = useMemo(() => {
    console.log('📊 [WaveformCanvas] Calculating adaptive waveform data...');
    
    if (!waveformData.length) return [];
    
    const canvas = canvasRef.current;
    if (!canvas) return waveformData;
    
    const canvasWidth = canvas.width || 800; // fallback width
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
      
      // 🆕 THROTTLED DEBUG: Only log significant changes
      const now = performance.now();
      if (now - debugLogTimeRef.current > 1000 || !isInitializedRef.current) {
        console.log(`📊 [Responsive] Canvas:${currentWidth}px, Rule:${rule.samplesPerPx}spp, Original:${waveformData.length} → Adapted:${finalSamples} samples`);
        debugLogTimeRef.current = now;
      }
      return adaptedData;
    }
    
    return waveformData;
  }, [waveformData, canvasRef]);

  // 🎯 OPTIMIZED: Render data with stable hash generation
  const renderData = useMemo(() => {
    console.log('🎯 [WaveformCanvas] Calculating render data...');
    
    if (!adaptiveWaveformData.length || duration === 0) {
      console.log('⚠️ [WaveformCanvas] No render data - missing waveform or duration');
      return null;
    }
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    
    // 🆕 STABLE HASH: Use rounded values to prevent excessive re-calculations
    const stableStartTime = Math.round(startTime * 100) / 100;
    const stableEndTime = Math.round(endTime * 100) / 100;
    const stableDuration = Math.round(duration * 100) / 100;
    
    const data = {
      waveformData: adaptiveWaveformData,
      duration: stableDuration,
      startTime: stableStartTime,
      endTime: stableEndTime,
      hoveredHandle,
      isDragging,
      canvasWidth,
      dataHash: `${adaptiveWaveformData.length}-${stableDuration}-${stableStartTime}-${stableEndTime}-${hoveredHandle || 'none'}-${isDragging || 'none'}-${canvasWidth}`
    };
    
    // 🆕 ENHANCED LOGGING: Log render data changes
    const isNewData = !lastRenderDataRef.current || lastRenderDataRef.current.dataHash !== data.dataHash;
    if (isNewData) {
      console.log('✅ [WaveformCanvas] Render data updated:', {
        hash: data.dataHash,
        samples: data.waveformData.length,
        timeRange: `${data.startTime.toFixed(2)}s - ${data.endTime.toFixed(2)}s`,
        canvasSize: `${data.canvasWidth}px`,
        state: {
          hoveredHandle: data.hoveredHandle || 'none',
          isDragging: data.isDragging || 'none'
        }
      });
      lastRenderDataRef.current = data;
    } else {
      console.log('🔄 [WaveformCanvas] Render data unchanged, skipping update');
    }
    
    return data;
  }, [adaptiveWaveformData, duration, startTime, endTime, hoveredHandle, isDragging, canvasRef]);

  // 🎯 ENHANCED: Drawing function with performance optimizations
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🎯 RESPONSIVE DEBUG: Log canvas dimensions changes only
    if (width !== lastCanvasWidthRef.current) {
      setTimeout(() => {
        console.log(`📐 [Responsive] Canvas size changed: ${lastCanvasWidthRef.current}px → ${width}px`);
      }, 0);
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
    
    // 2. 🎯 RESPONSIVE WAVEFORM BARS
    const { waveformData, duration, startTime, endTime } = renderData;
    const centerY = height / 2;
    
    // 🎯 SMART BAR WIDTH CALCULATION
    const rawBarWidth = width / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    const barWidth = Math.max(minBarWidth, rawBarWidth);
    const useOptimizedSpacing = rawBarWidth < minBarWidth;
    
    // 🆕 THROTTLED LOGGING: Move out of render and throttle
    if (!isInitializedRef.current) {
      setTimeout(() => {
        console.log(`📊 [Bars] Width:${width}px, Samples:${waveformData.length}, rawBarWidth:${rawBarWidth.toFixed(2)}px, finalBarWidth:${barWidth.toFixed(2)}px, optimized:${useOptimizedSpacing}`);
      }, 0);
      isInitializedRef.current = true;
    }
    
    // 🎯 PERFORMANCE: Batch draw operations
    ctx.save();
    
    if (useOptimizedSpacing) {
      // 🎯 SMALL SCREENS: Fill entire width with evenly spaced bars
      const totalBarSpace = width;
      const spacing = totalBarSpace / waveformData.length;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const barHeight = Math.max(2, (value * height) / 2); // Minimum 2px height
        const x = i * spacing;
        const barTime = (i / waveformData.length) * duration;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with guaranteed visibility
        ctx.fillRect(Math.floor(x), centerY - barHeight, minBarWidth, barHeight * 2);
      }
    } else {
      // 🎯 LARGE SCREENS: Normal spacing with calculated bar width
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i];
        const barHeight = Math.max(2, (value * height) / 2); // Minimum 2px height
        const x = i * barWidth;
        const barTime = (i / waveformData.length) * duration;
        
        // Selection-based coloring
        const isInSelection = barTime >= startTime && barTime <= endTime;
        ctx.fillStyle = isInSelection ? '#8b5cf6' : '#cbd5e1';
        
        // Draw bar with optimized width (small gap between bars for definition)
        const drawWidth = Math.max(1, barWidth - 0.3);
        ctx.fillRect(Math.floor(x), centerY - barHeight, drawWidth, barHeight * 2);
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
    
    // 5. 🎯 Playback cursor - only draw if position is valid
    if (duration > 0) {
      const cursorX = (currentTime / duration) * width;
      
      // Cursor line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isPlaying ? 3 : 0;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Cursor triangle
      const triangleSize = 5;
      ctx.fillStyle = isPlaying ? '#f59e0b' : '#f97316';
      ctx.beginPath();
      ctx.moveTo(cursorX - triangleSize, 0);
      ctx.lineTo(cursorX + triangleSize, 0);
      ctx.lineTo(cursorX, triangleSize * 2);
      ctx.closePath();
      ctx.fill();
    }
  }, [canvasRef, renderData, currentTime, isPlaying]);

  // 🎯 OPTIMIZED: Smart redraw system with better frame management
  const requestRedraw = useCallback(() => {
    // 🎯 Cancel previous frame to prevent stacking
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      // 🎯 Context-aware throttling
      let minInterval;
      if (isDragging) {
        minInterval = 8;   // 120fps for smooth dragging
      } else if (isPlaying) {
        minInterval = 16;  // 60fps for playback
      } else {
        minInterval = 33;  // 30fps for static UI (reduced from 50)
      }
      
      // 🎯 Time-based throttling
      if (timestamp - lastDrawTimeRef.current >= minInterval) {
        drawWaveform();
        lastDrawTimeRef.current = timestamp;
        
        // 🆕 THROTTLED DEBUG: Only log during significant state changes
        if ((isDragging || isPlaying) && (timestamp % 500 < 16)) { // Every 500ms during action
          const fps = 1000 / (timestamp - lastDrawTimeRef.current + minInterval);
          setTimeout(() => {
            console.log('🎯 [WaveformCanvas] Frame:', fps.toFixed(1) + 'fps', isDragging ? 'DRAG' : isPlaying ? 'PLAY' : 'STATIC');
          }, 0);
        }
      }
      
      animationFrameRef.current = null;
    });
  }, [drawWaveform, isDragging, isPlaying]);

  // 🎯 ENHANCED: Canvas setup with stable dependencies
  useEffect(() => {
    let resizeTimeoutRef = null;
    
    const setupCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      
      const parent = canvas.parentElement;
      const parentWidth = parent.offsetWidth;
      
      // 🎯 RESPONSIVE: Minimum width protection
      const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
      const newWidth = Math.max(minWidth, parentWidth);
      const newHeight = WAVEFORM_CONFIG.HEIGHT;
      
      // 🎯 Only resize if dimensions actually changed
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        setTimeout(() => {
          console.log(`📐 [Canvas Setup] Parent:${parentWidth}px → Canvas:${newWidth}px x ${newHeight}px (min:${minWidth}px)`);
        }, 0);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // 🎯 Update canvas width reference
        lastCanvasWidthRef.current = newWidth;
        
        // 🎯 Debounced redraw to prevent resize loops
        if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
        resizeTimeoutRef = setTimeout(() => {
          requestRedraw();
          resizeTimeoutRef = null;
        }, 16); // Single frame delay
      }
    };
    
    // 🎯 Debounced resize handler
    const handleResize = () => {
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      resizeTimeoutRef = setTimeout(setupCanvas, 100);
    };
    
    // 🎯 Initial setup
    setupCanvas();
    
    // 🎯 Window resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []); // 🎯 Empty dependency array to prevent loops

  // 🎯 OPTIMIZED: Stable redraw trigger with debouncing
  useEffect(() => {
    // 🎯 Only redraw if renderData actually changed and avoid rapid re-triggers
    if (renderData) {
      const timeoutId = setTimeout(requestRedraw, 0); // Next tick to avoid render cycle issues
      return () => clearTimeout(timeoutId);
    }
  }, [renderData, requestRedraw]);

  // 🎯 OPTIMIZED: Cursor update with performance improvements
  useEffect(() => {
    if (isPlaying && renderData) {
      // 🆕 Throttle cursor updates during playback to every other frame
      const timeoutId = setTimeout(requestRedraw, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [currentTime, isPlaying, renderData, requestRedraw]);

  return (
    <div className="relative" style={{ minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full border border-slate-200 rounded-lg cursor-crosshair"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ 
          height: WAVEFORM_CONFIG.HEIGHT,
          minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px`
        }}
      />
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;