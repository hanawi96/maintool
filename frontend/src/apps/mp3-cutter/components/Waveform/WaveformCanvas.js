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
  
  // 🔥 **FIX INFINITE LOOP**: Refs cho tracking không gây re-render  
  const debugLogTimeRef = useRef(0);
  const renderCountRef = useRef(0);
  const lastLoggedDataRef = useRef(null);
  const setupCompleteRef = useRef(false);

  // 🔥 **SMART RENDER TRACKING**: Passive tracking không gây setState
  const trackRender = useCallback(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    
    // 🔥 **THROTTLED SETUP LOG**: Chỉ log setup lần đầu để tránh spam
    if (!setupCompleteRef.current && waveformData.length > 0 && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log('🎨 [WaveformCanvas] Initial setup complete:', {
          waveformLength: waveformData.length,
          duration: duration.toFixed(1) + 's',
          renderCount: renderCountRef.current
        });
      }, 0);
    }
    
    // 🔥 **PERIODIC STATUS**: Log trạng thái mỗi 30s để debug
    if (now - debugLogTimeRef.current > 30000) {
      debugLogTimeRef.current = now;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log(`📊 [WaveformCanvas] Status check (30s interval):`, {
          renders: renderCountRef.current,
          isPlaying,
          hasData: waveformData.length > 0,
          currentTime: currentTime.toFixed(1) + 's'
        });
      }, 0);
    }
  }, [waveformData.length, duration, isPlaying, currentTime]);

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
      
      // 🔥 **MINIMAL LOGGING**: Chỉ log khi setup lần đầu và async
      if (!isInitializedRef.current) {
        setTimeout(() => {
          console.log(`📊 [WaveformCanvas] Adaptive sampling: ${waveformData.length} → ${finalSamples} samples`);
        }, 0);
      }
      return adaptedData;
    }
    
    return waveformData;
  }, [waveformData, canvasRef]);

  // 🔥 **STABLE RENDER DATA**: Giảm re-calculation và logging
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
    
    // 🔥 **ASYNC LOGGING**: Chỉ log khi hash thay đổi và async để tránh render conflict
    const isNewData = !lastRenderDataRef.current || lastRenderDataRef.current.dataHash !== data.dataHash;
    if (isNewData) {
      lastRenderDataRef.current = data;
      
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      if (!lastLoggedDataRef.current || lastLoggedDataRef.current !== data.dataHash) {
        lastLoggedDataRef.current = data.dataHash;
        setTimeout(() => {
          console.log('🎯 [WaveformCanvas] Data updated:', data.dataHash.split('-').slice(0, 3).join('-'));
        }, 0);
      }
    }
    
    return data;
  }, [adaptiveWaveformData, duration, startTime, endTime, hoveredHandle, isDragging, canvasRef]);

  // 🎯 ENHANCED: Drawing function with performance optimizations
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🎯 RESPONSIVE DEBUG: Log canvas dimensions changes only - ASYNC
    if (width !== lastCanvasWidthRef.current) {
      const oldWidth = lastCanvasWidthRef.current;
      lastCanvasWidthRef.current = width;
      
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log(`📐 [Responsive] Canvas size changed: ${oldWidth}px → ${width}px`);
      }, 0);
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
    
    // 🔥 **ASYNC LOGGING**: Move out of render and async
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
      setTimeout(() => {
        console.log(`📊 [Bars] Width:${width}px, Samples:${waveformData.length}, rawBarWidth:${rawBarWidth.toFixed(2)}px, finalBarWidth:${barWidth.toFixed(2)}px, optimized:${useOptimizedSpacing}`);
      }, 0);
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
    
    // 5. 🔥 **CLEAN CURSOR**: Slim 2px cursor as requested
    if (duration > 0 && currentTime >= 0) {
      const cursorX = (currentTime / duration) * width;
      
      // 🔥 **CURSOR DEBUG**: Log cursor position when playing - THROTTLED & ASYNC
      if (isPlaying && Math.floor(performance.now()) % 5000 < 16) {
        // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
        setTimeout(() => {
          console.log(`🎯 [Cursor] 2px cursor at ${cursorX.toFixed(1)}px (${currentTime.toFixed(2)}s/${duration.toFixed(2)}s)`);
        }, 0);
      }
      
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
  }, [canvasRef, renderData, currentTime, isPlaying]);

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
        
        // 🔥 **CURSOR DEBUG**: Log cursor updates when playing - THROTTLED & ASYNC
        if (isPlaying && Math.floor(timestamp) % 2000 < 16) {
          // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
          setTimeout(() => {
            console.log('🎨 [WaveformCanvas] Cursor redraw @', (timestamp/1000).toFixed(1) + 's');
          }, 0);
        }
      }
      
      animationFrameRef.current = null;
    });
  }, [drawWaveform, isDragging, isPlaying]);

  // 🔥 **RESPONSIVE CURSOR**: High-frequency cursor updates for smooth movement
  useEffect(() => {
    if (isPlaying && renderData && duration > 0) {
      // 🔥 **IMMEDIATE REDRAW**: Không delay cho cursor movement
      requestRedraw();
      
      // 🔥 **ASYNC LOG**: Debug info async để tránh render conflict
      if (Math.floor(performance.now()) % 1000 < 16) {
        setTimeout(() => {
          console.log('🎯 [WaveformCanvas] Cursor update triggered:', {
            currentTime: currentTime.toFixed(2) + 's',
            isPlaying,
            hasRenderData: !!renderData
          });
        }, 0);
      }
    }
  }, [currentTime, isPlaying, renderData, requestRedraw, duration]);

  // 🔥 **STABLE REDRAW**: Minimal re-triggers for non-cursor updates
  useEffect(() => {
    if (renderData && !isPlaying) {
      // 🔥 **STATIC UPDATES**: Chỉ khi không playing để tránh conflict
      const timeoutId = setTimeout(requestRedraw, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [renderData, requestRedraw, isPlaying]);

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
        
        // 🔥 **MINIMAL LOG**: Chỉ log setup lần đầu và async
        if (!isInitializedRef.current) {
          // 🔥 **ASYNC LOG**: Đưa ra khỏi render cycle
          setTimeout(() => {
            console.log(`📐 [WaveformCanvas] Canvas setup: ${newWidth}px x ${newHeight}px`);
          }, 0);
        }
        
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
    };
  }, []); // 🔥 **EMPTY DEPS**: Prevent loops

  // 🔥 **PASSIVE RENDER TRACKING**: Track render chỉ để debug, không gây re-render
  useEffect(() => {
    trackRender();
  });

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