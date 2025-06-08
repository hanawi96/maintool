import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - Loại bỏ excessive re-renders
export const WaveformUI = memo(({ hoverTooltip, handleTooltips, mainCursorTooltip }) => {
  // 🔧 **MINIMAL DEBUG REFS** - Chỉ track cần thiết
  const renderCountRef = useRef(0);
  const lastLogTimeRef = useRef(0);
  const lastTooltipStateRef = useRef(null);
  
  // 🆕 **WAVEFORM CONSTANTS** - Sử dụng height từ config để positioning chính xác
  const WAVEFORM_HEIGHT = WAVEFORM_CONFIG.HEIGHT; // 200px
  
  // 🎯 **MINIMAL TOOLTIP STYLING** - Ultra compact và subtle design
  const TOOLTIP_CONFIG = {
    // 🔤 **ULTRA SMALL FONT**: Giảm từ 9px xuống 7px để ultra compact
    FONT_SIZE: '7px',
    
    // 📏 **DURATION ULTRA CLOSE**: Sát đáy waveform hơn nữa (giảm từ -20 xuống -8)
    DURATION_OFFSET: -8, // 200-8=192px from top, cực kì sát đáy
    
    // 🤚 **HANDLE TOOLTIPS**: Giữ nguyên khoảng cách tránh handles
    HANDLE_OFFSET: 15, // 200+15=215px from top, tránh overlap với handles
    
    // 🖱️ **HOVER TOOLTIP**: Giữ nguyên position trên waveform
    HOVER_OFFSET: -25,
    
    // 🔵 **MAIN CURSOR TOOLTIP**: Position rất gần main cursor - theo yêu cầu user
    MAIN_CURSOR_OFFSET: -5, // Chỉ 5px trên cursor line - cực kì gần cursor
    
    // 🎨 **MINIMAL STYLING**: Bỏ tất cả hiệu ứng màu sắc và tô đậm
    COLOR: '#9ca3af', // Màu xám neutral cho tất cả tooltips
    FONT_WEIGHT: '400', // Normal weight thay vì bold
    
    // 🆕 **MAIN CURSOR STYLING**: Styling riêng cho main cursor tooltip
    MAIN_CURSOR_FONT_SIZE: '6px', // Font nhỏ hơn cho main cursor
    MAIN_CURSOR_COLOR: '#374151', // Màu đậm hơn cho main cursor
    MAIN_CURSOR_FONT_WEIGHT: '600' // Bold cho main cursor
  };

  // 🚀 **HEAVY THROTTLED DEBUG** - Chỉ log mỗi 3 giây hoặc khi có thay đổi lớn
  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    
    // 🎯 **SIGNIFICANT CHANGE DETECTION** - Chỉ log khi thực sự cần thiết
    const currentState = {
      hasHover: !!hoverTooltip,
      hoverVisible: hoverTooltip?.visible,
      hoverX: hoverTooltip?.x,
      hasHandles: !!handleTooltips,
      startVisible: handleTooltips?.start?.visible,
      endVisible: handleTooltips?.end?.visible,
      durationVisible: handleTooltips?.selectionDuration?.visible,
      // 🆕 **MAIN CURSOR STATE**: Track main cursor tooltip state
      hasMainCursor: !!mainCursorTooltip,
      mainCursorVisible: mainCursorTooltip?.visible,
      mainCursorX: mainCursorTooltip?.x
    };
    
    const lastState = lastTooltipStateRef.current;
    const hasSignificantChange = !lastState ||
      currentState.hasHover !== lastState.hasHover ||
      currentState.hoverVisible !== lastState.hoverVisible ||
      currentState.hoverX !== lastState.hoverX ||
      currentState.hasHandles !== lastState.hasHandles ||
      currentState.startVisible !== lastState.startVisible ||
      currentState.endVisible !== lastState.endVisible ||
      currentState.durationVisible !== lastState.durationVisible ||
      // 🆕 **MAIN CURSOR CHANGE DETECTION**: Track main cursor changes
      currentState.hasMainCursor !== lastState.hasMainCursor ||
      currentState.mainCursorVisible !== lastState.mainCursorVisible ||
      currentState.mainCursorX !== lastState.mainCursorX ||
      Math.abs((currentState.hoverX || 0) - (lastState.hoverX || 0)) > 10 || // 10px threshold
      Math.abs((currentState.mainCursorX || 0) - (lastState.mainCursorX || 0)) > 5; // 5px threshold cho main cursor
    
    // 🚀 **ULTRA REDUCED LOGGING** - Chỉ log mỗi 5 giây hoặc changes lớn
    if ((now - lastLogTimeRef.current > 5000) || hasSignificantChange) {
      lastLogTimeRef.current = now;
      lastTooltipStateRef.current = currentState;
      
      // 🎯 **MINIMAL STYLING DEBUG LOG** - Bao gồm main cursor tooltip
      if (renderCountRef.current % 50 === 0 || hasSignificantChange) {
        console.log(`🎨 [WaveformUI] Minimal Tooltip Styling #${renderCountRef.current}:`, {
          tooltip: currentState.hasHover ? 'ACTIVE' : 'INACTIVE',
          x: currentState.hoverX ? `${currentState.hoverX.toFixed(0)}px` : 'N/A',
          handles: `Start:${currentState.startVisible} End:${currentState.endVisible}`,
          // 🆕 **MAIN CURSOR LOG**: Bao gồm main cursor tooltip state
          mainCursor: currentState.hasMainCursor ? 
            `ACTIVE (${currentState.mainCursorX?.toFixed(0)}px)` : 'INACTIVE',
          positioning: {
            waveformHeight: `${WAVEFORM_HEIGHT}px`,
            hoverTooltip: `${TOOLTIP_CONFIG.HOVER_OFFSET}px (above waveform)`,
            durationTooltip: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px (chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy!)`,
            handleTooltips: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px (${TOOLTIP_CONFIG.HANDLE_OFFSET}px below waveform)`,
            // 🆕 **MAIN CURSOR POSITION**: Thêm main cursor position
            mainCursorTooltip: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px (chỉ 5px trên main cursor line - cực kì gần!)`
          },
          styling: {
            fontSize: TOOLTIP_CONFIG.FONT_SIZE,
            color: TOOLTIP_CONFIG.COLOR,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            // 🆕 **MAIN CURSOR STYLING**: Bao gồm styling riêng cho main cursor
            mainCursorFontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE,
            mainCursorColor: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR,
            mainCursorFontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT,
            improvements: 'Ultra compact: 7px font, no colors, no bold, main cursor 6px+đậm+gần'
          }
        });
      }
    }
  });

  // 🚀 **CONDITIONAL RENDERING** - Chỉ render khi thực sự cần thiết
  const shouldRenderHoverTooltip = hoverTooltip?.visible && 
    typeof hoverTooltip.x === 'number' && 
    !isNaN(hoverTooltip.x) &&
    hoverTooltip.x >= 0;

  const shouldRenderStartTooltip = handleTooltips?.start?.visible &&
    typeof handleTooltips.start.x === 'number' &&
    !isNaN(handleTooltips.start.x) &&
    handleTooltips.start.x >= 0;

  const shouldRenderEndTooltip = handleTooltips?.end?.visible &&
    typeof handleTooltips.end.x === 'number' &&
    !isNaN(handleTooltips.end.x) &&
    handleTooltips.end.x >= 0;

  const shouldRenderDurationTooltip = handleTooltips?.selectionDuration?.visible &&
    typeof handleTooltips.selectionDuration.x === 'number' &&
    !isNaN(handleTooltips.selectionDuration.x) &&
    handleTooltips.selectionDuration.x >= 0;

  // 🆕 **MAIN CURSOR TOOLTIP RENDER CHECK**: Chỉ render khi main cursor đang hiển thị
  const shouldRenderMainCursorTooltip = mainCursorTooltip?.visible &&
    typeof mainCursorTooltip.x === 'number' &&
    !isNaN(mainCursorTooltip.x) &&
    mainCursorTooltip.x >= 0;

  // 🔧 **INSTANT TOOLTIP DEBUG**: Log instant positioning và verify zero delay
  useEffect(() => {
    if (shouldRenderDurationTooltip && Math.random() < 0.1) { // 10% sampling
      console.log('📏 [INSTANT-TOOLTIP] Duration positioned via DIRECT CALCULATION:', {
        x: handleTooltips.selectionDuration.x,
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET,
        waveformHeight: WAVEFORM_HEIGHT,
        offset: TOOLTIP_CONFIG.DURATION_OFFSET,
        distanceFromBottom: Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET),
        method: 'INSTANT_SYNC_NO_ANIMATION_FRAMES',
        result: `CỰC KÌ SÁT ĐÁY - chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy waveform!`
      });
    }
    
    if ((shouldRenderStartTooltip || shouldRenderEndTooltip) && Math.random() < 0.1) { // 10% sampling
      console.log('🤚 [INSTANT-TOOLTIP] Handle positions via DIRECT CALCULATION:', {
        startX: shouldRenderStartTooltip ? handleTooltips.start.x : 'N/A',
        endX: shouldRenderEndTooltip ? handleTooltips.end.x : 'N/A',
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET,
        method: 'INSTANT_SYNC_FROM_PROPS',
        performance: 'ZERO_DELAY_GUARANTEED',
        styling: {
          fontSize: TOOLTIP_CONFIG.FONT_SIZE,
          color: TOOLTIP_CONFIG.COLOR,
          fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
          note: 'Bỏ hết màu sắc và tô đậm - minimal design + instant response'
        }
      });
    }
    
    // 🆕 **MAIN CURSOR TOOLTIP DEBUG**: Log main cursor positioning
    if (shouldRenderMainCursorTooltip && Math.random() < 0.02) { // 2% sampling để tránh spam
      console.log('🔵 [INSTANT-MAIN-CURSOR-TOOLTIP] Position via DIRECT CALCULATION:', {
        x: mainCursorTooltip.x,
        calculatedTop: TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET,
        currentTime: mainCursorTooltip.time?.toFixed(3) + 's',
        formattedTime: mainCursorTooltip.formattedTime,
        method: 'INSTANT_SYNC_FROM_CURRENT_TIME',
        performance: 'ZERO_DELAY_GUARANTEED',
        positioning: 'Chỉ 5px trên main cursor line - cực kì gần theo yêu cầu user',
        styling: {
          fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 6px
          color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // darker
          fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // bold
          note: 'Font nhỏ hơn (6px), màu đậm hơn, bold - theo yêu cầu user'
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, shouldRenderMainCursorTooltip, handleTooltips, mainCursorTooltip]);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - ULTRA MINIMAL: Font cực nhỏ, màu neutral */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`, // Giữ nguyên -25px
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEUTRAL**: Màu xám thay vì màu riêng
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA SMALL**: 7px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** - MINIMAL STYLING: Bỏ màu teal, bỏ bold */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEUTRAL**: Bỏ màu teal, dùng xám
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA SMALL**: 7px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** - MINIMAL STYLING: Bỏ màu orange, bỏ bold */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEUTRAL**: Bỏ màu orange, dùng xám
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA SMALL**: 7px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** - ULTRA CLOSE TO BOTTOM: Cực kì sát đáy waveform */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -8px từ đáy!
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEUTRAL**: Bỏ màu purple, dùng xám
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA SMALL**: 7px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - MINIMAL STYLING: Trên main cursor line khi đang play */}
      {shouldRenderMainCursorTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${mainCursorTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px`, // 🔧 **ABOVE CURSOR**: -5px để gần cursor hơn
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // 🎨 **DARKER**: Màu đậm hơn cho main cursor
            fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 🔤 **SMALLER**: Font nhỏ hơn cho main cursor
            fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // 🚫 **BOLD**: Bold cho main cursor
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {mainCursorTooltip.formattedTime}
        </div>
      )}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';