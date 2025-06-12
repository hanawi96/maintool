// 🔇 **SILENCE OVERLAY COMPONENT** - Real-time silence region visualization
import React from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const SilenceOverlay = React.memo(({
  silenceRegions = [],
  duration = 100,
  containerWidth = 800,
  canvasHeight = WAVEFORM_CONFIG.HEIGHT,
  isVisible = true,
  opacity = 0.6
}) => {
  // 🚫 **EARLY RETURN**: No regions or not visible
  if (!isVisible || !silenceRegions.length || duration <= 0) {
    return null;
  }

  // 🔧 **HANDLE SPACE ADJUSTMENT**: Account for handles like in WaveformCanvas
  const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
  const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
    Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
  
  const leftHandleWidth = responsiveHandleWidth;
  const rightHandleWidth = responsiveHandleWidth;
  const waveformStartX = leftHandleWidth;
  const waveformEndX = containerWidth - rightHandleWidth;
  const availableWaveformWidth = waveformEndX - waveformStartX;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 15, // Above waveform(1) but below cursors(25) and handles(40)
        opacity: opacity 
      }}
    >
      {silenceRegions.map((region, index) => {
        // 🎯 **CALCULATE POSITION**: Map time to pixel position within waveform area
        const startPercent = Math.max(0, Math.min(1, region.start / duration));
        const endPercent = Math.max(0, Math.min(1, region.end / duration));
        
        const startX = waveformStartX + (startPercent * availableWaveformWidth);
        const endX = waveformStartX + (endPercent * availableWaveformWidth);
        const width = Math.max(1, endX - startX); // Minimum 1px width
        
        return (
          <div
            key={`silence-${index}-${region.start}-${region.end}`}
            className="absolute bg-red-500 rounded-sm"
            style={{
              left: `${startX}px`,
              top: '0px',
              width: `${width}px`,
              height: `${canvasHeight}px`,
              opacity: 0.4,
              pointerEvents: 'none',
              // 🎨 **VISUAL ENHANCEMENT**: Subtle border and shadow for better visibility
              border: '1px solid rgba(239, 68, 68, 0.6)',
              boxShadow: '0 0 4px rgba(239, 68, 68, 0.3)'
            }}
            title={`Silence: ${region.start.toFixed(2)}s - ${region.end.toFixed(2)}s (${region.duration.toFixed(2)}s)`}
          />
        );
      })}
    </div>
  );
});

SilenceOverlay.displayName = 'SilenceOverlay';

export default SilenceOverlay;
