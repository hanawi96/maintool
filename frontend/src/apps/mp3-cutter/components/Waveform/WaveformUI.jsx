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
  
  // 🎯 **OPTIMIZED TOOLTIP POSITIONING** - Calculated positions cho better UX
  const TOOLTIP_CONFIG = {
    // 🔤 **SMALLER FONT**: Giảm từ 11px xuống 9px để compact hơn
    FONT_SIZE: '9px',
    
    // 📏 **DURATION TOOLTIP**: Sát đáy waveform hơn (giảm từ -35 xuống -20)
    DURATION_OFFSET: -20, // 200-20=180px from top, sát đáy hơn
    
    // 🤚 **HANDLE TOOLTIPS**: Hạ thấp hơn để tránh handles (tăng từ +5 lên +15)
    HANDLE_OFFSET: 15, // 200+15=215px from top, tránh overlap với handles
    
    // 🖱️ **HOVER TOOLTIP**: Giữ nguyên position trên waveform
    HOVER_OFFSET: -25
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
      
      // 🎯 **ENHANCED DEBUG LOG** - Bao gồm positioning info
      if (renderCountRef.current % 50 === 0 || hasSignificantChange) {
        console.log(`🎨 [WaveformUI] Tooltip Positioning Update #${renderCountRef.current}:`, {
          tooltip: currentState.hasHover ? 'ACTIVE' : 'INACTIVE',
          x: currentState.hoverX ? `${currentState.hoverX.toFixed(0)}px` : 'N/A',
          handles: `Start:${currentState.startVisible} End:${currentState.endVisible}`,
          positioning: {
            waveformHeight: `${WAVEFORM_HEIGHT}px`,
            hoverTooltip: `${TOOLTIP_CONFIG.HOVER_OFFSET}px (above waveform)`,
            durationTooltip: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px (${TOOLTIP_CONFIG.DURATION_OFFSET}px from bottom)`,
            handleTooltips: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px (${TOOLTIP_CONFIG.HANDLE_OFFSET}px below waveform)`
          },
          styling: {
            fontSize: TOOLTIP_CONFIG.FONT_SIZE,
            improvements: 'Font nhỏ hơn, Duration sát đáy hơn, Handles tránh overlap'
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

  // 🔧 **POSITION DEBUG**: Log positioning khi có tooltip hiển thị
  useEffect(() => {
    if (shouldRenderDurationTooltip && Math.random() < 0.1) { // 10% sampling
      console.log('📏 [Tooltip Position Debug] Duration tooltip positioning:', {
        x: handleTooltips.selectionDuration.x,
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET,
        waveformHeight: WAVEFORM_HEIGHT,
        offset: TOOLTIP_CONFIG.DURATION_OFFSET,
        result: `Sát đáy waveform ${Math.abs(TOOLTIP_CONFIG.DURATION_OFFSET)}px`
      });
    }
    
    if ((shouldRenderStartTooltip || shouldRenderEndTooltip) && Math.random() < 0.1) { // 10% sampling
      console.log('🤚 [Tooltip Position Debug] Handle tooltips positioning:', {
        startX: shouldRenderStartTooltip ? handleTooltips.start.x : 'N/A',
        endX: shouldRenderEndTooltip ? handleTooltips.end.x : 'N/A',
        calculatedTop: WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET,
        waveformHeight: WAVEFORM_HEIGHT,
        offset: TOOLTIP_CONFIG.HANDLE_OFFSET,
        result: `Dưới waveform ${TOOLTIP_CONFIG.HANDLE_OFFSET}px, tránh handles`
      });
    }
  }, [shouldRenderDurationTooltip, shouldRenderStartTooltip, shouldRenderEndTooltip, handleTooltips]);

  return (
    <>
      {/* 🖱️ **HOVER TOOLTIP** - COMPACT FONT: Font nhỏ hơn cho UX tốt hơn */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: `${TOOLTIP_CONFIG.HOVER_OFFSET}px`, // Giữ nguyên -25px
            transform: 'translateX(-50%)',
            color: '#6b7280', // 🎯 **SIMPLE**: Chỉ màu text xám
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **SMALLER**: 9px thay vì 11px
            fontWeight: '600',
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🟢 **START HANDLE TOOLTIP** - LOWER POSITION: Hạ thấp để tránh handles */}
      {shouldRenderStartTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.start.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // 🔧 **LOWER**: +15px thay vì +5px
            transform: 'translateX(-50%)',
            color: '#14b8a6', // 🎯 **SIMPLE**: Chỉ màu text teal như handle
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **SMALLER**: 9px thay vì 11px
            fontWeight: '600',
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.start.formattedTime}
        </div>
      )}

      {/* 🟠 **END HANDLE TOOLTIP** - LOWER POSITION: Hạ thấp để tránh handles */}
      {shouldRenderEndTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.end.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.HANDLE_OFFSET}px`, // 🔧 **LOWER**: +15px thay vì +5px
            transform: 'translateX(-50%)',
            color: '#f97316', // 🎯 **SIMPLE**: Chỉ màu text orange như handle
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **SMALLER**: 9px thay vì 11px
            fontWeight: '600',
            fontFamily: 'monospace', // 🆕 **MONOSPACE**: Font mono cho số
            whiteSpace: 'nowrap'
          }}
        >
          {handleTooltips.end.formattedTime}
        </div>
      )}

      {/* 📏 **SELECTION DURATION TOOLTIP** - CLOSER TO BOTTOM: Sát đáy waveform hơn */}
      {shouldRenderDurationTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: `${WAVEFORM_HEIGHT + TOOLTIP_CONFIG.DURATION_OFFSET}px`, // 🔧 **CLOSER**: -20px thay vì -35px
            transform: 'translateX(-50%)',
            color: '#8b5cf6', // 🎯 **SIMPLE**: Chỉ màu text, không background
            fontSize: TOOLTIP_CONFIG.FONT_SIZE, // 🔤 **SMALLER**: 9px thay vì 11px
            fontWeight: '600',
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