import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { Music, Wifi, WifiOff } from 'lucide-react'; // Unused imports - removed

// Import hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useWaveform } from '../hooks/useWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useRealTimeFadeEffects } from '../hooks/useRealTimeFadeEffects';
import { useInteractionHandlers } from '../hooks/useInteractionHandlers';
import { useTimeChangeHandlers } from '../hooks/useTimeChangeHandlers';

// Import components
import FileInfo from './FileInfo';
import Waveform from './Waveform';
import FadeControls from './Effects';
import Export from './Export';
import AudioErrorAlert from './AudioErrorAlert';
import UnifiedControlBar from './UnifiedControlBar';
import ConnectionErrorAlert from './ConnectionErrorAlert';
import FileUploadSection from './FileUploadSection';

// Import utils
import { validateAudioFile, getAudioErrorMessage, getFormatDisplayName, generateCompatibilityReport, createSafeAudioURL, validateAudioURL } from '../utils/audioUtils';
import { createInteractionManager } from '../utils/interactionUtils';
import { getAutoReturnSetting } from '../utils/safeStorage';

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
    setStartTime,
    setEndTime,
    setIsDragging,
    setHoveredHandle,
    canvasRef,
    isGenerating
  } = useWaveform();

  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();

  // 🆕 **REAL-TIME FADE EFFECTS**: Hook để apply fade effects real-time khi nhạc đang phát
  const {
    connectAudioElement,
    updateFadeConfig,
    setFadeActive,
    isWebAudioSupported
  } = useRealTimeFadeEffects();

  // 🔥 **MINIMAL STATE**
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [outputFormat, setOutputFormat] = useState('mp3');
  const [isConnected, setIsConnected] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [compatibilityReport, setCompatibilityReport] = useState(null);
  // 🆕 **INVERT SELECTION STATE**: Track invert selection mode
  const [isInverted, setIsInverted] = useState(false);

  // 🔥 **PERFORMANCE REFS**
  const animationStateRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);

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
    console.log(`⏰ [StartTimeChange] Changing start time: ${startTime.toFixed(1)}s → ${newStartTime.toFixed(1)}s`);
    
    // 1. Update start time first
    originalHandleStartTimeChange(newStartTime);
    
    // 2. Jump main cursor based on invert mode
    let targetCursorTime;
    if (isInverted) {
      // 🆕 **INVERT MODE**: Jump cursor 3s before left handle
      targetCursorTime = Math.max(0, newStartTime - 3);
      console.log(`🔄 [StartTimeChange] INVERT mode - cursor jumping 3s before left handle: ${targetCursorTime.toFixed(2)}s`);
    } else {
      // 🎯 **NORMAL MODE**: Jump cursor to start point
      targetCursorTime = newStartTime;
    }
    
    jumpToTime(targetCursorTime);
    
    // 3. Log behavior based on play state
    if (isPlaying) {
      console.log(`🎵 [StartTimeChange] Music was playing - cursor jumped to ${targetCursorTime.toFixed(2)}s and continues playing`);
    } else {
      console.log(`⏸️ [StartTimeChange] Music was paused - cursor moved to ${targetCursorTime.toFixed(2)}s`);
    }
    
    // No need to change play state - if it was playing, it continues; if paused, stays paused
  }, [originalHandleStartTimeChange, jumpToTime, isPlaying, startTime, isInverted]);

  // 🆕 **ENHANCED END TIME HANDLER**: Auto-jump cursor to 3 seconds before new end point
  const handleEndTimeChange = useCallback((newEndTime) => {
    console.log(`⏰ [EndTimeChange] Changing end time: ${endTime.toFixed(1)}s → ${newEndTime.toFixed(1)}s`);
    
    // 1. Update end time first
    originalHandleEndTimeChange(newEndTime);
    
    // 2. Calculate cursor position: 3 seconds before new end point, but not before start time
    const targetCursorTime = Math.max(startTime, newEndTime - 3);
    
    // 3. Jump main cursor to calculated position
    jumpToTime(targetCursorTime);
    
    // 4. Log behavior based on play state and position
    const positionDesc = targetCursorTime === startTime ? 'start point (end point too close)' : `${targetCursorTime.toFixed(1)}s (3s before end)`;
    
    if (isPlaying) {
      console.log(`🎵 [EndTimeChange] Music was playing - cursor jumped to ${positionDesc} and continues playing`);
    } else {
      console.log(`⏸️ [EndTimeChange] Music was paused - cursor moved to ${positionDesc}`);
    }
    
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

      console.log('🎮 [MP3CutterMain] InteractionManager initialized and registered');
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
    console.log('📤 [FileUpload] Starting file upload process...');
    
    // 🆕 RESET PREVIOUS ERRORS
    setAudioError(null);
    setFileValidation(null);
    
    // 🆕 **RESET STATES**: Reset tất cả states cho file mới
    setIsInverted(false);
    
    try {
      // 🆕 1. VALIDATE AUDIO FILE FIRST
      console.log('🔍 [Validation] Checking file format and browser compatibility...');
      const validation = validateAudioFile(file);
      setFileValidation(validation);
      
      console.log('📋 [Validation] Result:', validation);
      
      // 🆕 SHOW WARNINGS BUT CONTINUE IF NO ERRORS
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.warn('⚠️ [FileWarning]', warning);
        });
      }
      
      // 🆕 STOP IF VALIDATION FAILED
      if (!validation.valid) {
        const errorMsg = validation.errors.join('; ');
        console.error('❌ [Validation] Failed:', errorMsg);
        
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
      
      // 🆕 LOG COMPATIBILITY INFO
      if (validation.info.browserSupport) {
        const { level, support } = validation.info.browserSupport;
        console.log(`✅ [Compatibility] ${getFormatDisplayName(validation.info.detectedMimeType)}: ${level} support (${support})`);
      }

      // 🎯 2. Test connection first if not already connected
      if (isConnected === false) {
        console.log('🔄 [Connection] Testing connection before upload...');
        const connected = await testConnection();
        if (!connected) {
          throw new Error('Backend server is not available. Please start the backend server.');
        }
        setIsConnected(true);
        setConnectionError(null);
      }

      // 🎯 3. UPLOAD FILE AND GET IMMEDIATE AUDIO URL
      console.log('🎯 [FileUpload] Uploading file...');
      await uploadFile(file);
      
      // 🔥 **IMMEDIATE URL CREATION**: Create URL directly from file for immediate use
      const immediateAudioUrl = createSafeAudioURL(file);
      
      if (!immediateAudioUrl) {
        throw new Error('Failed to create audio URL for immediate playback');
      }
      
      console.log('🔧 [FileUpload] Created immediate audio URL for:', file.name);
      
      // 🔥 **IMMEDIATE AUDIO SETUP**: Set audio source right away
      if (audioRef.current) {
        console.log('🔧 [AudioSetup] Setting audio src immediately');
        
        try {
          audioRef.current.src = immediateAudioUrl;
          audioRef.current.load();
          
          console.log('✅ [AudioSetup] Audio element loaded successfully');
          setAudioError(null);
          
        } catch (loadError) {
          console.error('❌ [AudioSetup] Audio load failed:', loadError);
          
          setAudioError({
            type: 'load',
            title: 'Audio Load Failed',
            message: 'Failed to load audio file for playback.',
            suggestions: ['Try a different file', 'Check if the file is corrupted']
          });
        }
      } else {
        console.error('❌ [AudioSetup] No audio element available');
      }
      
      // 🎯 4. GENERATE WAVEFORM
      console.log('🎯 [Waveform] Generating waveform...');
      const waveformResult = await generateWaveform(file);
      
      console.log('✅ [Waveform] Generation complete:', {
        dataLength: waveformResult.data.length,
        duration: waveformResult.duration
      });
      
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
        console.log('✅ [FileUpload] File upload and setup complete');
      }
      
    } catch (error) {
      console.error('❌ [FileUpload] Failed:', error);
      
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
    console.log('🔧 [AudioSetup] Audio file ready, setting up interactions...', {
      audioFileName: audioFile.name
    });

    // 🎯 Reset interaction manager for new file
    if (interactionManagerRef.current) {
      interactionManagerRef.current.reset();
      console.log('🎮 [InteractionManager] Reset for new audio file');
    }

    // 🔥 **CLEAR PREVIOUS ERRORS**: Clear any audio errors from previous files
    setAudioError(null);

    console.log('✅ [AudioSetup] Audio interactions configured successfully');
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
        const success = await connectAudioElement(audio);
        if (success) {
          // Web Audio API connected successfully
        } else {
          console.warn('⚠️ [MP3CutterMain] Failed to connect Web Audio API');
        }
      } catch (error) {
        console.error('❌ [MP3CutterMain] Web Audio setup failed:', error);
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
      console.log(`⏪ [History] Undo - restoring state and jumping cursor to start point: ${prevState.startTime.toFixed(2)}s`);
      
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
      
      console.log(`📍 [History] Undo complete - cursor positioned at start: ${prevState.startTime.toFixed(2)}s`);
    }
  }, [undo, setStartTime, setEndTime, jumpToTime]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      console.log(`⏩ [History] Redo - restoring state and jumping cursor to start point: ${nextState.startTime.toFixed(2)}s`);
      
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
      
      console.log(`📍 [History] Redo complete - cursor positioned at start: ${nextState.startTime.toFixed(2)}s`);
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
      endTime
    };
    
    // 🚀 **INSTANT UPDATE**: Apply config ngay lập tức
    updateFadeConfig(newConfig);
    
    // 🎯 **DEBUG REAL-TIME**: Log fade change với immediate feedback
    console.log(`🎨 [FadeControls] Fade In REAL-TIME: ${newFadeIn.toFixed(1)}s - effects applied instantly`);
  }, [fadeOut, startTime, endTime, updateFadeConfig]);

  const handleFadeOutChange = useCallback((newFadeOut) => {
    setFadeOut(newFadeOut);
    
    // 🔥 **IMMEDIATE CONFIG UPDATE**: Update ngay lập tức cho real-time effects
    const newConfig = {
      fadeIn,
      fadeOut: newFadeOut,
      startTime,
      endTime
    };
    
    // 🚀 **INSTANT UPDATE**: Apply config ngay lập tức
    updateFadeConfig(newConfig);
    
    // 🎯 **DEBUG REAL-TIME**: Log fade change với immediate feedback
    console.log(`🎨 [FadeControls] Fade Out REAL-TIME: ${newFadeOut.toFixed(1)}s - effects applied instantly`);
  }, [fadeIn, startTime, endTime, updateFadeConfig]);

  // 🆕 **FADE DRAG HISTORY CALLBACKS**: Lưu lịch sử khi kết thúc drag fade sliders
  const handleFadeInDragEnd = useCallback((finalFadeIn) => {
    console.log(`💾 [FadeControls] Fade In drag ended: ${finalFadeIn.toFixed(1)}s - saving to history`);
    saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut, isInverted });
  }, [startTime, endTime, fadeOut, saveState, isInverted]);

  const handleFadeOutDragEnd = useCallback((finalFadeOut) => {
    console.log(`💾 [FadeControls] Fade Out drag ended: ${finalFadeOut.toFixed(1)}s - saving to history`);
    saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut, isInverted });
  }, [startTime, endTime, fadeIn, saveState, isInverted]);

  // 🆕 **PRESET APPLY CALLBACK**: Lưu lịch sử khi apply preset
  const handlePresetApply = useCallback((newFadeIn, newFadeOut) => {
    console.log(`🎨 [FadeControls] Preset applied: ${newFadeIn.toFixed(1)}s / ${newFadeOut.toFixed(1)}s - saving to history`);
    setFadeIn(newFadeIn);
    setFadeOut(newFadeOut);
    
    // Update real-time config
    const newConfig = {
      fadeIn: newFadeIn,
      fadeOut: newFadeOut,
      startTime,
      endTime
    };
    updateFadeConfig(newConfig);
    
    // Save to history
    saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut, isInverted });
  }, [startTime, endTime, updateFadeConfig, saveState, isInverted]);

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

    // 🔥 **SINGLE SETUP LOG**: Chỉ log một lần khi setup
    console.log('🎧 [AudioEvents] Setting up event listeners for:', audioFile.name);

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
        
        // 🆕 **INVERT MODE LOGIC**: Handle skipping region when in invert selection mode
        if (isInverted && endTime > startTime) {
          // 🚀 **SKIP REGION LOGIC**: When in invert mode, skip the region between handles
          if (audioCurrentTime >= startTime - 0.05 && audioCurrentTime < endTime) {
            console.log(`⏭️ [InvertMode] Skipping region ${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s, jumping to ${endTime.toFixed(2)}s`);
            audioRef.current.currentTime = endTime;
            setCurrentTime(endTime);
            // ✅ **CONTINUE ANIMATION**: Let animation loop continue to track cursor after jump
          }
          
          // 🎯 **END OF AUDIO LOGIC**: When reaching end of audio in invert mode
          if (audioCurrentTime >= audioRef.current.duration - 0.05) {
            const autoReturnEnabled = getAutoReturnSetting();
            
            if (autoReturnEnabled && audioRef.current) {
              // ✅ **LOOP MODE**: Loop back to beginning (0s) and continue playing
              console.log(`🔄 [InvertMode-Loop] Looping back to start: 0s`);
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
              // Continue playing
            } else if (audioRef.current) {
              // ✅ **STOP MODE**: Pause and return to beginning
              console.log(`⏹️ [InvertMode-Stop] Pausing and returning to start: 0s`);
              audioRef.current.pause();
              setIsPlaying(false);
              audioRef.current.currentTime = 0;
              setCurrentTime(0);
              return;
            }
          }
        } else {
          // 🎯 **NORMAL MODE LOGIC**: Original auto-return logic for normal selection
          if (endTime > startTime && audioCurrentTime >= endTime - 0.05) {
            const autoReturnEnabled = getAutoReturnSetting();
            
            if (autoReturnEnabled && audioRef.current) {
              // ✅ **LOOP MODE**: Auto-return BẬT → loop về startTime và tiếp tục phát
              console.log(`🔄 [AutoReturn] LOOP mode - returning to start: ${startTime.toFixed(2)}s`);
              audioRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              // Continue playing (không pause)
              
            } else if (audioRef.current) {
              // ✅ **STOP MODE**: Auto-return TẮT → pause và quay cursor về startTime
              console.log(`⏹️ [AutoReturn] STOP mode - pausing and returning to start: ${startTime.toFixed(2)}s`);
              audioRef.current.pause();
              
              // 🎯 **CURSOR RESET**: Quay cursor về startTime như yêu cầu
              audioRef.current.currentTime = startTime;
              setCurrentTime(startTime);
              
              return; // Exit update loop
            }
          }
        }
        
        // 🔧 **PERFORMANCE TRACKING** - Log mỗi 2 giây để track framerate
        frameCount++;
        const now = performance.now();
        if (now - lastLogTime > 2000) { // Log every 2 seconds
          const fps = (frameCount / 2).toFixed(1);
          console.log(`🚀 [ULTRA-SMOOTH] Main cursor animation performance: ${fps}fps`, {
            currentTime: audioCurrentTime.toFixed(3) + 's',
            framesSinceLastLog: frameCount,
            note: 'Auto-return logic active - no drag protection'
          });
          frameCount = 0;
          lastLogTime = now;
        }
        
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    
    // 🎯 **SINGLE ANIMATION CONTROL** - Chỉ start khi thực sự cần thiết
    if (isPlaying && audioRef.current) {
      console.log('🎬 [ULTRA-SMOOTH] Starting MAIN cursor animation - auto-return logic active');
      animationId = requestAnimationFrame(updateCursor);
    }
    
    // 🧹 **CLEANUP**: Prevent memory leaks
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        console.log('🧹 [MainAnimation] Cleaned up MAIN cursor animation');
      }
    };
  }, [isPlaying, startTime, endTime, audioRef, setCurrentTime, setIsPlaying]);

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
        endTime
      });
      
      // 🆕 **TRACK SYNC STATE**: Remember last synced values
      fadeConfigSyncedRef.current = {
        lastStartTime: startTime,
        lastEndTime: endTime,
        lastFadeIn: fadeIn,
        lastFadeOut: fadeOut
      };
      
      console.log('🔄 [ConfigSync] Initial/Selection config sync:', {
        startTime: startTime.toFixed(2) + 's',
        endTime: endTime.toFixed(2) + 's',
        fadeIn: fadeIn.toFixed(1) + 's',
        fadeOut: fadeOut.toFixed(1) + 's',
        reason: !fadeConfigSyncedRef.current ? 'INITIAL_MOUNT' : 'SELECTION_CHANGE'
      });
    }
  }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig, isInverted]); // 🚀 **ALL DEPS**: But logic prevents fade-only updates

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
    console.log('✅ [Audio] Can play');
  }, []);

  const handleError = useCallback((e) => {
    const error = e.target.error;
    const filename = audioFile?.name || 'audio file';
    
    setTimeout(() => {
      console.error('❌ [AudioElement] Direct error:', {
        code: error?.code,
        message: error?.message,
        filename: filename,
        src: e.target.src,
        currentSrc: e.target.currentSrc,
        readyState: e.target.readyState,
        networkState: e.target.networkState
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
  }, [audioFile?.name, fileValidation, setAudioError, setIsPlaying]);

  // 🆕 **INVERT SELECTION HANDLER**: Smart handler for inverting selection
  const handleInvertSelection = useCallback(() => {
    if (duration <= 0 || startTime >= endTime) return;
    
    console.log(`🔄 [InvertSelection] Toggling invert mode: ${isInverted ? 'ON' : 'OFF'} → ${!isInverted ? 'ON' : 'OFF'}`);
    console.log(`📍 [InvertSelection] Selection region remains: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
    console.log(`🎨 [InvertSelection] Visual change: ${isInverted ? 'Purple=inside, Gray=outside' : 'Gray=inside, Purple=outside'} → ${!isInverted ? 'Purple=inside, Gray=outside' : 'Gray=inside, Purple=outside'}`);
    
    // 🎯 **HISTORY SAVE**: Save current state before inversion
    saveState({ startTime, endTime, fadeIn, fadeOut, isInverted });
    
    // 🚀 **TOGGLE INVERT MODE**: Simply toggle the invert state
    const newInvertState = !isInverted;
    setIsInverted(newInvertState);
    
    // 🆕 **SMART CURSOR MOVEMENT**: Move cursor based on invert mode change
    let targetCursorTime;
    if (newInvertState) {
      // 🎯 **ENABLING INVERT MODE**: Move cursor 3s before left handle
      targetCursorTime = Math.max(0, startTime - 3);
      console.log(`🎯 [InvertSelection] ENABLING invert mode - cursor jumping 3s before left handle: ${targetCursorTime.toFixed(2)}s`);
    } else {
      // 🔙 **DISABLING INVERT MODE**: Move cursor to start point
      targetCursorTime = startTime;
      console.log(`🔙 [InvertSelection] DISABLING invert mode - cursor jumping to start point: ${targetCursorTime.toFixed(2)}s`);
    }
    
    jumpToTime(targetCursorTime);
    
    console.log(`✅ [InvertSelection] Invert mode ${newInvertState ? 'ENABLED' : 'DISABLED'} - waveform colors will update automatically`);
    console.log(`🎯 [InvertSelection] Export will now process: ${newInvertState ? 'regions OUTSIDE handles' : 'region BETWEEN handles'}`);
  }, [duration, startTime, endTime, isInverted, saveState, fadeIn, fadeOut, jumpToTime]);

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

        {!audioFile ? (
          /* Upload Section */
          <FileUploadSection
            isConnected={isConnected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            compatibilityReport={compatibilityReport}
            onFileUpload={handleFileUpload}
            onDrop={handleDrop}
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
            </div>

            {/* Waveform */}
            <Waveform
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
              
              // 🆕 **FADE EFFECTS**: Visual fade in/out effects trên waveform
              fadeIn={fadeIn}   // Fade in duration - bars sẽ hiển thị thấp → cao dần trong khoảng này
              fadeOut={fadeOut} // Fade out duration - bars sẽ hiển thị cao → thấp dần trong khoảng này
              
              // 🆕 **INVERT SELECTION**: Visual invert selection mode
              isInverted={isInverted} // Invert selection mode - đảo ngược vùng active/inactive
              
              // 🚀 **REALTIME AUDIO ACCESS**: Direct audio element access cho ultra-smooth tooltips
              audioRef={audioRef}
              
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />

            {/* 🎯 UNIFIED CONTROLS - Single row layout with all controls */}
            <UnifiedControlBar
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
                <FadeControls
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
              </div>

              <div className="export-controls">
                <Export
                  outputFormat={outputFormat}
                  onFormatChange={setOutputFormat}
                  audioFile={audioFile}
                  startTime={startTime}
                  endTime={endTime}
                  fadeIn={fadeIn}
                  fadeOut={fadeOut}
                  playbackRate={playbackRate}
                  isInverted={isInverted}
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