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
  const animationIdRef = useRef(null);
  const isSetupRef = useRef(false);

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

  // 🎯 MEMOIZED: Animation state to prevent setup loops
  const animationState = useMemo(() => ({
    isPlaying,
    endTime,
    startTime
  }), [isPlaying, endTime, startTime]);

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

  // 🎯 FIXED: Single animation system - prevent setState conflicts
  useEffect(() => {
    // 🎯 Prevent multiple setups and early returns for stability
    if (isSetupRef.current && !animationState.isPlaying) return;
    
    const { isPlaying: playing, endTime: end, startTime: start } = animationState;
    
    // 🎯 Reduced logging - move out of render cycle
    if (!isSetupRef.current) {
      setTimeout(() => console.log('🎬 [Animation] Initial setup'), 0);
      isSetupRef.current = true;
    }
    
    let animationActive = false; // 🆕 Track animation state to prevent conflicts
    
    const updateCursor = (timestamp) => {
      // 🎯 Enhanced frame limiting with consistent timing
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;
      
      if (timestamp - lastUpdateTimeRef.current < frameInterval) {
        if (playing && animationActive) {
          animationIdRef.current = requestAnimationFrame(updateCursor);
        }
        return;
      }
      
      lastUpdateTimeRef.current = timestamp;
      
      // 🆕 BATCH STATE UPDATES: Prevent rapid setState calls
      if (playing && audioRef.current && !audioRef.current.paused && animationActive) {
        const audioCurrentTime = audioRef.current.currentTime;
        
        // 🆕 DEBOUNCED LOGGING: Reduce console spam
        const shouldLog = Math.floor(audioCurrentTime * 4) % 10 === 0; // Every 2.5 seconds
        if (shouldLog) {
          setTimeout(() => console.log('🎵 [Animation] Cursor:', audioCurrentTime.toFixed(2)), 0);
        }
        
        // 🆕 Use requestIdleCallback for non-critical state updates
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            if (animationActive) setCurrentTime(audioCurrentTime);
          });
        } else {
          setCurrentTime(audioCurrentTime);
        }
        
        // 🆕 ENHANCED: Auto-return to start when reaching selection end
        if (end > start && audioCurrentTime >= end - 0.05) { // 50ms buffer
          setTimeout(() => {
            // 🎯 CHECK USER PREFERENCE: Auto-return enabled or just pause?
            const autoReturnEnabled = localStorage.getItem('mp3cutter_auto_return') !== 'false'; // Default true
            
            if (autoReturnEnabled) {
              console.log('🛑 [Animation] Selection end reached - returning to start');
              if (audioRef.current) {
                // 🎯 SEEK TO START: Move audio cursor back to region start
                audioRef.current.currentTime = start;
                console.log(`🔄 [Animation] Audio cursor reset: ${end.toFixed(2)}s → ${start.toFixed(2)}s`);
                
                // 🎯 PAUSE AUDIO: Stop playback (user must click play to continue)
                audioRef.current.pause();
                console.log('⏸️ [Animation] Audio paused at region start');
              }
              
              // 🎯 UPDATE REACT STATE: Sync UI with new audio position
              if (window.requestIdleCallback) {
                window.requestIdleCallback(() => {
                  setCurrentTime(start);
                  setIsPlaying(false);
                  console.log('⚛️ [Animation] React state updated - ready for next play');
                });
              } else {
                setTimeout(() => {
                  setCurrentTime(start);
                  setIsPlaying(false);
                  console.log('⚛️ [Animation] React state updated - ready for next play');
                }, 0);
              }
            } else {
              console.log('🛑 [Animation] Selection end reached - pausing at end (auto-return disabled)');
              if (audioRef.current) {
                // 🎯 JUST PAUSE: Keep cursor at end position
                audioRef.current.pause();
                console.log('⏸️ [Animation] Audio paused at region end');
              }
              
              // 🎯 UPDATE REACT STATE: Just update playing state
              if (window.requestIdleCallback) {
                window.requestIdleCallback(() => {
                  setIsPlaying(false);
                  console.log('⚛️ [Animation] React state updated - paused at end');
                });
              } else {
                setTimeout(() => {
                  setIsPlaying(false);
                  console.log('⚛️ [Animation] React state updated - paused at end');
                }, 0);
              }
            }
            
            // 🎯 STOP ANIMATION: Clean up animation loop
            animationActive = false;
          }, 0);
          return;
        }
      }
      
      // Continue animation loop only if still active
      if (playing && animationActive) {
        animationIdRef.current = requestAnimationFrame(updateCursor);
      }
    };
    
    // Start or stop animation loop with proper state management
    if (playing) {
      if (!animationIdRef.current && !animationActive) {
        animationActive = true;
        setTimeout(() => console.log('🚀 [Animation] Starting loop'), 0);
        animationIdRef.current = requestAnimationFrame(updateCursor);
      }
    } else {
      if (animationIdRef.current) {
        animationActive = false;
        setTimeout(() => console.log('⏸️ [Animation] Stopping loop'), 0);
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    }
    
    // Enhanced cleanup with state reset
    return () => {
      animationActive = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [animationState, audioRef, setCurrentTime, setIsPlaying]);

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
          jumpToTime(result.time);
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
          
          // 🆕 AUDIO SYNC: Sync audio cursor when updating start time
          if (audioRef.current && isPlaying) {
            console.log(`🔄 [Audio Sync] Seeking to new start time: ${result.startTime.toFixed(2)}s`);
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
          
          // 🆕 AUDIO SYNC: Sync audio cursor when updating end time (3s offset)
          if (audioRef.current) {
            const targetTime = Math.max(0, result.endTime - 3.0); // 3 seconds before end
            console.log(`🔄 [Audio Sync] End update: Seeking to ${targetTime.toFixed(2)}s (3s before ${result.endTime.toFixed(2)}s)`);
            audioRef.current.currentTime = targetTime;
            setCurrentTime(targetTime);
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
    
    // 🎯 SMART THROTTLING: Use different intervals based on interaction state
    const manager = interactionManagerRef.current;
    const throttleInterval = manager.getDebugInfo().isDragging ? 8 : 50; // 120fps vs 20fps
    
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
          
          // 🆕 AUDIO SYNC FEEDBACK: Log when audio was synced
          if (result.audioSynced) {
            console.log(`🔄 [AudioSync] Cursor synced during ${result.startTime !== undefined ? 'start' : 'end'} handle drag`);
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
    
    return () => {
      delete window.mp3CutterSetSelection;
      delete window.mp3CutterConfigureSmartClick;
      delete window.mp3CutterConfigureAudioSync;
      delete window.mp3CutterConfigureAutoReturn;
      delete window.mp3CutterGetAutoReturnStatus;
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
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
            />

            {/* Controls */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200/50 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                
                <AudioPlayer
                  isPlaying={isPlaying}
                  volume={volume}
                  playbackRate={playbackRate}
                  onTogglePlayPause={togglePlayPause}
                  onJumpToStart={handleJumpToStart}
                  onJumpToEnd={handleJumpToEnd}
                  onVolumeChange={updateVolume}
                  onSpeedChange={updatePlaybackRate}
                  disabled={!audioFile}
                />

                <HistoryControls
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  historyIndex={historyIndex}
                  historyLength={historyLength}
                />
              </div>
            </div>

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