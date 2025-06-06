import React, { useRef, useCallback, useEffect } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const Waveform = ({
  // Waveform props
  canvasRef,
  waveformData,
  currentTime,
  duration,
  startTime,
  endTime,
  hoveredHandle,
  isDragging,
  isPlaying,
  volume = 1,
  
  // Canvas handlers
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave
}) => {
  // 🔥 **OPTIMIZED**: Removed all logging refs to prevent spam
  const setupCompleteRef = useRef(false);
  
  // 🔥 **SINGLE SETUP LOG**: Only log initial setup once, asynchronously
  useEffect(() => {
    if (!setupCompleteRef.current && waveformData.length > 0 && duration > 0) {
      setupCompleteRef.current = true;
      // 🔥 **ASYNC LOG**: Move out of render cycle
      setTimeout(() => {
        console.log('🌊 [Waveform] Initial setup complete:', {
          waveformLength: waveformData.length,
          duration: duration.toFixed(2) + 's',
          volume: volume.toFixed(2),
          note: 'TimeSelector moved to UnifiedControlBar'
        });
      }, 0);
    }
  }, [waveformData.length, duration, volume]);
  
  const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
  
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <div 
        className="w-full"
        style={{
          overflow: 'hidden', // 🚫 **NO SCROLLBARS**: Loại bỏ hoàn toàn scrollbars
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          WebkitOverflowScrolling: 'touch' // iOS smooth scrolling (if needed)
        }}
      >
        <div 
          style={{ 
            minWidth: `${minWidth}px`,
            // 🚫 **WEBKIT SCROLLBAR HIDE**: Chrome, Safari, Edge - inline styles
            WebkitScrollbar: 'none',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          className="waveform-container-no-scrollbar"
        >
          <WaveformCanvas
            canvasRef={canvasRef}
            waveformData={waveformData}
            currentTime={currentTime}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            hoveredHandle={hoveredHandle}
            isDragging={isDragging}
            isPlaying={isPlaying}
            volume={volume}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          />
        </div>
      </div>
      
      {/* 🚫 **GLOBAL SCROLLBAR HIDE CSS**: Ensure no scrollbars appear */}
      <style>
        {`
          .waveform-container-no-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
          
          .waveform-container-no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          
          .waveform-container-no-scrollbar * {
            overflow: hidden !important;
          }
        `}
      </style>
    </div>
  );
};

export default Waveform;