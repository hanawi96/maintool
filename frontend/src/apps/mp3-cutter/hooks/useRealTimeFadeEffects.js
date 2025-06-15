import { useRef, useCallback, useEffect, useState } from 'react';

export const useRealTimeFadeEffects = () => {
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const isConnectedRef = useRef(false);
  const connectionStateRef = useRef('disconnected');
  const fadeConfigRef = useRef({});
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const currentAudioElementRef = useRef(null);

  const [fadeConfig, setFadeConfig] = useState({
    fadeIn: 0, fadeOut: 0, startTime: 0, endTime: 0, isActive: false
  });

  const initializeWebAudio = useCallback(async (audioElement) => {
    try {
      connectionStateRef.current = 'connecting';
      if (!audioContextRef.current)
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!audioElement || !audioElement.src) return false;
      if (!sourceNodeRef.current) sourceNodeRef.current = ctx.createMediaElementSource(audioElement);
      if (!gainNodeRef.current) gainNodeRef.current = ctx.createGain();
      if (!analyserNodeRef.current) {
        analyserNodeRef.current = ctx.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
      }
      if (!isConnectedRef.current) {
        sourceNodeRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
      }
      return !!(gainNodeRef.current && gainNodeRef.current.gain);
    } catch {
      connectionStateRef.current = 'error';
      return false;
    }
  }, []);

  const calculateFadeMultiplier = useCallback((currentTime, config) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted, duration = 0 } = config;
    if (isInverted) {
      if (fadeIn <= 0 && fadeOut <= 0) return 1.0;
      let m = 1.0;
      if (fadeIn > 0 && currentTime < startTime) m = Math.min(m, Math.max(0, currentTime / Math.min(fadeIn, startTime)));
      if (fadeOut > 0 && currentTime >= endTime)
        m = Math.min(m, Math.max(0.05, (duration - currentTime) / Math.min(fadeOut, duration - endTime)));
      if (currentTime >= startTime && currentTime <= endTime) return 0.0;
      return Math.max(0.05, Math.min(1, m));
    }
    if (fadeIn === 0 && fadeOut === 0) return 1.0;
    if (currentTime < startTime || currentTime > endTime) return 1.0;
    let m = 1.0;
    const tSel = currentTime - startTime, tEnd = endTime - currentTime;
    if (fadeIn > 0 && tSel <= fadeIn) m = Math.min(m, 0.001 + ((1 - Math.pow(1 - tSel / fadeIn, 1.5)) * 0.999));
    if (fadeOut > 0 && tEnd <= fadeOut) m = Math.min(m, 0.001 + (Math.pow(tEnd / fadeOut, 1.5) * 0.999));
    return Math.max(0.0001, Math.min(1, m));
  }, []);

  const startFadeAnimation = useCallback((audioElement) => {
    if (isAnimatingRef.current || !gainNodeRef.current) return;
    isAnimatingRef.current = true;
    currentAudioElementRef.current = audioElement;
    const animate = (ts) => {
      if (ts - lastUpdateTimeRef.current < 16) {
        if (isAnimatingRef.current) animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastUpdateTimeRef.current = ts;
      const el = currentAudioElementRef.current;
      if (!el || !gainNodeRef.current) return;
      const t = el.currentTime || 0;
      const cfg = fadeConfigRef.current;
      gainNodeRef.current.gain.value = calculateFadeMultiplier(t, cfg);
      if (isAnimatingRef.current && (cfg.isActive || (!el.paused && el.currentTime >= 0)))
        animationFrameRef.current = requestAnimationFrame(animate);
      else {
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
        currentAudioElementRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [calculateFadeMultiplier]);

  const stopFadeAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    currentAudioElementRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (gainNodeRef.current && gainNodeRef.current.gain)
      gainNodeRef.current.gain.value = 1.0;
  }, []);

  const updateFadeConfig = useCallback((cfg) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted = false, duration = 0 } = cfg;
    const isActive = ((fadeIn > 0 || fadeOut > 0) || isInverted) && startTime < endTime;
    fadeConfigRef.current = { fadeIn, fadeOut, startTime, endTime, isActive, isInverted, duration };
    setFadeConfig(fadeConfigRef.current);
    if (!isActive && gainNodeRef.current && gainNodeRef.current.gain)
      gainNodeRef.current.gain.value = 1.0;
  }, []);

  useEffect(() => { fadeConfigRef.current = fadeConfig; }, [fadeConfig]);

  const connectAudioElement = useCallback(async (audioElement) => {
    let attempts = 0;
    while (attempts < 3) {
      if (await initializeWebAudio(audioElement)) return true;
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }
    return false;
  }, [initializeWebAudio]);

  const setFadeActive = useCallback((isPlaying, audioElement) => {
    if (isPlaying && connectionStateRef.current === 'connected') {
      if (!isAnimatingRef.current) startFadeAnimation(audioElement);
      else currentAudioElementRef.current = audioElement;
    } else {
      if (isAnimatingRef.current) stopFadeAnimation();
    }
  }, [startFadeAnimation, stopFadeAnimation]);

  useEffect(() => () => {
    isAnimatingRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed')
      audioContextRef.current.close();
    audioContextRef.current = null; sourceNodeRef.current = null; gainNodeRef.current = null; analyserNodeRef.current = null;
    isConnectedRef.current = false; connectionStateRef.current = 'disconnected';
  }, []);

  return {
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    fadeConfig,
    isWebAudioSupported: !!(window.AudioContext || window.webkitAudioContext)
  };
};
