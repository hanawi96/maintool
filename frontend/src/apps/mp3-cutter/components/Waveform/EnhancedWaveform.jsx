// 🚀 **ENHANCED WAVEFORM COMPONENT** - Hybrid system integration with performance indicators
import React, { useRef, useEffect, useState } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

// 🚀 **ENHANCED LOADING INDICATOR** - Shows processing strategy and performance
const EnhancedWaveformLoadingIndicator = React.memo(({ processingStrategy, fromCache, processingTime }) => {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show details after 1 second
    const timer = setTimeout(() => setShowDetails(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="flex items-center justify-center w-full bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 relative overflow-hidden"
      style={{
        height: `${WAVEFORM_CONFIG.HEIGHT}px`,
        minHeight: `${WAVEFORM_CONFIG.HEIGHT}px`,
        maxHeight: `${WAVEFORM_CONFIG.HEIGHT}px`
      }}
    >
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
        {/* 🎵 **ANIMATED WAVEFORM BARS** */}
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

        {/* 🚀 **PROCESSING STRATEGY INDICATOR** */}
        {showDetails && (
          <div className="text-xs text-center opacity-75">
            <div className="font-medium text-indigo-600">
              {fromCache ? '⚡ Loading from cache...' : 
               processingStrategy === 'worker' ? '🔧 Processing with Web Worker...' :
               processingStrategy === 'hybrid' ? '🚀 Using hybrid acceleration...' :
               '🎵 Generating waveform...'}
            </div>
            {processingTime > 0 && (
              <div className="text-gray-500 mt-1">
                Previous: {processingTime}ms
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS animations are shared with original Waveform component */}
    </div>
  );
});

EnhancedWaveformLoadingIndicator.displayName = 'EnhancedWaveformLoadingIndicator';

const EnhancedWaveform = ({
  // 🔄 **BACKWARD COMPATIBLE PROPS**: Same as original Waveform
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
  fadeIn = 0,
  fadeOut = 0,
  isInverted = false,
  isGenerating = false,
  audioRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  
  // 🆕 **SILENCE DETECTION PROPS**: Real-time silence overlay
  silenceRegions = [],
  showSilenceOverlay = false,
  onSilenceRegionClick = null,
  selectedSilenceRegions = [],
  
  // 🆕 **ENHANCED PROPS**: New hybrid-specific props
  enhancedFeatures = null,
  showPerformanceBadge = true,
  onPerformanceStatsRequest = null
}) => {
  const setupCompleteRef = useRef(false);
  const lastLogKeyRef = useRef('');
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for proper positioning calculations
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Setup completion tracking (production optimized)
  useEffect(() => {
    if (!setupCompleteRef.current && waveformData.length > 0 && duration > 0) {
      setupCompleteRef.current = true;
      // Removed excessive console logging for production
    }
  }, [waveformData.length, duration, volume, enhancedFeatures]);

  // State transition tracking (production optimized)
  useEffect(() => {
    const logKey = `${isGenerating}-${waveformData.length > 0}-${enhancedFeatures?.processingStrategy || 'none'}`;
    
    // Removed excessive console logging for production
    if (logKey !== lastLogKeyRef.current) {
      lastLogKeyRef.current = logKey;
    }
  }, [isGenerating, waveformData.length, volume, duration, enhancedFeatures?.processingStrategy, enhancedFeatures?.fromCache]);
  
  const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
  
  // Enhanced loading state display (production optimized)
  if (isGenerating) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
        <div 
          className="w-full relative"
          style={{
            height: WAVEFORM_CONFIG.HEIGHT,
            overflow: 'visible',
            position: 'relative',
            zIndex: 1
          }}
        >
          <EnhancedWaveformLoadingIndicator 
            processingStrategy={enhancedFeatures?.processingStrategy}
            fromCache={enhancedFeatures?.fromCache}
            processingTime={enhancedFeatures?.processingTime}
          />
        </div>
      </div>
    );
  }

  // 🎯 **MAIN WAVEFORM DISPLAY** - Enhanced with performance indicators
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <div 
        className="w-full"
        style={{
          overflow: 'visible',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div 
          ref={containerRef}
          style={{ 
            minWidth: `${minWidth}px`,
            WebkitScrollbar: 'none',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overflow: 'visible',
            position: 'relative'
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
            isInverted={isInverted}
            audioRef={audioRef}
            containerWidth={containerWidth}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            silenceRegions={silenceRegions}
            showSilenceOverlay={showSilenceOverlay}
            onSilenceRegionClick={onSilenceRegionClick}
            selectedSilenceRegions={selectedSilenceRegions}
          />
        </div>
      </div>
      
      {/* 🚫 **GLOBAL SCROLLBAR HIDE CSS** */}
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

export default EnhancedWaveform;
