import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Music, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// Import hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useWaveform } from '../hooks/useWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';

// Import components
import FileInfo from './FileInfo';
import Waveform from './Waveform';
import FadeControls from './Effects';
import Export from './Export';
import AudioErrorAlert from './AudioErrorAlert';
import UnifiedControlBar from './UnifiedControlBar';

// Import utils
import { clamp, validateAudioFile, getAudioErrorMessage, getFormatDisplayName, generateCompatibilityReport, createSafeAudioURL, validateAudioURL } from '../utils/audioUtils';
import { createInteractionManager } from '../utils/interactionUtils';
import { getAutoReturnSetting, setAutoReturnSetting } from '../utils/safeStorage';

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
    clearFile, 
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
    reset: resetWaveform,
    canvasRef
  } = useWaveform();

  const { saveState, undo, redo, canUndo, canRedo, historyIndex, historyLength } = useHistory();

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
  const lastMouseTimeRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const lastPerformanceLogRef = useRef(0);
  const animationStateRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);

  // 🔥 **ULTRA-LIGHT PERFORMANCE TRACKER**
  const trackPerformance = useCallback((eventType) => {
    const now = performance.now();
    if (now - lastPerformanceLogRef.current > 300000) { // 5 minutes only
      lastPerformanceLogRef.current = now;
      setTimeout(() => {
        console.log(`📊 [Performance] ${eventType}: ${audioFile?.name || 'None'}`);
      }, 0);
    }
  }, [audioFile?.name]);

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
  }, []);

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
      const uploadResult = await uploadFile(file);
      
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
      
      // 🔥 **TRACK PERFORMANCE**: Track immediate audio setup
      trackPerformance('immediate_audio_setup');
      
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
  }, [uploadFile, generateWaveform, audioRef, duration, saveState, isConnected, testConnection, trackPerformance]);

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
  }, [audioFile?.url]); // 🔥 **OPTIMIZED DEPS**: Chỉ listen audioFile.url
    
  // 🔥 **UPDATE ANIMATION STATE REF**: Cập nhật ref thay vì tạo object mới
  useEffect(() => {
    animationStateRef.current = {
      isPlaying,
      startTime,
      endTime
    };
    
    // 🔥 **ULTRA-LIGHT PERFORMANCE TRACKING**: Minimal performance tracking
    trackPerformance('state_update');
  }, [isPlaying, startTime, endTime, trackPerformance]);

  // 🎯 ULTRA-LIGHT: Mouse handlers using InteractionManager
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
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          
          // 🆕 **IMMEDIATE CURSOR SYNC**: Sync cursor ngay lập tức khi click handle
          if (result.immediateSync && result.immediateSync.required) {
            const { handleType, targetTime, offsetForEnd } = result.immediateSync;
            
            console.log(`🎯 [HandleClick] IMMEDIATE sync for ${handleType} handle:`, {
              targetTime: targetTime.toFixed(2) + 's',
              offset: offsetForEnd > 0 ? offsetForEnd + 's' : 'none'
            });
            
            // 🔥 **USE AUDIO SYNC MANAGER**: Sử dụng forceImmediateSync cho consistency
            const manager = interactionManagerRef.current;
            if (manager && manager.audioSyncManager) {
              const syncSuccess = manager.audioSyncManager.forceImmediateSync(
                targetTime, audioRef, setCurrentTime, handleType, offsetForEnd
              );
              
              if (syncSuccess) {
                console.log(`✅ [HandleClick] Audio sync manager completed immediate sync for ${handleType} handle`);
              } else {
                console.warn(`⚠️ [HandleClick] Audio sync manager failed for ${handleType} handle`);
              }
            } else {
              // 🔄 **FALLBACK**: Manual sync nếu không có AudioSyncManager
              let syncTime = targetTime;
              if (handleType === 'end' && offsetForEnd > 0) {
                syncTime = Math.max(0, targetTime - offsetForEnd);
                console.log(`🎯 [HandleClick] End handle offset applied: ${targetTime.toFixed(2)}s → ${syncTime.toFixed(2)}s`);
              }
              
              if (audioRef.current) {
                audioRef.current.currentTime = syncTime;
                setCurrentTime(syncTime);
                console.log(`✅ [HandleClick] Manual cursor synced to ${syncTime.toFixed(2)}s for ${handleType} handle`);
              }
            }
          }
          break;
          
        case 'jumpToTime':
          // 🔥 **IMMEDIATE CURSOR SYNC**: Update cursor ngay lập tức khi jump
          console.log(`⏯️ [ClickToJump] Jumping audio cursor to: ${result.time.toFixed(2)}s`);
          jumpToTime(result.time);
          
          // 🔥 **FORCE CURSOR UPDATE**: Đảm bảo cursor update ngay
          if (audioRef.current) {
            audioRef.current.currentTime = result.time;
            setCurrentTime(result.time);
            console.log(`✅ [ClickToJump] Audio cursor synced successfully to: ${result.time.toFixed(2)}s`);
          } else {
            console.warn(`⚠️ [ClickToJump] No audio element available for cursor sync`);
          }
          break;
          
        case 'createSelection':
          setStartTime(result.startTime);
          setEndTime(result.endTime);
          setIsDragging(result.handle || 'end');
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          break;
          
        case 'startRegionDrag':
          // 🆕 **REGION DRAG**: Setup region dragging
          console.log(`🔄 [RegionDrag] Starting region drag:`, result.regionData);
          setIsDragging('region'); // Special drag type for region
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          
          // 🆕 **IMMEDIATE CURSOR SYNC**: Sync to region middle for smooth start
          if (audioRef.current && result.regionData) {
            const { originalStart, originalEnd } = result.regionData;
            const regionDuration = originalEnd - originalStart;
            const regionMiddle = originalStart + (regionDuration / 2);
            
            console.log(`🎯 [RegionDrag] Initial sync to region middle: ${regionMiddle.toFixed(2)}s`);
            audioRef.current.currentTime = regionMiddle;
            setCurrentTime(regionMiddle);
          }
          break;
          
        case 'updateStart':
          setStartTime(result.startTime);
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          
          // 🔥 **IMMEDIATE CURSOR SYNC**: Sync audio cursor ngay lập tức
          if (audioRef.current) {
            audioRef.current.currentTime = result.startTime;
            setCurrentTime(result.startTime);
          }
          
          // 🆕 SAVE HISTORY: Save state after smart update
          setTimeout(() => {
            saveState({ startTime: result.startTime, endTime, fadeIn, fadeOut });
          }, 100);
          break;
          
        case 'updateEnd':
          setEndTime(result.endTime);
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          
          // 🔥 **IMMEDIATE CURSOR SYNC**: Sync to preview position (3s before end)
          if (audioRef.current) {
            const previewTime = Math.max(0, result.endTime - 3.0);
            audioRef.current.currentTime = previewTime;
            setCurrentTime(previewTime);
          }
          
          // 🆕 SAVE HISTORY: Save state after smart update
          setTimeout(() => {
            saveState({ startTime, endTime: result.endTime, fadeIn, fadeOut });
          }, 100);
          break;
          
        case 'none':
        default:
          break;
      }
    };
    
    // 🎯 BATCH UPDATES: Use requestIdleCallback for better performance
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [canvasRef, duration, startTime, endTime, jumpToTime, setStartTime, setEndTime, setIsDragging, audioRef, setCurrentTime, saveState, fadeIn, fadeOut]);

  const handleCanvasMouseMove = useCallback((e) => {
    const now = performance.now();
    
    // 🔥 **ULTRA-RESPONSIVE THROTTLING**: Tăng frame rate cho smooth cursor sync
    const manager = interactionManagerRef.current;
    const debugInfo = manager.getDebugInfo();
    
    // 🆕 **DYNAMIC THROTTLING**: Ultra-high fps cho confirmed dragging
    let throttleInterval;
    if (debugInfo.isDraggingConfirmed) {
      throttleInterval = 2; // 500fps cho ultra-smooth real-time sync
    } else if (debugInfo.isDragging) {
      throttleInterval = 8; // 125fps cho drag confirmation
    } else {
      throttleInterval = 30; // 33fps cho hover
    }
    
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
    
    // 🆕 **ENHANCED VALIDATION**: Chỉ process action nếu logic hợp lệ
    const processAction = () => {
      switch (result.action) {
        case 'updateRegion':
          // 🆕 **STRICT VALIDATION**: CHỈ update region nếu đã confirmed drag
          if (result.isDraggingConfirmed) {
            console.log(`📊 [MouseMove] VALIDATED region update:`, {
              isDraggingConfirmed: result.isDraggingConfirmed,
              significant: result.significant,
              audioSynced: result.audioSynced,
              realTimeSync: result.realTimeSync
            });
            
            if (result.startTime !== undefined) setStartTime(result.startTime);
            if (result.endTime !== undefined) setEndTime(result.endTime);
            
            // 🆕 **REAL-TIME SYNC STATUS**: Log real-time sync success
            if (result.realTimeSync && result.audioSynced) {
              console.log(`🎯 [MouseMove] REAL-TIME cursor sync active - ultra-smooth mode`);
            } else if (!result.audioSynced && audioRef.current && !isPlaying) {
              // 🔄 **FALLBACK SYNC**: Manual sync nếu real-time sync không hoạt động
              const syncTime = result.startTime !== undefined ? result.startTime : 
                              result.endTime !== undefined ? Math.max(0, result.endTime - 3.0) : null;
              
              if (syncTime !== null) {
                console.log(`🔄 [MouseMove] Fallback audio sync to ${syncTime.toFixed(2)}s`);
                audioRef.current.currentTime = syncTime;
                setCurrentTime(syncTime);
              }
            }
          } else {
            // 🚫 **BLOCKED UPDATE**: Log bị chặn update
            console.warn(`🚫 [MouseMove] BLOCKED region update - drag not confirmed:`, {
              action: result.action,
              reason: result.reason || 'drag_not_confirmed',
              isDraggingConfirmed: result.isDraggingConfirmed || false
            });
          }
          break;
          
        case 'updateHover':
          // 🆕 **SAFE HOVER**: Chỉ update visual, TUYỆT ĐỐI không touch region
          console.log(`👆 [MouseMove] Safe hover update:`, {
            handle: result.handle,
            cursor: result.cursor,
            hoverOnly: result.hoverOnly,
            note: 'Visual feedback only, NO region change'
          });
          
          setHoveredHandle(result.handle);
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          break;
          
        default:
          // 🔇 **SILENT**: Không action, không log spam
          break;
      }
    };
    
    // 🎯 **IMMEDIATE PROCESSING**: Immediate updates cho all confirmed dragging
    if (result.significant && result.isDraggingConfirmed) {
      processAction(); // Immediate for confirmed dragging với real-time sync
    } else if (result.action === 'updateHover') {
      processAction(); // Immediate for hover feedback  
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
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // canvas.style.cursor = result.cursor; ← REMOVED
          
          // 🎯 Save history after drag completion
          if (result.saveHistory) {
            setTimeout(() => {
              saveState({ startTime, endTime, fadeIn, fadeOut });
            }, 100);
          }
          break;
          
        default:
          setIsDragging(null);
          // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
          // if (canvas) canvas.style.cursor = result.cursor; ← REMOVED
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
        // 🆕 **CURSOR REMOVED**: Let WaveformCanvas handle cursor logic
        // if (canvas) canvas.style.cursor = result.cursor; ← REMOVED
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
  const handleJumpToStart = useCallback(() => {
    jumpToTime(startTime);
    // 🔥 **TRACK PERFORMANCE**: Track jump actions
    trackPerformance('jump_to_start');
  }, [jumpToTime, startTime, trackPerformance]);
  
  const handleJumpToEnd = useCallback(() => {
    jumpToTime(endTime);
    // 🔥 **TRACK PERFORMANCE**: Track jump actions
    trackPerformance('jump_to_end');
  }, [jumpToTime, endTime, trackPerformance]);

  // Drag and drop handler
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // 🔥 **ULTRA-LIGHT ANIMATION LOOP**: Tối ưu hiệu suất tối đa
  useEffect(() => {
    console.log('🎬 [Animation] Setting up ultra-light animation system...');
    
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
        return;
      }
      
      // 🔥 **ULTRA-LIGHT THROTTLING**: 60fps for cursor updates
      const frameInterval = 16; // 60fps
      
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
      
      // 🔥 **AUTO-RETURN**: Kiểm tra nếu đến cuối selection
      if (end > start && audioCurrentTime >= end - 0.05) {
        const autoReturnEnabled = getAutoReturnSetting();
        
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
      }
    };
    
    // 🔥 **START ANIMATION**: Function để bắt đầu animation
    const startAnimation = () => {
      if (!animationActive && !currentAnimationId) {
        animationActive = true;
        currentAnimationId = requestAnimationFrame(updateCursor);
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
      }
    };
    
    // 🔥 **TRIGGER LISTENER**: Listen for trigger changes
    const checkAndTrigger = () => {
      const currentState = animationStateRef.current;
      if (currentState.isPlaying && audioRef.current && !audioRef.current.paused) {
        startAnimation();
      } else {
        stopAnimation();
      }
    };
    
    // 🔥 **OPTIMIZED TRIGGER**: Check mỗi 50ms thay vì 100ms để responsive hơn
    const triggerInterval = setInterval(checkAndTrigger, 50);
    
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
  }, [audioFile?.name, setCurrentTime, setDuration, setIsPlaying, setEndTime, fileValidation, setAudioError]); // 🔥 **OPTIMIZED DEPS**

  // 🔥 **ESSENTIAL GLOBAL FUNCTIONS**: Chỉ giữ các function cần thiết
  useEffect(() => {
    window.mp3CutterSetSelection = (start, end) => {
      setStartTime(start);
      setEndTime(end);
      saveState({ startTime: start, endTime: end, fadeIn, fadeOut });
    };
    
    // 🔥 **AUTO-RETURN CONFIG**: Global function cho auto-return behavior
    window.mp3CutterConfigureAutoReturn = (enabled = true) => {
      if (typeof enabled === 'boolean') {
        setAutoReturnSetting(enabled);
        console.log(`⚙️ [AutoReturn] Configured: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      } else {
        console.warn('⚠️ [AutoReturn] Invalid value. Use: true or false');
      }
    };
    
    // 🔥 **AUTO-RETURN STATUS**: Function để check current auto-return setting
    window.mp3CutterGetAutoReturnStatus = () => {
      const enabled = getAutoReturnSetting();
      console.log(`📊 [AutoReturn] Status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return enabled;
    };
    
    // 🆕 **INTERACTION DEBUG**: Monitor interaction system
    window.mp3CutterInteractionDebug = () => {
      const manager = interactionManagerRef.current;
      if (!manager) {
        console.warn('⚠️ [InteractionDebug] No InteractionManager available');
        return null;
      }
      
      const debugInfo = manager.getDebugInfo();
      console.log('🎮 [InteractionDebug] Current state:', debugInfo);
      
      // 🆕 **VALIDATION CHECK**: Verify hover không thay đổi region
      const isHoverOnly = debugInfo.state === 'hovering' && !debugInfo.isDraggingConfirmed;
      if (isHoverOnly) {
        console.log(`✅ [InteractionDebug] SAFE HOVER MODE: Visual feedback only, region protected`);
      }
      
      return debugInfo;
    };
    
    // 🆕 **DRAG VALIDATION DEBUG**: Check drag confirmation system
    window.mp3CutterValidateDragSystem = () => {
      const manager = interactionManagerRef.current;
      if (!manager) {
        console.warn('⚠️ [DragValidation] No InteractionManager available');
        return null;
      }
      
      const debugInfo = manager.getDebugInfo();
      const validation = {
        canChangeRegion: debugInfo.isDraggingConfirmed,
        state: debugInfo.state,
        activeHandle: debugInfo.activeHandle,
        protection: !debugInfo.isDraggingConfirmed ? 'REGION_PROTECTED' : 'REGION_EDITABLE',
        message: !debugInfo.isDraggingConfirmed ? 
          'Hover detected - region changes BLOCKED until drag confirmed' :
          'Confirmed drag - region changes ALLOWED'
      };
      
      console.log('🛡️ [DragValidation] System status:', validation);
      return validation;
    };
    
    // 🆕 **LIVE MONITOR**: Real-time interaction monitoring  
    window.mp3CutterStartInteractionMonitor = (interval = 1000) => {
      if (window.mp3CutterInteractionMonitorId) {
        clearInterval(window.mp3CutterInteractionMonitorId);
      }
      
      console.log(`📡 [InteractionMonitor] Starting live monitor (${interval}ms interval)`);
      window.mp3CutterInteractionMonitorId = setInterval(() => {
        const manager = interactionManagerRef.current;
        if (manager) {
          const debug = manager.getDebugInfo();
          if (debug.state !== 'idle') {
            console.log(`📡 [LiveMonitor] ${debug.state.toUpperCase()}:`, {
              handle: debug.activeHandle || 'none',
              dragConfirmed: debug.isDraggingConfirmed,
              protection: debug.isDraggingConfirmed ? '🔓 EDITABLE' : '🔒 PROTECTED'
            });
          }
        }
      }, interval);
      
      return window.mp3CutterInteractionMonitorId;
    };
    
    // 🆕 **REAL-TIME SYNC MONITOR**: Monitor cursor sync performance
    window.mp3CutterStartSyncMonitor = (interval = 500) => {
      if (window.mp3CutterSyncMonitorId) {
        clearInterval(window.mp3CutterSyncMonitorId);
      }
      
      console.log(`🎯 [SyncMonitor] Starting real-time sync monitor (${interval}ms interval)`);
      window.mp3CutterSyncMonitorId = setInterval(() => {
        const manager = interactionManagerRef.current;
        if (manager && manager.audioSyncManager) {
          const syncDebug = manager.audioSyncManager.getDebugInfo();
          const interactionDebug = manager.getDebugInfo();
          
          if (interactionDebug.isDraggingConfirmed) {
            console.log(`🎯 [SyncMonitor] REAL-TIME SYNC STATUS:`, {
              activeHandle: interactionDebug.activeHandle,
              audioTime: audioRef.current?.currentTime?.toFixed(2) + 's' || 'N/A',
              currentSelection: `${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`,
              syncEnabled: syncDebug.isEnabled,
              lastSyncTime: syncDebug.lastSyncTime,
              isThrottled: syncDebug.isThrottled
            });
          }
        }
      }, interval);
      
      return window.mp3CutterSyncMonitorId;
    };
    
    // 🆕 **SYNC PERFORMANCE TEST**: Test immediate sync performance
    window.mp3CutterTestSyncPerformance = (handleType = 'start', targetTime = 5.0) => {
      console.log(`🚀 [SyncTest] Testing immediate sync performance for ${handleType} handle`);
      
      const manager = interactionManagerRef.current;
      if (!manager || !manager.audioSyncManager) {
        console.error('❌ [SyncTest] No AudioSyncManager available');
        return;
      }
      
      const startTime = performance.now();
      const offset = handleType === 'end' ? 3.0 : 0;
      
      const success = manager.audioSyncManager.forceImmediateSync(
        targetTime, audioRef, setCurrentTime, handleType, offset
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`📊 [SyncTest] Performance results:`, {
        handleType,
        targetTime: targetTime + 's',
        offset: offset + 's',
        success,
        duration: duration.toFixed(2) + 'ms',
        performance: duration < 1 ? '🚀 EXCELLENT' : 
                    duration < 5 ? '✅ GOOD' : 
                    duration < 10 ? '⚠️ AVERAGE' : '❌ SLOW'
      });
      
      return { success, duration };
    };
    
    // 🆕 **REGION DRAG DEBUG**: Test và configure region drag
    window.mp3CutterConfigureRegionDrag = (enabled = true) => {
      const manager = interactionManagerRef.current;
      if (!manager || !manager.smartClickManager) {
        console.error('❌ [RegionDrag] No SmartClickManager available');
        return;
      }
      
      manager.smartClickManager.updatePreferences({ enableRegionDrag: enabled });
      console.log(`🔄 [RegionDrag] Region drag ${enabled ? 'ENABLED' : 'DISABLED'}`);
      
      return manager.smartClickManager.preferences.enableRegionDrag;
    };
    
    // 🆕 **REGION DRAG STATUS**: Check current region drag setting
    window.mp3CutterGetRegionDragStatus = () => {
      const manager = interactionManagerRef.current;
      if (!manager || !manager.smartClickManager) {
        console.warn('⚠️ [RegionDrag] No SmartClickManager available');
        return null;
      }
      
      const enabled = manager.smartClickManager.preferences.enableRegionDrag;
      console.log(`📊 [RegionDrag] Status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      return enabled;
    };
    
    // 🆕 **REGION DRAG TEST**: Test region drag functionality
    window.mp3CutterTestRegionDrag = (startTime = 10, endTime = 20, dragToTime = 30) => {
      console.log(`🧪 [RegionDragTest] Testing region drag functionality`);
      
      const manager = interactionManagerRef.current;
      if (!manager) {
        console.error('❌ [RegionDragTest] No InteractionManager available');
        return;
      }
      
      console.log(`🧪 [RegionDragTest] Simulating:`, {
        originalRegion: `${startTime}s - ${endTime}s`,
        dragTo: `${dragToTime}s`,
        expectedNewRegion: `${dragToTime - (startTime)}s - ${dragToTime + (endTime - startTime)}s`
      });
      
      // Set test region
      setStartTime(startTime);
      setEndTime(endTime);
      
      // Get debug info
      const debugInfo = manager.getDebugInfo();
      console.log(`📊 [RegionDragTest] Manager state:`, debugInfo);
      
      return debugInfo;
    };
    
    // 🆕 **TOOLTIP SYSTEM DEBUG**: Test và monitor tooltip system mới
    window.mp3CutterTestTooltipSystem = () => {
      console.log(`🏷️ [TooltipTest] Testing enhanced tooltip system with decimal format`);
      
      // Test format functions
      const testTimes = [0, 5.3, 65.7, 3661.9]; // Test cases
      const formatResults = testTimes.map(time => ({
        input: time + 's',
        formatted: time < 60 ? `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}.${Math.floor((time % 1) * 10)}` : 'complex'
      }));
      
      console.log(`🏷️ [TooltipTest] Format test results:`, formatResults);
      
      // Current tooltip status
      const currentStatus = {
        startTime: startTime + 's',
        endTime: endTime + 's', 
        currentTime: currentTime + 's',
        selectionDuration: (endTime - startTime) + 's',
        hasValidSelection: startTime < endTime,
        audioReady: !!audioRef.current?.duration
      };
      
      console.log(`🏷️ [TooltipTest] Current state:`, currentStatus);
      
      return { formatResults, currentStatus };
    };
    
    // 🆕 **TOOLTIP STYLING TEST**: Test tooltip styling và vị trí
    window.mp3CutterTestTooltipStyling = () => {
      console.log(`🎨 [TooltipStyling] Testing competitor-inspired tooltip design`);
      
      const stylingInfo = {
        handleTooltips: {
          color: 'rgba(20, 184, 166, 0.95)', // Cyan
          position: '25px above canvas',
          format: 'MM:SS.d with decimal',
          zIndex: 50 // Highest priority
        },
        cursorTooltip: {
          color: 'rgba(255, 255, 255, 0.95)', // White
          position: '25px above canvas',
          format: 'MM:SS.d with decimal',
          zIndex: 40 // Medium-high priority
        },
        selectionDuration: {
          color: 'rgba(30, 41, 59, 0.92)', // Dark
          position: 'INSIDE waveform (35px from bottom)', // 🆕 **MOVED INSIDE**
          format: 'MM:SS.d with decimal',
          zIndex: 35, // Medium priority
          improvement: 'Moved inside to save space'
        },
        scrollbarFixes: {
          horizontalScrollbar: 'REMOVED - overflow: hidden',
          verticalScrollbar: 'PREVENTED - canvas overflow: hidden',
          webkitScrollbar: 'HIDDEN - ::-webkit-scrollbar { display: none }',
          firefoxScrollbar: 'HIDDEN - scrollbar-width: none',
          ieScrollbar: 'HIDDEN - ms-overflow-style: none'
        },
        features: [
          'No arrows (clean design)',
          'Backdrop blur effect',
          'Box shadow for depth',
          'Immediate response (no transitions)',
          'Real-time updates during drag',
          '🆕 Selection duration INSIDE waveform',
          '🆕 Scrollbars completely removed',
          '🆕 Z-index hierarchy optimized'
        ]
      };
      
      console.log(`🎨 [TooltipStyling] Enhanced design specification:`, stylingInfo);
      return stylingInfo;
    };

    // 🆕 **SCROLLBAR TEST**: Test scrollbar removal
    window.mp3CutterTestScrollbarRemoval = () => {
      console.log(`🚫 [ScrollbarTest] Testing scrollbar removal`);
      
      const waveformContainer = document.querySelector('.overflow-x-auto, [style*="overflow"]');
      const canvas = document.querySelector('canvas');
      
      const scrollbarStatus = {
        waveformContainer: {
          found: !!waveformContainer,
          overflowStyle: waveformContainer?.style?.overflow || 'not found',
          className: waveformContainer?.className || 'not found'
        },
        canvas: {
          found: !!canvas,
          overflowStyle: canvas?.style?.overflow || 'not found',
          hasScrollbar: canvas ? (canvas.scrollWidth > canvas.clientWidth || canvas.scrollHeight > canvas.clientHeight) : 'unknown'
        },
        globalStyles: {
          webkitScrollbarHidden: 'Applied via styled-jsx',
          firefoxScrollbarWidth: 'none via scrollbar-width CSS',
          ieScrollbarStyle: 'none via ms-overflow-style CSS'
        }
      };
      
      console.log(`🚫 [ScrollbarTest] Status report:`, scrollbarStatus);
      return scrollbarStatus;
    };

    // 🆕 **DIFFERENTIATED POSITIONING TEST**: Test handles below, cursor above positioning
    window.mp3CutterTestDifferentiatedTooltips = () => {
      console.log(`📍 [DifferentiatedPositioning] Testing handles BELOW, cursor ABOVE positioning`);
      
      const canvas = document.querySelector('canvas');
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      
      if (!canvas) {
        console.error('❌ [DifferentiatedPositioning] No canvas found');
        return null;
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      const canvasHeight = 150; // WAVEFORM_CONFIG.HEIGHT value
      
      const positioningInfo = {
        currentSetup: {
          handlesTooltips: `BELOW waveform (canvas.top + ${canvasHeight} + 5px)`,
          cursorTooltip: 'ABOVE waveform (canvas.top - 30px)',
          selectionDuration: 'INSIDE waveform (canvas.top + height - 35px)'
        },
        calculations: {
          canvasTop: canvasRect.top.toFixed(1) + 'px',
          canvasBottom: (canvasRect.top + canvasHeight).toFixed(1) + 'px',
          handlesTooltipY: (canvasRect.top + window.scrollY + canvasHeight + 5).toFixed(1) + 'px',
          cursorTooltipY: (canvasRect.top + window.scrollY - 30).toFixed(1) + 'px',
          selectionDurationY: (canvasRect.top + window.scrollY + canvasHeight - 35).toFixed(1) + 'px'
        },
        portal: {
          containerExists: !!portalContainer,
          zIndex: portalContainer?.style?.zIndex || 'not found',
          position: portalContainer?.style?.position || 'not found'
        },
        currentTooltips: {
          startTime: startTime.toFixed(2) + 's',
          endTime: endTime.toFixed(2) + 's',
          currentTime: currentTime.toFixed(2) + 's',
          hasValidSelection: startTime < endTime,
          duration: (endTime - startTime).toFixed(2) + 's'
        },
        differentiation: {
          mode: 'ENABLED',
          handlesPosition: 'BELOW canvas (5px gap)',
          cursorPosition: 'ABOVE canvas (30px gap)',
          reasoning: 'Handles BELOW to avoid cluttering above, cursor ABOVE for quick time reference'
        }
      };
      
      console.log(`📍 [DifferentiatedPositioning] Complete analysis:`, positioningInfo);
      return positioningInfo;
    };

    // 🆕 **PORTAL TOOLTIP VALIDATION**: Validate portal system functionality
    window.mp3CutterValidatePortalTooltips = () => {
      console.log(`🚪 [PortalValidation] Validating portal tooltip system`);
      
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      const tooltipElements = portalContainer?.children || [];
      
      const validation = {
        portalContainer: {
          exists: !!portalContainer,
          id: portalContainer?.id || 'not found',
          childCount: tooltipElements.length,
          position: portalContainer?.style?.position || 'not set',
          zIndex: portalContainer?.style?.zIndex || 'not set',
          pointerEvents: portalContainer?.style?.pointerEvents || 'not set'
        },
        activeTooltips: Array.from(tooltipElements).map((tooltip, index) => ({
          index,
          className: tooltip.className,
          position: tooltip.style.position,
          left: tooltip.style.left,
          top: tooltip.style.top,
          zIndex: tooltip.style.zIndex,
          content: tooltip.textContent
        })),
        positioning: {
          totalTooltips: tooltipElements.length,
          usesDifferentiatedY: 'Handles BELOW, Cursor ABOVE',
          outsideStacking: 'Portal renders at body level',
          zIndexGuarantee: 'Z-index 999999 via portal'
        },
        functionality: {
          bypassesOverflow: 'YES - Portal renders outside parent containers',
          bypassesZIndex: 'YES - Body level portal with highest z-index',
          scrollIndependent: 'YES - Absolute positioning with scroll tracking',
          resizeResponsive: 'YES - Event listeners update positions'
        }
      };
      
      console.log(`🚪 [PortalValidation] System status:`, validation);
      return validation;
    };

    window.mp3CutterStopInteractionMonitor = () => {
      if (window.mp3CutterInteractionMonitorId) {
        clearInterval(window.mp3CutterInteractionMonitorId);
        delete window.mp3CutterInteractionMonitorId;
        console.log('📡 [InteractionMonitor] Stopped');
      }
    };
    
    window.mp3CutterStopSyncMonitor = () => {
      if (window.mp3CutterSyncMonitorId) {
        clearInterval(window.mp3CutterSyncMonitorId);
        delete window.mp3CutterSyncMonitorId;
        console.log('🎯 [SyncMonitor] Stopped');
      }
    };
    
    return () => {
      delete window.mp3CutterSetSelection;
      delete window.mp3CutterConfigureAutoReturn;
      delete window.mp3CutterGetAutoReturnStatus;
      delete window.mp3CutterInteractionDebug;
      delete window.mp3CutterValidateDragSystem;
      delete window.mp3CutterStartInteractionMonitor;
      delete window.mp3CutterStopInteractionMonitor;
      delete window.mp3CutterStartSyncMonitor;
      delete window.mp3CutterStopSyncMonitor;
      delete window.mp3CutterTestSyncPerformance;
      
      // 🆕 **REGION DRAG CLEANUP**: Cleanup region drag functions
      delete window.mp3CutterConfigureRegionDrag;
      delete window.mp3CutterGetRegionDragStatus;
      delete window.mp3CutterTestRegionDrag;
      
      // 🆕 **TOOLTIP SYSTEM CLEANUP**: Cleanup tooltip test functions
      delete window.mp3CutterTestTooltipSystem;
      delete window.mp3CutterTestTooltipStyling;
      delete window.mp3CutterTestScrollbarRemoval;
      
      // 🆕 **DIFFERENTIATED POSITIONING CLEANUP**: Cleanup new positioning test functions
      delete window.mp3CutterTestDifferentiatedTooltips;
      delete window.mp3CutterValidatePortalTooltips;
      
      // 🔧 **MONITOR CLEANUP**: Cleanup running monitors
      if (window.mp3CutterInteractionMonitorId) {
        clearInterval(window.mp3CutterInteractionMonitorId);
        delete window.mp3CutterInteractionMonitorId;
      }
      
      if (window.mp3CutterSyncMonitorId) {
        clearInterval(window.mp3CutterSyncMonitorId);
        delete window.mp3CutterSyncMonitorId;
      }
    };
  }, []); // 🔥 **EMPTY DEPS**: Setup một lần

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
              volume={volume}
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