import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformRender = (canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip) => {
  // 🔧 **FIXED VOLUME INITIALIZATION**: Ensure animatedVolume starts with correct value to prevent initial height mismatch
  const [animatedVolume, setAnimatedVolume] = useState(volume);
  const volumeAnimationRef = useRef(volume);
  const targetVolumeRef = useRef(volume);
  const initializedRef = useRef(false);

  // Render loop
  const animationFrameRef = useRef(null);
  const lastDrawTimeRef = useRef(0);

  // 🆕 **ENHANCED CANVAS TRACKING**: Container width tracking for better responsive
  const [containerWidth, setContainerWidth] = useState(800);
  const lastCanvasWidthRef = useRef(0);
  const resizeObserverRef = useRef(null);

  // 🔧 **INITIAL WIDTH SYNC**: Set initial container width once when canvas mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement || lastCanvasWidthRef.current > 0) return;
    
    const initialWidth = Math.max(
      WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH, 
      canvas.parentElement.offsetWidth || 800
    );
    
    if (initialWidth !== containerWidth) {
      setContainerWidth(initialWidth);
      lastCanvasWidthRef.current = initialWidth;
    }
  }, [canvasRef, containerWidth]); // Include containerWidth dependency

  // 🔧 **FIXED VOLUME INITIALIZATION**: Initialize all volume refs correctly on mount
  useEffect(() => {
    if (!initializedRef.current) {
      volumeAnimationRef.current = volume;
      targetVolumeRef.current = volume;
      setAnimatedVolume(volume);
      initializedRef.current = true;
    }
  }, [volume]);

  // Volume animation effect
  useEffect(() => {
    // 🚫 **SKIP ANIMATION IF NOT INITIALIZED**: Prevent animation on initial mount
    if (!initializedRef.current) return;
    
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
    
    // 🔧 **IMMEDIATE UPDATE IF CLOSE**: If values are very close, update immediately
    const currentDiff = Math.abs(volumeAnimationRef.current - volume);
    if (currentDiff < 0.01) {
      volumeAnimationRef.current = volume;
      setAnimatedVolume(volume);
    } else {
      animationId = requestAnimationFrame(animateVolume);
    }
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [volume, animatedVolume]);

  // 🎯 **INTERPOLATION FUNCTION**: Create more bars for smooth waveform
  const linearInterpolate = useCallback((originalData, targetLength) => {
    const result = [];
    const step = originalData.length / targetLength;
    
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = i * step;
      const leftIndex = Math.floor(sourceIndex);
      const rightIndex = Math.min(Math.ceil(sourceIndex), originalData.length - 1);
      const progress = sourceIndex - leftIndex;
      
      const interpolatedValue = originalData[leftIndex] * (1 - progress) + 
                               originalData[rightIndex] * progress;
      result.push(interpolatedValue);
    }
    
    return result;
  }, []);

  // 🎯 **RMS SAMPLING FUNCTION**: Reduce bars while preserving audio characteristics
  const rmsSample = useCallback((originalData, targetLength) => {
    const result = [];
    const step = originalData.length / targetLength;
    
    for (let i = 0; i < targetLength; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.min(Math.floor((i + 1) * step), originalData.length);
      
      let sumSquared = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sumSquared += originalData[j] * originalData[j];
        count++;
      }
      
      result.push(count > 0 ? Math.sqrt(sumSquared / count) : 0);
    }
    
    return result;
  }, []);

  // 🚀 **HYBRID DYNAMIC SYSTEM**: Smart bar width management (0.3px - 0.8px)
  const hybridWaveformData = useMemo(() => {
    if (!waveformData.length || !containerWidth) {
      return { data: [], barWidth: 0, mode: 'none' };
    }
    
    const { MAX_BAR_WIDTH, MIN_BAR_WIDTH } = WAVEFORM_CONFIG.RESPONSIVE;
    const idealBarWidth = containerWidth / waveformData.length;
    
    // 🎯 **DECISION LOGIC**
    if (idealBarWidth >= MIN_BAR_WIDTH && idealBarWidth <= MAX_BAR_WIDTH) {
      // ✅ PERFECT RANGE: Keep original data
      return { data: waveformData, barWidth: idealBarWidth, mode: 'natural' };
      
    } else if (idealBarWidth > MAX_BAR_WIDTH) {
      // 🎨 TOO BIG: Interpolate to add more bars
      const targetBars = Math.floor(containerWidth / MAX_BAR_WIDTH);
      const interpolatedData = linearInterpolate(waveformData, targetBars);
      return { data: interpolatedData, barWidth: MAX_BAR_WIDTH, mode: 'interpolate' };
      
    } else {
      // 📉 TOO SMALL: Sample to reduce bars  
      const maxBarsForMinSize = Math.floor(containerWidth / MIN_BAR_WIDTH);
      const sampledData = rmsSample(waveformData, maxBarsForMinSize);
      return { data: sampledData, barWidth: MIN_BAR_WIDTH, mode: 'sample' };
    }
  }, [waveformData, containerWidth, linearInterpolate, rmsSample]);

  // Request redraw function
  const requestRedraw = useCallback((drawFunction) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      let minInterval;
      if (isDragging) {
        minInterval = 8.33;  // 120fps for dragging (tối ưu, không thừa thãi)
      } else if (isPlaying) {
        minInterval = 8;     // 125fps for playing
      } else if (hoverTooltip?.visible) {
        minInterval = 8;     // 125fps for hover
      } else {
        minInterval = 16;    // 60fps for static
      }
      
      // 🚀 **RESIZE THROTTLING**: Extra throttling during potential resize
      const timeSinceLastDraw = timestamp - lastDrawTimeRef.current;
      if (timeSinceLastDraw >= minInterval) {
        if (drawFunction) drawFunction();
        lastDrawTimeRef.current = timestamp;
      } else {
        // 🔄 **RE-SCHEDULE**: Re-schedule if too soon
        animationFrameRef.current = requestAnimationFrame((nextTimestamp) => {
          if (drawFunction) drawFunction();
          lastDrawTimeRef.current = nextTimestamp;
        });
        return;
      }
      
      animationFrameRef.current = null;
    });
  }, [isDragging, isPlaying, hoverTooltip]);

  // 🚀 **ENHANCED RESIZE OBSERVER**: Better responsive handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) {
      return;
    }
    
    let resizeTimeoutId = null;
    let lastResizeTime = 0;
    let canvasContext = null;
    
    // 🔥 **OPTIMIZED CONTEXT CACHE**: Cache context with willReadFrequently
    const getOptimizedContext = () => {
      if (!canvasContext) {
        canvasContext = canvas.getContext('2d', { willReadFrequently: true });
      }
      return canvasContext;
    };
    
    // 🚀 **SMOOTH RESIZE WITH DEBOUNCE**: Optimized resize handling
    const smoothResize = () => {
      const now = performance.now();
      if (now - lastResizeTime < 16) return; // Throttle to 60fps
      lastResizeTime = now;
      
      const parent = canvas.parentElement;
      const parentWidth = parent.offsetWidth;
      
      // 🔧 **ENSURE MINIMUM WIDTH**: Always ensure valid width
      const newWidth = Math.max(WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH, parentWidth || 800);
      
      if (Math.abs(containerWidth - newWidth) > 2) { // Only update if significant change
        setContainerWidth(newWidth);
        
        // 🔥 **EFFICIENT CANVAS RESIZE**: Only resize canvas if necessary
        if (Math.abs(canvas.width - newWidth) > 2) {
          canvas.width = newWidth;
          canvas.height = WAVEFORM_CONFIG.HEIGHT;
          lastCanvasWidthRef.current = newWidth;
        }
      }
    };
    
    // 🚀 **DEBOUNCED RESIZE HANDLER**: Debounce resize events
    const debouncedResize = () => {
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      
      // Immediate resize for visual smoothness
      smoothResize();
      
      // Debounced final resize for accuracy
      resizeTimeoutId = setTimeout(() => {
        smoothResize();
        resizeTimeoutId = null;
      }, 150);
    };
    
    // Setup ResizeObserver with debouncing
    resizeObserverRef.current = new ResizeObserver(debouncedResize);
    
    resizeObserverRef.current.observe(canvas.parentElement);
    smoothResize(); // Initial setup
    
    return () => {
      if (resizeTimeoutId) clearTimeout(resizeTimeoutId);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [canvasRef, containerWidth]); // Include both canvasRef and containerWidth dependencies

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
  }, [canvasRef]); // Include canvasRef dependency

  return {
    animatedVolume,
    hybridWaveformData,
    requestRedraw,
    containerWidth
  };
};