import React, { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **PHASE 1: CONSTANTS OPTIMIZATION** - Moved outside component to prevent recreation
const TOOLTIP_STYLES = {
  base: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 50,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    transform: 'translateX(-50%)'
  },
  tooltip: {
    fontSize: '0.65rem',
    fontWeight: '400',
    color: '#2d3436'
  },
  mainCursor: {
    fontSize: '0.65rem',
    fontWeight: '400',
    color: '#2d3436'
  }
};

const TOOLTIP_OFFSETS = {
  HOVER: 2,
  HANDLE: 19,
  DURATION: 0,
  MAIN_CURSOR: 2
};

const HANDLE_STYLES = {
  base: {
    position: 'absolute',
    pointerEvents: 'auto',
    zIndex: 35,
    cursor: 'ew-resize',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px'
  },
  start: {
    borderRadius: '4px 0 0 4px'
  },
  end: {
    borderRadius: '0 4px 4px 0'
  }
};

const HANDLE_DOT_STYLE = {
  width: '2.6px',
  height: '2.6px',
  backgroundColor: 'white',
  borderRadius: '50%'
};

const CURSOR_STYLES = {
  base: {
    position: 'absolute',
    pointerEvents: 'none'
  }
};

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - 60fps drag performance with playing state optimization
export const WaveformUI = memo(({ 
  hoverTooltip, 
  handleTooltips, 
  mainCursorTooltip, 
  handlePositions, 
  cursorPositions, 
  onHandleMouseDown, 
  onHandleMouseMove, 
  onHandleMouseUp,
  isPlaying = false, // 🆕 **PLAYING STATE**: For conditional rendering optimization
  isDragging = null  // 🆕 **DRAGGING STATE**: For smart feature enabling
}) => {
  const renderCountRef = useRef(0);
  const WAVEFORM_HEIGHT = WAVEFORM_CONFIG.HEIGHT;

  // 🔥 **MINIMAL LOGGING** - Chỉ log mỗi 100 renders
  useEffect(() => {
    renderCountRef.current++;
    if (renderCountRef.current % 100 === 0) {
      console.log(`🎨 [WaveformUI] Render #${renderCountRef.current} - 60fps optimized (Playing: ${isPlaying})`);
    }
  });

  // 🚀 **PHASE 2: PLAYING STATE OPTIMIZATION** - Conditional feature disabling
  const enableHoverEffects = !isPlaying;
  const enableNonEssentialTooltips = !isPlaying || isDragging;

  // 🚀 **OPTIMIZED CONDITIONAL RENDERING** - Performance optimized checks with playing state
  const shouldRenderHoverTooltip = enableHoverEffects && hoverTooltip?.visible && hoverTooltip.x >= 0;
  const shouldRenderStartTooltip = enableNonEssentialTooltips && handleTooltips?.start?.visible && handleTooltips.start.x >= 0;
  const shouldRenderEndTooltip = enableNonEssentialTooltips && handleTooltips?.end?.visible && handleTooltips.end.x >= 0;
  const shouldRenderDurationTooltip = enableNonEssentialTooltips && handleTooltips?.selectionDuration?.visible && handleTooltips.selectionDuration.x >= 0;
  const shouldRenderMainCursorTooltip = mainCursorTooltip?.visible && mainCursorTooltip.x >= 0;
  const shouldRenderStartHandle = handlePositions?.start?.visible && handlePositions.start.x >= 0;
  const shouldRenderEndHandle = handlePositions?.end?.visible && handlePositions.end.x >= 0;
  const shouldRenderMainCursor = cursorPositions?.mainCursor?.visible && cursorPositions.mainCursor.x >= 0;
  const shouldRenderHoverLine = enableHoverEffects && cursorPositions?.hoverLine?.visible && cursorPositions.hoverLine.x >= 0;

  // 🚀 **PHASE 3: EVENT HANDLER OPTIMIZATION** - Memoized handlers
  const createHandleMouseDown = useCallback((handleType) => (e) => {
    onHandleMouseDown?.({
      clientX: e.clientX,
      clientY: e.clientY,
      handleType,
      isHandleEvent: true
    });
    e.preventDefault();
    e.stopPropagation();
  }, [onHandleMouseDown]);

  const createHandleMouseMove = useCallback((handleType) => (e) => {
    onHandleMouseMove?.({
      clientX: e.clientX,
      clientY: e.clientY,
      handleType,
      isHandleEvent: true
    });
  }, [onHandleMouseMove]);

  const createHandleMouseUp = useCallback((handleType) => (e) => {
    onHandleMouseUp?.({
      handleType,
      isHandleEvent: true
    });
  }, [onHandleMouseUp]);

  const startHandleMouseDown = useMemo(() => createHandleMouseDown('start'), [createHandleMouseDown]);
  const endHandleMouseDown = useMemo(() => createHandleMouseDown('end'), [createHandleMouseDown]);
  const startHandleMouseMove = useMemo(() => createHandleMouseMove('start'), [createHandleMouseMove]);
  const endHandleMouseMove = useMemo(() => createHandleMouseMove('end'), [createHandleMouseMove]);
  const startHandleMouseUp = useMemo(() => createHandleMouseUp('start'), [createHandleMouseUp]);
  const endHandleMouseUp = useMemo(() => createHandleMouseUp('end'), [createHandleMouseUp]);

  // 🚀 **PHASE 4: STYLE OPTIMIZATION** - Pre-calculated style objects
  const hoverTooltipStyle = useMemo(() => ({
    ...TOOLTIP_STYLES.base,
    ...TOOLTIP_STYLES.tooltip,
    left: `${hoverTooltip?.x || 0}px`,
    top: `${TOOLTIP_OFFSETS.HOVER}px`
  }), [hoverTooltip?.x]);

  const startTooltipStyle = useMemo(() => ({
    ...TOOLTIP_STYLES.base,
    ...TOOLTIP_STYLES.tooltip,
    left: `${handleTooltips?.start?.x || 0}px`,
    top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`
  }), [handleTooltips?.start?.x, WAVEFORM_HEIGHT]);

  const endTooltipStyle = useMemo(() => ({
    ...TOOLTIP_STYLES.base,
    ...TOOLTIP_STYLES.tooltip,
    left: `${handleTooltips?.end?.x || 0}px`,
    top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`
  }), [handleTooltips?.end?.x, WAVEFORM_HEIGHT]);

  const durationTooltipStyle = useMemo(() => ({
    ...TOOLTIP_STYLES.base,
    ...TOOLTIP_STYLES.tooltip,
    left: `${handleTooltips?.selectionDuration?.x || 0}px`,
    top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.DURATION}px`
  }), [handleTooltips?.selectionDuration?.x, WAVEFORM_HEIGHT]);

  const mainCursorTooltipStyle = useMemo(() => ({
    ...TOOLTIP_STYLES.base,
    ...TOOLTIP_STYLES.mainCursor,
    left: `${mainCursorTooltip?.x || 0}px`,
    top: `${TOOLTIP_OFFSETS.MAIN_CURSOR}px`
  }), [mainCursorTooltip?.x]);

  const startHandleStyle = useMemo(() => ({
    ...HANDLE_STYLES.base,
    ...HANDLE_STYLES.start,
    left: `${(handlePositions?.start?.x || 0) - (handlePositions?.start?.width || 0)}px`,
    top: `${handlePositions?.start?.y || 0}px`,
    width: `${handlePositions?.start?.width || 0}px`,
    height: `${handlePositions?.start?.height || 0}px`,
    backgroundColor: handlePositions?.start?.color || '#14b8a6'
  }), [
    handlePositions?.start?.x,
    handlePositions?.start?.y,
    handlePositions?.start?.width,
    handlePositions?.start?.height,
    handlePositions?.start?.color
  ]);

  const endHandleStyle = useMemo(() => ({
    ...HANDLE_STYLES.base,
    ...HANDLE_STYLES.end,
    left: `${(handlePositions?.end?.x || 0) - (handlePositions?.end?.width || 0)}px`,
    top: `${handlePositions?.end?.y || 0}px`,
    width: `${handlePositions?.end?.width || 0}px`,
    height: `${handlePositions?.end?.height || 0}px`,
    backgroundColor: handlePositions?.end?.color || '#14b8a6'
  }), [
    handlePositions?.end?.x,
    handlePositions?.end?.y,
    handlePositions?.end?.width,
    handlePositions?.end?.height,
    handlePositions?.end?.color
  ]);

  const mainCursorStyle = useMemo(() => ({
    ...CURSOR_STYLES.base,
    left: `${cursorPositions?.mainCursor?.x || 0}px`,
    top: `${cursorPositions?.mainCursor?.y || 0}px`,
    width: `${cursorPositions?.mainCursor?.width || 0}px`,
    height: `${cursorPositions?.mainCursor?.height || 0}px`,
    backgroundColor: cursorPositions?.mainCursor?.color || '#3b82f6',
    zIndex: 30
  }), [
    cursorPositions?.mainCursor?.x,
    cursorPositions?.mainCursor?.y,
    cursorPositions?.mainCursor?.width,
    cursorPositions?.mainCursor?.height,
    cursorPositions?.mainCursor?.color
  ]);

  const hoverLineStyle = useMemo(() => ({
    ...CURSOR_STYLES.base,
    left: `${cursorPositions?.hoverLine?.x || 0}px`,
    top: `${cursorPositions?.hoverLine?.y || 0}px`,
    width: `${cursorPositions?.hoverLine?.width || 0}px`,
    height: `${cursorPositions?.hoverLine?.height || 0}px`,
    backgroundColor: cursorPositions?.hoverLine?.color || 'rgba(156, 163, 175, 0.6)',
    zIndex: 20
  }), [
    cursorPositions?.hoverLine?.x,
    cursorPositions?.hoverLine?.y,
    cursorPositions?.hoverLine?.width,
    cursorPositions?.hoverLine?.height,
    cursorPositions?.hoverLine?.color
  ]);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - Disabled during playback for performance */}
      {shouldRenderHoverTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={hoverTooltipStyle}>
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** - Smart rendering during playback */}
      {shouldRenderStartTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={startTooltipStyle}>
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** - Smart rendering during playback */}
      {shouldRenderEndTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={endTooltipStyle}>
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** - Smart rendering during playback */}
      {shouldRenderDurationTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={durationTooltipStyle}>
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - Always visible for playback feedback */}
      {shouldRenderMainCursorTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={mainCursorTooltipStyle}>
          {mainCursorTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE** - Always functional */}
      {shouldRenderStartHandle && (
        <div
          className="absolute z-40"
          style={startHandleStyle}
          onMouseDown={startHandleMouseDown}
          onMouseMove={startHandleMouseMove}
          onMouseUp={startHandleMouseUp}
        >
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
        </div>
      )}

      {/* 🤚 **END HANDLE** - Always functional */}
      {shouldRenderEndHandle && (
        <div
          className="absolute z-40"
          style={endHandleStyle}
          onMouseDown={endHandleMouseDown}
          onMouseMove={endHandleMouseMove}
          onMouseUp={endHandleMouseUp}
        >
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
        </div>
      )}

      {/* 🔵 **MAIN CURSOR** - Always visible for playback feedback */}
      {shouldRenderMainCursor && (
        <div className="absolute z-30" style={mainCursorStyle} />
      )}

      {/* 🖱️ **HOVER LINE** - Disabled during playback for performance */}
      {shouldRenderHoverLine && (
        <div className="absolute z-20" style={hoverLineStyle} />
      )}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';