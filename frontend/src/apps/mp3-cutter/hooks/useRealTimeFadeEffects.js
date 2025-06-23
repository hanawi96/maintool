import { useRef, useEffect, useCallback, useState } from 'react';
import { useEqualizerRealtime } from './useEqualizerRealtime';

const DEV = process.env.NODE_ENV === 'development';

export const useRealTimeFadeEffects = () => {
  // Web Audio refs
  const audioCtx = useRef();
  const sourceNode = useRef();
  const masterGain = useRef();
  const fadeGain = useRef();
  const analyser = useRef();
  const pitchNode = useRef();
  const isConnected = useRef(false);

  // Equalizer
  const {
    connectEqualizer, disconnectEqualizer,
    updateEqualizerBand, updateEqualizerValues, resetEqualizer,
    isConnected: isEQConnected, getEqualizerState,
  } = useEqualizerRealtime();

  // State for UI
  const [fadeConfig, setFadeConfig] = useState({ fadeIn: 0, fadeOut: 0, startTime: 0, endTime: 0, isActive: false });
  const [connected, setConnected] = useState(false);
  const [workletLoaded, setWorkletLoaded] = useState(false);

  // Volume
  const masterVolume = useRef(1);

  // Fade animation
  const animRef = useRef();

  // Preload Pitch Worklet
  const preloadPitchWorklet = useCallback(async ctx => {
    if (workletLoaded) return true;
    try {
      await ctx.audioWorklet.addModule('./soundtouch-worklet.js');
      setWorkletLoaded(true);
      return true;
    } catch {
      return false;
    }
  }, [workletLoaded]);

  // Create Persistent Pitch Node (one time)
  const createPitchNode = useCallback(async ctx => {
    if (!ctx || pitchNode.current) return pitchNode.current;
    await preloadPitchWorklet(ctx);
    pitchNode.current = new AudioWorkletNode(ctx, 'soundtouch-processor');
    pitchNode.current.parameters.get('pitchSemitones').value = 0;
    pitchNode.current.parameters.get('tempo').value = 1.0;
    pitchNode.current.parameters.get('rate').value = 1.0;
    return pitchNode.current;
  }, [preloadPitchWorklet]);
  // Connect Audio Element to Web Audio chain (one time)
  const connectAudioElement = useCallback(async (audioElement) => {
    if (!audioElement?.src) return false;
    
    // If we already have a connection with the same audio element, reuse it
    if (sourceNode.current && sourceNode.current.mediaElement === audioElement && isConnected.current) {
      console.log('🔌 Reusing existing Web Audio connection');
      return true;
    }
    
    // Clean up existing connection if switching audio sources
    if (sourceNode.current && sourceNode.current.mediaElement !== audioElement) {
      console.log('🔌 Cleaning up previous Web Audio connection for new audio source');
      try {
        sourceNode.current.disconnect();
      } catch (e) {
        console.warn('🔌 Error disconnecting previous source:', e);
      }
      sourceNode.current = null;
      isConnected.current = false;
      setConnected(false);
    }
    
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx.current;
    await ctx.resume();
    // Always force HTML5 audio volume = 1
    audioElement.volume = 1;

    // Create nodes if not exist
    if (!sourceNode.current) {
      try {
        sourceNode.current = ctx.createMediaElementSource(audioElement);
        console.log('🔌 Created new MediaElementSourceNode');
      } catch (error) {
        console.error('🔌 Failed to create MediaElementSourceNode:', error);
        return false;
      }
    }
    if (!masterGain.current) masterGain.current = ctx.createGain();
    if (!fadeGain.current) fadeGain.current = ctx.createGain();
    if (!analyser.current) analyser.current = ctx.createAnalyser();

    masterGain.current.gain.value = masterVolume.current;
    fadeGain.current.gain.value = 1;
    analyser.current.fftSize = 256;

    // Create persistent pitch node
    const pNode = await createPitchNode(ctx);

    // Connect chain only once
    if (!isConnected.current) {
      if (pNode) {
        sourceNode.current.connect(pNode);
        if (!connectEqualizer(ctx, pNode, masterGain.current)) pNode.connect(masterGain.current);
      } else {
        if (!connectEqualizer(ctx, sourceNode.current, masterGain.current)) sourceNode.current.connect(masterGain.current);
      }
      masterGain.current.connect(fadeGain.current);
      fadeGain.current.connect(analyser.current);
      analyser.current.connect(ctx.destination);

      isConnected.current = true;
      setConnected(true);
      if (DEV) console.log('Web Audio chain connected');
    }
    return true;
  }, [connectEqualizer, createPitchNode]);

  // 🔧 Helper: clamp fade duration to maximum 50% of region duration
  const clampFadeDuration = useCallback((fadeValue, regionDuration) => {
    if (regionDuration <= 0) return 0;
    const maxFade = regionDuration * 0.5;
    return Math.min(fadeValue, maxFade);
  }, []);

  // Fade calculation
  const calcFade = useCallback((currentTime, cfg) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted, duration = 0 } = cfg;
    if (isInverted) {
      if (fadeIn <= 0 && fadeOut <= 0) return 1.0;
      
      // Clamp fade durations to available space
      const clampedFadeIn = clampFadeDuration(fadeIn, startTime);
      const clampedFadeOut = clampFadeDuration(fadeOut, duration - endTime);
      
      let m = 1.0;
      if (clampedFadeIn > 0 && currentTime < startTime) m = Math.min(m, Math.max(0, currentTime / Math.min(clampedFadeIn, startTime)));
      if (clampedFadeOut > 0 && currentTime >= endTime)
        m = Math.min(m, Math.max(0.05, (duration - currentTime) / Math.min(clampedFadeOut, duration - endTime)));
      if (currentTime >= startTime && currentTime <= endTime) return 0.0;
      return Math.max(0.05, Math.min(1, m));
    }
    if (fadeIn === 0 && fadeOut === 0) return 1.0;
    if (currentTime < startTime || currentTime > endTime) return 1.0;
    
    // Clamp fade durations to 50% of selection duration
    const selectionDuration = endTime - startTime;
    const clampedFadeIn = clampFadeDuration(fadeIn, selectionDuration);
    const clampedFadeOut = clampFadeDuration(fadeOut, selectionDuration);
    
    let m = 1.0;
    const tSel = currentTime - startTime, tEnd = endTime - currentTime;
    if (clampedFadeIn > 0 && tSel <= clampedFadeIn) m = Math.min(m, 0.001 + ((1 - Math.pow(1 - tSel / clampedFadeIn, 1.5)) * 0.999));
    if (clampedFadeOut > 0 && tEnd <= clampedFadeOut) m = Math.min(m, 0.001 + (Math.pow(tEnd / clampedFadeOut, 1.5) * 0.999));
    return Math.max(0.0001, Math.min(1, m));
  }, [clampFadeDuration]);

  // Animation
  const startFadeAnimation = useCallback(audioElement => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = () => {
      if (!audioElement || !fadeGain.current) return;
      fadeGain.current.gain.value = calcFade(audioElement.currentTime, fadeConfig);
      if (fadeConfig.isActive && !audioElement.paused) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, [fadeConfig, calcFade]);

  const stopFadeAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    if (fadeGain.current) fadeGain.current.gain.value = 1;
  }, []);

  // Update fade config
  const updateFadeConfig = useCallback(cfg => {
    const { fadeIn = 0, fadeOut = 0, startTime = 0, endTime = 0, isInverted = false, duration = 0 } = cfg;
    const isActive = ((fadeIn > 0 || fadeOut > 0) || isInverted) && startTime < endTime;
    setFadeConfig({ fadeIn, fadeOut, startTime, endTime, isActive, isInverted, duration });
    if (!isActive && fadeGain.current) fadeGain.current.gain.value = 1;
  }, []);

  // Pitch
  const setPitchValue = useCallback((pitchSemitones = 0) => {
    if (!pitchNode.current) return false;
    try {
      pitchNode.current.parameters.get('pitchSemitones').value = pitchSemitones;
      pitchNode.current.parameters.get('tempo').value = 1.0;
      pitchNode.current.parameters.get('rate').value = 1.0;
      return true;
    } catch { return false; }
  }, []);

  // Volume
  const setMasterVolume = useCallback((vol) => {
    const clamped = Math.max(0, Math.min(2, vol));
    masterVolume.current = clamped;
    if (masterGain.current) masterGain.current.gain.value = clamped;
    // Ensure all audio tag volume = 1
    document.querySelectorAll('audio').forEach(a => { if (a.volume !== 1) a.volume = 1; });
  }, []);

  // Trigger fade animation when play state changes
  const setFadeActive = useCallback((isPlaying, audioElement) => {
    audioElement && (audioElement.volume = 1);
    if (isPlaying && connected) startFadeAnimation(audioElement);
    else stopFadeAnimation();
  }, [startFadeAnimation, stopFadeAnimation, connected]);
  // Cleanup
  useEffect(() => () => {
    console.log('🔌 Cleaning up Web Audio resources...');
    stopFadeAnimation();
    disconnectEqualizer();
    
    // Properly disconnect all nodes
    try {
      if (sourceNode.current) {
        sourceNode.current.disconnect();
        console.log('🔌 Disconnected source node');
      }
      if (masterGain.current) masterGain.current.disconnect();
      if (fadeGain.current) fadeGain.current.disconnect();
      if (analyser.current) analyser.current.disconnect();
      if (pitchNode.current) pitchNode.current.disconnect();
    } catch (e) {
      console.warn('🔌 Error during node disconnection:', e);
    }
    
    // Close audio context
    if (audioCtx.current?.state !== 'closed') {
      audioCtx.current?.close?.();
      console.log('🔌 Closed audio context');
    }
    
    // Reset all refs
    [audioCtx, sourceNode, masterGain, fadeGain, analyser, pitchNode].forEach(ref => { ref.current = null; });
    isConnected.current = false;
    setConnected(false);
    setWorkletLoaded(false);
  }, [disconnectEqualizer, stopFadeAnimation]);
  // Manual disconnect function for cleanup
  const disconnectAudioElement = useCallback(() => {
    if (!isConnected.current) return;
    
    console.log('🔌 Manually disconnecting Web Audio...');
    stopFadeAnimation();
    
    try {
      if (sourceNode.current) {
        sourceNode.current.disconnect();
        sourceNode.current = null;
      }
      if (masterGain.current) masterGain.current.disconnect();
      if (fadeGain.current) fadeGain.current.disconnect();
      if (analyser.current) analyser.current.disconnect();
      if (pitchNode.current) pitchNode.current.disconnect();
    } catch (e) {
      console.warn('🔌 Error during manual disconnection:', e);
    }
    
    isConnected.current = false;
    setConnected(false);
  }, [stopFadeAnimation]);

  return {
    connectAudioElement,
    disconnectAudioElement,
    updateFadeConfig,
    setFadeActive,
    fadeConfig,
    isWebAudioSupported: !!(window.AudioContext || window.webkitAudioContext),
    setPitchValue,
    audioContext: audioCtx.current,
    isConnected: connected,
    setMasterVolume,
    getMasterVolume: () => masterVolume.current,
    updateEqualizerBand, updateEqualizerValues, resetEqualizer,
    isEqualizerConnected: isEQConnected,
    getEqualizerState,
    isWorkletPreloaded: () => workletLoaded,
  };
};
