import React, { useCallback, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { WAVEFORM_CONFIG } from '../../utils/constants';

const SilenceOverlay = React.memo(({
  silenceRegions = [],
  duration = 0,
  containerWidth = 0,
  canvasHeight = 0,
  isVisible = false,
  onRegionClick = null,
  selectedRegions = []
}) => {
  // Handle region click
  const handleRegionClick = useCallback((region) => {
    console.log('🔍 [SilenceOverlay] Region clicked (should not interfere with handles):', region);
    if (!onRegionClick) return;
    onRegionClick(region);
  }, [onRegionClick]);

  // Handle tooltip positioning
  const handleRegionMouseMove = useCallback((e, region) => {
    if (!e.target) return;
    const rect = e.target.getBoundingClientRect();
    const tooltip = {
      visible: true,
      x: e.clientX,
      y: rect.top - 30,
      text: `Start: ${region.start.toFixed(2)}s\nEnd: ${region.end.toFixed(2)}s\nDuration: ${(region.end - region.start).toFixed(2)}s`
    };
    e.target.setAttribute('data-tooltip', JSON.stringify(tooltip));
  }, []);

  const handleRegionMouseLeave = useCallback((e) => {
    if (!e.target) return;
    e.target.removeAttribute('data-tooltip');
  }, []);

  // Helper function to compare regions with floating point tolerance
  const regionsEqual = useCallback((r1, r2) => {
    const tolerance = 0.001; // 1ms tolerance
    return Math.abs(r1.start - r2.start) < tolerance && Math.abs(r1.end - r2.end) < tolerance;
  }, []);

  // Calculate waveform positioning - MATCH WaveformCanvas logic exactly
  const waveformPositioning = useMemo(() => {
    if (!containerWidth || duration <= 0) {
      return { waveformStartX: 0, availableWaveformWidth: containerWidth };
    }

    // 🔧 **HANDLE SPACE ADJUSTMENT**: Same logic as WaveformCanvas
    const { MODERN_HANDLE_WIDTH } = WAVEFORM_CONFIG;
    const responsiveHandleWidth = containerWidth < WAVEFORM_CONFIG.RESPONSIVE.MOBILE_BREAKPOINT ? 
      Math.max(3, MODERN_HANDLE_WIDTH * 0.75) : MODERN_HANDLE_WIDTH;
    
    const leftHandleWidth = responsiveHandleWidth;
    const rightHandleWidth = responsiveHandleWidth;
    const waveformStartX = leftHandleWidth;
    const waveformEndX = containerWidth - rightHandleWidth;
    const availableWaveformWidth = waveformEndX - waveformStartX;

    return { waveformStartX, availableWaveformWidth };
  }, [containerWidth, duration]);

  // Memoized region elements with corrected positioning
  const regionElements = useMemo(() => {
    if (!isVisible || !silenceRegions.length || duration <= 0 || !containerWidth) return null;

    const { waveformStartX, availableWaveformWidth } = waveformPositioning;

    return silenceRegions.map((region, index) => {
      const isSelected = selectedRegions.some(r => regionsEqual(r, region));
      
      // 🚀 **CORRECTED POSITIONING**: Match WaveformCanvas exactly
      const regionStartPercent = region.start / duration;
      const regionEndPercent = region.end / duration;
      const regionStartX = waveformStartX + (regionStartPercent * availableWaveformWidth);
      const regionEndX = waveformStartX + (regionEndPercent * availableWaveformWidth);
      const regionWidth = regionEndX - regionStartX;
      
      // Convert to percentage for CSS
      const leftPercent = (regionStartX / containerWidth) * 100;
      const widthPercent = (regionWidth / containerWidth) * 100;
      
      return (
        <div
          key={`${region.start}-${region.end}-${index}`}
          className={cn(
            'absolute h-full cursor-pointer transition-colors duration-200',
            // Base styles
            isSelected ? 'bg-red-500/50' : 'bg-green-500/30',
            // Hover state
            isSelected ? 'hover:bg-red-500/70' : 'hover:bg-green-500/60'
          )}
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            zIndex: 15, // Below handles (z-index 40) but above canvas (z-index 1)
            pointerEvents: 'auto'
          }}
          onClick={() => handleRegionClick(region)}
          onMouseMove={(e) => handleRegionMouseMove(e, region)}
          onMouseLeave={handleRegionMouseLeave}
        />
      );
    });
  }, [silenceRegions, duration, selectedRegions, handleRegionClick, handleRegionMouseMove, handleRegionMouseLeave, isVisible, regionsEqual, containerWidth, waveformPositioning]);

  if (!isVisible || !regionElements) return null;

  return (
    <div 
      className="absolute inset-0"
      style={{ 
        height: canvasHeight,
        zIndex: 15, // Below handles (z-index 40) but above canvas (z-index 1)
        pointerEvents: 'none' // Allow events to pass through container
      }}
    >
      {regionElements}
    </div>
  );
});

SilenceOverlay.displayName = 'SilenceOverlay';

export default SilenceOverlay;
