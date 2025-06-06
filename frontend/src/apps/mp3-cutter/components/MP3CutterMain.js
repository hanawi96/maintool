import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Music, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// Import hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useWaveform } from '../hooks/useWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useConsoleCapture } from '../hooks/useConsoleCapture';

// Import components
import FileInfo from './FileInfo';
import AudioPlayer from './AudioPlayer';
import Waveform from './Waveform';
import HistoryControls from './History';
import FadeControls from './Effects';
import Export from './Export';
import DebugPanel from './Debug/DebugPanel';
import AudioErrorAlert from './AudioErrorAlert';
import InteractionDebug from './Debug/InteractionDebug';
import AudioSyncDebug from './Debug/AudioSyncDebug';
import SmartClickDebug from './Debug/SmartClickDebug';
import UnifiedControlBar from './UnifiedControlBar';

// Import utils
import { clamp, validateAudioFile, getAudioErrorMessage, getFormatDisplayName, generateCompatibilityReport } from '../utils/audioUtils';
import { WAVEFORM_CONFIG } from '../utils/constants';
import { createInteractionManager } from '../utils/interactionUtils';

// 🆕 Import debug utilities
import '../utils/audioDebug'; // This will add window.audioDebug
import '../utils/interactionTest'; // This will add window.interactionTest
import '../utils/audioSyncTest'; // This will add window.audioSyncTest
import '../utils/smartClickTest'; // This will add window.smartClickTest

const MP3CutterMain = React.memo(() => {
  // 🎯 NEW: Console capture hook for debug panel
  const { 
    logs, 
    isCapturing, 
    clearLogs, 
    toggleCapturing, 
    getLogsCounts,
    addManualLog
  } = useConsoleCapture();

  // File upload hook with enhanced error handling
  const { 
    audioFile, 
    uploadFile, 
    clearFile, 
    isUploading, 
    uploadError, 
    testConnection,
    uploadProgress
  } = useFileUpload();
  
  // Audio player hook
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

  // Waveform hook
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
    reset: resetWaveform,
    canvasRef
  } = useWaveform();

  // History hook
  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();

  // Effects state
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [outputFormat, setOutputFormat] = useState('mp3');

  // 🎯 NEW: Connection state
  const [isConnected, setIsConnected] = useState(null); // null = unknown, true = connected, false = disconnected
  const [connectionError, setConnectionError] = useState(null);

  // 🆕 NEW: Audio validation and error states
  const [audioError, setAudioError] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [compatibilityReport, setCompatibilityReport] = useState(null);

  // 🎯 Optimized refs - prevent excessive logging
  const lastMouseTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const isSetupRef = useRef(false);

  // 🔥 **FIX INFINITE LOOP**: Stable refs thay vì reactive dependencies
  const animationStateRef = useRef({
    isPlaying: false,
    startTime: 0,
    endTime: 0
  });

  // 🔥 **ANIMATION TRIGGER**: Ref để trigger animation restart
  const animationTriggerRef = useRef(0);

  // 🔥 **UPDATE ANIMATION STATE REF**: Cập nhật ref thay vì tạo object mới
  useEffect(() => {
    animationStateRef.current = {
      isPlaying,
      startTime,
      endTime
    };
  }, [isPlaying, startTime, endTime]);

  // 🆕 NEW: Interaction Manager for smart mouse handling
  const interactionManagerRef = useRef(null);
  if (!interactionManagerRef.current) {
    interactionManagerRef.current = createInteractionManager();
  }

  // 🆕 NEW: Generate browser compatibility report on mount
  useEffect(() => {
    const report = generateCompatibilityReport();
    setCompatibilityReport(report);
    
    console.log('🔍 [Browser Compatibility]', {
      universal: Object.keys(report.universal).length,
      moderate: Object.keys(report.moderate).length, 
      limited: Object.keys(report.limited).length,
      browser: report.browser.includes('Chrome') ? 'Chrome' : 
               report.browser.includes('Firefox') ? 'Firefox' : 
               report.browser.includes('Safari') ? 'Safari' : 'Other'
    });
  }, []);

  // 🎯 NEW: Test backend connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      console.log('🏥 [MP3CutterMain] Testing backend connection...');
      try {
        const connected = await testConnection();
        setIsConnected(connected);
        if (connected) {
          setConnectionError(null);
          console.log('✅ [MP3CutterMain] Backend connection successful');
        }
      } catch (error) {
        console.error('❌ [MP3CutterMain] Backend connection failed:', error);
        setIsConnected(false);
        setConnectionError('Backend server is not available. Please start the backend server.');
      }
    };
    
    checkConnection();
  }, [testConnection]);

  // 🎯 ENHANCED: File upload handler with audio validation
  const handleFileUpload = useCallback(async (file) => {
    console.log('📤 [MP3CutterMain] Starting file upload process...');
    
    // 🆕 RESET PREVIOUS ERRORS
    setAudioError(null);
    setFileValidation(null);
    
    try {
      // 🆕 1. VALIDATE AUDIO FILE FIRST
      console.log('🔍 [Validation] Checking file format and browser compatibility...');
      const validation = validateAudioFile(file);
      setFileValidation(validation);
      
      console.log('📋 [Validation Result]', validation);
      
      // 🆕 SHOW WARNINGS BUT CONTINUE IF NO ERRORS
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          console.warn('⚠️ [File Warning]', warning);
          addManualLog('warn', [`⚠️ File Warning: ${warning}`]);
        });
      }
      
      // 🆕 STOP IF VALIDATION FAILED
      if (!validation.valid) {
        const errorMsg = validation.errors.join('; ');
        console.error('❌ [Validation Failed]', errorMsg);
        addManualLog('error', [`❌ Validation Failed: ${errorMsg}`]);
        
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
        console.log('🔄 [MP3CutterMain] Testing connection before upload...');
        const connected = await testConnection();
        if (!connected) {
          throw new Error('Backend server is not available. Please start the backend server.');
        }
        setIsConnected(true);
        setConnectionError(null);
      }

      // 🎯 3. UPLOAD FILE
      console.log('🎯 [MP3CutterMain] Uploading file...');
      const uploadResult = await uploadFile(file);
      
      console.log('🎯 [MP3CutterMain] Setting audio source...');
      // 🎯 CRITICAL: Set audio source immediately after upload
      if (audioRef.current && audioFile?.url) {
        audioRef.current.src = audioFile.url;
        console.log('✅ [MP3CutterMain] Audio src set:', audioFile.url);
      }
      
      // 🎯 4. GENERATE WAVEFORM
      console.log('🎯 [MP3CutterMain] Generating waveform...');
      const waveformResult = await generateWaveform(file);
      
      console.log('✅ [MP3CutterMain] Waveform generation complete:', {
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
        console.log('✅ [MP3CutterMain] File upload and setup complete');
        
        // 🆕 LOG SUCCESS WITH FORMAT INFO
        addManualLog('info', [
          `✅ File loaded: ${file.name}`,
          `📊 Format: ${getFormatDisplayName(validation.info.detectedMimeType)}`,
          `⏱️ Duration: ${audioDuration.toFixed(2)}s`
        ]);
      }
      
    } catch (error) {
      console.error('❌ [MP3CutterMain] File upload failed:', error);
      
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
      
      addManualLog('error', [`❌ Upload Error: ${error.message}`]);
      
      // Don't show alert if the error is already shown by the upload hook
      if (!error.message.includes('Backend server is not available')) {
        console.error('Upload failed with detailed error:', error);
      }
    }
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection, audioFile, addManualLog]);

  // 🎯 Enhanced audio setup effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile?.url) return;

    console.log('🔧 [MP3CutterMain] Setting up audio element...', {
      audioFileUrl: audioFile.url,
      audioFileName: audioFile.name
    });

    // 🎯 Reset interaction manager for new file
    if (interactionManagerRef.current) {
      interactionManagerRef.current.reset();
      console.log('🎮 [InteractionManager] Reset for new audio file');
    }

    // 🎯 Set audio source
    audio.src = audioFile.url;

    // 🎯 Force load metadata
    audio.load();
    
    console.log('✅ [MP3CutterMain] Audio element configured');
  }, [audioFile, audioRef]);

  // 🎯 Log important state changes to debug panel
  useEffect(() => {
    if (audioFile) {
      addManualLog('info', [`🎵 Audio file loaded: ${audioFile.name}`]);
    }
  }, [audioFile, addManualLog]);

  useEffect(() => {
    if (waveformData.length > 0) {
      addManualLog('info', [`🌊 Waveform generated: ${waveformData.length} samples`]);
    }
  }, [waveformData, addManualLog]);

  useEffect(() => {
    if (uploadError) {
      addManualLog('error', [`📤 Upload Error: ${uploadError}`]);
    }
  }, [uploadError, addManualLog]);

  useEffect(() => {
    if (connectionError) {
      addManualLog('error', [`🔌 Connection Error: ${connectionError}`]);
    }
  }, [connectionError, addManualLog]);

  // Drag and drop handler
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // 🔥 **SMART ANIMATION LOOP**: Responsive animation với trigger mechanism
  useEffect(() => {
    console.log('🎬 [Animation] Setting up smart animation system...');
    
    let animationActive = false;
    let currentAnimationId = null;
    
    const updateCursor = (timestamp) => {
      // 🔥 **GET FRESH STATE**: Lấy state mới nhất từ ref
      const currentState = animationStateRef.current;
      const { isPlaying: playing, startTime: start, endTime: end } = currentState;
      
      // 🔥 **EARLY EXIT**: Không animation nếu không playing
      if (!playing || !audioRef.current || audioRef.current.paused || !animationActive) {
        animationActive = false;
        currentAnimationId = null;
        console.log('⏸️ [Animation] Stopped - not playing or paused');
        return;
      }
      
      // 🔥 **SMART THROTTLING**: 60fps for cursor updates
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;
      
      if (timestamp - lastUpdateTimeRef.current < frameInterval) {
        if (animationActive && playing) {
          currentAnimationId = requestAnimationFrame(updateCursor);
        }
        return;
      }
      
      lastUpdateTimeRef.current = timestamp;
      
      // 🔥 **CURSOR UPDATE**: Lấy thời gian từ audio element
      const audioCurrentTime = audioRef.current.currentTime;
      
      // 🔥 **SMOOTH STATE UPDATE**: Update React state cho UI
      setCurrentTime(audioCurrentTime);
      
      // 🔥 **DEBUG**: Log cursor movement mỗi giây
      if (Math.floor(timestamp) % 1000 < 16) {
        console.log(`🎵 [Cursor] Time: ${audioCurrentTime.toFixed(2)}s / ${end.toFixed(2)}s`);
      }
      
      // 🔥 **AUTO-RETURN**: Kiểm tra nếu đến cuối selection
      if (end > start && audioCurrentTime >= end - 0.05) {
        const autoReturnEnabled = localStorage.getItem('mp3cutter_auto_return') !== 'false';
        
        console.log('🛑 [Animation] Reached selection end, auto-return:', autoReturnEnabled);
        
        if (autoReturnEnabled && audioRef.current) {
          audioRef.current.currentTime = start;
          audioRef.current.pause();
          setCurrentTime(start);
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        
        setIsPlaying(false);
        animationActive = false;
        currentAnimationId = null;
        return;
      }
      
      // 🔥 **CONTINUE ANIMATION**: Tiếp tục loop nếu đang playing
      if (playing && animationActive && audioRef.current && !audioRef.current.paused) {
        currentAnimationId = requestAnimationFrame(updateCursor);
      } else {
        animationActive = false;
        currentAnimationId = null;
        console.log('⏸️ [Animation] Loop ended');
      }
    };
    
    // 🔥 **START ANIMATION**: Function để bắt đầu animation
    const startAnimation = () => {
      if (!animationActive && !currentAnimationId) {
        animationActive = true;
        currentAnimationId = requestAnimationFrame(updateCursor);
        console.log('🚀 [Animation] Started - cursor will move');
        return true;
      }
      return false;
    };
    
    // 🔥 **STOP ANIMATION**: Function để dừng animation
    const stopAnimation = () => {
      animationActive = false;
      if (currentAnimationId) {
        cancelAnimationFrame(currentAnimationId);
        currentAnimationId = null;
        console.log('⏹️ [Animation] Stopped');
      }
    };
    
    // 🔥 **TRIGGER LISTENER**: Listen for trigger changes
    const checkAndTrigger = () => {
      const currentState = animationStateRef.current;
      if (currentState.isPlaying && audioRef.current && !audioRef.current.paused) {
        console.log('🎯 [Animation] Triggering animation for play state');
        startAnimation();
      } else {
        console.log('🛑 [Animation] Stopping animation for pause state');
        stopAnimation();
      }
    };
    
    // 🔥 **EXPOSE TRIGGER**: Cho phép trigger từ bên ngoài
    const triggerInterval = setInterval(checkAndTrigger, 100); // Check mỗi 100ms
    
    // 🔥 **INITIAL CHECK**: Kiểm tra ngay lập tức
    checkAndTrigger();
    
    // 🔥 **CLEANUP**: Dọn dẹp khi unmount
    return () => {
      clearInterval(triggerInterval);
      stopAnimation();
    };
  }, []); // 🔥 **EMPTY DEPS**: Stable setup

  // 🔥 **PLAY STATE TRIGGER**: Trigger animation khi play state thay đổi
  useEffect(() => {
    console.log('🎮 [PlayState] State changed to:', isPlaying ? 'PLAYING' : 'PAUSED');
    
    // 🔥 **UPDATE REF**: Cập nhật ref ngay lập tức
    animationStateRef.current.isPlaying = isPlaying;
    
    // 🔥 **IMMEDIATE TRIGGER**: Trigger animation ngay lập tức
    const timeoutId = setTimeout(() => {
      if (isPlaying && audioRef.current && !audioRef.current.paused) {
        console.log('🎵 [PlayState] Should start cursor animation');
        // Animation loop sẽ tự detect và start
      } else {
        console.log('⏸️ [PlayState] Should stop cursor animation');
        // Animation loop sẽ tự detect và stop
      }
    }, 16); // Next frame
    
    return () => clearTimeout(timeoutId);
  }, [isPlaying]);

  // 🔥 **AUDIO EVENTS**: Listen để sync với audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleAudioPlay = () => {
      console.log('🎵 [AudioElement] Play event detected');
      animationStateRef.current.isPlaying = true;
    };
    
    const handleAudioPause = () => {
      console.log('⏸️ [AudioElement] Pause event detected');
      animationStateRef.current.isPlaying = false;
    };
    
    const handleAudioTimeUpdate = () => {
      // Passive listener, animation loop sẽ handle việc update UI
    };
    
    audio.addEventListener('play', handleAudioPlay);
    audio.addEventListener('pause', handleAudioPause);
    audio.addEventListener('timeupdate', handleAudioTimeUpdate);
    
    return () => {
      audio.removeEventListener('play', handleAudioPlay);
      audio.removeEventListener('pause', handleAudioPause);
      audio.removeEventListener('timeupdate', handleAudioTimeUpdate);
    };
  }, [audioRef]);

  // 🎯 SMART: Mouse handlers using InteractionManager
  const handleCanvasMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🎯 Use InteractionManager for smart handling
    const result = interactionManagerRef.current.handleMouseDown(
      x, canvas.width, duration, startTime, endTime
    );
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'startDrag':
          setIsDragging(result.handle);
          canvas.style.cursor = result.cursor;
          break;
          
        case 'jumpToTime':
          // 🔥 **IMMEDIATE CURSOR SYNC**: Update cursor ngay lập tức khi jump
          console.log(`🎯 [QuickJump] Jumping to ${result.time.toFixed(2)}s with immediate cursor sync`);
          jumpToTime(result.time);
          
          // 🔥 **FORCE CURSOR UPDATE**: Đảm bảo cursor update ngay
          if (audioRef.current) {
            audioRef.current.currentTime = result.time;
            setCurrentTime(result.time);
            console.log(`🎯 [CursorSync] Immediate cursor update to ${result.time.toFixed(2)}s`);
          }
          break;
          
        case 'createSelection':
          setStartTime(result.startTime);
          setEndTime(result.endTime);
          setIsDragging(result.handle || 'end'); // Default to 'end' for new selections
          canvas.style.cursor = result.cursor;
          break;
          
        case 'updateStart':
          console.log(`📍 [Smart Update] Start: ${startTime.toFixed(2)}s → ${result.startTime.toFixed(2)}s`);
          setStartTime(result.startTime);
          canvas.style.cursor = result.cursor;
          
          // 🔥 **IMMEDIATE CURSOR SYNC**: Sync audio cursor ngay lập tức
          if (audioRef.current) {
            console.log(`🚀 [FastSync] Immediate cursor to start: ${result.startTime.toFixed(2)}s`);
            audioRef.current.currentTime = result.startTime;
            setCurrentTime(result.startTime);
          }
          
          // 🆕 SAVE HISTORY: Save state after smart update
          setTimeout(() => {
            saveState({ startTime: result.startTime, endTime, fadeIn, fadeOut });
            console.log('💾 [History] Saved state after smart start update');
          }, 100);
          break;
          
        case 'updateEnd':
          console.log(`📍 [Smart Update] End: ${endTime.toFixed(2)}s → ${result.endTime.toFixed(2)}s`);
          setEndTime(result.endTime);
          canvas.style.cursor = result.cursor;
          
          // 🔥 **IMMEDIATE CURSOR SYNC**: Sync to preview position (2s before end)
          if (audioRef.current) {
            const previewTime = Math.max(0, result.endTime - 2.0); // 2 seconds before end
            console.log(`🚀 [FastSync] Immediate cursor to preview: ${previewTime.toFixed(2)}s (2s before ${result.endTime.toFixed(2)}s)`);
            audioRef.current.currentTime = previewTime;
            setCurrentTime(previewTime);
          }
          
          // 🆕 SAVE HISTORY: Save state after smart update
          setTimeout(() => {
            saveState({ startTime, endTime: result.endTime, fadeIn, fadeOut });
            console.log('💾 [History] Saved state after smart end update');
          }, 100);
          break;
          
        case 'none':
          console.log(`⚠️ [Smart Click] No action: ${result.reason || 'Unknown reason'}`);
          break;
          
        default:
          console.log(`⚠️ [Smart Click] Unhandled action: ${result.action}`);
          break;
      }
    };
    
    // 🎯 BATCH UPDATES: Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [canvasRef, duration, startTime, endTime, jumpToTime, setStartTime, setEndTime, setIsDragging, audioRef, setCurrentTime, isPlaying, saveState, fadeIn, fadeOut]);

  const handleCanvasMouseMove = useCallback((e) => {
    const now = performance.now();
    
    // 🔥 **ULTRA-RESPONSIVE THROTTLING**: Tăng frame rate cho smooth cursor sync
    const manager = interactionManagerRef.current;
    const throttleInterval = manager.getDebugInfo().isDragging ? 4 : 30; // 250fps vs 33fps
    
    if (now - lastMouseTimeRef.current < throttleInterval) return;
    lastMouseTimeRef.current = now;
    
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🆕 AUDIO CONTEXT: Prepare context for audio sync
    const audioContext = {
      audioRef,
      setCurrentTime,
      isPlaying
    };
    
    // 🎯 Use InteractionManager for smart handling WITH audio sync
    const result = manager.handleMouseMove(
      x, canvas.width, duration, startTime, endTime, audioContext
    );
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'updateRegion':
          if (result.startTime !== undefined) setStartTime(result.startTime);
          if (result.endTime !== undefined) setEndTime(result.endTime);
          
          // 🔥 **REAL-TIME CURSOR SYNC**: Update cursor ngay khi drag để mượt mà
          if (result.audioSynced) {
            console.log(`🚀 [RealTimeSync] Cursor synced during ${result.startTime !== undefined ? 'start' : 'end'} handle drag`);
          } else if (audioRef.current && !isPlaying) {
            // 🔥 **MANUAL SYNC**: Nếu không auto-sync thì manual sync
            const syncTime = result.startTime !== undefined ? result.startTime : 
                            result.endTime !== undefined ? Math.max(0, result.endTime - 1.5) : null;
            
            if (syncTime !== null) {
              audioRef.current.currentTime = syncTime;
              setCurrentTime(syncTime);
              console.log(`🎯 [ManualSync] Cursor manually synced to ${syncTime.toFixed(2)}s during drag`);
            }
          }
          break;
          
        case 'updateHover':
          setHoveredHandle(result.handle);
          canvas.style.cursor = result.cursor;
          break;
          
        default:
          break;
      }
    };
    
    // 🎯 IMMEDIATE updates for dragging, debounced for hover
    if (result.significant) {
      processAction(); // Immediate for dragging
    } else if (result.action !== 'none') {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processAction);
      } else {
        setTimeout(processAction, 0);
      }
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, audioRef, setCurrentTime, isPlaying]);

  const handleCanvasMouseUp = useCallback(() => {
    const canvas = canvasRef.current;
    const manager = interactionManagerRef.current;
    
    // 🆕 AUDIO CONTEXT: Prepare context for final sync
    const audioContext = {
      audioRef,
      setCurrentTime,
      isPlaying
    };
    
    // 🎯 Use InteractionManager for smart handling WITH final audio sync
    const result = manager.handleMouseUp(startTime, endTime, audioContext);
    
    // 🎯 Process action based on result
    const processAction = () => {
      switch (result.action) {
        case 'completeDrag':
          setIsDragging(null);
          canvas.style.cursor = result.cursor;
          
          // 🆕 AUDIO SYNC FEEDBACK: Log final sync
          if (result.audioSynced) {
            console.log(`🏁 [AudioSync] Final cursor sync completed after drag`);
          }
          
          // 🎯 Save history after drag completion
          if (result.saveHistory) {
            setTimeout(() => {
              saveState({ startTime, endTime, fadeIn, fadeOut });
              console.log('💾 [History] Saved state after drag completion');
            }, 100);
          }
          break;
          
        default:
          setIsDragging(null);
          if (canvas) canvas.style.cursor = result.cursor;
          break;
      }
    };
    
    // 🎯 BATCH UPDATES
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [canvasRef, startTime, endTime, fadeIn, fadeOut, saveState, setIsDragging, audioRef, setCurrentTime, isPlaying]);

  const handleCanvasMouseLeave = useCallback(() => {
    const canvas = canvasRef.current;
    const manager = interactionManagerRef.current;
    
    // 🎯 Use InteractionManager for smart handling
    const result = manager.handleMouseLeave();
    
    // 🎯 Process action based on result
    const processAction = () => {
      if (result.action === 'clearHover') {
        setHoveredHandle(null);
        if (canvas) canvas.style.cursor = result.cursor;
      }
    };
    
    // 🎯 DEBOUNCED UPDATES for mouse leave
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [canvasRef, setHoveredHandle]);

  // 🎯 OPTIMIZED: Time change handlers with better debouncing
  const handleStartTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, 0, endTime);
    setStartTime(clampedTime);
    
    // 🆕 DEBOUNCED HISTORY SAVE: Only save after user stops changing
    const saveTimeout = setTimeout(() => {
      saveState({ startTime: clampedTime, endTime, fadeIn, fadeOut });
    }, 300); // 300ms delay
    
    return () => clearTimeout(saveTimeout);
  }, [endTime, setStartTime, saveState, fadeIn, fadeOut]);

  const handleEndTimeChange = useCallback((newTime) => {
    const clampedTime = clamp(newTime, startTime, duration);
    setEndTime(clampedTime);
    
    // 🆕 DEBOUNCED HISTORY SAVE: Only save after user stops changing
    const saveTimeout = setTimeout(() => {
      saveState({ startTime, endTime: clampedTime, fadeIn, fadeOut });
    }, 300); // 300ms delay
    
    return () => clearTimeout(saveTimeout);
  }, [startTime, duration, setEndTime, saveState, fadeIn, fadeOut]);

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
  const handleJumpToStart = useCallback(() => jumpToTime(startTime), [jumpToTime, startTime]);
  const handleJumpToEnd = useCallback(() => jumpToTime(endTime), [jumpToTime, endTime]);

  // 🎯 OPTIMIZED: Audio event handlers with enhanced error handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 🆕 DEBOUNCED LOGGING: Move logging out of render cycle
    if (!isSetupRef.current) {
      setTimeout(() => console.log('🎧 [Audio] Event listeners setup'), 0);
    }

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;
      setTimeout(() => console.log('📊 [Audio] Duration:', audioDuration.toFixed(2)), 0);
      
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
      setTimeout(() => console.log('🏁 [Audio] Ended'), 0);
      
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

    // 🆕 OPTIMIZED: Use requestIdleCallback for non-critical state updates
    const handlePlay = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => setIsPlaying(true));
      } else {
        setTimeout(() => setIsPlaying(true), 0);
      }
    };
    
    const handlePause = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => setIsPlaying(false));
      } else {
        setTimeout(() => setIsPlaying(false), 0);
      }
    };

    // 🆕 ENHANCED: Detailed audio error handling
    const handleError = (e) => {
      const error = e.target.error;
      const filename = audioFile?.name || 'audio file';
      
      setTimeout(() => {
        console.error('❌ [Audio] Error Details:', {
          code: error?.code,
          message: error?.message,
          filename: filename,
          currentSrc: audio.src
        });
      }, 0);
      
      // 🆕 GENERATE DETAILED ERROR MESSAGE
      const errorDetails = getAudioErrorMessage(error, filename);
      
      console.error('❌ [Audio Error Analysis]', errorDetails);
      
      // 🆕 SET DETAILED AUDIO ERROR STATE
      setAudioError({
        type: 'playback',
        title: errorDetails.title,
        message: errorDetails.message,
        suggestion: errorDetails.suggestion,
        code: errorDetails.code,
        filename: errorDetails.filename,
        supportedFormats: errorDetails.supportedFormats,
        // 🆕 ADD COMPATIBILITY INFO IF AVAILABLE
        compatibilityInfo: fileValidation?.info?.browserSupport,
        detectedFormat: fileValidation?.info?.detectedMimeType ? 
          getFormatDisplayName(fileValidation.info.detectedMimeType) : 'Unknown'
      });
      
      // 🆕 LOG TO DEBUG PANEL
      addManualLog('error', [
        `❌ Audio Error: ${errorDetails.title}`,
        `📄 File: ${filename}`,
        `🔧 Code: ${errorDetails.code}`,
        `💡 Suggestion: ${errorDetails.suggestion}`
      ]);
      
      // 🆕 AUTO-STOP PLAYBACK ON ERROR
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => setIsPlaying(false));
      } else {
        setTimeout(() => setIsPlaying(false), 0);
      }
    };

    // Event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [audioRef, setCurrentTime, setDuration, setIsPlaying, setEndTime, audioFile, fileValidation, addManualLog]);

  // 🆕 NEW: Audio error handlers
  const handleDismissAudioError = useCallback(() => {
    setAudioError(null);
    addManualLog('info', ['🔧 Audio error dismissed']);
  }, [addManualLog]);

  const handleRetryAudioLoad = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audioFile?.url) {
      console.log('🔄 [Retry] Attempting to reload audio...');
      addManualLog('info', ['🔄 Retrying audio load...']);
      
      // Clear error and try again
      setAudioError(null);
      audio.load();
    }
  }, [audioRef, audioFile, addManualLog]);

  // Global selection function for quick actions
  useEffect(() => {
    window.mp3CutterSetSelection = (start, end) => {
      setStartTime(start);
      setEndTime(end);
      saveState({ startTime: start, endTime: end, fadeIn, fadeOut });
    };
    
    // 🆕 NEW: Global smart click configuration
    window.mp3CutterConfigureSmartClick = (preferences) => {
      if (interactionManagerRef.current) {
        interactionManagerRef.current.configureSmartClick(preferences);
        console.log('⚙️ [MP3Cutter] Smart click configured globally:', preferences);
      }
    };
    
    // 🆕 NEW: Global audio sync configuration  
    window.mp3CutterConfigureAudioSync = (preferences) => {
      if (interactionManagerRef.current) {
        interactionManagerRef.current.configureAudioSync(preferences);
        console.log('⚙️ [MP3Cutter] Audio sync configured globally:', preferences);
        
        // 🆕 DISPLAY CURRENT SETTINGS: Show important settings
        const debugInfo = interactionManagerRef.current.getAudioSyncDebugInfo();
        if (debugInfo) {
          console.log('📊 [Current Audio Sync Settings]:', {
            startHandle: debugInfo.preferences?.syncStartHandle ? 'Enabled' : 'Disabled',
            endHandle: debugInfo.preferences?.syncEndHandle ? 'Enabled' : 'Disabled',
            endOffset: debugInfo.preferences?.endHandleOffset ? debugInfo.preferences.endHandleOffset + 's' : 'None',
            syncWhenPaused: !debugInfo.preferences?.syncOnlyWhenPlaying ? 'Yes' : 'No'
          });
        }
      }
    };
    
    // 🆕 NEW: Global audio loop configuration for region end behavior
    window.mp3CutterConfigureAutoReturn = (enabled = true) => {
      if (typeof enabled === 'boolean') {
        // Store preference in component state or localStorage for persistence
        localStorage.setItem('mp3cutter_auto_return', enabled.toString());
        console.log(`⚙️ [MP3Cutter] Auto-return to start configured: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`📋 [Behavior] When region ends: ${enabled ? 'Return to start & pause' : 'Just pause at end'}`);
      } else {
        console.warn('⚠️ [MP3Cutter] Invalid auto-return value. Use: true or false');
      }
    };
    
    // 🆕 NEW: Global function to check current auto-return setting
    window.mp3CutterGetAutoReturnStatus = () => {
      const enabled = localStorage.getItem('mp3cutter_auto_return') !== 'false'; // Default true
      console.log(`📊 [MP3Cutter] Auto-return status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return enabled;
    };
    
    // 🔥 **EXPOSE DEBUG FUNCTIONS**: Cho phép test cursor movement
    window.mp3CutterTestCursor = () => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        const isPlaying = !audioRef.current.paused;
        
        console.log('🧪 [CursorTest] Audio State:', {
          currentTime: currentTime.toFixed(2) + 's',
          duration: duration.toFixed(2) + 's',
          isPlaying,
          animationState: animationStateRef.current
        });
        
        return { currentTime, duration, isPlaying };
      }
      return null;
    };
    
    // 🔥 **MANUAL CURSOR UPDATE**: Force cursor update for testing
    window.mp3CutterForceCursorUpdate = () => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        console.log('🔄 [CursorTest] Forced cursor update to:', time.toFixed(2) + 's');
      }
    };
    
    // 🔥 **CURSOR SYNC TEST**: Test cursor movement performance
    window.mp3CutterTestCursorSync = (targetTime) => {
      if (audioRef.current && typeof targetTime === 'number') {
        const startTime = performance.now();
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        const endTime = performance.now();
        
        console.log('🚀 [CursorSyncTest] Performance:', {
          targetTime: targetTime.toFixed(2) + 's',
          syncDuration: (endTime - startTime).toFixed(2) + 'ms',
          actualTime: audioRef.current.currentTime.toFixed(2) + 's'
        });
        
        return {
          target: targetTime,
          actual: audioRef.current.currentTime,
          syncTime: endTime - startTime
        };
      }
      console.warn('⚠️ [CursorSyncTest] Invalid parameters or no audio loaded');
      return null;
    };
    
    // 🔥 **DRAG PERFORMANCE TEST**: Test drag responsiveness
    window.mp3CutterTestDragPerformance = () => {
      const manager = interactionManagerRef.current;
      if (manager) {
        const debugInfo = manager.getDebugInfo();
        console.log('🎯 [DragPerformanceTest] Current settings:', {
          throttleInterval: debugInfo.isDragging ? '4ms (250fps)' : '30ms (33fps)',
          isDragging: debugInfo.isDragging,
          lastUpdateTime: debugInfo.lastUpdateTime,
          interactionCount: debugInfo.interactionCount || 'N/A'
        });
        return debugInfo;
      }
      return null;
    };
    
    return () => {
      delete window.mp3CutterSetSelection;
      delete window.mp3CutterConfigureSmartClick;
      delete window.mp3CutterConfigureAudioSync;
      delete window.mp3CutterConfigureAutoReturn;
      delete window.mp3CutterGetAutoReturnStatus;
      delete window.mp3CutterTestCursor;
      delete window.mp3CutterForceCursorUpdate;
      delete window.mp3CutterTestCursorSync;
      delete window.mp3CutterTestDragPerformance;
    };
  }, [setStartTime, setEndTime, saveState, fadeIn, fadeOut, interactionManagerRef]);

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
        {/* 🎯 NEW: Global Error Display */}
        {(connectionError || uploadError) && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">
                  {connectionError ? 'Connection Error' : 'Upload Error'}
                </h3>
                <p className="text-sm text-red-700">
                  {connectionError || uploadError}
                </p>
                {connectionError && (
                  <div className="mt-2">
                    <button
                      onClick={() => testConnection()}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🆕 NEW: Audio Error Alert */}
        <AudioErrorAlert
          error={audioError}
          onDismiss={handleDismissAudioError}
          onRetry={handleRetryAudioLoad}
          compatibilityReport={compatibilityReport}
        />

        {!audioFile ? (
          /* Upload Section */
          <div 
            className={`border-2 border-dashed rounded-2xl p-16 text-center backdrop-blur-sm transition-all duration-300 ${
              isConnected === false 
                ? 'border-red-300 bg-red-50/60 hover:border-red-400' 
                : 'border-indigo-300 bg-white/60 hover:border-indigo-400 hover:bg-white/80'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className={`mx-auto mb-4 w-16 h-16 ${
              isConnected === false ? 'text-red-400' : 'text-indigo-400'
            }`} />
            <h3 className="text-xl font-semibold mb-2 text-slate-800">
              {isConnected === false ? 'Backend Offline' : 'Upload Audio File'}
            </h3>
            <p className="text-slate-600 mb-6">
              {isConnected === false 
                ? 'Please start the backend server to upload files' 
                : 'Drag & drop your audio file here or click to browse'
              }
            </p>
            
            {/* 🆕 COMPATIBILITY INFO */}
            {compatibilityReport && (
              <div className="mb-6">
                <div className="text-sm text-slate-600 mb-2">Supported Formats:</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {Object.values(compatibilityReport.universal)
                    .filter(format => format.support.level === 'high')
                    .map((format, index) => (
                      <span 
                        key={index}
                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                      >
                        {format.displayName}
                      </span>
                    ))}
                </div>
              </div>
            )}
            
            {/* 🎯 Upload Progress Display */}
            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress || 0}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">Uploading... {uploadProgress || 0}%</p>
              </div>
            )}
            
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
              disabled={isUploading || isConnected === false}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-6 py-3 rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl font-medium ${
                isUploading || isConnected === false
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              }`}
            >
              {isUploading ? 'Uploading...' : isConnected === false ? 'Backend Offline' : 'Choose File'}
            </label>
          </div>
        ) : (
          /* Audio Editor */
          <div className="space-y-4">
            {/* File Info */}
            <FileInfo
              audioFile={audioFile}
              duration={duration}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FadeControls
                fadeIn={fadeIn}
                fadeOut={fadeOut}
                onFadeInChange={setFadeIn}
                onFadeOutChange={setFadeOut}
              />

              <Export
                outputFormat={outputFormat}
                onFormatChange={setOutputFormat}
                audioFile={audioFile}
                startTime={startTime}
                endTime={endTime}
                fadeIn={fadeIn}
                fadeOut={fadeOut}
                disabled={!audioFile || isConnected === false}
              />
            </div>
          </div>
        )}
        
        {/* 🎯 NEW: Interactive Debug Panel */}
        <DebugPanel
          logs={logs}
          isCapturing={isCapturing}
          clearLogs={clearLogs}
          toggleCapturing={toggleCapturing}
          getLogsCounts={getLogsCounts}
        />

        {/* 🎯 NEW: Interaction Debug (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <InteractionDebug interactionManagerRef={interactionManagerRef} />
        )}

        {/* 🎯 NEW: Audio Sync Debug (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <AudioSyncDebug 
            interactionManagerRef={interactionManagerRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
          />
        )}

        {/* 🎯 NEW: Smart Click Debug (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <SmartClickDebug 
            interactionManagerRef={interactionManagerRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
          />
        )}
      </div>

      {/* 🎯 ENHANCED: Hidden audio element with proper src */}
      <audio 
        ref={audioRef} 
        preload="metadata"
        src={audioFile?.url || ''}
        style={{ display: 'none' }}
      />
    </div>
  );
});

MP3CutterMain.displayName = 'MP3CutterMain';

export default MP3CutterMain;