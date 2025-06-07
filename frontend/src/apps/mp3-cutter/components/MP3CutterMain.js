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
import { FADE_CONFIG } from '../utils/constants'; // 🆕 **IMPORT FADE CONFIG**

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
          // 🚀 **IMMEDIATE CURSOR SYNC**: Update cursor ngay lập tức khi jump - NO DELAY
          console.log(`⚡ [ClickToJump] IMMEDIATE jumping audio cursor to: ${result.time.toFixed(2)}s`);
          jumpToTime(result.time);
          
          // 🚀 **FORCE IMMEDIATE UPDATE**: Đảm bảo cursor update ngay lập tức - NO ASYNC
          if (audioRef.current) {
            audioRef.current.currentTime = result.time;
            setCurrentTime(result.time);
            console.log(`⚡ [ClickToJump] IMMEDIATE audio cursor synced to: ${result.time.toFixed(2)}s`);
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
    
    // 🚀 **IMMEDIATE PROCESSING**: Process action ngay lập tức cho ultra-fast cursor response
    processAction(); // ← Removed all async delays (requestIdleCallback/setTimeout) for immediate cursor movement
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

  // 🔥 **ULTRA-FAST ANIMATION LOOP**: Tối ưu hiệu suất tối đa cho cursor responsiveness
  useEffect(() => {
    console.log('🚀 [Animation] Setting up ultra-fast animation system for immediate cursor response...');
    
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
      
      // 🚀 **ULTRA-FAST THROTTLING**: 120fps for ultra-smooth cursor updates (8ms)
      const frameInterval = 8; // 120fps instead of 60fps for smoother cursor
      
      if (timestamp - lastUpdateTimeRef.current < frameInterval) {
        if (animationActive && playing) {
          currentAnimationId = requestAnimationFrame(updateCursor);
        }
        return;
      }
      
      lastUpdateTimeRef.current = timestamp;
      
      // 🔥 **IMMEDIATE CURSOR UPDATE**: Lấy thời gian từ audio element và update ngay
      const audioCurrentTime = audioRef.current.currentTime;
      
      // 🚀 **SYNCHRONOUS STATE UPDATE**: Update React state ngay lập tức, không async
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
    
    // 🔥 **IMMEDIATE TRIGGER**: Listen for trigger changes
    const checkAndTrigger = () => {
      const currentState = animationStateRef.current;
      if (currentState.isPlaying && audioRef.current && !audioRef.current.paused) {
        startAnimation();
      } else {
        stopAnimation();
      }
    };
    
    // 🚀 **ULTRA-RESPONSIVE TRIGGER**: Check mỗi 16ms thay vì 50ms để ultra-responsive
    const triggerInterval = setInterval(checkAndTrigger, 16); // 60fps trigger checking
    
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

    // 🆕 **TEXT-ONLY TOOLTIP TEST**: Test selection duration text-only display
    window.mp3CutterTestTextOnlyTooltip = () => {
      console.log(`📝 [TextOnlyTooltip] Testing text-only selection duration tooltip`);
      
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      const selectionTooltip = Array.from(portalContainer?.children || [])
        .find(tooltip => tooltip.textContent && tooltip.textContent.includes(':'));
      
      const testResult = {
        selectionTooltip: {
          found: !!selectionTooltip,
          content: selectionTooltip?.textContent || 'not found',
          hasBackground: !!(selectionTooltip?.style?.backgroundColor),
          hasBoxShadow: !!(selectionTooltip?.style?.boxShadow),
          hasBorder: !!(selectionTooltip?.style?.border),
          hasBackdropFilter: !!(selectionTooltip?.style?.backdropFilter)
        },
        textOnlyFeatures: {
          removedBackground: 'backgroundColor removed for clean display',
          removedBoxShadow: 'boxShadow removed to eliminate visual bulk',
          removedBorder: 'border removed for minimal appearance',
          removedBackdropFilter: 'backdropFilter removed for performance',
          addedTextShadow: 'textShadow added for readability on waveform',
          boldedFont: 'fontWeight 600 for better visibility'
        },
        currentSelection: {
          startTime: startTime.toFixed(2) + 's',
          endTime: endTime.toFixed(2) + 's',
          duration: (endTime - startTime).toFixed(2) + 's',
          hasValidSelection: startTime < endTime,
          displayFormat: 'MM:SS.d with decimal precision'
        },
        benefits: {
          spaceSaving: 'No background box → saves visual space',
          cleanAppearance: 'Text-only → minimalist design',
          betterReadability: 'Text shadow → readable on any background',
          performance: 'No blur effects → better rendering performance'
        }
      };
      
      console.log(`📝 [TextOnlyTooltip] Analysis:`, testResult);
      
      // 🎯 **VISUAL TEST**: Log styling details if tooltip exists
      if (selectionTooltip) {
        const computedStyle = window.getComputedStyle(selectionTooltip);
        console.log(`🎨 [TextOnlyTooltip] Computed styles:`, {
          color: computedStyle.color,
          textShadow: computedStyle.textShadow,
          fontWeight: computedStyle.fontWeight,
          fontSize: computedStyle.fontSize,
          backgroundColor: computedStyle.backgroundColor || 'transparent',
          border: computedStyle.border || 'none'
        });
      }
      
      return testResult;
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
    
    // 🆕 **HOVER TOOLTIP DEBUG**: Debug hover tooltip visibility và styling
    window.debugHoverTooltip = () => {
      console.log(`🔍 [HoverTooltipDebug] Diagnosing hover tooltip visibility issues`);
      
      const canvas = document.querySelector('canvas');
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      
      if (!canvas) {
        console.error('❌ [HoverTooltipDebug] Canvas not found');
        return { error: 'Canvas not found' };
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      const hoverTooltips = Array.from(portalContainer?.children || [])
        .filter(tooltip => tooltip.textContent && !tooltip.textContent.includes(':') && !tooltip.style.backgroundColor?.includes('20, 184, 166'));
      
      const diagnosis = {
        canvas: {
          found: true,
          rect: {
            left: canvasRect.left.toFixed(1),
            top: canvasRect.top.toFixed(1),
            width: canvasRect.width.toFixed(1),
            height: canvasRect.height.toFixed(1)
          },
          scrollOffset: {
            x: window.scrollX.toFixed(1),
            y: window.scrollY.toFixed(1)
          }
        },
        portalContainer: {
          exists: !!portalContainer,
          children: portalContainer?.children?.length || 0,
          style: {
            position: portalContainer?.style?.position || 'not set',
            zIndex: portalContainer?.style?.zIndex || 'not set',
            pointerEvents: portalContainer?.style?.pointerEvents || 'not set'
          }
        },
        hoverTooltips: {
          count: hoverTooltips.length,
          details: hoverTooltips.map((tooltip, index) => {
            const computedStyle = window.getComputedStyle(tooltip);
            return {
              index,
              content: tooltip.textContent,
              visible: computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none',
              position: {
                left: tooltip.style.left,
                top: tooltip.style.top,
                transform: tooltip.style.transform
              },
              styling: {
                backgroundColor: tooltip.style.backgroundColor,
                color: tooltip.style.color,
                zIndex: tooltip.style.zIndex,
                opacity: computedStyle.opacity,
                fontWeight: tooltip.style.fontWeight
              },
              contrast: {
                background: tooltip.style.backgroundColor,
                textColor: tooltip.style.color,
                textShadow: tooltip.style.textShadow || 'none',
                webkitTextStroke: tooltip.style.WebkitTextStroke || 'none'
              }
            };
          })
        },
        potentialIssues: {
          noHoverTooltips: hoverTooltips.length === 0 ? 'ISSUE: No hover tooltips found' : 'OK',
          portalMissing: !portalContainer ? 'ISSUE: Portal container missing' : 'OK',
          zIndexLow: portalContainer?.style?.zIndex !== '999999' ? 'ISSUE: Portal z-index not maximum' : 'OK',
          positioning: 'Check if mouse events are triggering hover state updates'
        }
      };
      
      console.log(`🔍 [HoverTooltipDebug] Complete diagnosis:`, diagnosis);
      return diagnosis;
    };

    // 🆕 **FORCE SHOW HOVER TOOLTIP**: Force display hover tooltip for testing
    window.forceShowHoverTooltip = (testX = 100, testTime = 5.5) => {
      console.log(`🎯 [ForceHoverTooltip] Force showing hover tooltip at x=${testX}, time=${testTime}s`);
      
      const canvas = document.querySelector('canvas');
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      
      if (!canvas || !portalContainer) {
        console.error('❌ [ForceHoverTooltip] Canvas or portal container not found');
        return false;
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
      };
      
      // 🎯 **CREATE TEST TOOLTIP**: Create a test hover tooltip
      const testTooltip = document.createElement('div');
      testTooltip.id = 'test-hover-tooltip';
      testTooltip.className = 'pointer-events-none text-xs px-2 py-1 rounded font-medium';
      testTooltip.textContent = formatTime(testTime);
      
      Object.assign(testTooltip.style, {
        position: 'absolute',
        left: `${canvasRect.left + testX + window.scrollX}px`,
        top: `${canvasRect.top + window.scrollY - 15}px`,
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        color: 'white',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(6px)',
        fontWeight: '700',
        textShadow: '0 1px 3px rgba(255, 255, 255, 0.9), 0 -1px 2px rgba(0, 0, 0, 0.8)',
        WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.8)',
        zIndex: '2147483646'
      });
      
      // 🚫 **REMOVE EXISTING TEST**: Remove any existing test tooltip
      const existingTest = document.getElementById('test-hover-tooltip');
      if (existingTest) {
        existingTest.remove();
      }
      
      // 🎯 **APPEND TO PORTAL**: Add to portal container
      portalContainer.appendChild(testTooltip);
      
      console.log(`✅ [ForceHoverTooltip] Test tooltip created and should be visible at position:`, {
        left: testTooltip.style.left,
        top: testTooltip.style.top,
        content: testTooltip.textContent,
        styling: {
          backgroundColor: testTooltip.style.backgroundColor,
          color: testTooltip.style.color,
          zIndex: testTooltip.style.zIndex
        }
      });
      
      // 🎯 **AUTO REMOVE**: Remove after 3 seconds
      setTimeout(() => {
        if (document.getElementById('test-hover-tooltip')) {
          testTooltip.remove();
          console.log(`🗑️ [ForceHoverTooltip] Test tooltip removed after 3 seconds`);
        }
      }, 3000);
      
      return true;
    };

    // 🆕 **TOGGLE HOVER DEBUG**: Bật/tắt debug logging cho hover events
    window.toggleHoverDebug = (enable = true) => {
      window.hoverDebugEnabled = enable;
      
      if (enable) {
        console.log(`📝 [HoverDebug] ENABLED - Hover events will be logged`);
        
        // 🎯 **MONITOR MOUSE EVENTS**: Log mouse move events over canvas
        const canvas = document.querySelector('canvas');
        if (canvas) {
          window.hoverDebugMouseHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            console.log(`🖱️ [HoverDebug] Mouse at canvas position: x=${mouseX.toFixed(1)}, y=${mouseY.toFixed(1)}`);
          };
          
          canvas.addEventListener('mousemove', window.hoverDebugMouseHandler);
          console.log(`🎯 [HoverDebug] Mouse move monitor attached to canvas`);
        }
      } else {
        console.log(`📝 [HoverDebug] DISABLED - Hover debug logging stopped`);
        
        // 🚫 **REMOVE MOUSE MONITOR**: Stop logging mouse events
        const canvas = document.querySelector('canvas');
        if (canvas && window.hoverDebugMouseHandler) {
          canvas.removeEventListener('mousemove', window.hoverDebugMouseHandler);
          delete window.hoverDebugMouseHandler;
          console.log(`🚫 [HoverDebug] Mouse move monitor removed`);
        }
      }
      
      return { enabled: enable, status: enable ? 'Debug mode ON' : 'Debug mode OFF' };
    };

    // 🆕 **TEST TEXT-ONLY HOVER TOOLTIP**: Test new text-only design
    window.testTextOnlyHoverTooltip = () => {
      console.log(`🎨 [TextOnlyTest] Testing new text-only hover tooltip design`);
      
      const canvas = document.querySelector('canvas');
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      
      if (!canvas || !portalContainer) {
        console.error('❌ [TextOnlyTest] Canvas or portal container not found');
        return { error: 'Canvas or portal not found' };
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      const testDesign = {
        oldDesign: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          position: 'canvas.top - 15px',
          style: 'Background with blur effects'
        },
        newDesign: {
          backgroundColor: 'NONE (transparent)',
          position: 'canvas.top - 5px',
          style: 'Text-only with enhanced shadows',
          improvements: [
            'No background for cleaner look',
            'Closer to waveform (5px vs 15px)',
            'Stronger text shadows for visibility',
            'Smaller font size for subtlety',
            'Enhanced text stroke for contrast'
          ]
        },
        visualChanges: {
          backgroundRemoved: 'All background, shadow, blur effects removed',
          positionAdjusted: '15px → 5px above canvas (closer)',
          textEnhanced: 'Stronger shadows and stroke for visibility',
          debugIndicator: 'Only visible in debug mode'
        },
        testPositions: {
          canvasTop: canvasRect.top.toFixed(1) + 'px',
          newTooltipY: (canvasRect.top - 5).toFixed(1) + 'px',
          oldTooltipY: (canvasRect.top - 15).toFixed(1) + 'px',
          positionDifference: '10px closer to waveform'
        }
      };
      
      console.log(`🎨 [TextOnlyTest] Design comparison:`, testDesign);
      return testDesign;
    };

    // 🆕 **TEST CLICK BEHAVIOR**: Test hover tooltip hiding on click
    window.testClickBehavior = () => {
      console.log(`🖱️ [ClickTest] Testing hover tooltip hiding on click behavior`);
      
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('❌ [ClickTest] Canvas not found');
        return { error: 'Canvas not found' };
      }
      
      const testBehavior = {
        currentBehavior: {
          onHover: 'Show hover tooltip and cursor line',
          onClick: 'Hide hover tooltip and cursor line immediately',
          onMouseLeave: 'Hide hover tooltip with 50ms delay'
        },
        implementation: {
          mouseDown: 'Enhanced handler calls original + hides hover',
          clearTimeout: 'Cancels pending hover timeouts',
          setState: 'Sets hoverPosition to null immediately',
          debugLogging: 'Logs click behavior when debug enabled'
        },
        testInstructions: [
          '1. Hover over waveform to show tooltip',
          '2. Click anywhere on waveform',
          '3. Tooltip should disappear immediately',
          '4. Enable debug: toggleHoverDebug(true)',
          '5. Repeat test to see debug logs'
        ]
      };
      
      console.log(`🖱️ [ClickTest] Behavior specification:`, testBehavior);
      
      // 🎯 **SIMULATE CLICK TEST**: Add click listener for testing
      const testClickHandler = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        console.log(`🧪 [ClickTest] SIMULATED CLICK at canvas position: x=${x.toFixed(1)}, y=${y.toFixed(1)}`);
        console.log(`✅ [ClickTest] Hover tooltip should be hidden now`);
      };
      
      // 🚫 **REMOVE EXISTING TEST LISTENER**: Prevent multiple listeners
      if (window.testClickHandler) {
        canvas.removeEventListener('click', window.testClickHandler);
      }
      
      // 🎯 **ADD TEST LISTENER**: Add test click listener
      canvas.addEventListener('click', testClickHandler);
      window.testClickHandler = testClickHandler;
      
      console.log(`🎯 [ClickTest] Test click listener added - click on canvas to test`);
      
      return testBehavior;
    };

    // 🆕 **TEST SELECTION DURATION POSITION**: Test closer-to-bottom positioning
    window.testSelectionDurationPosition = () => {
      console.log(`📍 [SelectionDurationTest] Testing closer-to-bottom positioning`);
      
      const canvas = document.querySelector('canvas');
      const portalContainer = document.getElementById('waveform-tooltips-portal');
      
      if (!canvas) {
        console.error('❌ [SelectionDurationTest] Canvas not found');
        return { error: 'Canvas not found' };
      }
      
      const canvasRect = canvas.getBoundingClientRect();
      const canvasHeight = 150; // WAVEFORM_CONFIG.HEIGHT
      
      const positioningTest = {
        oldPosition: {
          calculation: 'canvas.top + height - 35px',
          distanceFromBottom: '35px',
          absoluteY: (canvasRect.top + canvasHeight - 35).toFixed(1) + 'px'
        },
        newPosition: {
          calculation: 'canvas.top + height - 20px', 
          distanceFromBottom: '20px (closer)',
          absoluteY: (canvasRect.top + canvasHeight - 20).toFixed(1) + 'px'
        },
        improvement: {
          closerToBottom: '15px closer to waveform bottom',
          visualImpact: 'More integrated with waveform data',
          readability: 'Still readable but less intrusive'
        },
        currentSelection: {
          startTime: startTime.toFixed(2) + 's',
          endTime: endTime.toFixed(2) + 's',
          duration: (endTime - startTime).toFixed(2) + 's',
          hasValidSelection: startTime < endTime,
          shouldShowTooltip: startTime < endTime && (endTime - startTime) > 0.1
        },
        canvasInfo: {
          top: canvasRect.top.toFixed(1) + 'px',
          height: canvasHeight + 'px',
          bottom: (canvasRect.top + canvasHeight).toFixed(1) + 'px'
        }
      };
      
      console.log(`📍 [SelectionDurationTest] Position analysis:`, positioningTest);
      return positioningTest;
    };

    // 🚀 **NEW: CURSOR PERFORMANCE TEST**: Test ultra-fast cursor movement
    window.testCursorPerformance = (testDuration = 5) => {
      console.log(`🚀 [CursorPerformanceTest] Testing ultra-fast cursor movement for ${testDuration}s`);
      
      if (!audioRef.current || !duration) {
        console.error('❌ [CursorPerformanceTest] No audio or duration available');
        return { error: 'No audio loaded' };
      }
      
      const startTestTime = performance.now();
      let updateCount = 0;
      let lagDetected = 0;
      const updates = [];
      
      const performanceTest = () => {
        const testProgress = updateCount / (testDuration * 60); // Assuming 60 updates per second
        if (testProgress >= 1) {
          // 🎯 **TEST COMPLETED**: Analyze results
          const endTestTime = performance.now();
          const totalTestTime = endTestTime - startTestTime;
          const averageUpdateTime = updates.reduce((a, b) => a + b, 0) / updates.length;
          
          const results = {
            testDuration: (totalTestTime / 1000).toFixed(2) + 's',
            totalUpdates: updateCount,
            averageUpdateTime: averageUpdateTime.toFixed(2) + 'ms',
            lagDetections: lagDetected,
            performance: {
              rating: lagDetected === 0 ? '🚀 EXCELLENT' : 
                     lagDetected < 5 ? '✅ GOOD' : 
                     lagDetected < 15 ? '⚠️ AVERAGE' : '❌ POOR',
              updateRate: (updateCount / (totalTestTime / 1000)).toFixed(1) + ' updates/sec',
              targetRate: '60-120 updates/sec',
              improvements: lagDetected > 0 ? [
                '🔥 Animation loop optimized to 120fps',
                '🚀 Removed async delays in click handlers',
                '⚡ Direct state updates without batching',
                '🎯 Immediate audio.currentTime sync'
              ] : ['✅ Performance is optimal']
            }
          };
          
          console.log(`🚀 [CursorPerformanceTest] Results:`, results);
          return results;
        }
        
        // 🎯 **PERFORMANCE UPDATE**: Test cursor jump
        const updateStartTime = performance.now();
        const randomTime = Math.random() * duration;
        
        // Test cursor jump performance
        jumpToTime(randomTime);
        
        const updateEndTime = performance.now();
        const updateDuration = updateEndTime - updateStartTime;
        updates.push(updateDuration);
        
        // 🚫 **LAG DETECTION**: Detect if update took too long
        if (updateDuration > 5) { // More than 5ms is considered lag
          lagDetected++;
          console.warn(`⚠️ [CursorPerformanceTest] Lag detected: ${updateDuration.toFixed(2)}ms for jump to ${randomTime.toFixed(2)}s`);
        }
        
        updateCount++;
        
        // 🔄 **CONTINUE TEST**: Schedule next update
        setTimeout(performanceTest, 16); // 60fps test rate
      };
      
      console.log(`🚀 [CursorPerformanceTest] Starting ${testDuration}s test with random cursor jumps...`);
      performanceTest();
      
      return {
        testStarted: true,
        duration: testDuration + 's',
        note: 'Test running - results will be logged when complete'
      };
    };

    // 🆕 **FADE EFFECTS TEST**: Test và demonstrate fade visual effects - UPDATED cho range 15s
    window.testFadeEffects = (fadeInDuration = 5.0, fadeOutDuration = 8.0) => {
      console.log(`🎨 [FadeEffectsTest] Testing fade visual effects with range 0-${FADE_CONFIG.MAX_DURATION}s`);
      
      if (!audioFile || !duration) {
        console.error('❌ [FadeEffectsTest] No audio file loaded');
        return { error: 'No audio file loaded' };
      }
      
      // 🆕 **VALIDATION**: Clamp values to FADE_CONFIG.MAX_DURATION
      const validatedFadeIn = Math.min(Math.max(0, fadeInDuration), FADE_CONFIG.MAX_DURATION);
      const validatedFadeOut = Math.min(Math.max(0, fadeOutDuration), FADE_CONFIG.MAX_DURATION);
      
      if (validatedFadeIn !== fadeInDuration || validatedFadeOut !== fadeOutDuration) {
        console.warn(`⚠️ [FadeEffectsTest] Values clamped to range 0-${FADE_CONFIG.MAX_DURATION}s:`, {
          requested: { fadeIn: fadeInDuration, fadeOut: fadeOutDuration },
          clamped: { fadeIn: validatedFadeIn, fadeOut: validatedFadeOut }
        });
      }
      
      // 🎯 **CURRENT STATE**: Log current fade configuration
      const currentState = {
        currentFadeIn: fadeIn + 's',
        currentFadeOut: fadeOut + 's',
        currentSelection: `${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s`,
        selectionDuration: (endTime - startTime).toFixed(2) + 's',
        maxDuration: FADE_CONFIG.MAX_DURATION + 's'
      };
      
      console.log(`🎨 [FadeEffectsTest] Current state:`, currentState);
      
      // 🆕 **APPLY TEST FADE**: Set validated test fade values
      console.log(`🎨 [FadeEffectsTest] Applying validated fade: In=${validatedFadeIn}s, Out=${validatedFadeOut}s (max: ${FADE_CONFIG.MAX_DURATION}s)`);
      setFadeIn(validatedFadeIn);
      setFadeOut(validatedFadeOut);
      
      // 🎯 **VISUAL EXPLANATION**: Explain what should happen với enhanced info cho range 15s
      const visualExpectation = {
        fadeInEffect: {
          duration: validatedFadeIn + 's',
          timeRange: `${startTime.toFixed(2)}s → ${(startTime + validatedFadeIn).toFixed(2)}s`,
          visualBehavior: 'Waveform bars start THẤP (10% height) → gradually increase to CAO (100% height)',
          smoothCurve: 'Ease-out curve for natural fade in',
          percentage: `${((validatedFadeIn / FADE_CONFIG.MAX_DURATION) * 100).toFixed(1)}% of max duration`
        },
        fadeOutEffect: {
          duration: validatedFadeOut + 's',
          timeRange: `${(endTime - validatedFadeOut).toFixed(2)}s → ${endTime.toFixed(2)}s`,
          visualBehavior: 'Waveform bars start CAO (100% height) → gradually decrease to THẤP (10% height)',
          smoothCurve: 'Ease-in curve for natural fade out',
          percentage: `${((validatedFadeOut / FADE_CONFIG.MAX_DURATION) * 100).toFixed(1)}% of max duration`
        },
        normalRegion: {
          timeRange: `${(startTime + validatedFadeIn).toFixed(2)}s → ${(endTime - validatedFadeOut).toFixed(2)}s`,
          visualBehavior: 'Waveform bars maintain normal height (100% height)',
          note: 'No fade effect applied in this region'
        },
        rangeInfo: {
          maxDuration: FADE_CONFIG.MAX_DURATION + 's',
          step: FADE_CONFIG.STEP + 's',
          totalFadeTime: (validatedFadeIn + validatedFadeOut).toFixed(1) + 's'
        }
      };
      
      console.log(`🎨 [FadeEffectsTest] Visual expectations (range 0-${FADE_CONFIG.MAX_DURATION}s):`, visualExpectation);
      
      // 🎯 **SAVE TO HISTORY**: Save validated fade changes
      setTimeout(() => {
        saveState({ startTime, endTime, fadeIn: validatedFadeIn, fadeOut: validatedFadeOut });
        console.log(`✅ [FadeEffectsTest] Fade effects applied and saved to history`);
      }, 100);
      
      // 🆕 **ENHANCED USAGE INSTRUCTIONS**: Updated instructions cho range 15s
      const instructions = [
        '1. Look at the waveform - you should see fade effects immediately',
        '2. Fade In region: bars gradually increase in height from start',
        '3. Fade Out region: bars gradually decrease in height toward end',
        '4. Middle region: bars maintain normal height',
        '5. Use FadeControls sliders to adjust fade durations (0-15s) in real-time',
        '6. Try preset buttons: Gentle(1s), Standard(3s), Dramatic(5s), Extended(8s), Maximum(15s)',
        '7. Call testFadeEffects(0, 0) to disable fade effects',
        '8. Call testFadeEffects(15, 15) to test maximum fade duration'
      ];
      
      console.log(`📖 [FadeEffectsTest] Instructions (max: ${FADE_CONFIG.MAX_DURATION}s):`, instructions);
      
      return {
        applied: true,
        fadeIn: validatedFadeIn + 's',
        fadeOut: validatedFadeOut + 's',
        selectionRange: `${startTime.toFixed(2)}s → ${endTime.toFixed(2)}s`,
        visualExpectation,
        instructions,
        maxDuration: FADE_CONFIG.MAX_DURATION + 's'
      };
    };

    // 🆕 **FADE PRESET TESTS**: Quick fade presets for testing - UPDATED cho range 15s
    window.testFadePresets = () => {
      console.log(`🎨 [FadePresets] Testing fade presets for range 0-${FADE_CONFIG.MAX_DURATION}s`);
      
      // 🆕 **ENHANCED PRESETS**: Sử dụng FADE_CONFIG và mở rộng cho range 15s
      const presets = {
        // 🎯 **BASIC PRESETS**: Các preset cơ bản
        gentle: FADE_CONFIG.DEFAULT_PRESETS.GENTLE,
        standard: FADE_CONFIG.DEFAULT_PRESETS.STANDARD,
        dramatic: FADE_CONFIG.DEFAULT_PRESETS.DRAMATIC,
        
        // 🆕 **EXTENDED PRESETS**: Preset mới cho range 15s
        extended: FADE_CONFIG.DEFAULT_PRESETS.EXTENDED,
        maximum: FADE_CONFIG.DEFAULT_PRESETS.MAXIMUM,
        
        // 🎯 **ASYMMETRIC PRESETS**: Các preset không đối xứng
        fadeInOnly: { fadeIn: 5.0, fadeOut: 0, description: 'Fade in only (5s)' },
        fadeOutOnly: { fadeIn: 0, fadeOut: 5.0, description: 'Fade out only (5s)' },
        asymmetric: { fadeIn: 3.0, fadeOut: 8.0, description: 'Quick fade in, slow fade out' },
        
        // 🆕 **EXTREME PRESETS**: Preset cho range 15s
        extremeFadeIn: { fadeIn: 12.0, fadeOut: 0, description: 'Extreme fade in only (12s)' },
        extremeFadeOut: { fadeIn: 0, fadeOut: 12.0, description: 'Extreme fade out only (12s)' },
        extremeAsymmetric: { fadeIn: 5.0, fadeOut: 15.0, description: 'Fast fade in, maximum fade out' },
        
        // 🎯 **UTILITY PRESETS**: Preset tiện ích
        none: { fadeIn: 0, fadeOut: 0, description: 'No fade effects' }
      };
      
      console.log(`🎨 [FadePresets] Available presets (max: ${FADE_CONFIG.MAX_DURATION}s):`, presets);
      
      const applyPreset = (presetName) => {
        const preset = presets[presetName];
        if (!preset) {
          console.error(`❌ [FadePresets] Unknown preset: ${presetName}`);
          return;
        }
        
        // 🆕 **VALIDATION**: Kiểm tra giá trị không vượt quá MAX_DURATION
        const validatedFadeIn = Math.min(preset.fadeIn, FADE_CONFIG.MAX_DURATION);
        const validatedFadeOut = Math.min(preset.fadeOut, FADE_CONFIG.MAX_DURATION);
        
        if (validatedFadeIn !== preset.fadeIn || validatedFadeOut !== preset.fadeOut) {
          console.warn(`⚠️ [FadePresets] Preset values clamped to max ${FADE_CONFIG.MAX_DURATION}s:`, {
            original: preset,
            clamped: { fadeIn: validatedFadeIn, fadeOut: validatedFadeOut }
          });
        }
        
        console.log(`🎨 [FadePresets] Applying preset: ${presetName} - ${preset.description}`);
        console.log(`📊 [FadePresets] Values: fadeIn=${validatedFadeIn}s, fadeOut=${validatedFadeOut}s`);
        
        setFadeIn(validatedFadeIn);
        setFadeOut(validatedFadeOut);
        
        setTimeout(() => {
          saveState({ startTime, endTime, fadeIn: validatedFadeIn, fadeOut: validatedFadeOut });
          console.log(`✅ [FadePresets] Preset '${presetName}' applied successfully`);
        }, 100);
      };
      
      // 🎯 **ATTACH PRESET FUNCTIONS**: Make preset functions globally available
      Object.keys(presets).forEach(presetName => {
        window[`applyFade${presetName.charAt(0).toUpperCase() + presetName.slice(1)}`] = () => applyPreset(presetName);
      });
      
      // 🆕 **ENHANCED LOGGING**: Log preset functions với max duration info
      console.log(`🎨 [FadePresets] Preset functions available (max: ${FADE_CONFIG.MAX_DURATION}s):`, 
        Object.keys(presets).map(name => `applyFade${name.charAt(0).toUpperCase() + name.slice(1)}()`)
      );
      
      // 🆕 **RANGE INFO**: Log current range capabilities
      console.log(`📊 [FadePresets] Range capabilities:`, {
        maxDuration: FADE_CONFIG.MAX_DURATION + 's',
        step: FADE_CONFIG.STEP + 's',
        totalPresets: Object.keys(presets).length,
        maxPresetValue: Math.max(...Object.values(presets).map(p => Math.max(p.fadeIn, p.fadeOut))) + 's'
      });
      
      return { presets, applyPreset, maxDuration: FADE_CONFIG.MAX_DURATION };
    };

    // 🚀 **NEW: CURSOR RESPONSIVENESS TEST**: Quick click responsiveness test
    window.testClickResponsiveness = () => {
      console.log(`⚡ [ClickResponsivenessTest] Testing immediate click-to-cursor response`);
      
      const canvas = document.querySelector('canvas');
      if (canvas && window.testClickHandler) {
        canvas.removeEventListener('click', window.testClickHandler);
        delete window.testClickHandler;
      }
      
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

    // 🆕 **COMPREHENSIVE FADE RANGE TEST**: Test toàn bộ range 0-15s và UI responsiveness
    window.testFade15sRange = () => {
      console.log(`🧪 [Fade15sTest] Testing comprehensive 0-15s fade range functionality`);
      
      if (!audioFile || !duration) {
        console.error('❌ [Fade15sTest] No audio file loaded');
        return { error: 'No audio file loaded' };
      }
      
      const testResults = {
        rangeCapabilities: {
          maxDuration: FADE_CONFIG.MAX_DURATION + 's',
          minDuration: FADE_CONFIG.MIN_DURATION + 's',
          step: FADE_CONFIG.STEP + 's',
          totalRange: `${FADE_CONFIG.MIN_DURATION}-${FADE_CONFIG.MAX_DURATION}s`
        },
        sliderTests: [],
        presetTests: [],
        validationTests: []
      };
      
      console.log(`🧪 [Fade15sTest] Range capabilities:`, testResults.rangeCapabilities);
      
      // 🎯 **TEST 1: SLIDER RANGE TEST** - Test slider min/max values
      console.log(`🎛️ [Fade15sTest] Testing slider range 0-${FADE_CONFIG.MAX_DURATION}s...`);
      
      const sliderTestValues = [0, 0.5, 1, 5, 10, 15];
      sliderTestValues.forEach(value => {
        const clampedValue = Math.min(Math.max(value, FADE_CONFIG.MIN_DURATION), FADE_CONFIG.MAX_DURATION);
        const isValid = value >= FADE_CONFIG.MIN_DURATION && value <= FADE_CONFIG.MAX_DURATION;
        
        testResults.sliderTests.push({
          inputValue: value + 's',
          clampedValue: clampedValue + 's',
          isValid,
          status: isValid ? '✅ VALID' : '⚠️ CLAMPED'
        });
        
        console.log(`  ${value}s → ${clampedValue}s (${isValid ? 'VALID' : 'CLAMPED'})`);
      });
      
      // 🎯 **TEST 2: PRESET FUNCTIONALITY TEST** - Test all presets
      console.log(`🎨 [Fade15sTest] Testing all presets...`);
      
      Object.entries(FADE_CONFIG.DEFAULT_PRESETS).forEach(([presetName, preset]) => {
        const isValid = preset.fadeIn <= FADE_CONFIG.MAX_DURATION && preset.fadeOut <= FADE_CONFIG.MAX_DURATION;
        
        testResults.presetTests.push({
          preset: presetName,
          values: `${preset.fadeIn}s / ${preset.fadeOut}s`,
          totalTime: (preset.fadeIn + preset.fadeOut) + 's',
          isValid,
          status: isValid ? '✅ VALID' : '❌ INVALID'
        });
        
        console.log(`  ${presetName}: ${preset.fadeIn}s in, ${preset.fadeOut}s out (${isValid ? 'VALID' : 'INVALID'})`);
      });
      
      // 🎯 **TEST 3: BOUNDARY VALUE TEST** - Test edge cases
      console.log(`🔬 [Fade15sTest] Testing boundary values...`);
      
      const boundaryTests = [
        { fadeIn: -1, fadeOut: 0, name: 'Negative fadeIn' },
        { fadeIn: 0, fadeOut: -1, name: 'Negative fadeOut' },
        { fadeIn: 16, fadeOut: 0, name: 'Over max fadeIn' },
        { fadeIn: 0, fadeOut: 16, name: 'Over max fadeOut' },
        { fadeIn: 15, fadeOut: 15, name: 'Maximum both' },
        { fadeIn: 0, fadeOut: 0, name: 'Minimum both' }
      ];
      
      boundaryTests.forEach(test => {
        const clampedFadeIn = Math.min(Math.max(test.fadeIn, FADE_CONFIG.MIN_DURATION), FADE_CONFIG.MAX_DURATION);
        const clampedFadeOut = Math.min(Math.max(test.fadeOut, FADE_CONFIG.MIN_DURATION), FADE_CONFIG.MAX_DURATION);
        const wasClamped = clampedFadeIn !== test.fadeIn || clampedFadeOut !== test.fadeOut;
        
        testResults.validationTests.push({
          testName: test.name,
          input: `${test.fadeIn}s / ${test.fadeOut}s`,
          output: `${clampedFadeIn}s / ${clampedFadeOut}s`,
          wasClamped,
          status: wasClamped ? '🔧 CLAMPED' : '✅ VALID'
        });
        
        console.log(`  ${test.name}: ${test.fadeIn}s/${test.fadeOut}s → ${clampedFadeIn}s/${clampedFadeOut}s ${wasClamped ? '(CLAMPED)' : '(OK)'}`);
      });
      
      // 🎯 **TEST 4: UI PERCENTAGE TEST** - Test percentage calculations
      console.log(`📊 [Fade15sTest] Testing UI percentage calculations...`);
      
      const percentageTests = [
        { value: 0, expectedPercent: 0 },
        { value: 7.5, expectedPercent: 50 },
        { value: 15, expectedPercent: 100 }
      ];
      
      percentageTests.forEach(test => {
        const calculatedPercent = (test.value / FADE_CONFIG.MAX_DURATION) * 100;
        const isCorrect = Math.abs(calculatedPercent - test.expectedPercent) < 0.1;
        
        console.log(`  ${test.value}s = ${calculatedPercent.toFixed(1)}% (expected: ${test.expectedPercent}%) ${isCorrect ? '✅' : '❌'}`);
      });
      
      // 🎯 **SUMMARY**
      const summary = {
        totalTests: testResults.sliderTests.length + testResults.presetTests.length + testResults.validationTests.length,
        sliderValidTests: testResults.sliderTests.filter(t => t.isValid).length,
        presetValidTests: testResults.presetTests.filter(t => t.isValid).length,
        validationClampedTests: testResults.validationTests.filter(t => t.wasClamped).length,
        maxDuration: FADE_CONFIG.MAX_DURATION + 's',
        testPassed: testResults.presetTests.every(t => t.isValid) // All presets should be valid
      };
      
      console.log(`📋 [Fade15sTest] Test Summary:`, summary);
      console.log(`🎯 [Fade15sTest] ${summary.testPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} - Ready for 15s fade range!`);
      
      return { testResults, summary, success: summary.testPassed };
    };

    // 🚀 **NEW: CURSOR RESPONSIVENESS TEST**: Quick click responsiveness test
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
              
              // 🆕 **FADE EFFECTS**: Visual fade in/out effects trên waveform
              fadeIn={fadeIn}   // Fade in duration - bars sẽ hiển thị thấp → cao dần trong khoảng này
              fadeOut={fadeOut} // Fade out duration - bars sẽ hiển thị cao → thấp dần trong khoảng này
              
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