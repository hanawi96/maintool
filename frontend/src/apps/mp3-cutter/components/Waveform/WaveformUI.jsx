import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **ULTRA-OPTIMIZED COMPONENT** - Loại bỏ excessive re-renders
export const WaveformUI = memo(({ hoverTooltip, handleTooltips, currentTimeTooltip }) => {
  // 🔧 **MINIMAL DEBUG REFS** - Chỉ track cần thiết
  const renderCountRef = useRef(0);
  const lastLogTimeRef = useRef(0);
  const lastTooltipStateRef = useRef(null);
  
  // 🚀 **HEAVY THROTTLED DEBUG** - Chỉ log mỗi 3 giây hoặc khi có thay đổi lớn
  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    
    // 🎯 **SIGNIFICANT CHANGE DETECTION** - Chỉ log khi thực sự cần thiết
    const currentState = {
      hasCurrentTime: !!currentTimeTooltip,
      currentTimeVisible: currentTimeTooltip?.visible,
      currentTimeX: currentTimeTooltip?.x,
      isPlaying: currentTimeTooltip?.isPlaying
    };
    
    const lastState = lastTooltipStateRef.current;
    const hasSignificantChange = !lastState ||
      currentState.hasCurrentTime !== lastState.hasCurrentTime ||
      currentState.currentTimeVisible !== lastState.currentTimeVisible ||
      currentState.isPlaying !== lastState.isPlaying ||
      Math.abs((currentState.currentTimeX || 0) - (lastState.currentTimeX || 0)) > 10; // 10px threshold
    
    // 🚀 **ULTRA REDUCED LOGGING** - Chỉ log mỗi 5 giây hoặc changes lớn
    if ((now - lastLogTimeRef.current > 5000) || hasSignificantChange) {
      lastLogTimeRef.current = now;
      lastTooltipStateRef.current = currentState;
      
      // 🎯 **MINIMAL LOG** - Chỉ thông tin cần thiết
      if (renderCountRef.current % 50 === 0 || hasSignificantChange) {
        console.log(`🎨 [WaveformUI] Render #${renderCountRef.current}:`, {
          tooltip: currentState.hasCurrentTime ? 'ACTIVE' : 'INACTIVE',
          playing: currentState.isPlaying ? 'YES' : 'NO',
          x: currentState.currentTimeX ? `${currentState.currentTimeX.toFixed(0)}px` : 'N/A'
        });
      }
    }
  });

  // 🚀 **CONDITIONAL RENDERING** - Chỉ render khi thực sự cần thiết
  const shouldRenderCurrentTimeTooltip = currentTimeTooltip?.visible && 
    typeof currentTimeTooltip.x === 'number' && 
    !isNaN(currentTimeTooltip.x) &&
    currentTimeTooltip.x >= 0;

  const shouldRenderHoverTooltip = hoverTooltip?.visible && 
    typeof hoverTooltip.x === 'number' && 
    !isNaN(hoverTooltip.x) &&
    hoverTooltip.x >= 0;

  return (
    <>
      {/* 🎵 **CURRENT TIME TOOLTIP** - Tooltip theo cursor phát nhạc (PRIORITY 1) */}
      {shouldRenderCurrentTimeTooltip && (
        <div
          className="absolute pointer-events-none text-xs font-bold z-60"
          style={{
            left: `${currentTimeTooltip.x}px`,
            top: '-35px',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            whiteSpace: 'nowrap',
            fontWeight: '700',
            fontSize: '12px',
            backgroundColor: currentTimeTooltip.isPlaying ? '#3b82f6' : '#6366f1', // Blue khi phát, indigo khi pause
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: currentTimeTooltip.isPlaying 
              ? '0 4px 12px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)' 
              : '0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.3)',
            backdropFilter: 'blur(8px)',
            zIndex: 60
          }}
        >
          <div className="flex items-center gap-1">
            {/* 🎵 **STATUS ICON** - Icon thể hiện trạng thái */}
            <span className="text-white opacity-90" style={{ fontSize: '10px' }}>
              {currentTimeTooltip.isPlaying ? '▶️' : '⏸️'}
            </span>
            <span className="text-white font-mono tracking-wider">
              {currentTimeTooltip.formattedTime}
            </span>
          </div>
          
          {/* 🎯 **ANIMATED INDICATOR** - Chấm nhấp nháy khi đang phát */}
          {currentTimeTooltip.isPlaying && (
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-80"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
          )}
        </div>
      )}

      {/* 🖱️ **HOVER TOOLTIP** - Tooltip khi hover chuột (PRIORITY 2) */}
      {shouldRenderHoverTooltip && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${hoverTooltip.x}px`,
            top: '-25px',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          🖱️ {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🎛️ **START HANDLE TOOLTIP** */}
      {handleTooltips?.startHandle?.visible && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.startHandle.x}px`,
            top: '-45px',
            transform: 'translateX(-50%)',
            color: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          ⏭ {handleTooltips.startHandle.formattedTime}
        </div>
      )}

      {/* 🎛️ **END HANDLE TOOLTIP** */}
      {handleTooltips?.endHandle?.visible && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.endHandle.x}px`,
            top: '-45px',
            transform: 'translateX(-50%)',
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          ⏹ {handleTooltips.endHandle.formattedTime}
        </div>
      )}

      {/* 📏 **SELECTION DURATION TOOLTIP** */}
      {handleTooltips?.selectionDuration?.visible && (
        <div
          className="absolute pointer-events-none text-xs z-50"
          style={{
            left: `${handleTooltips.selectionDuration.x}px`,
            top: '-65px',
            transform: 'translateX(-50%)',
            color: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid #8b5cf6',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          📏 {handleTooltips.selectionDuration.formattedTime}
        </div>
      )}
    </>
  );
});

WaveformUI.displayName = 'WaveformUI';