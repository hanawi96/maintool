import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  validateAudioFile, getAudioErrorMessage, getFormatDisplayName, 
  generateCompatibilityReport, createSafeAudioURL, validateAudioURL 
} from '../utils/audioUtils';
import { createInteractionManager } from '../utils/interactionUtils';
import { getAutoReturnSetting } from '../utils/safeStorage';

import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useEnhancedWaveform } from '../hooks/useEnhancedWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useRealTimeFadeEffects } from '../hooks/useRealTimeFadeEffects';
import { useInteractionHandlers } from '../hooks/useInteractionHandlers';
import { useTimeChangeHandlers } from '../hooks/useTimeChangeHandlers';
import { usePitchShift } from '../hooks/usePitchShift';

import { 
  useProgressivePreloader, useNetworkAwarePreloader, 
  useMemoryAwarePreloader, useInteractionPreloader 
} from '../../../hooks/useAdvancedPreloader';

import { 
  useWebWorkerPreloader, useIdleCallbackPreloader, useAdvancedComponentCache 
} from '../../../hooks/usePhase3OptimizationStable';

import FileInfo from './FileInfo';
import AudioErrorAlert from './ErrorAlert/AudioErrorAlert';
import ConnectionErrorAlert from './ErrorAlert/ConnectionErrorAlert';
import FileUploadSection from './FileUploadSection';

import { 
  SmartWaveformLazy, FadeControlsLazy, ExportPanelLazy, 
  UnifiedControlBarLazy, preloadHeavyComponents 
} from '../../../components/LazyComponents';

const SafeAudioElement = React.memo(({
  audioRef, audioFile, onError, onLoadStart, onCanPlay, onLoadedMetadata
}) => {
  const urlValidation = useMemo(
    () => (audioFile?.url ? validateAudioURL(audioFile.url) : { valid: false }), 
    [audioFile?.url]
  );
  if (!audioFile?.url || !urlValidation.valid) return null;
  return (
    <audio 
      ref={audioRef} 
      preload="metadata"
      src={audioFile.url}
      style={{ display: 'none' }}
      onError={onError}
      onLoadStart={onLoadStart}
      onCanPlay={onCanPlay}
      onLoadedMetadata={onLoadedMetadata}
    />
  );
});
SafeAudioElement.displayName = 'SafeAudioElement';

function shouldPauseAtEndTime(currentTime, endTime, duration, canvasRef) {
  const canvas = canvasRef?.current;
  if (!canvas || !duration || duration <= 0) return currentTime >= endTime;
  const canvasWidth = canvas.width || 640;
  const handleW = canvasWidth < 640 ? 6 : 8;
  const availW = canvasWidth - 2 * handleW;
  const tpp = duration / availW;
  const offset = 0.5 * tpp;
  const threshold = Math.max(endTime - offset - tpp * 0.25, endTime - 0.001);
  return currentTime >= threshold;
}

function useAudioEventHandlers({
  audioRef, audioFile, setDuration, setEndTime, setCurrentTime,
  setIsPlaying, setAudioError, jumpToTime, startTime, isInverted, fileValidation
}) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) return;
    const onLoadedMetadata = () => {
      const d = audio.duration;
      setAudioError(null);
      if (window.requestIdleCallback)
        window.requestIdleCallback(() => { setDuration(d); setEndTime(d); });
      else setTimeout(() => { setDuration(d); setEndTime(d); }, 0);
    };    const onEnded = () => {
      const autoReturn = getAutoReturnSetting();
      if (isInverted) {
        if (autoReturn) {
          jumpToTime(0);
          audio.play?.();
        } else {
          setIsPlaying(false); setCurrentTime(audio.duration);
        }
      } else {
        if (autoReturn) {
          jumpToTime(startTime);
          audio.play?.();
        } else {
          setIsPlaying(false); jumpToTime(startTime);
        }
      }
    };
    const onPlay = () => setTimeout(() => setIsPlaying(true), 16);
    const onPause = () => setTimeout(() => setIsPlaying(false), 16);
    const onError = e => {
      const error = e.target.error;
      const filename = audioFile?.name || 'audio file';
      const details = getAudioErrorMessage(error, filename);
      setAudioError({
        type: 'playback',
        title: details.title,
        message: details.message,
        suggestion: details.suggestion,
        code: details.code,
        filename: details.filename,
        supportedFormats: details.supportedFormats,
        compatibilityInfo: fileValidation?.info?.browserSupport,
        detectedFormat: fileValidation?.info?.detectedMimeType ? 
          getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
      });
      if (window.requestIdleCallback)
        window.requestIdleCallback(() => setIsPlaying(false));
      else setTimeout(() => setIsPlaying(false), 0);
    };
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [
    audioFile?.name, audioFile?.url, audioRef, setCurrentTime, setDuration, setIsPlaying,
    setEndTime, fileValidation, setAudioError, jumpToTime, startTime, isInverted
  ]);
}

function useSmartFadeConfigSync({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig }) {
  const synced = useRef({});
  useEffect(() => {
    if (!synced.current || synced.current.startTime !== startTime || synced.current.endTime !== endTime) {
      updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted, duration });
      synced.current = { startTime, endTime };
    }
  }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig, isInverted, duration]);
}

function useSmartPreloader(audioFile, waveformData) {
  const { triggerPreload } = useProgressivePreloader();
  const { shouldPreload: netPreload } = useNetworkAwarePreloader();
  const { shouldPreload: memPreload } = useMemoryAwarePreloader();
  const { trackInteraction } = useInteractionPreloader();  useEffect(() => {
    if (audioFile && netPreload('large') && memPreload() !== false) {
      triggerPreload('fileLoad'); preloadHeavyComponents();
    }
  }, [audioFile, netPreload, memPreload, triggerPreload]);
  useEffect(() => {
    if (waveformData.length > 0) triggerPreload('waveformReady');
  }, [waveformData.length, triggerPreload]);
  const handleUserInteraction = useCallback((type) => {
    trackInteraction(type); triggerPreload('userInteraction');
  }, [trackInteraction, triggerPreload]);
  return { handleUserInteraction };
}

const MP3CutterMain = React.memo(() => {
  const { audioFile, uploadFile, isUploading, uploadError, testConnection, uploadProgress } = useFileUpload();
  const {
    isPlaying, currentTime, duration, volume, playbackRate,
    togglePlayPause, jumpToTime, updateVolume, updatePlaybackRate,
    audioRef, setCurrentTime, setDuration, setIsPlaying, setMasterVolumeSetter
  } = useAudioPlayer();
  
  // Pitch shift hook (no longer creates its own audio context)
  const { pitchValue, updatePitch } = usePitchShift();

  const {
    waveformData, startTime, endTime, isDragging, hoveredHandle, generateWaveform,
    setStartTime, setEndTime, setIsDragging, setHoveredHandle, canvasRef, isGenerating, enhancedFeatures
  } = useEnhancedWaveform();
  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();  const { 
    connectAudioElement, updateFadeConfig, setFadeActive, isWebAudioSupported,
    setPitchValue,
    audioContext: fadeAudioContext, isConnected: audioConnected,
    setMasterVolume,
    updateEqualizerBand, updateEqualizerValues, resetEqualizer, isEqualizerConnected, getEqualizerState
  } = useRealTimeFadeEffects();
  const { isReady: isWorkerReady, isSupported: isWorkerSupported, metrics: workerMetrics, preloadCriticalComponents } = useWebWorkerPreloader();
  const { scheduleIdlePreload } = useIdleCallbackPreloader();
  const { addToCache: addComponentToCache } = useAdvancedComponentCache();
  const [fadeIn, setFadeIn] = useState(0), [fadeOut, setFadeOut] = useState(0);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [isConnected, setIsConnected] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [compatibilityReport, setCompatibilityReport] = useState(null);
  const [isInverted, setIsInverted] = useState(false);
  
  // 🎚️ Add local state to track current equalizer values for immediate visual feedback
  const [currentEqualizerValues, setCurrentEqualizerValues] = useState(Array(10).fill(0));
  const animationRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);
  const enhancedHandlersRef = useRef({});
  const historySavedRef = useRef(false);
  const audioContext = useMemo(() => ({
    audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig
  }), [audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig]);

  const { handleStartTimeChange: originalHandleStartTimeChange, handleEndTimeChange: originalHandleEndTimeChange, saveHistoryNow, cleanup: cleanupTimeHandlers } = useTimeChangeHandlers({
    startTime, endTime, duration, fadeIn, fadeOut, setStartTime, setEndTime, saveState, historySavedRef, isDragging
  });
  const {
    handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasMouseLeave  } = useInteractionHandlers({
    canvasRef, duration, startTime, endTime, audioRef, isPlaying, fadeIn, fadeOut,
    isDragging, setStartTime, setEndTime, setIsDragging, setHoveredHandle, setCurrentTime,
    handleStartTimeChange: t => (enhancedHandlersRef.current.handleStartTimeChange ? enhancedHandlersRef.current.handleStartTimeChange(t) : setStartTime(t)),
    handleEndTimeChange: t => (enhancedHandlersRef.current.handleEndTimeChange ? enhancedHandlersRef.current.handleEndTimeChange(t) : setEndTime(t)),
    jumpToTime, saveState, saveHistoryNow, historySavedRef, interactionManagerRef, audioContext
  });

  const handleStartTimeChange = useCallback((newStartTime) => {
    originalHandleStartTimeChange(newStartTime);
    jumpToTime(isInverted ? Math.max(0, newStartTime - 3) : newStartTime);
  }, [originalHandleStartTimeChange, jumpToTime, isInverted]);
  const handleEndTimeChange = useCallback((newEndTime) => {
    originalHandleEndTimeChange(newEndTime);
    if (!isDragging) jumpToTime(isInverted ? Math.max(0, startTime - 3) : Math.max(startTime, newEndTime - 3));
  }, [originalHandleEndTimeChange, jumpToTime, startTime, isInverted, isDragging]);
  useEffect(() => {
    enhancedHandlersRef.current.handleStartTimeChange = handleStartTimeChange;
    enhancedHandlersRef.current.handleEndTimeChange = handleEndTimeChange;
  }, [handleStartTimeChange, handleEndTimeChange]);

  useEffect(() => {
    if (!interactionManagerRef.current) interactionManagerRef.current = createInteractionManager();
    return () => { if (cleanupTimeHandlers) cleanupTimeHandlers(); };
  }, [cleanupTimeHandlers]);
  useEffect(() => setCompatibilityReport(generateCompatibilityReport()), []);
  useEffect(() => { testConnection().then(c => { setIsConnected(c); setConnectionError(null); }).catch(() => { setIsConnected(false); setConnectionError('Backend server is not available.'); }); }, [testConnection]);

  const handleFileUpload = useCallback(async (file) => {
    window.lastFileUploadTime = Date.now();
    setAudioError(null); setFileValidation(null); setIsInverted(false); window.preventInvertStateRestore = true;
    setTimeout(() => { window.preventInvertStateRestore = false; }, 10000);
    window.currentAudioFile = file;
    try {
      const validation = validateAudioFile(file);
      setFileValidation(validation);
      if (!validation.valid) {
        setAudioError({ type: 'validation', title: 'File Validation Failed', message: validation.errors.join('; '), suggestions: ['Convert to MP3 or WAV format', 'Check if file is corrupted', 'Try a smaller file size'], supportedFormats: ['MP3', 'WAV', 'M4A', 'MP4'] }); return;
      }
      if (isConnected === false) {
        const connected = await testConnection();
        if (!connected) throw new Error('Backend server is not available.');
        setIsConnected(true); setConnectionError(null);
      }
      await uploadFile(file);
      const immediateAudioUrl = createSafeAudioURL(file);
      if (!immediateAudioUrl) throw new Error('Failed to create audio URL');
      if (audioRef.current) {
        audioRef.current.src = immediateAudioUrl;
        audioRef.current.load();
        setAudioError(null);
      }
      const waveformResult = await generateWaveform(file);
      const audioDuration = waveformResult.duration || audioRef.current?.duration || duration || 0;
      if (audioDuration > 0) saveState({ startTime: 0, endTime: audioDuration, fadeIn: 0, fadeOut: 0, isInverted: false });
    } catch (error) {
      setAudioError({ type: 'upload', title: 'Upload Failed', message: error.message, suggestions: ['Check your internet connection', 'Try a different file', 'Restart the backend server'] });
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) return;
    if (interactionManagerRef.current) interactionManagerRef.current.reset();
    setAudioError(null);
  }, [audioFile?.url, audioFile?.name, audioRef, setAudioError]);
  useEffect(() => { animationRef.current = { isPlaying, startTime, endTime }; }, [isPlaying, startTime, endTime]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url || !isWebAudioSupported) return;
    
    const t = setTimeout(() => {
      console.log('🔌 Attempting Web Audio connection...');
      connectAudioElement(audio).then((connected) => {
        console.log('🔌 Web Audio connection result:', connected);
        console.log('🎚️ Equalizer connected:', isEqualizerConnected);
        console.log('🔍 Audio context exists:', !!fadeAudioContext);
        console.log('🔍 Connection state after attempt:', {
          connected,
          audioConnected,
          isEqualizerConnected,
          fadeAudioContext: !!fadeAudioContext,
          audioSrc: audio?.src,
          audioElement: !!audio
        });
        
        // Initialize master volume system after Web Audio is connected
        if (setMasterVolumeSetter && setMasterVolume) {
          setMasterVolumeSetter(setMasterVolume);
          setMasterVolume(volume);
          console.log('🔊 Master volume system connected, initial volume:', volume);
        }
      });
    }, 100);
    return () => clearTimeout(t);
  }, [audioFile?.url, audioRef, connectAudioElement, isWebAudioSupported, setMasterVolumeSetter, setMasterVolume, volume]);
  
  // 🎵 Modern pitch change handler - zero audio interruption (like speed)
  const handlePitchChange = useCallback((newPitch) => {
    console.log(`🎵 Main: handlePitchChange called: ${newPitch}st`);
    
    // Update pitch state first
    updatePitch(newPitch);
    
    // Update persistent pitch node parameters (zero interruption)
    if (setPitchValue(newPitch)) {
      console.log(`✅ Main: Pitch updated to ${newPitch}st (zero interruption)`);
    } else {
      console.log('🎵 Main: Pitch will be applied when audio connects');
    }
  }, [updatePitch, setPitchValue]);
  
  // 🎵 Apply pending pitch when audio connection is established
  useEffect(() => {
    const canApplyPitch = fadeAudioContext && (audioConnected || isEqualizerConnected);
    if (canApplyPitch && pitchValue !== 0) {
      console.log('🎵 Main: Audio connected - applying pending pitch value:', pitchValue);
      setPitchValue(pitchValue);
    }
  }, [fadeAudioContext, audioConnected, isEqualizerConnected, pitchValue, setPitchValue]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    setFadeActive(isPlaying, audio);
  }, [isPlaying, audioRef, setFadeActive, isWebAudioSupported]);

  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setStartTime(prevState.startTime); setEndTime(prevState.endTime); setFadeIn(prevState.fadeIn); setFadeOut(prevState.fadeOut);
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? prevState.isInverted : false);
      jumpToTime(prevState.startTime);
    }
  }, [undo, setStartTime, setEndTime, jumpToTime]);
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setStartTime(nextState.startTime); setEndTime(nextState.endTime); setFadeIn(nextState.fadeIn); setFadeOut(nextState.fadeOut);
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? nextState.isInverted : false);
      jumpToTime(nextState.startTime);
    }
  }, [redo, setStartTime, setEndTime, jumpToTime]);

  const handleJumpToStart = useCallback(() => jumpToTime(startTime), [jumpToTime, startTime]);
  const handleJumpToEnd = useCallback(() => jumpToTime(endTime), [jumpToTime, endTime]);

  const updateFade = useCallback((type, value) => {
    if (type === 'in') setFadeIn(value); else setFadeOut(value);
    updateFadeConfig({ fadeIn: type === 'in' ? value : fadeIn, fadeOut: type === 'out' ? value : fadeOut, startTime, endTime, isInverted, duration });
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig]);

  const handleFadeInChange = useCallback(newFadeIn => updateFade('in', newFadeIn), [updateFade]);
  const handleFadeOutChange = useCallback(newFadeOut => updateFade('out', newFadeOut), [updateFade]);
  const handleFadeInDragEnd = useCallback(finalFadeIn => saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted }), [startTime, endTime, fadeOut, saveState, isInverted]);
  const handleFadeOutDragEnd = useCallback(finalFadeOut => saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted }), [startTime, endTime, fadeIn, saveState, isInverted]);
  const handleFadeInToggle = useCallback(() => { const v = fadeIn > 0 ? 0 : 3.0; updateFade('in', v); saveState({ startTime, endTime, fadeIn: v, fadeOut, isInverted }); }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);
  const handleFadeOutToggle = useCallback(() => { const v = fadeOut > 0 ? 0 : 3.0; updateFade('out', v); saveState({ startTime, endTime, fadeIn, fadeOut: v, isInverted }); }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);
  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => { setFadeIn(newFadeIn); setFadeOut(newFadeOut); updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration }); saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted }); }, [startTime, endTime, updateFadeConfig, saveState, isInverted, duration]);

  const handleDrop = useCallback((e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleFileUpload(files[0]); }, [handleFileUpload]);

  useEffect(() => { animationRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useAudioEventHandlers({ audioRef, audioFile, setDuration, setEndTime, setCurrentTime, setIsPlaying, setAudioError, jumpToTime, startTime, isInverted, fileValidation });
  useEffect(() => {
    let animationId;
    const updateCursor = () => {
      if (isPlaying && audioRef.current) {
        const t = audioRef.current.currentTime;
        const autoReturn = getAutoReturnSetting();
        
        if (isInverted && t >= startTime && t < endTime) {
          audioRef.current.currentTime = endTime; 
          setCurrentTime(endTime);
        } else if (!isInverted && shouldPauseAtEndTime(t, endTime, duration, canvasRef)) {
          audioRef.current.pause(); 
          setIsPlaying(false); 
          if (autoReturn) {
            setTimeout(() => {
              jumpToTime(startTime);
              audioRef.current?.play?.();
            }, 50);
          } else {
            jumpToTime(startTime);
          }
        } else {
          setCurrentTime(t);
        }
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    if (isPlaying && audioRef.current) animationId = requestAnimationFrame(updateCursor);
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying, isInverted, jumpToTime, duration, canvasRef]);

  useSmartFadeConfigSync({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig });

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const d = audio.duration;
    setAudioError(null);
    if (window.requestIdleCallback)
      window.requestIdleCallback(() => { setDuration(d); setEndTime(d); });
    else setTimeout(() => { setDuration(d); setEndTime(d); }, 0);
  }, [audioRef, setAudioError, setDuration, setEndTime]);
  const handleCanPlay = useCallback(() => {}, []);
  const handleError = useCallback((e) => {
    const error = e.target.error;
    const filename = audioFile?.name || 'audio file';
    const details = getAudioErrorMessage(error, filename);
    setAudioError({
      type: 'playback',
      title: details.title,
      message: details.message,
      suggestion: details.suggestion,
      code: details.code,
      filename: details.filename,
      supportedFormats: details.supportedFormats,
      compatibilityInfo: fileValidation?.info?.browserSupport,
      detectedFormat: fileValidation?.info?.detectedMimeType ? 
        getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
    });
    if (window.requestIdleCallback)
      window.requestIdleCallback(() => setIsPlaying(false));
    else setTimeout(() => setIsPlaying(false), 0);
  }, [audioFile?.name, fileValidation, setAudioError, setIsPlaying]);

  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    const newInvert = !isInverted;
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: newInvert });
    setIsInverted(newInvert);
    updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted: newInvert, duration });
    jumpToTime(newInvert ? (startTime >= 3 ? startTime - 3 : 0) : startTime);
  }, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime, updateFadeConfig]);

  const { handleUserInteraction } = useSmartPreloader(audioFile, waveformData);

  // Phase 3 optimization for web worker, caching, preloading
  useEffect(() => {
    if (isWorkerSupported && isWorkerReady) {
      preloadCriticalComponents();
    }
    if (audioFile) {
      scheduleIdlePreload(() => {});
    }
  }, [isWorkerSupported, isWorkerReady, audioFile, preloadCriticalComponents, scheduleIdlePreload]);
  useEffect(() => {
    if (isWorkerReady && workerMetrics.totalPreloaded > 0) {
      workerMetrics.loadedComponents.forEach(componentName => {
        setTimeout(() => {
          addComponentToCache(componentName, null, { source: 'webWorker', preloadTime: Date.now() });
        }, 0);
      });
    }
  }, [workerMetrics.totalPreloaded, workerMetrics.loadedComponents, isWorkerReady, addComponentToCache]);  // 🎚️ Add equalizer change handler for real-time updates
  const handleEqualizerChange = useCallback((type, data) => {
    console.log('🎚️ EQ Change Request:', { type, data, isConnected: isEqualizerConnected });
    
    if (!isEqualizerConnected) {
      console.warn('🚫 Equalizer not connected, ignoring change request');
      console.log('🔍 Debug EQ State:', {
        fadeAudioContext: !!fadeAudioContext,
        audioConnected,
        pitchValue
      });
      return;
    }

    switch (type) {
      case 'band':
        const { index, value } = data;
        updateEqualizerBand(index, value);
        // 🎚️ Update local state immediately for visual indicators
        setCurrentEqualizerValues(prev => {
          const newValues = [...prev];
          newValues[index] = value;
          return newValues;
        });
        console.log(`🎚️ EQ Band ${index}: ${value > 0 ? '+' : ''}${value.toFixed(1)}dB`);
        break;
      
      case 'preset':
        updateEqualizerValues(data.values);
        // 🎚️ Update local state immediately for visual indicators  
        setCurrentEqualizerValues([...data.values]);
        console.log('🎚️ EQ Preset applied:', data.name);
        break;
      
      case 'reset':
        resetEqualizer();
        // 🎚️ Update local state immediately for visual indicators
        setCurrentEqualizerValues(Array(10).fill(0));
        console.log('🎚️ EQ Reset');
        break;
      
      default:
        console.warn('⚠️ Unknown equalizer change type:', type);
    }
  }, [isEqualizerConnected, updateEqualizerBand, updateEqualizerValues, resetEqualizer, setCurrentEqualizerValues, fadeAudioContext, audioConnected, pitchValue]);

  // 🎚️ Function to get current equalizer state for export
  const getCurrentEqualizerState = useCallback(() => {
    // 🎚️ Prioritize local state for immediate visual feedback, fallback to Web Audio API values
    if (currentEqualizerValues.some(v => v !== 0)) {
      console.log('🎚️ Frontend EQ Export State (Local):', currentEqualizerValues);
      return currentEqualizerValues;
    }
    
    if (!isEqualizerConnected || !getEqualizerState) {
      console.log('🎚️ Frontend EQ Export State: No EQ data (not connected or no function)');
      return null;
    }
    const eqState = getEqualizerState();
    // Return just the gain values as an array for visual indicators and export
    const eqValues = eqState?.bands ? eqState.bands.map(band => band.gain) : null;
    console.log('🎚️ Frontend EQ Export State (Web Audio):', eqValues);
    return eqValues;
  }, [currentEqualizerValues, isEqualizerConnected, getEqualizerState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-6 py-6">
        <ConnectionErrorAlert connectionError={connectionError} uploadError={uploadError} onRetryConnection={() => testConnection()} />
        <AudioErrorAlert error={audioError} compatibilityReport={compatibilityReport} />
        {!audioFile ? (
          <FileUploadSection
            isConnected={isConnected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            compatibilityReport={compatibilityReport}
            onFileUpload={file => { handleUserInteraction('fileUpload'); handleFileUpload(file); }}
            onDrop={e => { handleUserInteraction('fileDrop'); handleDrop(e); }}
          />
        ) : (
          <div className="space-y-4">
            <div className="file-info-display">
              <FileInfo audioFile={audioFile} duration={duration} />
            </div>
            <SmartWaveformLazy
              canvasRef={canvasRef}
              waveformData={waveformData}
              currentTime={currentTime}
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              hoveredHandle={hoveredHandle}
              isDragging={isDragging}
              isPlaying={isPlaying}
              volume={volume}
              isGenerating={isGenerating}
              enhancedFeatures={enhancedFeatures}
              fadeIn={fadeIn}
              fadeOut={fadeOut}
              isInverted={isInverted}
              audioRef={audioRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />            <UnifiedControlBarLazy
              isPlaying={isPlaying}
              volume={volume}
              playbackRate={playbackRate}
              pitch={pitchValue}
              onTogglePlayPause={togglePlayPause}
              onJumpToStart={handleJumpToStart}
              onJumpToEnd={handleJumpToEnd}
              onVolumeChange={updateVolume}              onSpeedChange={updatePlaybackRate}
              onPitchChange={handlePitchChange}
              onEqualizerChange={handleEqualizerChange}
              equalizerState={getCurrentEqualizerState()} // 🎚️ Pass current EQ state for visual indicators
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
              onInvertSelection={handleInvertSelection}
              isInverted={isInverted}
              fadeIn={fadeIn}
              fadeOut={fadeOut}
              onFadeInToggle={handleFadeInToggle}
              onFadeOutToggle={handleFadeOutToggle}
              onFadeInChange={handleFadeInChange}
              onFadeOutChange={handleFadeOutChange}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              historyIndex={historyIndex}
              historyLength={historyLength}
              disabled={!audioFile}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="fade-controls">
                <FadeControlsLazy
                  fadeIn={fadeIn}
                  fadeOut={fadeOut}
                  maxDuration={duration}
                  onFadeInChange={handleFadeInChange}
                  onFadeOutChange={handleFadeOutChange}
                  onFadeInDragEnd={handleFadeInDragEnd}
                  onFadeOutDragEnd={handleFadeOutDragEnd}
                  onFadeInToggle={handleFadeInToggle}
                  onFadeOutToggle={handleFadeOutToggle}
                  onPresetApply={handlePresetApply}
                  disabled={!audioFile}
                />
              </div>
              <div className="export-controls">                <ExportPanelLazy
                  outputFormat={outputFormat}
                  onFormatChange={setOutputFormat}
                  audioFile={audioFile}
                  startTime={startTime}
                  endTime={endTime}
                  fadeIn={fadeIn}
                  fadeOut={fadeOut}
                  playbackRate={playbackRate}
                  pitch={pitchValue}
                  volume={volume} // 🎯 Pass volume prop
                  equalizer={getCurrentEqualizerState()} // 🎚️ Pass equalizer state
                  isInverted={isInverted}
                  normalizeVolume={normalizeVolume}
                  onNormalizeVolumeChange={setNormalizeVolume}
                  disabled={!audioFile}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <SafeAudioElement
        audioRef={audioRef}
        audioFile={audioFile}
        onError={handleError}
        onLoadStart={handleCanPlay}
        onCanPlay={handleCanPlay}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
});

MP3CutterMain.displayName = 'MP3CutterMain';
export default MP3CutterMain;
