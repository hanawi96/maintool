import React, { useState, useEffect, useRef, useCallback, useMemo, lazy } from 'react';

// Import utilities (must be at top)
import { validateAudioFile, getAudioErrorMessage, getFormatDisplayName, generateCompatibilityReport, createSafeAudioURL, validateAudioURL } from '../utils/audioUtils';
import { createInteractionManager } from '../utils/interactionUtils';
import { getAutoReturnSetting } from '../utils/safeStorage';
import { audioApi } from '../services/audioApi'; // 🆕 **AUDIO API**: Import for silence removal

// Import hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useEnhancedWaveform } from '../hooks/useEnhancedWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useRealTimeFadeEffects } from '../hooks/useRealTimeFadeEffects';
import { useInteractionHandlers } from '../hooks/useInteractionHandlers';
import { useTimeChangeHandlers } from '../hooks/useTimeChangeHandlers';

// 🚀 PHASE 2: Advanced preloading hooks
import { 
  useProgressivePreloader, 
  useNetworkAwarePreloader, 
  useMemoryAwarePreloader,
  useInteractionPreloader
} from '../../../hooks/useAdvancedPreloader';

// 🚀 PHASE 3: Web Worker and Advanced Caching optimizations (Stable version)
import { 
  useWebWorkerPreloader,
  useIdleCallbackPreloader,
  useAdvancedComponentCache
} from '../../../hooks/usePhase3OptimizationStable';

// Import essential components (immediate load)
import FileInfo from './FileInfo';
import AudioErrorAlert from './AudioErrorAlert';
import ConnectionErrorAlert from './ConnectionErrorAlert';
import FileUploadSection from './FileUploadSection';

// 🚀 PHASE 2: Advanced lazy loading with custom loading states
import { 
  SmartWaveformLazy, 
  FadeControlsLazy, 
  ExportPanelLazy, 
  UnifiedControlBarLazy,
  preloadHeavyComponents
} from '../../../components/LazyComponents';

// 🚀 Additional lazy components for Phase 2
const SilenceDetection = lazy(() => import('./SilenceDetection'));

// 🔥 **ULTRA-LIGHT AUDIO COMPONENT**: Minimized for best performance
const SafeAudioElement = React.memo(({ 
  audioRef, 
  audioFile, 
  onError, 
  onLoadStart, 
  onCanPlay, 
  onLoadedMetadata 
}) => {
  // 🔥 **HOOKS FIRST**: All hooks before any early returns
  const urlValidation = useMemo(() => {
    if (!audioFile?.url) return { valid: false };
    return validateAudioURL(audioFile.url);
  }, [audioFile?.url]);

  useEffect(() => {
    if (audioFile?.url && urlValidation.valid) {
      // 🔥 **SILENT SUCCESS**: No unnecessary logging
    }
  }, [audioFile?.url, urlValidation.valid]);

  // 🔥 **CONDITIONAL RENDER AFTER HOOKS**
  if (!audioFile?.url || !urlValidation.valid) {
    return null;
  }

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

const MP3CutterMain = React.memo(() => {
  // 🔥 **ESSENTIAL HOOKS ONLY**
  const { 
    audioFile, 
    uploadFile, 
    isUploading, 
    uploadError, 
    testConnection,
    uploadProgress
  } = useFileUpload();
  
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    togglePlayPause,
    jumpToTime,
    updateVolume,
    updatePlaybackRate,
    audioRef,
    setCurrentTime,
    setDuration,
    setIsPlaying
  } = useAudioPlayer();

  const {
    waveformData,
    startTime,
    endTime,
    isDragging,
    hoveredHandle,
    generateWaveform,
    setStartTime,    setEndTime,
    setIsDragging,
    setHoveredHandle,
    canvasRef,
    isGenerating,
    enhancedFeatures
  } = useEnhancedWaveform();

  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();

  // 🎯 **REAL-TIME FADE EFFECTS**: Hook để apply fade effects real-time khi nhạc đang phát
  const {
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    isWebAudioSupported
  } = useRealTimeFadeEffects();
  // 🚀 **PHASE 3: ULTIMATE OPTIMIZATION HOOKS**
  const {
    isReady: isWorkerReady,
    isSupported: isWorkerSupported,
    metrics: workerMetrics,
    addToPreloadQueue,
    // startPreloading, // Currently not used
    preloadCriticalComponents
  } = useWebWorkerPreloader();

  const { 
    scheduleIdlePreload,
    isIdle
  } = useIdleCallbackPreloader();

  const {
    addToCache: addComponentToCache,
    // getFromCache: getComponentFromCache, // Currently not used
  } = useAdvancedComponentCache();
  // 🔥 **MINIMAL STATE**
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [normalizeVolume, setNormalizeVolume] = useState(false); // 🔊 **VOLUME NORMALIZATION**: State for volume normalization
  const [isConnected, setIsConnected] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);  const [compatibilityReport, setCompatibilityReport] = useState(null);  // 🆕 **INVERT SELECTION STATE**: Track invert selection mode
  const [isInverted, setIsInverted] = useState(false);  // 🆕 **SILENCE PANEL STATE**: Track silence detection panel visibility
  const [isSilencePanelOpen, setIsSilencePanelOpen] = useState(false);
  // 🆕 **SILENCE REGIONS STATE**: Track real-time silence regions for overlay
  const [silenceRegions, setSilenceRegions] = useState([]);
  // 🆕 **SKIP SILENCE STATE**: Track whether to skip silence during playback
  const [skipSilenceEnabled, setSkipSilenceEnabled] = useState(false);  // 🆕 **SELECTED SILENCE REGIONS**: Track selected silence regions for deletion
  const [selectedSilenceRegions, setSelectedSilenceRegions] = useState([]);
  // 🆕 **SILENCE DETECTION PROCESSING**: Track if silence detection is currently running
  const [isDetectingSilence, setIsDetectingSilence] = useState(false);

  // 🔥 **PERFORMANCE REFS**
  const animationStateRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);
  const lastPhase3LogKeyRef = useRef(''); // Throttle Phase 3 logging

  // 🎯 **AUDIO CONTEXT**: Audio context for interactions with fade config
  const audioContext = useMemo(() => ({
    audioRef,
    setCurrentTime,
    jumpToTime,
    isPlaying,
    fadeIn,
    fadeOut,
    startTime,
    endTime,
    isInverted, // 🆕 **INVERT MODE**: Pass invert state to interaction handlers
    updateFadeConfig
  }), [audioRef, setCurrentTime, jumpToTime, isPlaying, fadeIn, fadeOut, startTime, endTime, isInverted, updateFadeConfig]);

  // 🎯 **INTERACTION HANDLERS**: Extract interaction logic using custom hook
  const {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave
  } = useInteractionHandlers({
    canvasRef,
    duration,
    startTime,
    endTime,
    audioRef,
    isPlaying,
    fadeIn,
    fadeOut,
    
    // 🔧 **FIX MISSING PARAMETER**: Add isDragging state
    isDragging, // 🆕 **ADDED**: Pass isDragging state to fix undefined error
    
    // State setters
    setStartTime,
    setEndTime,
    setIsDragging,
    setHoveredHandle,
    setCurrentTime,
    
    // Utilities
    jumpToTime,
    saveState,
    interactionManagerRef,
    
    // 🆕 **AUDIO CONTEXT**: Pass full audio context with isInverted
    audioContext
  });

  // 🎯 **TIME CHANGE HANDLERS**: Extract time change logic using custom hook
  const {
    handleStartTimeChange: originalHandleStartTimeChange,
    handleEndTimeChange: originalHandleEndTimeChange,
    cleanup: cleanupTimeHandlers // 🆕 **EXPOSE CLEANUP**: Get cleanup function
  } = useTimeChangeHandlers({
    startTime,
    endTime,
    duration,
    fadeIn,
    fadeOut,
    setStartTime,
    setEndTime,
    saveState
  });

  // 🆕 **ENHANCED START TIME HANDLER**: Auto-jump cursor to new start point
  const handleStartTimeChange = useCallback((newStartTime) => {
    
    // 1. Update start time first
    originalHandleStartTimeChange(newStartTime);
    
    // 2. Jump main cursor based on invert mode
    let targetCursorTime;
    if (isInverted) {
      // 🆕 **INVERT MODE**: Jump cursor 3s before left handle
      targetCursorTime = Math.max(0, newStartTime - 3);
    } else {
      // 🎯 **NORMAL MODE**: Jump cursor to start point
      targetCursorTime = newStartTime;
    }
    
    jumpToTime(targetCursorTime);
    
    // No need to change play state - if it was playing, it continues; if paused, stays paused
  }, [originalHandleStartTimeChange, jumpToTime, isPlaying, startTime, isInverted]);

  // 🆕 **ENHANCED END TIME HANDLER**: Auto-jump cursor to 3 seconds before new end point
  const handleEndTimeChange = useCallback((newEndTime) => {
    
    // 1. Update end time first
    originalHandleEndTimeChange(newEndTime);
    
    // 2. Calculate cursor position: 3 seconds before new end point, but not before start time
    const targetCursorTime = Math.max(startTime, newEndTime - 3);
    
    // 3. Jump main cursor to calculated position
    jumpToTime(targetCursorTime);
    
    // 4. Log behavior based on play state and position
    const positionDesc = targetCursorTime === startTime ? 'start point (end point too close)' : `${targetCursorTime.toFixed(1)}s (3s before end)`;

    
    // No need to change play state - if it was playing, it continues; if paused, stays paused
  }, [originalHandleEndTimeChange, jumpToTime, isPlaying, endTime, startTime]);

  // 🔥 **ESSENTIAL SETUP ONLY**
  useEffect(() => {
    if (!interactionManagerRef.current) {
      interactionManagerRef.current = createInteractionManager();
      
      // 🔧 **REGISTER WITH DEBUG SYSTEM**
      if (window.mp3CutterInteractionDebug) {
        window.mp3CutterInteractionDebug.registerManager(interactionManagerRef.current);
      }

    }
    
    // 🧹 **CLEANUP ON UNMOUNT**: Cleanup time handlers để prevent memory leaks
    return () => {
      if (cleanupTimeHandlers) {
        cleanupTimeHandlers();
      }
    };
  }, [cleanupTimeHandlers]);

  useEffect(() => {
    const report = generateCompatibilityReport();
    setCompatibilityReport(report);
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await testConnection();
        setIsConnected(connected);
        if (connected) setConnectionError(null);
      } catch (error) {
        setIsConnected(false);
        setConnectionError('Backend server is not available. Please start the backend server.');
      }
    };
    checkConnection();
  }, [testConnection]);

  // 🎯 NEW: File upload handler with audio validation
  const handleFileUpload = useCallback(async (file) => {
    // 🆕 RESET PREVIOUS ERRORS
    setAudioError(null);
    setFileValidation(null);
    
    // 🆕 **RESET STATES**: Reset tất cả states cho file mới
    setIsInverted(false);
    
    // 🚀 **SET GLOBAL FILE REFERENCE**: Make file available to Web Worker
    window.currentAudioFile = file;
    
    try {
      // 🆕 1. VALIDATE AUDIO FILE FIRST
      const validation = validateAudioFile(file);
      setFileValidation(validation);
        // 🆕 SHOW WARNINGS BUT CONTINUE IF NO ERRORS
      if (validation.warnings.length > 0) {
        // Warnings handled silently for performance
      }
      
      // 🆕 STOP IF VALIDATION FAILED
      if (!validation.valid) {
        const errorMsg = validation.errors.join('; ');
        
        // 🆕 SET DETAILED ERROR INFO
        setAudioError({
          type: 'validation',
          title: 'File Validation Failed',
          message: errorMsg,
          suggestions: [
            'Convert to MP3 or WAV format',
            'Check if file is corrupted',
            'Try a smaller file size'
          ],
          supportedFormats: ['MP3', 'WAV', 'M4A', 'MP4']
        });
        return;
      }

      // 🎯 2. Test connection first if not already connected
      if (isConnected === false) {
        const connected = await testConnection();
        if (!connected) {
          throw new Error('Backend server is not available. Please start the backend server.');
        }
        setIsConnected(true);
        setConnectionError(null);
      }

      // 🎯 3. UPLOAD FILE AND GET IMMEDIATE AUDIO URL
      await uploadFile(file);
      
      // 🔥 **IMMEDIATE URL CREATION**: Create URL directly from file for immediate use
      const immediateAudioUrl = createSafeAudioURL(file);
      
      if (!immediateAudioUrl) {
        throw new Error('Failed to create audio URL for immediate playback');
      }
      
      // 🔥 **IMMEDIATE AUDIO SETUP**: Set audio source right away
      if (audioRef.current) {
        try {
          audioRef.current.src = immediateAudioUrl;
          audioRef.current.load();
          
          setAudioError(null);
          
        } catch (loadError) {
          setAudioError({
            type: 'load',
            title: 'Audio Load Failed',
            message: 'Failed to load audio file for playback.',
            suggestions: ['Try a different file', 'Check if the file is corrupted']
          });
        }
      }
      
      // 🎯 4. GENERATE WAVEFORM
      const waveformResult = await generateWaveform(file);
      
      // 🎯 5. Initialize history with safe duration
      const audioDuration = waveformResult.duration || audioRef.current?.duration || duration || 0;
      if (audioDuration > 0) {
        const initialState = { 
          startTime: 0, 
          endTime: audioDuration, 
          fadeIn: 0, 
          fadeOut: 0,
          isInverted: false // 🆕 **RESET INVERT**: Reset invert mode for new file
        };
        saveState(initialState);
      }
      
    } catch (error) {
      // 🆕 ENHANCED ERROR HANDLING
      setAudioError({
        type: 'upload',
        title: 'Upload Failed',
        message: error.message,
        suggestions: [
          'Check your internet connection',
          'Try a different file',
          'Restart the backend server'
        ]
      });
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection]);

  // 🔥 **SIMPLIFIED AUDIO SETUP**: SafeAudioElement đã handle src setting
  useEffect(() => {
    const audio = audioRef.current;
    
    // 🔥 **EARLY EXIT**: If no audio element (SafeAudioElement not rendered yet)
    if (!audio || !audioFile?.url) {
      return;
    }
    
    // 🔥 **AUDIO FILE READY**: Setup interaction manager when audio is ready
    // 🎯 Reset interaction manager for new file
    if (interactionManagerRef.current) {
      interactionManagerRef.current.reset();
    }

    // 🔥 **CLEAR PREVIOUS ERRORS**: Clear any audio errors from previous files
    setAudioError(null);
  }, [audioFile?.url, audioFile?.name, audioRef, setAudioError]); // 🔥 **OPTIMIZED DEPS**: Added missing dependencies
    
  // 🔥 **UPDATE ANIMATION STATE REF**: Cập nhật ref thay vì tạo object mới
  useEffect(() => {
    animationStateRef.current = {
      isPlaying,
      startTime,
      endTime
    };
  }, [isPlaying, startTime, endTime]);

  // 🆕 **WEB AUDIO SETUP**: Connect audio element với Web Audio API cho real-time fade effects
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url || !isWebAudioSupported) return;
    
    // 🎯 **CONNECT AUDIO** với Web Audio graph
    const setupWebAudio = async () => {
      try {
        const success = await connectAudioElement(audio);        if (success) {
          // Web Audio API connected successfully
        } else {
          // Failed to connect Web Audio API
        }
      } catch (error) {
        // Web Audio setup failed - continue without Web Audio features
      }
    };
    
    // 🆕 **DELAY SETUP**: Delay setup slightly để đảm bảo audio element ready
    const setupTimeout = setTimeout(setupWebAudio, 100);
    
    return () => clearTimeout(setupTimeout);
  }, [audioFile?.url, audioRef, connectAudioElement, isWebAudioSupported]); // 🔥 **OPTIMIZED DEPS**: Added missing audioRef

  // 🆕 **PLAYBACK STATE SYNC**: Start/stop fade effects khi playback state thay đổi
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    
    setFadeActive(isPlaying, audio);
  }, [isPlaying, audioRef, setFadeActive, isWebAudioSupported]); // 🔥 **OPTIMIZED DEPS**: Added missing audioRef

  // History handlers
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      
      setStartTime(prevState.startTime);
      setEndTime(prevState.endTime);
      setFadeIn(prevState.fadeIn);
      setFadeOut(prevState.fadeOut);
      // 🆕 **RESTORE INVERT STATE**: Restore invert selection state
      if (prevState.isInverted !== undefined) {
        setIsInverted(prevState.isInverted);
      }
      
      // 🆕 **JUMP CURSOR TO START POINT**: Move cursor to start point of restored state
      jumpToTime(prevState.startTime);
      
    }
  }, [undo, setStartTime, setEndTime, jumpToTime]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      
      setStartTime(nextState.startTime);
      setEndTime(nextState.endTime);
      setFadeIn(nextState.fadeIn);
      setFadeOut(nextState.fadeOut);
      // 🆕 **RESTORE INVERT STATE**: Restore invert selection state
      if (nextState.isInverted !== undefined) {
        setIsInverted(nextState.isInverted);
      }
      
      // 🆕 **JUMP CURSOR TO START POINT**: Move cursor to start point of restored state
      jumpToTime(nextState.startTime);
      
    }
  }, [redo, setStartTime, setEndTime, jumpToTime]);

  // Player jump handlers
  const handleJumpToStart = useCallback(() => {
    jumpToTime(startTime);
  }, [jumpToTime, startTime]);
  
  const handleJumpToEnd = useCallback(() => {
    jumpToTime(endTime);
  }, [jumpToTime, endTime]);

  // 🆕 **OPTIMIZED FADE HANDLERS**: Apply fade effects với real-time updates
  const handleFadeInChange = useCallback((newFadeIn) => {
    setFadeIn(newFadeIn);
    
    // 🔥 **IMMEDIATE CONFIG UPDATE**: Update ngay lập tức cho real-time effects
    const newConfig = {
      fadeIn: newFadeIn,
      fadeOut,
      startTime,
      endTime,
      isInverted, // 🆕 **INVERT MODE**: Pass invert state for correct fade logic
      duration // 🆕 **DURATION**: Required for correct invert mode fadeout
    };
    
    // 🚀 **INSTANT UPDATE**: Apply config ngay lập tức
    updateFadeConfig(newConfig);
  }, [fadeOut, startTime, endTime, isInverted, duration, updateFadeConfig]);

  const handleFadeOutChange = useCallback((newFadeOut) => {
    setFadeOut(newFadeOut);
    
    // 🔥 **IMMEDIATE CONFIG UPDATE**: Update ngay lập tức cho real-time effects
    const newConfig = {
      fadeIn,
      fadeOut: newFadeOut,
      startTime,
      endTime,
      isInverted, // 🆕 **INVERT MODE**: Pass invert state for correct fade logic
      duration // 🆕 **DURATION**: Required for correct invert mode fadeout
    };
    
    // 🚀 **INSTANT UPDATE**: Apply config ngay lập tức
    updateFadeConfig(newConfig);
  }, [fadeIn, startTime, endTime, isInverted, duration, updateFadeConfig]);

  // 🆕 **FADE DRAG HISTORY CALLBACKS**: Lưu lịch sử khi kết thúc drag fade sliders
  const handleFadeInDragEnd = useCallback((finalFadeIn) => {
    saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted });
  }, [startTime, endTime, fadeOut, saveState, isInverted]);

  const handleFadeOutDragEnd = useCallback((finalFadeOut) => {
    saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted });
  }, [startTime, endTime, fadeIn, saveState, isInverted]);

  // 🆕 **PRESET APPLY CALLBACK**: Lưu lịch sử khi apply preset
  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => {
    setFadeIn(newFadeIn);
    setFadeOut(newFadeOut);
    
    // Update real-time config
    const newConfig = {
      fadeIn: newFadeIn,
      fadeOut: newFadeOut,
      startTime,
      endTime,
      isInverted, // 🆕 **INVERT MODE**: Pass invert state for correct fade logic
      duration // 🆕 **DURATION**: Required for correct invert mode fadeout
    };
    updateFadeConfig(newConfig);
    
    // Save to history
    saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted });
  }, [startTime, endTime, updateFadeConfig, saveState, isInverted, duration]);

  // Drag and drop handler
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // 🔥 **PLAY STATE TRIGGER**: Trigger animation khi play state thay đổi
  useEffect(() => {
    // 🔥 **UPDATE REF**: Cập nhật ref ngay lập tức
    animationStateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  // 🔥 **ULTRA-LIGHT AUDIO EVENT LISTENERS**: Chỉ setup khi cần thiết
  useEffect(() => {
    const audio = audioRef.current;
    
    // 🔥 **EARLY EXIT**: Chỉ setup event listeners khi audio element đã được render
    if (!audio || !audioFile?.url) {
      return;
    }

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;
      
      // 🆕 CLEAR AUDIO ERROR ON SUCCESSFUL LOAD
      setAudioError(null);
      
      // 🆕 BATCH STATE UPDATES: Use requestIdleCallback for non-critical updates
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setDuration(audioDuration);
          setEndTime(audioDuration);
        });
      } else {
        setTimeout(() => {
          setDuration(audioDuration);
          setEndTime(audioDuration);
        }, 0);
      }
    };

    const handleEnded = () => {
      // 🆕 BATCH STATE UPDATES: Prevent setState conflicts
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          setIsPlaying(false);
          setCurrentTime(audio.duration);
        });
      } else {
        setTimeout(() => {
          setIsPlaying(false);
          setCurrentTime(audio.duration);
        }, 0);
      }
    };

    // 🆕 OPTIMIZED: Use debounced updates for non-critical state changes
    const handlePlay = () => {
      // 🚀 **DEBOUNCED STATE UPDATE**: Debounce để tránh conflicts
      const updateTimeout = setTimeout(() => setIsPlaying(true), 16); // 1 frame delay
      return () => clearTimeout(updateTimeout);
    };
    
    const handlePause = () => {
      // 🚀 **DEBOUNCED STATE UPDATE**: Debounce để tránh conflicts  
      const updateTimeout = setTimeout(() => setIsPlaying(false), 16); // 1 frame delay
      return () => clearTimeout(updateTimeout);
    };

    // 🔥 **ULTRA-LIGHT ERROR HANDLING**: Minimal error processing
    const handleError = (e) => {
      const error = e.target.error;
      const filename = audioFile?.name || 'audio file';
      
      setTimeout(() => {
        console.error('❌ [AudioEvents] Error Details:', {
          code: error?.code,
          message: error?.message,
          filename: filename,
          currentSrc: audio.src
        });
      }, 0);
      
      // 🔥 **SIMPLIFIED ERROR**: Generate error message without heavy processing
      const errorDetails = getAudioErrorMessage(error, filename);
      
      console.error('❌ [AudioEvents] Error Analysis:', errorDetails);
      
      // 🔥 **LIGHTWEIGHT ERROR STATE**: Set minimal error state
      setAudioError({
        type: 'playback',
        title: errorDetails.title,
        message: errorDetails.message,
        suggestion: errorDetails.suggestion,
        code: errorDetails.code,
        filename: errorDetails.filename,
        supportedFormats: errorDetails.supportedFormats,
        compatibilityInfo: fileValidation?.info?.browserSupport,
        detectedFormat: fileValidation?.info?.detectedMimeType ? 
          getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
      });
      
      // 🔥 **AUTO-STOP**: Auto-stop playback on error
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => setIsPlaying(false));
      } else {
        setTimeout(() => setIsPlaying(false), 0);
      }
    };

    // 🔥 **SAFE EVENT LISTENER SETUP**: Đảm bảo audio element tồn tại
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      // 🔥 **SAFE CLEANUP**: Kiểm tra audio element trước khi cleanup
      if (audio) {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('error', handleError);
      }
    };
  }, [audioFile?.name, audioFile?.url, audioRef, setCurrentTime, setDuration, setIsPlaying, setEndTime, fileValidation, setAudioError]); // 🔥 **FIXED DEPS**: Added missing dependencies

  // 🚀 **ULTRA-SMOOTH MAIN ANIMATION LOOP** - Tối ưu coordination với tooltip animation
  useEffect(() => {
    let animationId = null;
    let frameCount = 0;
    let lastLogTime = 0;
      const updateCursor = () => {
      if (isPlaying && audioRef.current) {
        const audioCurrentTime = audioRef.current.currentTime;
        
        // 🔥 **INSTANT CURRENTTIME UPDATE** - Cập nhật ngay lập tức cho tooltip sync
        setCurrentTime(audioCurrentTime);

        // 🆕 **SKIP SILENCE LOGIC**: Skip only selected silence regions when enabled
        if (skipSilenceEnabled && selectedSilenceRegions.length > 0) {
          // Check if current time is within any selected silence region
          for (const region of selectedSilenceRegions) {
            if (audioCurrentTime >= region.start && audioCurrentTime < region.end) {
              // Skip to the end of the selected silence region
              const skipToTime = Math.min(region.end, audioRef.current.duration);
              audioRef.current.currentTime = skipToTime;
              setCurrentTime(skipToTime);
              console.log(`🔇 [SkipSilence] Skipped selected region from ${audioCurrentTime.toFixed(2)}s to ${skipToTime.toFixed(2)}s (${(skipToTime - audioCurrentTime).toFixed(2)}s skipped)`);
              break; // Only skip one region per frame
            }
          }
        }
        
        // 🆕 **INVERT MODE LOGIC**: Smart playback with edge case handling
        if (isInverted && endTime > startTime) {
          // 🚀 **SKIP REGION LOGIC**: When cursor reaches start point, skip to end
          if (audioCurrentTime >= startTime - 0.05 && audioCurrentTime < endTime) {
            const hasPostRegion = endTime < audioRef.current.duration;
            
            if (hasPostRegion) {
              audioRef.current.currentTime = endTime;
              setCurrentTime(endTime);
            } else {
              // 🎯 **NO POST REGION**: Stop at start point (end = duration)
              audioRef.current.pause();
              setIsPlaying(false);
              audioRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              return;
            }
          }
          
          // 🎯 **END OF AUDIO LOGIC**: When reaching end of audio in invert mode
          if (audioCurrentTime >= audioRef.current.duration - 0.05) {
            const autoReturnEnabled = getAutoReturnSetting();
            const preRegionStart = startTime >= 3 ? startTime - 3 : 0;
            
            if (autoReturnEnabled && audioRef.current) {
              // ✅ **LOOP MODE**: Loop back to pre-region start
              audioRef.current.currentTime = preRegionStart;
              setCurrentTime(preRegionStart);
            } else if (audioRef.current) {
              // ✅ **STOP MODE**: Pause and return to pre-region start
              audioRef.current.pause();
              setIsPlaying(false);
              audioRef.current.currentTime = preRegionStart;
              setCurrentTime(preRegionStart);
              return;
            }
          }
        } else {
          // 🎯 **NORMAL MODE LOGIC**: Original auto-return logic for normal selection
          if (endTime > startTime && audioCurrentTime >= endTime - 0.05) {
            const autoReturnEnabled = getAutoReturnSetting();
            
            if (autoReturnEnabled && audioRef.current) {
              // ✅ **LOOP MODE**: Auto-return BẬT → loop về startTime và tiếp tục phát
              audioRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              // Continue playing (không pause)
              
            } else if (audioRef.current) {
              // ✅ **STOP MODE**: Auto-return TẮT → pause và quay cursor về startTime
              audioRef.current.pause();
              
              // 🎯 **CURSOR RESET**: Quay cursor về startTime như yêu cầu
              audioRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              
              return; // Exit update loop
            }
          }
        }
          // 🔧 **PERFORMANCE TRACKING** - Track framerate without logging
        frameCount++;
        const now = performance.now();
        if (now - lastLogTime > 2000) { // Reset counters every 2 seconds
          frameCount = 0;
          lastLogTime = now;
        }
        
        animationId = requestAnimationFrame(updateCursor);
      }
    };
      // 🎯 **SINGLE ANIMATION CONTROL** - Chỉ start khi thực sự cần thiết
    if (isPlaying && audioRef.current) {
      animationId = requestAnimationFrame(updateCursor);
    }
    
    // 🧹 **CLEANUP**: Prevent memory leaks
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying, isInverted, skipSilenceEnabled, selectedSilenceRegions]);

  // 🆕 **INITIAL CONFIG SYNC**: Only sync on startup and when selection changes (not fade values)
  const fadeConfigSyncedRef = useRef(false); // 🆕 **PREVENT MULTIPLE SYNCS**: Track if initial sync done
  
  useEffect(() => {
    // 🎯 **SYNC ONLY ON MOUNT OR SELECTION CHANGES**: Update config when startTime/endTime change
    // Skip if this is triggered by fade value changes during real-time updates
    if (!fadeConfigSyncedRef.current || 
        (fadeConfigSyncedRef.current && (startTime !== fadeConfigSyncedRef.current.lastStartTime || endTime !== fadeConfigSyncedRef.current.lastEndTime))) {
      
      updateFadeConfig({
        fadeIn,
        fadeOut,
        startTime,
        endTime,
        isInverted, // 🆕 **INVERT MODE**: Pass invert state for correct fade logic
        duration // 🆕 **DURATION**: Required for correct invert mode fadeout
      });
      
      // 🆕 **TRACK SYNC STATE**: Remember last synced values
      fadeConfigSyncedRef.current = {
        lastStartTime: startTime,
        lastEndTime: endTime,
        lastFadeIn: fadeIn,
        lastFadeOut: fadeOut
      };
    }
  }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig, isInverted, duration]); // 🚀 **ALL DEPS**: But logic prevents fade-only updates

  // 🔥 **AUDIO EVENT HANDLERS**: Extract handlers for SafeAudioElement
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const audioDuration = audio.duration;
    
    // 🆕 CLEAR AUDIO ERROR ON SUCCESSFUL LOAD
    setAudioError(null);
    
    // 🆕 BATCH STATE UPDATES: Use requestIdleCallback for non-critical updates
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        setDuration(audioDuration);
        setEndTime(audioDuration);
      });
    } else {
      setTimeout(() => {
        setDuration(audioDuration);
        setEndTime(audioDuration);
      }, 0);
    }
  }, [audioRef, setAudioError, setDuration, setEndTime]);
  const handleCanPlay = useCallback(() => {
    // Audio can play - ready for playback
  }, []);
  const handleError = useCallback((e) => {
    const error = e.target.error;
    const filename = audioFile?.name || 'audio file';
    
    // 🔥 **SIMPLIFIED ERROR**: Generate error message without heavy processing
    const errorDetails = getAudioErrorMessage(error, filename);
    
    // 🔥 **LIGHTWEIGHT ERROR STATE**: Set minimal error state
    setAudioError({
      type: 'playback',
      title: errorDetails.title,
      message: errorDetails.message,
      suggestion: errorDetails.suggestion,
      code: errorDetails.code,
      filename: errorDetails.filename,
      supportedFormats: errorDetails.supportedFormats,
      compatibilityInfo: fileValidation?.info?.browserSupport,
      detectedFormat: fileValidation?.info?.detectedMimeType ? 
        getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
    });
    
    // 🔥 **AUTO-STOP**: Auto-stop playback on error
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => setIsPlaying(false));
    } else {
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [audioFile?.name, fileValidation, setAudioError, setIsPlaying]);

  // 🆕 **INVERT SELECTION HANDLER**: Smart handler for inverting selection with playback
  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    
    // 🎯 **HISTORY SAVE**: Save current state before inversion
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted });    // 🚀 **TOGGLE INVERT MODE**: Simply toggle the invert state
    const newInvertState = !isInverted;
    setIsInverted(newInvertState);
    
    // 🆕 **FORCE FADE CONFIG UPDATE**: Update fade config to ensure visual restoration
    const newFadeConfig = {
      fadeIn,
      fadeOut,
      startTime,
      endTime,
      isInverted: newInvertState, // 🔥 **USE NEW STATE**: Use the new invert state
      duration
    };
    updateFadeConfig(newFadeConfig);
    
    // 🆕 **SMART PLAYBACK LOGIC**: Calculate playback segments with edge cases
    if (newInvertState) {
      // 🎯 **ENABLING INVERT MODE**: Smart cursor positioning and playback
      const preRegionStart = startTime >= 3 ? startTime - 3 : 0;
      
      jumpToTime(preRegionStart);
    } else {
      // 🔙 **DISABLING INVERT MODE**: Return to normal
      jumpToTime(startTime);
    }}, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime, updateFadeConfig]);  // 🆕 **SILENCE PANEL TOGGLE HANDLER**: Handler to toggle silence detection panel với auto-trigger
  const handleToggleSilencePanel = useCallback(() => {
    setIsSilencePanelOpen(prev => {
      const newIsOpen = !prev;
      
      if (!newIsOpen) {
        // Clear silence regions when closing panel
        setSilenceRegions([]);
        console.log('🚀 [Panel] Silence panel closed - clearing regions');
      } else {
        // ✅ **AUTO-TRIGGER**: Auto-trigger silence detection khi panel mở
        console.log('🚀 [Panel] Silence panel opened - checking for auto-trigger');
        
        // 🎯 **SMART AUTO-TRIGGER**: Use ref to call detectSilence directly
        setTimeout(() => {
          if (silenceDetectionRef.current && audioFile?.filename) {
            const cacheInfo = silenceDetectionRef.current.getCacheInfo();
            console.log('🔧 [Panel] Cache info:', cacheInfo);
            
            if (cacheInfo.isStale || cacheInfo.regionsCount === 0) {
              console.log('🔥 [Panel] No cache available - triggering detectSilence via ref');
              silenceDetectionRef.current.detectSilence();
            } else {
              console.log('⚡ [Panel] Cache available - skipping auto-trigger');
            }
          }
        }, 150);
      }
      
      return newIsOpen;
    });
  }, [audioFile?.filename]);
  // 🆕 **SILENCE PREVIEW HANDLER**: Handler for real-time silence preview updates
  const handleSilencePreviewUpdate = useCallback((regions) => {
    setSilenceRegions(regions || []);
  }, []);

  // 🆕 **SKIP SILENCE HANDLER**: Handler for skip silence setting changes
  const handleSkipSilenceChange = useCallback((enabled) => {
    setSkipSilenceEnabled(enabled);
    
    // 🎯 **SMART PLAYBACK CONTROL**: Play from start when enabled, pause when disabled
    if (enabled) {
      // Jump to start point and play
      jumpToTime(startTime);
      if (!isPlaying) {
        togglePlayPause();
      }
    } else {
      // Pause playback when disabled
      if (isPlaying) {
        togglePlayPause();
      }
    }
  }, [startTime, isPlaying, jumpToTime, togglePlayPause]);

  // 🚀 **PHASE 2: ADVANCED PRELOADING HOOKS** - Smart preloading system
  const { triggerPreload } = useProgressivePreloader();
  const { shouldPreload: networkShouldPreload } = useNetworkAwarePreloader();
  const { shouldPreload: memoryShouldPreload } = useMemoryAwarePreloader();
  const { trackInteraction } = useInteractionPreloader();
  const lastPhase2LogKeyRef = useRef(''); // Throttle Phase 2 logging

  // 🚀 **PHASE 2: SMART PRELOADING** - Preload heavy components when user starts interacting
  useEffect(() => {
    if (audioFile) {
      // Check if we should preload based on network/memory conditions
      const canPreload = networkShouldPreload('large') && memoryShouldPreload() !== false;      if (canPreload) {
        // Only track once per file
        if (lastPhase2LogKeyRef.current !== audioFile.name) {
          lastPhase2LogKeyRef.current = audioFile.name;
        }
        
        // Trigger progressive preloading
        triggerPreload('fileLoad');
        preloadHeavyComponents();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFile?.name]); // Only depend on filename to prevent re-trigger

  // 🎯 **INTERACTION TRACKING** - Track user interactions for smart preloading
  const handleUserInteraction = useCallback((type) => {
    trackInteraction(type);
    triggerPreload('userInteraction');
  }, [trackInteraction, triggerPreload]);
  // 🎯 **PERFORMANCE MONITORING** - Track component load times
  useEffect(() => {
    if (waveformData.length > 0) {
      // Heavy components are likely loaded
      triggerPreload('waveformReady');
    }
  }, [waveformData.length, triggerPreload]);

  // 🚀 **PHASE 3: ULTIMATE OPTIMIZATION INITIALIZATION**
  useEffect(() => {
    // Throttle logging để tránh spam console
    const logKey = `${isWorkerSupported}-${isWorkerReady}-${!!audioFile}`;
    
    if (logKey !== lastPhase3LogKeyRef.current) {
      lastPhase3LogKeyRef.current = logKey;
    }
    
    // Initialize Web Worker preloading
    if (isWorkerSupported && !isWorkerReady) {
      console.log('⏳ [Phase3] Waiting for Web Worker to be ready...');
    }
    
    if (isWorkerReady) {
      console.log('✅ [Phase3] Web Worker ready - starting critical component preloading');
      
      // Preload critical components via Web Worker
      const preloadedCount = preloadCriticalComponents();
      if (preloadedCount > 0) {
        console.log(`🎯 [Phase3] Queued ${preloadedCount} critical components for Web Worker preloading`);
      }
    }
    
    // Schedule idle preloading for non-critical components
    if (audioFile) {
      scheduleIdlePreload(() => {
        console.log('🛌 [Phase3] Executing idle preload for secondary components');
        // Preload secondary components during idle time
        addToPreloadQueue('SilenceDetectionPanel', '../apps/mp3-cutter/components/UnifiedControlBar/SilenceDetectionPanel', 2);
      });
    }
    
    // 🔧 **SIMPLIFIED LOGGING**: Log status with minimal dependencies
    if (logKey !== lastPhase3LogKeyRef.current) {
      console.log('📊 [Phase3] Status:', {
        workerSupported: isWorkerSupported,
        workerReady: isWorkerReady,
        isIdle,
        note: 'Cache stats available via getCacheSize() and getCacheKeys() methods'
      });
    }
    
  }, [isWorkerSupported, isWorkerReady, audioFile, preloadCriticalComponents, 
      scheduleIdlePreload, addToPreloadQueue, isIdle]); // 🔧 **REMOVED cacheStats**: Removed to prevent infinite loop

  // 🚀 **PHASE 3: PERFORMANCE MONITORING & OPTIMIZATION**
  useEffect(() => {
    if (isWorkerReady && workerMetrics.totalPreloaded > 0) {
      console.log('📊 [Phase3] Web Worker Performance Metrics:', {
        totalPreloaded: workerMetrics.totalPreloaded,
        averageLoadTime: `${workerMetrics.averageLoadTime.toFixed(2)}ms`,
        failureRate: `${((workerMetrics.failureCount / workerMetrics.totalPreloaded) * 100).toFixed(1)}%`,
        queueLength: workerMetrics.queueLength
      });
      
      // 🔧 **THROTTLED CACHE UPDATES**: Only update cache if components are actually new
      workerMetrics.loadedComponents.forEach(componentName => {
        // Use setTimeout to prevent blocking and infinite loops
        setTimeout(() => {
          addComponentToCache(componentName, null, { 
            source: 'webWorker',
            preloadTime: Date.now() 
          });
        }, 0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerMetrics.totalPreloaded, isWorkerReady]); // Remove addComponentToCache from deps to prevent loop

  // Helper function to compare regions with floating point tolerance
  const regionsEqual = useCallback((r1, r2) => {
    const tolerance = 0.001; // 1ms tolerance
    return Math.abs(r1.start - r2.start) < tolerance && Math.abs(r1.end - r2.end) < tolerance;
  }, []);

  // 🆕 **SILENCE REGION CLICK HANDLER**: Handle silence region selection
  const handleSilenceRegionClick = useCallback((region) => {
    console.log('🔍 [MP3CutterMain] Silence region clicked:', region);
    
    // Validate region
    if (!region || typeof region.start !== 'number' || typeof region.end !== 'number') {
      console.error('❌ [MP3CutterMain] Invalid region:', region);
      return;
    }
    
    setSelectedSilenceRegions(prev => {
      const isSelected = prev.some(r => regionsEqual(r, region));
      const newSelected = isSelected
        ? prev.filter(r => !regionsEqual(r, region))
        : [...prev, region];
      
      console.log('🔍 [MP3CutterMain] Updated selected regions:', {
        action: isSelected ? 'deselected' : 'selected',
        region,
        totalSelected: newSelected.length,
        newSelectedList: newSelected.map(r => `${r.start.toFixed(3)}-${r.end.toFixed(3)}`)
      });
      
      return newSelected;
    });
  }, [regionsEqual]);

  // 🆕 **SELECTED REGIONS CHANGE HANDLER**: Update selected silence regions from SilenceDetection
  const handleSelectedRegionsChange = useCallback((newSelectedRegions) => {
    console.log('🔍 [MP3CutterMain] Selected regions changed:', newSelectedRegions);
    setSelectedSilenceRegions(newSelectedRegions);
  }, []);

  // 🆕 **SILENCE REGION REMOVAL HANDLER**: Remove selected silence regions
  const handleRemoveSelectedSilence = useCallback(async () => {
    if (!selectedSilenceRegions.length || !audioFile?.filename) {
      console.log('🔍 [MP3CutterMain] No regions to remove or no audio file');
      return;
    }

    console.log('🔍 [MP3CutterMain] Removing selected regions:', selectedSilenceRegions);

    try {
      const result = await audioApi.removeSilenceRegions({
        fileId: audioFile.filename,
        regions: selectedSilenceRegions
      });

      if (result.success) {
        // Update silence regions after removal
        setSilenceRegions(prev => {
          const newRegions = prev.filter(region => 
            !selectedSilenceRegions.some(selected => regionsEqual(selected, region))
          );
          console.log('🔍 [MP3CutterMain] Updated silence regions after removal:', newRegions);
          return newRegions;
        });
        setSelectedSilenceRegions([]); // Clear selection
        // Refresh audio file
        if (result.data?.newFileId) {
          // Handle file refresh logic here
          console.log('🔇 [SilenceRemoval] Successfully removed selected regions');
        }
      }
    } catch (error) {
      console.error('❌ [SilenceRemoval] Failed to remove silence regions:', error);
    }
  }, [selectedSilenceRegions, audioFile?.filename, regionsEqual]);

  // 🚀 **SILENCE DETECTION REF**: Ref to control SilenceDetection component
  const silenceDetectionRef = useRef(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-6 py-6">
        {/* 🎯 CONNECTION & UPLOAD ERRORS */}
        <ConnectionErrorAlert
          connectionError={connectionError}
          uploadError={uploadError}
          onRetryConnection={() => testConnection()}
        />

        {/* 🆕 NEW: Audio Error Alert */}
        <AudioErrorAlert
          error={audioError}
          compatibilityReport={compatibilityReport}
        />

        {!audioFile ? (          /* Upload Section */
          <FileUploadSection
            isConnected={isConnected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            compatibilityReport={compatibilityReport}
            onFileUpload={(file) => {
              handleUserInteraction('fileUpload');
              handleFileUpload(file);
            }}
            onDrop={(e) => {
              handleUserInteraction('fileDrop');
              handleDrop(e);
            }}
          />
        ) : (
          /* Audio Editor */
          <div className="space-y-4">
            {/* File Info */}
            <div className="file-info-display">
              <FileInfo
                audioFile={audioFile}
                duration={duration}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            </div>            {/* Smart Waveform with Hybrid System */}            <SmartWaveformLazy
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
              
              // 🆕 **FADE EFFECTS**: Visual fade in/out effects trên waveform
              fadeIn={fadeIn}   // Fade in duration - bars sẽ hiển thị thấp → cao dần trong khoảng này
              fadeOut={fadeOut} // Fade out duration - bars sẽ hiển thị cao → thấp dần trong khoảng này
              
              // 🆕 **INVERT SELECTION**: Visual invert selection mode
              isInverted={isInverted}
              
              // 🚀 **REALTIME AUDIO ACCESS**: Direct audio element access cho ultra-smooth tooltips
              audioRef={audioRef}
              
              // 🆕 **SILENCE DETECTION**: Real-time silence overlay
              silenceRegions={silenceRegions}
              showSilenceOverlay={isSilencePanelOpen}
              onSilenceRegionClick={handleSilenceRegionClick}
              selectedSilenceRegions={selectedSilenceRegions}
              
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />            {/* 🔇 SILENCE DETECTION - Advanced component with real-time preview */}            {audioFile && (
              <SilenceDetection
                ref={silenceDetectionRef}
                fileId={audioFile?.filename || audioFile?.name}
                duration={duration}
                waveformData={waveformData}
                audioRef={audioRef}
                onSilenceDetected={(data) => {
                  if (data) {
                    console.log('🔇 [SilenceDetection] Data received:', data);
                  }
                }}
                onPreviewSilenceUpdate={handleSilencePreviewUpdate}
                onSkipSilenceChange={handleSkipSilenceChange}
                onDetectingStateChange={setIsDetectingSilence}
                isOpen={isSilencePanelOpen}
                onToggleOpen={handleToggleSilencePanel}
                disabled={!audioFile}
                // 🎯 **REGION-BASED PROPS**: Auto-detect region processing
                startTime={startTime}
                endTime={endTime}
                selectedRegions={selectedSilenceRegions}
                onRegionClick={handleSilenceRegionClick}
                onSelectedRegionsChange={handleSelectedRegionsChange}
                onRemoveSelected={handleRemoveSelectedSilence}
              />
            )}

            {/* 🎯 UNIFIED CONTROLS - Single row layout with all controls */}
            <UnifiedControlBarLazy
              // Audio Player props
              isPlaying={isPlaying}
              volume={volume}
              playbackRate={playbackRate}
              onTogglePlayPause={togglePlayPause}
              onJumpToStart={handleJumpToStart}
              onJumpToEnd={handleJumpToEnd}
              onVolumeChange={updateVolume}
              onSpeedChange={updatePlaybackRate}
              
              // Time Selector props  
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
                // 🆕 **INVERT SELECTION**: New prop for invert selection handler
              onInvertSelection={handleInvertSelection}
              isInverted={isInverted}              // 🆕 **SILENCE DETECTION**: Props for silence detection
              fileId={audioFile?.filename || audioFile?.name}
              waveformData={waveformData}
              onSilenceDetected={(data) => {
                if (data) {
                  console.log('🔇 [SilenceDetection] Data received:', data);
                }
              }}              isSilencePanelOpen={isSilencePanelOpen}
              onToggleSilencePanel={handleToggleSilencePanel}
              isDetectingSilence={isDetectingSilence}
              selectedSilenceRegions={selectedSilenceRegions}
              onSilenceRegionClick={handleSilenceRegionClick}
              onRemoveSelectedSilence={handleRemoveSelectedSilence}
              
              // History props
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              historyIndex={historyIndex}
              historyLength={historyLength}
              
              // Common props
              disabled={!audioFile}
            />

            {/* Effects and Export */}
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
                  onPresetApply={handlePresetApply}
                  disabled={!audioFile}
                />
              </div>              <div className="export-controls">
                <ExportPanelLazy
                  outputFormat={outputFormat}
                  onFormatChange={setOutputFormat}
                  audioFile={audioFile}
                  startTime={startTime}
                  endTime={endTime}
                  fadeIn={fadeIn}
                  fadeOut={fadeOut}
                  playbackRate={playbackRate}
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

      {/* 🔥 **SAFE AUDIO ELEMENT**: Component render được stable */}
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