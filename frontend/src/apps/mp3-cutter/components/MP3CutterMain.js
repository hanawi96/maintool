import React, { useState, useRef, useCallback, useEffect, useMemo, useReducer } from 'react';
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

// 🚀 Optimized SafeAudioElement with better memoization
const SafeAudioElement = React.memo(({
  audioRef, audioFile, onError, onLoadStart, onCanPlay, onLoadedMetadata
}) => {
  const urlValidation = useMemo(() => {
    if (!audioFile?.url) return { valid: false };
    return validateAudioURL(audioFile.url);
  }, [audioFile?.url]);
  
  if (!urlValidation.valid) return null;
  
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

// 🚀 Optimized shouldPauseAtEndTime with memoization
const shouldPauseAtEndTime = (() => {
  let cachedResult = null;
  let cachedParams = null;
  
  return (currentTime, endTime, duration, canvasRef) => {
    const paramsKey = `${currentTime}-${endTime}-${duration}`;
    if (cachedParams === paramsKey) return cachedResult;
    
    const canvas = canvasRef?.current;
    if (!canvas || !duration || duration <= 0) {
      cachedResult = currentTime >= endTime;
    } else {
      const canvasWidth = canvas.width || 640;
      const handleW = canvasWidth < 640 ? 6 : 8;
      const availW = canvasWidth - 2 * handleW;
      const tpp = duration / availW;
      const offset = 0.5 * tpp;
      const threshold = Math.max(endTime - offset - tpp * 0.25, endTime - 0.001);
      cachedResult = currentTime >= threshold;
    }
    
    cachedParams = paramsKey;
    return cachedResult;
  };
})();

// 🚀 State reducer for better state management
const appStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FADE':
      return { ...state, fadeIn: action.fadeIn ?? state.fadeIn, fadeOut: action.fadeOut ?? state.fadeOut };
    case 'SET_REGIONS':
      return { ...state, regions: action.regions };
    case 'SET_ACTIVE_REGION':
      return { ...state, activeRegionId: action.id };
    case 'SET_PLAY_ALL':
      return { ...state, isPlayAllMode: action.mode, playAllIndex: action.index };
    case 'SET_DRAGGING':
      return { ...state, draggingRegion: action.dragging };
    case 'SET_AUDIO_STATE':
      return { ...state, ...action.payload };
    case 'RESET_FILE':
      return { 
        ...state, 
        regions: [], 
        activeRegionId: null, 
        isPlayAllMode: false, 
        playAllIndex: 0,
        audioError: null,
        fileValidation: null
      };
    default:
      return state;
  }
};

// 🚀 Custom hook for region calculations - Optimized with memoization
const useRegionCalculations = (regions, startTime, endTime, duration, canvasRef) => {
  // Memoized minimum handle gap calculation
  const minimumHandleGap = useMemo(() => {
    if (!canvasRef.current || duration <= 0) return 0;
    
    const canvas = canvasRef.current;
    const canvasWidth = canvas.offsetWidth || 800;
    const handleW = canvasWidth < 640 ? Math.max(3, 8 * 0.75) : 8;
    const requiredPixelGap = handleW + 2;
    return (requiredPixelGap / canvasWidth) * duration;
  }, [canvasRef, duration]);

  // Memoized handle edge positions
  const handleEdgePositions = useMemo(() => {
    const handleEdges = [];
    
    if (startTime < endTime) {
      handleEdges.push(
        { position: startTime, type: 'main_start_edge', regionId: 'main' },
        { position: endTime, type: 'main_end_edge', regionId: 'main' }
      );
    }
    
    regions.forEach(region => {
      handleEdges.push(
        { position: region.start, type: 'region_start_edge', regionId: region.id },
        { position: region.end, type: 'region_end_edge', regionId: region.id }
      );
    });
    
    return handleEdges.sort((a, b) => a.position - b.position);
  }, [regions, startTime, endTime]);

  // Memoized available spaces
  const availableSpaces = useMemo(() => {
    if (duration <= 0) return [];
    
    const occupiedAreas = [];
    const minGap = minimumHandleGap;
    
    regions.forEach(region => {
      occupiedAreas.push({
        start: Math.max(0, region.start - minGap / 2),
        end: Math.min(duration, region.end + minGap / 2),
        type: 'region',
        id: region.id
      });
    });
    
    if (startTime < endTime) {
      occupiedAreas.push({
        start: Math.max(0, startTime - minGap / 2),
        end: Math.min(duration, endTime + minGap / 2),
        type: 'selection'
      });
    }
    
    if (occupiedAreas.length === 0) {
      return [{ start: 0, end: duration, length: duration, hasMinGap: true }];
    }
    
    const sortedAreas = occupiedAreas.sort((a, b) => a.start - b.start);
    const spaces = [];
    
    if (sortedAreas[0].start > 0) {
      const spaceLength = sortedAreas[0].start;
      if (spaceLength >= minGap + 1.0) {
        spaces.push({ start: 0, end: sortedAreas[0].start, length: spaceLength, hasMinGap: true });
      }
    }
    
    for (let i = 0; i < sortedAreas.length - 1; i++) {
      const currentEnd = sortedAreas[i].end;
      const nextStart = sortedAreas[i + 1].start;
      if (nextStart > currentEnd) {
        const spaceLength = nextStart - currentEnd;
        if (spaceLength >= minGap + 1.0) {
          spaces.push({ start: currentEnd, end: nextStart, length: spaceLength, hasMinGap: true });
        }
      }
    }
    
    const lastArea = sortedAreas[sortedAreas.length - 1];
    if (lastArea.end < duration) {
      const spaceLength = duration - lastArea.end;
      if (spaceLength >= minGap + 1.0) {
        spaces.push({ start: lastArea.end, end: duration, length: spaceLength, hasMinGap: true });
      }
    }
    
    return spaces;
  }, [regions, duration, startTime, endTime, minimumHandleGap]);

  return {
    minimumHandleGap,
    handleEdgePositions,
    availableSpaces,
    canAddNewRegion: availableSpaces.length > 0
  };
};

// 🚀 Custom hook for collision detection - Optimized
const useCollisionDetection = (handleEdgePositions, duration) => {
  return useCallback((targetType, targetRegionId, handleType, newTime, currentStartTime, currentEndTime) => {
    let minBoundary = 0;
    let maxBoundary = duration;
    
    for (const edge of handleEdgePositions) {
      if (edge.regionId === targetRegionId) continue;
      
      if (handleType === 'start') {
        if (edge.position > newTime && edge.position < maxBoundary) {
          maxBoundary = edge.position;
        }
        if (edge.position <= newTime && edge.position > minBoundary) {
          minBoundary = edge.position;
        }
      } else {
        if (edge.position < newTime && edge.position > minBoundary) {
          minBoundary = edge.position;
        }
        if (edge.position >= newTime && edge.position < maxBoundary) {
          maxBoundary = edge.position;
        }
      }
    }
    
    if (handleType === 'start') {
      maxBoundary = Math.min(maxBoundary, currentEndTime - 0.1);
    } else {
      minBoundary = Math.max(minBoundary, currentStartTime + 0.1);
    }
    
    return { min: minBoundary, max: maxBoundary };
  }, [handleEdgePositions, duration]);
};

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
  const [appState, dispatch] = useReducer(appStateReducer, {
    fadeIn: 0,
    fadeOut: 0,
    regions: [],
    activeRegionId: null,
    isPlayAllMode: false,
    playAllIndex: 0,
    draggingRegion: null,
    audioError: null,
    fileValidation: null,
    currentEqualizerValues: Array(10).fill(0)
  });

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
  const { isReady: isWorkerReady, isSupported: isWorkerSupported, metrics: workerMetrics, preloadCriticalComponents } = useWebWorkerPreloader();
  const { scheduleIdlePreload } = useIdleCallbackPreloader();
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
  const activeRegionChangeRef = useRef(null);
  const mainSelectionClickRef = useRef(null);
  const regionAudioSyncManager = useRef(null);

  // 🚀 Optimized debounced setActiveRegionId
  const setActiveRegionIdDebounced = useCallback((newRegionId, source = 'unknown') => {
    if (source === 'addRegion' || source === 'regionClick') {
      // 🔧 IMMEDIATE: No delay for region clicks and new region additions
      dispatch({ type: 'SET_ACTIVE_REGION', id: newRegionId });
      return;
    }
    
    if (activeRegionChangeRef.current) {
      clearTimeout(activeRegionChangeRef.current);
    }
    
    activeRegionChangeRef.current = setTimeout(() => {
      dispatch({ type: 'SET_ACTIVE_REGION', id: newRegionId });
      activeRegionChangeRef.current = null;
    }, 1);
  }, []);

  // 🚀 Memoized audio context
  const audioContext = useMemo(() => ({
    audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig
  }), [audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig]);

  // 🚀 Optimized time change handlers
  const { handleStartTimeChange: originalHandleStartTimeChange, handleEndTimeChange: originalHandleEndTimeChange, saveHistoryNow, cleanup: cleanupTimeHandlers } = useTimeChangeHandlers({
    startTime, endTime, duration, fadeIn, fadeOut, setStartTime, setEndTime, saveState, historySavedRef, isDragging
  });

  // 🚀 Memoized main selection boundaries
  const getMainSelectionBoundaries = useCallback((handleType, currentStartTime, currentEndTime) => {
    return getEnhancedCollisionBoundaries('main', 'main', handleType, 
      handleType === 'start' ? currentStartTime : currentEndTime,
      currentStartTime, currentEndTime);
  }, [getEnhancedCollisionBoundaries]);

  // 🚀 Optimized region boundaries
  const getRegionBoundaries = useCallback((targetRegionId, handleType) => {
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    return getEnhancedCollisionBoundaries('region', targetRegionId, handleType,
      handleType === 'start' ? targetRegion.start : targetRegion.end,
      targetRegion.start, targetRegion.end);
  }, [regions, getEnhancedCollisionBoundaries, duration]);

  // 🚀 Optimized region body boundaries
  const getRegionBodyBoundaries = useCallback((targetRegionId) => {
    const targetRegion = regions.find(r => r.id === targetRegionId);
    if (!targetRegion) return { min: 0, max: duration };
    
    const regionDuration = targetRegion.end - targetRegion.start;
    let minStart = 0;
    let maxStart = duration - regionDuration;
    
    for (const edge of handleEdgePositions) {
      if (edge.regionId === targetRegionId) continue;
      
      if (edge.position <= targetRegion.start && edge.position > minStart) {
        minStart = edge.position;
      }
      
      if (edge.position >= targetRegion.end && edge.position - regionDuration < maxStart) {
        maxStart = edge.position - regionDuration;
      }
    }
    
    maxStart = Math.max(minStart, Math.min(maxStart, duration - regionDuration));
    return { min: Math.max(0, minStart), max: Math.max(0, maxStart) };
  }, [regions, handleEdgePositions, duration]);

  // 🚀 Optimized handle change handlers
  const handleStartTimeChange = useCallback((newStartTime) => {
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    const boundaries = getMainSelectionBoundaries('start', startTime, endTime);
    const safeStartTime = Math.max(boundaries.min, Math.min(newStartTime, boundaries.max));
    
    originalHandleStartTimeChange(safeStartTime);
    jumpToTime(isInverted ? Math.max(0, safeStartTime - 3) : safeStartTime);
  }, [originalHandleStartTimeChange, jumpToTime, isInverted, getMainSelectionBoundaries, startTime, endTime, regions.length, setActiveRegionIdDebounced]);

  const handleEndTimeChange = useCallback((newEndTime) => {
    if (regions.length > 0) {
      setActiveRegionIdDebounced('main', 'dragMainHandle');
    }
    
    const boundaries = getMainSelectionBoundaries('end', startTime, endTime);
    const safeEndTime = Math.max(boundaries.min, Math.min(newEndTime, boundaries.max));
    
    originalHandleEndTimeChange(safeEndTime);
    if (!isDragging) jumpToTime(isInverted ? Math.max(0, startTime - 3) : Math.max(startTime, safeEndTime - 3));
  }, [originalHandleEndTimeChange, isDragging, jumpToTime, isInverted, startTime, getMainSelectionBoundaries, endTime, regions.length, setActiveRegionIdDebounced]);

  // 🚀 Optimized interaction handlers
  const { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp, handleCanvasMouseLeave } = useInteractionHandlers({
    canvasRef, duration, startTime, endTime, audioRef, isPlaying, fadeIn, fadeOut,
    isDragging, setStartTime, setEndTime, setIsDragging, setHoveredHandle, setCurrentTime,
    handleStartTimeChange: t => (enhancedHandlersRef.current.handleStartTimeChange ? enhancedHandlersRef.current.handleStartTimeChange(t) : setStartTime(t)),
    handleEndTimeChange: t => (enhancedHandlersRef.current.handleEndTimeChange ? enhancedHandlersRef.current.handleEndTimeChange(t) : setEndTime(t)),
    jumpToTime, saveState, saveHistoryNow, historySavedRef, interactionManagerRef, audioContext,
    regions, activeRegionId,
    onRegionUpdate: (regionId, newStart, newEnd) => {
      dispatch({ 
        type: 'SET_REGIONS', 
        regions: regions.map(r => r.id === regionId ? { ...r, start: newStart, end: newEnd } : r)
      });
    }
  });

  // 🚀 Memoized active playback boundaries
  const getActivePlaybackBoundaries = useCallback(() => {
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
    
    return {
      start: startTime,
      end: endTime,
      isRegion: false,
      regionName: 'Main Selection'
    };
  }, [activeRegionId, regions, startTime, endTime]);

  // 🚀 Optimized jump handlers
  const handleJumpToStart = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.start);
  }, [jumpToTime, getActivePlaybackBoundaries]);
  
  const handleJumpToEnd = useCallback(() => {
    const playbackBounds = getActivePlaybackBoundaries();
    jumpToTime(playbackBounds.end);
  }, [jumpToTime, getActivePlaybackBoundaries]);

  // 🚀 Optimized fade handlers
  const updateFade = useCallback((type, value) => {
    const newFadeIn = type === 'in' ? value : fadeIn;
    const newFadeOut = type === 'out' ? value : fadeOut;
    
    dispatch({ type: 'SET_FADE', fadeIn: newFadeIn, fadeOut: newFadeOut });
    updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration });
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig]);

  const handleFadeInChange = useCallback(newFadeIn => updateFade('in', newFadeIn), [updateFade]);
  const handleFadeOutChange = useCallback(newFadeOut => updateFade('out', newFadeOut), [updateFade]);
  
  const handleFadeInDragEnd = useCallback(finalFadeIn => {
    saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted });
  }, [startTime, endTime, fadeOut, saveState, isInverted]);
  
  const handleFadeOutDragEnd = useCallback(finalFadeOut => {
    saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted });
  }, [startTime, endTime, fadeIn, saveState, isInverted]);

  const handleFadeInToggle = useCallback(() => { 
    const v = fadeIn > 0 ? 0 : 3.0; 
    updateFade('in', v); 
    saveState({ startTime, endTime, fadeIn: v, fadeOut, isInverted }); 
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);
  
  const handleFadeOutToggle = useCallback(() => { 
    const v = fadeOut > 0 ? 0 : 3.0; 
    updateFade('out', v); 
    saveState({ startTime, endTime, fadeIn, fadeOut: v, isInverted }); 
  }, [fadeIn, fadeOut, startTime, endTime, isInverted, updateFade, saveState]);

  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => { 
    dispatch({ type: 'SET_FADE', fadeIn: newFadeIn, fadeOut: newFadeOut });
    updateFadeConfig({ fadeIn: newFadeIn, fadeOut: newFadeOut, startTime, endTime, isInverted, duration }); 
    saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted }); 
  }, [startTime, endTime, updateFadeConfig, saveState, isInverted, duration]);

  // 🚀 Optimized region generation
  const generateRandomRegion = useCallback(() => {
    if (duration <= 0 || availableSpaces.length === 0) return null;
    
    const bestSpace = availableSpaces.reduce((best, current) => 
      current.length > best.length ? current : best
    );
    
    const effectiveStart = bestSpace.start + minimumHandleGap / 2;
    const effectiveEnd = bestSpace.end - minimumHandleGap / 2;
    const effectiveLength = effectiveEnd - effectiveStart;
    
    const minDuration = Math.max(1, effectiveLength * 0.1);
    const maxDuration = Math.min(30, effectiveLength * 0.6);
    const regionDuration = minDuration + Math.random() * (maxDuration - minDuration);
    
    const maxStartPos = effectiveEnd - regionDuration;
    const regionStart = effectiveStart + Math.random() * Math.max(0, maxStartPos - effectiveStart);
    
    return {
      id: Date.now() + Math.random(),
      start: Math.max(effectiveStart, regionStart),
      end: Math.min(effectiveEnd, regionStart + regionDuration),
      name: `Region ${regions.length + 1}`
    };
  }, [duration, availableSpaces, minimumHandleGap, regions.length]);

  // 🚀 Optimized region management
  const handleAddRegion = useCallback(() => {
    if (!canAddNewRegion) return;
    
    const newRegion = generateRandomRegion();
    if (newRegion) {
      dispatch({ type: 'SET_REGIONS', regions: [...regions, newRegion] });
      setActiveRegionIdDebounced(newRegion.id, 'addRegion');
      jumpToTime(newRegion.start);
    }
  }, [generateRandomRegion, canAddNewRegion, regions, setActiveRegionIdDebounced, jumpToTime]);

  const handleDeleteRegion = useCallback(() => {
    const mainSelectionExists = startTime < endTime && duration > 0;
    const totalItems = regions.length + (mainSelectionExists ? 1 : 0);
    
    if (totalItems > 1 && activeRegionId) {
      if (activeRegionId === 'main') {
        setStartTime(0);
        setEndTime(duration);
        
        if (regions.length > 0) {
          setActiveRegionIdDebounced(regions[0].id, 'deleteMainSelection');
        } else {
          setActiveRegionIdDebounced(null, 'deleteMainSelection');
        }
      } else {
        const remaining = regions.filter(r => r.id !== activeRegionId);
        dispatch({ type: 'SET_REGIONS', regions: remaining });
        
        if (mainSelectionExists) {
          setActiveRegionIdDebounced('main', 'deleteRegion');
          jumpToTime(startTime);
        } else if (remaining.length > 0) {
          setActiveRegionIdDebounced(remaining[0].id, 'deleteRegion');
          jumpToTime(remaining[0].start);
        } else {
          setActiveRegionIdDebounced(null, 'deleteRegion');
        }
      }
    }
  }, [activeRegionId, regions, startTime, endTime, duration, setStartTime, setEndTime, setActiveRegionIdDebounced, jumpToTime]);

  const handleClearAllRegions = useCallback(() => {
    dispatch({ type: 'SET_REGIONS', regions: [] });
    setActiveRegionIdDebounced('main', 'clearAllRegions');
    if (startTime < endTime && duration > 0) {
      jumpToTime(startTime);
    }
  }, [setActiveRegionIdDebounced, jumpToTime, startTime, endTime, duration]);

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
    
    dispatch({ type: 'SET_PLAY_ALL', mode: true, index: 0 });
    
    const firstItem = sortedItems[0];
    setActiveRegionIdDebounced(firstItem.id, 'playAllRegions');
    jumpToTime(firstItem.start);
    
    if (!isPlaying) {
      setTimeout(() => originalTogglePlayPause(), 100);
    }
  }, [regions, startTime, endTime, duration, setActiveRegionIdDebounced, jumpToTime, isPlaying, originalTogglePlayPause]);

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

  // 🚀 Consolidated region event handlers (eliminates redundancy)
  const handleRegionPointerDown = useCallback((regionId, handleType, e) => {
    setActiveRegionIdDebounced(regionId, `region${handleType}Down`);
    dispatch({ type: 'SET_DRAGGING', dragging: { regionId, handleType, startX: e.clientX } });
    
    if (e.target?.setPointerCapture && e.pointerId) {
      e.target.setPointerCapture(e.pointerId);
    }
  }, [setActiveRegionIdDebounced]);

  const handleRegionPointerMove = useCallback((regionId, handleType, e) => {
    if (!draggingRegion || draggingRegion.regionId !== regionId || draggingRegion.handleType !== handleType) return;
    if (!duration) return;
    
    const deltaX = e.clientX - draggingRegion.startX;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = canvas.offsetWidth;
    const deltaTime = (deltaX / canvasWidth) * duration;
    
    dispatch({
      type: 'SET_REGIONS',
      regions: regions.map(region => {
        if (region.id !== regionId) return region;
        
        if (handleType === 'body') {
          // Body drag: move entire region
          const boundaries = getRegionBodyBoundaries(regionId);
          const regionDuration = region.end - region.start;
          const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
          const newEnd = newStart + regionDuration;
          
          ultraSmoothRegionSync(newStart);
          return { ...region, start: newStart, end: newEnd };
        } else {
          // Handle drag: resize region
          const boundaries = getRegionBoundaries(regionId, handleType);
          
          if (handleType === 'start') {
            const newStart = Math.max(boundaries.min, Math.min(region.start + deltaTime, boundaries.max));
            ultraSmoothRegionSync(newStart);
            return { ...region, start: newStart };
          } else { // handleType === 'end'
            const newEnd = Math.max(boundaries.min, Math.min(region.end + deltaTime, boundaries.max));
            const regionDuration = newEnd - region.start;
            const cursorPosition = regionDuration < 3 ? region.start : Math.max(region.start, newEnd - 3);
            ultraSmoothRegionSync(cursorPosition, 'end');
            return { ...region, end: newEnd };
          }
        }
      })
    });
    
    dispatch({ type: 'SET_DRAGGING', dragging: { ...draggingRegion, startX: e.clientX } });
  }, [draggingRegion, duration, canvasRef, getRegionBoundaries, getRegionBodyBoundaries, regions, ultraSmoothRegionSync]);

  const handleRegionPointerUp = useCallback((regionId, handleType, e) => {
    if (e.target?.releasePointerCapture && e.pointerId) {
      e.target.releasePointerCapture(e.pointerId);
    }
    dispatch({ type: 'SET_DRAGGING', dragging: null });
  }, []);

  // 🚀 Memoized time display values
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

  // 🚀 Optimized time change handlers
  const handleTimeDisplayChange = useCallback((type, newTime) => {
    if (timeDisplayValues.isRegionTime && activeRegionId) {
      dispatch({
        type: 'SET_REGIONS',
        regions: regions.map(region => {
          if (region.id !== activeRegionId) return region;
          
          const boundaries = getRegionBoundaries(activeRegionId, type);
          const safeTime = Math.max(boundaries.min, Math.min(newTime, boundaries.max));
          
          return { ...region, [type]: safeTime };
        })
      });
    } else {
      if (type === 'start') {
        handleStartTimeChange(newTime);
      } else {
        handleEndTimeChange(newTime);
      }
    }
  }, [timeDisplayValues.isRegionTime, activeRegionId, handleStartTimeChange, handleEndTimeChange, getRegionBoundaries, regions]);

  const handleDisplayStartTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('start', newTime);
  }, [handleTimeDisplayChange]);

  const handleDisplayEndTimeChange = useCallback((newTime) => {
    handleTimeDisplayChange('end', newTime);
  }, [handleTimeDisplayChange]);

  // 🚀 Enhanced togglePlayPause
  const togglePlayPause = useCallback(() => {
    if (!isPlaying) {
      const playbackBounds = getActivePlaybackBoundaries();
      const { start: playStart, end: playEnd } = playbackBounds;
      
      if (currentTime < playStart || currentTime >= playEnd) {
        jumpToTime(playStart);
      }
    } else {
      if (isPlayAllMode) {
        dispatch({ type: 'SET_PLAY_ALL', mode: false, index: 0 });
      }
    }
    
    originalTogglePlayPause();
  }, [isPlaying, currentTime, getActivePlaybackBoundaries, jumpToTime, originalTogglePlayPause, isPlayAllMode]);

  // 🚀 Optimized undo/redo handlers
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setStartTime(prevState.startTime);
      setEndTime(prevState.endTime);
      dispatch({ type: 'SET_FADE', fadeIn: prevState.fadeIn, fadeOut: prevState.fadeOut });
      
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? prevState.isInverted : false);
      jumpToTime(prevState.startTime);
    }
  }, [undo, setStartTime, setEndTime, jumpToTime]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setStartTime(nextState.startTime);
      setEndTime(nextState.endTime);
      dispatch({ type: 'SET_FADE', fadeIn: nextState.fadeIn, fadeOut: nextState.fadeOut });
      
      const isNewFileUpload = Date.now() - (window.lastFileUploadTime || 0) < 5000;
      const hasPreventFlag = window.preventInvertStateRestore === true;
      setIsInverted(!isNewFileUpload && !hasPreventFlag ? nextState.isInverted : false);
      jumpToTime(nextState.startTime);
    }
  }, [redo, setStartTime, setEndTime, jumpToTime]);

  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    const newInvert = !isInverted;
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: newInvert });
    setIsInverted(newInvert);
    updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted: newInvert, duration });
    jumpToTime(newInvert ? (startTime >= 3 ? startTime - 3 : 0) : startTime);
  }, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime, updateFadeConfig]);

  // 🚀 Optimized file upload - MOVED UP to fix initialization order
  const handleFileUpload = useCallback(async (file) => {
    console.log('🎯 handleFileUpload called with file:', file?.name);
    window.lastFileUploadTime = Date.now();
    dispatch({ type: 'RESET_FILE' });
    setIsInverted(false);
    window.preventInvertStateRestore = true;
    setTimeout(() => { window.preventInvertStateRestore = false; }, 10000);
    window.currentAudioFile = file;
    
    try {
      const validation = validateAudioFile(file);
      dispatch({ type: 'SET_AUDIO_STATE', payload: { fileValidation: validation } });
      
      if (!validation.valid) {
        dispatch({ 
          type: 'SET_AUDIO_STATE', 
          payload: { 
            audioError: { 
              type: 'validation', 
              title: 'File Validation Failed', 
              message: validation.errors.join('; '), 
              suggestions: ['Convert to MP3 or WAV format', 'Check if file is corrupted', 'Try a smaller file size'], 
              supportedFormats: ['MP3', 'WAV', 'M4A', 'MP4'] 
            } 
          } 
        });
        return;
      }
      
      if (isConnected === false) {
        const connected = await testConnection();
        if (!connected) throw new Error('Backend server is not available.');
        setIsConnected(true);
        setConnectionError(null);
      }
      
      await uploadFile(file);
      const immediateAudioUrl = createSafeAudioURL(file);
      if (!immediateAudioUrl) throw new Error('Failed to create audio URL');
      
      if (audioRef.current) {
        audioRef.current.src = immediateAudioUrl;
        audioRef.current.load();
        dispatch({ type: 'SET_AUDIO_STATE', payload: { audioError: null } });
      }
      
      const waveformResult = await generateWaveform(file);
      const audioDuration = waveformResult.duration || audioRef.current?.duration || duration || 0;
      
      if (audioDuration > 0) {
        saveState({ startTime: 0, endTime: audioDuration, fadeIn: 0, fadeOut: 0, isInverted: false });
      }
    } catch (error) {
      console.error('🔥 handleFileUpload error:', error);
      dispatch({ 
        type: 'SET_AUDIO_STATE', 
        payload: { 
          audioError: { 
            type: 'upload', 
            title: 'Upload Failed', 
            message: error.message, 
            suggestions: ['Check your internet connection', 'Try a different file', 'Restart the backend server'] 
          } 
        } 
      });
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection, setIsInverted, setIsConnected, setConnectionError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    console.log('🎯 handleDrop called with files:', files.length);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // 🚀 Consolidated audio error handler
  const handleError = useCallback((e) => {
    const error = e.target.error;
    const filename = audioFile?.name || 'audio file';
    const details = getAudioErrorMessage(error, filename);
    
    console.error('🔥 Audio error:', { error, filename, details });
    
    dispatch({
      type: 'SET_AUDIO_STATE',
      payload: {
        audioError: {
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
        }
      }
    });
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => setIsPlaying(false));
    } else {
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [audioFile?.name, fileValidation, setIsPlaying]);

  // 🚀 Optimized audio event handlers
  const useAudioEventHandlers = ({ audioRef, audioFile, setDuration, setEndTime, setCurrentTime, setIsPlaying, jumpToTime, startTime, isInverted, fileValidation }) => {
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !audioFile?.url) return;
      
      const onLoadedMetadata = () => {
        const d = audio.duration;
        dispatch({ type: 'SET_AUDIO_STATE', payload: { audioError: null } });
        
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => { setDuration(d); setEndTime(d); });
        } else {
          setTimeout(() => { setDuration(d); setEndTime(d); }, 0);
        }
      };
      
      const onEnded = () => {
        const autoReturn = getAutoReturnSetting();
        if (isInverted) {
          if (autoReturn) {
            jumpToTime(0);
            audio.play?.();
          } else {
            setIsPlaying(false);
            setCurrentTime(audio.duration);
          }
        } else {
          if (autoReturn) {
            jumpToTime(startTime);
            audio.play?.();
          } else {
            setIsPlaying(false);
            jumpToTime(startTime);
          }
        }
      };
      
      const onPlay = () => setTimeout(() => setIsPlaying(true), 16);
      const onPause = () => setTimeout(() => setIsPlaying(false), 16);

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('error', handleError);
      };
    }, [audioFile?.name, audioFile?.url, audioRef, setCurrentTime, setDuration, setIsPlaying, setEndTime, fileValidation, jumpToTime, startTime, isInverted]);
  };

  // 🚀 Smart preloader hook
  const useSmartPreloader = (audioFile, waveformData) => {
    const { triggerPreload } = useProgressivePreloader();
    const { shouldPreload: netPreload } = useNetworkAwarePreloader();
    const { shouldPreload: memPreload } = useMemoryAwarePreloader();
    const { trackInteraction } = useInteractionPreloader();

    useEffect(() => {
      if (audioFile && netPreload('large') && memPreload() !== false) {
        triggerPreload('fileLoad');
        preloadHeavyComponents();
      }
    }, [audioFile, netPreload, memPreload, triggerPreload]);

    useEffect(() => {
      if (waveformData.length > 0) triggerPreload('waveformReady');
    }, [waveformData.length, triggerPreload]);

    const handleUserInteraction = useCallback((type) => {
      trackInteraction(type);
      triggerPreload('userInteraction');
    }, [trackInteraction, triggerPreload]);

    return { handleUserInteraction };
  };

  // 🚀 Smart fade config sync
  const useSmartFadeConfigSync = ({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig }) => {
    const synced = useRef({});
    useEffect(() => {
      if (!synced.current || synced.current.startTime !== startTime || synced.current.endTime !== endTime) {
        updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted, duration });
        synced.current = { startTime, endTime };
      }
    }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig, isInverted, duration]);
  };

  // Use optimized hooks
  useAudioEventHandlers({ audioRef, audioFile, setDuration, setEndTime, setCurrentTime, setIsPlaying, jumpToTime, startTime, isInverted, fileValidation });
  const { handleUserInteraction } = useSmartPreloader(audioFile, waveformData);
  useSmartFadeConfigSync({ fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig });

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

  // Audio file change effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) {
      if (audioConnected) {
        disconnectAudioElement();
      }
      return;
    }
    if (interactionManagerRef.current) interactionManagerRef.current.reset();
    dispatch({ type: 'SET_AUDIO_STATE', payload: { audioError: null } });
  }, [audioFile?.url, audioFile?.name, audioRef, audioConnected, disconnectAudioElement]);

  // Animation ref update
  useEffect(() => {
    animationRef.current = { isPlaying, startTime, endTime };
  }, [isPlaying, startTime, endTime]);

  // Web Audio connection
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url || !isWebAudioSupported) return;
    
    const t = setTimeout(() => {
      connectAudioElement(audio).then((connected) => {
        if (setMasterVolumeSetter && setMasterVolume) {
          setMasterVolumeSetter(setMasterVolume);
          setMasterVolume(volume);
        }
      });
    }, 100);
    return () => clearTimeout(t);
  }, [audioFile?.url, audioRef, connectAudioElement, isWebAudioSupported, setMasterVolumeSetter, setMasterVolume, volume]);

  // Apply pending pitch when audio connection is established
  useEffect(() => {
    const canApplyPitch = fadeAudioContext && (audioConnected || isEqualizerConnected);
    if (canApplyPitch && pitchValue !== 0) {
      setPitchValue(pitchValue);
    }
  }, [fadeAudioContext, audioConnected, isEqualizerConnected, pitchValue, setPitchValue]);

  // Set fade active
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    setFadeActive(isPlaying, audio);
  }, [isPlaying, audioRef, setFadeActive, isWebAudioSupported]);

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
              dispatch({ type: 'SET_PLAY_ALL', mode: true, index: nextIndex });
              setActiveRegionIdDebounced(nextItem.id, 'playAllNext');
              jumpToTime(nextItem.start);
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
  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying, isInverted, jumpToTime, duration, canvasRef, getActivePlaybackBoundaries, isPlayAllMode, regions, playAllIndex, setActiveRegionIdDebounced]);

  // Phase 3 optimization effects
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
  }, [workerMetrics.totalPreloaded, workerMetrics.loadedComponents, isWorkerReady, addComponentToCache]);

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
  }, [audioRef, setDuration, setEndTime]);

  const handleCanPlay = useCallback(() => {}, []);

  // 🚀 Optimized pitch change handler
  const handlePitchChange = useCallback((newPitch) => {
    updatePitch(newPitch);
    
    if (setPitchValue(newPitch)) {
      console.log(`✅ Main: Pitch updated to ${newPitch}st (zero interruption)`);
    } else {
      console.log('🎵 Main: Pitch will be applied when audio connects');
    }
  }, [updatePitch, setPitchValue]);

  // 🚀 Optimized equalizer change handler
  const handleEqualizerChange = useCallback((type, data) => {
    if (!isEqualizerConnected) return;

    switch (type) {
      case 'band':
        const { index, value } = data;
        updateEqualizerBand(index, value);
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: {
            currentEqualizerValues: currentEqualizerValues.map((v, i) => i === index ? value : v)
          }
        });
        break;
      
      case 'preset':
        updateEqualizerValues(data.values);
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: { currentEqualizerValues: [...data.values] }
        });
        break;
      
      case 'reset':
        resetEqualizer();
        dispatch({
          type: 'SET_AUDIO_STATE',
          payload: { currentEqualizerValues: Array(10).fill(0) }
        });
        break;
      
      default:
        console.warn('🎵 Unknown equalizer action type:', type);
        break;
    }
  }, [isEqualizerConnected, updateEqualizerBand, updateEqualizerValues, resetEqualizer, currentEqualizerValues]);

  // 🚀 Optimized getCurrentEqualizerState
  const getCurrentEqualizerState = useCallback(() => {
    if (currentEqualizerValues.some(v => v !== 0)) {
      return currentEqualizerValues;
    }
    
    if (!isEqualizerConnected || !getEqualizerState) return null;
    
    const eqState = getEqualizerState();
    return eqState?.bands ? eqState.bands.map(band => band.gain) : null;
  }, [currentEqualizerValues, isEqualizerConnected, getEqualizerState]);

  // 🚀 Optimized region click handlers
  const handleRegionClick = useCallback((regionId, clickPosition = null) => {
    const selectedRegion = regions.find(r => r.id === regionId);
    if (!selectedRegion) return;
    
    const wasAlreadyActive = activeRegionId === regionId;
    
    if (wasAlreadyActive && clickPosition !== null) {
      jumpToTime(clickPosition);
    } else {
      setActiveRegionIdDebounced(regionId, 'regionClick');
      jumpToTime(selectedRegion.start);
    }
  }, [regions, jumpToTime, setActiveRegionIdDebounced, activeRegionId]);

  const handleMainSelectionClick = useCallback((clickPosition = null, options = {}) => {
    if (regions.length >= 1) {
      const now = Date.now();
      if (mainSelectionClickRef.current && now - mainSelectionClickRef.current < 100) return;
      mainSelectionClickRef.current = now;
      
      const wasAlreadyActive = activeRegionId === 'main';
      const isActivation = options.isActivation || false;
      
      if (isActivation) {
        setActiveRegionIdDebounced('main', 'mainSelectionClick');
        jumpToTime(startTime);
      } else if (wasAlreadyActive && clickPosition !== null) {
        jumpToTime(clickPosition);
      }
    } else {
      // 🔧 CRITICAL FIX: Handle main selection click when no regions exist
      if (clickPosition !== null) {
        jumpToTime(clickPosition);
      }
    }
  }, [regions.length, setActiveRegionIdDebounced, jumpToTime, startTime, activeRegionId]);

  // 🚀 Final render with all optimizations
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-6 py-6">
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
              onVolumeChange={updateVolume}
              onSpeedChange={updatePlaybackRate}
              onPitchChange={handlePitchChange}
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