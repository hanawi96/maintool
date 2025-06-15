import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WAVEFORM_CONFIG } from '../utils/constants';

export const useWaveformRender = (canvasRef, waveformData, volume, isDragging, isPlaying, hoverTooltip) => {
  const [animatedVolume, setAnimatedVolume] = useState(volume);
  const volumeRef = useRef(volume);
  const initialized = useRef(false);
  const animationFrameRef = useRef(null);
  const lastDrawTime = useRef(0);

  const [containerWidth, setContainerWidth] = useState(800);
  const resizeObserverRef = useRef(null);

  // Volume animation
  useEffect(() => {
    if (!initialized.current) {
      volumeRef.current = volume;
      setAnimatedVolume(volume);
      initialized.current = true;
      return;
    }

    let animId;
    const animate = () => {
      const current = volumeRef.current;
      const diff = volume - current;
      if (Math.abs(diff) < 0.01) {
        volumeRef.current = volume;
        setAnimatedVolume(volume);
        return;
      }
      volumeRef.current += diff * 0.5;
      setAnimatedVolume(volumeRef.current);
      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animId);
  }, [volume]);

  // Interpolation or Sampling
  const transformWaveform = useCallback((data, targetLength, mode = 'linear') => {
    const result = [];
    const step = data.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(Math.floor((i + 1) * step), data.length);

      if (mode === 'rms') {
        let sum = 0;
        for (let j = start; j < end; j++) sum += data[j] * data[j];
        result.push(end > start ? Math.sqrt(sum / (end - start)) : 0);
      } else {
        const srcIdx = i * step;
        const l = Math.floor(srcIdx);
        const r = Math.min(Math.ceil(srcIdx), data.length - 1);
        const t = srcIdx - l;
        result.push(data[l] * (1 - t) + data[r] * t);
      }
    }

    return result;
  }, []);

  // Compute display waveform
  const hybridWaveformData = useMemo(() => {
    if (!waveformData.length || !containerWidth) return { data: [], barWidth: 0, mode: 'none' };
    const { MAX_BAR_WIDTH, MIN_BAR_WIDTH } = WAVEFORM_CONFIG.RESPONSIVE;
    const idealWidth = containerWidth / waveformData.length;

    if (idealWidth >= MIN_BAR_WIDTH && idealWidth <= MAX_BAR_WIDTH) {
      return { data: waveformData, barWidth: idealWidth, mode: 'natural' };
    }

    if (idealWidth > MAX_BAR_WIDTH) {
      const bars = Math.floor(containerWidth / MAX_BAR_WIDTH);
      return { data: transformWaveform(waveformData, bars, 'linear'), barWidth: MAX_BAR_WIDTH, mode: 'interpolate' };
    }

    const bars = Math.floor(containerWidth / MIN_BAR_WIDTH);
    return { data: transformWaveform(waveformData, bars, 'rms'), barWidth: MIN_BAR_WIDTH, mode: 'sample' };
  }, [waveformData, containerWidth, transformWaveform]);

  // Redraw scheduler
  const requestRedraw = useCallback((draw) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const minInterval = (isDragging || isPlaying || hoverTooltip?.visible) ? 8 : 16;

    animationFrameRef.current = requestAnimationFrame((ts) => {
      if (ts - lastDrawTime.current >= minInterval) {
        draw?.();
        lastDrawTime.current = ts;
      } else {
        requestRedraw(draw);
      }
    });
  }, [isDragging, isPlaying, hoverTooltip]);

  // Responsive canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const newWidth = Math.max(WAVEFORM_CONFIG.RESPONSIVE.MIN_WIDTH, parent.offsetWidth || 800);
      setContainerWidth(w => (Math.abs(w - newWidth) > 2 ? newWidth : w));
      canvas.width = newWidth;
      canvas.height = WAVEFORM_CONFIG.HEIGHT;
    };

    resizeObserverRef.current = new ResizeObserver(() => resize());
    resizeObserverRef.current.observe(canvas.parentElement);
    resize();

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [canvasRef]);

  // Auto pause redraw if offscreen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }, { rootMargin: '50px', threshold: 0.1 });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef]);

  return {
    animatedVolume,
    hybridWaveformData,
    requestRedraw,
    containerWidth
  };
};
