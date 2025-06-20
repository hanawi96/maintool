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
    togglePlayPause: originalTogglePlayPause, jumpToTime, updateVolume, updatePlaybackRate,
    audioRef, setCurrentTime, setDuration, setIsPlaying, setMasterVolumeSetter
  } = useAudioPlayer();
  
  // Pitch shift hook (no longer creates its own audio context)
  const { pitchValue, updatePitch } = usePitchShift();

  const {
    waveformData, startTime, endTime, isDragging, hoveredHandle, generateWaveform,
    setStartTime, setEndTime, setIsDragging, setHoveredHandle, canvasRef, isGenerating, enhancedFeatures
  } = useEnhancedWaveform();
  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();  const { 
    connectAudioElement, disconnectAudioElement, updateFadeConfig, setFadeActive, isWebAudioSupported,
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
  const [compatibilityReport, setCompatibilityReport] = useState(null);  const [isInverted, setIsInverted] = useState(false);
    // 🆕 Regions management state
  const [regions, setRegions] = useState([]);
  const [activeRegionId, setActiveRegionId] = useState(null);
  const [draggingRegion, setDraggingRegion] = useState(null); // {regionId, handleType, startPos}
  
  // 🆕 Play All Regions state
  const [isPlayAllMode, setIsPlayAllMode] = useState(false);
  const [playAllIndex, setPlayAllIndex] = useState(0);
  
  // 🔧 Debounce flag to prevent duplicate activeRegionId changes
  const activeRegionChangeRef = useRef(null);
  
  // 🔧 Debounced setActiveRegionId to prevent race conditions
  const setActiveRegionIdDebounced = useCallback((newRegionId, source = 'unknown') => {
    // 🎯 **IMMEDIATE SET FOR ADD REGION**: No delay when adding new regions to prevent handle color flash
    if (source === 'addRegion') {
      setActiveRegionId(newRegionId);
      return;
    }
    
    // Clear any pending change
    if (activeRegionChangeRef.current) {
      clearTimeout(activeRegionChangeRef.current);
    }
    
    // Set debounced change for other cases
    activeRegionChangeRef.current = setTimeout(() => {
      setActiveRegionId(newRegionId);
      activeRegionChangeRef.current = null;
    }, 1); // Very short delay to batch multiple calls
  }, [activeRegionId]);
  
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
    jumpToTime, saveState, saveHistoryNow, historySavedRef, interactionManagerRef, audioContext,
    // 🆕 Region props for endpoint jumping
    regions,
    activeRegionId,
    onRegionUpdate: (regionId, newStart, newEnd) => {
      setRegions(prev => prev.map(r => 
        r.id === regionId ? { ...r, start: newStart, end: newEnd } : r
      ));
    }
  });

  // 🆕 Helper function to calculate safe boundaries for main selection handles
  const getMainSelectionBoundaries = useCallback((handleType, currentStartTime, currentEndTime, regions) => {
    if (regions.length === 0) {
      // No regions, use normal boundaries
      return {
        min: handleType === 'start' ? 0 : currentStartTime + 0.1,
        max: handleType === 'start' ? currentEndTime - 0.1 : duration
      };
    }

    // Get all region boundaries
    const regionBoundaries = regions.map(r => ({ start: r.start, end: r.end }));
    regionBoundaries.sort((a, b) => a.start - b.start);

    if (handleType === 'start') {
      // For start handle, find the nearest region end that's before current start
      let maxStart = 0;
      for (const region of regionBoundaries) {
        if (region.end <= currentStartTime) {
          maxStart = Math.max(maxStart, region.end);
        }
      }
      
      // For start handle, we only need to respect the maximum boundary (currentEndTime - 0.1)
      // The minimum should only be limited by regions that are actually behind it
      return { min: maxStart, max: currentEndTime - 0.1 };
    } else {
      // For end handle, find the nearest region start that's after current end
      let minEnd = duration;
      for (const region of regionBoundaries) {
        if (region.start >= currentEndTime) {
          minEnd = Math.min(minEnd, region.start);
        }
      }
      
      // For end handle, we only need to respect the minimum boundary (currentStartTime + 0.1)
      // The maximum should only be limited by regions that are actually in front of it
      const result = { min: currentStartTime + 0.1, max: minEnd };
      
      return result;
    }
  }, [duration]);

  const handleStartTimeChange = useCallback((newStartTime) => {
    // 🆕 Set main region active when dragging main handles  
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    // 🔧 Apply collision detection with regions
    const boundaries = getMainSelectionBoundaries('start', startTime, endTime, regions);
    const safeStartTime = Math.max(boundaries.min, Math.min(newStartTime, boundaries.max));
    
    originalHandleStartTimeChange(safeStartTime);
    jumpToTime(isInverted ? Math.max(0, safeStartTime - 3) : safeStartTime);
  }, [originalHandleStartTimeChange, jumpToTime, isInverted, getMainSelectionBoundaries, startTime, endTime, regions, setActiveRegionIdDebounced]);

  const handleEndTimeChange = useCallback((newEndTime) => {
    // 🆕 Set main region active when dragging main handles
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    // 🔧 Apply collision detection with regions
    const boundaries = getMainSelectionBoundaries('end', startTime, endTime, regions);
    const safeEndTime = Math.max(boundaries.min, Math.min(newEndTime, boundaries.max));
    
    originalHandleEndTimeChange(safeEndTime);
    if (!isDragging) jumpToTime(isInverted ? Math.max(0, startTime - 3) : Math.max(startTime, safeEndTime - 3));
  }, [originalHandleEndTimeChange, isDragging, jumpToTime, isInverted, startTime, getMainSelectionBoundaries, endTime, regions, setActiveRegionIdDebounced]);

  useEffect(() => {
    enhancedHandlersRef.current.handleStartTimeChange = handleStartTimeChange;
    enhancedHandlersRef.current.handleEndTimeChange = handleEndTimeChange;
  }, [handleStartTimeChange, handleEndTimeChange]);

  useEffect(() => {
    if (!interactionManagerRef.current) interactionManagerRef.current = createInteractionManager();
    
    // 🆕 Set collision detection function
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setCollisionDetection((handleType, newTime, currentStartTime, currentEndTime) => {
        const boundaries = getMainSelectionBoundaries(handleType, currentStartTime, currentEndTime, regions);
        const result = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
        
        return result;
      });
    }
    
    return () => { if (cleanupTimeHandlers) cleanupTimeHandlers(); };
  }, [cleanupTimeHandlers, getMainSelectionBoundaries, regions]);
  useEffect(() => setCompatibilityReport(generateCompatibilityReport()), []);
  useEffect(() => { testConnection().then(c => { setIsConnected(c); setConnectionError(null); }).catch(() => { setIsConnected(false); setConnectionError('Backend server is not available.'); }); }, [testConnection]);

  const handleFileUpload = useCallback(async (file) => {
    window.lastFileUploadTime = Date.now();
    setAudioError(null); setFileValidation(null); setIsInverted(false); window.preventInvertStateRestore = true;
    setTimeout(() => { window.preventInvertStateRestore = false; }, 10000);
    window.currentAudioFile = file;
    
    // 🆕 Clear existing regions when uploading new file
    setRegions([]);
    setActiveRegionIdDebounced(null, 'fileUpload');
    
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
      if (audioDuration > 0) {
        saveState({ startTime: 0, endTime: audioDuration, fadeIn: 0, fadeOut: 0, isInverted: false });
        
        // 🆕 Don't create default region - just use main selection as visual default
        console.log('🎵 File loaded, main selection covers entire track:', { start: 0, end: audioDuration });
      }
    } catch (error) {
      setAudioError({ type: 'upload', title: 'Upload Failed', message: error.message, suggestions: ['Check your internet connection', 'Try a different file', 'Restart the backend server'] });
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) {
      // Disconnect Web Audio when no audio file
      if (audioConnected) {
        console.log('🔌 Disconnecting Web Audio - no audio file');
        disconnectAudioElement();
      }
      return;
    }
    if (interactionManagerRef.current) interactionManagerRef.current.reset();
    setAudioError(null);
  }, [audioFile?.url, audioFile?.name, audioRef, setAudioError, audioConnected, disconnectAudioElement]);
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
  }, [audioFile?.url, audioRef, connectAudioElement, disconnectAudioElement, isWebAudioSupported, setMasterVolumeSetter, setMasterVolume, volume]);
  
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

  // 🆕 Helper function to get active playback boundaries
  const getActivePlaybackBoundaries = useCallback(() => {
    // If there's an active region, use its boundaries
    if (activeRegionId && regions.length > 0 && activeRegionId !== 'main') {
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion) {
        return {
          start: activeRegion.start,
          end: activeRegion.end,
          isRegion: true,
          regionName: activeRegion.name
        };
      }
    }
    
    // Fallback to main selection boundaries
    return {
      start: startTime,
      end: endTime,
      isRegion: false,
      regionName: 'Main Selection'
    };
  }, [activeRegionId, regions, startTime, endTime]);

  const handleJumpToStart = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.start);
  }, [jumpToTime, getActivePlaybackBoundaries]);
  
  const handleJumpToEnd = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.end);
  }, [jumpToTime, getActivePlaybackBoundaries]);

  const updateFade = useCallback((type, value) => {
    if (type === 'in') setFadeIn(value); else setFadeOut(value);
    updateFadeConfig({ fadeIn: type === 'in' ? value : fadeIn, fadeOut: type === 'out' ? value : fadeOut, startTime, endTime, isInverted, duration });
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig]);

  const handleFadeInChange = useCallback(newFadeIn => updateFade('in', newFadeIn), [updateFade]);
  const handleFadeOutChange = useCallback(newFadeOut => updateFade('out', newFadeOut), [updateFade]);
  const handleFadeInDragEnd = useCallback(finalFadeIn => saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted }), [startTime, endTime, fadeOut, saveState, isInverted]);
  const handleFadeOutDragEnd = useCallback(finalFadeOut => saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted }), [startTime, endTime, fadeIn, saveState, isInverted]);
  const handleFadeInToggle = useCallback(() => { const v = fadeIn > 0 ? 0 : 3.0; updateFade('in', v); saveState({ startTime, endTime, fadeIn: v, fadeOut, isInverted }); }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);
  const handleFadeOutToggle = useCallback(() => { const v = fadeOut > 0 ? 0 : 3.0; updateFade('out', v); saveState({ startTime, endTime, fadeIn, fadeOut: v, isInverted }); }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => { setFadeIn(newFadeIn); setFadeOut(newFadeOut); updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration }); saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted }); }, [startTime, endTime, updateFadeConfig, saveState, isInverted, duration]);

  // 🆕 Calculate available spaces between existing regions and main selection
  const calculateAvailableSpaces = useCallback(() => {
    if (duration <= 0) return [];
    
    // Collect occupied areas - always include both regions and main selection
    const occupiedAreas = [];
    
    // Add existing regions
    regions.forEach(region => {
      occupiedAreas.push({
        start: region.start,
        end: region.end,
        type: 'region',
        id: region.id
      });
    });
    
    // 🔧 Always add main selection as occupied area to prevent overlap
    if (startTime < endTime) {
      occupiedAreas.push({
        start: startTime,
        end: endTime,
        type: 'selection'
      });
    }
    
    // If no occupied areas, entire duration is available
    if (occupiedAreas.length === 0) {
      return [{
        start: 0,
        end: duration,
        length: duration
      }];
    }
    
    // Sort occupied areas by start time
    const sortedAreas = occupiedAreas.sort((a, b) => a.start - b.start);
    const spaces = [];
    
    // Space before first occupied area
    if (sortedAreas[0].start > 0) {
      spaces.push({
        start: 0,
        end: sortedAreas[0].start,
        length: sortedAreas[0].start
      });
    }
    
    // Spaces between occupied areas
    for (let i = 0; i < sortedAreas.length - 1; i++) {
      const currentEnd = sortedAreas[i].end;
      const nextStart = sortedAreas[i + 1].start;
      if (nextStart > currentEnd) {
        spaces.push({
          start: currentEnd,
          end: nextStart,
          length: nextStart - currentEnd
        });
      }
    }
    
    // Space after last occupied area
    const lastArea = sortedAreas[sortedAreas.length - 1];
    if (lastArea.end < duration) {
      spaces.push({
        start: lastArea.end,
        end: duration,
        length: duration - lastArea.end
      });
    }
    
    // Filter spaces >= 1 second
    const validSpaces = spaces.filter(space => space.length >= 1.0);
    
    return validSpaces;
  }, [regions, duration, startTime, endTime]);

  // 🆕 Check if can add new region
  const canAddNewRegion = useMemo(() => {
    const availableSpaces = calculateAvailableSpaces();
    const canAdd = availableSpaces.length > 0;
    return canAdd;
  }, [calculateAvailableSpaces]);

  // 🆕 Region management functions - Updated to use available spaces
  const generateRandomRegion = useCallback(() => {
    if (duration <= 0) return null;
    
    const availableSpaces = calculateAvailableSpaces();
    
    if (availableSpaces.length === 0) {
      console.log('🚫 No available spaces for new region');
      return null;
    }
    
    // Choose the largest available space
    const bestSpace = availableSpaces.reduce((best, current) => 
      current.length > best.length ? current : best
    );
    
    // Calculate region size (10-60% of available space, min 1s, max 30s)
    const minDuration = Math.max(1, bestSpace.length * 0.1);
    const maxDuration = Math.min(30, bestSpace.length * 0.6);
    const regionDuration = minDuration + Math.random() * (maxDuration - minDuration);
    
    // Random position within the space
    const maxStartPos = bestSpace.end - regionDuration;
    const regionStart = bestSpace.start + Math.random() * Math.max(0, maxStartPos - bestSpace.start);
    
    const newRegion = {
      id: Date.now() + Math.random(),
      start: Math.max(bestSpace.start, regionStart),
      end: Math.min(bestSpace.end, regionStart + regionDuration),
      name: `Region ${regions.length + 1}`
    };
    
    console.log('✨ Generated new region:', newRegion.name, `[${newRegion.start.toFixed(1)}s - ${newRegion.end.toFixed(1)}s]`);
    return newRegion;
  }, [duration, calculateAvailableSpaces, regions]);

  const handleAddRegion = useCallback(() => {
    if (!canAddNewRegion) {
      return;
    }
    
    const newRegion = generateRandomRegion();
    if (newRegion) {
      console.log('✅ Added new region:', newRegion.name);
      setRegions(prev => [...prev, newRegion]);
      setActiveRegionIdDebounced(newRegion.id, 'addRegion');
      
      // 🆕 Jump cursor to start point of new region immediately
      jumpToTime(newRegion.start);
      
      // 🔧 Remove auto-sync - don't change main selection when adding regions
    }
  }, [generateRandomRegion, canAddNewRegion, setActiveRegionIdDebounced, jumpToTime]);
  const handleDeleteRegion = useCallback(() => {
    console.log('🗑️ Delete region requested:', { 
      activeRegionId, 
      regionsCount: regions.length,
      regions: regions.map(r => ({ id: r.id, name: r.name }))
    });
    
    // Calculate total items (regions + main selection when exists)
    const mainSelectionExists = startTime < endTime && duration > 0;
    const totalItems = regions.length + (mainSelectionExists ? 1 : 0);
    
    // Only allow delete if total items > 1 (keep at least 1 item)
    if (totalItems > 1 && activeRegionId) {
      if (activeRegionId === 'main') {
        // Delete main selection by resetting it to full duration
        console.log('🗑️ Deleting main selection');
        setStartTime(0);
        setEndTime(duration);
        
        // Switch to first region if available
        if (regions.length > 0) {
          setActiveRegionIdDebounced(regions[0].id, 'deleteMainSelection');
          console.log('🎯 Switched to first region:', regions[0].name);
        } else {
          setActiveRegionIdDebounced(null, 'deleteMainSelection');
          console.log('🎯 No regions left, cleared active selection');
        }
      } else {
        // Delete specific region
        const targetRegion = regions.find(r => r.id === activeRegionId);
        console.log('🗑️ Deleting specific region:', targetRegion?.name);
        
        // 🔧 FIX: Calculate remaining BEFORE calling setRegions to avoid stale closure
        const remaining = regions.filter(r => r.id !== activeRegionId);
        
        setRegions(prev => prev.filter(r => r.id !== activeRegionId));
        
        // Switch to main selection or first remaining region
        if (mainSelectionExists) {
          setActiveRegionIdDebounced('main', 'deleteRegion');
          console.log('🎯 Switched to main selection');
        } else if (remaining.length > 0) {
          setActiveRegionIdDebounced(remaining[0].id, 'deleteRegion');
          console.log('🎯 Switched to remaining region:', remaining[0].name);
        } else {
          setActiveRegionIdDebounced(null, 'deleteRegion');
          console.log('🎯 No items left, cleared active selection');
        }
      }
    } else {
      console.log('🚫 Cannot delete - would leave no items or no active region');
    }
  }, [activeRegionId, regions, startTime, endTime, duration, setStartTime, setEndTime, setActiveRegionIdDebounced]);
  const handleClearAllRegions = useCallback(() => {
    setRegions([]);
    setActiveRegionIdDebounced(null, 'clearAllRegions');
  }, [setActiveRegionIdDebounced]);

  // 🆕 Play All Regions - Phát lần lượt tất cả regions + main selection theo thứ tự thời gian
  const handlePlayAllRegions = useCallback(() => {
    if (regions.length === 0 && (startTime >= endTime || duration <= 0)) return;
    
    // 🔧 Collect all playable items: main selection + regions
    const allPlayableItems = [];
    
    // Add main selection if it exists
    if (startTime < endTime && duration > 0) {
      allPlayableItems.push({
        id: 'main',
        start: startTime,
        end: endTime,
        name: 'Main Selection',
        type: 'main'
      });
    }
    
    // Add all regions
    regions.forEach(region => {
      allPlayableItems.push({
        ...region,
        type: 'region'
      });
    });
    
    if (allPlayableItems.length === 0) return;
    
    // Sắp xếp tất cả items theo thời gian start
    const sortedItems = allPlayableItems.sort((a, b) => a.start - b.start);
    
    console.log('🎵 Starting Play All (Main + Regions):', sortedItems.map(item => `${item.name} [${item.start.toFixed(1)}s-${item.end.toFixed(1)}s]`));
    
    // Set play all mode
    setIsPlayAllMode(true);
    setPlayAllIndex(0);
    
    // Jump đến start của item đầu tiên
    const firstItem = sortedItems[0];
    setActiveRegionIdDebounced(firstItem.id, 'playAllRegions');
    jumpToTime(firstItem.start);
    
    // Start playing
    if (!isPlaying) {
      setTimeout(() => {
        originalTogglePlayPause();
      }, 100); // Small delay để ensure jump đã hoàn thành
    }
  }, [regions, startTime, endTime, duration, setActiveRegionIdDebounced, jumpToTime, isPlaying, originalTogglePlayPause]);

  // 🆕 Helper function to calculate safe boundaries for region body dragging (entire region movement)
  const getRegionBodyBoundaries = useCallback((targetRegionId, regions, selectionStart, selectionEnd) => {
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    const regionDuration = targetRegion.end - targetRegion.start;
    const otherRegions = regions.filter(r => r.id !== targetRegionId);
    const allOccupiedAreas = [];
    
    // Add other regions as occupied areas
    otherRegions.forEach(region => {
      allOccupiedAreas.push({ start: region.start, end: region.end });
    });
    
    // Add main selection as occupied area
    if (selectionStart < selectionEnd) {
      allOccupiedAreas.push({ start: selectionStart, end: selectionEnd });
    }
    
    // Sort by start time
    allOccupiedAreas.sort((a, b) => a.start - b.start);
    
    // Find boundaries for the entire region movement
    let maxStart = 0;
    let minEnd = duration - regionDuration;
    
    for (const area of allOccupiedAreas) {
      // Left boundary: find the nearest end that's before current region
      if (area.end <= targetRegion.start) {
        maxStart = Math.max(maxStart, area.end);
      }
      // Right boundary: find the nearest start that's after current region
      if (area.start >= targetRegion.end) {
        minEnd = Math.min(minEnd, area.start - regionDuration);
      }
    }
    
    return { 
      min: Math.max(0, maxStart), 
      max: Math.max(Math.max(0, maxStart), Math.min(minEnd, duration - regionDuration))
    };
  }, [duration]);

  // 🆕 Helper function to calculate safe boundaries for region dragging
  const getRegionBoundaries = useCallback((targetRegionId, handleType, regions, selectionStart, selectionEnd) => {
    const otherRegions = regions.filter(r => r.id !== targetRegionId);
    const allOccupiedAreas = [];
    
    // Add other regions as occupied areas
    otherRegions.forEach(region => {
      allOccupiedAreas.push({ start: region.start, end: region.end });
    });
    
    // Add main selection as occupied area
    if (selectionStart < selectionEnd) {
      allOccupiedAreas.push({ start: selectionStart, end: selectionEnd });
    }
    
    // Sort by start time
    allOccupiedAreas.sort((a, b) => a.start - b.start);
    
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    if (handleType === 'start') {
      // For start handle, find the nearest end boundary to the left
      let maxStart = 0;
      for (const area of allOccupiedAreas) {
        if (area.end <= targetRegion.start) {
          maxStart = Math.max(maxStart, area.end);
        }
      }
      return { min: maxStart, max: targetRegion.end - 0.5 };
    } else {
      // For end handle, find the nearest start boundary to the right
      let minEnd = duration;
      for (const area of allOccupiedAreas) {
        if (area.start >= targetRegion.end) {
          minEnd = Math.min(minEnd, area.start);
        }
      }
      return { min: targetRegion.start + 0.5, max: minEnd };
    }
  }, [duration]);

  // 🆕 Ultra smooth region cursor sync using audioSyncManager like main selection
  const regionAudioSyncManager = useRef(null);
  
  useEffect(() => {
    if (!regionAudioSyncManager.current) {
      // Import audioSyncManager locally
      import('../utils/audioSyncManager').then(({ createAudioSyncManager }) => {
        regionAudioSyncManager.current = createAudioSyncManager();
        console.log('🎯 Region AudioSyncManager initialized');
      });
    }
  }, []);

  const ultraSmoothRegionSync = useCallback((newTime, handleType = 'region') => {
    if (!regionAudioSyncManager.current || !audioRef.current) return;
    
    // Use same ultra-optimized sync as main selection
    const success = regionAudioSyncManager.current.realTimeSync(
      newTime, 
      audioRef, 
      setCurrentTime, 
      handleType, 
      true, // force = true for realtime updates
      newTime, // startTime for region context
      isInverted
    );
    
    // Only log every 10th successful sync to reduce console spam
    if (success && Math.random() < 0.1) {
      console.log('🎯 Ultra smooth region sync:', newTime.toFixed(3));
    }
  }, [audioRef, setCurrentTime, isInverted]);

  // 🆕 Region drag handlers - Refactored to use proper pointer capture
  const handleRegionMouseDown = useCallback((regionId, handleType, e) => {
    setActiveRegionIdDebounced(regionId, 'regionMouseDown');
    setDraggingRegion({ regionId, handleType, startX: e.clientX });
    
    // Set pointer capture on the target element
    if (e.target && e.target.setPointerCapture && e.pointerId) {
      e.target.setPointerCapture(e.pointerId);
    }
  }, [activeRegionId, setActiveRegionIdDebounced]);

  // 🆕 Region body drag handlers - For moving entire regions
  const handleRegionBodyDown = useCallback((regionId, e) => {
    setActiveRegionIdDebounced(regionId, 'regionBodyDown');
    setDraggingRegion({ regionId, handleType: 'body', startX: e.clientX });
    
    // Set pointer capture on the target element
    if (e.target && e.target.setPointerCapture && e.pointerId) {
      e.target.setPointerCapture(e.pointerId);
    }
  }, [activeRegionId, setActiveRegionIdDebounced]);

  const handleRegionMouseMove = useCallback((regionId, handleType, e) => {
    if (!draggingRegion || draggingRegion.regionId !== regionId || draggingRegion.handleType !== handleType) return;
    if (!duration) return;
    
    const deltaX = e.clientX - draggingRegion.startX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.offsetWidth;
    const deltaTime = (deltaX / canvasWidth) * duration;
    
    setRegions(prev => prev.map(region => {
      if (region.id !== regionId) return region;
      
      // Get safe boundaries considering other regions and main selection
      const boundaries = getRegionBoundaries(regionId, handleType, prev, startTime, endTime);
      
      if (handleType === 'start') {
        const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
        
        // 🆕 Realtime cursor jump to region start when dragging start handle
        ultraSmoothRegionSync(newStart);
        
        return { ...region, start: newStart };
      } else {
        const newEnd = Math.max(boundaries.min, Math.min(region.end + deltaTime, boundaries.max));
        
        // 🆕 Smart cursor positioning for end handle drag
        const regionDuration = newEnd - region.start;
        let cursorPosition;
        
        if (regionDuration < 3) {
          // 🔧 For regions < 3s: limit cursor to start point (no overshoot)
          cursorPosition = region.start;
        } else {
          // 🔧 For regions >= 3s: use 3s offset like main selection
          cursorPosition = Math.max(region.start, newEnd - 3);
        }
        
        ultraSmoothRegionSync(cursorPosition, 'end');
        
        return { ...region, end: newEnd };
      }
    }));
    
    setDraggingRegion(prev => ({ ...prev, startX: e.clientX }));
  }, [draggingRegion, duration, canvasRef, getRegionBoundaries, startTime, endTime, ultraSmoothRegionSync]);

  const handleRegionBodyMove = useCallback((regionId, e) => {
    if (!draggingRegion || draggingRegion.regionId !== regionId || draggingRegion.handleType !== 'body') return;
    if (!duration) return;
    
    const deltaX = e.clientX - draggingRegion.startX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.offsetWidth;
    const deltaTime = (deltaX / canvasWidth) * duration;
    
    setRegions(prev => prev.map(region => {
      if (region.id !== regionId) return region;
      
      // Get safe boundaries for entire region movement
      const boundaries = getRegionBodyBoundaries(regionId, prev, startTime, endTime);
      const regionDuration = region.end - region.start;
      
      // Calculate new start position with collision detection
      const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
      const newEnd = newStart + regionDuration;
      
      // 🆕 Realtime cursor jump to region start when dragging region body
      ultraSmoothRegionSync(newStart);
      
      return { ...region, start: newStart, end: newEnd };
    }));
    
    setDraggingRegion(prev => ({ ...prev, startX: e.clientX }));
  }, [draggingRegion, duration, canvasRef, getRegionBodyBoundaries, startTime, endTime, ultraSmoothRegionSync]);

  const handleRegionBodyUp = useCallback((regionId, e) => {
    // Release pointer capture
    if (e.target && e.target.releasePointerCapture && e.pointerId) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    setDraggingRegion(null);
  }, []);

  const handleRegionMouseUp = useCallback((regionId, handleType, e) => {
    // Release pointer capture
    if (e.target && e.target.releasePointerCapture && e.pointerId) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    setDraggingRegion(null);
  }, []);

  const handleDrop = useCallback((e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleFileUpload(files[0]); }, [handleFileUpload]);

  useEffect(() => { animationRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useAudioEventHandlers({ audioRef, audioFile, setDuration, setEndTime, setCurrentTime, setIsPlaying, setAudioError, jumpToTime, startTime, isInverted, fileValidation });
  
  useEffect(() => {
    let animationId;
    const updateCursor = () => {
      if (isPlaying && audioRef.current) {
        const t = audioRef.current.currentTime;
        const autoReturn = getAutoReturnSetting();
        
        // 🆕 Get active playback boundaries (region or main selection)
        const playbackBounds = getActivePlaybackBoundaries();
        const { start: playStart, end: playEnd } = playbackBounds;
        
        if (isInverted && t >= playStart && t < playEnd) {
          audioRef.current.currentTime = playEnd; 
          setCurrentTime(playEnd);
        } else if (!isInverted && shouldPauseAtEndTime(t, playEnd, duration, canvasRef)) {
          // 🆕 Check if we're in play all mode and should jump to next region
          if (isPlayAllMode && (regions.length > 0 || (startTime < endTime))) {
            // 🔧 Recreate the same sorted items logic as in handlePlayAllRegions
            const allPlayableItems = [];
            
            // Add main selection if it exists
            if (startTime < endTime && duration > 0) {
              allPlayableItems.push({
                id: 'main',
                start: startTime,
                end: endTime,
                name: 'Main Selection',
                type: 'main'
              });
            }
            
            // Add all regions
            regions.forEach(region => {
              allPlayableItems.push({
                ...region,
                type: 'region'
              });
            });
            
            const sortedItems = allPlayableItems.sort((a, b) => a.start - b.start);
            const nextIndex = playAllIndex + 1;
            
            if (nextIndex < sortedItems.length) {
              // Jump to next item
              const nextItem = sortedItems[nextIndex];
              console.log(`🎵 Auto-jumping to next item: ${nextItem.name} [${nextItem.start.toFixed(1)}s-${nextItem.end.toFixed(1)}s]`);
              
              setPlayAllIndex(nextIndex);
              setActiveRegionIdDebounced(nextItem.id, 'playAllNext');
              jumpToTime(nextItem.start);
              // Continue playing (don't pause)
              animationId = requestAnimationFrame(updateCursor);
              return;
            } else {
              // Finished all items, stop play all mode
              console.log('🎵 Finished playing all items (main + regions)');
              setIsPlayAllMode(false);
              setPlayAllIndex(0);
              audioRef.current.pause(); 
              setIsPlaying(false);
              // Jump back to first item
              const firstItem = sortedItems[0];
              setActiveRegionIdDebounced(firstItem.id, 'playAllComplete');
              jumpToTime(firstItem.start);
              return;
            }
          } else {
            // Normal single region/selection behavior
            audioRef.current.pause(); 
            setIsPlaying(false); 
            if (autoReturn) {
              setTimeout(() => {
                jumpToTime(playStart);
                audioRef.current?.play?.();
              }, 50);
            } else {
              jumpToTime(playStart);
            }
          }
        } else {
          setCurrentTime(t);
        }
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    if (isPlaying && audioRef.current) animationId = requestAnimationFrame(updateCursor);
    return () => { if (animationId) cancelAnimationFrame(animationId); };  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying, isInverted, jumpToTime, duration, canvasRef, getActivePlaybackBoundaries, isPlayAllMode, regions, playAllIndex, setActiveRegionIdDebounced]);

  // 🆕 Region dragging now handled by pointer capture in WaveformUI, no global listeners needed

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
      return currentEqualizerValues;
    }
    
    if (!isEqualizerConnected || !getEqualizerState) {
      return null;
    }
    const eqState = getEqualizerState();
    // Return just the gain values as an array for visual indicators and export
    const eqValues = eqState?.bands ? eqState.bands.map(band => band.gain) : null;
    return eqValues;
  }, [currentEqualizerValues, isEqualizerConnected, getEqualizerState]);

  // 🆕 Region click handlers - For selecting active region
  const handleRegionClick = useCallback((regionId) => {
    // 🔧 Don't jump cursor if we're in the middle of dragging
    if (draggingRegion) {
      console.log('🚫 Region click ignored - currently dragging');
      return;
    }
    
    console.log('🎯 Region selected:', regionId);
    setActiveRegionIdDebounced(regionId, 'regionClick');
    
    // 🆕 Jump cursor to region start point
    const selectedRegion = regions.find(r => r.id === regionId);
    if (selectedRegion) {
      jumpToTime(selectedRegion.start);
    }
  }, [regions, jumpToTime, draggingRegion, activeRegionId, setActiveRegionIdDebounced]);

  // 🆕 Main selection click handler - For selecting main selection as active
  const handleMainSelectionClick = useCallback(() => {
    if (regions.length >= 1) {
      setActiveRegionIdDebounced('main', 'mainSelectionClick');
    }
  }, [regions.length, setActiveRegionIdDebounced]);

  // 🆕 Auto-select main selection when there are 1+ regions but no active selection
  useEffect(() => {
    // 🔧 REMOVED: Auto-select main to prevent overriding newly added regions
    // The new behavior: let newly added regions stay active
    // Only auto-select if there's no active region AND no regions exist yet
    if (regions.length === 0 && !activeRegionId) {
      setActiveRegionIdDebounced('main', 'autoSelect');
    }
  }, [regions.length, activeRegionId, setActiveRegionIdDebounced]);

  // 🆕 Computed values for time selector - show active region time when available
  const timeDisplayValues = useMemo(() => {
    if (activeRegionId && regions.length > 0) {
      // Special case: main selection active (represented by 'main')
      if (activeRegionId === 'main') {
        return {
          displayStartTime: startTime,
          displayEndTime: endTime,
          isRegionTime: false, // Still use main selection handlers
          regionName: 'Main Selection'
        };
      }
      
      // Regular region active
      const activeRegion = regions.find(r => r.id === activeRegionId);
      if (activeRegion) {
        return {
          displayStartTime: activeRegion.start,
          displayEndTime: activeRegion.end,
          isRegionTime: true,
          regionName: activeRegion.name
        };
      }
    }
    // Fallback to main selection
    return {
      displayStartTime: startTime,
      displayEndTime: endTime,
      isRegionTime: false,
      regionName: null
    };
  }, [activeRegionId, regions, startTime, endTime]);

  // 🆕 Time change handlers for active region
  const handleTimeDisplayChange = useCallback((type, newTime) => {
    if (timeDisplayValues.isRegionTime && activeRegionId) {
      // Update active region time with collision detection
      setRegions(prev => prev.map(region => {
        if (region.id !== activeRegionId) return region;
        
        // Apply collision detection for region time changes
        const boundaries = getRegionBoundaries(activeRegionId, type, prev, startTime, endTime);
        const safeTime = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
        
        return {
          ...region,
          [type]: safeTime
        };
      }));
    } else {
      // Fallback to main selection change
      if (type === 'start') {
        handleStartTimeChange(newTime);
      } else {
        handleEndTimeChange(newTime);
      }
    }
  }, [timeDisplayValues.isRegionTime, activeRegionId, handleStartTimeChange, handleEndTimeChange, getRegionBoundaries, startTime, endTime]);

  const handleDisplayStartTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('start', newTime);
  }, [handleTimeDisplayChange]);

  const handleDisplayEndTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('end', newTime);
  }, [handleTimeDisplayChange]);

  // 🆕 Enhanced togglePlayPause that respects active region boundaries
  const togglePlayPause = useCallback(() => {
    if (!isPlaying) {
      // 🔧 Before playing, ensure cursor is within active region boundaries
      const playbackBounds = getActivePlaybackBoundaries();
      const { start: playStart, end: playEnd } = playbackBounds;
      
      // If cursor is outside active region, jump to start of active region
      if (currentTime < playStart || currentTime >= playEnd) {
        console.log(`🎯 Cursor outside active region [${playStart.toFixed(1)}s - ${playEnd.toFixed(1)}s], jumping to start`);
        jumpToTime(playStart);
      }
    } else {
      // 🆕 When manually pausing, exit play all mode
      if (isPlayAllMode) {
        console.log('🎵 Manual pause - exiting play all mode');
        setIsPlayAllMode(false);
        setPlayAllIndex(0);
      }
    }
    
    // Call original toggle play pause
    originalTogglePlayPause();
  }, [isPlaying, currentTime, getActivePlaybackBoundaries, jumpToTime, originalTogglePlayPause, isPlayAllMode]);

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
            </div>            <SmartWaveformLazy
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
              // 🆕 Region props
              regions={regions}
              activeRegionId={activeRegionId}
              onRegionUpdate={(regionId, newStart, newEnd) => {
                setRegions(prev => prev.map(r => 
                  r.id === regionId ? { ...r, start: newStart, end: newEnd } : r
                ));
              }}
              onRegionClick={handleRegionClick}
              onRegionHandleDown={handleRegionMouseDown}
              onRegionHandleMove={handleRegionMouseMove}
              onRegionHandleUp={handleRegionMouseUp}
              onRegionBodyDown={handleRegionBodyDown}
              onRegionBodyMove={handleRegionBodyMove}
              onRegionBodyUp={handleRegionBodyUp}
              onMainSelectionClick={handleMainSelectionClick}
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
              onVolumeChange={updateVolume}
              onSpeedChange={updatePlaybackRate}
              onPitchChange={handlePitchChange}
              onEqualizerChange={handleEqualizerChange}
              equalizerState={getCurrentEqualizerState()} // 🎚️ Pass current EQ state for visual indicators
              startTime={timeDisplayValues.displayStartTime}
              endTime={timeDisplayValues.displayEndTime}
              // 🔧 Pass raw main selection times for logic calculation
              mainSelectionStartTime={startTime}
              mainSelectionEndTime={endTime}
              duration={duration}
              onStartTimeChange={handleDisplayStartTimeChange}
              onEndTimeChange={handleDisplayEndTimeChange}
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
              // 🆕 Region management props
              regions={regions}
              activeRegionId={activeRegionId}
              canAddNewRegion={canAddNewRegion}
              onAddRegion={handleAddRegion}
              onDeleteRegion={handleDeleteRegion}
              onClearAllRegions={handleClearAllRegions}
              onPlayAllRegions={handlePlayAllRegions}
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
                  // 🆕 Region props for total duration calculation
                  regions={regions}
                  activeRegionId={activeRegionId}
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

