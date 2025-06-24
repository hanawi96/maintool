import React, { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';

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
    zIndex: 45, // 🔧 **HIGHER Z-INDEX**: Main selection handles above region handles (40)
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
  regionDurationTooltips = [],
  regionHandleTooltips = [],
  handlePositions,
  cursorPositions,
  // 🆕 Region props
  regionPositions = [],
  onRegionClick = null,
  onRegionHandleDown = null,
  onRegionHandleMove = null,
  onRegionHandleUp = null,
  onRegionBodyDown = null,
  onRegionBodyMove = null,
  onRegionBodyUp = null,
  onMainSelectionClick = null,
  onHandleMouseDown,
  onHandleMouseMove,
  onHandleMouseUp,
  isPlaying,
  isDragging,
  isInverted,
  updateHoverTooltip,
  clearHoverTooltip
}) => {
  const renderCountRef = useRef(0);
  const WAVEFORM_HEIGHT = WAVEFORM_CONFIG.HEIGHT;

  // 🔧 Ref to track pending region clicks (similar to main selection fix)
  const pendingRegionClickRef = useRef(null);
  const pointerDownPositionRef = useRef(null);
  const hasDraggedRef = useRef(false);

  // Performance tracking (production optimized)
  useEffect(() => {
    renderCountRef.current++;
    // Removed excessive console logging for production
  });

  // 🚀 **PHASE 2: ALWAYS SHOW TOOLTIPS** - Remove playing state restrictions for tooltips
  const enableHoverEffects = true; // 🆕 **ALWAYS ENABLE**: Always show hover effects regardless of play state
  const enableNonEssentialTooltips = true; // 🆕 **ALWAYS ENABLE**: Always show all tooltips regardless of play state  // 🚀 **OPTIMIZED CONDITIONAL RENDERING** - Always show tooltips for better UX, but hide hover tooltip during drag operations
  const shouldRenderHoverTooltip = enableHoverEffects && hoverTooltip?.visible && hoverTooltip.x >= 0 && 
    isDragging !== 'start' && isDragging !== 'end' && 
    isDragging !== 'region' && isDragging !== 'region-potential';
  const shouldRenderStartTooltip = enableNonEssentialTooltips && handleTooltips?.start?.visible && handleTooltips.start.x >= 0 && handlePositions?.start;
  const shouldRenderEndTooltip = enableNonEssentialTooltips && handleTooltips?.end?.visible && handleTooltips.end.x >= 0 && handlePositions?.end;
  const shouldRenderDurationTooltip = enableNonEssentialTooltips && handleTooltips?.selectionDuration?.visible && handleTooltips.selectionDuration.x >= 0 && handlePositions?.start && handlePositions?.end;
  const shouldRenderMainCursorTooltip = mainCursorTooltip?.visible && mainCursorTooltip.x >= 0 && cursorPositions?.mainCursor;
  const shouldRenderStartHandle = handlePositions?.start?.visible && handlePositions.start.x >= 0;
  const shouldRenderEndHandle = handlePositions?.end?.visible && handlePositions.end.x >= 0;
  const shouldRenderMainCursor = cursorPositions?.mainCursor?.visible && cursorPositions.mainCursor.x >= 0;
  const shouldRenderHoverLine = enableHoverEffects && cursorPositions?.hoverLine?.visible && cursorPositions.hoverLine.x >= 0;
  // 🚀 **PHASE 3: EVENT HANDLER OPTIMIZATION** - Memoized handlers updated for Pointer Events
  const createHandlePointerDown = useCallback((handleType) => (e) => {
    // 🔧 CRITICAL FIX: Active main region when clicking on its handles
    console.log('🎯🎯🎯 MAIN SELECTION HANDLE CLICKED - DEBUG:', {
      handleType,
      regionsCount: regionPositions?.length || 0,
      shouldActivateMain: regionPositions?.length >= 1,
      pointerPosition: { x: e.clientX, y: e.clientY },
      targetElement: e.target,
      currentTarget: e.currentTarget,
      zIndex: e.currentTarget.style.zIndex || 'from-style-object',
      timestamp: Date.now()
    });
    
    onHandleMouseDown?.({
      clientX: e.clientX,
      clientY: e.clientY,
      handleType,
      isHandleEvent: true,
      isMainSelectionHandle: true, // 🆕 Flag to identify main selection handle
      pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
    });
    e.preventDefault();
    e.stopPropagation();
  }, [onHandleMouseDown, regionPositions?.length]);

  const createHandlePointerMove = useCallback((handleType) => (e) => {
    onHandleMouseMove?.({
      clientX: e.clientX,
      clientY: e.clientY,
      handleType,
      isHandleEvent: true,
      pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
    });
  }, [onHandleMouseMove]);

  const createHandlePointerUp = useCallback((handleType) => (e) => {
    onHandleMouseUp?.({
      handleType,
      isHandleEvent: true,
      pointerId: e.pointerId // 🆕 **POINTER ID**: Add pointer ID for tracking
    });
  }, [onHandleMouseUp]);

  const startHandlePointerDown = useMemo(() => createHandlePointerDown('start'), [createHandlePointerDown]);
  const endHandlePointerDown = useMemo(() => createHandlePointerDown('end'), [createHandlePointerDown]);
  const startHandlePointerMove = useMemo(() => createHandlePointerMove('start'), [createHandlePointerMove]);
  const endHandlePointerMove = useMemo(() => createHandlePointerMove('end'), [createHandlePointerMove]);
  const startHandlePointerUp = useMemo(() => createHandlePointerUp('start'), [createHandlePointerUp]);
  const endHandlePointerUp = useMemo(() => createHandlePointerUp('end'), [createHandlePointerUp]);

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

  const endTooltipStyle = useMemo(() => {
    // 🎯 **END TOOLTIP RIGHT-BASED**: Use rightX property for right-based positioning
    const useRightPositioning = handleTooltips?.end?.rightX !== undefined;
    
    if (useRightPositioning) {
      return {
        ...TOOLTIP_STYLES.base,
        ...TOOLTIP_STYLES.tooltip,
        right: `${handleTooltips.end.rightX}px`, // 🔧 **RIGHT POSITIONING**: Distance from right edge
        top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`,
        left: 'auto', // 🚫 **DISABLE LEFT**: Disable left positioning
        transform: 'translateX(50%)' // 🔧 **REVERSE TRANSFORM**: Since we're positioning from right
      };
    }
    
    // 🔙 **FALLBACK**: Use left positioning if rightX not available
    return {
      ...TOOLTIP_STYLES.base,
      ...TOOLTIP_STYLES.tooltip,
      left: `${handleTooltips?.end?.x || 0}px`,
      top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`
    };
  }, [handleTooltips?.end?.x, handleTooltips?.end?.rightX, WAVEFORM_HEIGHT]);

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
    ...(isInverted ? HANDLE_STYLES.end : HANDLE_STYLES.start),
    left: `${handlePositions?.start?.x || 0}px`,
    top: `${handlePositions?.start?.y || 0}px`,
    width: `${handlePositions?.start?.width || 0}px`,
    height: `${handlePositions?.start?.height || 0}px`,
    backgroundColor: handlePositions?.start?.color || '#14b8a6'
  }), [
    handlePositions?.start?.x,
    handlePositions?.start?.y,
    handlePositions?.start?.width,
    handlePositions?.start?.height,
    handlePositions?.start?.color,
    isInverted
  ]);

  const endHandleStyle = useMemo(() => ({
    ...HANDLE_STYLES.base,
    ...(isInverted ? HANDLE_STYLES.start : HANDLE_STYLES.end),
    left: `${handlePositions?.end?.x || 0}px`,
    top: `${handlePositions?.end?.y || 0}px`,
    width: `${handlePositions?.end?.width || 0}px`,
    height: `${handlePositions?.end?.height || 0}px`,
    backgroundColor: handlePositions?.end?.color || '#14b8a6'
  }), [
    handlePositions?.end?.x,
    handlePositions?.end?.y,
    handlePositions?.end?.width,
    handlePositions?.end?.height,
    handlePositions?.end?.color,
    isInverted
  ]);

  const mainCursorStyle = useMemo(() => ({
    ...CURSOR_STYLES.base,
    left: `${cursorPositions?.mainCursor?.x || 0}px`,
    top: `${cursorPositions?.mainCursor?.y || 0}px`,
    width: `${cursorPositions?.mainCursor?.width || 0}px`,
    height: `${cursorPositions?.mainCursor?.height || 0}px`,
    backgroundColor: cursorPositions?.mainCursor?.color || '#3b82f6',
    zIndex: 30 // Above silence overlay(15) but below handles(40)
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
    zIndex: 25 // Above silence overlay(15) but below main cursor(30) and handles(40)
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

      {/* 🆕 🤚 **REGION HANDLE TOOLTIPS** - Identical to main selection handles */}
      {regionHandleTooltips.map(regionTooltip => (
        <React.Fragment key={`region-handles-${regionTooltip.id}`}>
          {/* Region Start Handle Tooltip */}
          <div
            className="absolute pointer-events-none z-50 waveform-tooltip-custom"
            style={{
              ...TOOLTIP_STYLES.base,
              ...TOOLTIP_STYLES.tooltip,
              left: `${regionTooltip.start.x}px`,
              top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`
            }}
          >
            {regionTooltip.start.formattedTime}
          </div>
          
          {/* Region End Handle Tooltip */}
          <div
            className="absolute pointer-events-none z-50 waveform-tooltip-custom"
            style={{
              ...TOOLTIP_STYLES.base,
              ...TOOLTIP_STYLES.tooltip,
              left: `${regionTooltip.end.x}px`,
              top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.HANDLE}px`
            }}
          >
            {regionTooltip.end.formattedTime}
          </div>
        </React.Fragment>
      ))}

      {/* 📏 **DURATION TOOLTIP** - Smart rendering during playback */}
      {shouldRenderDurationTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={durationTooltipStyle}>
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🆕 📏 **REGION DURATION TOOLTIPS** - Identical to main selection duration */}
      {regionDurationTooltips.map(regionTooltip => (
        <div
          key={`region-duration-${regionTooltip.id}`}
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            ...TOOLTIP_STYLES.base,
            ...TOOLTIP_STYLES.tooltip,
            left: `${regionTooltip.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_OFFSETS.DURATION}px`
          }}
        >
          {regionTooltip.formattedTime}
        </div>
      ))}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - Always visible for playback feedback */}
      {shouldRenderMainCursorTooltip && (
        <div className="absolute pointer-events-none z-50 waveform-tooltip-custom" style={mainCursorTooltipStyle}>
          {mainCursorTooltip.formattedTime}
        </div>
      )}      {/* 🤚 **START HANDLE** - Always functional */}
      {shouldRenderStartHandle && (
        <div
          className="absolute"
          style={startHandleStyle}
          onPointerDown={(e) => {
            console.log('🟦🟦🟦 MAIN START HANDLE - POINTER DOWN:', {
              handleType: 'start',
              elementInfo: {
                className: e.currentTarget.className,
                computedZIndex: getComputedStyle(e.currentTarget).zIndex,
                styleZIndex: e.currentTarget.style.zIndex,
                position: {
                  left: e.currentTarget.style.left,
                  top: e.currentTarget.style.top,
                  width: e.currentTarget.style.width,
                  height: e.currentTarget.style.height
                }
              },
              pointerInfo: {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId,
                target: e.target === e.currentTarget ? 'SAME' : 'DIFFERENT',
                timestamp: Date.now()
              }
            });
            startHandlePointerDown(e);
          }}
          onPointerMove={startHandlePointerMove}
          onPointerUp={startHandlePointerUp}
        >
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
        </div>
      )}      {/* 🤚 **END HANDLE** - Always functional */}
      {shouldRenderEndHandle && (
        <div
          className="absolute"
          style={endHandleStyle}
          onPointerDown={(e) => {
            console.log('🟪🟪🟪 MAIN END HANDLE - POINTER DOWN:', {
              handleType: 'end',
              elementInfo: {
                className: e.currentTarget.className,
                computedZIndex: getComputedStyle(e.currentTarget).zIndex,
                styleZIndex: e.currentTarget.style.zIndex,
                position: {
                  left: e.currentTarget.style.left,
                  top: e.currentTarget.style.top,
                  width: e.currentTarget.style.width,
                  height: e.currentTarget.style.height
                }
              },
              pointerInfo: {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId,
                target: e.target === e.currentTarget ? 'SAME' : 'DIFFERENT',
                timestamp: Date.now()
              }
            });
            endHandlePointerDown(e);
          }}
          onPointerMove={endHandlePointerMove}
          onPointerUp={endHandlePointerUp}
        >
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
          <div style={HANDLE_DOT_STYLE} />
        </div>
      )}

      {/* 🔵 **MAIN CURSOR** - Always visible for playback feedback */}
      {shouldRenderMainCursor && (
        <div className="absolute" style={mainCursorStyle} />
      )}      {/* 🖱️ **HOVER LINE** - Disabled during playback for performance */}
      {shouldRenderHoverLine && (
        <div className="absolute" style={hoverLineStyle} />
      )}      {/* 🆕 **REGION BACKGROUNDS** - Simple clickable areas */}      {regionPositions.map(region => {
        // 🚫 **VALIDATION**: Skip invalid regions first
        if (!region?.startHandle || !region?.endHandle) {
          return null; // Skip regions without proper handle data
        }
        
        const regionStartX = region.startHandle.x;
        const regionStartWidth = region.startHandle.width;
        const regionEndX = region.endHandle.x;
        
        // 🚫 **VALIDATION**: Skip regions where start handle overlaps or comes after end handle
        if (regionStartX + regionStartWidth >= regionEndX) {
          return null; // Skip invalid/inverted regions
        }
        
        // 🔧 **CRITICAL FIX**: Prevent region background from overlapping with main handles
        const mainStartEnd = handlePositions?.start?.x + handlePositions?.start?.width || 0;
        const mainEndStart = handlePositions?.end?.x || 1000000; // Large number if no end handle
        
        // Background should span from end of region start handle to start of region end handle
        const regionBackgroundLeft = regionStartX + regionStartWidth;
        const regionBackgroundRight = regionEndX;
        
        // 🚀 **SMART TRIMMING**: Cut out main handle areas from region background
        const backgroundLeft = Math.max(regionBackgroundLeft, mainStartEnd + 5); // 5px buffer after main start
        const backgroundRight = Math.min(regionBackgroundRight, mainEndStart - 5); // 5px buffer before main end
        const regionWidth = Math.max(0, backgroundRight - backgroundLeft); // Ensure positive width
        
        // 🚫 Skip rendering if region background would be too small
        if (regionWidth < 10) {
          return null; // Silently skip small regions
        }
        
        return (
          <div
            key={`bg-${region.id}`}
            className="absolute"
            style={{
              left: `${backgroundLeft}px`,
              top: `${region.startHandle.y}px`,
              width: `${regionWidth}px`,
              height: `${region.startHandle.height}px`,
              zIndex: 15,
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            onPointerEnter={(e) => {
              if (updateHoverTooltip) {
                updateHoverTooltip(e);
              }
            }}
            onPointerMove={(e) => {
              if (updateHoverTooltip) {
                updateHoverTooltip(e);
              }
              
              if (pointerDownPositionRef.current && !hasDraggedRef.current) {
                const dragDistance = Math.sqrt(
                  Math.pow(e.clientX - pointerDownPositionRef.current.x, 2) + 
                  Math.pow(e.clientY - pointerDownPositionRef.current.y, 2)
                );
                
                if (dragDistance > 3) {
                  hasDraggedRef.current = true;
                  pendingRegionClickRef.current = null;
                }
              }
              
              onRegionBodyMove?.(region.id, e);
            }}
            onPointerLeave={(e) => {
              if (clearHoverTooltip) {
                clearHoverTooltip();
              }
            }}
            onPointerDown={(e) => {
              console.log('🟢 REGION BACKGROUND CLICKED:', {
                regionId: region.id,
                regionName: region.name,
                isActive: region.isActive
              });
              
              e.preventDefault();
              e.stopPropagation();
              
              pointerDownPositionRef.current = { x: e.clientX, y: e.clientY };
              hasDraggedRef.current = false;
              
              // Calculate click position as time
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickRatio = clickX / rect.width;
              const clickTime = region.startTime + (region.endTime - region.startTime) * clickRatio;
              
              if (!region.isActive) {
                console.log('🎯 Immediate region activation:', region.id);
                onRegionClick?.(region.id, null);
              } else {
                pendingRegionClickRef.current = {
                  regionId: region.id,
                  clickTime: clickTime
                };
              }
              
              e.target.style.cursor = 'grabbing';
              onRegionBodyDown?.(region.id, e);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              e.target.style.cursor = 'pointer';
              onRegionBodyUp?.(region.id, e);
              
              if (pendingRegionClickRef.current && onRegionClick && !hasDraggedRef.current) {
                const { regionId, clickTime } = pendingRegionClickRef.current;
                onRegionClick(regionId, clickTime);
              }
              
              pendingRegionClickRef.current = null;
              pointerDownPositionRef.current = null;
              hasDraggedRef.current = false;
            }}
          />
        );
      })}

      {/* 🆕 **REGION HANDLES** - Simple design matching main selection */}
      {regionPositions.map(region => (
        <React.Fragment key={region.id}>
          {/* Region Start Handle */}
          <div
            className="absolute"
            style={{
              ...HANDLE_STYLES.base,
              ...HANDLE_STYLES.start,
              left: `${region.startHandle.x}px`,
              top: `${region.startHandle.y}px`,
              width: `${region.startHandle.width}px`,
              height: `${region.startHandle.height}px`,
              backgroundColor: region.startHandle.color,
              zIndex: 40
            }}            onPointerDown={(e) => {
              console.log('🔴🔴🔴 REGION HANDLE CLICKED - DEBUG:', {
                regionId: region.id,
                regionName: region.name,
                handleType: 'start',
                pointerPosition: { x: e.clientX, y: e.clientY },
                targetElement: e.target,
                currentTarget: e.currentTarget,
                zIndex: e.currentTarget.style.zIndex,
                timestamp: Date.now()
              });
              
              e.preventDefault();
              e.stopPropagation();
              onRegionHandleDown?.(region.id, 'start', e);
            }}
            onPointerMove={(e) => {
              onRegionHandleMove?.(region.id, 'start', e);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegionHandleUp?.(region.id, 'start', e);
            }}
          >
            <div style={HANDLE_DOT_STYLE} />
            <div style={HANDLE_DOT_STYLE} />
            <div style={HANDLE_DOT_STYLE} />
          </div>

          {/* Region End Handle */}
          <div
            className="absolute"
            style={{
              ...HANDLE_STYLES.base,
              ...HANDLE_STYLES.end,
              left: `${region.endHandle.x}px`,
              top: `${region.endHandle.y}px`,
              width: `${region.endHandle.width}px`,
              height: `${region.endHandle.height}px`,
              backgroundColor: region.endHandle.color,
              zIndex: 40
            }}            onPointerDown={(e) => {
              console.log('🟠🟠🟠 REGION HANDLE CLICKED - DEBUG:', {
                regionId: region.id,
                regionName: region.name,
                handleType: 'end',
                pointerPosition: { x: e.clientX, y: e.clientY },
                targetElement: e.target,
                currentTarget: e.currentTarget,
                zIndex: e.currentTarget.style.zIndex,
                timestamp: Date.now()
              });
              
              e.preventDefault();
              e.stopPropagation();
              onRegionHandleDown?.(region.id, 'end', e);
            }}
            onPointerMove={(e) => {
              onRegionHandleMove?.(region.id, 'end', e);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegionHandleUp?.(region.id, 'end', e);
            }}
          >
            <div style={HANDLE_DOT_STYLE} />
            <div style={HANDLE_DOT_STYLE} />
            <div style={HANDLE_DOT_STYLE} />
          </div>
        </React.Fragment>
      ))}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';