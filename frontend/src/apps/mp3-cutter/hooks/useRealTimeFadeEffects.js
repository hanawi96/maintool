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
    audioElementReady: false,
    lastFadeIn: 0,
    lastFadeOut: 0
  });

  // 🎯 **ENHANCED WEB AUDIO INITIALIZATION** với improved error handling
  const initializeWebAudio = useCallback(async (audioElement) => {
    try {
      connectionStateRef.current = 'connecting';
      debugStateRef.current.connectionAttempts++;
      
      // 🔧 **CREATE AUDIO CONTEXT** với state validation
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // 🔧 **FORCE RESUME CONTEXT** để đảm bảo context readyy
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // 🆕 **VALIDATE AUDIO ELEMENT** trước khi connect
      if (!audioElement || !audioElement.src) {
        return false;
      }
      
      debugStateRef.current.audioElementReady = !!audioElement.src;

      
      // 🆕 **IMPROVED SOURCE NODE CREATION** với better error handling
      if (!sourceNodeRef.current) {
        try {
          sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
        } catch (error) {
          if (error.name === 'InvalidStateError') {
            // 🚨 **CRITICAL FIX**: Nếu source đã tồn tại, tìm cách reuse hoặc tạo mới
            
            // 🔄 **TRY ALTERNATIVE APPROACH**: Tạo audio context mới để force reconnect
            try {
              const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
              await newAudioContext.resume();
              
              sourceNodeRef.current = newAudioContext.createMediaElementSource(audioElement);
              audioContextRef.current = newAudioContext; // Update context reference
            } catch (secondError) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
      
      // 🔧 **ALWAYS CREATE FRESH GAIN NODE** để đảm bảo working state
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.gain.value = 1.0;
        debugStateRef.current.lastGainValue = 1.0;
      }
      
      // 🔧 **CREATE ANALYSER NODE** cho monitoring
      if (!analyserNodeRef.current) {
        analyserNodeRef.current = audioContext.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
      }
      
      // 🆕 **ROBUST CONNECTION LOGIC** với validation steps
      if (!isConnectedRef.current && sourceNodeRef.current && gainNodeRef.current && analyserNodeRef.current) {
        try {
          // 🔗 **STEP BY STEP CONNECTION** với individual error handling
          
          sourceNodeRef.current.connect(gainNodeRef.current);
          
          gainNodeRef.current.connect(analyserNodeRef.current);
          
          analyserNodeRef.current.connect(audioContext.destination);
          
          isConnectedRef.current = true;
          connectionStateRef.current = 'connected';
          
          
        } catch (connectionError) {
          connectionStateRef.current = 'error';
          return false;
        }
      } else {
        isConnectedRef.current = true;
        connectionStateRef.current = 'connected';
      }
      
      // 🆕 **CONNECTION VALIDATION** để verify working state
      const isWorking = gainNodeRef.current && gainNodeRef.current.gain && typeof gainNodeRef.current.gain.value === 'number';
      if (!isWorking) {
        return false;
      }
      

      
      return true;
      
    } catch (error) {
      connectionStateRef.current = 'error';
      return false;
    }
  }, []);
  
  // 🎯 **OPTIMIZED FADE MULTIPLIER CALCULATION** với corrected invert mode logic
  const calculateFadeMultiplier = useCallback((currentTime, config) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted, duration = 0 } = config;
    
    // 🔧 **DEBUG CURRENT TIME** để detect stuck time
    if (Math.abs(currentTime - debugStateRef.current.lastCurrentTime) > 0.1) {
      debugStateRef.current.lastCurrentTime = currentTime;
    }
    
    if (isInverted) {
      // 🆕 **INVERT MODE**: Silence region has absolute priority
      if (currentTime >= startTime && currentTime <= endTime) {
        return 0.001; // Silence region - no fade effects apply here
      }
      
      // 🔥 **FADE EFFECTS FOR ACTIVE REGIONS**: Apply to regions before startTime and after endTime
      if (fadeIn === 0 && fadeOut === 0) return 1.0;
      
      let multiplier = 1.0;
      
      // 🎯 **FADE IN - FIRST ACTIVE REGION** (0 to startTime)
      if (fadeIn > 0 && currentTime < startTime) {
        const activeRegionDuration = startTime; // From 0 to startTime
        const fadeInEnd = Math.min(fadeIn, activeRegionDuration);
        
        if (currentTime <= fadeInEnd) {
          const fadeProgress = currentTime / fadeInEnd;
          const easedProgress = 1 - Math.pow(1 - fadeProgress, 1.5);
          multiplier = Math.min(multiplier, 0.001 + (easedProgress * 0.999));
        }
      }
      
      // 🔥 **FADE OUT - SECOND ACTIVE REGION** (endTime to duration)
      if (fadeOut > 0 && currentTime >= endTime && duration > 0) {
        const activeRegionDuration = duration - endTime; // From endTime to duration
        const actualFadeOutDuration = Math.min(fadeOut, activeRegionDuration);
        const fadeOutStart = duration - actualFadeOutDuration; // Fade at the END of this region
        
        if (currentTime >= fadeOutStart) {
          const fadeProgress = (duration - currentTime) / actualFadeOutDuration;
          const easedProgress = Math.pow(fadeProgress, 1.5);
          const fadeOutMultiplier = 0.001 + (easedProgress * 0.999);
          multiplier = Math.min(multiplier, fadeOutMultiplier);
        }
      }
      
      return Math.max(0.0001, Math.min(1.0, multiplier));
    } else {
      // 🎯 **NORMAL MODE**: Original logic
      if (fadeIn === 0 && fadeOut === 0) return 1.0;
      if (currentTime < startTime || currentTime > endTime) return 1.0;
      
      let multiplier = 1.0;
      const timeInSelection = currentTime - startTime;
      const timeFromEnd = endTime - currentTime;
      
      // 🔥 **FADE IN EFFECT** với enhanced calculation
      if (fadeIn > 0 && timeInSelection <= fadeIn) {
        const fadeProgress = timeInSelection / fadeIn;
        const easedProgress = 1 - Math.pow(1 - fadeProgress, 1.5);
        multiplier = Math.min(multiplier, 0.001 + (easedProgress * 0.999));
      }
      
      // 🔥 **FADE OUT EFFECT** với enhanced calculation
      if (fadeOut > 0 && timeFromEnd <= fadeOut) {
        const fadeProgress = timeFromEnd / fadeOut;
        const easedProgress = Math.pow(fadeProgress, 1.5);
        const fadeOutMultiplier = 0.001 + (easedProgress * 0.999);
        multiplier = Math.min(multiplier, fadeOutMultiplier);
      }
      
      return Math.max(0.0001, Math.min(1.0, multiplier));
    }
  }, []);
  
  // 🆕 **OPTIMIZED ANIMATION LOOP** - sử dụng ref để access latest config
  const startFadeAnimation = useCallback((audioElement) => {
    if (isAnimatingRef.current) {
      return;
    }
    
    if (!gainNodeRef.current) {
      return;
    }
    
    isAnimatingRef.current = true;
    currentAudioElementRef.current = audioElement; // 🆕 Store audio element reference
    
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
        if (isAnimatingRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
        return;
      }
      
      // 🎯 **GET CURRENT TIME** với fallback
      const currentTime = currentAudioElement.currentTime || 0;
      
      // 🆕 **USE LATEST CONFIG** từ ref thay vì closure
      const latestConfig = fadeConfigRef.current;
      
      // 🔧 **ENHANCED DEBUG CONFIG USAGE**: Log config usage more frequently khi có changes
      const configChangeDetected = Math.random() < 0.1 || // 10% sampling
        (latestConfig.fadeIn !== debugStateRef.current.lastFadeIn) || 
        (latestConfig.fadeOut !== debugStateRef.current.lastFadeOut);
        
      if (configChangeDetected) {

        
        // 🆕 **UPDATE DEBUG STATE**: Track last seen config
        debugStateRef.current.lastFadeIn = latestConfig.fadeIn;
        debugStateRef.current.lastFadeOut = latestConfig.fadeOut;
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
            }
          } else {
            gainNodeRef.current.gain.value = targetGain;
            debugStateRef.current.lastGainValue = targetGain;
          }
        }
      } catch (gainError) {
      }
      
      // 🆕 **ENHANCED ANIMATION CONTINUATION**: Continue animation nếu audio đang play, không chỉ dựa vào fade config
      const shouldContinueAnimation = isAnimatingRef.current && currentAudioElement && (
        latestConfig.isActive || // Continue if fade is active
        (!currentAudioElement.paused && currentAudioElement.currentTime >= 0) // OR if audio is playing (để ready cho fade activation)
      );
      
      if (shouldContinueAnimation) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {

        isAnimatingRef.current = false;
        animationFrameRef.current = null;
        currentAudioElementRef.current = null; // 🆕 Clear audio element ref
      }
    };
    
    // 🚀 **START ANIMATION**
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [calculateFadeMultiplier]);
  
  // 🎯 **STOP FADE ANIMATION** với better cleanup
  const stopFadeAnimation = useCallback(() => {
    
    isAnimatingRef.current = false;
    currentAudioElementRef.current = null; // 🆕 Clear audio element ref
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
          }
        }, 10); // 100ms total reset time
      } else {
        gainNodeRef.current.gain.value = 1.0;
      }
      
      debugStateRef.current.lastGainValue = 1.0;
    }
  }, []);
  
  // 🆕 **REAL-TIME CONFIG UPDATE** - instant update với enhanced animation restart
  const updateFadeConfig = useCallback((newConfig) => {
    const { fadeIn, fadeOut, startTime, endTime, isInverted = false, duration = 0 } = newConfig;
    const isActive = (fadeIn > 0 || fadeOut > 0) && startTime < endTime;
    
    // 🔍 **DEBUG FADE CONFIG UPDATE**: Log khi fadeOut thay đổi trong invert mode
    if (isInverted && fadeOut > 0) {
      console.log(`🔥 [INVERT-FADEOUT-CONFIG] Config updated: fadeOut=${fadeOut.toFixed(1)}s, duration=${duration.toFixed(1)}s, activeRegion=[${endTime.toFixed(2)}s-${duration.toFixed(2)}s]`);
    }
    
    // 🔍 **DETECT CONFIG CHANGES**: Track previous state để detect activation
    const wasActive = fadeConfigRef.current.isActive;
    const becameActive = !wasActive && isActive; // 🆕 **ACTIVATION DETECTION**
    
    const updatedConfig = {
      fadeIn,
      fadeOut, 
      startTime,
      endTime,
      isActive,
      isInverted, // 🆕 **INVERT MODE**: Include invert mode in config
      duration // 🆕 **DURATION**: Include duration for correct invert mode fadeout
    };
    
    // 🔥 **IMMEDIATE REF UPDATE**: Update ref TRƯỚC state để animation loop ngay lập tức thấy config mới
    fadeConfigRef.current = updatedConfig;
    
    // 🚀 **INSTANT STATE UPDATE**: Update state sau để trigger re-renders
    setFadeConfig(updatedConfig);
    
    // 🎯 **ENHANCED REAL-TIME APPLY**: Nếu đang play, apply config changes ngay lập tức
    if (isAnimatingRef.current && gainNodeRef.current && currentAudioElementRef.current) {
      const currentTime = currentAudioElementRef.current.currentTime;
      
      // 🔥 **INSTANT GAIN CALCULATION**: Tính toán gain ngay lập tức cho position hiện tại
      const newGainValue = calculateFadeMultiplier(currentTime, updatedConfig);
      
      // 🚀 **IMMEDIATE GAIN UPDATE**: Apply gain ngay lập tức
      try {
        gainNodeRef.current.gain.value = newGainValue;
        debugStateRef.current.lastGainValue = newGainValue;
        
      } catch (error) {
      }
    }
    
    // 🆕 **CRITICAL FIX**: Restart animation if config becomes active và audio đang play
    if (becameActive && currentAudioElementRef.current && !isAnimatingRef.current) {
      const audioElement = currentAudioElementRef.current;
      
      // 🔍 **CHECK IF AUDIO IS PLAYING**: Verify audio is actually playing
      const isAudioPlaying = audioElement && !audioElement.paused && audioElement.currentTime > 0;
      
      if (isAudioPlaying && connectionStateRef.current === 'connected') {
        startFadeAnimation(audioElement);
      } else {
        
      }
    }
    
    
    // 🔄 **SMART GAIN RESET** - chỉ reset khi fade effects được disable
    if (!isActive && gainNodeRef.current && gainNodeRef.current.gain) {
      gainNodeRef.current.gain.value = 1.0;
      debugStateRef.current.lastGainValue = 1.0;
    }
  }, [calculateFadeMultiplier, startFadeAnimation]);
  
  // 🆕 **SYNC CONFIG REF** - đảm bảo ref luôn sync với state
  useEffect(() => {
    fadeConfigRef.current = fadeConfig;
  }, [fadeConfig]);
  
  // 🎯 **CONNECT AUDIO ELEMENT** với retry logic
  const connectAudioElement = useCallback(async (audioElement) => {
    if (!audioElement) {
      return false;
    }
    
    
    // 🆕 **RETRY LOGIC** cho connection failures
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const success = await initializeWebAudio(audioElement);
      if (success) {
        return true;
      }
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return false;
  }, [initializeWebAudio]);
  
  // 🆕 **ENHANCED FADE ACTIVE CONTROL** với real-time config support
  const setFadeActive = useCallback((isPlaying, audioElement) => {
   
    
    if (isPlaying && connectionStateRef.current === 'connected') {
      if (!isAnimatingRef.current) {
        startFadeAnimation(audioElement);
      } else {
        // 🆕 **ENSURE CONTINUOUS ANIMATION**: Verify animation is still running với latest config
        currentAudioElementRef.current = audioElement; // Update audio element reference
      }
    } else {
      if (isAnimatingRef.current) {
        stopFadeAnimation();
      }
    }
  }, [startFadeAnimation, stopFadeAnimation]);
  
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

  }, [getConnectionDebugInfo]);
  
  // 🆕 **GLOBAL DEBUG UTILITY**: Expose debug function to window for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugRealTimeFade = logRealTimeState;
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
      
      // Stop animation
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
        }).catch(err => {
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