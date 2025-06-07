import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * 🎨 **REAL-TIME FADE EFFECTS HOOK - OPTIMIZED**
 * Sử dụng Web Audio API để apply fade in/out effects real-time khi nhạc đang phát
 * - Stable Web Audio connection với better error handling
 * - Persistent animation loop không bị interrupt
 * - Enhanced debugging cho troubleshooting
 */
export const useRealTimeFadeEffects = () => {
  // 🎯 **WEB AUDIO API REFS**
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserNodeRef = useRef(null);
  const isConnectedRef = useRef(false);
  const connectionStateRef = useRef('disconnected'); // 'disconnected', 'connecting', 'connected', 'error'
  
  // 🎯 **FADE CONFIGURATION**
  const [fadeConfig, setFadeConfig] = useState({
    fadeIn: 0,
    fadeOut: 0,
    startTime: 0,
    endTime: 0,
    isActive: false
  });
  
  // 🆕 **FADE CONFIG REF**: Ref để animation loop luôn access config mới nhất
  const fadeConfigRef = useRef(fadeConfig);
  
  // 🎯 **ANIMATION REFS**
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const currentAudioElementRef = useRef(null); // 🆕 Track current audio element
  
  // 🆕 **DEBUG STATE REF**: Track connection attempts và states
  const debugStateRef = useRef({
    connectionAttempts: 0,
    lastGainValue: 1.0,
    lastCurrentTime: 0,
    audioElementReady: false
  });

  // 🎯 **ENHANCED WEB AUDIO INITIALIZATION** với improved error handling
  const initializeWebAudio = useCallback(async (audioElement) => {
    try {
      connectionStateRef.current = 'connecting';
      debugStateRef.current.connectionAttempts++;
      console.log(`🔧 [RealTimeFade] Connection attempt #${debugStateRef.current.connectionAttempts} - initializing Web Audio...`);
      
      // 🔧 **CREATE AUDIO CONTEXT** với state validation
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🎛️ [RealTimeFade] Audio context created, state:', audioContextRef.current.state);
      }
      
      const audioContext = audioContextRef.current;
      
      // 🔧 **FORCE RESUME CONTEXT** để đảm bảo context readyy
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('🔄 [RealTimeFade] Audio context resumed from suspended state');
      }
      
      // 🆕 **VALIDATE AUDIO ELEMENT** trước khi connect
      if (!audioElement || !audioElement.src) {
        console.warn('⚠️ [RealTimeFade] Invalid audio element - no src available');
        return false;
      }
      
      debugStateRef.current.audioElementReady = !!audioElement.src;
      console.log('🎵 [RealTimeFade] Audio element validation:', {
        hasElement: !!audioElement,
        hasSrc: !!audioElement.src,
        readyState: audioElement.readyState,
        duration: audioElement.duration
      });
      
      // 🆕 **IMPROVED SOURCE NODE CREATION** với better error handling
      if (!sourceNodeRef.current) {
        try {
          sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
          console.log('✅ [RealTimeFade] NEW source node created successfully');
        } catch (error) {
          if (error.name === 'InvalidStateError') {
            // 🚨 **CRITICAL FIX**: Nếu source đã tồn tại, tìm cách reuse hoặc tạo mới
            console.warn('⚠️ [RealTimeFade] Audio element already connected - attempting reconnection...');
            
            // 🔄 **TRY ALTERNATIVE APPROACH**: Tạo audio context mới để force reconnect
            try {
              const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
              await newAudioContext.resume();
              
              sourceNodeRef.current = newAudioContext.createMediaElementSource(audioElement);
              audioContextRef.current = newAudioContext; // Update context reference
              console.log('🔄 [RealTimeFade] Successfully created new connection with fresh context');
            } catch (secondError) {
              console.error('❌ [RealTimeFade] Failed to create alternative connection:', secondError);
              return false;
            }
          } else {
            console.error('❌ [RealTimeFade] Source node creation failed:', error);
            return false;
          }
        }
      }
      
      // 🔧 **ALWAYS CREATE FRESH GAIN NODE** để đảm bảo working state
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.gain.value = 1.0;
        debugStateRef.current.lastGainValue = 1.0;
        console.log('🔊 [RealTimeFade] Fresh gain node created, gain:', gainNodeRef.current.gain.value);
      }
      
      // 🔧 **CREATE ANALYSER NODE** cho monitoring
      if (!analyserNodeRef.current) {
        analyserNodeRef.current = audioContext.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
        console.log('📊 [RealTimeFade] Analyser node created');
      }
      
      // 🆕 **ROBUST CONNECTION LOGIC** với validation steps
      if (!isConnectedRef.current && sourceNodeRef.current && gainNodeRef.current && analyserNodeRef.current) {
        try {
          // 🔗 **STEP BY STEP CONNECTION** với individual error handling
          console.log('🔗 [RealTimeFade] Connecting audio graph...');
          
          sourceNodeRef.current.connect(gainNodeRef.current);
          console.log('✅ [RealTimeFade] Source → Gain connected');
          
          gainNodeRef.current.connect(analyserNodeRef.current);
          console.log('✅ [RealTimeFade] Gain → Analyser connected');
          
          analyserNodeRef.current.connect(audioContext.destination);
          console.log('✅ [RealTimeFade] Analyser → Destination connected');
          
          isConnectedRef.current = true;
          connectionStateRef.current = 'connected';
          
          console.log('🎉 [RealTimeFade] Complete audio graph connected: source → gain → analyser → destination');
          
        } catch (connectionError) {
          console.error('❌ [RealTimeFade] Connection failed:', connectionError);
          connectionStateRef.current = 'error';
          return false;
        }
      } else {
        console.log('🔄 [RealTimeFade] Audio graph already connected, reusing existing connection');
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
      }
      
      // 🆕 **CONNECTION VALIDATION** để verify working state
      const isWorking = gainNodeRef.current && gainNodeRef.current.gain && typeof gainNodeRef.current.gain.value === 'number';
      if (!isWorking) {
        console.error('❌ [RealTimeFade] Gain node validation failed - connection may be broken');
        return false;
      }
      
      console.log('✅ [RealTimeFade] Web Audio setup completed successfully:', {
        contextState: audioContext.state,
        connectionState: connectionStateRef.current,
        gainNodeWorking: isWorking,
        gainValue: gainNodeRef.current.gain.value
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ [RealTimeFade] Fatal initialization error:', error);
      connectionStateRef.current = 'error';
      return false;
    }
  }, []);
  
  // 🎯 **OPTIMIZED FADE MULTIPLIER CALCULATION** với better debugging
  const calculateFadeMultiplier = useCallback((currentTime, config) => {
    const { fadeIn, fadeOut, startTime, endTime } = config;
    
    // 🔧 **DEBUG CURRENT TIME** để detect stuck time
    if (Math.abs(currentTime - debugStateRef.current.lastCurrentTime) > 0.1) {
      console.log(`⏰ [RealTimeFade] Current time progressed: ${debugStateRef.current.lastCurrentTime.toFixed(2)}s → ${currentTime.toFixed(2)}s`);
      debugStateRef.current.lastCurrentTime = currentTime;
    }
    
    // 🚫 **NO FADE CONDITIONS**
    if (fadeIn === 0 && fadeOut === 0) return 1.0;
    if (currentTime < startTime || currentTime > endTime) return 1.0;
    
    const timeInSelection = currentTime - startTime;
    const timeFromEnd = endTime - currentTime;
    let multiplier = 1.0;
    
    // 🔥 **FADE IN EFFECT** với enhanced calculation
    if (fadeIn > 0 && timeInSelection <= fadeIn) {
      const fadeProgress = timeInSelection / fadeIn; // 0.0 → 1.0
      const easedProgress = 1 - Math.pow(1 - fadeProgress, 1.5);
      multiplier = Math.min(multiplier, 0.001 + (easedProgress * 0.999));
      
      // 🔧 **FADE IN DEBUG**: Log fade in progress occasionally
      if (fadeProgress < 0.5 && Math.random() < 0.05) {
        console.log(`🔥 [RealTimeFade] FadeIn active: progress=${(fadeProgress * 100).toFixed(1)}%, multiplier=${multiplier.toFixed(3)}`);
      }
    }
    
    // 🔥 **FADE OUT EFFECT** với enhanced calculation
    if (fadeOut > 0 && timeFromEnd <= fadeOut) {
      const fadeProgress = timeFromEnd / fadeOut; // 1.0 → 0.0
      const easedProgress = Math.pow(fadeProgress, 1.5);
      const fadeOutMultiplier = 0.001 + (easedProgress * 0.999);
      multiplier = Math.min(multiplier, fadeOutMultiplier);
      
      // 🔧 **FADE OUT DEBUG**: Log fade out progress occasionally
      if (fadeProgress < 0.5 && Math.random() < 0.05) {
        console.log(`🔥 [RealTimeFade] FadeOut active: progress=${(fadeProgress * 100).toFixed(1)}%, multiplier=${multiplier.toFixed(3)}`);
      }
    }
    
    return Math.max(0.0001, Math.min(1.0, multiplier));
  }, []);
  
  // 🆕 **OPTIMIZED ANIMATION LOOP** - sử dụng ref để access latest config
  const startFadeAnimation = useCallback((audioElement) => {
    if (isAnimatingRef.current) {
      console.log('🔄 [RealTimeFade] Animation already running, skipping start');
      return;
    }
    
    if (!gainNodeRef.current) {
      console.log('⚠️ [RealTimeFade] Cannot start animation - missing gain node');
      return;
    }
    
    isAnimatingRef.current = true;
    currentAudioElementRef.current = audioElement; // 🆕 Store audio element reference
    console.log('🎬 [RealTimeFade] Starting persistent fade animation...');
    
    const animate = (timestamp) => {
      // 🚀 **60FPS THROTTLING**
      if (timestamp - lastUpdateTimeRef.current < 16) {
        if (isAnimatingRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return;
      }
      lastUpdateTimeRef.current = timestamp;
      
      // 🆕 **USE CURRENT AUDIO ELEMENT** từ ref
      const currentAudioElement = currentAudioElementRef.current;
      
      // 🆕 **ROBUST ELEMENT CHECK** 
      if (!currentAudioElement || !gainNodeRef.current) {
        console.warn('⚠️ [RealTimeFade] Missing audio element or gain node, continuing animation...');
        if (isAnimatingRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return;
      }
      
      // 🎯 **GET CURRENT TIME** với fallback
      const currentTime = currentAudioElement.currentTime || 0;
      
      // 🆕 **USE LATEST CONFIG** từ ref thay vì closure
      const latestConfig = fadeConfigRef.current;
      
      // 🔧 **DEBUG CONFIG USAGE**: Log khi sử dụng config mới
      if (Math.random() < 0.01) { // 1% sampling để avoid spam
        console.log('🔄 [RealTimeFade] Using latest config in animation:', {
          fadeIn: latestConfig.fadeIn.toFixed(1) + 's',
          fadeOut: latestConfig.fadeOut.toFixed(1) + 's',
          isActive: latestConfig.isActive,
          currentTime: currentTime.toFixed(2) + 's'
        });
      }
      
      // 🎯 **CALCULATE FADE MULTIPLIER** với latest config
      const fadeMultiplier = calculateFadeMultiplier(currentTime, latestConfig);
      
      // 🎯 **APPLY GAIN** với enhanced error handling
      try {
        if (gainNodeRef.current && gainNodeRef.current.gain) {
          const currentGain = gainNodeRef.current.gain.value;
          const targetGain = fadeMultiplier;
          
          // 🚀 **SMOOTH INTERPOLATION**
          const diff = targetGain - currentGain;
          if (Math.abs(diff) > 0.0001) {
            const interpolationSpeed = Math.min(0.3, Math.max(0.05, Math.abs(diff) * 2));
            const newGain = currentGain + (diff * interpolationSpeed);
            gainNodeRef.current.gain.value = newGain;
            debugStateRef.current.lastGainValue = newGain;
            
            // 🔧 **ENHANCED DEBUG**: Log significant changes với real-time tag
            if (Math.abs(diff) > 0.1) {
              console.log(`🎨 [RealTimeFade] REAL-TIME gain update: ${currentGain.toFixed(3)} → ${targetGain.toFixed(3)} (time: ${currentTime.toFixed(2)}s, fadeIn: ${latestConfig.fadeIn}s, fadeOut: ${latestConfig.fadeOut}s)`);
            }
          } else {
            gainNodeRef.current.gain.value = targetGain;
            debugStateRef.current.lastGainValue = targetGain;
          }
        }
      } catch (gainError) {
        console.error('❌ [RealTimeFade] Gain application error:', gainError);
      }
      
      // 🆕 **CONTINUE WITH LATEST CONFIG** - check latest config cho continuation
      if (isAnimatingRef.current && latestConfig.isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        console.log('⏹️ [RealTimeFade] Animation stopped - fade not active or explicitly stopped');
        isAnimatingRef.current = false;
        animationFrameRef.current = null;
        currentAudioElementRef.current = null; // 🆕 Clear audio element ref
      }
    };
    
    // 🚀 **START ANIMATION**
    animationFrameRef.current = requestAnimationFrame(animate);
    console.log('✅ [RealTimeFade] Persistent animation started with real-time config updates');
  }, [calculateFadeMultiplier]); // 🆕 **REMOVED fadeConfig dependency** để tránh recreation
  
  // 🎯 **STOP FADE ANIMATION** với better cleanup
  const stopFadeAnimation = useCallback(() => {
    console.log('🛑 [RealTimeFade] Stopping fade animation...');
    
    isAnimatingRef.current = false;
    currentAudioElementRef.current = null; // 🆕 Clear audio element ref
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log('⏹️ [RealTimeFade] Animation frame cancelled');
    }
    
    // 🔄 **GRADUAL RESET** thay vì immediate reset để tránh audio pop
    if (gainNodeRef.current && gainNodeRef.current.gain) {
      const currentGain = gainNodeRef.current.gain.value;
      if (Math.abs(currentGain - 1.0) > 0.01) {
        // 🎯 **SMOOTH RESET**: Gradually reset về 1.0
        const resetSteps = 10;
        let step = 0;
        
        const resetInterval = setInterval(() => {
          step++;
          const progress = step / resetSteps;
          const newGain = currentGain + ((1.0 - currentGain) * progress);
          
          if (gainNodeRef.current && gainNodeRef.current.gain) {
            gainNodeRef.current.gain.value = newGain;
          }
          
          if (step >= resetSteps) {
            clearInterval(resetInterval);
            if (gainNodeRef.current && gainNodeRef.current.gain) {
              gainNodeRef.current.gain.value = 1.0;
            }
            console.log('🔊 [RealTimeFade] Gain smoothly reset to 1.0');
          }
        }, 10); // 100ms total reset time
      } else {
        gainNodeRef.current.gain.value = 1.0;
        console.log('🔊 [RealTimeFade] Gain immediately reset to 1.0');
      }
      
      debugStateRef.current.lastGainValue = 1.0;
    }
  }, []);
  
  // 🆕 **REAL-TIME CONFIG UPDATE** - restart animation khi config thay đổi trong lúc playing
  const updateFadeConfig = useCallback((newConfig) => {
    const { fadeIn, fadeOut, startTime, endTime } = newConfig;
    const isActive = (fadeIn > 0 || fadeOut > 0) && startTime < endTime;
    
    const updatedConfig = {
      fadeIn,
      fadeOut, 
      startTime,
      endTime,
      isActive
    };
    
    // 🆕 **UPDATE BOTH STATE AND REF** để đảm bảo consistency
    setFadeConfig(updatedConfig);
    fadeConfigRef.current = updatedConfig; // 🆕 **IMMEDIATE REF UPDATE** cho animation loop
    
    // 🔧 **DEBUG CONFIG CHANGE**: Log config updates với animation state
    console.log('🎨 [RealTimeFade] REAL-TIME config updated:', {
      fadeIn: fadeIn.toFixed(1) + 's',
      fadeOut: fadeOut.toFixed(1) + 's',
      range: `${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s`,
      isActive,
      isAnimating: isAnimatingRef.current,
      connectionState: connectionStateRef.current,
      willRestartAnimation: isAnimatingRef.current && currentAudioElementRef.current
    });
    
    // 🆕 **RESTART ANIMATION** nếu đang play và config thay đổi
    if (isAnimatingRef.current && currentAudioElementRef.current) {
      console.log('🔄 [RealTimeFade] Config changed during playback - effects will update in next frame');
      // 🔧 **NO RESTART NEEDED**: Animation loop sẽ tự động pick up config mới từ ref
      // Điều này tạo ra smooth transition mà không cần restart animation
    }
    
    // 🔄 **SMART GAIN RESET** - chỉ reset khi fade effects được disable
    if (!isActive && gainNodeRef.current && gainNodeRef.current.gain) {
      gainNodeRef.current.gain.value = 1.0;
      debugStateRef.current.lastGainValue = 1.0;
      console.log('🔊 [RealTimeFade] Gain reset to 1.0 (fade effects disabled)');
    }
  }, []);
  
  // 🆕 **SYNC CONFIG REF** - đảm bảo ref luôn sync với state
  useEffect(() => {
    fadeConfigRef.current = fadeConfig;
  }, [fadeConfig]);
  
  // 🎯 **CONNECT AUDIO ELEMENT** với retry logic
  const connectAudioElement = useCallback(async (audioElement) => {
    if (!audioElement) {
      console.warn('⚠️ [RealTimeFade] No audio element provided for connection');
      return false;
    }
    
    console.log('🔌 [RealTimeFade] Attempting to connect audio element...');
    
    // 🆕 **RETRY LOGIC** cho connection failures
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 [RealTimeFade] Connection attempt ${attempts}/${maxAttempts}`);
      
      const success = await initializeWebAudio(audioElement);
      if (success) {
        console.log(`✅ [RealTimeFade] Audio element connected successfully on attempt ${attempts}`);
        return true;
      }
      
      if (attempts < maxAttempts) {
        console.log(`⏳ [RealTimeFade] Connection failed, retrying in 100ms...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.error(`❌ [RealTimeFade] Failed to connect after ${maxAttempts} attempts`);
    return false;
  }, [initializeWebAudio]);
  
  // 🆕 **ENHANCED FADE ACTIVE CONTROL** với real-time config support
  const setFadeActive = useCallback((isPlaying, audioElement) => {
    console.log('🎬 [RealTimeFade] Fade active control:', {
      isPlaying,
      currentFadeActive: fadeConfigRef.current.isActive,
      connectionState: connectionStateRef.current,
      isAnimating: isAnimatingRef.current,
      hasAudioElement: !!audioElement
    });
    
    if (isPlaying && connectionStateRef.current === 'connected') {
      if (!isAnimatingRef.current) {
        startFadeAnimation(audioElement);
        console.log('🎬 [RealTimeFade] Animation started for playback');
      } else {
        console.log('🔄 [RealTimeFade] Animation already running, no need to restart');
      }
    } else {
      if (isAnimatingRef.current) {
        stopFadeAnimation();
        console.log('🛑 [RealTimeFade] Animation stopped - not playing or not connected');
      }
    }
  }, [startFadeAnimation, stopFadeAnimation]); // 🆕 **REMOVED fadeConfig dependency**
  
  // 🆕 **DEBUG FUNCTION** để troubleshoot connection issues
  const getConnectionDebugInfo = useCallback(() => {
    return {
      connectionState: connectionStateRef.current,
      hasAudioContext: !!audioContextRef.current,
      hasSourceNode: !!sourceNodeRef.current,
      hasGainNode: !!gainNodeRef.current,
      hasAnalyserNode: !!analyserNodeRef.current,
      isConnected: isConnectedRef.current,
      isAnimating: isAnimatingRef.current,
      fadeConfig,
      fadeConfigRef: fadeConfigRef.current, // 🆕 **REF CONFIG**: Show ref config vs state config
      debugState: debugStateRef.current,
      audioContextState: audioContextRef.current?.state,
      gainValue: gainNodeRef.current?.gain?.value,
      currentAudioElement: !!currentAudioElementRef.current
    };
  }, [fadeConfig]);
  
  // 🆕 **REAL-TIME DEBUG UTILITY**: Function để force log current state
  const logRealTimeState = useCallback(() => {
    const debugInfo = getConnectionDebugInfo();
    console.log('🔍 [RealTimeFade] REAL-TIME State Debug:', {
      ...debugInfo,
      configMatch: JSON.stringify(debugInfo.fadeConfig) === JSON.stringify(debugInfo.fadeConfigRef),
      note: 'State config vs Ref config should match for real-time updates'
    });
  }, [getConnectionDebugInfo]);
  
  // 🆕 **GLOBAL DEBUG UTILITY**: Expose debug function to window for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugRealTimeFade = logRealTimeState;
      console.log('🔧 [RealTimeFade] Debug utility available: window.debugRealTimeFade()');
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.debugRealTimeFade;
      }
    };
  }, [logRealTimeState]);
  
  // 🔧 **CLEANUP EFFECT** với enhanced cleanup
  useEffect(() => {
    return () => {
      console.log('🧹 [RealTimeFade] Component cleanup - stopping all activities');
      
      // Stop animation
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log('🧹 [RealTimeFade] Audio context closed');
        }).catch(err => {
          console.error('⚠️ [RealTimeFade] Error closing audio context:', err);
        });
      }
      
      // Reset all refs
      audioContextRef.current = null;
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
      analyserNodeRef.current = null;
      isConnectedRef.current = false;
      connectionStateRef.current = 'disconnected';
    };
  }, []);
  
  return {
    // 🎯 **PUBLIC API**
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    
    // 🎯 **STATE**
    fadeConfig,
    isWebAudioSupported: !!(window.AudioContext || window.webkitAudioContext),
    
    // 🆕 **DEBUG API**
    getConnectionDebugInfo,
    
    // 🎯 **INTERNAL REFS** (for debugging)
    audioContextRef,
    gainNodeRef,
    isConnectedRef,
    connectionState: connectionStateRef.current
  };
}; 