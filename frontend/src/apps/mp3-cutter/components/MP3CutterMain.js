import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Music, Wifi, WifiOff } from 'lucide-react';

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
    canvasRef
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

  // 🔥 **PERFORMANCE REFS**
  const animationStateRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);

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
    interactionManagerRef
  });

  // 🎯 **TIME CHANGE HANDLERS**: Extract time change logic using custom hook
  const {
    handleStartTimeChange,
    handleEndTimeChange,
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
          fadeOut: 0 
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
  }, [audioFile?.url, setAudioError]); // 🔥 **OPTIMIZED DEPS**: Added missing setAudioError
    
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
  }, [audioFile?.url, connectAudioElement, isWebAudioSupported]); // 🔥 **OPTIMIZED DEPS**: Removed getConnectionDebugInfo

  // 🆕 **PLAYBACK STATE SYNC**: Start/stop fade effects khi playback state thay đổi
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    
    setFadeActive(isPlaying, audio);
  }, [isPlaying, setFadeActive, isWebAudioSupported]); // 🔥 **OPTIMIZED DEPS**: Removed excessive deps

  // History handlers
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setStartTime(prevState.startTime);
      setEndTime(prevState.endTime);
      setFadeIn(prevState.fadeIn);
      setFadeOut(prevState.fadeOut);
    }
  }, [undo, setStartTime, setEndTime]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setStartTime(nextState.startTime);
      setEndTime(nextState.endTime);
      setFadeIn(nextState.fadeIn);
      setFadeOut(nextState.fadeOut);
    }
  }, [redo, setStartTime, setEndTime]);

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
    saveState({ startTime, endTime, fadeIn: finalFadeIn, fadeOut });
  }, [startTime, endTime, fadeOut, saveState]);

  const handleFadeOutDragEnd = useCallback((finalFadeOut) => {
    console.log(`💾 [FadeControls] Fade Out drag ended: ${finalFadeOut.toFixed(1)}s - saving to history`);
    saveState({ startTime, endTime, fadeIn, fadeOut: finalFadeOut });
  }, [startTime, endTime, fadeIn, saveState]);

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
    saveState({ startTime, endTime, fadeIn: newFadeIn, fadeOut: newFadeOut });
  }, [startTime, endTime, updateFadeConfig, saveState]);

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
  }, [audioFile?.name, audioRef, setCurrentTime, setDuration, setIsPlaying, setEndTime, fileValidation, setAudioError]); // 🔥 **FIXED DEPS**: Added missing audioRef

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
        
        // 🎯 **ENHANCED AUTO-RETURN LOGIC**: Xử lý khi đến cuối region
        // 🔥 **DRAG PROTECTION**: Không trigger auto-return khi đang drag handles để tránh pause không mong muốn
        const isDraggingAnyHandle = isDragging === 'start' || isDragging === 'end' || isDragging === 'region';
        
        if (endTime > startTime && audioCurrentTime >= endTime - 0.05 && !isDraggingAnyHandle) {
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
            setIsPlaying(false);
            
            // 🎯 **CURSOR RESET**: Quay cursor về startTime như yêu cầu
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
            
            return; // Exit update loop
          }
        } else if (isDraggingAnyHandle && Math.random() < 0.001) {
          // 🔥 **DEBUG**: Log khi skip auto-return do drag (very low sampling để tránh spam)
          console.log(`🚫 [AutoReturn-DragProtection] Skipping auto-return logic during ${isDragging} drag to prevent unwanted pause`);
        }
        
        // 🔧 **PERFORMANCE TRACKING** - Log mỗi 2 giây để track framerate
        frameCount++;
        const now = performance.now();
        if (now - lastLogTime > 2000) { // Log every 2 seconds
          const fps = (frameCount / 2).toFixed(1);
          console.log(`🚀 [ULTRA-SMOOTH] Main cursor animation performance: ${fps}fps`, {
            currentTime: audioCurrentTime.toFixed(3) + 's',
            framesSinceLastLog: frameCount,
            note: 'Coordinated with tooltip animation for ultra-smooth experience'
          });
          frameCount = 0;
          lastLogTime = now;
        }
        
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    
    // 🎯 **SINGLE ANIMATION CONTROL** - Chỉ start khi thực sự cần thiết
    if (isPlaying && audioRef.current) {
      console.log('🎬 [ULTRA-SMOOTH] Starting MAIN cursor animation - coordinated with tooltips');
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
  }, [startTime, endTime, fadeIn, fadeOut, updateFadeConfig]); // 🚀 **ALL DEPS**: But logic prevents fade-only updates

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-800">MP3 Cutter Pro</h1>
                <p className="text-xs text-slate-500">Professional Audio Editor</p>
              </div>
            </div>
            
            {/* 🎯 NEW: Connection Status Indicator */}
            <div className="flex items-center gap-2">
              {isConnected === null ? (
                <div className="flex items-center gap-1 text-amber-600">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-xs">Checking...</span>
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
              
              // 🆕 **FADE EFFECTS**: Visual fade in/out effects trên waveform
              fadeIn={fadeIn}   // Fade in duration - bars sẽ hiển thị thấp → cao dần trong khoảng này
              fadeOut={fadeOut} // Fade out duration - bars sẽ hiển thị cao → thấp dần trong khoảng này
              
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
        onError={(e) => {
          // 🔥 **IMMEDIATE ERROR LOG**: Log audio element errors immediately
          const error = e.target.error;
          setTimeout(() => {
            console.error('❌ [AudioElement] Direct error:', {
              code: error?.code,
              message: error?.message,
              src: e.target.src,
              currentSrc: e.target.currentSrc,
              readyState: e.target.readyState,
              networkState: e.target.networkState
            });
          }, 0);
        }}
        onLoadStart={() => {
          // 🔥 **LOAD START LOG**: Track load start
          setTimeout(() => {
            console.log('🔄 [AudioElement] Load started for:', audioRef.current?.src);
          }, 0);
        }}
        onCanPlay={() => {
          // 🔥 **CAN PLAY LOG**: Track when audio is ready
          setTimeout(() => {
            console.log('✅ [AudioElement] Can play:', audioRef.current?.src);
          }, 0);
        }}
        onLoadedMetadata={() => {
          // 🔥 **METADATA LOADED**: Track metadata load
          setTimeout(() => {
            console.log('📊 [AudioElement] Metadata loaded:', {
              duration: audioRef.current?.duration,
              src: audioRef.current?.src
            });
          }, 0);
        }}
      />
    </div>
  );
});

MP3CutterMain.displayName = 'MP3CutterMain';

export default MP3CutterMain;