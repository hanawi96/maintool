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

  // Canvas setup
  const lastCanvasWidthRef = useRef(0);

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

  // Adaptive waveform data
  const adaptiveWaveformData = useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return [];
    
    const canvasWidth = canvas.width || 800;
    const currentWidth = lastCanvasWidthRef.current || canvasWidth;
    
    const { SAMPLING_RULES } = WAVEFORM_CONFIG.RESPONSIVE;
    let rule;
    
    if (currentWidth <= SAMPLING_RULES.SMALL.maxWidth) {
      rule = SAMPLING_RULES.SMALL;
    } else if (currentWidth <= SAMPLING_RULES.MEDIUM.maxWidth) {
      rule = SAMPLING_RULES.MEDIUM;  
    } else {
      rule = SAMPLING_RULES.LARGE;
    }
    
    const targetSamples = Math.max(100, Math.floor(currentWidth * rule.samplesPerPx));
    const finalSamples = Math.min(waveformData.length, targetSamples);
    
    if (waveformData.length > finalSamples) {
      const step = waveformData.length / finalSamples;
      const adaptedData = [];
      
      for (let i = 0; i < finalSamples; i++) {
        const startIdx = Math.floor(i * step);
        const endIdx = Math.min(Math.floor((i + 1) * step), waveformData.length);
        
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j < endIdx; j++) {
          sum += waveformData[j];
          count++;
        }
        adaptedData.push(count > 0 ? sum / count : 0);
      }
      
      return adaptedData;
    }
    
    return waveformData;
  }, [waveformData, canvasRef]);

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

  // Canvas setup
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const parent = canvas.parentElement;
    const parentWidth = parent.offsetWidth;
    const newWidth = Math.max(WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH, parentWidth);
    const newHeight = WAVEFORM_CONFIG.HEIGHT;
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      lastCanvasWidthRef.current = newWidth;
    }
  }, [canvasRef]);

  // Canvas setup effect
  useEffect(() => {
    let resizeTimeoutRef = null;
    
    const handleResize = () => {
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
      resizeTimeoutRef = setTimeout(setupCanvas, 100);
    };
    
    setupCanvas();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef) clearTimeout(resizeTimeoutRef);
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
    lastCanvasWidthRef
  };
};