// 📄 src/apps/mp3-cutter/components/Waveform/WaveformCanvas.js
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';
import { WaveformUI } from './WaveformUI';
import { useOptimizedTooltip } from '../../hooks/useOptimizedTooltip';
import { useWaveformCursor } from '../../hooks/useWaveformCursor';
import { useWaveformRender } from '../../hooks/useWaveformRender';

// Helper: responsive handle width & waveform area (reduce repetition)
const getResponsiveHandleWidth = (width) =>
  width < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT
    ? Math.max(3, WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH * 0.75)
    : WAVEFORM_CONFIG.MODERN_HANDLE_WIDTH;

const getWaveformArea = (width) => {
  const handleW = getResponsiveHandleWidth(width);
  return {
    startX: handleW,
    endX: width - handleW,
    areaWidth: width - 2 * handleW,
    handleW
  };
};

// Helper: get waveform color based on volume level with smooth transitions
const getWaveformColor = (volume) => {
  const volumePercent = volume * 100;
  
  if (volumePercent <= 100) {
    return '#7c3aed'; // Purple for 0-100%
  } else if (volumePercent <= 150) {
    // Smooth transition from purple to orange (101-150%)
    const ratio = (volumePercent - 100) / 50;
    return interpolateColor('#7c3aed', '#f97316', ratio);
  } else {
    // Smooth transition from orange to red (151-200%)
    const ratio = Math.min((volumePercent - 150) / 50, 1);
    return interpolateColor('#f97316', '#ef4444', ratio);
  }
};

// Helper: interpolate between two hex colors
const interpolateColor = (color1, color2, ratio) => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

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
  fadeIn = 0,
  fadeOut = 0,
  isInverted = false,
  audioRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {  // Cache ref for static gray/dynamic canvas
  const backgroundCacheRef = useRef(null);
  const dynamicWaveformCacheRef = useRef(null);
  const lastCacheKey = useRef(null);
  const lastDynamicCacheKey = useRef(null);

  // Tooltip, cursor, waveform render hooks
  const {
    hoverTooltip,
    handleTooltips: handleTooltipsData,
    mainCursorTooltip,
    updateHoverTooltip,
    clearHoverTooltip
  } = useOptimizedTooltip(
    canvasRef, duration, currentTime, isPlaying,
    audioRef, startTime, endTime, hoveredHandle, isDragging, isInverted
  );
  const { updateCursor } = useWaveformCursor(canvasRef, duration, startTime, endTime, isDragging);
  const {
    animatedVolume,
    hybridWaveformData,
    requestRedraw,
    containerWidth
  } = useWaveformRender(canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip);

  // ----- POINTER EVENT HANDLERS -----
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      canvas.setPointerCapture(e.pointerId);
      updateCursor(mouseX);
      clearHoverTooltip();
    }
    onMouseDown?.(e);
  }, [onMouseDown, updateCursor, clearHoverTooltip, canvasRef]);
  const handlePointerMove = useCallback((e) => {
    onMouseMove?.(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      updateCursor(mouseX);
      updateHoverTooltip(e);
    }
  }, [onMouseMove, updateCursor, updateHoverTooltip, canvasRef]);

  const handlePointerUp = useCallback((e) => {
    onMouseUp?.(e);
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, [onMouseUp, canvasRef]);

  const handlePointerLeave = useCallback((e) => {
    onMouseLeave?.(e);
    clearHoverTooltip();
  }, [onMouseLeave, clearHoverTooltip]);

  // Handle events for region handles (left/right)
  const handleHandlePointerDown = useCallback((e) => {
    clearHoverTooltip();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
      if (onMouseDown) {
        const rect = canvas.getBoundingClientRect();
        onMouseDown({
          clientX: e.clientX,
          clientY: e.clientY,
          target: canvas,
          handleType: e.handleType,
          isHandleEvent: true,
          canvasX: e.clientX - rect.left,
          canvasY: e.clientY - rect.top,
          pointerId: e.pointerId
        });
      }
    }
  }, [canvasRef, onMouseDown, clearHoverTooltip]);

  const handleHandlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas && onMouseMove) {
      const rect = canvas.getBoundingClientRect();
      const evt = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        canvasX: e.clientX - rect.left,
        canvasY: e.clientY - rect.top,
        pointerId: e.pointerId
      };
      onMouseMove(evt);
      updateCursor(evt.canvasX, { isHandleEvent: true, handleType: e.handleType });
    }
  }, [canvasRef, onMouseMove, updateCursor]);

  const handleHandlePointerUp = useCallback((e) => {
    const canvas = canvasRef.current;
    if (canvas && onMouseUp) {
      canvas.releasePointerCapture(e.pointerId);
      onMouseUp({
        target: canvas,
        handleType: e.handleType,
        isHandleEvent: true,
        pointerId: e.pointerId
      });
    }
  }, [canvasRef, onMouseUp]);

  // ----- RENDER DATA MEMO -----
  const renderData = useMemo(() => {
    if (!hybridWaveformData?.data?.length || duration <= 0) return null;
    return {
      waveformData: hybridWaveformData.data,
      barWidth: hybridWaveformData.barWidth,
      mode: hybridWaveformData.mode,
      duration,
      startTime,
      endTime,
      volume: animatedVolume,
      fadeIn,
      fadeOut,
      isInverted,
      containerWidth,
      currentTime
    };
  }, [hybridWaveformData, duration, startTime, endTime, animatedVolume, fadeIn, fadeOut, isInverted, containerWidth, currentTime]);

  // ----- CANVAS HEIGHT GUARD -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.height !== WAVEFORM_CONFIG.HEIGHT) {
      canvas.height = WAVEFORM_CONFIG.HEIGHT;
    }
  }, [canvasRef, renderData]);
  // ----- CACHE KEYS -----
  const generateCacheKey = useCallback((data, width) =>
    data?.waveformData ? `${data.waveformData.length}-${data.containerWidth || width}-${data.mode || 'default'}` : null,
    []
  );  const generateDynamicCacheKey = useCallback((data, width) => {
    if (!data?.waveformData) return null;
    const v = data.volume ?? 1;
    const colorKey = Math.round(v * 5000); // Higher precision for 2% steps (0.02 * 5000 = 100)
    return `dynamic-${data.waveformData.length}-${data.containerWidth || width}-${data.mode || 'default'}-${colorKey}-${Math.round((data.fadeIn || 0) * 10)}-${Math.round((data.fadeOut || 0) * 10)}-${Math.round((data.startTime || 0) * 10)}-${Math.round((data.endTime || 0) * 10)}-${data.isInverted || false}`;
  }, []);

  // ----- BACKGROUND CANVAS CACHE -----
  const createBackgroundCache = useCallback(async (waveformData, width, height, containerWidth) => {
    const { startX, areaWidth } = getWaveformArea(width);
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width; bgCanvas.height = height;
    const ctx = bgCanvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99,102,241,0.04)');
    gradient.addColorStop(1, 'rgba(168,85,247,0.04)');
    ctx.fillStyle = gradient;
    ctx.fillRect(startX, 0, areaWidth, height);
    // Gray bars
    ctx.fillStyle = '#e2e8f0';
    const centerY = height / 2, FLAT_BAR = 1, MAX_PX = 65;
    const barW = areaWidth / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
      const h = FLAT_BAR + (MAX_PX * waveformData[i]);
      const x = startX + (i * barW);
      ctx.fillRect(Math.floor(x), centerY - h, barW, h * 2);
    }
    return createImageBitmap(bgCanvas);
  }, []);  // ----- DYNAMIC WAVEFORM CACHE (color changes with volume) -----
  const createDynamicWaveformCache = useCallback(async (
    waveformData, width, height, containerWidth, volume, fadeIn, fadeOut, startTime, endTime, duration
  ) => {
    const { startX, areaWidth } = getWaveformArea(width);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = getWaveformColor(volume);
    const centerY = height / 2, FLAT_BAR = 1, MAX_PX = 65;
    const vol = Math.max(0, Math.min(1, volume));
    const barW = areaWidth / waveformData.length;
    const fadeMultiplier = (i) => {
      if (!fadeIn && !fadeOut) return 1;
      const time = (i / waveformData.length) * duration;
      // Invert mode
      if (isInverted) {
        let f = 1;
        if (fadeIn > 0 && time < startTime) {
          const fadeInDur = Math.min(fadeIn, startTime);
          if (time <= fadeInDur) f = Math.max(0.05, time / fadeInDur);
        }
        if (fadeOut > 0 && time >= endTime) {
          const fadeOutDur = Math.min(fadeOut, duration - endTime);
          const fadeOutStart = duration - fadeOutDur;
          if (time >= fadeOutStart) f = Math.max(0.05, (duration - time) / fadeOutDur);
        }
        return f;
      } else {
        const rel = (time - startTime) / (endTime - startTime);
        let f = 1;
        if (fadeIn > 0 && rel < (fadeIn / (endTime - startTime))) {
          f *= Math.max(0.05, Math.min(1, rel / (fadeIn / (endTime - startTime))));
        }
        if (fadeOut > 0 && rel > (1 - fadeOut / (endTime - startTime))) {
          f *= Math.max(0.05, Math.min(1, (1 - rel) / (fadeOut / (endTime - startTime))));
        }
        return f;
      }
    };    for (let i = 0; i < waveformData.length; i++) {
      let h = FLAT_BAR + ((FLAT_BAR + (MAX_PX * waveformData[i]) - FLAT_BAR) * vol);
      
      // 🎯 Tăng chiều cao 20% khi volume từ 101% đến 200%
      if (volume > 1) {
        const volumePercent = volume * 100;
        const heightBoost = Math.min((volumePercent - 100) / 100, 1) * 0.2; // 0-20% boost
        h = h * (1 + heightBoost);
      }
      
      if (fadeIn > 0 || fadeOut > 0) h = FLAT_BAR + (h - FLAT_BAR) * fadeMultiplier(i);
      const x = startX + (i * barW);
      ctx.fillRect(Math.floor(x), centerY - h, barW, h * 2);
    }
    return createImageBitmap(canvas);
  }, [isInverted]);

  // ----- DRAW WAVEFORM (ULTRA FAST) -----
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderData) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);

    const { duration, startTime, endTime, volume: currentVolume, isInverted } = renderData;
    const { startX, areaWidth } = getWaveformArea(width);

    // 1. Gray bg
    if (backgroundCacheRef.current) {
      ctx.globalAlpha = Math.max(0.30, currentVolume);
      ctx.drawImage(backgroundCacheRef.current, 0, 0);
      ctx.globalAlpha = 1;
    }    // 2. Active (dynamic color) region
    if (startTime < endTime && duration > 0 && dynamicWaveformCacheRef.current) {
      ctx.save();
      if (isInverted) {
        // Before selection
        if (startTime > 0) {
          ctx.beginPath();
          ctx.rect(startX, 0, (startTime / duration) * areaWidth, height);
          ctx.clip();
          ctx.drawImage(dynamicWaveformCacheRef.current, 0, 0);
          ctx.restore(); ctx.save();
        }
        // After selection
        if (endTime < duration) {
          ctx.beginPath();
          ctx.rect(startX + (endTime / duration) * areaWidth, 0, ((1 - endTime / duration) * areaWidth), height);
          ctx.clip();
          ctx.drawImage(dynamicWaveformCacheRef.current, 0, 0);
        }
      } else {
        ctx.beginPath();
        ctx.rect(startX + (startTime / duration) * areaWidth, 0, ((endTime - startTime) / duration) * areaWidth, height);
        ctx.clip();
        ctx.drawImage(dynamicWaveformCacheRef.current, 0, 0);
      }ctx.restore();
      // 3. Selection overlay
      ctx.fillStyle = 'rgba(139,92,246,0.15)';
      ctx.fillRect(startX + (startTime / duration) * areaWidth, 0, ((endTime - startTime) / duration) * areaWidth, height);
    }
    // 4. Current time cursor - Now rendered by React component only
  }, [canvasRef, renderData]);

  // ----- CACHE MANAGEMENT -----
  useEffect(() => {
    let mounted = true;
    if (!renderData?.waveformData || !canvasRef.current) return;
    const canvas = canvasRef.current;    const cacheKey = generateCacheKey(renderData, containerWidth);
    const dynamicKey = generateDynamicCacheKey(renderData, containerWidth);

    const updateCaches = async () => {
      let needsRedraw = false;
      if (cacheKey && cacheKey !== lastCacheKey.current) {
        backgroundCacheRef.current?.close?.();
        backgroundCacheRef.current = await createBackgroundCache(
          renderData.waveformData, canvas.width, canvas.height, containerWidth
        );
        lastCacheKey.current = cacheKey;
        needsRedraw = true;
      }
      if (dynamicKey && dynamicKey !== lastDynamicCacheKey.current) {
        dynamicWaveformCacheRef.current?.close?.();
        dynamicWaveformCacheRef.current = await createDynamicWaveformCache(
          renderData.waveformData, canvas.width, canvas.height, containerWidth,
          renderData.volume ?? 1,
          renderData.fadeIn,
          renderData.fadeOut,
          renderData.startTime,
          renderData.endTime,
          renderData.duration
        );
        lastDynamicCacheKey.current = dynamicKey;
        needsRedraw = true;
      }
      if (needsRedraw && mounted) requestRedraw(drawWaveform);
    };
    updateCaches();
    return () => { mounted = false };
  }, [renderData, containerWidth, canvasRef, createBackgroundCache, createDynamicWaveformCache, requestRedraw, drawWaveform, generateCacheKey, generateDynamicCacheKey]);

  // ----- REDRAW CONTROL (minimize effect triggers) -----
  useEffect(() => {
    if ((hoverTooltip?.visible || isPlaying || isDragging) && renderData) {
      requestRedraw(drawWaveform);
    }
  }, [hoverTooltip?.visible, isPlaying, isDragging, renderData, requestRedraw, drawWaveform]);

  useEffect(() => {
    if (renderData) requestRedraw(drawWaveform);
  }, [renderData, requestRedraw, drawWaveform]);

  // ----- HANDLE POSITION CALC -----
  const handlePositions = useMemo(() => {
    if (!canvasRef.current || duration === 0 || startTime >= endTime || !renderData) return { start: null, end: null };
    const canvas = canvasRef.current;
    const w = containerWidth || canvas.width || 800, h = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    const { startX, areaWidth, handleW } = getWaveformArea(w);
    const regionStartX = startX + (startTime / duration) * areaWidth;
    const regionEndX = startX + (endTime / duration) * areaWidth;
    return {
      start: {
        visible: true,
        x: isInverted ? regionStartX : regionStartX - handleW,
        y: 0, width: handleW, height: h,
        isActive: hoveredHandle === 'start' || isDragging === 'start',
        color: isDragging === 'start' ? '#0d9488' : '#14b8a6'
      },
      end: {
        visible: true,
        x: isInverted ? regionEndX - handleW : regionEndX,
        y: 0, width: handleW, height: h,
        isActive: hoveredHandle === 'end' || isDragging === 'end',
        color: isDragging === 'end' ? '#0d9488' : '#14b8a6'
      }
    };
  }, [canvasRef, duration, startTime, endTime, hoveredHandle, isDragging, containerWidth, isInverted, renderData]);

  // ----- CURSOR POSITION CALC -----
  const cursorPositions = useMemo(() => {
    if (!canvasRef.current || duration === 0 || !renderData) return { mainCursor: null, hoverLine: null };
    const canvas = canvasRef.current;
    const w = containerWidth || canvas.width || 800, h = canvas.height || WAVEFORM_CONFIG.HEIGHT;
    const { startX, areaWidth } = getWaveformArea(w);
    const mainCursorX = currentTime >= 0 ? startX + (currentTime / duration) * areaWidth : -1;
    const shouldShowHover = hoverTooltip && hoverTooltip.visible &&
      isDragging !== 'start' && isDragging !== 'end' &&
      isDragging !== 'region' && isDragging !== 'region-potential';    return {
      mainCursor: {
        visible: currentTime >= 0 && duration > 0 && mainCursorX >= startX && mainCursorX <= (w - startX),
        x: mainCursorX,
        y: 0,
        width: 1,
        height: h,
        color: '#ef4444'
      },
      hoverLine: {
        visible: shouldShowHover && hoverTooltip.x >= 0,
        x: hoverTooltip?.x ?? -1,
        y: 0,
        width: 0.6,
        height: h,
        color: 'rgba(156,163,175,0.6)'
      }
    };
  }, [canvasRef, duration, currentTime, hoverTooltip, isDragging, containerWidth, renderData]);
  // ----- CLEANUP IMAGEBITMAP -----
  useEffect(() => () => {
    backgroundCacheRef.current?.close?.();
    backgroundCacheRef.current = null;
    dynamicWaveformCacheRef.current?.close?.();
    dynamicWaveformCacheRef.current = null;
  }, []);

  // ----- RENDER -----
  return (
    <div className="relative" style={{ minWidth: `${WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH}px`, overflow: 'visible' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="w-full"
        style={{
          height: WAVEFORM_CONFIG.HEIGHT,
          touchAction: 'none',
          zIndex: 1,
          visibility: renderData ? 'visible' : 'hidden'
        }}
      />
      {renderData && (
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
      )}
    </div>
  );
});

WaveformCanvas.displayName = 'WaveformCanvas';
export default WaveformCanvas;
