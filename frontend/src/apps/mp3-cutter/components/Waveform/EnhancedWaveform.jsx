import React, { useRef, useEffect, useState } from 'react';
import WaveformCanvas from './WaveformCanvas';
import { WAVEFORM_CONFIG } from '../../utils/constants';

// Animation/gradient bar heights precomputed to avoid re-calc each render
const LOADING_BAR_HEIGHTS = Array.from({ length: 12 }, (_, i) => 8 + Math.sin(i * 0.5) * 6);

// Loading indicator (memoized, all animation config moved out)
const EnhancedWaveformLoadingIndicator = React.memo(
  ({ processingStrategy, fromCache, processingTime }) => {
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
      const t = setTimeout(() => setShowDetails(true), 1000);
      return () => clearTimeout(t);
    }, []);

    return (
      <div
        className="flex items-center justify-center w-full bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 relative overflow-hidden"
        style={{
          height: WAVEFORM_CONFIG.HEIGHT,
          minHeight: WAVEFORM_CONFIG.HEIGHT,
          maxHeight: WAVEFORM_CONFIG.HEIGHT
        }}
      >
        {/* Moving shimmer effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12"
          style={{
            animation: 'waveform-shimmer 2s infinite linear',
            width: '200%',
            left: '-100%'
          }}
        />
        <div className="flex flex-col items-center gap-3 relative z-10">
          {/* Animated bars */}
          <div className="flex items-center justify-center gap-1">
            {LOADING_BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full"
                style={{
                  width: 2.5,
                  height: h,
                  transformOrigin: 'bottom',
                  animation: `waveform-bounce 1.2s ${i * 0.1}s infinite ease-in-out alternate`
                }}
              />
            ))}
          </div>
          {/* Strategy label */}
          {showDetails && (
            <div className="text-xs text-center opacity-75">
              <div className="font-medium text-indigo-600">
                {fromCache
                  ? '⚡ Loading from cache...'
                  : processingStrategy === 'worker'
                  ? '🔧 Processing with Web Worker...'
                  : processingStrategy === 'hybrid'
                  ? '🚀 Using hybrid acceleration...'
                  : '🎵 Generating waveform...'}
              </div>
              {processingTime > 0 && (
                <div className="text-gray-500 mt-1">
                  Previous: {processingTime}ms
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

EnhancedWaveformLoadingIndicator.displayName = 'EnhancedWaveformLoadingIndicator';

// --- Main EnhancedWaveform Component ---
const EnhancedWaveform = React.memo(
  ({
    canvasRef,
    waveformData = [],
    currentTime = 0,
    duration = 0,
    startTime = 0,
    endTime = 0,
    hoveredHandle = null,
    isDragging = false,
    isPlaying = false,
    volume = 1,
    isGenerating = false,
    enhancedFeatures = {},
    fadeIn = 0,
    fadeOut = 0,
    isInverted = false,
    audioRef,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave
  }) => {
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
      const update = () => setContainerWidth(containerRef.current?.offsetWidth || 0);
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, []);

    const minWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH;

    // Loading display
    if (isGenerating && waveformData.length === 0) {
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
              processingStrategy={enhancedFeatures.processingStrategy || 'unified-direct'}
              fromCache={!!enhancedFeatures.fromCache}
              processingTime={enhancedFeatures.processingTime || 0}
            />
          </div>
        </div>
      );
    }

    // Main waveform
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
              minWidth,
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
            />
          </div>
        </div>
        {/* Hide scrollbars (should move to CSS file if scale up, here inline for portability) */}
        <style>{`
          .waveform-container-no-scrollbar::-webkit-scrollbar {
            display: none !important;
          }
          .waveform-container-no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}</style>
      </div>
    );
  }
);

export default EnhancedWaveform;
