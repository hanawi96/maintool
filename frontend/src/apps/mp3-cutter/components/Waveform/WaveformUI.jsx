import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - 60fps drag performance
export const WaveformUI = memo(({ hoverTooltip, handleTooltips, mainCursorTooltip, handlePositions, cursorPositions, 
  onHandleMouseDown, onHandleMouseMove, onHandleMouseUp 
}) => {
  const renderCountRef = useRef(0);
  const WAVEFORM_HEIGHT = WAVEFORM_CONFIG.HEIGHT;
  
  // 🎯 **TOOLTIP STYLING** - 0.5rem font theo yêu cầu user  
  const TOOLTIP_CONFIG = {
    FONT_SIZE: '0.65rem',
    DURATION_OFFSET: 0,
    HANDLE_OFFSET: 19,
    HOVER_OFFSET: 2,
    MAIN_CURSOR_OFFSET: 2,
    COLOR: '#2d3436',
    FONT_WEIGHT: '400',
    MAIN_CURSOR_FONT_SIZE: '0.65rem',
    MAIN_CURSOR_COLOR: '#2d3436',
    MAIN_CURSOR_FONT_WEIGHT: '400'
  };

  // 🔥 **MINIMAL LOGGING** - Chỉ log mỗi 100 renders
  useEffect(() => {
    renderCountRef.current++;
    if (renderCountRef.current % 100 === 0) {
      console.log(`🎨 [WaveformUI] Render #${renderCountRef.current} - 60fps optimized`);
    }
  });

  // 🚀 **CONDITIONAL RENDERING** - Performance optimized checks
  const shouldRenderHoverTooltip = hoverTooltip?.visible && hoverTooltip.x >= 0;
  const shouldRenderStartTooltip = handleTooltips?.start?.visible && handleTooltips.start.x >= 0;
  const shouldRenderEndTooltip = handleTooltips?.end?.visible && handleTooltips.end.x >= 0;
  const shouldRenderDurationTooltip = handleTooltips?.selectionDuration?.visible && handleTooltips.selectionDuration.x >= 0;
  const shouldRenderMainCursorTooltip = mainCursorTooltip?.visible && mainCursorTooltip.x >= 0;
  const shouldRenderStartHandle = handlePositions?.start?.visible && handlePositions.start.x >= 0;
  const shouldRenderEndHandle = handlePositions?.end?.visible && handlePositions.end.x >= 0;
  const shouldRenderMainCursor = cursorPositions?.mainCursor?.visible && cursorPositions.mainCursor.x >= 0;
  const shouldRenderHoverLine = cursorPositions?.hoverLine?.visible && cursorPositions.hoverLine.x >= 0;

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`,
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR,
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`,
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR,
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`,
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR,
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`,
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR,
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** */}
      {shouldRenderMainCursorTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${mainCursorTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px`,
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR,
            fontSize: `${TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE} !important`,
            fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap'
          }}
        >
          {mainCursorTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE** */}
      {shouldRenderStartHandle && (
        <div
          className="absolute z-40"
          style={{
            left: `${handlePositions.start.x - handlePositions.start.width}px`,
            top: `${handlePositions.start.y}px`,
            width: `${handlePositions.start.width}px`,
            height: `${handlePositions.start.height}px`,
            backgroundColor: handlePositions.start.color,
            pointerEvents: 'auto',
            borderRadius: '4px 0 0 4px',
            zIndex: 35,
            cursor: 'ew-resize',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px'
          }}
          onMouseDown={(e) => {
            onHandleMouseDown?.({
              clientX: e.clientX,
              clientY: e.clientY,
              handleType: 'start',
              isHandleEvent: true
            });
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseMove={(e) => {
            onHandleMouseMove?.({
              clientX: e.clientX,
              clientY: e.clientY,
              handleType: 'start',
              isHandleEvent: true
            });
          }}
          onMouseUp={(e) => {
            onHandleMouseUp?.({
              handleType: 'start',
              isHandleEvent: true
            });
          }}
        >
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
        </div>
      )}

      {/* 🤚 **END HANDLE** */}
      {shouldRenderEndHandle && (
        <div
          className="absolute z-40"
          style={{
            left: `${handlePositions.end.x - handlePositions.end.width}px`,
            top: `${handlePositions.end.y}px`,
            width: `${handlePositions.end.width}px`,
            height: `${handlePositions.end.height}px`,
            backgroundColor: handlePositions.end.color,
            pointerEvents: 'auto',
            borderRadius: '0 4px 4px 0',
            zIndex: 35,
            cursor: 'ew-resize',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px'
          }}
          onMouseDown={(e) => {
            onHandleMouseDown?.({
              clientX: e.clientX,
              clientY: e.clientY,
              handleType: 'end',
              isHandleEvent: true
            });
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseMove={(e) => {
            onHandleMouseMove?.({
              clientX: e.clientX,
              clientY: e.clientY,
              handleType: 'end',
              isHandleEvent: true
            });
          }}
          onMouseUp={(e) => {
            onHandleMouseUp?.({
              handleType: 'end',
              isHandleEvent: true
            });
          }}
        >
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
          <div style={{ width: '2.6px', height: '2.6px', backgroundColor: 'white', borderRadius: '50%' }} />
        </div>
      )}

      {/* 🔵 **MAIN CURSOR** */}
      {shouldRenderMainCursor && (
        <div
          className="absolute z-30"
          style={{
            left: `${cursorPositions.mainCursor.x}px`,
            top: `${cursorPositions.mainCursor.y}px`,
            width: `${cursorPositions.mainCursor.width}px`,
            height: `${cursorPositions.mainCursor.height}px`,
            backgroundColor: cursorPositions.mainCursor.color,
            pointerEvents: 'none',
            zIndex: 30
          }}
        />
      )}

      {/* 🖱️ **HOVER LINE** */}
      {shouldRenderHoverLine && (
        <div
          className="absolute z-20"
          style={{
            left: `${cursorPositions.hoverLine.x}px`,
            top: `${cursorPositions.hoverLine.y}px`,
            width: `${cursorPositions.hoverLine.width}px`,
            height: `${cursorPositions.hoverLine.height}px`,
            backgroundColor: cursorPositions.hoverLine.color,
            pointerEvents: 'none',
            zIndex: 20
          }}
        />
      )}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';