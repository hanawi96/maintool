import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Music, AlertCircle, Wifi, WifiOff } from 'lucide-react';

// Import hooks
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useWaveform } from '../hooks/useWaveform';
import { useHistory } from '../hooks/useHistory';
import { useFileUpload } from '../hooks/useFileUpload';
import { useRealTimeFadeEffects } from '../hooks/useRealTimeFadeEffects';

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
    fadeConfig,
    isWebAudioSupported,
    getConnectionDebugInfo, // 🆕 **DEBUG API**: Function để debug connection issues
    connectionState // 🆕 **CONNECTION STATE**: Track connection status
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
  const lastMouseTimeRef = useRef(0);
  const animationStateRef = useRef({ isPlaying: false, startTime: 0, endTime: 0 });
  const interactionManagerRef = useRef(null);

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
  }, [audioFile?.url]); // 🔥 **OPTIMIZED DEPS**: Chỉ listen audioFile.url
    
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
  }, [audioFile?.url, connectAudioElement, isWebAudioSupported, getConnectionDebugInfo]);

  // 🆕 **FADE CONFIG SYNC**: Update fade configuration when fadeIn/fadeOut/selection changes
  useEffect(() => {
    updateFadeConfig({
      fadeIn,
      fadeOut,
      startTime,
      endTime
    });
  }, [fadeIn, fadeOut, startTime, endTime, updateFadeConfig, connectionState]);

  // 🆕 **PLAYBACK STATE SYNC**: Start/stop fade effects khi playback state thay đổi
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isWebAudioSupported) return;
    
    setFadeActive(isPlaying, audio);
  }, [isPlaying, setFadeActive, fadeConfig.isActive, isWebAudioSupported, connectionState, getConnectionDebugInfo]);

  // 🎯 ULTRA-LIGHT: Mouse handlers using InteractionManager
  const handleCanvasMouseDown = useCallback((e) => {
    if (!canvasRef.current || duration <= 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // 🎯 Use InteractionManager for smart handling
    const result = interactionManagerRef.current.handleMouseDown(
      x, canvasRef.current.width, duration, startTime, endTime
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
          
        case 'pendingJump':
          // 🆕 **DELAYED JUMP**: Setup pending jump để tránh shock khi drag region
          console.log(`⏳ [PendingJump] DELAYED jump setup to: ${result.time.toFixed(2)}s (anti-shock protection)`);
          
          // 🆕 **REGION DRAG POTENTIAL**: Setup potential region drag if flagged
          if (result.regionDragPotential) {
            console.log(`🔄 [PendingJump] Setting up region drag potential - will activate on movement or jump on mouse up`);
            // 🔧 **NO DRAG STATE YET**: Don't set isDragging until movement detected
            // setIsDragging will be handled by mouse move when region drag is confirmed
          } else {
            console.log(`⏳ [PendingJump] Simple pending jump - will execute on mouse up if no drag: ${result.pendingJumpTime.toFixed(2)}s`);
          }
          
          // 🚫 **NO IMMEDIATE CURSOR MOVEMENT**: Do NOT jump cursor now - wait for mouse up
          console.log(`🚫 [PendingJump] Cursor LOCKED at current position until mouse up (anti-shock for region drag)`);
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
          
          // 🆕 **IMMEDIATE CURSOR SYNC**: Sync to region START for consistent behavior (not middle)
          if (audioRef.current && result.regionData) {
            const { originalStart } = result.regionData;
            
            console.log(`🎯 [RegionDrag] Initial sync to region START: ${originalStart.toFixed(2)}s (not middle as before)`);
            audioRef.current.currentTime = originalStart; // 🎯 **SYNC TO START**: Use originalStart instead of middle
            setCurrentTime(originalStart);
          }
          break;
          
        case 'pendingHandleUpdate':
          // 🆕 **DELAYED HANDLE UPDATE**: Setup pending handle update để tránh shock khi drag
          console.log(`⏳ [PendingHandleUpdate] DELAYED ${result.handleType} handle update setup:`, {
            from: result.oldTime.toFixed(2) + 's',
            to: result.newTime.toFixed(2) + 's',
            reason: result.reason,
            note: 'Will execute on mouse up if no drag'
          });
          
          // 🚫 **NO IMMEDIATE HANDLE MOVEMENT**: Do NOT move handle now - wait for mouse up
          console.log(`🚫 [PendingHandleUpdate] Handle LOCKED at current position until mouse up (anti-shock for handle update)`);
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
    
    // 🚀 **ULTRA-SMOOTH REGION DRAG THROTTLING**: Optimized for region drag performance
    const manager = interactionManagerRef.current;
    const debugInfo = manager.getDebugInfo();
    
    // 🆕 **REGION DRAG DETECTION**: Check if currently dragging region for ultra-smooth performance
    const isRegionDragging = debugInfo.isDraggingRegion && debugInfo.isDraggingConfirmed;
    
    // 🆕 **ULTRA-OPTIMIZED THROTTLING**: Minimize throttling for region drag
    let throttleInterval;
    if (isRegionDragging) {
      throttleInterval = 1; // 🚀 **1000FPS** for ultra-smooth region drag - maximum performance
    } else if (debugInfo.isDraggingConfirmed) {
      throttleInterval = 2; // 500fps cho handle drag - improved from 2ms
    } else if (debugInfo.isDragging) {
      throttleInterval = 4; // 250fps cho drag confirmation 
    } else {
      throttleInterval = 8; // 120fps cho hover
    }
    
    // 🔧 **DEBUG ULTRA-SMOOTH**: Log throttling cho region drag
    if (isRegionDragging && Math.random() < 0.005) { // 0.5% sampling
      console.log(`🚀 [RegionDragThrottle] ULTRA-SMOOTH mode:`, {
        mode: 'REGION_DRAG_1000FPS',
        interval: throttleInterval + 'ms',
        fps: '1000fps',
        performance: 'MAXIMUM_SMOOTHNESS'
      });
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
              realTimeSync: result.realTimeSync,
              isRegionDrag: result.isRegionDrag || false,
              ultraSmooth: result.ultraSmooth || false // 🆕 **ULTRA-SMOOTH FLAG**
            });
            
            // 🆕 **REGION DRAG ACTIVATION**: Set drag state when region drag is activated
            if (result.isRegionDrag && isDragging !== 'region') {
              console.log(`🔄 [MouseMove] ACTIVATING region drag mode`);
              setIsDragging('region');
            }
            
            if (result.startTime !== undefined) setStartTime(result.startTime);
            if (result.endTime !== undefined) setEndTime(result.endTime);
            
            // 🆕 **ULTRA-SMOOTH SYNC STATUS**: Enhanced logging for region drag
            if (result.ultraSmooth && result.realTimeSync && result.audioSynced) {
              console.log(`🚀 [MouseMove] ULTRA-SMOOTH region drag with continuous sync - maximum performance mode`);
            } else if (result.realTimeSync && result.audioSynced) {
              console.log(`🎯 [MouseMove] REAL-TIME cursor sync active - ultra-smooth mode`);
            } else if (!result.audioSynced && audioRef.current && !isPlaying) {
              // 🔄 **FALLBACK SYNC**: Manual sync nếu real-time sync không hoạt động
              let syncTime;
              if (result.isRegionDrag) {
                // 🎯 **REGION DRAG FALLBACK**: Always sync to region start for region drag
                syncTime = result.startTime; // Use region start for region drag
                console.log(`🔄 [MouseMove] Fallback REGION sync to START: ${syncTime.toFixed(2)}s`);
              } else {
                // 🎯 **HANDLE DRAG FALLBACK**: Standard logic for handle drag
                syncTime = result.startTime !== undefined ? result.startTime : 
                          result.endTime !== undefined ? Math.max(0, result.endTime - 3.0) : null;
                console.log(`🔄 [MouseMove] Fallback HANDLE sync to: ${syncTime?.toFixed(2)}s`);
              }
              
              if (syncTime !== null) {
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
          // 🆕 **ULTRA-SMOOTH HOVER**: Process hover immediately với improved performance
          setHoveredHandle(result.handle);
          
          // 🔧 **DEBUG HOVER**: Log smooth hover updates occasionally
          if (Math.random() < 0.01) { // 1% sampling
            console.log(`👆 [MouseMove] ULTRA-SMOOTH hover update:`, {
              handle: result.handle,
              throttleInterval,
              fps: Math.round(1000 / throttleInterval),
              mode: isRegionDragging ? 'REGION_DRAG_1000FPS' : 'SMOOTH_120FPS'
            });
          }
          break;
          
        default:
          // 🔇 **SILENT**: Không action, không log spam
          break;
      }
    };
    
    // 🚀 **IMMEDIATE PROCESSING**: Process ALL actions immediately cho ultra-smooth response
    if (result.significant && result.isDraggingConfirmed) {
      processAction(); // Immediate for confirmed dragging với real-time sync
    } else if (result.action === 'updateHover') {
      processAction(); // 🚀 **IMMEDIATE HOVER**: Process hover immediately - no async delay
    } else if (result.action !== 'none') {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(processAction);
      } else {
        setTimeout(processAction, 0);
      }
    }
  }, [canvasRef, duration, startTime, endTime, setStartTime, setEndTime, setHoveredHandle, audioRef, setCurrentTime, isPlaying, isDragging]); // 🆕 **ADDED isDragging**: For region drag detection

  const handleCanvasMouseUp = useCallback(() => {
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
      
      // 🆕 **EXECUTE DELAYED JUMP**: Execute pending jump nếu không có drag movement
      if (result.executePendingJump && result.pendingJumpTime !== null) {
        console.log(`⚡ [MouseUp] EXECUTING delayed jump to: ${result.pendingJumpTime.toFixed(2)}s (safe - no drag detected)`);
        
        // 🚀 **IMMEDIATE CURSOR SYNC**: Jump cursor now that it's safe
        jumpToTime(result.pendingJumpTime);
        
        // 🚀 **FORCE IMMEDIATE UPDATE**: Đảm bảo cursor update ngay lập tức
        if (audioRef.current) {
          audioRef.current.currentTime = result.pendingJumpTime;
          setCurrentTime(result.pendingJumpTime);
          console.log(`✅ [MouseUp] Delayed jump executed successfully: ${result.pendingJumpTime.toFixed(2)}s`);
        }
      } else if (result.executePendingJump === false) {
        console.log(`🚫 [MouseUp] Delayed jump canceled - drag was detected (anti-shock protection worked)`);
      }
      
      // 🆕 **EXECUTE DELAYED HANDLE UPDATE**: Execute pending handle update nếu không có drag movement
      if (result.executePendingHandleUpdate && result.pendingHandleUpdate !== null) {
        const updateData = result.pendingHandleUpdate;
        console.log(`⚡ [MouseUp] EXECUTING delayed handle update: ${updateData.type} to ${updateData.newTime.toFixed(2)}s (safe - no drag detected)`);
        
        if (updateData.type === 'start') {
          // 🚀 **UPDATE START HANDLE**: Update start time and sync cursor
          setStartTime(updateData.newTime);
          
          // 🚀 **IMMEDIATE CURSOR SYNC**: Sync audio cursor to new start position
          if (audioRef.current) {
            audioRef.current.currentTime = updateData.newTime;
            setCurrentTime(updateData.newTime);
            console.log(`✅ [MouseUp] Start handle updated and cursor synced to: ${updateData.newTime.toFixed(2)}s`);
          }
          
          // 🚀 **SAVE HISTORY**: Save state after handle update
          setTimeout(() => {
            saveState({ startTime: updateData.newTime, endTime, fadeIn, fadeOut });
          }, 100);
          
        } else if (updateData.type === 'end') {
          // 🚀 **UPDATE END HANDLE**: Update end time and sync cursor with preview
          setEndTime(updateData.newTime);
          
          // 🚀 **IMMEDIATE CURSOR SYNC**: Sync to preview position (3s before end)
          if (audioRef.current) {
            const previewTime = Math.max(0, updateData.newTime - 3.0);
            audioRef.current.currentTime = previewTime;
            setCurrentTime(previewTime);
            console.log(`✅ [MouseUp] End handle updated and cursor synced to preview: ${previewTime.toFixed(2)}s (3s before ${updateData.newTime.toFixed(2)}s)`);
          }
          
          // 🚀 **SAVE HISTORY**: Save state after handle update
          setTimeout(() => {
            saveState({ startTime, endTime: updateData.newTime, fadeIn, fadeOut });
          }, 100);
        }
      } else if (result.executePendingHandleUpdate === false) {
        console.log(`🚫 [MouseUp] Delayed handle update canceled - drag was detected (anti-shock protection worked)`);
      }
    };
    
    // 🎯 BATCH UPDATES
    if (window.requestIdleCallback) {
      window.requestIdleCallback(processAction);
    } else {
      setTimeout(processAction, 0);
    }
  }, [canvasRef, startTime, endTime, fadeIn, fadeOut, saveState, setIsDragging, audioRef, setCurrentTime, isPlaying, jumpToTime]);

  const handleCanvasMouseLeave = useCallback(() => {
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
  }, [jumpToTime, startTime]);
  
  const handleJumpToEnd = useCallback(() => {
    jumpToTime(endTime);
  }, [jumpToTime, endTime]);

  // 🆕 **REAL-TIME FADE HANDLERS**: Apply fade effects ngay lập tức khi user change sliders
  const handleFadeInChange = useCallback((newFadeIn) => {
    setFadeIn(newFadeIn);
    
    // 🚀 **IMMEDIATE FADE CONFIG UPDATE**: Update config ngay lập tức cho real-time effects
    updateFadeConfig({
      fadeIn: newFadeIn,
      fadeOut,
      startTime,
      endTime
    });
  }, [fadeOut, startTime, endTime, updateFadeConfig]);

  const handleFadeOutChange = useCallback((newFadeOut) => {
    setFadeOut(newFadeOut);
    
    // 🚀 **IMMEDIATE FADE CONFIG UPDATE**: Update config ngay lập tức cho real-time effects
    updateFadeConfig({
      fadeIn,
      fadeOut: newFadeOut,
      startTime,
      endTime
    });
  }, [fadeIn, startTime, endTime, updateFadeConfig]);

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

  // 🔥 **SIMPLE ANIMATION LOOP**: Đơn giản hóa animation cho cursor updates
  useEffect(() => {
    let animationId = null;
    
    const updateCursor = () => {
      if (isPlaying && audioRef.current) {
        const audioCurrentTime = audioRef.current.currentTime;
        setCurrentTime(audioCurrentTime);
        
        // Auto-return logic
        if (endTime > startTime && audioCurrentTime >= endTime - 0.05) {
          const autoReturnEnabled = getAutoReturnSetting();
          
          if (autoReturnEnabled && audioRef.current) {
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
          } else if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
          }
        }
        
        animationId = requestAnimationFrame(updateCursor);
      }
    };
    
    if (isPlaying) {
      animationId = requestAnimationFrame(updateCursor);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, startTime, endTime]);

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
            className={`upload-section border-2 border-dashed rounded-2xl p-16 text-center backdrop-blur-sm transition-all duration-300 ${
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