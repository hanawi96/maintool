import React, { useEffect, useMemo, useRef } from 'react';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const SilenceOverlay = React.memo(({
  silenceRegions = [],
  duration = 100,
  containerWidth = 800,
  canvasHeight = WAVEFORM_CONFIG.HEIGHT,
  isVisible = true,
  opacity = 0.6
}) => {
  // 🚀 **DEBOUNCED RENDER**: Prevent rapid re-renders during slider drag
  const [debouncedRegions, setDebouncedRegions] = React.useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      setDebouncedRegions(silenceRegions);
    }, 32); // 32ms debounce for smooth 30fps updates

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [silenceRegions]);

  // 🎨 **INJECT CSS ONCE**: Single CSS injection for all animations
  useEffect(() => {
    if (document.getElementById('silence-overlay-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'silence-overlay-styles';
    style.textContent = `
      .silence-region {
        will-change: auto;
      }
      .silence-region:hover {
        background: rgba(239, 68, 68, 0.6) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // 🔑 **PRE-CALCULATED POSITIONS**: Compute all positions once in useMemo
  const regionElements = useMemo(() => {
    if (!isVisible || !debouncedRegions.length || duration <= 0) return [];

    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = containerWidth - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;
    const hasHighRegionCount = debouncedRegions.length > 15;

    return debouncedRegions.map((region, i) => {
      const startPercent = Math.max(0, Math.min(1, region.start / duration));
      const endPercent = Math.max(0, Math.min(1, region.end / duration));
      const startX = waveformStartX + (startPercent * availableWaveformWidth);
      const endX = waveformStartX + (endPercent * availableWaveformWidth);
      const width = Math.max(1, endX - startX);

      return {
        key: `${region.start.toFixed(2)}-${region.end.toFixed(2)}-${i}`,
        style: {
          left: `${startX}px`,
          top: '0px',
          width: `${width}px`,
          height: `${canvasHeight}px`,
          position: 'absolute',
          pointerEvents: 'none',
          background: hasHighRegionCount 
            ? 'rgba(239, 68, 68, 0.4)'
            : 'linear-gradient(180deg, rgba(239, 68, 68, 0.45) 0%, rgba(239, 68, 68, 0.35) 50%, rgba(239, 68, 68, 0.45) 100%)',
          transform: 'translateZ(0)'
        },
        title: `Silence: ${region.start.toFixed(2)}s - ${region.end.toFixed(2)}s (${region.duration.toFixed(2)}s)`
      };
    });
  }, [debouncedRegions, duration, containerWidth, canvasHeight, isVisible]);  // 🚫 **EARLY RETURN**: No regions or not visible
  if (!regionElements.length) {
    return null;
  }

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
      {regionElements.map((element) => (
        <div
          key={element.key}
          className="absolute silence-region"
          style={element.style}
          title={element.title}
        />
      ))}
    </div>
  );
});

SilenceOverlay.displayName = 'SilenceOverlay';

export default SilenceOverlay;
