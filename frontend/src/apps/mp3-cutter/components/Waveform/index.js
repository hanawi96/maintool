import React, { useRef, useCallback, useEffect } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

// 🚀 **WAVEFORM LOADING INDICATOR** - Beautiful animated loading display
const WaveformLoadingIndicator = React.memo(() => {
  return (
    <div className="flex items-center justify-center w-full h-24 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 relative overflow-hidden">
      {/* 🌊 **MOVING BACKGROUND SHIMMER** */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12" 
        style={{ 
          animation: 'waveform-shimmer 2s infinite linear',
          width: '200%',
          left: '-100%'
        }} 
      />
      
      <div className="flex flex-col items-center gap-3 relative z-10">
        {/* 🎵 **ANIMATED WAVEFORM BARS WITH WAVE EFFECT** */}
        <div className="flex items-center justify-center gap-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full"
              style={{
                width: '2.5px',
                height: `${8 + Math.sin(i * 0.5) * 6}px`,
                transformOrigin: 'bottom',
                animation: `waveform-bounce 1.2s ${i * 0.1}s infinite ease-in-out alternate`
              }}
            />
          ))}
        </div>
      </div>

      {/* 🎨 **CSS ANIMATIONS** */}
      <style>
        {`
          @keyframes waveform-shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(100%) skewX(-12deg); }
          }

          @keyframes waveform-bounce {
            0% { transform: scaleY(0.3); }
            100% { transform: scaleY(1.5); }
          }

          @keyframes waveform-dots {
            0%, 20% { opacity: 0; }
            40% { opacity: 1; }
            60% { opacity: 0; }
            80%, 100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
});

WaveformLoadingIndicator.displayName = 'WaveformLoadingIndicator';

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
  isGenerating = false, // 🆕 **LOADING STATE**
  
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
  
  // 🆕 **LOADING STATE DISPLAY**
  if (isGenerating) {
    return <WaveformLoadingIndicator />;
  }
  
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm"> {/* 🆕 **NO EXTRA SPACE**: Bỏ paddingBottom vì tooltips giờ nằm trong waveform */}
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
        `}
      </style>
    </div>
  );
};

export default Waveform;