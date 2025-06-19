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
  
  // Pitch shift integration
  const pitchNodeRef = useRef(null);
  const hasPitchNodeRef = useRef(false);
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
    getEqualizerState,
    getFirstEqualizerFilter
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
        // 🔗 Build initial audio chain: Source → [EQ] → MasterGain → FadeGain → Analyser → Destination
        // Note: Pitch will be inserted later via insertPitchNode if needed
        const eqConnected = connectEqualizer(ctx, sourceNodeRef.current, masterGainNodeRef.current);
        if (!eqConnected) {
          // Fallback to direct connection if EQ fails
          console.log('🔗 EQ connection failed, using direct connection');
          sourceNodeRef.current.connect(masterGainNodeRef.current);
        } else {
          console.log('🎚️ EQ connected successfully');
        }
        
        masterGainNodeRef.current.connect(fadeGainNodeRef.current);
        fadeGainNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
        setIsConnectedState(true);
        console.log('✅ Audio chain fully connected, isConnected:', isConnectedRef.current);
        
        // 🎵 Preload pitch worklet in background for smooth pitch changes
        await preloadPitchWorklet(ctx);
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

  // 🎵 Ultra-smooth pitch node insertion - zero audio interruption - MOVED UP to avoid use-before-define
  const ultraSmoothInsertPitchNode = useCallback((pitchNode) => {
    console.log('🎵 Ultra-smooth pitch insertion starting (zero interruption)...');
    
    try {
      const source = sourceNodeRef.current;
      const masterGain = masterGainNodeRef.current;
      
      if (!source || !masterGain || !pitchNode) {
        console.error('❌ Missing required nodes for ultra-smooth insertion');
        return false;
      }

      // 🚀 ULTRA-SMOOTH: Only disconnect/reconnect source → no EQ disruption
      console.log('🎵 Ultra-smooth: Disconnecting only source (EQ stays connected)');
      safeDisconnect(source, 'Source (ultra-smooth)');
      
      // Connect: Source → Pitch
      source.connect(pitchNode);
      console.log('🎵 Ultra-smooth: Source → Pitch connected');
      
      // Connect: Pitch → existing EQ chain (if EQ connected) or direct to masterGain
      if (isEqualizerConnected) {
        console.log('🎵 Ultra-smooth: Connecting pitch to existing EQ chain...');
        // Connect to existing first EQ filter - no EQ disruption
        const firstEqFilter = getFirstEqualizerFilter();
        if (firstEqFilter) {
          pitchNode.connect(firstEqFilter);
          console.log('🎵 Ultra-smooth: Pitch → EQ[0] → EQ[1]...EQ[n] → MasterGain (zero interruption)');
        } else {
          // EQ not properly connected, use direct connection
          pitchNode.connect(masterGain);
          console.log('🎵 Ultra-smooth: Pitch → MasterGain (direct, EQ filter unavailable)');
        }
      } else {
        // No EQ connected, direct connection
        pitchNode.connect(masterGain);
        console.log('🎵 Ultra-smooth: Pitch → MasterGain (direct, no EQ)');
      }
      
      console.log('✅ Ultra-smooth pitch insertion completed (zero interruption)');
      return true;
    } catch (error) {
      console.error('❌ Ultra-smooth pitch insertion failed:', error);
      return false;
    }
  }, [safeDisconnect, isEqualizerConnected, getFirstEqualizerFilter]);

  // 🎵 Ultra-smooth pitch node removal - zero audio interruption
  const ultraSmoothRemovePitchNode = useCallback(() => {
    console.log('🎵 Ultra-smooth pitch removal starting (zero interruption)...');
    
    try {
      const source = sourceNodeRef.current;
      const masterGain = masterGainNodeRef.current;
      const pitchNode = pitchNodeRef.current;
      
      if (!source || !masterGain || !pitchNode) {
        console.log('🎵 Nothing to remove or missing nodes');
        return true;
      }

      // 🚀 ULTRA-SMOOTH: Only disconnect/reconnect source → preserve EQ chain
      console.log('🎵 Ultra-smooth: Disconnecting source from pitch (EQ preserved)');
      safeDisconnect(source, 'Source (ultra-smooth removal)');
      
      // Disconnect pitch node completely
      safeDisconnect(pitchNode, 'Pitch node (ultra-smooth removal)');
      
      // Reconnect source directly to existing EQ chain or masterGain
      if (isEqualizerConnected) {
        const firstEqFilter = getFirstEqualizerFilter();
        if (firstEqFilter) {
          source.connect(firstEqFilter);
          console.log('🎵 Ultra-smooth: Source → EQ[0] → ...EQ[n] → MasterGain (pitch removed, zero interruption)');
        } else {
          source.connect(masterGain);
          console.log('🎵 Ultra-smooth: Source → MasterGain (direct, EQ filter unavailable)');
        }
      } else {
        source.connect(masterGain);
        console.log('🎵 Ultra-smooth: Source → MasterGain (direct, no EQ)');
      }
      
      console.log('✅ Ultra-smooth pitch removal completed (zero interruption)');
      return true;
    } catch (error) {
      console.error('❌ Ultra-smooth pitch removal failed:', error);
      return false;
    }
  }, [safeDisconnect, isEqualizerConnected, getFirstEqualizerFilter]);

  // Insert pitch node at the beginning of the chain
  const insertPitchNode = useCallback((pitchNode) => {
    console.log('🎵 insertPitchNode called', !!pitchNode, 'hasPitch:', hasPitchNodeRef.current);
    
    if (!pitchNode || !sourceNodeRef.current || !masterGainNodeRef.current) {
      console.warn('🎵 Cannot insert pitch node: missing required nodes', { 
        pitchNode: !!pitchNode, 
        source: !!sourceNodeRef.current, 
        masterGain: !!masterGainNodeRef.current 
      });
      return false;
    }

    try {
      // Clear old pitch reference if exists
      if (hasPitchNodeRef.current || pitchNodeRef.current) {
        console.log('🎵 Clearing existing pitch node reference...');
        pitchNodeRef.current = null;
        hasPitchNodeRef.current = false;
      }
      
      // Store new pitch node reference
      pitchNodeRef.current = pitchNode;
      hasPitchNodeRef.current = true;
      
      // Use ultra-smooth insertion instead of full rebuild (zero audio interruption)
      if (ultraSmoothInsertPitchNode(pitchNode)) {
        console.log('✅ Pitch node inserted ultra-smoothly into audio chain (zero interruption)');
        return true;
      } else {
        // Rollback on failure
        pitchNodeRef.current = null;
        hasPitchNodeRef.current = false;
        console.error('❌ Failed to ultra-smoothly insert pitch node');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to insert pitch node:', error);
      // Rollback on failure
      pitchNodeRef.current = null;
      hasPitchNodeRef.current = false;
      return false;
    }
  }, [ultraSmoothInsertPitchNode]);

  // Remove pitch node from chain
  const removePitchNode = useCallback(() => {
    console.log('🎵 removePitchNode called');
    
    if (!pitchNodeRef.current || !hasPitchNodeRef.current) {
      console.log('🎵 No pitch node to remove');
      return;
    }
    
    try {
      // Use smooth removal instead of full rebuild
      if (ultraSmoothRemovePitchNode()) {
        // Clear pitch node references after successful removal
        pitchNodeRef.current = null;
        hasPitchNodeRef.current = false;
        console.log('✅ Pitch node removed smoothly from audio chain');
      } else {
        console.error('❌ Failed to smoothly remove pitch node');
      }
    } catch (error) {
      console.error('❌ Failed to remove pitch node:', error);
    }
  }, [ultraSmoothRemovePitchNode]);

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
