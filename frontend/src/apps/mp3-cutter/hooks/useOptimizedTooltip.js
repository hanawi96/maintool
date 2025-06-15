import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { formatTimeUnified } from '../utils/timeFormatter';
import { WAVEFORM_CONFIG } from '../utils/constants';

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
  canvasRef, duration, currentTime, isPlaying, audioRef, startTime, endTime, hoveredHandle, isDragging, isInverted = false
) => {
  const [hoverPos, setHoverPos] = useState(null);
  const [isHoverActive, setIsHoverActive] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const formatTime = useCallback(formatTimeUnified, []);

  const getArea = useCallback((canvas) => {
    const width = canvas.getBoundingClientRect().width;
    const { MODERN_HANDLE_WIDTH, RESPONSIVE } = WAVEFORM_CONFIG;
    const hWidth = width < RESPONSIVE.MOBILE_BREAKPOINT ? Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    return { width, startX: hWidth, endX: width - hWidth, areaWidth: width - hWidth * 2, hWidth };
  }, []);

  const calcMainCursor = useCallback(() => {
    if (!canvasRef?.current || !duration || typeof currentTime !== 'number') return null;
    const { startX, endX, areaWidth } = getArea(canvasRef.current);
    const x = startX + (currentTime / duration) * areaWidth;
    return { visible: true, x: clampTooltipX(x, startX, endX, 'main'), time: currentTime, formattedTime: formatTime(currentTime) };
  }, [canvasRef, duration, currentTime, formatTime, getArea]);

  const calcHandle = useCallback(() => {
    const canvas = canvasRef?.current;
    if (!canvas || !duration || startTime >= endTime) return { start: null, end: null, selectionDuration: null };
    const { startX, endX, areaWidth } = getArea(canvas);
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
  }, [canvasRef, duration, startTime, endTime, formatTime, getArea]);

  const calcHover = useCallback(() => {
    if (!isHoverActive || !hoverPos || !canvasRef?.current || !duration ||
        ['start', 'end', 'region', 'region-potential'].includes(isDragging)) return null;
    const canvas = canvasRef.current;
    const { x } = hoverPos, { startX, endX, areaWidth, width } = getArea(canvas);
    if (x < startX || x > endX) return null;
    const t = ((x - startX) / areaWidth) * duration;
    if (t < 0 || t > duration) return null;
    return { visible: true, x: clampTooltipX(x, startX, width, 'hover'), time: t, formattedTime: formatTime(t) };
  }, [isHoverActive, hoverPos, canvasRef, duration, formatTime, isDragging, getArea]);

  const updateHoverTooltip = useCallback(e => {
    if (!canvasRef?.current || !duration) return setHoverPos(null), setIsHoverActive(false);
    const rect = canvasRef.current.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left });
    setIsHoverActive(true);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverActive(false); setHoverPos(null);
    }, 2000);
  }, [canvasRef, duration]);

  const clearHoverTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHoverActive(false); setHoverPos(null);
  }, []);

  useEffect(() => () => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }, []);

  const mainCursorTooltip = useMemo(() => calcMainCursor(), [calcMainCursor]);
  const handleTooltips = useMemo(() => calcHandle(), [calcHandle]);
  const hoverTooltip = useMemo(() => calcHover(), [calcHover]);

  return useMemo(() => ({
    hoverTooltip,
    handleTooltips,
    mainCursorTooltip,
    updateHoverTooltip,
    clearHoverTooltip
  }), [hoverTooltip, handleTooltips, mainCursorTooltip, updateHoverTooltip, clearHoverTooltip]);
};
