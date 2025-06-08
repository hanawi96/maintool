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
    // 🔤 **ULTRA SMALL FONT**: Giảm thêm 3px nữa theo yêu cầu user: 7px → 4px
    FONT_SIZE: '4px',
    
    // 📏 **DURATION ULTRA CLOSE**: Sát đáy waveform hơn nữa (giảm từ -20 xuống -8)
    DURATION_OFFSET: -8, // 200-8=192px from top, cực kì sát đáy
    
    // 🤚 **HANDLE TOOLTIPS**: Giữ nguyên khoảng cách tránh handles
    HANDLE_OFFSET: 15, // 200+15=215px from top, tránh overlap với handles
    
    // 🖱️ **HOVER TOOLTIP**: Cực kì gần hover line - theo yêu cầu user
    HOVER_OFFSET: -3, // Chỉ 3px trên hover line - cực kì gần theo yêu cầu user
    
    // 🔵 **MAIN CURSOR TOOLTIP**: Position cực kì gần main cursor - theo yêu cầu user mới
    MAIN_CURSOR_OFFSET: -3, // Chỉ 3px trên cursor line - gần hơn nữa theo yêu cầu user
    
    // 🎨 **NEW COLOR STYLING**: Màu mới theo yêu cầu user
    COLOR: '#2d3436', // Màu mới thay thế #9ca3af theo yêu cầu user
    FONT_WEIGHT: '400', // Normal weight thay vì bold
    
    // 🆕 **MAIN CURSOR STYLING**: Styling riêng cho main cursor tooltip
    MAIN_CURSOR_FONT_SIZE: '3px', // Font nhỏ hơn nữa: 6px → 3px (giảm 3px theo yêu cầu)
    MAIN_CURSOR_COLOR: '#2d3436', // Same color như các tooltip khác
    MAIN_CURSOR_FONT_WEIGHT: '400' // Normal weight thay vì bold - bỏ tô đậm theo yêu cầu user
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
            hoverTooltip: `${TOOLTIP_CONFIG.HOVER_OFFSET}px (chỉ 3px trên hover line - cực kì gần!)`,
            durationTooltip: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px (chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy!)`,
            handleTooltips: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px (${TOOLTIP_CONFIG.HANDLE_OFFSET}px below waveform)`,
            // 🆕 **MAIN CURSOR POSITION**: Main cursor position mới gần hơn
            mainCursorTooltip: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px (chỉ 3px trên main cursor line - gần hơn nữa!)`
          },
          styling: {
            fontSize: TOOLTIP_CONFIG.FONT_SIZE,
            color: TOOLTIP_CONFIG.COLOR,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            // 🆕 **MAIN CURSOR STYLING**: Bao gồm styling mới cho main cursor
            mainCursorFontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE,
            mainCursorColor: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR,
            mainCursorFontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT,
            improvements: 'Ultra mini: 4px font, main cursor 3px NO BOLD+3px gần, ẩn hover khi drag handles, màu #2d3436'
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
          note: 'Font 4px cực nhỏ, màu #2d3436 - theo yêu cầu user mới'
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
        positioning: 'Chỉ 3px trên main cursor line - gần hơn nữa theo yêu cầu user',
        styling: {
          fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 3px
          color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // #2d3436
          fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // normal weight
          note: 'Font cực nhỏ (3px), màu #2d3436, NO BOLD, position 3px - theo yêu cầu user mới'
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, shouldRenderMainCursorTooltip, handleTooltips, mainCursorTooltip]);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - ULTRA MINIMAL: Font cực nhỏ (4px), màu #2d3436 */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`, // -3px trên hover line
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEW COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA MINI**: 4px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** - ULTRA MINIMAL: Font 4px, màu #2d3436 */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEW COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA MINI**: 4px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** - ULTRA MINIMAL: Font 4px, màu #2d3436 */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEW COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA MINI**: 4px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** - ULTRA MINIMAL: Font 4px, màu #2d3436, cực sát đáy */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -8px từ đáy!
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **NEW COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **ULTRA MINI**: 4px cực compact
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - ULTRA MINIMAL: Font 3px, màu #2d3436, NO BOLD, chỉ 3px trên cursor */}
      {shouldRenderMainCursorTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${mainCursorTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -3px để cực gần cursor
            transform: 'translateX(-50%)',
            color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // 🎨 **NEW COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 🔤 **ULTRA MINI**: Font 3px cực nhỏ
            fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight theo yêu cầu user
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