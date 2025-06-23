import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { generateCompatibilityReport } from '../utils/audioUtils';
import { createInteractionManager } from '../utils/interactionUtils';

import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useEnhancedWaveform } from '../hooks/useEnhancedWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useRealTimeFadeEffects } from '../hooks/useRealTimeFadeEffects';
import { useInteractionHandlers } from '../hooks/useInteractionHandlers';
import { useTimeChangeHandlers } from '../hooks/useTimeChangeHandlers';
import { usePitchShift } from '../hooks/usePitchShift';

// Import refactored modules
import { useAppState } from '../state/MP3CutterState';
import { useRegionCalculations, useCollisionDetection } from '../regions/RegionLogic';
import { 
  useRegionManagement, 
  useRegionInteractions, 
  useRegionClickHandlers 
} from '../regions/RegionHandlers';
import { 
  SafeAudioElement, 
  shouldPauseAtEndTime,
  useAudioEventHandlers,
  useAudioContext,
  useActivePlaybackBoundaries,
  useAudioErrorHandler,
  useEnhancedPlayPause,
  useJumpHandlers
} from '../audio/AudioController';
import { 
  useEnhancedFadeHandlers,
  useEnhancedVolumeHandlers,
  useEnhancedSpeedHandlers,
  useEnhancedPitchHandlers,
  useSmartFadeConfigSync,
  useEqualizerHandlers,
  useAudioEffectsConnection
} from '../audio/AudioEffects';
import { 
  useTimeDisplayHandlers,
  useMainSelectionBoundaries,
  useRegionBoundaries,
  useHandleChangeHandlers
} from '../interactions/TimeHandlers';
import { useFileUploadHandler } from '../file/FileProcessor';
import { useSmartPreloader, usePhase3OptimizationManager } from '../optimization/PreloadManager';

import FileInfo from './FileInfo';
import AudioErrorAlert from './ErrorAlert/AudioErrorAlert';
import ConnectionErrorAlert from './ErrorAlert/ConnectionErrorAlert';
import FileUploadSection from './FileUploadSection';

import { 
  SmartWaveformLazy, ExportPanelLazy, 
  UnifiedControlBarLazy
} from '../../../components/LazyComponents';

import { 
  useWebWorkerPreloader, useIdleCallbackPreloader, useAdvancedComponentCache 
} from '../../../hooks/usePhase3OptimizationStable';

import { getAutoReturnSetting } from '../utils/safeStorage';

// 🚀 Main Component with optimizations
const MP3CutterMain = React.memo(() => {
  // Basic states
  const { audioFile, uploadFile, isUploading, uploadError, testConnection, uploadProgress } = useFileUpload();
  const {
    isPlaying, currentTime, duration, volume, playbackRate,
    togglePlayPause: originalTogglePlayPause, jumpToTime, updateVolume, updatePlaybackRate,
    audioRef, setCurrentTime, setDuration, setIsPlaying, setMasterVolumeSetter
  } = useAudioPlayer();
  
  // 🚀 Optimized state management with reducer
  const { appState, dispatch, setActiveRegionIdDebounced } = useAppState();
  const { 
    fadeIn, fadeOut, regions, activeRegionId, isPlayAllMode, playAllIndex, 
    draggingRegion, audioError, fileValidation, currentEqualizerValues 
  } = appState;

  // Individual states that can't be reduced
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [isConnected, setIsConnected] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [compatibilityReport, setCompatibilityReport] = useState(null);
  const [isInverted, setIsInverted] = useState(false);

  // Hooks
  const { pitchValue, updatePitch } = usePitchShift();
  const {
    waveformData, startTime, endTime, isDragging, hoveredHandle, generateWaveform,
    setStartTime, setEndTime, setIsDragging, setHoveredHandle, canvasRef, isGenerating, enhancedFeatures
  } = useEnhancedWaveform();
  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();
  
  // Real-time effects
  const { 
    connectAudioElement, disconnectAudioElement, updateFadeConfig, setFadeActive, isWebAudioSupported,
    setPitchValue, audioContext: fadeAudioContext, isConnected: audioConnected,
    setMasterVolume, updateEqualizerBand, updateEqualizerValues, resetEqualizer, 
    isEqualizerConnected, getEqualizerState
  } = useRealTimeFadeEffects();

  // Optimization hooks
  const { isReady: isWorkerReady, isSupported: isWorkerSupported, metrics: workerMetrics } = useWebWorkerPreloader();
  const { addToCache: addComponentToCache } = useAdvancedComponentCache();

  // 🚀 Optimized region calculations
  const { minimumHandleGap, handleEdgePositions, availableSpaces, canAddNewRegion } = useRegionCalculations(
    regions, startTime, endTime, duration, canvasRef
  );

  // 🚀 Optimized collision detection
  const getEnhancedCollisionBoundaries = useCollisionDetection(handleEdgePositions, duration);

  // Refs
  const animationRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);
  const enhancedHandlersRef = useRef({});
  const historySavedRef = useRef(false);
  const regionAudioSyncManager = useRef(null);

  // 🚀 Memoized audio context
  const audioContext = useAudioContext({ audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig });
  // 🚀 Optimized time change handlers
  const { handleStartTimeChange: originalHandleStartTimeChange, handleEndTimeChange: originalHandleEndTimeChange, saveHistoryNow, cleanup: cleanupTimeHandlers } = useTimeChangeHandlers({
    startTime, endTime, duration, fadeIn, fadeOut, setStartTime, setEndTime, saveState, historySavedRef, isDragging,
    // 🆕 Add regions support for history
    regions, activeRegionId
  });

  // 🚀 Main selection boundaries
  const { getMainSelectionBoundaries } = useMainSelectionBoundaries(getEnhancedCollisionBoundaries);

  // 🚀 Region boundaries
  const { getRegionBoundaries, getRegionBodyBoundaries } = useRegionBoundaries(
    regions, getEnhancedCollisionBoundaries, duration, handleEdgePositions
  );

  // 🚀 Optimized ultra smooth region sync
  const ultraSmoothRegionSync = useCallback((newTime, handleType = 'region') => {
    if (!regionAudioSyncManager.current || !audioRef.current) return;
    
    const success = regionAudioSyncManager.current.realTimeSync(
      newTime, audioRef, setCurrentTime, handleType, true, newTime, isInverted
    );
    
    if (success && Math.random() < 0.1) {
      console.log('🎯 Ultra smooth region sync:', newTime.toFixed(3));
    }
  }, [audioRef, setCurrentTime, isInverted]);

  // 🚀 Handle change handlers
  const { handleStartTimeChange, handleEndTimeChange } = useHandleChangeHandlers({
    regions,
    startTime,
    endTime,
    isInverted,
    isDragging,
    getMainSelectionBoundaries,
    originalHandleStartTimeChange,
    originalHandleEndTimeChange,
    jumpToTime,
    setActiveRegionIdDebounced
  });

  // 🚀 Optimized interaction handlers
  const { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasMouseLeave } = useInteractionHandlers({
    canvasRef, duration, startTime, endTime, audioRef, isPlaying, fadeIn, fadeOut,
    isDragging, setStartTime, setEndTime, setIsDragging, setHoveredHandle, setCurrentTime,
    handleStartTimeChange: t => (enhancedHandlersRef.current.handleStartTimeChange ? enhancedHandlersRef.current.handleStartTimeChange(t) : setStartTime(t)),
    handleEndTimeChange: t => (enhancedHandlersRef.current.handleEndTimeChange ? enhancedHandlersRef.current.handleEndTimeChange(t) : setEndTime(t)),
    jumpToTime, saveState, saveHistoryNow, historySavedRef, interactionManagerRef, audioContext,
    regions, activeRegionId,    onRegionUpdate: (regionId, newStart, newEnd) => {
      const updatedRegions = regions.map(r => r.id === regionId ? { ...r, start: newStart, end: newEnd } : r);
      dispatch({ 
        type: 'SET_REGIONS', 
        regions: updatedRegions
      });
      
      // 🆕 Save history after region drag/resize
      saveState({ 
        startTime, 
        endTime, 
        fadeIn, 
        fadeOut, 
        regions: updatedRegions, 
        activeRegionId 
      });
    }
  });

  // 🚀 Active playback boundaries
  const getActivePlaybackBoundaries = useActivePlaybackBoundaries(activeRegionId, regions, startTime, endTime);

  // 🚀 Jump handlers
  const { handleJumpToStart, handleJumpToEnd } = useJumpHandlers(getActivePlaybackBoundaries, jumpToTime);

  // 🚀 Fade handlers
  const fadeHandlers = useEnhancedFadeHandlers({ 
    fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig, saveState, dispatch,
    regions, activeRegionId
  });

  // 🚀 Volume handlers
  const volumeHandlers = useEnhancedVolumeHandlers({ 
    volume, 
    updateVolume,
    regions, 
    activeRegionId,
    dispatch
  });

  // 🚀 Speed handlers
  const speedHandlers = useEnhancedSpeedHandlers({ 
    playbackRate, 
    updatePlaybackRate,
    regions, 
    activeRegionId,
    dispatch
  });

  // 🚀 Pitch handlers
  const pitchHandlers = useEnhancedPitchHandlers({ 
    pitch: pitchValue, 
    updatePitch,
    setPitchValue,
    regions, 
    activeRegionId,
    dispatch
  });

  // 🚀 Equalizer handlers
  const { handleEqualizerChange, getCurrentEqualizerState } = useEqualizerHandlers({
    isEqualizerConnected,
    updateEqualizerBand,
    updateEqualizerValues,
    resetEqualizer,
    currentEqualizerValues,
    getEqualizerState,
    dispatch
  });
  // 🚀 Region management
  const { handleAddRegion, handleDeleteRegion, handleClearAllRegions } = useRegionManagement({
    regions,
    activeRegionId,
    startTime,
    endTime,
    duration,
    availableSpaces,
    minimumHandleGap,
    canAddNewRegion,
    dispatch,
    setActiveRegionIdDebounced,
    jumpToTime,
    setStartTime,
    setEndTime,
    // 🆕 Add history support
    saveState,
    fadeIn,
    fadeOut
  });
  // 🚀 Region interactions
  const { handleRegionPointerDown, handleRegionPointerMove, handleRegionPointerUp } = useRegionInteractions({
    regions,
    draggingRegion,
    duration,
    canvasRef,
    getRegionBoundaries,
    getRegionBodyBoundaries,
    ultraSmoothRegionSync,
    dispatch,
    setActiveRegionIdDebounced,
    // 🆕 Add history support
    saveState,
    startTime,
    endTime,
    fadeIn,
    fadeOut,
    activeRegionId
  });

  // 🚀 Region click handlers
  const { handleRegionClick, handleMainSelectionClick } = useRegionClickHandlers({
    regions,
    activeRegionId,
    startTime,
    jumpToTime,
    setActiveRegionIdDebounced
  });

  // 🚀 Time display handlers
  const timeDisplayValues = useMemo(() => {
    if (activeRegionId && regions.length > 0) {
      if (activeRegionId === 'main') {
        return {
          displayStartTime: startTime,
          displayEndTime: endTime,
          isRegionTime: false,
          regionName: 'Main Selection'
        };
      }
      
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
    
    return {
      displayStartTime: startTime,
      displayEndTime: endTime,
      isRegionTime: false,
      regionName: null
    };
  }, [activeRegionId, regions, startTime, endTime]);

  const { handleDisplayStartTimeChange, handleDisplayEndTimeChange, cleanup: timeDisplayCleanup } = useTimeDisplayHandlers({
    activeRegionId,
    regions,
    startTime,
    endTime,
    timeDisplayValues,
    handleStartTimeChange,
    handleEndTimeChange,
    getRegionBoundaries,
    dispatch,
    // 🆕 Add saveState support for region time changes
    saveState,
    fadeIn,
    fadeOut
  });

  // 🚀 File upload handler
  const { handleFileUpload, handleDrop } = useFileUploadHandler({
    uploadFile,
    generateWaveform,
    audioRef,
    duration,
    saveState,
    setIsInverted,
    isConnected,
    testConnection,
    setIsConnected,
    setConnectionError,
    dispatch
  });

  // 🚀 Audio error handler
  const handleError = useAudioErrorHandler(audioFile, fileValidation, setIsPlaying, dispatch);

  // 🚀 Enhanced togglePlayPause
  const togglePlayPause = useEnhancedPlayPause({
    isPlaying,
    isPlayAllMode,
    currentTime,
    getActivePlaybackBoundaries,
    jumpToTime,
    originalTogglePlayPause,
    dispatch
  });

  // 🚀 Optimized Play All Regions
  const handlePlayAllRegions = useCallback(() => {
    if (regions.length === 0 && (startTime >= endTime || duration <= 0)) return;
    
    const allPlayableItems = [];
    
    if (startTime < endTime && duration > 0) {
      allPlayableItems.push({
        id: 'main',
        start: startTime,
        end: endTime,
        name: 'Main Selection',
        type: 'main'
      });
    }
    
    regions.forEach(region => {
      allPlayableItems.push({ ...region, type: 'region' });
    });
    
    if (allPlayableItems.length === 0) return;
    
    const sortedItems = allPlayableItems.sort((a, b) => a.start - b.start);
    
    console.log('🎵 Starting Play All with', sortedItems.length, 'items:', 
      sortedItems.map(item => `${item.name} (${item.start.toFixed(1)}s-${item.end.toFixed(1)}s)`));
    
    dispatch({ type: 'SET_PLAY_ALL', mode: true, index: 0 });
    
    const firstItem = sortedItems[0];
    setActiveRegionIdDebounced(firstItem.id, 'playAllRegions');
    
    // 🔧 SMOOTH START: Ensure smooth beginning
    const smoothStart = () => {
      if (audioRef.current) {
        const wasPlaying = !audioRef.current.paused;
        
        if (wasPlaying) {
          audioRef.current.pause();
        }
        
        // Short delay for smooth start
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = firstItem.start;
            setCurrentTime(firstItem.start);
            
            if (!isPlaying) {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
              }).catch((error) => {
                console.error('🚨 Failed to start Play All:', error);
              });
            }
          }
        }, 2); // Reduced from 5ms to 2ms for faster start
      }
    };
    
    smoothStart();
  }, [regions, startTime, endTime, duration, setActiveRegionIdDebounced, isPlaying, audioRef, setCurrentTime, setIsPlaying, dispatch]);
  // 🚀 Optimized undo/redo handlers
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setStartTime(prevState.startTime);
      setEndTime(prevState.endTime);
      dispatch({ type: 'SET_FADE', fadeIn: prevState.fadeIn, fadeOut: prevState.fadeOut });
      
      // 🆕 Restore regions from history
      if (prevState.regions !== undefined) {
        dispatch({ type: 'SET_REGIONS', regions: prevState.regions });
      }
      if (prevState.activeRegionId !== undefined) {
        setActiveRegionIdDebounced(prevState.activeRegionId, 'historyUndo');
      }
      
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? prevState.isInverted : false);
      jumpToTime(prevState.startTime);
    }
  }, [undo, setStartTime, setEndTime, jumpToTime, dispatch, setActiveRegionIdDebounced]);  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setStartTime(nextState.startTime);
      setEndTime(nextState.endTime);
      dispatch({ type: 'SET_FADE', fadeIn: nextState.fadeIn, fadeOut: nextState.fadeOut });
      
      // 🆕 Restore regions from history
      if (nextState.regions !== undefined) {
        dispatch({ type: 'SET_REGIONS', regions: nextState.regions });
      }
      if (nextState.activeRegionId !== undefined) {
        setActiveRegionIdDebounced(nextState.activeRegionId, 'historyRedo');
      }
      
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? nextState.isInverted : false);
      jumpToTime(nextState.startTime);
    }
  }, [redo, setStartTime, setEndTime, jumpToTime, dispatch, setActiveRegionIdDebounced]);
  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    const newInvert = !isInverted;
    // 🆕 Include regions in history state
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: newInvert, regions, activeRegionId });
    setIsInverted(newInvert);
    updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted: newInvert, duration });
    jumpToTime(newInvert ? (startTime >= 3 ? startTime - 3 : 0) : startTime);
  }, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime, updateFadeConfig, regions, activeRegionId]);

  // Use optimized hooks
  useAudioEventHandlers({ audioRef, audioFile, setDuration, setEndTime, setCurrentTime, setIsPlaying, jumpToTime, startTime, isInverted, fileValidation, handleError });
  const { handleUserInteraction } = useSmartPreloader(audioFile, waveformData);
  useSmartFadeConfigSync({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig });
  usePhase3OptimizationManager(audioFile, isWorkerSupported, isWorkerReady, workerMetrics, addComponentToCache);
  useAudioEffectsConnection({
    audioRef,
    audioFile,
    isWebAudioSupported,
    connectAudioElement,
    disconnectAudioElement,
    setMasterVolumeSetter,
    setMasterVolume,
    volume,
    setFadeActive,
    isPlaying,
    fadeAudioContext,
    audioConnected,
    isEqualizerConnected,
    pitchValue,
    setPitchValue
  });

  // Enhanced handlers ref update
  useEffect(() => {
    enhancedHandlersRef.current.handleStartTimeChange = handleStartTimeChange;
    enhancedHandlersRef.current.handleEndTimeChange = handleEndTimeChange;
  }, [handleStartTimeChange, handleEndTimeChange]);

  // Initialize interaction manager and region audio sync
  useEffect(() => {
    if (!interactionManagerRef.current) {
      interactionManagerRef.current = createInteractionManager();
    }
    
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setCollisionDetection((handleType, newTime, currentStartTime, currentEndTime) => {
        const boundaries = getMainSelectionBoundaries(handleType, currentStartTime, currentEndTime);
        return Math.max(boundaries.min, Math.min(newTime, boundaries.max));
      });
    }

    if (!regionAudioSyncManager.current) {
      import('../utils/audioSyncManager').then(({ createAudioSyncManager }) => {
        regionAudioSyncManager.current = createAudioSyncManager();
      });
    }
    
    return cleanupTimeHandlers;
  }, [cleanupTimeHandlers, getMainSelectionBoundaries]);

  // Initialize compatibility report
  useEffect(() => {
    setCompatibilityReport(generateCompatibilityReport());
  }, []);

  // Test connection
  useEffect(() => {
    testConnection()
      .then(c => { setIsConnected(c); setConnectionError(null); })
      .catch(() => { setIsConnected(false); setConnectionError('Backend server is not available.'); });
  }, [testConnection]);

  // Animation ref update
  useEffect(() => {
    animationRef.current = { isPlaying, startTime, endTime };
  }, [isPlaying, startTime, endTime]);

  // Auto-select main selection when needed
  useEffect(() => {
    if (regions.length === 0 && !activeRegionId) {
      setActiveRegionIdDebounced('main', 'autoSelect');
    }
  }, [regions.length, activeRegionId, setActiveRegionIdDebounced]);

  // Main cursor update loop with optimizations
  useEffect(() => {
    let animationId;
    const updateCursor = () => {
      if (isPlaying && audioRef.current) {
        const t = audioRef.current.currentTime;
        const autoReturn = getAutoReturnSetting();
        
        const playbackBounds = getActivePlaybackBoundaries();
        const { start: playStart, end: playEnd } = playbackBounds;
        
        if (isInverted && t >= playStart && t < playEnd) {
          audioRef.current.currentTime = playEnd; 
          setCurrentTime(playEnd);
        } else if (!isInverted && shouldPauseAtEndTime(t, playEnd, duration, canvasRef)) {
          if (isPlayAllMode && (regions.length > 0 || (startTime < endTime))) {
            const allPlayableItems = [];
            
            if (startTime < endTime && duration > 0) {
              allPlayableItems.push({
                id: 'main',
                start: startTime,
                end: endTime,
                name: 'Main Selection',
                type: 'main'
              });
            }
            
            regions.forEach(region => {
              allPlayableItems.push({ ...region, type: 'region' });
            });
            
            const sortedItems = allPlayableItems.sort((a, b) => a.start - b.start);
            const nextIndex = playAllIndex + 1;
            
            if (nextIndex < sortedItems.length) {
              const nextItem = sortedItems[nextIndex];
              
              // 🚀 SMOOTH TRANSITION: Add debug info and implement smooth switching
              console.log('🔄 Play All: Transitioning to next region:', {
                from: sortedItems[playAllIndex]?.name || 'Unknown',
                to: nextItem.name,
                fromTime: t.toFixed(3),
                toTime: nextItem.start.toFixed(3),
                gap: (nextItem.start - t).toFixed(3)
              });
              
              dispatch({ type: 'SET_PLAY_ALL', mode: true, index: nextIndex });
              setActiveRegionIdDebounced(nextItem.id, 'playAllNext');
              
              // 🔧 CRITICAL FIX: Smooth transition to avoid audio glitch
              const smoothTransition = () => {
                // Pause briefly to avoid audio buffer interruption
                const wasPlaying = !audioRef.current.paused;
                if (wasPlaying) {
                  audioRef.current.pause();
                }
                
                // Short delay to let audio buffer settle
                setTimeout(() => {
                  // Jump to new position
                  if (audioRef.current) {
                    audioRef.current.currentTime = nextItem.start;
                    setCurrentTime(nextItem.start);
                    
                    // Resume playback smoothly
                    if (wasPlaying) {
                      audioRef.current.play().then(() => {
                        // Removed verbose log for cleaner code
                      }).catch((error) => {
                        console.error('🚨 Failed to resume after transition:', error);
                      });
                    }
                  }
                }, 3); // Reduced from 10ms to 3ms for faster transition
              };
              
              smoothTransition();
              animationId = requestAnimationFrame(updateCursor);
              return;
            } else {
              dispatch({ type: 'SET_PLAY_ALL', mode: false, index: 0 });
              audioRef.current.pause(); 
              setIsPlaying(false);
              const firstItem = sortedItems[0];
              setActiveRegionIdDebounced(firstItem.id, 'playAllComplete');
              jumpToTime(firstItem.start);
              return;
            }
          } else {
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
          const prevTime = currentTime;
          setCurrentTime(t);
          
          // 🔍 DEBUG: Log significant cursor changes
          if (Math.abs(t - prevTime) > 0.5) {
            console.log('🔍 DEBUG: Large cursor jump in playback loop:', {
              from: prevTime.toFixed(2),
              to: t.toFixed(2),
              diff: (t - prevTime).toFixed(2),
              isPlaying,
              audioCurrentTime: audioRef.current?.currentTime?.toFixed(2)
            });
          }
        }
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    
    if (isPlaying && audioRef.current) animationId = requestAnimationFrame(updateCursor);
    return () => { if (animationId) cancelAnimationFrame(animationId); };
  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying, isInverted, jumpToTime, duration, canvasRef, getActivePlaybackBoundaries, isPlayAllMode, regions, playAllIndex, setActiveRegionIdDebounced, currentTime, dispatch]);

  // Event handlers for audio element
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const d = audio.duration;
    dispatch({ type: 'SET_AUDIO_STATE', payload: { audioError: null } });
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => { setDuration(d); setEndTime(d); });
    } else {
      setTimeout(() => { setDuration(d); setEndTime(d); }, 0);
    }
  }, [audioRef, setDuration, setEndTime, dispatch]);

  const handleCanPlay = useCallback(() => {}, []);

  // 🚀 Dynamic region volume during playback
  const lastAppliedVolumeRef = useRef(volume);
  const volumeAnimationRef = useRef(null);
  
  // 🚀 Dynamic region fade during playback
  const lastAppliedFadeRef = useRef({ fadeIn, fadeOut, startTime, endTime });
  const fadeAnimationRef = useRef(null);
  
  // 🚀 Dynamic region speed during playback
  const lastAppliedSpeedRef = useRef(playbackRate);
  const speedAnimationRef = useRef(null);
  
  useEffect(() => {
    if (!setMasterVolume) return;
    
    if (!isPlaying) {
      // When not playing, ensure we use main volume
      if (Math.abs(volume - lastAppliedVolumeRef.current) > 0.001) {
        setMasterVolume(volume);
        lastAppliedVolumeRef.current = volume;
      }
      return;
    }
    
    // Only run dynamic volume if there are regions with different volumes
    const hasRegionVolumes = regions.some(region => 
      region.volume !== undefined && Math.abs(region.volume - volume) > 0.001
    );
    
    if (!hasRegionVolumes) {
      // No region volumes different from main, just ensure main volume is applied
      if (Math.abs(volume - lastAppliedVolumeRef.current) > 0.001) {
        setMasterVolume(volume);
        lastAppliedVolumeRef.current = volume;
      }
      return;
    }
    
    const updateVolumeForCurrentTime = () => {
      if (!audioRef.current || !isPlaying) return;
      
      const currentAudioTime = audioRef.current.currentTime;
      
      // Find which region contains current time
      const activeRegion = regions.find(region => 
        currentAudioTime >= region.start && currentAudioTime <= region.end
      );
      
      let targetVolume = volume; // Default to main volume
      
      if (activeRegion && activeRegion.volume !== undefined) {
        targetVolume = activeRegion.volume;
      }
      
      // Only update if volume actually changed
      if (Math.abs(targetVolume - lastAppliedVolumeRef.current) > 0.001) {
        setMasterVolume(targetVolume);
        lastAppliedVolumeRef.current = targetVolume;
      }
      
      // Continue animation
      volumeAnimationRef.current = requestAnimationFrame(updateVolumeForCurrentTime);
    };
    
    // Start animation
    volumeAnimationRef.current = requestAnimationFrame(updateVolumeForCurrentTime);
    
    return () => {
      if (volumeAnimationRef.current) {
        cancelAnimationFrame(volumeAnimationRef.current);
        volumeAnimationRef.current = null;
      }
    };
  }, [isPlaying, regions, volume, setMasterVolume, audioRef]);

  // 🚀 Dynamic region fade during playback
  useEffect(() => {
    if (!updateFadeConfig) return;
    
    if (!isPlaying) {
      // When not playing, ensure we use main fade config
      const mainConfig = { fadeIn, fadeOut, startTime, endTime, isInverted, duration };
      const lastConfig = lastAppliedFadeRef.current;
      
      if (lastConfig.fadeIn !== fadeIn || lastConfig.fadeOut !== fadeOut || 
          lastConfig.startTime !== startTime || lastConfig.endTime !== endTime) {
        updateFadeConfig(mainConfig);
        lastAppliedFadeRef.current = mainConfig;
      }
      return;
    }
    
    // Only run dynamic fade if there are regions with different fades
    const hasRegionFades = regions.some(region => 
      (region.fadeIn !== undefined && region.fadeIn > 0) || 
      (region.fadeOut !== undefined && region.fadeOut > 0)
    );
    
    if (!hasRegionFades) {
      // No region fades, just ensure main fade config is applied
      const mainConfig = { fadeIn, fadeOut, startTime, endTime, isInverted, duration };
      const lastConfig = lastAppliedFadeRef.current;
      
      if (lastConfig.fadeIn !== fadeIn || lastConfig.fadeOut !== fadeOut || 
          lastConfig.startTime !== startTime || lastConfig.endTime !== endTime) {
        updateFadeConfig(mainConfig);
        lastAppliedFadeRef.current = mainConfig;
      }
      return;
    }
    
    const updateFadeForCurrentTime = () => {
      if (!audioRef.current || !isPlaying) return;
      
      const currentAudioTime = audioRef.current.currentTime;
      
      // Find which region contains current time
      const activeRegion = regions.find(region => 
        currentAudioTime >= region.start && currentAudioTime <= region.end
      );
      
      let targetConfig;
      
      if (activeRegion && (activeRegion.fadeIn > 0 || activeRegion.fadeOut > 0)) {
        // Use region's fade config
        targetConfig = {
          fadeIn: activeRegion.fadeIn || 0,
          fadeOut: activeRegion.fadeOut || 0,
          startTime: activeRegion.start,
          endTime: activeRegion.end,
          isInverted: false, // Regions don't support invert
          duration
        };
      } else {
        // Use main fade config
        targetConfig = { fadeIn, fadeOut, startTime, endTime, isInverted, duration };
      }
      
      // Only update if config actually changed
      const lastConfig = lastAppliedFadeRef.current;
      const configChanged = lastConfig.fadeIn !== targetConfig.fadeIn || 
                           lastConfig.fadeOut !== targetConfig.fadeOut ||
                           lastConfig.startTime !== targetConfig.startTime ||
                           lastConfig.endTime !== targetConfig.endTime;
      
      if (configChanged) {
        updateFadeConfig(targetConfig);
        lastAppliedFadeRef.current = targetConfig;
      }
      
      // Continue animation
      fadeAnimationRef.current = requestAnimationFrame(updateFadeForCurrentTime);
    };
    
    // Start animation
    fadeAnimationRef.current = requestAnimationFrame(updateFadeForCurrentTime);
    
    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
        fadeAnimationRef.current = null;
      }
    };
  }, [isPlaying, regions, fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig, audioRef]);

  // 🚀 Dynamic region speed during playback
  useEffect(() => {
    if (!updatePlaybackRate) return;
    
    if (!isPlaying) {
      // When not playing, ensure we use main speed
      if (Math.abs(playbackRate - lastAppliedSpeedRef.current) > 0.001) {
        updatePlaybackRate(playbackRate);
        lastAppliedSpeedRef.current = playbackRate;
      }
      return;
    }
    
    // Only run dynamic speed if there are regions with different speeds
    const hasRegionSpeeds = regions.some(region => {
      const regionSpeed = region.playbackRate;
      // 🔧 CRITICAL: Validate region speed values
      if (regionSpeed !== undefined) {
        if (typeof regionSpeed !== 'number' || !isFinite(regionSpeed) || isNaN(regionSpeed)) {
          console.error('🚨 INVALID region speed detected:', {
            regionId: region.id,
            speed: regionSpeed,
            type: typeof regionSpeed,
            isFinite: isFinite(regionSpeed),
            isNaN: isNaN(regionSpeed)
          });
          return false; // Skip invalid regions
        }
        return Math.abs(regionSpeed - playbackRate) > 0.001;
      }
      return false;
    });
    
    if (!hasRegionSpeeds) {
      // No region speeds different from main, just ensure main speed is applied
      if (Math.abs(playbackRate - lastAppliedSpeedRef.current) > 0.001) {
        updatePlaybackRate(playbackRate);
        lastAppliedSpeedRef.current = playbackRate;
      }
      return;
    }
    
    const updateSpeedForCurrentTime = () => {
      if (!audioRef.current || !isPlaying) return;
      
      const currentAudioTime = audioRef.current.currentTime;
      
      // Find which region contains current time
      const activeRegion = regions.find(region => 
        currentAudioTime >= region.start && currentAudioTime <= region.end
      );
      
      let targetSpeed = playbackRate; // Default to main speed
      
      if (activeRegion && activeRegion.playbackRate !== undefined) {
        const regionSpeed = activeRegion.playbackRate;
        
        // 🔧 CRITICAL: Validate region speed before using
        if (typeof regionSpeed === 'number' && isFinite(regionSpeed) && !isNaN(regionSpeed)) {
          targetSpeed = Math.max(0.25, Math.min(4.0, regionSpeed)); // Clamp to safe range
        } else {
          console.error('🚨 INVALID region speed in dynamic system:', {
            regionId: activeRegion.id,
            speed: regionSpeed,
            type: typeof regionSpeed,
            currentTime: currentAudioTime
          });
          // Use main speed as fallback
          targetSpeed = playbackRate;
        }
      }
      
      // Only update if speed actually changed
      if (Math.abs(targetSpeed - lastAppliedSpeedRef.current) > 0.001) {
        updatePlaybackRate(targetSpeed);
        lastAppliedSpeedRef.current = targetSpeed;
      }
      
      // Continue animation
      speedAnimationRef.current = requestAnimationFrame(updateSpeedForCurrentTime);
    };
    
    // Start animation
    speedAnimationRef.current = requestAnimationFrame(updateSpeedForCurrentTime);
    
    return () => {
      if (speedAnimationRef.current) {
        cancelAnimationFrame(speedAnimationRef.current);
        speedAnimationRef.current = null;
      }
    };
  }, [isPlaying, regions, playbackRate, updatePlaybackRate, audioRef]);

  // 🚀 Dynamic region pitch during playback
  const lastAppliedPitchRef = useRef(pitchValue);
  const pitchAnimationRef = useRef(null);
  
  useEffect(() => {
    if (!setPitchValue) return;
    
    if (!isPlaying) {
      // When not playing, ensure we use main pitch
      if (Math.abs(pitchValue - lastAppliedPitchRef.current) > 0.001) {
        setPitchValue(pitchValue);
        lastAppliedPitchRef.current = pitchValue;
        console.log('🎵 Dynamic Pitch: Applied main pitch (not playing):', pitchValue);
      }
      return;
    }
    
    // Only run dynamic pitch if there are regions with different pitches
    const hasRegionPitches = regions.some(region => {
      const regionPitch = region.pitch;
      // 🔧 CRITICAL: Validate region pitch values
      if (regionPitch !== undefined) {
        if (typeof regionPitch !== 'number' || !isFinite(regionPitch) || isNaN(regionPitch)) {
          console.error('🚨 INVALID region pitch detected:', {
            regionId: region.id,
            pitch: regionPitch,
            type: typeof regionPitch,
            isFinite: isFinite(regionPitch),
            isNaN: isNaN(regionPitch)
          });
          return false; // Skip invalid regions
        }
        return Math.abs(regionPitch - pitchValue) > 0.001;
      }
      return false;
    });
    
    if (!hasRegionPitches) {
      // No region pitches different from main, just ensure main pitch is applied
      if (Math.abs(pitchValue - lastAppliedPitchRef.current) > 0.001) {
        setPitchValue(pitchValue);
        lastAppliedPitchRef.current = pitchValue;
        console.log('🎵 Dynamic Pitch: Applied main pitch (no region differences):', pitchValue);
      }
      return;
    }
    
    console.log('🎵 Dynamic Pitch: Starting animation loop - regions have different pitches');
    
    const updatePitchForCurrentTime = () => {
      if (!audioRef.current || !isPlaying) return;
      
      const currentAudioTime = audioRef.current.currentTime;
      
      // Find which region contains current time
      const activeRegion = regions.find(region => 
        currentAudioTime >= region.start && currentAudioTime <= region.end
      );
      
      let targetPitch = pitchValue; // Default to main pitch
      
      if (activeRegion && activeRegion.pitch !== undefined) {
        const regionPitch = activeRegion.pitch;
        
        // 🔧 CRITICAL: Validate region pitch before using
        if (typeof regionPitch === 'number' && isFinite(regionPitch) && !isNaN(regionPitch)) {
          targetPitch = Math.max(-12, Math.min(12, regionPitch)); // Clamp to safe range
        } else {
          console.error('🚨 INVALID region pitch in dynamic system:', {
            regionId: activeRegion.id,
            pitch: regionPitch,
            type: typeof regionPitch,
            currentTime: currentAudioTime
          });
          // Use main pitch as fallback
          targetPitch = pitchValue;
        }
      }
      
      // Only update if pitch actually changed
      if (Math.abs(targetPitch - lastAppliedPitchRef.current) > 0.001) {
        setPitchValue(targetPitch);
        lastAppliedPitchRef.current = targetPitch;
        console.log('🎵 Dynamic Pitch: Applied during playback:', {
          time: currentAudioTime.toFixed(2),
          region: activeRegion ? activeRegion.id : 'main',
          pitch: targetPitch,
          previousPitch: lastAppliedPitchRef.current
        });
      }
      
      // Continue animation
      pitchAnimationRef.current = requestAnimationFrame(updatePitchForCurrentTime);
    };
    
    // Start animation
    pitchAnimationRef.current = requestAnimationFrame(updatePitchForCurrentTime);
    
    return () => {
      if (pitchAnimationRef.current) {
        cancelAnimationFrame(pitchAnimationRef.current);
        pitchAnimationRef.current = null;
        console.log('🎵 Dynamic Pitch: Animation stopped');
      }
    };
  }, [isPlaying, regions, pitchValue, setPitchValue, audioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimeHandlers();
      timeDisplayCleanup();
    };
  }, [cleanupTimeHandlers, timeDisplayCleanup]);

  // 🚀 Final render with all optimizations
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <ConnectionErrorAlert 
          connectionError={connectionError} 
          uploadError={uploadError} 
          onRetryConnection={() => testConnection()} 
        />
        <AudioErrorAlert 
          error={audioError} 
          compatibilityReport={compatibilityReport} 
        />
        
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
              draggingRegion={draggingRegion}
              isPlaying={isPlaying}
              volume={volume}
              isGenerating={isGenerating}
              enhancedFeatures={enhancedFeatures}
              fadeIn={fadeIn}
              fadeOut={fadeOut}
              isInverted={isInverted}
              audioRef={audioRef}
              regions={regions}
              activeRegionId={activeRegionId}
              onRegionUpdate={(regionId, newStart, newEnd) => {
                dispatch({ 
                  type: 'SET_REGIONS', 
                  regions: regions.map(r => r.id === regionId ? { ...r, start: newStart, end: newEnd } : r)
                });
              }}
              onRegionClick={handleRegionClick}
              onRegionHandleDown={(regionId, handleType, e) => handleRegionPointerDown(regionId, handleType, e)}
              onRegionHandleMove={(regionId, handleType, e) => handleRegionPointerMove(regionId, handleType, e)}
              onRegionHandleUp={(regionId, handleType, e) => handleRegionPointerUp(regionId, handleType, e)}
              onRegionBodyDown={(regionId, e) => handleRegionPointerDown(regionId, 'body', e)}
              onRegionBodyMove={(regionId, e) => handleRegionPointerMove(regionId, 'body', e)}
              onRegionBodyUp={(regionId, e) => handleRegionPointerUp(regionId, 'body', e)}
              onMainSelectionClick={handleMainSelectionClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />
            
            <UnifiedControlBarLazy
              isPlaying={isPlaying}
              volume={volume}
              playbackRate={playbackRate}
              pitch={pitchValue}
              onTogglePlayPause={togglePlayPause}
              onJumpToStart={handleJumpToStart}
              onJumpToEnd={handleJumpToEnd}
              onVolumeChange={volumeHandlers.handleVolumeChange}
              onSpeedChange={speedHandlers.handleSpeedChange}
              onPitchChange={pitchHandlers.handlePitchChange}
              onEqualizerChange={handleEqualizerChange}
              equalizerState={getCurrentEqualizerState()}
              startTime={timeDisplayValues.displayStartTime}
              endTime={timeDisplayValues.displayEndTime}
              mainSelectionStartTime={startTime}
              mainSelectionEndTime={endTime}
              duration={duration}
              onStartTimeChange={handleDisplayStartTimeChange}
              onEndTimeChange={handleDisplayEndTimeChange}
              onInvertSelection={handleInvertSelection}
              isInverted={isInverted}
              fadeIn={fadeIn}
              fadeOut={fadeOut}
              onFadeInToggle={fadeHandlers.handleFadeInToggle}
              onFadeOutToggle={fadeHandlers.handleFadeOutToggle}
              onFadeInChange={fadeHandlers.handleFadeInChange}
              onFadeOutChange={fadeHandlers.handleFadeOutChange}
              getCurrentFadeValues={fadeHandlers.getCurrentFadeValues}
              getCurrentVolumeValues={volumeHandlers.getCurrentVolumeValues}
              getCurrentSpeedValues={speedHandlers.getCurrentSpeedValues}
              getCurrentPitchValues={pitchHandlers.getCurrentPitchValues}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              historyIndex={historyIndex}
              historyLength={historyLength}
              disabled={!audioFile}
              regions={regions}
              activeRegionId={activeRegionId}
              canAddNewRegion={canAddNewRegion}
              onAddRegion={handleAddRegion}
              onDeleteRegion={handleDeleteRegion}
              onClearAllRegions={handleClearAllRegions}
              onPlayAllRegions={handlePlayAllRegions}
            />
            
            <div className="export-controls">
              <ExportPanelLazy
                outputFormat={outputFormat}
                onFormatChange={setOutputFormat}
                audioFile={audioFile}
                startTime={startTime}
                endTime={endTime}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
                playbackRate={playbackRate}
                pitch={pitchValue}
                volume={volume}
                equalizer={getCurrentEqualizerState()}
                isInverted={isInverted}
                normalizeVolume={normalizeVolume}
                onNormalizeVolumeChange={setNormalizeVolume}
                disabled={!audioFile}
                regions={regions}
                activeRegionId={activeRegionId}
                getCurrentFadeValues={fadeHandlers.getCurrentFadeValues}
                getCurrentVolumeValues={volumeHandlers.getCurrentVolumeValues}
                getCurrentSpeedValues={speedHandlers.getCurrentSpeedValues}
                getCurrentPitchValues={pitchHandlers.getCurrentPitchValues}
              />
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