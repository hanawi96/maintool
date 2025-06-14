import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BarChart, Loader2, ChevronDown, X, List, Target } from 'lucide-react';
import { formatTimeUnified } from '../utils/timeFormatter';

// 🎨 **INJECT OPTIMIZED CSS**: Simple panel animations with proper spacing
if (typeof document !== 'undefined' && !document.getElementById('silence-panel-styles')) {
  const style = document.createElement('style');
  style.id = 'silence-panel-styles';
  style.textContent = `
    /* 🚀 **WRAPPER**: Smart spacing control */
    .silence-detection-wrapper {
      width: 100%;
      margin: 0;
      padding: 0;
      transition: margin-top 250ms ease;
    }
    .silence-detection-wrapper.is-open {
      margin-top: 32px; /* 🎯 Add more spacing between waveform and panel */
    }
    .silence-detection-wrapper.is-closed {
      margin-top: 0; /* 🎯 No spacing when closed */
    }
    
    /* 🚀 **PANEL CONTAINER**: Simple height animations */
    .silence-panel-container {
      overflow: hidden;
      transition: max-height 250ms ease, opacity 200ms ease;
    }
    .silence-panel-container.is-open {
      max-height: 800px;
      opacity: 1;
      margin: 0;
    }
    .silence-panel-container.is-closed {
      max-height: 0;
      opacity: 0;
      margin: 0;
      padding: 0;
      border: none;
    }
    
    /* 🚀 **BUTTON HOVER**: Simple hover effect */
    .silence-toggle-button {
          }
    .silence-toggle-button:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .silence-toggle-button:active:not(:disabled) {
      transform: scale(0.98);
    }
  `;
  document.head.appendChild(style);
}

/**
 * 🚀 **PHƯƠNG ÁN BALANCED**: MICRO-DEBOUNCE + SMART CACHE
 * Ultra-light, ultra-smooth, ultra-fast silence detection
 */
const SilenceDetection = React.forwardRef(({ 
  fileId, 
  duration, 
  onSilenceDetected, 
  disabled = false,
  // 🆕 **REAL-TIME PREVIEW PROPS**
  audioRef = null,
  waveformData = [],
  onPreviewSilenceUpdate = null,
  // 🆕 **EXTERNAL PANEL CONTROL**
  isOpen: externalIsOpen = null,
  onToggleOpen = null,  // 🆕 **ADDITIONAL CALLBACKS**
  onSkipSilenceChange = null,
  // 🆕 **DETECTING STATE CALLBACK**: Notify parent about detection state
  onDetectingStateChange = null,
  // 🎯 **REGION-BASED PROPS**: Auto-detect region processing
  startTime = 0,
  endTime = null,
  selectedRegions = [],
  onRegionClick = null,
  onSelectedRegionsChange = null,
  onRemoveSelected = null,
}, ref) => {  // 🎛️ **STATE MANAGEMENT**: Minimal state for optimal performance
  const [isOpen, setIsOpen] = useState(externalIsOpen || false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [silenceData, setSilenceData] = useState(null);  const [threshold, setThreshold] = useState(-10);
  const [minDuration, setMinDuration] = useState(0.2);
  const [previewRegions, setPreviewRegions] = useState([]);
  const [skipSilenceEnabled, setSkipSilenceEnabled] = useState(false);  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('idle');
  const [progressMessage, setProgressMessage] = useState('');  // 🎯 **CONSTANTS & REFS**: Optimized for performance + silence cache
  const isPanelOpen = externalIsOpen !== null ? externalIsOpen : isOpen;
  const setIsPanelOpen = externalIsOpen !== null ? onToggleOpen : setIsOpen;
  const cacheRef = useRef(new Map());
  const silenceCacheRef = useRef({ regions: [], isStale: true }); // Global cache for all regions
  const debounceTimerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(false);
  const workerRef = useRef(null);
  const MAX_CACHE_SIZE = 25;
  const MICRO_DEBOUNCE_MS = 16;

  // 🎯 **FILTER FROM CACHE**: Only filter from cache, no re-detection
  const filterSilenceFromCache = useCallback((filterThreshold, filterMinDuration) => {
    if (silenceCacheRef.current.isStale || !silenceCacheRef.current.regions.length) {
      console.log('❌ [SilenceCache] Cache miss - cache is stale or empty:', {
        isStale: silenceCacheRef.current.isStale,
        regionsCount: silenceCacheRef.current.regions.length
      });
      return [];
    }
    
    console.log('🎯 [SilenceCache] Filtering cache for compatible threshold:', {
      totalRegions: silenceCacheRef.current.regions.length,
      filterThreshold: filterThreshold + 'dB',
      filterMinDuration: filterMinDuration + 's',
      startTime,
      endTime
    });
    
    // 🚀 **SIMPLE CACHE FILTERING**: Filter cache regions by duration and region bounds only
    // Note: Threshold compatibility is already checked by caller
    const filteredRegions = silenceCacheRef.current.regions.filter(region => {
      // Apply duration filter
      if (region.duration < filterMinDuration) {
        return false;
      }
      
      // Apply region bounds if user has selected a region
      const hasRegionSelection = startTime > 0 || endTime !== null;
      if (hasRegionSelection) {
        const regionStart = Math.max(0, startTime);
        const regionEnd = endTime ? Math.min(endTime, duration) : duration;
        
        // Check if region overlaps with current selection
        if (region.end <= regionStart || region.start >= regionEnd) {
          return false;
        }
      }
      
      return true;
    }).map(region => {
      // Clip region to current bounds if needed
      const hasRegionSelection = startTime > 0 || endTime !== null;
      if (hasRegionSelection) {
        const regionStart = Math.max(0, startTime);
        const regionEnd = endTime ? Math.min(endTime, duration) : duration;
        
        return {
          start: Math.max(regionStart, region.start),
          end: Math.min(regionEnd, region.end),
          duration: Math.min(regionEnd, region.end) - Math.max(regionStart, region.start)
        };
      }
      
      return region;
    });
    
    console.log('✅ [SilenceCache] Cache filtered successfully:', {
      originalCount: silenceCacheRef.current.regions.length,
      filteredCount: filteredRegions.length,
      filterThreshold: filterThreshold + 'dB',
      filterMinDuration: filterMinDuration + 's',
      sampleRegion: filteredRegions[0] ? `${filteredRegions[0].start}s-${filteredRegions[0].end}s` : 'none'
    });
    
    return filteredRegions;
  }, [startTime, endTime, duration]);

  // 🔧 **ULTRA-FAST SILENCE CALCULATION**: Now uses cache filtering instead of recalculation
  // 🎯 **REGION-AWARE CALCULATION**: Filter from cache instead of recalculating
  const calculateSilenceRegions = useCallback((filterThreshold, filterMinDuration) => {
    if (!duration) return [];
    
    console.log('🔄 [SilenceCalculation] Starting:', {
      filterThreshold: filterThreshold + 'dB',
      filterMinDuration: filterMinDuration + 's',
      hasCacheData: !silenceCacheRef.current.isStale && silenceCacheRef.current.regions.length > 0,
      hasWaveformData: waveformData.length > 0
    });
    
    // 🚀 **SMART CACHE USAGE**: Check if threshold is compatible with cache
    if (!silenceCacheRef.current.isStale && silenceCacheRef.current.regions.length > 0) {
      // 🎯 **THRESHOLD COMPATIBILITY CHECK**: Cache was created with Web Worker (very low threshold ~-60dB)
      // If user threshold is significantly higher, we need waveform calculation for accuracy
      const cacheThreshold = -60; // Web Worker uses very low threshold to catch all silence
      const thresholdDiff = Math.abs(filterThreshold - cacheThreshold);
      
      if (thresholdDiff <= 10) {
        // Threshold is close to cache threshold, safe to use cache
        console.log('⚡ [SilenceCalculation] Using cache - threshold compatible:', {
          cacheThreshold: cacheThreshold + 'dB',
          requestedThreshold: filterThreshold + 'dB',
          difference: thresholdDiff + 'dB'
        });
        return filterSilenceFromCache(filterThreshold, filterMinDuration);
      } else {
        // Threshold too different, need waveform calculation for accuracy
        console.log('🔄 [SilenceCalculation] Cache threshold incompatible, using waveform:', {
          cacheThreshold: cacheThreshold + 'dB',
          requestedThreshold: filterThreshold + 'dB',
          difference: thresholdDiff + 'dB'
        });
      }
    }
    
    // 🎯 **FALLBACK TO WAVEFORM**: When cache is empty/stale or threshold incompatible
    if (!waveformData.length) {
      console.log('❌ [SilenceCalculation] No waveform data available for threshold filtering');
      return [];
    }
    
    console.log('🔄 [SilenceCalculation] Using waveform calculation for accurate threshold filtering');
    
    const cacheKey = `${filterThreshold}_${filterMinDuration}_${waveformData.length}_${startTime}_${endTime}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      cacheRef.current.delete(cacheKey);
      cacheRef.current.set(cacheKey, cached);
      console.log('✅ [SilenceCalculation] Using waveform cache:', cached.length, 'regions');
      return cached;
    }
    
    // 🎯 **REGION BOUNDS**: Calculate effective processing bounds
    const regionStart = Math.max(0, startTime);
    const regionEnd = endTime ? Math.min(endTime, duration) : duration;
    
    // 🚀 **HYPER-OPTIMIZED CALCULATION**: Ultra-fast single-pass algorithm
    const sampleThreshold = Math.pow(10, filterThreshold / 20);
    const regions = [];
    let silenceStart = null;
    
    // 🔥 **REGION-AWARE SAMPLING**: Process only within region bounds
    const totalSamples = waveformData.length;
    const startSample = Math.floor((regionStart / duration) * totalSamples);
    const endSample = Math.floor((regionEnd / duration) * totalSamples);
    
    const adaptiveSamples = Math.min(5000, Math.max(3000, Math.floor((regionEnd - regionStart) * 40)));
    const sampleStep = Math.max(1, Math.floor((endSample - startSample) / adaptiveSamples));
    const timeStep = duration / totalSamples;
    
    // 🚀 **OPTIMIZED REGION LOOP**: Process only region samples
    for (let i = startSample; i < endSample; i += sampleStep) {
      const amplitude = waveformData[i];
      const currentTime = i * timeStep;
      
      if (amplitude < sampleThreshold) {
        if (silenceStart === null) {
          silenceStart = currentTime;
        }
      } else if (silenceStart !== null) {
        const silenceEnd = currentTime;
        const silenceDuration = silenceEnd - silenceStart;
        
        if (silenceDuration >= filterMinDuration) {
          regions.push({
            start: Math.max(regionStart, Math.round(silenceStart * 1000) / 1000),
            end: Math.min(regionEnd, Math.round(silenceEnd * 1000) / 1000),
            duration: Math.round(silenceDuration * 1000) / 1000
          });
        }
        silenceStart = null;
      }
    }
    
    // 🔧 **HANDLE SILENCE AT REGION END**
    if (silenceStart !== null) {
      const silenceDuration = regionEnd - silenceStart;
      if (silenceDuration >= filterMinDuration) {
        regions.push({
          start: Math.max(regionStart, Math.round(silenceStart * 1000) / 1000),
          end: regionEnd,
          duration: Math.round(silenceDuration * 1000) / 1000
        });
      }
    }
    
    // 🗃️ **ENHANCED CACHE UPDATE**
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      const keysToRemove = Array.from(cacheRef.current.keys()).slice(0, 5);
      keysToRemove.forEach(key => cacheRef.current.delete(key));
    }
    cacheRef.current.set(cacheKey, regions);
    
    console.log('✅ [SilenceCalculation] Waveform calculation completed:', regions.length, 'regions');
    return regions;
  }, [waveformData, duration, startTime, endTime, filterSilenceFromCache]);
  // ⚡ **ULTRA-SMOOTH UPDATE**: Instant visual + debounced callback
  const updatePreview = useCallback((instantUpdate = false) => {
    if (!isPanelOpen) {
      console.log('⏭️ [Preview] Panel closed, clearing regions');
      setPreviewRegions([]);
      if (onPreviewSilenceUpdate) {
        onPreviewSilenceUpdate([]);
      }
      return;
    }

    if (!waveformData.length && (silenceCacheRef.current.isStale || !silenceCacheRef.current.regions.length)) {
      console.log('⏭️ [Preview] No data available for preview');
      setPreviewRegions([]);
      if (onPreviewSilenceUpdate) {
        onPreviewSilenceUpdate([]);
      }
      return;
    }
    
    console.log('🔄 [Preview] Updating preview:', {
      threshold: threshold + 'dB',
      minDuration: minDuration + 's',
      instantUpdate,
      isPanelOpen
    });
    
    const regions = calculateSilenceRegions(threshold, minDuration);
    
    // 🚀 **INSTANT VISUAL UPDATE**: Update UI immediately for smooth interaction
    setPreviewRegions(regions);
    console.log('📋 [Table] Updated previewRegions for table:', {
      regionsCount: regions.length,
      threshold: threshold + 'dB',
      minDuration: minDuration + 's',
      sampleRegion: regions[0] ? `${regions[0].start}s-${regions[0].end}s (${regions[0].duration}s)` : 'none'
    });
    
    // 🎯 **ALWAYS UPDATE OVERLAY**: Send to overlay for real-time display
    if (onPreviewSilenceUpdate) {
      console.log('📡 [Preview] Sending to overlay:', {
        regionsCount: regions.length,
        instantUpdate,
        sampleRegion: regions[0] ? `${regions[0].start}s-${regions[0].end}s (${regions[0].duration}s)` : 'none'
      });
      onPreviewSilenceUpdate(regions);
    }
    
    // 🎯 **DEBOUNCED CALLBACK**: Only debounce non-critical callbacks
    if (!instantUpdate) {
      const now = Date.now();
      lastUpdateRef.current = now;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        if (lastUpdateRef.current === now) {
          console.log('⏰ [Preview] Debounced update completed');
        }
      }, MICRO_DEBOUNCE_MS);
    }
  }, [isPanelOpen, threshold, minDuration, calculateSilenceRegions, onPreviewSilenceUpdate, waveformData.length]);

  // 🚀 **SMOOTH SLIDER UPDATES**: RAF-optimized for instant response
  const requestSmoothUpdate = useCallback(() => {
    if (pendingUpdateRef.current) return;
    
    console.log('🚀 [SilenceSlider] Requesting smooth update for slider change');
    
    pendingUpdateRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      updatePreview(true);
      pendingUpdateRef.current = false;
    });
  }, [updatePreview]);

  // 🎯 **EFFECT**: Real-time preview updates with cleanup
  useEffect(() => {
    updatePreview(false);
    
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updatePreview]);

  // 🚀 **CACHE LOADER**: Load từ cache khi panel mở để slider hoạt động ngay
  useEffect(() => {
    if (isPanelOpen && !silenceCacheRef.current.isStale && silenceCacheRef.current.regions.length > 0) {
      // 🎯 **THRESHOLD COMPATIBILITY CHECK**: Only use cache if threshold is compatible
      const cacheThreshold = -60; // Web Worker uses very low threshold to catch all silence
      const thresholdDiff = Math.abs(threshold - cacheThreshold);
      
      if (thresholdDiff <= 10) {
        // Threshold compatible with cache
        console.log('🔄 [Cache] Loading existing cache for immediate slider response:', {
          cacheSize: silenceCacheRef.current.regions.length,
          isStale: silenceCacheRef.current.isStale,
          thresholdCompatible: true,
          thresholdDiff: thresholdDiff + 'dB'
        });
        
        // 🚀 **INSTANT CACHE LOAD**: Load cache data immediately for slider
        const cachedRegions = filterSilenceFromCache(threshold, minDuration);
        setPreviewRegions(cachedRegions);
        
        if (onPreviewSilenceUpdate && cachedRegions.length > 0) {
          console.log('✅ [Cache] Sending cached regions to overlay:', {
            regionsCount: cachedRegions.length,
            firstRegion: cachedRegions[0] ? `${cachedRegions[0].start}s-${cachedRegions[0].end}s` : 'none'
          });
          onPreviewSilenceUpdate(cachedRegions);
        }
      } else {
        // Threshold incompatible - let waveform calculation handle it
        console.log('⏭️ [Cache] Skipping cache load - threshold incompatible:', {
          cacheThreshold: cacheThreshold + 'dB',
          requestedThreshold: threshold + 'dB',
          thresholdDiff: thresholdDiff + 'dB',
          note: 'Waveform calculation will handle this'
        });
      }
    }
  }, [isPanelOpen, threshold, minDuration, filterSilenceFromCache, onPreviewSilenceUpdate]);

  // 🚀 **CACHE WARMING**: Pre-calculate common values for instant response
  useEffect(() => {
    if (!isPanelOpen || !waveformData.length || !duration) return;
    
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        const popularThresholds = [-20, -25, -30, -35, -40, -45, -50];
        const popularDurations = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
        
        popularThresholds.forEach(thresh => {
          popularDurations.forEach(dur => {
            if (cacheRef.current.size < MAX_CACHE_SIZE) {
              calculateSilenceRegions(thresh, dur);
            }
          });
        });
      });    }  }, [isPanelOpen, waveformData.length, duration, calculateSilenceRegions]);

  // 🆕 **DETECTING STATE CHANGE**: Notify parent when detection state changes
  useEffect(() => {
    onDetectingStateChange?.(isDetecting);
  }, [isDetecting, onDetectingStateChange]);

  // 🎯 **AUDIOBUFFER CREATION**: Tạo AudioBuffer từ file thật - IMPROVED
  const createAudioBufferFromFile = useCallback(async (file) => {
    if (!file) {
      console.log('❌ [AudioBuffer] No file provided');
      return null;
    }
    
    console.log('🔧 [AudioBuffer] Creating AudioBuffer from file:', {
      name: file.name || 'unknown',
      type: file.type || 'unknown',
      size: file.size ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : 'unknown'
    });
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ [AudioBuffer] File.arrayBuffer() success, size:', arrayBuffer.byteLength);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log('✅ [AudioBuffer] AudioContext.decodeAudioData() success:', {
        duration: audioBuffer.duration.toFixed(2) + 's',
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      // Close context to free resources
      await audioContext.close();
      
      return audioBuffer;
    } catch (error) {
      console.error('❌ [AudioBuffer] Creation failed:', error.message);
      return null;
    }
  }, []);

  // 🎯 **FILE REFERENCE**: Store current audio file for Web Worker processing
  const audioFileRef = useRef(null);
  const audioBufferCreatedRef = useRef(false);
  
  // 🚀 **AUDIO BUFFER CREATOR**: SIMPLIFIED - Always try to create AudioBuffer
  const setupAudioBufferForWorker = useCallback(async () => {
    // 🎯 **GET FILE FROM GLOBAL STATE**: Get current audio file from MP3CutterMain
    const currentFile = window.currentAudioFile;
    
    console.log('🔧 [AudioBuffer] Setup attempt:', {
      hasFile: !!currentFile,
      alreadyCreated: audioBufferCreatedRef.current,
      fileName: currentFile?.name || 'unknown'
    });
    
    if (!currentFile || audioBufferCreatedRef.current) {
      console.log('⏭️ [AudioBuffer] Skipping setup - no file or already created');
      return;
    }
    
    console.log('🚀 [AudioBuffer] Creating AudioBuffer for Web Worker...');
    
    try {
      const audioBuffer = await createAudioBufferFromFile(currentFile);
      
      if (audioBuffer && audioRef?.current) {
        // 🚀 **ATTACH AUDIOBUFFER**: Attach AudioBuffer to audioRef for Web Worker access
        audioRef.current.audioBuffer = audioBuffer;
        audioBufferCreatedRef.current = true;
        
        console.log('✅ [AudioBuffer] Successfully attached to audioRef:', {
          duration: audioBuffer.duration.toFixed(2) + 's',
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels
        });
      } else {
        console.log('❌ [AudioBuffer] Failed to attach - missing audioBuffer or audioRef');
      }
    } catch (error) {
      console.error('❌ [AudioBuffer] Setup failed:', error.message);
    }
  }, [createAudioBufferFromFile, audioRef]);
  
  // 🎯 **SETUP AUDIOBUFFER WHEN FILE CHANGES**: Create AudioBuffer when new file is loaded
  useEffect(() => {
    // 🚀 **RESET FOR NEW FILE**: Reset buffer creation flag for new files
    if (fileId && fileId !== audioFileRef.current?.filename) {
      console.log('🔄 [AudioBuffer] New file detected, resetting:', { 
        newFileId: fileId, 
        oldFileId: audioFileRef.current?.filename 
      });
      
      audioBufferCreatedRef.current = false;
      audioFileRef.current = { filename: fileId };
      
      // 🚀 **SETUP WITH DELAY**: Give time for file to be ready in global state
      setTimeout(setupAudioBufferForWorker, 500);
    }
  }, [fileId, setupAudioBufferForWorker]);

  // 🎯 **WEB WORKER DETECTION**: Chunked processing with Web Worker
  const detectSilenceWithWorker = useCallback(async (audioBuffer) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        workerRef.current = new Worker('/workers/smart-silence-worker.js');
      }

      const worker = workerRef.current;
      
      const handleMessage = (e) => {
        const { type, progress, region, regions, error } = e.data;
        
        switch (type) {
          case 'progress':
            setProgress(Math.round(progress));
            setProgressMessage(`Processing chunk... ${Math.round(progress)}%`);
            break;
            
          case 'region':
            // 🚀 **REAL-TIME REGION UPDATES**: Append to cache and update UI immediately
            if (region && silenceCacheRef.current) {
              // Append new region to existing cache
              const updatedRegions = [...silenceCacheRef.current.regions, region];
              silenceCacheRef.current = {
                regions: updatedRegions,
                isStale: false
              };
              
              // Filter and send to UI for real-time overlay
              const filteredRegions = updatedRegions.filter(r => r.duration >= minDuration);
              setPreviewRegions(filteredRegions);
              
              if (onPreviewSilenceUpdate) {
                console.log('⚡ [Real-time] Region found, updating UI:', {
                  newRegion: `${region.start}s-${region.end}s`,
                  totalRegions: updatedRegions.length,
                  filteredCount: filteredRegions.length
                });
                onPreviewSilenceUpdate(filteredRegions);
              }
            }
            break;
            
          case 'complete':
            // 🎯 **FINAL CACHE UPDATE**: Ensure cache has all regions
            console.log('💾 [SilenceCache] Web Worker completed, finalizing cache:', {
              regionsFound: regions?.length || 0,
              firstRegion: regions?.[0] ? `${regions[0].start}s-${regions[0].end}s` : 'none',
              totalDuration: regions?.reduce((sum, r) => sum + r.duration, 0).toFixed(2) + 's' || '0s'
            });
            
            silenceCacheRef.current = {
              regions: regions || [],
              isStale: false
            };
            
            console.log('✅ [SilenceCache] Cache finalized from Web Worker:', {
              cacheSize: silenceCacheRef.current.regions.length,
              isStale: silenceCacheRef.current.isStale
            });
            
            worker.removeEventListener('message', handleMessage);
            resolve(regions || []);
            break;
            
          case 'error':
            worker.removeEventListener('message', handleMessage);
            reject(new Error(error || 'Worker processing failed'));
            break;
            
          default:
            console.warn('🔧 [Web Worker] Unknown message type:', type);
            break;
        }
      };

      worker.addEventListener('message', handleMessage);
      
      // 🚀 **INITIALIZE CACHE**: Reset cache before starting
      silenceCacheRef.current = {
        regions: [],
        isStale: false
      };
      
      // 🔧 **EXTRACT AUDIOBUFFER DATA**: Convert AudioBuffer to transferable format
      console.log('🔧 [Web Worker] Extracting AudioBuffer data for transfer:', {
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length,
        duration: audioBuffer.duration.toFixed(2) + 's'
      });
      
      // Extract channel data as Float32Arrays (transferable)
      const channelData = [];
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const data = audioBuffer.getChannelData(channel);
        // Create a copy since getChannelData returns a view
        const channelArray = new Float32Array(data);
        channelData.push(channelArray);
      }
      
      console.log('✅ [Web Worker] Channel data extracted successfully:', {
        channelsExtracted: channelData.length,
        firstChannelLength: channelData[0]?.length || 0,
        totalSamples: channelData.reduce((sum, ch) => sum + ch.length, 0)
      });
      
      // Start worker processing with transferable data
      const transferableData = {
        cmd: 'analyze',
        data: {
          // 🚀 **TRANSFERABLE AUDIOBUFFER DATA**: Send metadata + channel data separately
          audioBufferData: {
            sampleRate: audioBuffer.sampleRate,
            numberOfChannels: audioBuffer.numberOfChannels,
            length: audioBuffer.length,
            duration: audioBuffer.duration,
            channelData: channelData // Array of Float32Arrays
          },
          params: {
            threshold,
            minDuration
          }
        }
      };
      
      // 🚀 **TRANSFER OWNERSHIP**: Transfer ArrayBuffers for better performance
      const transferList = channelData.map(ch => ch.buffer);
      
      console.log('🚀 [Web Worker] Sending data to worker:', {
        transferListSize: transferList.length,
        totalTransferredBytes: transferList.reduce((sum, buf) => sum + buf.byteLength, 0)
      });
      
      worker.postMessage(transferableData, transferList);
    });
  }, [threshold, minDuration, onPreviewSilenceUpdate]);

  // 🔍 **SILENCE DETECTION**: SIMPLIFIED - Chỉ dùng Web Worker
  const detectSilence = useCallback(async () => {
    console.log('🚀 [SilenceDetection] Starting detection process');
    
    if (!fileId || isDetecting) {
      console.log('❌ [SilenceDetection] Detection skipped:', { noFileId: !fileId, alreadyDetecting: isDetecting });
      return;
    }
    
    // 🚀 **ENSURE AUDIOBUFFER**: Try to create AudioBuffer if not available
    if (!audioRef?.current?.audioBuffer) {
      console.log('🔧 [SilenceDetection] AudioBuffer not available, creating...');
      await setupAudioBufferForWorker();
    }
    
    // 🚨 **REQUIRE AUDIOBUFFER**: Web Worker cần AudioBuffer
    if (!audioRef?.current?.audioBuffer) {
      console.error('❌ [SilenceDetection] AudioBuffer required for Web Worker detection');
      setProgressStage('error');
      setProgressMessage('Error: Could not create AudioBuffer for processing');
      return;
    }
    
    setIsDetecting(true);
    setProgress(0);
    setProgressStage('starting');
    
    // Validation
    if (!duration || duration <= 0) {
      setProgressStage('error');
      setProgressMessage('Error: Invalid audio duration');
      setIsDetecting(false);
      return;
    }
    
    console.log('✅ [SilenceDetection] Starting Web Worker processing:', {
      audioDuration: duration.toFixed(3) + 's',
      audioBufferDuration: audioRef.current.audioBuffer.duration.toFixed(3) + 's',
      threshold: threshold + 'dB',
      minDuration: minDuration + 's'
    });
    
    setProgressMessage(`Processing with Web Worker (${duration.toFixed(3)}s)...`);
      
    try {
      setProgressStage('processing');
      setProgressMessage('Analyzing audio with optimized Web Worker...');
      
      const regions = await detectSilenceWithWorker(audioRef.current.audioBuffer);
      
      if (regions && regions.length >= 0) {
        // Success with Web Worker
        setProgress(100);
        setProgressStage('complete');
        setProgressMessage(`✅ Found ${regions.length} silence regions!`);
    
        const silenceData = {
          silenceRegions: regions,
          totalSilence: regions.reduce((sum, r) => sum + r.duration, 0),
          originalDuration: duration,
          regionBased: false
        };
    
        console.log('✅ [SilenceDetection] Web Worker completed successfully:', {
          regionsFound: regions.length,
          totalSilence: silenceData.totalSilence.toFixed(2) + 's',
          processingTime: 'Web Worker chunked'
        });
    
        setSilenceData(silenceData);
        onSilenceDetected?.(silenceData);
    
        return;
      }
      
    } catch (error) {
      console.error('❌ [SilenceDetection] Web Worker failed:', error.message);
      setProgressStage('error');
      setProgressMessage(`Error: Web Worker processing failed - ${error.message}`);    
    } finally {
      setIsDetecting(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStage('idle');
        setProgressMessage('');
      }, 3000);
    }
  }, [fileId, threshold, minDuration, duration, isDetecting, onSilenceDetected, audioRef, detectSilenceWithWorker, setupAudioBufferForWorker]);

  // 🚀 **ASSIGN TO REF**: Assign detectSilence function to ref for useImperativeHandle
  React.useEffect(() => {
    detectSilenceRef.current = detectSilence;
  }, [detectSilence]);

  // 🎯 **HANDLERS**: Simple and optimized
  const togglePanel = useCallback(() => {
    const newIsOpen = !isPanelOpen;
    setIsPanelOpen(newIsOpen);
    
    if (!newIsOpen) {
      setPreviewRegions([]);
      onPreviewSilenceUpdate?.([]);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    } else {
      // ✅ **AUTO-TRIGGER**: Gọi detectSilence() ngay khi panel mở
      console.log('🚀 [Panel] Panel opened - checking for auto-trigger');
      
      // 🎯 **SMART AUTO-TRIGGER**: Chỉ trigger nếu chưa có cache hoặc cache stale
      setTimeout(() => {
        if (fileId && !isDetecting) {
          const hasFreshCache = !silenceCacheRef.current.isStale && silenceCacheRef.current.regions.length > 0;
          
          if (hasFreshCache) {
            console.log('⚡ [Panel] Cache available - skipping auto-trigger, using cache');
          } else {
            console.log('🔥 [Panel] No cache available - auto-triggering detectSilence()');
            if (detectSilenceRef.current) {
              detectSilenceRef.current();
            }
          }
        }
      }, 100);
    }
  }, [isPanelOpen, setIsPanelOpen, onPreviewSilenceUpdate, fileId, isDetecting]); // 🔧 **REMOVED detectSilence**: Use ref instead

  const handleThresholdChange = useCallback((e) => {
    const newThreshold = parseInt(e.target.value);
    console.log('🎚️ [ThresholdSlider] Threshold changed:', {
      oldThreshold: threshold + 'dB',
      newThreshold: newThreshold + 'dB',
      willTriggerUpdate: true
    });
    setThreshold(newThreshold);
    requestSmoothUpdate();
  }, [requestSmoothUpdate, threshold]);

  const handleDurationChange = useCallback((e) => {
    const newDuration = parseFloat(e.target.value);
    console.log('🎚️ [DurationSlider] Duration changed:', {
      oldDuration: minDuration + 's',
      newDuration: newDuration + 's',
      willTriggerUpdate: true
    });
    setMinDuration(newDuration);
    requestSmoothUpdate();
  }, [requestSmoothUpdate, minDuration]);

  const handleSkipSilenceChange = useCallback((e) => {
    const enabled = e.target.checked;
    setSkipSilenceEnabled(enabled);
    onSkipSilenceChange?.(enabled);
  }, [onSkipSilenceChange]);

  // 🚀 **DETECT SILENCE REF**: Tạo ref để lưu detectSilence function
  const detectSilenceRef = useRef(null);

  // 🚀 **EXPOSE detectSilence VIA REF**: Cho phép parent component gọi detectSilence - FIXED
  React.useImperativeHandle(ref, () => ({
    detectSilence: () => {
      console.log('🎯 [Ref] detectSilence called via ref');
      if (detectSilenceRef.current) {
        detectSilenceRef.current();
      } else {
        console.warn('❌ [Ref] detectSilence function not ready yet');
      }
    },
    getCacheInfo: () => ({
      isStale: silenceCacheRef.current.isStale,
      regionsCount: silenceCacheRef.current.regions.length
    })
  }), []); // 🔧 **EMPTY DEPS**: Không có dependencies để tránh circular reference

  // 📊 **COMPUTED VALUES**: Optimized calculations
  const hasRegions = silenceData?.silenceRegions?.length > 0;
  const totalSilence = silenceData?.totalSilence || 0;
  const hasRegionSelection = startTime > 0 || endTime !== null;
  
  let effectiveEndTime;
  if (endTime !== null && endTime !== undefined && duration && duration > 0) {
    effectiveEndTime = Math.min(Math.max(endTime, startTime + 0.1), duration);
  } else if (duration && duration > 0) {
    effectiveEndTime = duration;
  } else {
    effectiveEndTime = startTime + 0.1;
  }
  
  const regionDuration = Math.max(0, effectiveEndTime - startTime);
  const baseDuration = hasRegionSelection && silenceData?.regionBased ? regionDuration : duration;
  const silencePercent = baseDuration > 0 ? (totalSilence / baseDuration * 100) : 0;

  // 🧹 **CLEANUP**: Reset spacing on unmount and cleanup Web Worker
  useEffect(() => {
    return () => {
      document.querySelectorAll('.silence-detection-wrapper').forEach(wrapper => {
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';  
      });
      
      // Cleanup Web Worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // 🎨 **RENDER**: Conditional rendering for performance
  if (!fileId || disabled) {
    return null;
  }

  const isInlineMode = externalIsOpen === null;
  const isPanelMode = !isInlineMode;

  // 🎯 **EARLY RETURN**: If panel is closed, return null to take no space
  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className={`silence-detection-wrapper ${isPanelOpen ? 'is-open' : 'is-closed'}`}>
      {/* 🔇 **TOGGLE BUTTON**: Show only in inline mode */}
      {isInlineMode && (
        <div className="flex justify-center mb-6">
          <button
            onClick={togglePanel}
            disabled={isDetecting}            className={`silence-toggle-button inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isPanelOpen
                ? 'bg-red-100 hover:bg-red-150 border border-red-300 text-red-800' 
                : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
            }`}
          >            
            {/* ✅ **DOT INDICATOR**: Active state với animated dot */}
            <div className="relative">
              <BarChart className="w-4 h-4" />
              {isPanelOpen && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
              {isDetecting && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-spin">
                  <div className="w-1 h-1 bg-white rounded-full m-0.5"></div>
                </div>
              )}
            </div>
            
            <span>Find silence regions</span>            
            <div 
              className="w-4 h-4 transition-transform duration-200 ease-out"
              style={{
                transform: isPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}      {/* 🎛️ **MAIN PANEL**: Ultra-smooth animation with optimized transforms */}
      <div className={`silence-panel-container ${isPanelOpen ? 'is-open' : 'is-closed'}`}>
        <div className="silence-panel-content bg-white/90 rounded-xl border border-slate-200/50 shadow-sm">
          {/* 📋 **PANEL HEADER**: Show only in panel mode with close button */}
          {isPanelMode && (
            <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2">
                <BarChart className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-slate-800">Silence Detection</span>
              </div>
              <button
                onClick={togglePanel}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                title="Close panel"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}          {/* 🎛️ **MAIN CONTENT**: Full content without scroll */}
          <div className="p-4 space-y-4">

          {/* 🎛️ **OPTIMIZED CONTROLS**: Ultra-responsive sliders */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Threshold Control - Optimized */}
              <div>
                <label className="block text-xs text-slate-600 mb-2">
                  Threshold: {threshold}dB
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="-60"
                      max="-10"
                      value={threshold}                      onChange={handleThresholdChange}
                      disabled={isDetecting}
                      className="silence-threshold-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                      style={{
                        background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((threshold + 60) / 50) * 100}%, #e2e8f0 ${((threshold + 60) / 50) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-700 w-12 text-right">
                    {threshold}dB
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Sensitive</span>
                  <span>Conservative</span>
                </div>
              </div>
              
              {/* Min Duration Control - Optimized */}
              <div>
                <label className="block text-xs text-slate-600 mb-2">
                  Min Duration: {minDuration}s
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={minDuration}                      onChange={handleDurationChange}
                      disabled={isDetecting}
                      className="silence-duration-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                      style={{
                        background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((minDuration - 0.1) / 2.9) * 100}%, #e2e8f0 ${((minDuration - 0.1) / 2.9) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-700 w-12 text-right">
                    {minDuration}s
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0.1s</span>
                  <span>3.0s</span>
                </div>
              </div>
            </div>
          </div>          {/* 📋 **SILENCE REGIONS TABLE**: Detailed list of all found regions */}
          {isPanelOpen && previewRegions.length > 0 && (
            <div className="mt-4 bg-white/90 rounded-lg border border-slate-200/50 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  📋 Danh sách chi tiết vùng khoảng lặng
                  <span className="text-xs text-slate-500 font-normal">
                    ({previewRegions.length} vùng)
                  </span>
                </h4>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-12">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Start</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">End</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Duration</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 w-16">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRegions.map((region, index) => {
                      const isSelected = selectedRegions?.some(selected => 
                        Math.abs(selected.start - region.start) < 0.001 && 
                        Math.abs(selected.end - region.end) < 0.001
                      );
                      
                      return (
                        <tr 
                          key={`${region.start}-${region.end}-${index}`}
                          className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            // 🎯 **CLICK TO FOCUS**: Click row to focus this region on waveform
                            onRegionClick?.(region);
                          }}
                          title="Click to focus this region on waveform"
                        >
                          <td className="px-3 py-2 text-slate-600 font-mono">{index + 1}</td>
                          <td className="px-3 py-2 text-slate-800 font-mono">{formatTimeUnified(region.start)}</td>
                          <td className="px-3 py-2 text-slate-800 font-mono">{formatTimeUnified(region.end)}</td>
                          <td className="px-3 py-2 text-slate-800 font-mono">{region.duration.toFixed(2)}s</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  // 🎯 **TOGGLE SELECTION**: Toggle individual region selection
                                  onSelectedRegionsChange?.(isSelected ? selectedRegions.filter(selected => 
                                    !(Math.abs(selected.start - region.start) < 0.001 && 
                                      Math.abs(selected.end - region.end) < 0.001)
                                  ) : [...(selectedRegions || []), region]);
                                }}
                                className={`w-4 h-4 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500 hover:bg-blue-600'
                                    : 'border-slate-300 bg-white hover:border-blue-400'
                                }`}
                                title={isSelected ? 'Deselect this region' : 'Select this region'}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* 🎯 **TABLE FOOTER**: Enhanced stats showing total and selected regions */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1">
                      <List className="w-3 h-3" />
                      Total: {previewRegions.length} regions, {previewRegions.reduce((sum, r) => sum + r.duration, 0).toFixed(2)}s duration
                    </span>
                    <span className="text-blue-600 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Selected: {selectedRegions?.length || 0} regions, {(selectedRegions?.reduce((sum, r) => sum + r.duration, 0) || 0).toFixed(2)}s duration
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 📊 **PROCESSING STATISTICS**: Concise results after detection */}
          {hasRegions && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">📊 Processing Results</span>
                  {silenceData.regionBased && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Region Mode</span>
                  )}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  {silencePercent.toFixed(1)}% silence removed
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-green-700 bg-white/60 rounded px-3 py-2">
                <span>
                  <span className="font-semibold text-green-800">{baseDuration.toFixed(2)}s</span>
                  <span className="text-slate-500 ml-1">→</span>
                </span>
                <span>
                  <span className="font-semibold text-red-600">-{totalSilence.toFixed(2)}s</span>
                  <span className="text-slate-500 ml-1">→</span>
                </span>
                <span className="font-semibold text-blue-600">{(baseDuration - totalSilence).toFixed(2)}s</span>
              </div>
            </div>
          )}

          {/* 📊 **PROGRESS INDICATOR**: Show during processing - moved above button */}
          {(isDetecting || progressStage !== 'idle') && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isDetecting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : progressStage === 'complete' ? (
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  ) : progressStage === 'error' ? (
                    <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  ) : null}
                  <span className="text-sm font-medium text-blue-800">
                    {progressMessage || 'Processing...'}
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-mono">
                  {progress}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progressStage === 'error' ? 'bg-red-500' :
                    progressStage === 'complete' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              
              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  progressStage === 'error' ? 'bg-red-500' :
                  progressStage === 'complete' ? 'bg-green-500' : 
                  'bg-blue-500 animate-pulse'
                }`} />
                <span className="text-xs text-slate-600 capitalize">
                  {progressStage === 'starting' ? 'initializing' : progressStage}
                </span>
              </div>
            </div>
          )}

          {/* 🎯 **SIMPLIFIED ACTION**: Single button for detect with Web Worker */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                console.log('🔴 [BUTTON] Manual Web Worker Silence Detection clicked!');
                console.log('🔴 [BUTTON] Button state:', { isDetecting, fileId, disabled: isDetecting });
                detectSilence();
              }}
              disabled={isDetecting}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isDetecting 
                  ? 'bg-blue-500 text-white cursor-not-allowed' 
                  : hasRegions 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {/* ✅ **BUTTON STATE INDICATOR**: Visual feedback với dot indicator */}
              <div className="relative">
                {isDetecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : hasRegions ? (
                  <>
                    <BarChart className="w-4 h-4" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full"></div>
                  </>
                ) : (
                  <BarChart className="w-4 h-4" />
                )}
              </div>
              
              {isDetecting ? (
                <span>Processing with Web Worker...</span>
              ) : hasRegions ? (
                <span>Re-analyze with Web Worker</span>
              ) : (
                <span>Find Silent Parts (Web Worker)</span>
              )}
            </button>
          </div>

          {/* 🆕 **SKIP SILENCE CONTROL**: Beautiful toggle to enable/disable silence skipping */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={skipSilenceEnabled}
                  onChange={handleSkipSilenceChange}
                  disabled={isDetecting}
                  className="sr-only"
                />
                <div className={`
                  w-8 h-4 rounded-full transition-all duration-200 ease-in-out
                  ${skipSilenceEnabled 
                    ? 'bg-blue-500' 
                    : 'bg-slate-300 hover:bg-slate-400'
                  }
                  ${isDetecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}>
                  <div className={`
                    w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out transform
                    absolute top-0.5
                    ${skipSilenceEnabled ? 'translate-x-4' : 'translate-x-0.5'}
                  `}></div>
                </div>
              </div>
              <span className="text-sm text-slate-700">
              Audio playback will skip selected silence regions in real time.
              </span>
              {skipSilenceEnabled && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  On
                </span>
              )}
            </label>
            {skipSilenceEnabled && selectedRegions.length > 0 && (
              <div className="mt-2 text-xs text-blue-600">
                Will skip {selectedRegions.length} selected region{selectedRegions.length !== 1 ? 's' : ''} ({selectedRegions.reduce((sum, r) => sum + r.duration, 0).toFixed(2)}s total)
              </div>
            )}
            {skipSilenceEnabled && selectedRegions.length === 0 && (
              <div className="mt-2 text-xs text-amber-600">
                No regions selected. Select regions by clicking on them first.
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SilenceDetection;