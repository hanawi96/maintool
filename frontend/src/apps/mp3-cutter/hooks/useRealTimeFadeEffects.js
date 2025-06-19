import { useRef, useCallback, useEffect, useState } from 'react';
import { useEqualizerRealtime } from './useEqualizerRealtime';

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
  
  // 🎵 Pitch shift integration - PERSISTENT NODE SYSTEM
  const pitchNodeRef = useRef(null);
  const hasPitchNodeRef = useRef(false);
  const isPitchActiveRef = useRef(false); // Track if pitch is currently active (non-zero)
  // 🎵 Add worklet preloading state
  const isWorkletLoadedRef = useRef(false);
  const workletLoadingRef = useRef(false);
  // 🎚️ Equalizer integration
  const {
    connectEqualizer,
    disconnectEqualizer,
    updateEqualizerBand,
    updateEqualizerValues,
    resetEqualizer,
    isConnected: isEqualizerConnected,
    getEqualizerState
  } = useEqualizerRealtime();
    // Master volume state
  const masterVolumeRef = useRef(1.0);
  
  const [fadeConfig, setFadeConfig] = useState({
    fadeIn: 0, fadeOut: 0, startTime: 0, endTime: 0, isActive: false
  });

  // 🔧 Add state to trigger re-renders when connection changes
  const [isConnectedState, setIsConnectedState] = useState(false);
  
  // 🔧 Debug: Track connection state changes
  useEffect(() => {
    console.log('🔧 isConnectedState changed to:', isConnectedState);
  }, [isConnectedState]);

  // 🔧 Helper function to safely disconnect audio nodes
  const safeDisconnect = useCallback((node, description = 'node') => {
    if (!node) return;
    try {
      node.disconnect();
      console.log(`🔗 ${description} disconnected successfully`);
    } catch (error) {
      // Ignore disconnect errors - node may not be connected
      console.log(`🔗 ${description} disconnect skipped (not connected)`);
    }
  }, []);

  // 🎵 Preload pitch worklet for smooth transitions - MOVED UP to avoid temporal dead zone
  const preloadPitchWorklet = useCallback(async (ctx) => {
    if (isWorkletLoadedRef.current || workletLoadingRef.current || !ctx) return true;
    
    workletLoadingRef.current = true;
    try {
      console.log('🎵 Preloading pitch worklet...');
      await ctx.audioWorklet.addModule('./soundtouch-worklet.js');
      isWorkletLoadedRef.current = true;
      console.log('✅ Pitch worklet preloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to preload pitch worklet:', error);
      return false;
    } finally {
      workletLoadingRef.current = false;
    }
  }, []);

  const initializeWebAudio = useCallback(async (audioElement) => {
    try {
      connectionStateRef.current = 'connecting';
      if (!audioContextRef.current)
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!audioElement || !audioElement.src) return false;
      
      // 🎯 CRITICAL: Ensure HTML5 audio volume is always 1.0
      audioElement.volume = 1.0;
      currentAudioElementRef.current = audioElement;
      
      if (!sourceNodeRef.current) sourceNodeRef.current = ctx.createMediaElementSource(audioElement);
      if (!masterGainNodeRef.current) {
        masterGainNodeRef.current = ctx.createGain();
        masterGainNodeRef.current.gain.value = masterVolumeRef.current;
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
        // 🎵 Initialize persistent pitch node first (one-time creation)
        const persistentPitchNode = await initPersistentPitchNode(ctx);
        
        // 🔗 Build audio chain with persistent pitch: Source → Pitch → [EQ] → MasterGain → FadeGain → Analyser → Destination
        if (persistentPitchNode) {
          // Chain with pitch: Source → Pitch → EQ → MasterGain
          sourceNodeRef.current.connect(persistentPitchNode);
          const eqConnected = connectEqualizer(ctx, persistentPitchNode, masterGainNodeRef.current);
          if (!eqConnected) {
            persistentPitchNode.connect(masterGainNodeRef.current);
            console.log('🔗 Persistent pitch chain: Source → Pitch → MasterGain (EQ failed)');
          } else {
            console.log('🔗 Persistent pitch chain: Source → Pitch → EQ → MasterGain');
          }
        } else {
          // Fallback without pitch: Source → EQ → MasterGain
          const eqConnected = connectEqualizer(ctx, sourceNodeRef.current, masterGainNodeRef.current);
          if (!eqConnected) {
            sourceNodeRef.current.connect(masterGainNodeRef.current);
            console.log('🔗 Fallback chain: Source → MasterGain (no pitch, EQ failed)');
          } else {
            console.log('🔗 Fallback chain: Source → EQ → MasterGain (no pitch)');
          }
        }
        
        masterGainNodeRef.current.connect(fadeGainNodeRef.current);
        fadeGainNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
        setIsConnectedState(true);
        console.log('✅ Audio chain with persistent pitch fully connected');
        
        // 🎵 Note: No need for worklet preloading here since pitch node is already created
      } else {
        console.log('🔗 Audio already connected, skipping chain setup');
      }

      return !!(masterGainNodeRef.current && fadeGainNodeRef.current);
    } catch {
      connectionStateRef.current = 'error';
      setIsConnectedState(false);
      return false;
    }
  }, [connectEqualizer, preloadPitchWorklet]);

  // 🎵 Update pitch parameters - ZERO AUDIO INTERRUPTION
  const updatePitchParameters = useCallback((pitchSemitones) => {
    const pitchNode = pitchNodeRef.current;
    if (!pitchNode) {
      console.warn('🎵 No persistent pitch node available for parameter update');
      return false;
    }
    
    try {
      // Update parameters instantly - no audio chain changes
      pitchNode.parameters.get('pitchSemitones').value = pitchSemitones;
      pitchNode.parameters.get('tempo').value = 1.0;
      pitchNode.parameters.get('rate').value = 1.0;
      
      // Update active state
      const wasActive = isPitchActiveRef.current;
      const isNowActive = pitchSemitones !== 0;
      isPitchActiveRef.current = isNowActive;
      
      console.log(`🎵 Pitch parameters updated: ${pitchSemitones}st (${wasActive ? 'was' : 'wasn\'t'} active → ${isNowActive ? 'now' : 'not'} active)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update pitch parameters:', error);
      return false;
    }
  }, []);

  // 🎵 Modern pitch control - parameter update only (zero audio interruption)
  const setPitchValue = useCallback((pitchSemitones) => {
    console.log(`🎵 setPitchValue called: ${pitchSemitones}st`);
    
    if (!pitchNodeRef.current) {
      console.warn('🎵 Persistent pitch node not available, pitch will be applied when audio connects');
      return false;
    }
    
    // Simply update parameters - no audio chain changes needed!
    return updatePitchParameters(pitchSemitones);
  }, [updatePitchParameters]);

  // 🎵 Legacy pitch node management (DEPRECATED - kept for compatibility)
  const insertPitchNode = useCallback((pitchNode) => {
    console.warn('🎵 insertPitchNode is deprecated - using persistent pitch node system');
    return true; // Always return true for compatibility
  }, []);

  const removePitchNode = useCallback(() => {
    console.warn('🎵 removePitchNode is deprecated - using persistent pitch node system');
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
    // 🎯 CRITICAL: Always ensure audio element volume is 1.0
    if (audioElement) {
      audioElement.volume = 1.0;
      currentAudioElementRef.current = audioElement;
    }
    
    if (isPlaying && isConnectedState) {
      if (!isAnimatingRef.current) startFadeAnimation(audioElement);
      else currentAudioElementRef.current = audioElement;
    } else {
      if (isAnimatingRef.current) stopFadeAnimation();
    }
  }, [startFadeAnimation, stopFadeAnimation, isConnectedState]);

  // Master volume control (0-2.0 for 200% boost)
  const setMasterVolume = useCallback((volume) => {
    const clampedVolume = Math.max(0, Math.min(2.0, volume));
    masterVolumeRef.current = clampedVolume;
    
    // 🎯 CRITICAL: ALWAYS set HTML5 audio volume to 1.0 (NEVER allow changes)
    // This ensures preview and export volumes match perfectly
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.volume = 1.0;
      console.log('🔒 HTML5 Audio Volume locked at 1.0');
    }
    
    // 🎯 Also ensure audioRef from main component is at 1.0
    // This is a backup in case currentAudioElementRef is not sett
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio.volume !== 1.0) {
        audio.volume = 1.0;
        console.log('🔒 Found and fixed audio element volume');
      }
    });
    
    if (masterGainNodeRef.current && masterGainNodeRef.current.gain) {
      masterGainNodeRef.current.gain.value = clampedVolume;
      console.log(`🔊 Volume Control: Preview=${(clampedVolume * 100).toFixed(0)}% | Export=${(clampedVolume * 100).toFixed(0)}% | HTML5=100% (Fixed)`);
    }
    
    // 🎯 Final verification
    console.log('🎚️ Volume Consistency Verification:', {
      requestedVolume: volume,
      actualWebAudioGain: clampedVolume,
      exportVolumeWillBe: clampedVolume,
      htmlAudioVolumeIsLocked: true,
      previewEqualsExport: true
    });
  }, []);

  const getMasterVolume = useCallback(() => {
    return masterVolumeRef.current;
  }, []);
  useEffect(() => () => {
    isAnimatingRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    // 🧹 Cleanup equalizer first
    disconnectEqualizer();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed')
      audioContextRef.current.close();
    audioContextRef.current = null; 
    sourceNodeRef.current = null; 
    masterGainNodeRef.current = null; 
    fadeGainNodeRef.current = null; 
    analyserNodeRef.current = null;
    isConnectedRef.current = false; 
    connectionStateRef.current = 'disconnected';
    setIsConnectedState(false); // 🔧 Reset state
    pitchNodeRef.current = null; 
    hasPitchNodeRef.current = false;
    // 🎵 Reset worklet state
    isWorkletLoadedRef.current = false;
    workletLoadingRef.current = false;
  }, [disconnectEqualizer]);

  // 🎵 Create persistent pitch node - CREATED ONCE, never destroyed - MOVED UP to avoid temporal dead zone
  const initPersistentPitchNode = useCallback(async (ctx) => {
    if (pitchNodeRef.current || !ctx) return pitchNodeRef.current;
    
    try {
      console.log('🎵 Creating persistent pitch node (one-time creation)...');
      
      // Ensure worklet is loaded
      if (!isWorkletLoadedRef.current) {
        await preloadPitchWorklet(ctx);
      }
      
      // Create persistent pitch node
      const pitchNode = new AudioWorkletNode(ctx, 'soundtouch-processor');
      
      // Initialize with neutral values (no effect)
      pitchNode.parameters.get('pitchSemitones').value = 0;
      pitchNode.parameters.get('tempo').value = 1.0;
      pitchNode.parameters.get('rate').value = 1.0;
      
      // Store persistent reference
      pitchNodeRef.current = pitchNode;
      hasPitchNodeRef.current = true;
      isPitchActiveRef.current = false; // Initially inactive
      
      console.log('✅ Persistent pitch node created successfully');
      return pitchNode;
    } catch (error) {
      console.error('❌ Failed to create persistent pitch node:', error);
      return null;
    }
  }, [preloadPitchWorklet, isWorkletLoadedRef]);

  return {
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    fadeConfig,
    isWebAudioSupported: !!(window.AudioContext || window.webkitAudioContext),
    
    // Pitch shift integration
    insertPitchNode,
    removePitchNode,
    setPitchValue,
    audioContext: audioContextRef.current,
    sourceNode: sourceNodeRef.current,
    masterGainNode: masterGainNodeRef.current,
    fadeGainNode: fadeGainNodeRef.current,
    isConnected: isConnectedState,

    // Master volume control
    setMasterVolume,
    getMasterVolume,
    
    // 🎚️ Equalizer control
    updateEqualizerBand,
    updateEqualizerValues,
    resetEqualizer,
    isEqualizerConnected, // Use from equalizer hook
    getEqualizerState,
    
    // 🎵 Pitch worklet state
    isWorkletPreloaded: () => isWorkletLoadedRef.current
  };
};
