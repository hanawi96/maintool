import { useRef, useCallback, useEffect, useState } from 'react';

export const useRealTimeFadeEffects = () => {
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const fadeGainNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const isConnectedRef = useRef(false);
  const connectionStateRef = useRef('disconnected');
  const fadeConfigRef = useRef({});
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const currentAudioElementRef = useRef(null);
  
  // Pitch shift integration
  const pitchNodeRef = useRef(null);
  const hasPitchNodeRef = useRef(false);
  
  // Master volume state
  const masterVolumeRef = useRef(1.0);

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
      if (!masterGainNodeRef.current) {
        masterGainNodeRef.current = ctx.createGain();
        masterGainNodeRef.current.gain.value = 1.0;
      }
      if (!fadeGainNodeRef.current) {
        fadeGainNodeRef.current = ctx.createGain();
        fadeGainNodeRef.current.gain.value = 1.0;
      }
      if (!analyserNodeRef.current) {
        analyserNodeRef.current = ctx.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
      }
      if (!isConnectedRef.current) {
        sourceNodeRef.current.connect(masterGainNodeRef.current);
        masterGainNodeRef.current.connect(fadeGainNodeRef.current);
        fadeGainNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
      }
      return !!(masterGainNodeRef.current && fadeGainNodeRef.current);
    } catch {
      connectionStateRef.current = 'error';
      return false;
    }
  }, []);

  // Insert pitch node between source and master gain
  const insertPitchNode = useCallback((pitchNode) => {
    if (!pitchNode || !sourceNodeRef.current || !masterGainNodeRef.current || hasPitchNodeRef.current) return false;
    
    try {
      // Disconnect source -> masterGain
      sourceNodeRef.current.disconnect(masterGainNodeRef.current);
      
      // Connect: source -> pitch -> masterGain
      sourceNodeRef.current.connect(pitchNode);
      pitchNode.connect(masterGainNodeRef.current);
      
      pitchNodeRef.current = pitchNode;
      hasPitchNodeRef.current = true;
      
      console.log('Pitch node inserted successfully');
      return true;
    } catch (error) {
      console.error('Failed to insert pitch node:', error);
      // Fallback: restore original connection
      try {
        sourceNodeRef.current.connect(masterGainNodeRef.current);
      } catch (e) {
        console.error('Failed to restore connection:', e);
      }
      return false;
    }
  }, []);

  // Remove pitch node from chain
  const removePitchNode = useCallback(() => {
    if (!pitchNodeRef.current || !sourceNodeRef.current || !masterGainNodeRef.current || !hasPitchNodeRef.current) return;
    
    try {
      // Disconnect: source -x- pitch -x- masterGain
      sourceNodeRef.current.disconnect(pitchNodeRef.current);
      pitchNodeRef.current.disconnect(masterGainNodeRef.current);
      
      // Direct connect: source -> masterGain
      sourceNodeRef.current.connect(masterGainNodeRef.current);
      
      pitchNodeRef.current = null;
      hasPitchNodeRef.current = false;
      
      console.log('Pitch node removed successfully');
    } catch (error) {
      console.error('Failed to remove pitch node:', error);
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
    if (isAnimatingRef.current || !fadeGainNodeRef.current) return;
    isAnimatingRef.current = true;
    currentAudioElementRef.current = audioElement;
    const animate = (ts) => {
      if (ts - lastUpdateTimeRef.current < 16) {
        if (isAnimatingRef.current) animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastUpdateTimeRef.current = ts;
      const el = currentAudioElementRef.current;
      if (!el || !fadeGainNodeRef.current) return;
      const t = el.currentTime || 0;
      const cfg = fadeConfigRef.current;
      fadeGainNodeRef.current.gain.value = calculateFadeMultiplier(t, cfg);
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
    if (fadeGainNodeRef.current && fadeGainNodeRef.current.gain)
      fadeGainNodeRef.current.gain.value = 1.0;
  }, []);

  const updateFadeConfig = useCallback((cfg) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted = false, duration = 0 } = cfg;
    const isActive = ((fadeIn > 0 || fadeOut > 0) || isInverted) && startTime < endTime;
    fadeConfigRef.current = { fadeIn, fadeOut, startTime, endTime, isActive, isInverted, duration };
    setFadeConfig(fadeConfigRef.current);
    if (!isActive && fadeGainNodeRef.current && fadeGainNodeRef.current.gain)
      fadeGainNodeRef.current.gain.value = 1.0;
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

  // Master volume control (0-2.0 for 200% boost)
  const setMasterVolume = useCallback((volume) => {
    const clampedVolume = Math.max(0, Math.min(2.0, volume));
    masterVolumeRef.current = clampedVolume;
    
    if (masterGainNodeRef.current && masterGainNodeRef.current.gain) {
      masterGainNodeRef.current.gain.value = clampedVolume;
      console.log(`Master volume set to: ${(clampedVolume * 100).toFixed(0)}%`);
    }
  }, []);

  const getMasterVolume = useCallback(() => {
    return masterVolumeRef.current;
  }, []);

  useEffect(() => () => {
    isAnimatingRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed')
      audioContextRef.current.close();
    audioContextRef.current = null; sourceNodeRef.current = null; masterGainNodeRef.current = null; fadeGainNodeRef.current = null; analyserNodeRef.current = null;
    isConnectedRef.current = false; connectionStateRef.current = 'disconnected';
    pitchNodeRef.current = null; hasPitchNodeRef.current = false;
  }, []);

  return {
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    fadeConfig,
    isWebAudioSupported: !!(window.AudioContext || window.webkitAudioContext),
    
    // Pitch shift integration
    insertPitchNode,
    removePitchNode,
    audioContext: audioContextRef.current,
    sourceNode: sourceNodeRef.current,
    masterGainNode: masterGainNodeRef.current,
    fadeGainNode: fadeGainNodeRef.current,
    isConnected: connectionStateRef.current === 'connected',

    // Master volume control
    setMasterVolume,
    getMasterVolume
  };
};
