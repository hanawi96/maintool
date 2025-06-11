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
        `}
      </style>
    </div>
  );
});

EnhancedWaveformLoadingIndicator.displayName = 'EnhancedWaveformLoadingIndicator';

// 🚀 **PERFORMANCE BADGE** - Shows hybrid system performance
const PerformanceBadge = React.memo(({ enhancedFeatures }) => {
  if (!enhancedFeatures || (!enhancedFeatures.fromCache && !enhancedFeatures.processingStrategy)) {
    return null;
  }

  const { fromCache, processingStrategy, processingTime } = enhancedFeatures;
  
  let badgeText = '';
  let badgeColor = 'bg-gray-100 text-gray-600';
  
  if (fromCache) {
    badgeText = '⚡ Instant Cache';
    badgeColor = 'bg-green-100 text-green-700';
  } else if (processingStrategy === 'worker') {
    badgeText = '🚀 4-10x Faster';
    badgeColor = 'bg-blue-100 text-blue-700';
  } else if (processingStrategy === 'hybrid') {
    badgeText = '🔧 Hybrid Accelerated';
    badgeColor = 'bg-purple-100 text-purple-700';
  } else if (processingStrategy === 'fallback') {
    badgeText = '🔄 Standard Processing';
    badgeColor = 'bg-yellow-100 text-yellow-700';
  }

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeColor} ml-2`}>
      {badgeText}
      {processingTime > 0 && (
        <span className="ml-1 opacity-75">
          ({processingTime}ms)
        </span>
      )}
    </div>
  );
});

PerformanceBadge.displayName = 'PerformanceBadge';

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
  
  // 🆕 **ENHANCED PROPS**: New hybrid-specific props
  enhancedFeatures = null,
  showPerformanceBadge = true,
  onPerformanceStatsRequest = null
}) => {
  const setupCompleteRef = useRef(false);

  // Log setup completion
  useEffect(() => {
    if (!setupCompleteRef.current && waveformData.length > 0 && duration > 0) {
      setupCompleteRef.current = true;
      
      setTimeout(() => {
        console.log('🌊 [EnhancedWaveform] Initial setup complete:', {
          waveformLength: waveformData.length,
          duration: duration.toFixed(2) + 's',
          volume: volume.toFixed(2),
          strategy: enhancedFeatures?.processingStrategy || 'unknown',
          fromCache: enhancedFeatures?.fromCache || false,
          note: 'Enhanced with hybrid system capabilities'
        });
      }, 0);
    }
  }, [waveformData.length, duration, volume, enhancedFeatures]);

  // 🔧 **HEIGHT CONSISTENCY DEBUG**: Log state transitions
  useEffect(() => {
    console.log(`🔧 [EnhancedWaveform] State transition:`, {
      isGenerating,
      hasWaveformData: waveformData.length > 0,
      volume: volume.toFixed(3),
      duration: duration.toFixed(2) + 's',
      strategy: enhancedFeatures?.processingStrategy || 'none',
      fromCache: enhancedFeatures?.fromCache || false,
      transition: isGenerating ? 'SHOWING_LOADING' : 'SHOWING_WAVEFORM',
      note: 'Enhanced tracking with hybrid system metrics'
    });
  }, [isGenerating, waveformData.length, volume, duration, enhancedFeatures]);
  
  const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;
  
  // 🆕 **ENHANCED LOADING STATE** - Shows hybrid processing info
  if (isGenerating) {
    console.log(`🔧 [EnhancedWaveform] Rendering enhanced loading indicator with height: ${WAVEFORM_CONFIG.HEIGHT}px`);
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Processing Audio</span>
          {showPerformanceBadge && enhancedFeatures && (
            <PerformanceBadge enhancedFeatures={enhancedFeatures} />
          )}
        </div>
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
      {/* 🆕 **PERFORMANCE HEADER** */}
      {showPerformanceBadge && enhancedFeatures && waveformData.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Audio Waveform</span>
          <div className="flex items-center">
            <PerformanceBadge enhancedFeatures={enhancedFeatures} />
            {onPerformanceStatsRequest && (
              <button 
                onClick={onPerformanceStatsRequest}
                className="ml-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                title="View performance details"
              >
                📊
              </button>
            )}
          </div>
        </div>
      )}

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
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
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
