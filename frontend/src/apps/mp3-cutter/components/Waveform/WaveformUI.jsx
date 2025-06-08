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
  
  // 🎯 **TOOLTIP STYLING** - 0.5rem font theo yêu cầu user mới  
  const TOOLTIP_CONFIG = {
    // 🔤 **0.5REM FONT**: Font size theo yêu cầu user: 0.5rem
    FONT_SIZE: '0.65rem',
    
    // 📏 **DURATION ULTRA CLOSE**: Sát đáy waveform hơn nữa (giảm từ -20 xuống -8)
    DURATION_OFFSET: 0, // 200-8=192px from top, cực kì sát đáy
    
    // 🤚 **HANDLE TOOLTIPS**: Giữ nguyên khoảng cách tránh handles
    HANDLE_OFFSET: 19, // 200+15=215px from top, tránh overlap với handles
    
    // 🖱️ **HOVER TOOLTIP**: Cực kì gần hover line - theo yêu cầu user
    HOVER_OFFSET: 2, // Chỉ 3px trên hover line - cực kì gần theo yêu cầu user
    
    // 🔵 **MAIN CURSOR TOOLTIP**: Position cực kì gần main cursor - theo yêu cầu user mới
    MAIN_CURSOR_OFFSET: 2, // Chỉ 3px trên cursor line - gần hơn nữa theo yêu cầu user
    
    // 🎨 **COLOR STYLING**: Màu theo yêu cầu user
    COLOR: '#2d3436', // Màu theo yêu cầu user
    FONT_WEIGHT: '400', // Normal weight thay vì bold
    
    // 🆕 **MAIN CURSOR STYLING**: Styling riêng cho main cursor tooltip - cũng 0.5rem
    MAIN_CURSOR_FONT_SIZE: '0.65rem', // Font 0.5rem theo yêu cầu user mới
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
            improvements: 'Font 0.5rem cho tất cả tooltips + centering fix, FIX CSS override với custom class, ẩn hover khi drag handles, ẩn duration khi region nhỏ, màu #2d3436'
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
        result: `CỰC KÌ SÁT ĐÁY - chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy waveform!`,
        note: 'Duration tooltip hiển thị vì region đủ rộng (>24px) - theo yêu cầu user'
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
          note: 'Font 3px cực nhỏ, màu #2d3436 - theo yêu cầu user mới'
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
          fontSize: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE, // 2px
          color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // #2d3436
          fontWeight: TOOLTIP_CONFIG.MAIN_CURSOR_FONT_WEIGHT, // normal weight
          note: 'Font cực micro (2px), màu #2d3436, NO BOLD, position 3px - theo yêu cầu user mới'
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, shouldRenderMainCursorTooltip, handleTooltips, mainCursorTooltip]);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`, // -3px trên hover line
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Normal weight
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🤚 **START HANDLE TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác với handle
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🤚 **END HANDLE TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // Giữ nguyên +15px
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác với handle
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **DURATION TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -8px từ đáy!
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo căn giữa chính xác
            color: TOOLTIP_CONFIG.COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT, // 🚫 **NO BOLD**: Bỏ tô đậm
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}

      {/* 🔵 **MAIN CURSOR TOOLTIP** - 0.5rem font size, căn giữa chính xác */}
      {shouldRenderMainCursorTooltip && (
        <div
          className="absolute pointer-events-none z-50 waveform-tooltip-custom"
          style={{
            left: `${mainCursorTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.MAIN_CURSOR_OFFSET}px`, // 🔧 **ULTRA CLOSE**: -3px để cực gần cursor
            transform: 'translateX(-50%)', // 🔧 **CĂNG GIỮA**: Đảm bảo cursor nằm chính giữa tooltip
            color: TOOLTIP_CONFIG.MAIN_CURSOR_COLOR, // 🎨 **COLOR**: Màu #2d3436 theo yêu cầu user
            fontSize: `${TOOLTIP_CONFIG.MAIN_CURSOR_FONT_SIZE} !important`, // 🔤 **0.5REM FONT**: với !important override CSS
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