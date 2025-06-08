import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - Loại bỏ excessive re-renders
export const WaveformUI = memo(({ hoverTooltip, handleTooltips }) => {
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
    
    // 🎨 **MINIMAL STYLING**: Bỏ tất cả hiệu ứng màu sắc và tô đậm
    COLOR: '#9ca3af', // Màu xám neutral cho tất cả tooltips
    FONT_WEIGHT: '400' // Normal weight thay vì bold
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
      durationVisible: handleTooltips?.selectionDuration?.visible
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
      Math.abs((currentState.hoverX || 0) - (lastState.hoverX || 0)) > 10; // 10px threshold
    
    // 🚀 **ULTRA REDUCED LOGGING** - Chỉ log mỗi 5 giây hoặc changes lớn
    if ((now - lastLogTimeRef.current > 5000) || hasSignificantChange) {
      lastLogTimeRef.current = now;
      lastTooltipStateRef.current = currentState;
      
      // 🎯 **MINIMAL STYLING DEBUG LOG** - Bao gồm styling changes
      if (renderCountRef.current % 50 === 0 || hasSignificantChange) {
        console.log(`🎨 [WaveformUI] Minimal Tooltip Styling #${renderCountRef.current}:`, {
          tooltip: currentState.hasHover ? 'ACTIVE' : 'INACTIVE',
          x: currentState.hoverX ? `${currentState.hoverX.toFixed(0)}px` : 'N/A',
          handles: `Start:${currentState.startVisible} End:${currentState.endVisible}`,
          positioning: {
            waveformHeight: `${WAVEFORM_HEIGHT}px`,
            hoverTooltip: `${TOOLTIP_CONFIG.HOVER_OFFSET}px (above waveform)`,
            durationTooltip: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px (chỉ ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px từ đáy!)`,
            handleTooltips: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px (${TOOLTIP_CONFIG.HANDLE_OFFSET}px below waveform)`
          },
          styling: {
            fontSize: TOOLTIP_CONFIG.FONT_SIZE,
            color: TOOLTIP_CONFIG.COLOR,
            fontWeight: TOOLTIP_CONFIG.FONT_WEIGHT,
            improvements: 'Ultra compact: 7px font, no colors, no bold, duration cực sát đáy'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, handleTooltips]);

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
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';