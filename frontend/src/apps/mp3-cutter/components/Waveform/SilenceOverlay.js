import React, { useEffect, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const SilenceOverlay = React.memo(({
  silenceRegions = [],
  duration = 100,
  containerWidth = 800,
  canvasHeight = WAVEFORM_CONFIG.HEIGHT,
  isVisible = true,
  opacity = 0.6
}) => {
  // 🎨 **INJECT CSS ONCE**: Single CSS injection for all animations
  useEffect(() => {
    if (document.getElementById('silence-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'silence-overlay-styles';
    style.textContent = `
      .silence-region {
        transform-origin: left center;
        transition: opacity 0.2s ease, transform 0.15s ease;
        will-change: opacity;
      }
      .silence-region:hover {
        transform: scaleX(1.02);
        background: rgba(239, 68, 68, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 🔑 **STABLE KEYS**: Generate consistent keys for smooth transitions
  const stableRegions = useMemo(() => 
    silenceRegions.map((region, i) => ({
      ...region,
      key: `${region.start.toFixed(2)}-${region.end.toFixed(2)}-${i}`
    })), [silenceRegions]);
  // 🚫 **EARLY RETURN**: No regions or not visible
  if (!isVisible || !stableRegions.length || duration <= 0) {
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
  // 🎭 **PERFORMANCE OPTIMIZATION**: Disable complex effects if too many regions
  const hasHighRegionCount = stableRegions.length > 15;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 15, // Above waveform(1) but below cursors(25) and handles(40)
        opacity: opacity,
        contain: 'layout style paint',
        willChange: 'opacity'
      }}
    >
      {stableRegions.map((region) => {
        // 🎯 **CALCULATE POSITION**: Map time to pixel position within waveform area
        const startPercent = Math.max(0, Math.min(1, region.start / duration));
        const endPercent = Math.max(0, Math.min(1, region.end / duration));
          const startX = waveformStartX + (startPercent * availableWaveformWidth);
        const endX = waveformStartX + (endPercent * availableWaveformWidth);
        const width = Math.max(1, endX - startX); // Minimum 1px width
          return (
          <div
            key={region.key}
            className="absolute silence-region"
            style={{
              left: `${startX}px`,
              top: '0px',
              width: `${width}px`,
              height: `${canvasHeight}px`,
              pointerEvents: 'none',
              // 🎨 **CLEAN OVERLAY**: Simple, efficient styling
              background: hasHighRegionCount 
                ? 'rgba(239, 68, 68, 0.4)'
                : 'linear-gradient(180deg, rgba(239, 68, 68, 0.45) 0%, rgba(239, 68, 68, 0.35) 50%, rgba(239, 68, 68, 0.45) 100%)',
              // 🚀 **GPU OPTIMIZATION**: Hardware acceleration
              transform: 'translateZ(0)',
              willChange: hasHighRegionCount ? 'auto' : 'transform'
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
