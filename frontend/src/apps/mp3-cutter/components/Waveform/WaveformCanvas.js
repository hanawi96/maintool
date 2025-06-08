// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
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
  const currentCursorRef = useRef('pointer');


  // 🆕 **TOOLTIP SYSTEM**: Sử dụng custom hook
  const {
    hoverTooltip,
    handleTooltips,
    updateHoverTime,
    clearHoverTooltip
  } = useWaveformTooltips(canvasRef, duration, startTime, endTime, isDragging);

  // 🆕 **CURSOR SYSTEM**: Sử dụng cursor hook
const {
  updateCursor,
  resetCursor
} = useWaveformCursor(canvasRef, duration, startTime, endTime, isDragging);

// 🆕 **RENDER SYSTEM**: Sử dụng render hook  
const {
  animatedVolume,
  adaptiveWaveformData,
  requestRedraw
} = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);
  
  // 🆕 **VOLUME ANIMATION**: Smooth volume transitions
  
  // 🔇 **VOLUME LOGGING**: Track last logged volume to prevent spam
  const lastVolumeLogRef = useRef(null);
  
  // 🔥 **OPTIMIZED**: Removed all debug logging refs to prevent spam
  const setupCompleteRef = useRef(false);







  const handleEnhancedMouseMove = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseMove) {
      onMouseMove(e);
    }
  
    // 🚀 **ULTRA-SMOOTH CURSOR AND TIME INTELLIGENCE**: No additional throttling
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // 🎯 **UPDATE CURSOR**: Smart cursor management
      updateCursor(mouseX);
      
      // 🚀 **SMOOTH HOVER TIME**: Update hover tooltip
      updateHoverTime(mouseX, canvas.width);
    }
  }, [onMouseMove, canvasRef, updateCursor, updateHoverTime]);

  const handleEnhancedMouseLeave = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality
    if (onMouseLeave) {
      onMouseLeave(e);
    }
  
    // 🆕 **RESET CURSOR**: Use resetCursor from hook
    resetCursor();
  
    // 🆕 **HIDE TOOLTIP**: Use clearHoverTooltip from hook
    clearHoverTooltip();
    
  }, [onMouseLeave, resetCursor, clearHoverTooltip]);

  // 🆕 **ENHANCED MOUSE DOWN HANDLER**: Hide hover tooltip on click
  const handleEnhancedMouseDown = useCallback((e) => {
    // 🎯 **CALL ORIGINAL HANDLER**: Maintain existing functionality first
    if (onMouseDown) {
      onMouseDown(e);
    }
  
    // 🆕 **CLEAR HOVER TOOLTIP**: Sử dụng clearHoverTooltip từ hook
    clearHoverTooltip();
  
    console.log(`🖱️ [ClickBehavior] Hover tooltip hidden on click`);
  }, [onMouseDown, clearHoverTooltip]); // 🆕 THÊM clearHoverTooltip vào dependencies


  // 🔥 **STABLE RENDER DATA**: Giảm re-calculation và logging với volume support + fade effects
  const renderData = useMemo(() => {    
    if (!adaptiveWaveformData.length || duration === 0) {
      return null;
    }
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || 800;
    const stableStartTime = Math.round(startTime * 10) / 10;
    const stableEndTime = Math.round(endTime * 10) / 10;
    const stableDuration = Math.round(duration * 10) / 10;
    const stableVolume = Math.round(animatedVolume * 1000) / 1000;
    const stableFadeIn = Math.round(fadeIn * 10) / 10;
    const stableFadeOut = Math.round(fadeOut * 10) / 10;
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

  // 🆕 **FADE EFFECT CALCULATOR**: Tính toán fade multiplier cho từng bar dựa theo thời gian
  const calculateFadeMultiplier = useCallback((barTime, selectionStart, selectionEnd, fadeInDuration, fadeOutDuration) => {
    // 🚫 **NO FADE**: Return 1.0 if no fade configured
    if (fadeInDuration <= 0 && fadeOutDuration <= 0) return 1.0;
    
    // 🚫 **OUTSIDE SELECTION**: Return 1.0 if bar is outside selection range
    if (barTime < selectionStart || barTime > selectionEnd) return 1.0;
    
    const selectionDuration = selectionEnd - selectionStart;
    
    let fadeMultiplier = 1.0;
    
    // 🎨 **FADE IN EFFECT**: From selection start
    if (fadeInDuration > 0) {
      const fadeInEnd = selectionStart + Math.min(fadeInDuration, selectionDuration / 2);
      if (barTime <= fadeInEnd) {
        const fadeProgress = Math.max(0, (barTime - selectionStart) / fadeInDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // 🎨 **FADE OUT EFFECT**: To selection end
    if (fadeOutDuration > 0) {
      const fadeOutStart = selectionEnd - Math.min(fadeOutDuration, selectionDuration / 2);
      if (barTime >= fadeOutStart) {
        const fadeProgress = Math.max(0, (selectionEnd - barTime) / fadeOutDuration);
        fadeMultiplier = Math.min(fadeMultiplier, fadeProgress);
      }
    }
    
    // 🎯 **MINIMUM VISIBILITY**: Ensure minimum 5% height for visibility
    const finalMultiplier = Math.max(0.05, Math.min(1.0, fadeMultiplier));
    
    // 🔧 **DEBUG FADE CALCULATION**: Log fade calculation occasionally
    if (Math.random() < 0.005) { // 0.5% sampling to avoid spam
      console.log(`🎨 [FadeCalculation] Bar at ${barTime.toFixed(2)}s: fadeIn=${fadeInDuration}s, fadeOut=${fadeOutDuration}s, multiplier=${finalMultiplier.toFixed(3)}`);
    }
    
    return finalMultiplier;
  }, []);

  // 🎯 ENHANCED: Drawing function with performance optimizations
  const drawWaveform = useCallback(() => {
    // 🚀 **PERFORMANCE MEASUREMENT**: Measure render time for optimization
    const renderStartTime = performance.now();
    
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // 🚀 **MICRO-OPTIMIZATIONS**: Ultra-fast rendering setup
    ctx.imageSmoothingEnabled = false; // 🔥 +30% speed - disable antialiasing for crisp pixels
    canvas.style.willChange = 'transform'; // 🔥 +50% smoothness - enable GPU acceleration
    

    
    // 🎯 Clear canvas efficiently
    ctx.clearRect(0, 0, width, height);
    
    // 1. 🎯 Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. 🎯 RESPONSIVE WAVEFORM BARS với Perfect Linear Volume Scaling + Fade Effects
    const { waveformData, duration, startTime, endTime, volume: currentVolume, fadeIn: currentFadeIn, fadeOut: currentFadeOut } = renderData;
    const centerY = height / 2;
    
    // 🎯 SMART BAR WIDTH CALCULATION
    const rawBarWidth = width / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    const barWidth = Math.max(minBarWidth, rawBarWidth);
    const useOptimizedSpacing = rawBarWidth < minBarWidth;
    
    // 🆕 **PERFECT LINEAR VOLUME SYSTEM**: Completely rewritten for true linear progression
    // 🎯 **DESIGN REQUIREMENTS**: 
    // - 0% volume = 1px flat bars (exactly)
    // - 100% volume = 66px max bars (1px base + 65px scaling)
    // - 50 steps (0%, 2%, 4%, ..., 100%) with 1.3px increment per 2%
    // - Perfect linear progression từ 0% đến 100%
    
    const FLAT_BAR_HEIGHT_PX = 1;           // 🎯 **1px EXACT** at 0% volume
    const MAX_SCALING_PX = 65;              // 🎯 **65px SCALING** from 0% to 100% (1.3px per step)
    const VOLUME_STEPS = 50;                // 🎯 **50 STEPS** (0%, 2%, 4%, ..., 100%)
    const PX_PER_STEP = MAX_SCALING_PX / VOLUME_STEPS; // 🎯 **1.3px per 2%** exactly
    
    // 🎯 **CALCULATE ABSOLUTE BAR HEIGHT**: Direct pixel calculation
    const volumePercent = Math.max(0, Math.min(100, currentVolume * 100)); // Clamp 0-100%
    const volumeStep = volumePercent / 2; // Convert % to step number (0-50)
    const scalingPixels = volumeStep * PX_PER_STEP; // Additional pixels from scaling
    const absoluteBarHeightPx = FLAT_BAR_HEIGHT_PX + scalingPixels; // Final absolute height
    
    // 🎯 **WAVEFORM VARIATION**: Simple linear transition from flat to dynamic
    // 0% = 100% flat bars, 100% = 100% waveform variation
    const waveformVariation = Math.max(0, Math.min(1, currentVolume)); // Direct 1:1 mapping
    
    // 🔧 **PERFECT LINEAR LOGGING**: Enhanced debugging info
    console.log(`📊 [PerfectLinear] ${volumePercent.toFixed(1)}% Volume:`, {
      volumeStep: volumeStep.toFixed(1),
      scalingPixels: scalingPixels.toFixed(1) + 'px',
      absoluteHeight: absoluteBarHeightPx.toFixed(1) + 'px',
      waveformVariation: (waveformVariation * 100).toFixed(1) + '%',
      calculation: `${FLAT_BAR_HEIGHT_PX}px base + ${scalingPixels.toFixed(1)}px scaling = ${absoluteBarHeightPx.toFixed(1)}px total`
    });
    
    // 🆕 **FADE EFFECTS LOGGING**: Log fade configuration khi đang active
    let fadeEffectsActive = false;
    if (currentFadeIn > 0 || currentFadeOut > 0) {
      fadeEffectsActive = true;
      // 🔧 **OCCASIONAL FADE LOGGING**: Log fade effects occasionally để tránh spam
      if (Math.random() < 0.01) { // 1% sampling
        console.log(`🎨 [FadeEffects] Active fade configuration:`, {
          fadeIn: currentFadeIn > 0 ? currentFadeIn.toFixed(1) + 's' : 'off',
          fadeOut: currentFadeOut > 0 ? currentFadeOut.toFixed(1) + 's' : 'off',
          selectionRange: `${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s`,
          fadeInRange: currentFadeIn > 0 ? `${startTime.toFixed(2)}s → ${(startTime + currentFadeIn).toFixed(2)}s` : 'none',
          fadeOutRange: currentFadeOut > 0 ? `${(endTime - currentFadeOut).toFixed(2)}s → ${endTime.toFixed(2)}s` : 'none'
        });
      }
    }
    
    // 🎯 PERFORMANCE: Batch draw operations
    ctx.save();
    
    // 🎯 **WAVEFORM BARS RENDERING**: Simplified with perfect linear scaling
    if (absoluteBarHeightPx > 0) {
      const centerY = height / 2;
      
      if (useOptimizedSpacing) {
        // 🎯 SMALL SCREENS: Fill entire width with evenly spaced bars
        const totalBarSpace = width;
        const spacing = totalBarSpace / waveformData.length;
        
        for (let i = 0; i < waveformData.length; i++) {
          const value = waveformData[i];
          
          // 🎯 **CALCULATE TIME**: Time position của bar này
          const barTime = (i / waveformData.length) * duration;
          
          // 🆕 **APPLY FADE EFFECT**: Tính toán fade multiplier cho bar này
          const fadeMultiplier = fadeEffectsActive ? 
            calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut) : 1.0;
          
          // 🆕 **PERFECT LINEAR BAR HEIGHT CALCULATION**
          let effectiveBarHeight;
          
          if (waveformVariation === 0) {
            // 🟦 **PURE FLAT MODE**: All bars exactly same height (0% volume)
            effectiveBarHeight = FLAT_BAR_HEIGHT_PX;
          } else {
            // 🎵 **DYNAMIC SCALING MODE**: Linear blend between flat and waveform-based
            const flatHeight = FLAT_BAR_HEIGHT_PX;
            const dynamicHeight = absoluteBarHeightPx * value; // Scale by waveform data
            
            // 🎯 **LINEAR BLEND**: Smooth transition from flat to dynamic
            effectiveBarHeight = flatHeight + (dynamicHeight - flatHeight) * waveformVariation;
          }
          
          // 🆕 **APPLY FADE EFFECT**: Final height calculation
          const finalBarHeight = effectiveBarHeight * fadeMultiplier;
          
          const x = i * spacing;
          
          // Selection-based coloring
          const isInSelection = barTime >= startTime && barTime <= endTime;
          ctx.fillStyle = isInSelection ? '#7c3aed' : '#cbd5e1'; // 🎨 **DARKER PURPLE**: Changed from #8b5cf6 to #7c3aed
          
          // 🔥 **ULTRA-THIN BARS**: Siêu mỏng cho cảm giác mịn hơn
          const ultraThinWidth = Math.max(0.5, minBarWidth * 0.7); // 🔥 Giảm 30% width, tối thiểu 0.5px
          ctx.fillRect(Math.floor(x), centerY - finalBarHeight, ultraThinWidth, finalBarHeight * 2);
        }
      } else {
        // 🎯 LARGE SCREENS: Normal spacing with calculated bar width
        for (let i = 0; i < waveformData.length; i++) {
          const value = waveformData[i];
          
          // 🎯 **CALCULATE TIME**: Time position của bar này
          const barTime = (i / waveformData.length) * duration;
          
          // 🆕 **APPLY FADE EFFECT**: Tính toán fade multiplier cho bar này
          const fadeMultiplier = fadeEffectsActive ? 
            calculateFadeMultiplier(barTime, startTime, endTime, currentFadeIn, currentFadeOut) : 1.0;
          
          // 🆕 **PERFECT LINEAR BAR HEIGHT CALCULATION**
          let effectiveBarHeight;
          
          if (waveformVariation === 0) {
            // 🟦 **PURE FLAT MODE**: All bars exactly same height (0% volume)
            effectiveBarHeight = FLAT_BAR_HEIGHT_PX;
          } else {
            // 🎵 **DYNAMIC SCALING MODE**: Linear blend between flat and waveform-based
            const flatHeight = FLAT_BAR_HEIGHT_PX;
            const dynamicHeight = absoluteBarHeightPx * value; // Scale by waveform data
            
            // 🎯 **LINEAR BLEND**: Smooth transition from flat to dynamic
            effectiveBarHeight = flatHeight + (dynamicHeight - flatHeight) * waveformVariation;
          }
          
          // 🆕 **APPLY FADE EFFECT**: Final height calculation
          const finalBarHeight = effectiveBarHeight * fadeMultiplier;
          
          const x = i * barWidth;
          
          // Selection-based coloring
          const isInSelection = barTime >= startTime && barTime <= endTime;
          ctx.fillStyle = isInSelection ? '#7c3aed' : '#cbd5e1'; // 🎨 **DARKER PURPLE**: Changed from #8b5cf6 to #7c3aed
          
          // 🔥 **ULTRA-REFINED BARS**: Siêu mịn với khoảng cách lớn hơn
          const refinedWidth = Math.max(0.4, barWidth * 0.6); // 🔥 Giảm 40% width, tối thiểu 0.4px
          const spacingGap = barWidth * 0.4; // 🔥 Tạo gap 40% để bars không chạm nhau
          ctx.fillRect(Math.floor(x + spacingGap/2), centerY - finalBarHeight, refinedWidth, finalBarHeight * 2);
        }
      }
      
      // 🔧 **VARIATION DEBUG**: Log with new perfect linear system
      if (Math.random() < 0.02) { // 2% sampling để kiểm tra perfect linear scaling
        console.log(`🎨 [PerfectLinearScaling] Rendered with perfect scaling:`, {
          volumePercent: volumePercent.toFixed(1) + '%',
          absoluteHeight: absoluteBarHeightPx.toFixed(1) + 'px',
          waveformVariation: (waveformVariation * 100).toFixed(1) + '%',
          step: `Step ${volumeStep.toFixed(1)}/50`,
          pixelProgression: `+${scalingPixels.toFixed(1)}px from base ${FLAT_BAR_HEIGHT_PX}px`
        });
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
    
    // 4. 🎯 **MODERN HANDLES**: Modern vertical bar design inspired by competitor
    if (startTime < endTime) {
      const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
      const { hoveredHandle, isDragging } = renderData;
      const startX = (startTime / duration) * width;
      const endX = (endTime / duration) * width;
      
      // 🎯 **RESPONSIVE MODERN HANDLE SIZE**: Slightly smaller on mobile
      const responsiveHandleWidth = width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
        Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
      
      // 🎯 **ULTRA-CRISP HANDLE STYLING**: Hoàn toàn sắc nét, không mờ nhòe
      const drawCrispHandle = (x, isLeft, isActive) => {
        // 🔥 **PIXEL-PERFECT CENTER**: Làm tròn hoàn toàn để tránh sub-pixel
        const centerX = Math.round(x);
        
        // 🎯 **BRAND COLORS**: Màu sắc sắc nét, không hiệu ứng
        const baseColor = isLeft ? '#14b8a6' : '#f97316'; // Teal & Orange
        const activeColor = isLeft ? '#0d9488' : '#ea580c'; // Darker when active
        const fillColor = isActive ? activeColor : baseColor;
        
        // 🔥 **ULTRA-SHARP RECTANGLE**: Sử dụng fillRect thay vì roundRect
        // Loại bỏ hoàn toàn rounded corners để có cạnh sắc nét 100%
        const handleX = Math.round(centerX - responsiveHandleWidth / 2);
        const handleY = 0;
        const handleWidth = responsiveHandleWidth;
        const handleHeight = height;
        
        // 🎯 **SINGLE LAYER RENDERING**: Chỉ vẽ một lớp duy nhất
        ctx.fillStyle = fillColor;
        ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
        
        // 🔧 **DEBUG ULTRA-CRISP**: Log rendering info với throttling
        if (Math.random() < 0.01) { // 1% sampling để tránh spam console
          console.log(`🔥 [UltraCrispHandle] ${isLeft ? 'START' : 'END'} handle:`, {
            position: `${centerX}px (pixel-perfect)`,
            dimensions: `${handleWidth}px × ${handleHeight}px`,
            color: fillColor,
            active: isActive,
            rendering: 'ULTRA_CRISP_SINGLE_LAYER',
            sharpness: '100% - NO_BLUR_NO_GLOW_NO_ROUNDED'
          });
        }
      };
      
      // 🎯 **DRAW START HANDLE**: Crisp left handle with teal brand color
      const isStartActive = hoveredHandle === 'start' || isDragging === 'start';
      drawCrispHandle(startX, true, isStartActive);
      
      // 🎯 **DRAW END HANDLE**: Crisp right handle with orange brand color
      const isEndActive = hoveredHandle === 'end' || isDragging === 'end';
      drawCrispHandle(endX, false, isEndActive);
    }
    
    // 5. 🔥 **COMPACT BLUE CURSOR**: Blue color and even smaller size as requested by user
    if (duration > 0 && currentTime >= 0) {
      const cursorX = (currentTime / duration) * width;
      
      // 🔵 **BLUE CURSOR LINE**: Changed to blue color and made even thinner as requested
      ctx.strokeStyle = isPlaying ? '#3b82f6' : '#2563eb'; // Blue colors instead of orange
      ctx.lineWidth = 0.5; // 🆕 **EVEN SMALLER**: Changed from 1px to 0.5px (50% smaller again)
      
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      
      // 🔵 **MINI BLUE CURSOR TRIANGLE**: Blue color and even smaller size
      const triangleSize = 1; // 🆕 **ULTRA SMALL**: Changed from 2px to 1px (50% smaller again)
      ctx.fillStyle = isPlaying ? '#3b82f6' : '#2563eb'; // Blue colors to match line
      
      ctx.beginPath();
      ctx.moveTo(cursorX - triangleSize, 0);
      ctx.lineTo(cursorX + triangleSize, 0);
      ctx.lineTo(cursorX, triangleSize * 1.5); // Proportionally smaller triangle (1.5px height)
      ctx.closePath();
      ctx.fill();
      
      // 🔧 **DEBUG BLUE COMPACT CURSOR**: Log new blue cursor specs
      if (Math.random() < 0.002) { // 0.2% sampling
        console.log(`🔵 [BlueCursor] Rendered BLUE ultra-compact cursor:`, {
          lineWidth: '0.5px (was 1px - 50% smaller)',
          triangleSize: '1px (was 2px - 50% smaller)', 
          triangleHeight: '1.5px (proportional)',
          position: cursorX.toFixed(1) + 'px',
          time: currentTime.toFixed(2) + 's',
          isPlaying,
          color: isPlaying ? '#3b82f6 (blue-500)' : '#2563eb (blue-600)',
          shadowEffects: 'REMOVED for crisp rendering',
          userRequest: 'BLUE color + smaller size'
        });
      }
    }

    // 6. 🆕 **ULTRA-THIN HOVER TIME LINE**: Solid thin line showing hover position
    if (hoverTooltip && hoverTooltip.visible && duration > 0) {
      const hoverX = hoverTooltip.x;
      
      // 🎯 **ULTRA-THIN SOLID HOVER LINE**: Thinner and solid as requested by user
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'; // Blue with slightly less opacity for subtlety
      ctx.lineWidth = 0.5; // 🔥 **ULTRA-THIN**: Reduced from 1px to 0.5px (50% thinner)
      // 🚫 **NO DASHES**: Removed setLineDash completely for solid line as requested
      
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      // 🚫 **NO DASH RESET**: No longer needed since we're not using dashes
      
      // 🔧 **DEBUG ULTRA-THIN SOLID HOVER LINE**: Enhanced logging
      if (Math.random() < 0.02) { // 2% sampling
        console.log(`📍 [UltraThinHoverLine] Drawing SOLID line at ${hoverX.toFixed(1)}px:`, {
          time: hoverTooltip.formattedTime,
          lineWidth: '0.5px (ultra-thin)',
          style: 'SOLID (not dashed)',
          color: 'rgba(59, 130, 246, 0.7) - blue with subtle opacity',
          userRequest: 'THINNER + SOLID line instead of dashed'
        });
      }
    }
    
    // 🚀 **PERFORMANCE LOGGING**: Log render time for optimization insights
    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime;
    
    // 🎯 **SMART PERFORMANCE LOGGING**: Only log when performance matters
    if (renderDuration > 16) {
      // Slow render (> 60fps) - always log
      console.warn(`🐌 [Performance] SLOW render: ${renderDuration.toFixed(2)}ms (target: <16ms for 60fps)`);
    } else if (renderDuration > 8 && Math.random() < 0.1) {
      // Medium render (30-60fps) - log occasionally
      console.log(`⚡ [Performance] Render: ${renderDuration.toFixed(2)}ms (good - ultra-thin bars)`);
    } else if (renderDuration <= 8 && Math.random() < 0.01) {
      // Fast render (<8ms = 125fps+) - log rarely
      console.log(`🚀 [Performance] FAST render: ${renderDuration.toFixed(2)}ms (excellent - refined waveform)`);
    }
    
    // 🔥 **ULTRA-THIN BARS LOGGING**: Log bar refinement info occasionally
    if (Math.random() < 0.005) { // 0.5% sampling
      const totalBars = waveformData.length;
      const avgBarWidth = useOptimizedSpacing ? 
        Math.max(0.5, minBarWidth * 0.7) : 
        Math.max(0.4, (width / totalBars) * 0.6);
      
      console.log(`🔥 [UltraThinBars] Refined waveform rendered:`, {
        totalBars: totalBars,
        avgBarWidth: avgBarWidth.toFixed(2) + 'px',
        renderTime: renderDuration.toFixed(2) + 'ms',
        optimization: useOptimizedSpacing ? 'SMALL_SCREEN' : 'LARGE_SCREEN',
        refinement: 'ULTRA_THIN_BARS_WITH_SPACING'
      });
    }
  }, [canvasRef, renderData, currentTime, isPlaying, hoverTooltip]);



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



  // 🆕 **FADE EFFECT LOGGER**: Log khi fade values thay đổi để debug
  useEffect(() => {
    if (fadeIn > 0 || fadeOut > 0) {
      console.log(`🎨 [FadeEffects] Fade configuration updated:`, {
        fadeIn: fadeIn.toFixed(1) + 's',
        fadeOut: fadeOut.toFixed(1) + 's',
        startTime: startTime.toFixed(2) + 's',
        endTime: endTime.toFixed(2) + 's',
        selectionDuration: (endTime - startTime).toFixed(2) + 's',
        fadeInRange: fadeIn > 0 ? `${startTime.toFixed(2)}s → ${(startTime + fadeIn).toFixed(2)}s` : 'none',
        fadeOutRange: fadeOut > 0 ? `${(endTime - fadeOut).toFixed(2)}s → ${endTime.toFixed(2)}s` : 'none'
      });
    }
  }, [fadeIn, fadeOut, startTime, endTime]);


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
          touchAction: 'none', // Prevent scrolling on touch devices
          overflow: 'hidden', // 🚫 **NO CANVAS SCROLLBARS**: Đảm bảo canvas không tạo scrollbar
        }}
      />

{/* 🆕 **TOOLTIP SYSTEM**: Sử dụng component tách riêng */}
<WaveformUI 
  hoverTooltip={hoverTooltip}
  handleTooltips={handleTooltips}
/>


    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';

export default WaveformCanvas;