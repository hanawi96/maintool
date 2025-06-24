import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { formatTimeUnified } from '../utils/timeFormatter';
import { mousePositionToTime, getWaveformArea } from '../utils/positionUtils';

const DURATION_TOOLTIP = {
  ESTIMATED_CHAR_WIDTH: 3.2,
  TYPICAL_TIME_FORMAT_LENGTH: 9,
  PADDING_BUFFER: 8,
  get ESTIMATED_WIDTH() { return this.ESTIMATED_CHAR_WIDTH * this.TYPICAL_TIME_FORMAT_LENGTH; },
  get MIN_REGION_WIDTH() { return this.ESTIMATED_WIDTH + this.PADDING_BUFFER; }
};

const TOOLTIP_CLAMP = {
  HALF_WIDTH: 5,
  MAX_RIGHT: 1428
};

const clampTooltipX = (x, start, end, type = 'default') => {
  const { HALF_WIDTH, MAX_RIGHT } = TOOLTIP_CLAMP;
  if (type === 'hover' || type === 'main') return Math.max(HALF_WIDTH, Math.min(MAX_RIGHT, x));
  if (type === 'end') return Math.max(HALF_WIDTH, x > end - HALF_WIDTH ? end - HALF_WIDTH : x);
  return Math.max(HALF_WIDTH, Math.min(end - HALF_WIDTH, x));
};

export const useOptimizedTooltip = (
  canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging, isInverted = false, draggingRegion = null, regions = []
) => {
  const [hoverPos, setHoverPos] = useState(null);
  const [isHoverActive, setIsHoverActive] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const formatTime = useCallback(formatTimeUnified, []);

  const getCanvasWidth = useCallback((canvas) => {
    return canvas.offsetWidth || canvas.width || canvas.getBoundingClientRect().width || 800;
  }, []);

  const calcMainCursor = useCallback(() => {
    if (!canvasRef?.current || !duration || typeof currentTime !== 'number') return null;
    const canvasWidth = getCanvasWidth(canvasRef.current);
    const { startX, endX, areaWidth } = getWaveformArea(canvasWidth);
    const x = startX + (currentTime / duration) * areaWidth;
    return { visible: true, x: clampTooltipX(x, startX, endX, 'main'), time: currentTime, formattedTime: formatTime(currentTime) };
  }, [canvasRef, duration, currentTime, formatTime, getCanvasWidth]);

  const calcHandle = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || startTime >= endTime) return { start: null, end: null, selectionDuration: null };
    const canvasWidth = getCanvasWidth(canvas);
    const { startX, endX, areaWidth } = getWaveformArea(canvasWidth);
    const sX = startX + (startTime / duration) * areaWidth;
    const eX = startX + (endTime / duration) * areaWidth;
    const selection = endTime - startTime;
    const midX = (sX + eX) / 2;
    const regionPx = Math.abs(eX - sX);
    const showDuration = selection >= 0.1 && regionPx >= DURATION_TOOLTIP.MIN_REGION_WIDTH;
    return {
      start: { visible: true, x: clampTooltipX(sX, startX, endX, 'start'), time: startTime, formattedTime: formatTime(startTime) },
      end: { visible: true, x: clampTooltipX(eX, startX, endX, 'end'), time: endTime, formattedTime: formatTime(endTime) },
      selectionDuration: showDuration ? {
        visible: true, x: clampTooltipX(midX, startX, endX, 'center'), duration: selection, formattedTime: formatTime(selection)
      } : null
    };
  }, [canvasRef, duration, startTime, endTime, formatTime, getCanvasWidth]);

  // 🆕 Calculate region duration tooltips - IDENTICAL logic to main selection
  const calcRegionDurations = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || !regions?.length) return [];
    
    const canvasWidth = getCanvasWidth(canvas);
    const { startX, endX, areaWidth } = getWaveformArea(canvasWidth);
    
    const tooltips = regions.map(region => {
      const regionDuration = region.end - region.start;
      const regionStartX = startX + (region.start / duration) * areaWidth;
      const regionEndX = startX + (region.end / duration) * areaWidth;
      const regionMidX = (regionStartX + regionEndX) / 2;
      const regionPx = Math.abs(regionEndX - regionStartX);
      
      // 🎯 IDENTICAL condition to main selection
      const showDuration = regionDuration >= 0.1 && regionPx >= DURATION_TOOLTIP.MIN_REGION_WIDTH;
      
      return showDuration ? {
        id: region.id,
        visible: true,
        x: clampTooltipX(regionMidX, startX, endX, 'center'),
        duration: regionDuration,
        formattedTime: formatTime(regionDuration),
        regionName: region.name
      } : null;
    }).filter(Boolean); // Remove null entries
    
    return tooltips;
  }, [canvasRef, duration, regions, formatTime, getCanvasWidth]);

  const calcHover = useCallback(() => {
    if (!isHoverActive || !hoverPos || !canvasRef?.current || !duration ||
        ['start', 'end', 'region', 'region-potential'].includes(isDragging) ||
        draggingRegion) return null;
    const canvas = canvasRef.current;
    const canvasWidth = getCanvasWidth(canvas);
    const { x } = hoverPos;
    const { startX, endX } = getWaveformArea(canvasWidth);
    if (x < startX || x > endX) return null;
    
    // 🎯 UNIFIED: Use same calculation as main selection click
    const t = mousePositionToTime(x, canvasWidth, duration);
    if (t < 0 || t > duration) return null;
    
    return { visible: true, x: clampTooltipX(x, startX, canvasWidth, 'hover'), time: t, formattedTime: formatTime(t) };
  }, [isHoverActive, hoverPos, canvasRef, duration, formatTime, isDragging, draggingRegion, getCanvasWidth]);

  const updateHoverTooltip = useCallback(e => {
    if (!canvasRef?.current || !duration) {
      setHoverPos(null);
      setIsHoverActive(false);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left });
    setIsHoverActive(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverActive(false);
      setHoverPos(null);
    }, 2000);
  }, [canvasRef, duration]);

  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHoverActive(false);
    setHoverPos(null);
  }, []);

  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

  const mainCursorTooltip = useMemo(() => calcMainCursor(), [calcMainCursor]);
  const handleTooltips = useMemo(() => calcHandle(), [calcHandle]);
  const hoverTooltip = useMemo(() => calcHover(), [calcHover]);
  const regionDurationTooltips = useMemo(() => calcRegionDurations(), [calcRegionDurations]);

  return useMemo(() => ({
    hoverTooltip,
    handleTooltips,
    mainCursorTooltip,
    regionDurationTooltips,
    updateHoverTooltip,
    clearHoverTooltip
  }), [hoverTooltip, handleTooltips, mainCursorTooltip, regionDurationTooltips, updateHoverTooltip, clearHoverTooltip]);
};
