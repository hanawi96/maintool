import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BarChart, Loader2, ChevronDown, X } from 'lucide-react';
import { audioApi } from '../services/audioApi';

// 🎨 **INJECT OPTIMIZED CSS**: Single injection for ultra-smooth panel animations
if (typeof document !== 'undefined' && !document.getElementById('silence-panel-styles')) {
  const style = document.createElement('style');
  style.id = 'silence-panel-styles';  style.textContent = `
    /* 🚀 **WRAPPER**: Eliminate all default spacing */
    .silence-detection-wrapper {
      width: 100%;
      margin: 0;
      padding: 0;
      transition: margin 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .silence-detection-wrapper.is-closed {
      margin-bottom: 0 !important;
      margin-top: 0 !important;
    }
      transition: margin 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .silence-detection-wrapper.is-closed {
      margin-bottom: 0 !important;
      margin-top: 0 !important;
    }
      /* 🚀 **PANEL CONTAINER**: Optimized height-based animations */
    .silence-panel-container {
      overflow: hidden;
      transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1), 
                  opacity 200ms ease-out,
                  margin 250ms cubic-bezier(0.4, 0, 0.2, 1),
                  padding 250ms cubic-bezier(0.4, 0, 0.2, 1);
      will-change: max-height, opacity, margin, padding;
    }    .silence-panel-container.is-open {
      max-height: 800px;
      opacity: 1;
      margin: 0;
      padding: 0;
      pointer-events: auto;
    }
    .silence-panel-container.is-closed {
      max-height: 0 !important;
      opacity: 0;
      margin: 0 !important;
      padding: 0 !important;
      pointer-events: none;
    }
    
    /* 🎯 **PANEL CONTENT**: Content layer optimization */
    .silence-panel-content {
      contain: layout style paint;
      will-change: auto;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* 🚀 **SMOOTH CONTENT ENTRY**: Content slides in/out */
    .silence-panel-container.is-open .silence-panel-content {
      transform: translateY(0);
    }
    .silence-panel-container.is-closed .silence-panel-content {
      transform: translateY(-10px);
    }
    
    /* 🚀 **BUTTON HOVER OPTIMIZATION** */
    .silence-toggle-button {
      transform: translateZ(0);
      will-change: transform, background-color;
    }
    .silence-toggle-button:hover:not(:disabled) {
      transform: translateY(-1px) translateZ(0);
    }    .silence-toggle-button:active:not(:disabled) {
      transform: translateY(0) scale(0.98) translateZ(0);
    }
    
    /* 🎯 **SCROLLABLE CONTENT**: Custom scrollbar styling */
    .silence-scrollable-content {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
    }
    .silence-scrollable-content::-webkit-scrollbar {
      width: 6px;
    }
    .silence-scrollable-content::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
    }
    .silence-scrollable-content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    .silence-scrollable-content::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `;
  document.head.appendChild(style);
}

/**
 * 🚀 **PHƯƠNG ÁN BALANCED**: MICRO-DEBOUNCE + SMART CACHE
 * Ultra-light, ultra-smooth, ultra-fast silence detection
 */
const SilenceDetection = ({ 
  fileId, 
  duration, 
  onSilenceDetected, 
  onSilenceRemoved,
  disabled = false,
  // 🆕 **REAL-TIME PREVIEW PROPS**
  audioRef = null,
  waveformData = [],
  onPreviewSilenceUpdate = null,
  // 🆕 **EXTERNAL PANEL CONTROL**
  isOpen: externalIsOpen = null,
  onToggleOpen = null,
  // 🆕 **ADDITIONAL CALLBACKS**
  onSkipSilenceChange = null,
  // 🎯 **REGION-BASED PROPS**: Auto-detect region processing
  startTime = 0,
  endTime = null
}) => {  // 🎛️ **STATE MANAGEMENT**: Minimal state for optimal performance
  const [isOpen, setIsOpen] = useState(externalIsOpen || false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [silenceData, setSilenceData] = useState(null);
  const [threshold, setThreshold] = useState(-30);
  const [minDuration, setMinDuration] = useState(0.5);
  const [previewRegions, setPreviewRegions] = useState([]);
  const [skipSilenceEnabled, setSkipSilenceEnabled] = useState(false);  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('idle');
  const [progressMessage, setProgressMessage] = useState('');
  // 🎯 **CONSTANTS & REFS**: Optimized for performance
  const isPanelOpen = externalIsOpen !== null ? externalIsOpen : isOpen;
  const setIsPanelOpen = externalIsOpen !== null ? onToggleOpen : setIsOpen;
  const cacheRef = useRef(new Map());
  const debounceTimerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(false);
  const MAX_CACHE_SIZE = 25;
  const MICRO_DEBOUNCE_MS = 16;// 🔧 **ULTRA-FAST SILENCE CALCULATION**: Hyper-optimized algorithm with smart caching
  // 🎯 **REGION-AWARE CALCULATION**: Calculate silence within region bounds
  const calculateSilenceRegions = useCallback((threshold, minDuration) => {
    if (!waveformData.length || !duration) return [];
    
    // 🎯 **SMART CACHE CHECK**: Include region bounds in cache key
    const cacheKey = `${threshold}_${minDuration}_${waveformData.length}_${startTime}_${endTime}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      cacheRef.current.delete(cacheKey);
      cacheRef.current.set(cacheKey, cached);
      return cached;
    }
    
    // 🎯 **REGION BOUNDS**: Calculate effective processing bounds
    const regionStart = Math.max(0, startTime);
    const regionEnd = endTime ? Math.min(endTime, duration) : duration;
    
    // 🚀 **HYPER-OPTIMIZED CALCULATION**: Ultra-fast single-pass algorithm
    const sampleThreshold = Math.pow(10, threshold / 20);
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
        
        if (silenceDuration >= minDuration) {
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
      if (silenceDuration >= minDuration) {
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
    
    return regions;
  }, [waveformData, duration, startTime, endTime]);
  // ⚡ **ULTRA-SMOOTH UPDATE**: Instant visual + debounced callback
  const updatePreview = useCallback((instantUpdate = false) => {
    if (!isPanelOpen || !waveformData.length) {
      setPreviewRegions([]);
      onPreviewSilenceUpdate?.([]);
      return;
    }
    
    const regions = calculateSilenceRegions(threshold, minDuration);
    
    // 🚀 **INSTANT VISUAL UPDATE**: Update UI immediately for smooth interaction
    setPreviewRegions(regions);
    
    // 🎯 **DEBOUNCED CALLBACK**: Only debounce the parent callback to prevent spam
    if (instantUpdate) {
      // For slider drag: instant visual, no callback delay
      onPreviewSilenceUpdate?.(regions);
    } else {
      // For other updates: use micro-debounce for callback
      const now = Date.now();
      lastUpdateRef.current = now;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        if (lastUpdateRef.current === now) {
          onPreviewSilenceUpdate?.(regions);
        }
      }, MICRO_DEBOUNCE_MS);
    }  }, [isPanelOpen, threshold, minDuration, calculateSilenceRegions, onPreviewSilenceUpdate, waveformData.length]);

  // 🚀 **SMOOTH SLIDER UPDATES**: RAF-optimized for instant response
  const requestSmoothUpdate = useCallback(() => {
    if (pendingUpdateRef.current) return;
    
    pendingUpdateRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      updatePreview(true);
      pendingUpdateRef.current = false;
    });
  }, [updatePreview]);  // 🎯 **EFFECT**: Real-time preview updates with cleanup
  useEffect(() => {
    updatePreview(false);
    
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updatePreview]);
  // 🧹 **CLEANUP**: Reset spacing on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('.silence-detection-wrapper').forEach(wrapper => {
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';
      });
    };
  }, []);
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
      });
    }  }, [isPanelOpen, waveformData.length, duration, calculateSilenceRegions]);

  // 🔍 **SILENCE DETECTION**: Auto-detect region-based processing
  const detectSilence = useCallback(async () => {
    if (!fileId || isDetecting) return;
    
    setIsDetecting(true);
    setProgress(0);
    setProgressStage('starting');
      const hasRegionSelection = startTime > 0 || endTime !== null;
    
    // Validation
    if (!duration || duration <= 0) {
      setProgressStage('error');
      setProgressMessage('Error: Invalid audio duration');
      setIsDetecting(false);
      return;
    }
    
    if (startTime < 0 || startTime >= duration) {
      setProgressStage('error');
      setProgressMessage('Error: Invalid start time');
      setIsDetecting(false);
      return;
    }
      let effectiveEndTime;
    if (endTime !== null && endTime !== undefined) {
      if (endTime <= startTime) {
        setProgressStage('error');
        setProgressMessage('Error: End time must be greater than start time');
        setIsDetecting(false);
        return;
      }
      effectiveEndTime = Math.min(Math.max(endTime, startTime + 0.1), duration);
    } else {
      effectiveEndTime = duration;
    }
    
    const regionDuration = effectiveEndTime - startTime;
    
    if (regionDuration <= 0.1) {
      setProgressStage('error');
      setProgressMessage('Error: Selected region is too short (minimum 0.1s)');
      setIsDetecting(false);
      return;
    }
    
    const processingRange = hasRegionSelection 
      ? `region ${startTime.toFixed(3)}s → ${effectiveEndTime.toFixed(3)}s (${regionDuration.toFixed(3)}s)`
      : `entire file (${duration.toFixed(3)}s)`;
    
    setProgressMessage(`Detecting silence in ${processingRange}...`);
      try {
      let result;
      
      if (hasRegionSelection) {
        result = await audioApi.detectSilenceInRegion({
          fileId,
          threshold,
          minDuration,
          startTime,
          endTime: effectiveEndTime,
          duration
        });
      } else {
        result = await audioApi.detectSilence({
          fileId,
          threshold,
          minDuration,
          duration
        });      }
      
      if (result.success && result.data) {
        setProgress(100);
        setProgressStage('complete');
        setProgressMessage(`Removed ${result.data.silenceRegions?.length || 0} silence regions!`);        setSilenceData(result.data);
        onSilenceDetected?.(result.data);
        onSilenceRemoved?.(result.data);
        
        if (result.data.silenceRegions) {
          setPreviewRegions(result.data.silenceRegions);
          onPreviewSilenceUpdate?.(result.data.silenceRegions);
        }
      } else {
        throw new Error(result.error || 'Detection failed');
      }} catch (error) {
      setProgressStage('error');
      setProgressMessage(`Error: ${error.message}`);    } finally {
      setIsDetecting(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStage('idle');
        setProgressMessage('');
      }, 3000);
    }
  }, [fileId, threshold, minDuration, duration, isDetecting, onSilenceDetected, onSilenceRemoved, onPreviewSilenceUpdate, startTime, endTime]);  // 🎯 **HANDLERS**: Simple and optimized
  const togglePanel = useCallback(() => {
    const newIsOpen = !isPanelOpen;
    setIsPanelOpen(newIsOpen);
    
    if (!newIsOpen) {
      setPreviewRegions([]);
      onPreviewSilenceUpdate?.([]);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    }
  }, [isPanelOpen, setIsPanelOpen, onPreviewSilenceUpdate]);

  const handleThresholdChange = useCallback((e) => {
    setThreshold(parseInt(e.target.value));
    requestSmoothUpdate();
  }, [requestSmoothUpdate]);

  const handleDurationChange = useCallback((e) => {
    setMinDuration(parseFloat(e.target.value));
    requestSmoothUpdate();
  }, [requestSmoothUpdate]);

  const handleSkipSilenceChange = useCallback((e) => {
    const enabled = e.target.checked;
    setSkipSilenceEnabled(enabled);
    onSkipSilenceChange?.(enabled);
  }, [onSkipSilenceChange]);  // 📊 **COMPUTED VALUES**: Optimized calculations
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
  const silencePercent = baseDuration > 0 ? (totalSilence / baseDuration * 100) : 0;  // 📊 **PREVIEW STATS**: Memoized for performance
  const previewStats = useMemo(() => {
    const count = previewRegions.length;
    const total = previewRegions.reduce((sum, region) => sum + region.duration, 0);
    const baseDuration = hasRegionSelection ? regionDuration : duration;
    const percent = baseDuration > 0 ? (total / baseDuration) * 100 : 0;
    
    return { count, total, baseDuration, percent };
  }, [previewRegions, hasRegionSelection, regionDuration, duration]);
  
  // 🎨 **RENDER**: Conditional rendering for performance
  if (!fileId || disabled) return null;

  const isInlineMode = externalIsOpen === null;
  const isPanelMode = !isInlineMode;return (
    <div className={`silence-detection-wrapper ${isPanelOpen ? 'is-open' : 'is-closed'}`}>
      {/* 🔇 **TOGGLE BUTTON**: Show only in inline mode */}
      {isInlineMode && (
        <div className={`flex justify-center transition-all duration-250 ${isPanelOpen ? 'mb-2' : 'mb-0'}`}><button
            onClick={togglePanel}
            disabled={isDetecting}            className={`silence-toggle-button inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isPanelOpen
                ? 'bg-red-100 hover:bg-red-150 border border-red-300 text-red-800' 
                : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
            }`}
          >            <BarChart className="w-4 h-4" />
            <span>Find silence regions</span>            <div 
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
        <div className="silence-panel-content bg-white/90 rounded-xl border border-slate-200/50 shadow-sm border-t-2 border-t-red-200/60">
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
          )}
            {/* 🎯 **SCROLLABLE CONTENT**: Main content area with scroll */}
          <div className="p-4 max-h-80 overflow-y-auto space-y-4 silence-scrollable-content">          {isPanelOpen && previewStats.count > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-800 font-medium">
                  Preview: {previewStats.count} regions ({previewStats.total.toFixed(3)}s)
                </span>
                <span className="text-yellow-700">
                  {previewStats.percent.toFixed(2)}% of {hasRegionSelection ? 'region' : 'audio'}
                </span>
              </div>
            </div>
          )}

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
          </div>          {/* 📊 **PROCESSING STATISTICS**: Concise results after detection */}
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

          {/* 🎯 **SIMPLIFIED ACTION**: Single button for detect & remove */}
          <div className="flex gap-3">
            <button
              onClick={detectSilence}
              disabled={isDetecting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <BarChart className="w-4 h-4" />
                  Remove Silent Parts
                </>
              )}
            </button>
          </div>

          {/* 📊 **PROGRESS INDICATOR**: Show during processing */}
          {(isDetecting || progressStage !== 'idle') && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  {progressMessage || 'Processing...'}
                </span>
                <span className="text-xs text-blue-600">
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
                  {progressStage}
                </span>
              </div>
            </div>          )}

          {/* 🆕 **SKIP SILENCE CONTROL**: Checkbox to enable/disable silence skipping */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipSilenceEnabled}
                onChange={handleSkipSilenceChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                disabled={isDetecting}
              />
              <span className="text-slate-700">
                Skip silence during playback
              </span>
            </label>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SilenceDetection;