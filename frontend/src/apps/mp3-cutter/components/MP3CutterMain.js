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
  useFadeHandlers,
  useSmartFadeConfigSync,
  usePitchHandler,
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
  SmartWaveformLazy, FadeControlsLazy, ExportPanelLazy, 
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
    startTime, endTime, duration, fadeIn, fadeOut, setStartTime, setEndTime, saveState, historySavedRef, isDragging
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
    regions, activeRegionId,
    onRegionUpdate: (regionId, newStart, newEnd) => {
      dispatch({ 
        type: 'SET_REGIONS', 
        regions: regions.map(r => r.id === regionId ? { ...r, start: newStart, end: newEnd } : r)
      });
    }
  });

  // 🚀 Active playback boundaries
  const getActivePlaybackBoundaries = useActivePlaybackBoundaries(activeRegionId, regions, startTime, endTime);

  // 🚀 Jump handlers
  const { handleJumpToStart, handleJumpToEnd } = useJumpHandlers(getActivePlaybackBoundaries, jumpToTime);

  // 🚀 Fade handlers
  const fadeHandlers = useFadeHandlers({ 
    fadeIn, fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig, saveState, dispatch 
  });

  // 🚀 Pitch handler
  const { handlePitchChange } = usePitchHandler(updatePitch, setPitchValue);

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
    setEndTime
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
    setActiveRegionIdDebounced
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

  const { handleDisplayStartTimeChange, handleDisplayEndTimeChange } = useTimeDisplayHandlers({
    activeRegionId,
    regions,
    startTime,
    endTime,
    timeDisplayValues,
    handleStartTimeChange,
    handleEndTimeChange,
    getRegionBoundaries,
    dispatch
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
    
    dispatch({ type: 'SET_PLAY_ALL', mode: true, index: 0 });
    
    const firstItem = sortedItems[0];
    setActiveRegionIdDebounced(firstItem.id, 'playAllRegions');
    jumpToTime(firstItem.start);
    
    if (!isPlaying) {
      setTimeout(() => originalTogglePlayPause(), 100);
    }
  }, [regions, startTime, endTime, duration, setActiveRegionIdDebounced, jumpToTime, isPlaying, originalTogglePlayPause, dispatch]);

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
  }, [undo, setStartTime, setEndTime, jumpToTime, dispatch]);

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
  }, [redo, setStartTime, setEndTime, jumpToTime, dispatch]);

  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    const newInvert = !isInverted;
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted: newInvert });
    setIsInverted(newInvert);
    updateFadeConfig({ fadeIn, fadeOut, startTime, endTime, isInverted: newInvert, duration });
    jumpToTime(newInvert ? (startTime >= 3 ? startTime - 3 : 0) : startTime);
  }, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime, updateFadeConfig]);

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
              onFadeInToggle={fadeHandlers.handleFadeInToggle}
              onFadeOutToggle={fadeHandlers.handleFadeOutToggle}
              onFadeInChange={fadeHandlers.handleFadeInChange}
              onFadeOutChange={fadeHandlers.handleFadeOutChange}
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
                  onFadeInChange={fadeHandlers.handleFadeInChange}
                  onFadeOutChange={fadeHandlers.handleFadeOutChange}
                  onFadeInDragEnd={fadeHandlers.handleFadeInDragEnd}
                  onFadeOutDragEnd={fadeHandlers.handleFadeOutDragEnd}
                  onFadeInToggle={fadeHandlers.handleFadeInToggle}
                  onFadeOutToggle={fadeHandlers.handleFadeOutToggle}
                  onPresetApply={fadeHandlers.handlePresetApply}
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