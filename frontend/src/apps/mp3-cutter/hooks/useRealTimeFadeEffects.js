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
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx.current;
    await ctx.resume();
    // Always force HTML5 audio volume = 1
    audioElement.volume = 1;

    // Create nodes if not exist
    if (!sourceNode.current) sourceNode.current = ctx.createMediaElementSource(audioElement);
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

  // Fade calculation
  const calcFade = useCallback((currentTime, cfg) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted, duration = 0 } = cfg;
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
    stopFadeAnimation();
    disconnectEqualizer();
    audioCtx.current?.close?.();
    [audioCtx, sourceNode, masterGain, fadeGain, analyser, pitchNode].forEach(ref => { ref.current = null; });
    isConnected.current = false;
    setConnected(false);
    setWorkletLoaded(false);
  }, [disconnectEqualizer, stopFadeAnimation]);

  return {
    connectAudioElement,
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
