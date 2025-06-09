import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformRender = (canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip) => {
  // Volume animation
  const [animatedVolume, setAnimatedVolume] = useState(volume);
  const volumeAnimationRef = useRef(volume);
  const targetVolumeRef = useRef(volume);

  // Render loop
  const animationFrameRef = useRef(null);
  const lastDrawTimeRef = useRef(0);

  // 🆕 **ENHANCED CANVAS TRACKING**: Container width tracking for better responsive
  const [containerWidth, setContainerWidth] = useState(800);
  const lastCanvasWidthRef = useRef(0);
  const resizeObserverRef = useRef(null);

  // Volume animation effect
  useEffect(() => {
    targetVolumeRef.current = volume;
    let animationId = null;
    
    const animateVolume = () => {
      const current = volumeAnimationRef.current;
      const target = targetVolumeRef.current;
      const diff = target - current;
      
      if (Math.abs(diff) > 0.0001) {
        volumeAnimationRef.current = current + diff * 0.5;
        setAnimatedVolume(volumeAnimationRef.current);
        animationId = requestAnimationFrame(animateVolume);
      } else if (animatedVolume !== target) {
        volumeAnimationRef.current = target;
        setAnimatedVolume(target);
      }
    };
    
    animationId = requestAnimationFrame(animateVolume);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [volume, animatedVolume]);

  // 🚀 **SMART ADAPTIVE WAVEFORM DATA**: Based on container width for perfect responsive
  const adaptiveWaveformData = useMemo(() => {
    if (!waveformData.length) return [];
    
    const currentWidth = containerWidth || 800;
    const { SAMPLING_RULES } = WAVEFORM_CONFIG.RESPONSIVE;
    
    let rule;
    if (currentWidth <= SAMPLING_RULES.SMALL.maxWidth) {
      rule = SAMPLING_RULES.SMALL;
    } else if (currentWidth <= SAMPLING_RULES.MEDIUM.maxWidth) {
      rule = SAMPLING_RULES.MEDIUM;  
    } else {
      rule = SAMPLING_RULES.LARGE;
    }
    
    // 🎯 **ENHANCED CALCULATION**: Better targetSamples calculation for smooth bars
    const rawBarWidth = currentWidth / waveformData.length;
    const minBarWidth = WAVEFORM_CONFIG.RESPONSIVE.MIN_BAR_WIDTH;
    
    let targetSamples;
    if (rawBarWidth < minBarWidth) {
      // Many bars → reduce samples for smooth rendering
      targetSamples = Math.floor(currentWidth / minBarWidth);
    } else {
      // Few bars → increase samples for better resolution 
      targetSamples = Math.min(waveformData.length, Math.floor(currentWidth * rule.samplesPerPx));
    }
    
    targetSamples = Math.max(100, Math.min(targetSamples, waveformData.length));
    
    if (waveformData.length <= targetSamples) {
      return waveformData;
    }
    
    // 🎯 **SMOOTH RESAMPLING**: Better averaging for smooth waveform
    const step = waveformData.length / targetSamples;
    const adaptedData = [];
    
    for (let i = 0; i < targetSamples; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), waveformData.length);
      
      // Use RMS for better visual representation
      let sumSquared = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sumSquared += waveformData[j] * waveformData[j];
        count++;
      }
      adaptedData.push(count > 0 ? Math.sqrt(sumSquared / count) : 0);
    }
    
    return adaptedData;
  }, [waveformData, containerWidth]);

  // Request redraw function
  const requestRedraw = useCallback((drawFunction) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      let minInterval;
      if (isDragging) {
        minInterval = 2;   // 500fps for dragging
      } else if (isPlaying) {
        minInterval = 8;   // 125fps for playing
      } else if (hoverTooltip?.visible) {
        minInterval = 8;   // 125fps for hover
      } else {
        minInterval = 16;  // 60fps for static
      }
      
      if (timestamp - lastDrawTimeRef.current >= minInterval) {
        if (drawFunction) drawFunction();
        lastDrawTimeRef.current = timestamp;
      }
      
      animationFrameRef.current = null;
    });
  }, [isDragging, isPlaying, hoverTooltip]);

  // 🆕 **RESPONSIVE CANVAS SETUP**: Enhanced with ResizeObserver
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const parent = canvas.parentElement;
    const parentWidth = parent.offsetWidth;
    const newWidth = Math.max(WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH, parentWidth);
    const newHeight = WAVEFORM_CONFIG.HEIGHT;
    
    // Update container width state for adaptive data calculation
    if (containerWidth !== newWidth) {
      setContainerWidth(newWidth);
    }
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      lastCanvasWidthRef.current = newWidth;
      
      // 🎯 **REDRAW TRIGGER**: Force redraw on size change
      requestRedraw(() => {
        // Redraw will be handled by parent component
      });
    }
  }, [canvasRef, containerWidth, requestRedraw]);

  // 🚀 **ENHANCED RESIZE OBSERVER**: Better responsive handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    
    // Setup new ResizeObserver for smooth responsive
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use requestAnimationFrame to prevent layout thrashing
        requestAnimationFrame(() => {
          setupCanvas();
        });
      }
    });
    
    // Observe the parent container
    resizeObserverRef.current.observe(canvas.parentElement);
    
    // Initial setup
    setupCanvas();
    
    // Fallback window resize listener
    const handleWindowResize = () => {
      requestAnimationFrame(() => {
        setupCanvas();
      });
    };
    
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [setupCanvas]);

  // Lazy loading with intersection observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      },
      { rootMargin: '50px', threshold: 0.1 }
    );
    
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return {
    animatedVolume,
    adaptiveWaveformData,
    requestRedraw,
    setupCanvas,
    lastCanvasWidthRef,
    containerWidth // 🆕 **EXPORT CONTAINER WIDTH**: For use in parent components
  };
};