import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VolumeX, Loader2, ChevronDown, X } from 'lucide-react';
import { audioApi } from '../services/audioApi';

// 🎨 **INJECT OPTIMIZED CSS**: Single injection for ultra-smooth panel animations
if (typeof document !== 'undefined' && !document.getElementById('silence-panel-styles')) {
  const style = document.createElement('style');
  style.id = 'silence-panel-styles';
  style.textContent = `
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
    
    /* 🚀 **PANEL CONTAINER**: Optimized height-based animations */
    .silence-panel-container {
      overflow: hidden;
      transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1), 
                  opacity 200ms ease-out,
                  margin 250ms cubic-bezier(0.4, 0, 0.2, 1),
                  padding 250ms cubic-bezier(0.4, 0, 0.2, 1);
      will-change: max-height, opacity, margin, padding;
    }
    .silence-panel-container.is-open {
      max-height: 800px; /* Generous max-height for content */
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
    }
    .silence-toggle-button:active:not(:disabled) {
      transform: translateY(0) scale(0.98) translateZ(0);
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
  // 🆕 **NEW PROPS**: For real-time preview integration
  audioRef = null,
  waveformData = [],
  onPreviewSilenceUpdate = null, // 🆕 **PREVIEW CALLBACK**: Called when preview regions change
  // 🆕 **EXTERNAL PANEL CONTROL**: Allow parent to control panel visibility
  isOpen: externalIsOpen = null,
  onToggleOpen = null
}) => {  // 🎛️ **MINIMAL STATE**: Reduced state for better performance
  const [threshold, setThreshold] = useState(-30);
  const [minDuration, setMinDuration] = useState(0.5);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [silenceData, setSilenceData] = useState(null);
  
  // 🆕 **CONTROLLED VS UNCONTROLLED**: Use external control if provided, otherwise internal
  const isOpen = externalIsOpen !== null ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalIsOpen !== null ? onToggleOpen : setInternalIsOpen;
  
  // 🚀 **OPTIMIZED PREVIEW STATE**: Single state for all preview data
  const [previewRegions, setPreviewRegions] = useState([]);
  // 🆕 **ENHANCED SMART CACHE**: LRU cache with compression & memory optimization
  const cacheRef = useRef(new Map());
  const debounceTimerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const MAX_CACHE_SIZE = 25; // Increased cache size for more responsive experience
  const MICRO_DEBOUNCE_MS = 16; // 🔥 ULTRA-MICRO-DEBOUNCE: 16ms (60fps) for maximum smoothness  // 🔧 **ULTRA-FAST SILENCE CALCULATION**: Hyper-optimized algorithm with smart caching
  const calculateSilenceRegions = useCallback((threshold, minDuration) => {
    if (!waveformData.length || !duration) return [];
    
    // 🎯 **SMART CACHE CHECK**: Check cache first for instant response
    const cacheKey = `${threshold}_${minDuration}_${waveformData.length}`;
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      // Move to end for LRU
      cacheRef.current.delete(cacheKey);
      cacheRef.current.set(cacheKey, cached);
      return cached;
    }
    
    // 🚀 **HYPER-OPTIMIZED CALCULATION**: Ultra-fast single-pass algorithm with optimizations
    const sampleThreshold = Math.pow(10, threshold / 20);
    const regions = [];
    let silenceStart = null;
    
    // 🔥 **DYNAMIC SAMPLING**: Reduce samples for longer audio, increase for shorter
    const maxSamples = 3000; // Increased from 2000 for better accuracy
    const sampleStep = Math.max(1, Math.floor(waveformData.length / maxSamples));
    const timeStep = duration / waveformData.length; // Pre-calculate time step
    
    // 🚀 **OPTIMIZED LOOP**: Minimize calculations inside loop
    for (let i = 0; i < waveformData.length; i += sampleStep) {
      const amplitude = waveformData[i];
      
      if (amplitude < sampleThreshold) {
        if (silenceStart === null) {
          silenceStart = i * timeStep; // Use pre-calculated time step
        }
      } else if (silenceStart !== null) {
        const silenceEnd = i * timeStep;
        const silenceDuration = silenceEnd - silenceStart;
        
        if (silenceDuration >= minDuration) {
          regions.push({
            start: Math.max(0, silenceStart),
            end: Math.min(duration, silenceEnd),
            duration: silenceDuration
          });
        }
        silenceStart = null;
      }
    }
    
    // 🔧 **HANDLE SILENCE AT END**: Optimized end handling
    if (silenceStart !== null) {
      const silenceDuration = duration - silenceStart;
      if (silenceDuration >= minDuration) {
        regions.push({
          start: Math.max(0, silenceStart),
          end: duration,
          duration: silenceDuration
        });
      }
    }
    
    // 🗃️ **ENHANCED CACHE UPDATE**: LRU with size limit and cleanup
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      // Remove oldest 5 entries instead of just 1 for better performance
      const keysToRemove = Array.from(cacheRef.current.keys()).slice(0, 5);
      keysToRemove.forEach(key => cacheRef.current.delete(key));
    }
    cacheRef.current.set(cacheKey, regions);
    
    return regions;
  }, [waveformData, duration]);
  // ⚡ **ULTRA-SMOOTH UPDATE**: Instant visual + debounced callback
  const updatePreview = useCallback((instantUpdate = false) => {
    if (!isOpen || !waveformData.length) {
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
    }
  }, [isOpen, threshold, minDuration, calculateSilenceRegions, onPreviewSilenceUpdate, waveformData.length]);

  // 📊 **RAF-OPTIMIZED SLIDER UPDATES**: Ultra-smooth slider response
  const rafRef = useRef(null);
  const pendingUpdateRef = useRef(false);
  
  const requestSmoothUpdate = useCallback(() => {
    if (pendingUpdateRef.current) return; // Prevent multiple RAF requests
    
    pendingUpdateRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      updatePreview(true); // Instant update for sliders
      pendingUpdateRef.current = false;
    });
  }, [updatePreview]);  // 🎯 **EFFECT: Real-time preview updates with ultra-smooth response**
  useEffect(() => {
    updatePreview(false); // Use debounced callback for effect triggers
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updatePreview]);

  // 🧹 **CLEANUP EFFECT**: Force reset spacing when component unmounts or panel closes
  useEffect(() => {
    return () => {
      // Force remove any lingering margins/paddings when component unmounts
      const wrappers = document.querySelectorAll('.silence-detection-wrapper');
      wrappers.forEach(wrapper => {
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';
      });
    };
  }, []);

  // 🚀 **CACHE WARMING**: Pre-calculate popular threshold values for instant response
  useEffect(() => {
    if (!isOpen || !waveformData.length || !duration) return;
    
    // Pre-calculate common threshold values when panel opens
    const popularThresholds = [-20, -25, -30, -35, -40, -45, -50];
    const popularDurations = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
    
    // Use requestIdleCallback to avoid blocking UI
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        popularThresholds.forEach(thresh => {
          popularDurations.forEach(dur => {
            if (cacheRef.current.size < MAX_CACHE_SIZE) {
              calculateSilenceRegions(thresh, dur); // This will cache the result
            }
          });
        });
        console.log('🚀 [SilenceDetection-CACHE] Warmed cache with popular values');
      });
    }
  }, [isOpen, waveformData.length, duration, calculateSilenceRegions]);  // 🔍 **OPTIMIZED SILENCE DETECTION**: Full server-side analysis with smart loading
  const detectSilence = useCallback(async () => {
    if (!fileId || isDetecting) return;
    
    console.log('🔇 [SilenceDetection-BALANCED] Starting optimized detection:', { fileId, threshold, minDuration });
    setIsDetecting(true);
    
    try {
      const result = await audioApi.detectSilence({
        fileId,
        threshold,
        minDuration,
        duration
      });
      
      console.log('🔇 [SilenceDetection-BALANCED] Analysis complete:', result);
        if (result.success) {
        setSilenceData(result.data);
        onSilenceDetected?.(result.data);
        // Since the backend already processed and removed silence, trigger the removed callback too
        onSilenceRemoved?.(result.data);
        console.log('✅ [SilenceDetection-BALANCED] Success - silence detected and removed:', {
          regions: result.data.count,
          totalSilence: result.data.totalSilence?.toFixed(2) + 's'
        });
      } else {
        throw new Error(result.error || 'Detection failed');
      }
    } catch (error) {
      console.error('❌ [SilenceDetection-BALANCED] Failed:', error);
      alert('Detection failed: ' + error.message);
    } finally {
      setIsDetecting(false);
    }  }, [fileId, threshold, minDuration, duration, isDetecting, onSilenceDetected, onSilenceRemoved]);

  // 🎯 **SMART TOGGLE PANEL**: Optimized with cleanup
  const togglePanel = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // 🧹 **SMART CLEANUP**: Clear preview when closing
    if (!newIsOpen) {
      setPreviewRegions([]);
      onPreviewSilenceUpdate?.([]);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [isOpen, setIsOpen, onPreviewSilenceUpdate]);
  // 🚀 **ULTRA-SMOOTH SLIDER HANDLERS**: RAF-optimized for instant response
  const handleThresholdChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    setThreshold(value);
    requestSmoothUpdate(); // Instant visual update
  }, [requestSmoothUpdate]);

  const handleDurationChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    setMinDuration(value);
    requestSmoothUpdate(); // Instant visual update
  }, [requestSmoothUpdate]);// 📊 **OPTIMIZED COMPUTED VALUES**: Memoized for performance
  const hasRegions = silenceData?.silenceRegions?.length > 0;
  const totalSilence = silenceData?.totalSilence || 0;
  const silencePercent = duration > 0 ? (totalSilence / duration * 100) : 0;
  const previewCount = previewRegions.length;
  const previewTotal = previewRegions.reduce((sum, region) => sum + region.duration, 0);
  
  // 🎨 **RENDER**: Ultra-light component with smart conditional rendering
  if (!fileId || disabled) return null;

  // 🚀 **UNIFIED COMPONENT**: Support both inline and panel modes
  const isInlineMode = externalIsOpen === null;
  const isPanelMode = !isInlineMode;
  return (
    <div className={`silence-detection-wrapper ${isOpen ? 'is-open' : 'is-closed'}`}>
      {/* 🔇 **TOGGLE BUTTON**: Show only in inline mode */}
      {isInlineMode && (
        <div className={`flex justify-center transition-all duration-250 ${isOpen ? 'mb-2' : 'mb-0'}`}><button
            onClick={togglePanel}
            disabled={isDetecting}            className={`silence-toggle-button inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isOpen 
                ? 'bg-red-100 hover:bg-red-150 border border-red-300 text-red-800' 
                : 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
            }`}
          ><VolumeX className="w-4 h-4" />
            <span>Find silence regions</span>
            <div 
              className="w-4 h-4 transition-transform duration-200 ease-out"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}      {/* 🎛️ **MAIN PANEL**: Ultra-smooth animation with optimized transforms */}
      <div className={`silence-panel-container ${isOpen ? 'is-open' : 'is-closed'}`}>
        <div className="silence-panel-content bg-white/90 rounded-xl p-4 border border-slate-200/50 shadow-sm">
          {/* 📋 **PANEL HEADER**: Show only in panel mode with close button */}
          {isPanelMode && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-red-600" />
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

          {/* 📊 **SMART PREVIEW STATS**: Show when panel is open and has preview data */}
          {isOpen && previewCount > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-800 font-medium">
                  Preview: {previewCount} regions ({previewTotal.toFixed(1)}s)
                </span>
                <span className="text-yellow-700">
                  {((previewTotal / duration) * 100).toFixed(1)}% of audio
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
          </div>          {/* 🎯 **SIMPLIFIED ACTION**: Single button for detect & remove */}
          <div className="flex gap-3">            <button
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
                  <VolumeX className="w-4 h-4" />
                  Remove Silent Parts
                </>
              )}
            </button>
          </div>

          {/* 📊 **OPTIMIZED RESULTS DISPLAY**: Show after official detection */}
          {hasRegions && (
            <div className="mt-6 bg-slate-50 rounded-lg p-4">
              <div className="text-center mb-3">
                <h4 className="text-lg font-semibold text-slate-800 mb-1">
                  Found {silenceData.count} silence regions
                </h4>
                <p className="text-sm text-slate-600">
                  Total duration: {totalSilence.toFixed(1)}s ({silencePercent.toFixed(1)}% of audio)
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-lg font-semibold text-slate-800">
                    {silenceData.count}
                  </div>
                  <div className="text-slate-600">Regions</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-lg font-semibold text-slate-800">
                    {totalSilence.toFixed(1)}s
                  </div>
                  <div className="text-slate-600">Total duration</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-lg font-semibold text-red-600">
                    {silencePercent.toFixed(1)}%
                  </div>
                  <div className="text-slate-600">Of audio</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SilenceDetection;