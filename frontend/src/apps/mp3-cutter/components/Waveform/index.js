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
  
  // 🆕 **FADE EFFECTS**: Visual fade in/out effects cho waveform
  fadeIn = 0,   // Fade in duration (seconds)
  fadeOut = 0,  // Fade out duration (seconds)
  
  // 🚀 **REALTIME AUDIO ACCESS**: Direct audio element access cho ultra-smooth tooltips
  audioRef,
  
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
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm"
         style={{ paddingBottom: '60px' }}> {/* 🆕 **TOOLTIP SPACE**: 60px extra space để hiển thị handle + duration tooltips bên dưới */}
      <div 
        className="w-full"
        style={{
          overflow: 'visible', // 🔧 **TOOLTIP FIX**: Allow tooltips to overflow container
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          WebkitOverflowScrolling: 'touch', // iOS smooth scrolling (if needed)
          position: 'relative', // 🔧 **STACKING CONTEXT**: Establish proper stacking context
          zIndex: 1 // 🔧 **CONTAINER Z-INDEX**: Ensure container has lower z-index than tooltips
        }}
      >
        <div 
          style={{ 
            minWidth: `${minWidth}px`,
            // 🚫 **WEBKIT SCROLLBAR HIDE**: Chrome, Safari, Edge - inline styles
            WebkitScrollbar: 'none',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overflow: 'visible', // 🔧 **TOOLTIP FIX**: Allow nested overflow
            position: 'relative' // 🔧 **POSITIONING**: Proper positioning context
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
            fadeIn={fadeIn}
            fadeOut={fadeOut}
            audioRef={audioRef}
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