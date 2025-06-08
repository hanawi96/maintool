import React, { useEffect, useRef, memo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants.js';

// 🚀 **MEMOIZED COMPONENT**: Prevent unnecessary re-renders
export const WaveformUI = memo(({ hoverTooltip, handleTooltips, currentTimeTooltip }) => {
  // 🔧 **DEBUG REFS**: Track render counts (reduced logging)
  const renderCountRef = useRef(0);
  const lastCurrentTimeTooltipRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  
  // 🔧 **THROTTLED DEBUG**: Only log significant changes
  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    
    // 🚀 **REDUCED DEBUG FREQUENCY**: Only log every 1 second or on significant changes
    if (now - lastLogTimeRef.current > 1000 || renderCountRef.current <= 5) {
      lastLogTimeRef.current = now;
      
      console.log(`🎨 [WaveformUI] Render #${renderCountRef.current}:`, {
        currentTimeTooltip: {
          exists: !!currentTimeTooltip,
          visible: currentTimeTooltip?.visible || false,
          x: currentTimeTooltip?.x || 'N/A',
          time: currentTimeTooltip?.time || 'N/A',
          formattedTime: currentTimeTooltip?.formattedTime || 'N/A',
          isPlaying: currentTimeTooltip?.isPlaying || false
        },
        hoverTooltip: {
          exists: !!hoverTooltip,
          visible: hoverTooltip?.visible || false
        },
        handleTooltips: {
          startHandle: !!handleTooltips?.startHandle,
          endHandle: !!handleTooltips?.endHandle,
          selectionDuration: !!handleTooltips?.selectionDuration
        }
      });
    }
  });

  // 🔧 **CHANGE TRACKING**: Only log when currentTimeTooltip actually changes
  useEffect(() => {
    const current = currentTimeTooltip;
    const last = lastCurrentTimeTooltipRef.current;
    
    // 🚀 **SIGNIFICANT CHANGE DETECTION**: Only log meaningful changes
    if (current && (!last || 
        Math.abs(current.x - (last.x || 0)) > 1 || // 1px threshold
        current.visible !== last.visible ||
        current.isPlaying !== last.isPlaying)) {
      
      console.log('🎨 [WaveformUI] CurrentTimeTooltip CHANGED:', {
        from: last ? {
          x: last.x?.toFixed(1),
          time: last.time?.toFixed(3),
          visible: last.visible,
          isPlaying: last.isPlaying
        } : null,
        to: {
          x: current.x?.toFixed(1),
          time: current.time?.toFixed(3),
          visible: current.visible,
          isPlaying: current.isPlaying
        }
      });
    }
    
    lastCurrentTimeTooltipRef.current = current;
  }, [currentTimeTooltip]);

  // 🚀 **CONDITIONAL RENDERING**: Only render when needed
  const shouldRenderCurrentTimeTooltip = currentTimeTooltip?.visible && 
    typeof currentTimeTooltip.x === 'number' && 
    !isNaN(currentTimeTooltip.x);

  // 🔧 **SINGLE DEBUG LOG**: Reduced console spam
  if (shouldRenderCurrentTimeTooltip && renderCountRef.current % 60 === 0) {
    console.log('🎨 [WaveformUI] RENDERING currentTimeTooltip:', {
      x: currentTimeTooltip.x,
      time: currentTimeTooltip.time,
      formattedTime: currentTimeTooltip.formattedTime,
      visible: currentTimeTooltip.visible,
      isPlaying: currentTimeTooltip.isPlaying
    });
  }

  return (
    <>
      {/* 🆕 **CURRENT TIME TOOLTIP**: Tooltip cho main cursor phát nhạc */}
      {shouldRenderCurrentTimeTooltip && (
        <div
          className="absolute pointer-events-none text-xs font-bold z-60"
          style={{
            left: `${currentTimeTooltip.x}px`,
            top: '-35px', // Cao hơn hover tooltip để tránh overlap
            transform: 'translateX(-50%)',
            color: '#ffffff',
            whiteSpace: 'nowrap',
            fontWeight: '700',
            fontSize: '12px',
            backgroundColor: currentTimeTooltip.isPlaying ? '#3b82f6' : '#2563eb', // Blue khi phát, dark blue khi pause
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: currentTimeTooltip.isPlaying 
              ? '0 4px 12px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.3)' 
              : '0 4px 12px rgba(37, 99, 235, 0.4), 0 0 0 1px rgba(37, 99, 235, 0.3)',
            backdropFilter: 'blur(8px)',
            zIndex: 60,
            transition: currentTimeTooltip.isPlaying ? 'none' : 'all 0.2s ease-out', // No transition khi phát để smooth
            animation: currentTimeTooltip.isPlaying ? 'pulse 2s ease-in-out infinite' : 'none' // Pulse animation khi phát
          }}
        >
          <div className="flex items-center gap-1">
            {/* 🎵 **MUSIC ICON**: Icon cho current time */}
            <span className="text-white opacity-90">
              {currentTimeTooltip.isPlaying ? '▶️' : '⏸️'}
            </span>
            <span className="text-white font-mono tracking-wider">
              {currentTimeTooltip.formattedTime}
            </span>
          </div>
          
          {/* 🆕 **ANIMATED INDICATOR**: Moving dot khi đang phát */}
          {currentTimeTooltip.isPlaying && (
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"
              style={{
                animation: 'bounce 1s ease-in-out infinite'
              }}
            />
          )}
        </div>
      )}

      {/* 🔄 **HOVER TOOLTIP**: Tooltip khi hover chuột */}
      {hoverTooltip?.visible && (
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
            whiteSpace: 'nowrap'
          }}
        >
          {hoverTooltip.formattedTime}
        </div>
      )}

      {/* 🎛️ **HANDLE TOOLTIPS**: Tooltips cho start/end handles */}
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

      {/* 📏 **SELECTION DURATION**: Tooltip cho duration */}
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
          ⏱ {handleTooltips.selectionDuration.formattedDuration}
        </div>
      )}
    </>
  );
});